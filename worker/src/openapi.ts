/* The API, described.
 *
 * The owner speaks at JAX London on designing APIs and integrations that do not
 * fall apart at scale, and until now his own API was undocumented. This is the
 * worked example: eight endpoints, the decisions behind them stated rather than
 * implied, and something an attendee can curl during the session.
 *
 * It documents what the code does, not what would be nice. Where a decision
 * looks odd, the description says why, because the reasons are the interesting
 * part: an admin endpoint answers 404 rather than 401 so it does not confirm it
 * exists, /api/subscribe returns the same 200 whether or not the address was
 * already on the list so it cannot be used to test who has subscribed, and a
 * withdrawn consent is never restored by a stranger re-submitting the address.
 */

export const API_VERSION = "1.0.0";

export function openApiSpec(origin: string): unknown {
  const rateLimited = (limit: number, windowSec: number) => ({
    "RateLimit-Limit": { schema: { type: "integer", example: limit }, description: `Requests permitted per ${windowSec}s window, per IP.` },
    "RateLimit-Remaining": { schema: { type: "integer" }, description: "Requests left in the current window." },
    "RateLimit-Reset": { schema: { type: "integer" }, description: "Seconds until the window resets." },
  });

  const errorSchema = {
    type: "object",
    properties: { error: { type: "string", description: "A sentence intended for a reader, not an error code." } },
    required: ["error"],
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "sumitgundawar.com API",
      version: API_VERSION,
      description:
        "The backend for sumitgundawar.com: a grounded assistant over the site's own learning material, first-party analytics, reading progress, and the newsletter. " +
        "Published because the site argues for documenting integration contracts and it would be poor form not to. " +
        "There are no API keys: the browser endpoints are open to the site's own origins and rate limited by IP, and the three administrative endpoints take a token.",
      contact: { name: "Sumit Gundawar", url: origin },
      license: { name: "All rights reserved" },
    },
    servers: [{ url: "https://site-agent-relay.sumitgundawar3.workers.dev", description: "Production" }],
    tags: [
      { name: "assistant", description: "Questions about the material on a page." },
      { name: "analytics", description: "First-party measurement. No third party sees any of it." },
      { name: "newsletter", description: "Single opt-in, one-click out." },
      { name: "admin", description: "Token only. These answer 404 without one, so they do not confirm they exist." },
    ],
    components: {
      schemas: {
        Error: errorSchema,
        Session: {
          type: "string",
          pattern: "^[a-zA-Z0-9_-]{8,64}$",
          description:
            "A random id the browser mints and keeps in localStorage. Enough to count returning readers and follow a path through the site, and not enough to identify anyone: no IP address and no user agent string is stored against it.",
        },
      },
      securitySchemes: {
        adminToken: {
          type: "apiKey",
          in: "header",
          name: "X-Admin-Token",
          description: "Compared in constant time. A plain comparison leaks the token a character at a time to anyone patient enough to measure.",
        },
      },
    },
    paths: {
      "/api/ask": {
        post: {
          tags: ["assistant"],
          summary: "Ask a question about a topic on the site",
          description:
            "Answers strictly from the material identified by topicId, which the server looks up from its own copy. The topic text is deliberately NOT accepted from the client: when it was, the system prompt became caller-controlled, every guardrail negotiable, and the answer cache poisonable.\n\n" +
            "Fifteen models sit behind this and the chain falls through as many as it needs to; which one answered is reported only on the streaming path, because a reader cannot act on it.\n\n" +
            "Answers are cached for 24 hours under a key that includes a content version, so changing the material orphans every stale answer without deleting anything.",
          parameters: [
            {
              name: "stream",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["1"] },
              description:
                "Set to 1 for server-sent events. Uncached answers take twelve to sixteen seconds to complete, so streaming is the difference between words appearing and a spinner. Each event is {\"t\":\"...\"}; the last is {\"done\":true,\"model\":\"...\"}. Omit it and the response is a single JSON object, which is what curl wants.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    session: { $ref: "#/components/schemas/Session" },
                    question: { type: "string", maxLength: 500 },
                    topicId: { type: "string", description: "Must name a topic the server knows. An unknown id is refused rather than answered ungrounded." },
                  },
                  required: ["session", "question"],
                },
                example: { session: "a1b2c3d4e5f6a7b8", question: "Why is cache invalidation hard?", topicId: "invalidation" },
              },
            },
          },
          responses: {
            200: {
              description: "An answer, or an SSE stream when stream=1.",
              headers: rateLimited(20, 60),
              content: {
                "application/json": { schema: { type: "object", properties: { answer: { type: "string" } } } },
                "text/event-stream": { schema: { type: "string" } },
              },
            },
            400: { description: "Malformed session, or a topic id the server does not know.", content: { "application/json": { schema: errorSchema } } },
            429: { description: "Rate limited. This endpoint spends a metered model credential, so the limit is real.", headers: rateLimited(20, 60), content: { "application/json": { schema: errorSchema } } },
            503: { description: "Every model in the chain failed.", content: { "application/json": { schema: errorSchema } } },
          },
        },
      },
      "/api/track": {
        post: {
          tags: ["analytics"],
          summary: "Record a page view, a quiz answer, or a click",
          description:
            "One endpoint, three shapes, chosen by the event field. Country comes from Cloudflare and device is a coarse class read from the user agent and then discarded; the full string is a fingerprinting surface with no matching benefit.\n\n" +
            "Always answers 200, including when rate limited: an analytics beacon must never surface an error to a reader.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    session: { $ref: "#/components/schemas/Session" },
                    path: { type: "string", description: "Page view. Sent with dwell on the way out." },
                    dwellMs: { type: "integer", description: "Capped at one hour." },
                    topicId: { type: "string" },
                    referrer: { type: "string" },
                    event: { type: "string", enum: ["quiz", "click"], description: "Absent for a page view." },
                    chosen: { type: "integer", description: "quiz only." },
                    correct: { type: "boolean", description: "quiz only." },
                    clickEvent: { type: "string", description: "click only, for example article_click." },
                    target: { type: "string", description: "click only: which article, which episode." },
                  },
                  required: ["session"],
                },
              },
            },
          },
          responses: {
            200: { description: "Recorded, or silently dropped if rate limited.", headers: rateLimited(200, 60) },
            400: { description: "Malformed session.", content: { "application/json": { schema: errorSchema } } },
          },
        },
      },
      "/api/progress": {
        post: {
          tags: ["analytics"],
          summary: "Read or write reading progress for a session",
          description: "Send read:true to fetch, or topicId and correct to record. Progress is per session key, so it follows the browser rather than a person.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    session: { $ref: "#/components/schemas/Session" },
                    read: { type: "boolean" },
                    topicId: { type: "string" },
                    correct: { type: "boolean" },
                  },
                  required: ["session"],
                },
              },
            },
          },
          responses: { 200: { description: "Progress map, or acknowledgement.", headers: rateLimited(200, 60) } },
        },
      },
      "/api/subscribe": {
        post: {
          tags: ["newsletter"],
          summary: "Join the newsletter",
          description:
            "Single opt-in, which is valid consent under UK GDPR when the ask is explicit, unticked and unbundled. A welcome email goes out immediately and doubles as the check that the address exists, because bounces are what get a new sending domain blocked.\n\n" +
            "Always answers 200 with {ok:true} for any well-formed address, whether it is new, already subscribed, or previously unsubscribed. That is deliberate: a different response for each would let a stranger test whether a given address is on the list. An address that has unsubscribed is never restored by someone else re-submitting it, because consent that was withdrawn cannot be reinstated by a third party.\n\n" +
            "Two bot filters run before anything is written: a hidden field that only a script fills, and a check that the form was on screen for at least two seconds. Both fail silently, for the same reason as above.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", format: "email", maxLength: 254 },
                    source: { type: "string", description: "Where on the site they signed up, for the report." },
                    company: { type: "string", description: "Honeypot. Must be empty." },
                    renderedAt: { type: "integer", description: "Epoch ms when the form rendered." },
                  },
                  required: ["email"],
                },
              },
            },
          },
          responses: {
            200: { description: "Accepted, or silently ignored.", headers: rateLimited(5, 3600) },
            400: { description: "Not an email address.", content: { "application/json": { schema: errorSchema } } },
            429: { description: "Rate limited.", headers: rateLimited(5, 3600), content: { "application/json": { schema: errorSchema } } },
          },
        },
      },
      "/api/unsubscribe": {
        get: {
          tags: ["newsletter"],
          summary: "Leave the newsletter in one click",
          description: "Keyed on a token issued at signup. Also reachable by POST, which RFC 8058 requires for the one-click button Gmail renders from the List-Unsubscribe header.",
          parameters: [{ name: "token", in: "query", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "An HTML confirmation page." } },
        },
      },
      "/api/openapi.json": {
        get: { tags: ["assistant"], summary: "This document", responses: { 200: { description: "The OpenAPI description of this API." } } },
      },
      "/api/report-preview": {
        get: {
          tags: ["admin"],
          summary: "Render the weekly report on demand",
          description: "Answers 404 without a valid token rather than 401, so it does not confirm it exists. days is clamped to 90; unclamped it ran four aggregates over all history on a request that costs nothing to send.",
          security: [{ adminToken: [] }],
          parameters: [
            { name: "format", in: "query", schema: { type: "string", enum: ["html"] } },
            { name: "days", in: "query", schema: { type: "integer", default: 7, maximum: 90 } },
          ],
          responses: { 200: { description: "The report, as text or HTML." }, 404: { description: "No token, or the wrong one." } },
        },
      },
      "/api/cron-run": {
        get: {
          tags: ["admin"],
          summary: "Run a scheduled job now",
          description:
            "Exists because a job that can only be observed once a week is a job whose breakage is found late, which is exactly what happened: the crons were declared for the entire life of the reporting feature against a Worker that exported no scheduled handler, and not one report was ever sent.",
          security: [{ adminToken: [] }],
          parameters: [{ name: "cron", in: "query", required: true, schema: { type: "string", enum: ["0 9 * * 1", "0 8 * * *"] } }],
          responses: {
            200: { description: "Ran, with the job name and its duration." },
            400: { description: "No cron given." },
            404: { description: "No token, or the wrong one." },
            500: { description: "The job threw, or no job is registered for that expression." },
          },
        },
      },
      "/api/purge": {
        post: {
          tags: ["admin"],
          summary: "Drop cached answers",
          description: "For one topic or all of them. An open purge endpoint is a free way to make every question expensive again.",
          security: [{ adminToken: [] }],
          responses: { 200: { description: "Purged." }, 404: { description: "No token, or the wrong one." } },
        },
      },
    },
  };
}

/* A readable page for the spec above.
 *
 * Rendered from the same object, so the page cannot describe an endpoint the
 * spec does not have. Deliberately one self-contained file with no script and no
 * external stylesheet: a documentation page that needs a CDN to render is a poor
 * advertisement for an argument about dependencies, and an attendee on
 * conference wifi should not be waiting on Redoc to boot.
 */
export function docsPage(origin: string): string {
  const spec = openApiSpec(origin) as {
    info: { title: string; version: string; description: string };
    servers: { url: string }[];
    paths: Record<string, Record<string, { summary?: string; description?: string; tags?: string[] }>>;
  };
  const esc = (s: string) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const para = (s: string) =>
    esc(s)
      .split("\n\n")
      .map((p) => `<p>${p.replace(/\n/g, " ")}</p>`)
      .join("");

  const rows = Object.entries(spec.paths)
    .map(([path, ops]) =>
      Object.entries(ops)
        .map(
          ([method, op]) => `
      <section class="ep">
        <h2><span class="m m-${method}">${method.toUpperCase()}</span> <code>${esc(path)}</code></h2>
        <p class="sum">${esc(op.summary ?? "")}</p>
        ${op.description ? `<div class="desc">${para(op.description)}</div>` : ""}
      </section>`,
        )
        .join(""),
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>API, ${esc(spec.info.title)}</title>
<meta name="robots" content="index,follow">
<style>
:root{--ink:#0e1110;--surface:#262a28;--line:#424845;--fg:#edebe3;--dim:#aab1a6;--cool:#7da4b5;--signal:#3dd68c}
*{box-sizing:border-box}
body{margin:0;background:var(--ink);color:var(--fg);font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
.wrap{max-width:820px;margin:0 auto;padding:48px 20px 80px}
h1{font-size:30px;margin:0 0 6px;letter-spacing:-.02em}
.lede{color:var(--dim);max-width:62ch}
a{color:var(--cool)}
code{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--surface);padding:2px 6px;border:1px solid var(--line)}
pre{background:var(--surface);border:1px solid var(--line);padding:14px;overflow-x:auto;font:13px ui-monospace,SFMono-Regular,Menlo,monospace}
.ep{border-top:1px solid var(--line);padding:22px 0 4px}
.ep h2{font-size:17px;margin:0 0 6px;font-weight:600;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.m{font:11px ui-monospace,monospace;letter-spacing:.08em;padding:3px 7px;border:1px solid var(--line);color:var(--ink);background:var(--signal)}
.m-get{background:var(--cool)}
.sum{margin:0 0 8px;color:var(--fg)}
.desc{color:var(--dim);max-width:70ch}
.desc p{margin:0 0 9px}
.back{font:12px ui-monospace,monospace;color:var(--dim);text-decoration:none}
</style></head>
<body><div class="wrap">
<a class="back" href="${esc(origin)}">&larr; sumitgundawar.com</a>
<h1>${esc(spec.info.title)}</h1>
<p class="lede">${esc(spec.info.description)}</p>
<p class="lede">Machine readable: <a href="/api/openapi.json">/api/openapi.json</a> (OpenAPI ${esc(String((spec as unknown as { openapi: string }).openapi ?? "3.1.0"))}), version ${esc(spec.info.version)}.</p>
<pre>curl -s ${esc(spec.servers[0].url)}/api/ask \\
  -H 'Content-Type: application/json' \\
  -d '{"session":"a1b2c3d4e5f6a7b8","question":"Why is cache invalidation hard?","topicId":"invalidation"}'</pre>
<p class="lede">Add <code>?stream=1</code> for server-sent events. Responses carry <code>RateLimit-Limit</code>, <code>RateLimit-Remaining</code> and <code>RateLimit-Reset</code>.</p>
${rows}
</div></body></html>`;
}
