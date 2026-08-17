/* Static checks for the Worker that a type checker cannot make.
 *
 * The weekly report never ran once. wrangler.jsonc declared two cron triggers,
 * the Worker exported only `fetch`, and the two functions meant to service those
 * triggers were imported and never called. Everything type checked, everything
 * deployed, and every Monday the trigger fired into a Worker with nothing
 * listening. It took a full audit to notice.
 *
 * tsc cannot catch that: a declaration in a JSONC config and a handler in a TS
 * module are not connected by any type. So this connects them by hand, and it
 * runs in the build rather than sitting in a file nobody executes, which was the
 * other half of why the original bug survived.
 */

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

/* JSONC: strip comments before parsing. Only line comments are used here, and
   stripping block comments naively would corrupt any URL containing a slash. */
const wrangler = JSON.parse(wranglerRaw.replace(/^\s*\/\/.*$/gm, ""));

const declared = wrangler.triggers?.crons ?? [];

/* CRON_JOBS is a plain object literal keyed by cron expression, so the keys can
   be read without executing the module, which would need a Workers runtime. */
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

// The export itself. Without it every trigger above is inert.
check("Worker exports a scheduled() handler", /\basync\s+scheduled\s*\(/.test(indexSrc));
check("scheduled() routes through runCron", /runCron\s*\(/.test(indexSrc));

/* postWeekly and postAlerts must reach a caller. They were imported and unused
   for the whole life of the feature, which is the shape of this entire bug. */
for (const fn of ["postWeekly", "postAlerts"]) {
  check(`${fn} is referenced by the cron table`, new RegExp(`run:\\s*${fn}\\b`).test(apiSrc));
}

/* An alert that can only reach Slack is an alert that reaches nobody here,
   because SLACK_BOT_TOKEN is not set on this deployment. */
check("postAlerts can deliver by email, not only Slack", /RESEND_API_KEY[\s\S]{0,600}?renderAlertsEmail/.test(apiSrc));

for (const p of pass) console.log(`pass  ${p}`);
for (const f of failures) console.error(`FAIL  ${f}`);
console.log(`\n${pass.length} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
