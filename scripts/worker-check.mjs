import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const failures = [];
const pass = [];
const check = (name, ok, detail = "") => (ok ? pass : failures).push(`${name}${detail ? `: ${detail}` : ""}`);

const wranglerRaw = read("worker/wrangler.jsonc");
const indexSrc = read("worker/src/index.ts");
const apiSrc = read("worker/src/api.ts");

const wrangler = JSON.parse(wranglerRaw.replace(/^\s*\/\/.*$/gm, ""));

const declared = wrangler.triggers?.crons ?? [];

const jobsBlock = apiSrc.match(/export const CRON_JOBS[^{]*\{([\s\S]*?)\n\};/);
const registered = jobsBlock ? [...jobsBlock[1].matchAll(/"([^"]+)":\s*\{/g)].map((m) => m[1]) : [];

check("CRON_JOBS table found in api.ts", Boolean(jobsBlock));

if (declared.length === 0) {
  check("wrangler.jsonc declares at least one cron", false, "triggers.crons is empty or missing");
} else {
  for (const cron of declared) {
    check(`cron "${cron}" has a registered job`, registered.includes(cron), registered.includes(cron) ? "" : `known: ${registered.join(", ") || "none"}`);
  }
  for (const cron of registered) {
    check(`job "${cron}" is actually scheduled`, declared.includes(cron), declared.includes(cron) ? "" : "registered in CRON_JOBS but not in wrangler.jsonc, so it never fires");
  }
}

check("Worker exports a scheduled() handler", /\basync\s+scheduled\s*\(/.test(indexSrc));
check("scheduled() routes through runCron", /runCron\s*\(/.test(indexSrc));

for (const fn of ["postWeekly", "postAlerts"]) {
  check(`${fn} is referenced by the cron table`, new RegExp(`run:\\s*${fn}\\b`).test(apiSrc));
}

check("postAlerts can deliver by email, not only Slack", /RESEND_API_KEY[\s\S]{0,600}?renderAlertsEmail/.test(apiSrc));

const modelsSrc = read("worker/src/models.ts");
for (const status of ["403", "404", "410"]) {
  check(
    `a ${status} skips that model rather than ending the chain`,
    new RegExp(`retriable[\\s\\S]{0,400}?${status}`).test(modelsSrc),
  );
}
const retriableBody = modelsSrc.slice(modelsSrc.indexOf("function retriable"), modelsSrc.indexOf("function retriable") + 400);
check(
  "a 401 still stops the chain rather than retrying ten times",
  !/\b401\b/.test(retriableBody),
);

for (const p of pass) console.log(`pass  ${p}`);
for (const f of failures) console.error(`FAIL  ${f}`);
console.log(`\n${pass.length} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
