import { handleApi, handleBroadcast, handleCronRun, handleNewsletterArchive, handleReportPreview, handleStatus, runCron, type ApiEnv } from "./api";
import { handleNewsletterBatch, type NewsletterEnv, type SendJob } from "./newsletter";

interface Env extends ApiEnv, NewsletterEnv {
  SLACK_SIGNING_SECRET: string;
  GITHUB_TOKEN: string;

  GITHUB_REPO: string;
  SLACK_CHANNEL_ID: string;
  SLACK_ALLOWED_USER_ID: string;
}

const MAX_SKEW_SECONDS = 300;

const DECISION_REACTIONS = new Set(["white_check_mark", "x"]);

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function isFromSlack(
  request: Request,
  rawBody: string,
  signingSecret: string,
): Promise<boolean> {
  const timestamp = request.headers.get("X-Slack-Request-Timestamp");
  const signature = request.headers.get("X-Slack-Signature");
  if (!timestamp || !signature) return false;

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
      const preview = await handleReportPreview(request, env);
      if (preview) return preview;
      const cron = await handleCronRun(request, env);
      if (cron) return cron;
      const broadcast = await handleBroadcast(request, env);
      if (broadcast) return broadcast;
      const archive = await handleNewsletterArchive(request, env);
      if (archive) return archive;
      const status = await handleStatus(request, env);
      if (status) return status;
      const api = await handleApi(request, env, ctx);
      if (api) return api;

      if (request.method !== "POST") {
        return new Response("site-agent relay: ok", { status: 200 });
      }

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

      if (payload.type === "url_verification") {
        return Response.json({ challenge: payload.challenge });
      }

      const event = payload.event;
      const fromYou = event?.user === env.SLACK_ALLOWED_USER_ID;

      const isTask =
        event?.type === "message" &&
        !event.subtype &&
        !event.bot_id &&
        event.channel === env.SLACK_CHANNEL_ID &&
        fromYou &&
        typeof event.text === "string" &&
        event.text.trim().length > 0;

      const isDecision =
        event?.type === "reaction_added" &&
        fromYou &&
        event.item?.type === "message" &&
        event.item.channel === env.SLACK_CHANNEL_ID &&
        typeof event.reaction === "string" &&
        DECISION_REACTIONS.has(event.reaction);

      if (isTask || isDecision) {
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

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    const result = await runCron(controller.cron, env);
    if (!result.ok) throw new Error(`cron ${controller.cron} failed: ${result.error}`);
  },

  async queue(batch: MessageBatch<SendJob>, env: Env): Promise<void> {
    await handleNewsletterBatch(batch, env);
  },
} satisfies ExportedHandler<Env, SendJob>;
