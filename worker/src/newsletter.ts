import type { ApiEnv } from "./api";

const DAILY_BUDGET = 90;

export interface SendJob {
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

async function remaining(env: ApiEnv): Promise<number> {
  if (!env.RATE) return DAILY_BUDGET;
  const raw = await env.RATE.get(dayKey()).catch(() => null);
  return Math.max(0, DAILY_BUDGET - (raw ? Number(raw) : 0));
}

async function spend(env: ApiEnv, n: number): Promise<void> {
  if (!env.RATE) return;
  const raw = await env.RATE.get(dayKey()).catch(() => null);
  const used = (raw ? Number(raw) : 0) + n;

  await env.RATE.put(dayKey(), String(used), { expirationTtl: 172_800 }).catch(() => {});
}

export async function handleNewsletterBatch(batch: MessageBatch<SendJob>, env: NewsletterEnv): Promise<void> {
  let budget = await remaining(env);
  let sent = 0;
  let deferred = 0;
  let skipped = 0;

  for (const message of batch.messages) {
    const job = message.body;

    if (budget <= 0) {
      message.retry({ delaySeconds: 6 * 60 * 60 });
      deferred++;
      continue;
    }

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
        message.retry({ delaySeconds: 6 * 60 * 60 });
        deferred++;
        budget = 0;
        continue;
      }

      if (!res.ok) {
        const body = (await res.text()).slice(0, 200);
        console.log(JSON.stringify({ at: "newsletter_send_failed", status: res.status, body }));

        if (res.status >= 400 && res.status < 500) message.ack();
        else message.retry({ delaySeconds: 900 });
        continue;
      }

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

export async function enqueueBroadcast(
  env: NewsletterEnv,
  recipients: { email: string; token: string }[],
  content: { subject: string; html: string; text: string },
  unsubscribeBase: string,
): Promise<number> {
  if (!env.NEWSLETTER) throw new Error("no NEWSLETTER queue binding");
  const stamp = new Date().toISOString().slice(0, 10);

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
