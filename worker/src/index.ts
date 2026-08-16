/**
 * Slack -> GitHub relay.
 *
 * Turns the site agent's 5-minute polling delay into a near-instant trigger.
 * It deliberately carries no payload: on a qualifying Slack message it fires a
 * bare `repository_dispatch` that means "wake up and check Slack now". The
 * Action still reads the command from Slack itself, so this Worker holds no
 * state, and the scheduled poll keeps working unchanged if the Worker breaks.
 */

/**
 * Regenerate with `npx wrangler types` after changing bindings in
 * wrangler.jsonc — do not extend this by hand.
 */
import { handleApi, handleReportPreview, postAlerts, postWeekly, type ApiEnv } from "./api";

interface Env extends ApiEnv {
  // secrets, set with `wrangler secret put`
  SLACK_SIGNING_SECRET: string;
  GITHUB_TOKEN: string;
  // vars — set in wrangler.jsonc
  GITHUB_REPO: string;
  SLACK_CHANNEL_ID: string;
  SLACK_ALLOWED_USER_ID: string;
}

const MAX_SKEW_SECONDS = 300;
// Reactions that carry a decision on a proposal. Anything else is ignored.
const DECISION_REACTIONS = new Set(["white_check_mark", "x"]);

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Slack signs every request: HMAC-SHA256 over `v0:<timestamp>:<raw body>`.
 * Without this check the endpoint is an open trigger for anyone who finds the
 * URL, so a failure here must reject rather than fall through.
 */
async function isFromSlack(
  request: Request,
  rawBody: string,
  signingSecret: string,
): Promise<boolean> {
  const timestamp = request.headers.get("X-Slack-Request-Timestamp");
  const signature = request.headers.get("X-Slack-Signature");
  if (!timestamp || !signature) return false;

  // Replay protection: refuse anything older than five minutes.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_SKEW_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`v0:${timestamp}:${rawBody}`),
  );
  const expected = `v0=${toHex(mac)}`;

  // Hash both sides to a fixed length so the comparison is timing-safe even
  // when the supplied signature differs in length.
  const [received, computed] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(signature)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(received, computed);
}

async function wakeTheAgent(env: Env): Promise<void> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "site-agent-relay",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_type: "slack-command" }),
      },
    );
    if (!response.ok) {
      console.error(
        JSON.stringify({
          message: "repository_dispatch failed",
          status: response.status,
          body: (await response.text()).slice(0, 300),
        }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "repository_dispatch threw",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      /* The site's own API shares this Worker rather than getting its own.
         One deployment, one set of secrets, and the NVIDIA and Supabase
         credentials stay in exactly one place. Handled before the Slack path
         because that path assumes every POST is a Slack event. */
      const preview = await handleReportPreview(request, env);
      if (preview) return preview;
      const api = await handleApi(request, env, ctx);
      if (api) return api;

      if (request.method !== "POST") {
        return new Response("site-agent relay: ok", { status: 200 });
      }

      // Buffering the whole body is required to verify the signature, and is
      // safe here: Slack event payloads are small and capped by Slack.
      const rawBody = await request.text();

      if (!(await isFromSlack(request, rawBody, env.SLACK_SIGNING_SECRET))) {
        return new Response("invalid signature", { status: 401 });
      }

      const payload = JSON.parse(rawBody) as {
        type?: string;
        challenge?: string;
        event?: {
          type?: string;
          subtype?: string;
          channel?: string;
          user?: string;
          text?: string;
          bot_id?: string;
          reaction?: string;
          item?: { type?: string; channel?: string };
        };
      };

      // One-time handshake when you point Slack at this URL.
      if (payload.type === "url_verification") {
        return Response.json({ challenge: payload.challenge });
      }

      const event = payload.event;
      const fromYou = event?.user === env.SLACK_ALLOWED_USER_ID;

      // Any message you send in the channel is a task — there is no prefix.
      const isTask =
        event?.type === "message" &&
        !event.subtype && // ignore edits, joins, deletions
        !event.bot_id && // never let the agent's own replies retrigger it
        event.channel === env.SLACK_CHANNEL_ID &&
        fromYou &&
        typeof event.text === "string" &&
        event.text.trim().length > 0;

      // Approving or discarding a proposal is a reaction, not a message.
      const isDecision =
        event?.type === "reaction_added" &&
        fromYou &&
        event.item?.type === "message" &&
        event.item.channel === env.SLACK_CHANNEL_ID &&
        typeof event.reaction === "string" &&
        DECISION_REACTIONS.has(event.reaction);

      if (isTask || isDecision) {
        // Slack demands a response inside 3s and retries on anything else —
        // a retry here would mean a duplicate dispatch, so ack first and let
        // the GitHub call finish after the response.
        ctx.waitUntil(wakeTheAgent(env));
      }

      return new Response(null, { status: 200 });
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "relay error",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return new Response("internal error", { status: 500 });
    }
  },
} satisfies ExportedHandler<Env>;