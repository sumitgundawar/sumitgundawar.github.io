import { runChain, type ChatMessage } from "./models";

/* The site's backend: ask, track, progress, and a weekly digest.
 *
 * Everything that needs a credential lives here. The browser gets an endpoint
 * and nothing else, because both keys involved are dangerous in a page: the
 * NVIDIA key is a spendable credential that gets scraped within days of being
 * shipped in JavaScript, and the Supabase secret key bypasses row level
 * security entirely, which is the whole reason RLS was enabled with no
 * policies. The publishable key can read nothing and write nothing; that is
 * verified, not assumed.
 */

export interface ApiEnv {
  NVIDIA_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  SLACK_BOT_TOKEN?: string;
  SLACK_CHANNEL_ID?: string;
  SITE_ORIGIN?: string;
}

const json = (body: unknown, status = 200, origin = "*") =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });

async function sb(env: ApiEnv, path: string, init: RequestInit = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/* A session key is a random id the browser mints and keeps. It is enough to
   count returning readers and follow a path through the site, and not enough to
   identify anybody, which is why no IP address or user agent is stored. */
const SESSION_RE = /^[a-zA-Z0-9_-]{8,64}$/;

/** Very small in-memory limiter. Not durable across isolates, which is fine:
 *  it exists to stop one bored visitor emptying the model quota, not to be a
 *  billing control. */
const hits = new Map<string, { n: number; until: number }>();
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.until) {
    hits.set(key, { n: 1, until: now + windowMs });
    return false;
  }
  cur.n += 1;
  return cur.n > limit;
}

export async function handleApi(req: Request, env: ApiEnv, ctx: ExecutionContext): Promise<Response | null> {
  const url = new URL(req.url);
  const origin = env.SITE_ORIGIN ?? "*";

  if (!url.pathname.startsWith("/api/")) return null;
  if (req.method === "OPTIONS") return json({}, 204, origin);

  /* ---- ask: the learn assistant ---- */
  if (url.pathname === "/api/ask" && req.method === "POST") {
    const body = (await req.json().catch(() => null)) as
      | { session?: string; question?: string; topicId?: string; topicText?: string }
      | null;

    const session = body?.session ?? "";
    const question = (body?.question ?? "").trim();
    if (!SESSION_RE.test(session)) return json({ error: "bad session" }, 400, origin);
    if (!question || question.length > 2000) return json({ error: "bad question" }, 400, origin);
    if (rateLimited(`ask:${session}`, 12, 60_000)) return json({ error: "slow down" }, 429, origin);

    // Find or open the thread for this reader and topic.
    const found = await sb(
      env,
      `ai_conversations?select=id&session_key=eq.${encodeURIComponent(session)}` +
        `&topic_id=eq.${encodeURIComponent(body?.topicId ?? "")}&limit=1`,
    ).then((r) => r.json() as Promise<{ id: string }[]>);

    let convId = found[0]?.id;
    if (!convId) {
      const made = await sb(env, "ai_conversations", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ session_key: session, topic_id: body?.topicId ?? null }),
      }).then((r) => r.json() as Promise<{ id: string }[]>);
      convId = made[0]?.id;
    }
    if (!convId) return json({ error: "no conversation" }, 500, origin);

    /* History is loaded from the database rather than trusted from the client,
       which is what lets a model reached after three failures pick up the same
       thread the first one was answering. It is also why the client cannot
       forge a conversation by posting its own history. */
    const prior = (await sb(
      env,
      `ai_messages?select=role,content&conversation_id=eq.${convId}&order=id.asc&limit=24`,
    ).then((r) => r.json())) as ChatMessage[];

    const system: ChatMessage = {
      role: "system",
      content:
        "You explain software engineering and system design to an engineer preparing for senior and staff interviews. " +
        "Be concrete and name the tradeoff. British English. Never use em dashes or en dashes; use commas or full stops. " +
        "No emoji, no exclamation marks. If you are unsure, say so rather than inventing detail." +
        (body?.topicText ? `\n\nThe reader is on this topic:\n${body.topicText.slice(0, 4000)}` : ""),
    };

    const messages: ChatMessage[] = [system, ...prior, { role: "user", content: question }];

    let result;
    try {
      result = await runChain(env.NVIDIA_API_KEY, messages);
    } catch {
      return json({ error: "unavailable" }, 503, origin);
    }

    /* Awaited, not fire-and-forget.
       This started life in ctx.waitUntil and the writes silently never landed:
       every reply looked correct, the table stayed empty, and the next turn had
       no history to inherit, so the assistant kept introducing itself to
       someone who was mid-conversation. waitUntil is right for work whose
       failure does not change the answer. History is not that, it is the thing
       the next request depends on, and a write nobody checks is a write that
       quietly does not happen. Roughly 50ms, against an AI call that took 3.8s. */
    const saved = await sb(env, "ai_messages", {
      method: "POST",
      /* Both objects carry the same keys, model included, with null on the
         user row. PostgREST rejects a batch whose objects have differing key
         sets with PGRST102 "All object keys must match", and it rejects the
         whole batch, not the odd row out. Omitting model from the user row
         cost every message in this table. */
      body: JSON.stringify([
        { conversation_id: convId, role: "user", content: question, model: null },
        { conversation_id: convId, role: "assistant", content: result.text, model: result.model },
      ]),
    });
    if (!saved.ok) {
      // Still answer the reader: losing the thread is a degraded turn, not a
      // failed one. But it has to be visible in logs rather than inferred.
      console.log(
        JSON.stringify({ at: "history_write_failed", status: saved.status, body: (await saved.text()).slice(0, 300) }),
      );
    }
    ctx.waitUntil(
      sb(env, `ai_conversations?id=eq.${convId}`, {
        method: "PATCH",
        body: JSON.stringify({ updated_at: new Date().toISOString() }),
      }),
    );

    if (result.attempts.length) {
      console.log(JSON.stringify({ at: "chain_fallback", answered: result.model, skipped: result.attempts }));
    }
    // The reader is told nothing about which model answered or what failed.
    return json({ answer: result.text }, 200, origin);
  }

  /* ---- track: first-party analytics ---- */
  if (url.pathname === "/api/track" && req.method === "POST") {
    const b = (await req.json().catch(() => null)) as
      | { session?: string; path?: string; topicId?: string; dwellMs?: number; referrer?: string; event?: string; chosen?: number; correct?: boolean }
      | null;
    const session = b?.session ?? "";
    if (!SESSION_RE.test(session)) return json({ error: "bad session" }, 400, origin);
    if (rateLimited(`track:${session}`, 120, 60_000)) return json({ ok: true }, 200, origin);

    const country = req.headers.get("cf-ipcountry") ?? null;

    ctx.waitUntil(
      (async () => {
        await sb(env, "sessions", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            session_key: session,
            last_seen: new Date().toISOString(),
            referrer: b?.referrer?.slice(0, 300) ?? null,
            country,
          }),
        });
        if (b?.event === "quiz" && typeof b.chosen === "number") {
          await sb(env, "quiz_events", {
            method: "POST",
            body: JSON.stringify({ topic_id: b.topicId ?? "unknown", chosen: b.chosen, correct: !!b.correct }),
          });
        } else if (b?.path) {
          await sb(env, "page_views", {
            method: "POST",
            body: JSON.stringify({
              session_key: session,
              path: b.path.slice(0, 200),
              topic_id: b.topicId ?? null,
              dwell_ms: typeof b.dwellMs === "number" ? Math.min(b.dwellMs, 1000 * 60 * 60) : null,
            }),
          });
        }
      })(),
    );
    return json({ ok: true }, 200, origin);
  }

  /* ---- progress: follows a reader between devices ---- */
  if (url.pathname === "/api/progress" && req.method === "POST") {
    const b = (await req.json().catch(() => null)) as
      | { session?: string; topicId?: string; correct?: boolean; read?: boolean }
      | null;
    const session = b?.session ?? "";
    if (!SESSION_RE.test(session)) return json({ error: "bad session" }, 400, origin);

    if (b?.read) {
      const rows = await sb(
        env,
        `learn_progress?select=topic_id,correct&session_key=eq.${encodeURIComponent(session)}`,
      ).then((r) => r.json() as Promise<{ topic_id: string; correct: boolean }[]>);
      const out: Record<string, boolean> = {};
      for (const r of rows) out[r.topic_id] = r.correct;
      return json({ progress: out }, 200, origin);
    }

    if (!b?.topicId) return json({ error: "no topic" }, 400, origin);
    ctx.waitUntil(
      sb(env, "learn_progress", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ session_key: session, topic_id: b.topicId, correct: !!b.correct }),
      }),
    );
    return json({ ok: true }, 200, origin);
  }

  return json({ error: "not found" }, 404, origin);
}

/* ---- the weekly report ---- */

function arrow(pct: number | null): string {
  if (pct === null) return "new";
  const s = pct > 0 ? "+" : "";
  return `${s}${pct}%`;
}

export async function weeklyReport(env: ApiEnv): Promise<string> {
  const call = async (fn: string, args: Record<string, unknown>) =>
    sb(env, `rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }).then((r) => r.json());

  const digest = (await call("weekly_digest", { days: 7 })) as {
    metric: string; current_period: number; previous_period: number; pct_change: number | null;
  }[];
  const engagement = (await call("topic_engagement", { days: 7 })) as {
    topic_id: string; views: number; readers: number; median_dwell_s: number | null; pct_change: number | null;
  }[];
  const struggling = (await call("struggling_topics", { days: 7, min_answers: 5 })) as {
    topic_id: string; answers: number; wrong: number; wrong_pct: number;
  }[];
  const dropoff = (await call("drop_off_topics", { days: 7 })) as { topic_id: string; times_last: number }[];

  const lines: string[] = ["*Last 7 days, against the 7 before*", ""];
  for (const d of digest) {
    lines.push(`• ${d.metric}: *${d.current_period}* (was ${d.previous_period}, ${arrow(d.pct_change)})`);
  }

  if (engagement.length) {
    lines.push("", "*Most read*");
    for (const t of engagement.slice(0, 8)) {
      const dwell = t.median_dwell_s ? `, ${t.median_dwell_s}s median` : "";
      lines.push(`• ${t.topic_id}: ${t.views} views from ${t.readers} readers${dwell} (${arrow(t.pct_change)})`);
    }
  }

  if (struggling.length) {
    lines.push("", "*Most often got wrong* (a question most people fail is usually a bad explanation)");
    for (const s of struggling.slice(0, 6)) {
      lines.push(`• ${s.topic_id}: ${s.wrong_pct}% wrong of ${s.answers}`);
    }
  }

  if (dropoff.length) {
    lines.push("", "*Where people stopped reading*");
    for (const d of dropoff.slice(0, 5)) lines.push(`• ${d.topic_id}: last topic for ${d.times_last} sessions`);
  }

  if (digest.every((d) => d.current_period === 0)) {
    lines.push("", "_No traffic recorded this period. If that is unexpected, the tracking call is the thing to check._");
  }
  return lines.join("\n");
}

export async function postWeekly(env: ApiEnv): Promise<void> {
  if (!env.SLACK_BOT_TOKEN || !env.SLACK_CHANNEL_ID) return;
  const text = await weeklyReport(env);
  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: env.SLACK_CHANNEL_ID, text }),
  });
}
