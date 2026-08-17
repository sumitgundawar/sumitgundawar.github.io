/* Newsletter delivery, paced to a quota the sender does not control.
 *
 * Resend's free tier allows 100 sends a DAY, not merely 3,000 a month, and
 * nothing enforced that. At 101 confirmed subscribers a broadcast would silently
 * truncate: some people receive it, some never do, and nothing anywhere says
 * which. That is the failure this exists to prevent, and it is the same shape as
 * the argument the JAX talk makes, so it is worth doing properly on the one
 * piece of infrastructure that is actually his.
 *
 * The design in one line: the queue holds the work, the consumer spends only
 * what today's budget allows, and everything else is returned to the queue
 * rather than dropped or attempted anyway.
 *
 * Two things make that safe.
 *
 * The budget is counted in KV under a key that contains the date, so it resets
 * at midnight UTC without a scheduled job to reset it, and a miscount can never
 * persist past a day.
 *
 * Delivery is idempotent. Each message carries a send id, and a KV marker is
 * written when a send succeeds; a retry that arrives after a successful send but
 * before the acknowledgement finds the marker and does nothing. Without that,
 * every retry of a partially-processed batch would re-send to people who already
 * had it, which is worse than the truncation this replaces.
 */

import type { ApiEnv } from "./api";

/** Left below Resend's documented 100 so the transactional mail the site also
 *  sends, welcomes and the weekly report, is not crowded out by a broadcast. */
const DAILY_BUDGET = 90;

export interface SendJob {
  /** Stable per recipient per broadcast, so a retry is recognisable. */
  id: string;
  email: string;
  subject: string;
  html: string;
  text: string;
  unsubscribe: string;
}

export interface NewsletterEnv extends ApiEnv {
  NEWSLETTER?: Queue<SendJob>;
}

const dayKey = () => `nl:sent:${new Date().toISOString().slice(0, 10)}`;
const doneKey = (id: string) => `nl:done:${id}`;

/** How much of today's allowance is left. */
async function remaining(env: ApiEnv): Promise<number> {
  if (!env.RATE) return DAILY_BUDGET;
  const raw = await env.RATE.get(dayKey()).catch(() => null);
  return Math.max(0, DAILY_BUDGET - (raw ? Number(raw) : 0));
}

async function spend(env: ApiEnv, n: number): Promise<void> {
  if (!env.RATE) return;
  const raw = await env.RATE.get(dayKey()).catch(() => null);
  const used = (raw ? Number(raw) : 0) + n;
  // Two days, so a message queued just before midnight cannot read a key that
  // has already expired and conclude the whole budget is free.
  await env.RATE.put(dayKey(), String(used), { expirationTtl: 172_800 }).catch(() => {});
}

/**
 * The consumer.
 *
 * Messages are acknowledged individually. A message that cannot be sent today
 * is retried with a delay rather than acked, which is the whole point: the
 * queue is the buffer, so nothing is lost and nothing is sent over the cap.
 */
export async function handleNewsletterBatch(batch: MessageBatch<SendJob>, env: NewsletterEnv): Promise<void> {
  let budget = await remaining(env);
  let sent = 0;
  let deferred = 0;
  let skipped = 0;

  for (const message of batch.messages) {
    const job = message.body;

    if (budget <= 0) {
      /* Out of allowance. Put it back with a delay into tomorrow rather than
         failing it, so the retry count is not burned on a condition that only
         time fixes. */
      message.retry({ delaySeconds: 6 * 60 * 60 });
      deferred++;
      continue;
    }

    // Already delivered on an earlier attempt of this batch.
    if (env.RATE && (await env.RATE.get(doneKey(job.id)).catch(() => null))) {
      message.ack();
      skipped++;
      continue;
    }

    if (!env.RESEND_API_KEY) {
      message.retry({ delaySeconds: 3600 });
      deferred++;
      continue;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.MAIL_FROM ?? env.REPORT_FROM ?? "onboarding@resend.dev",
          ...(env.MAIL_REPLY_TO ? { reply_to: env.MAIL_REPLY_TO } : {}),
          to: [job.email],
          subject: job.subject,
          headers: {
            "List-Unsubscribe": `<${job.unsubscribe}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          html: job.html,
          text: job.text,
        }),
      });

      if (res.status === 429) {
        // The provider disagrees with our accounting. It is right, we are not.
        message.retry({ delaySeconds: 6 * 60 * 60 });
        deferred++;
        budget = 0;
        continue;
      }

      if (!res.ok) {
        const body = (await res.text()).slice(0, 200);
        console.log(JSON.stringify({ at: "newsletter_send_failed", status: res.status, body }));
        /* 4xx other than 429 will fail identically on every retry, so let it go
           to the dead letter queue rather than spending the budget on it daily. */
        if (res.status >= 400 && res.status < 500) message.ack();
        else message.retry({ delaySeconds: 900 });
        continue;
      }

      // Marked before the ack, so a crash between the two cannot double-send.
      if (env.RATE) await env.RATE.put(doneKey(job.id), "1", { expirationTtl: 604_800 }).catch(() => {});
      message.ack();
      sent++;
      budget--;
    } catch (error) {
      console.log(JSON.stringify({ at: "newsletter_send_threw", error: error instanceof Error ? error.message : String(error) }));
      message.retry({ delaySeconds: 900 });
      deferred++;
    }
  }

  if (sent) await spend(env, sent);
  console.log(JSON.stringify({ at: "newsletter_batch", size: batch.messages.length, sent, deferred, skipped, budgetLeft: budget }));
}

/**
 * Enqueue a broadcast. Returns how many were queued, not how many were sent,
 * because those are different numbers and pretending otherwise is the bug.
 */
export async function enqueueBroadcast(
  env: NewsletterEnv,
  recipients: { email: string; token: string }[],
  content: { subject: string; html: string; text: string },
  unsubscribeBase: string,
): Promise<number> {
  if (!env.NEWSLETTER) throw new Error("no NEWSLETTER queue binding");
  const stamp = new Date().toISOString().slice(0, 10);

  /* sendMany in chunks: one call per message would be a subrequest each, and a
     Worker has a limit on those. */
  const jobs: SendJob[] = recipients.map((r) => ({
    id: `${stamp}:${r.email}`,
    email: r.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    unsubscribe: `${unsubscribeBase}/api/unsubscribe?token=${r.token}`,
  }));

  for (let i = 0; i < jobs.length; i += 100) {
    await env.NEWSLETTER.sendBatch(jobs.slice(i, i + 100).map((body) => ({ body })));
  }
  console.log(JSON.stringify({ at: "newsletter_enqueued", count: jobs.length }));
  return jobs.length;
}
