/**
 * Exercise the router against the built site.
 *
 * Types and a green build say nothing about whether navigation works: a router
 * upgrade can compile perfectly and still break the back button, drop a query
 * param, or fail only on a direct deep-link load where there is no history to
 * fall back on. Those are exactly the paths a human would have to click through
 * by hand, so they are the ones worth automating.
 *
 * Run against `npm run preview` on port 4173:
 *   npm run build && npx vite preview --port 4173 &
 *   npm run routes
 *
 * And against the deployed site, which is the run that matters — the 404 bounce
 * that GitHub Pages depends on for deep links does not exist locally, and it
 * shipped broken precisely because nothing ever exercised it:
 *   BASE_URL=https://sumitgundawar.com npm run routes
 */

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:4173";

let failures = 0;
function check(label, ok) {
  if (!ok) failures++;
  console.log(`${ok ? "pass" : "FAIL"}  ${label}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

/* A router that throws still renders the shell, so a screenshot looks fine while
   the page is dead. Collect anything that fails.

   Every path the client router owns. On GitHub Pages each of these is a real
   missing file, so the network 404 is the bounce firing, not a fault. Keep this
   in step with the routes in App.tsx. Correctness is still asserted separately —
   the deep-link check requires the page to actually render — so exempting the
   request here cannot hide a broken route, only a broken asset it never was. */
const isAppRoute = (path) => /^\/(learn(\/[a-z0-9-]+)?|build)$/.test(path);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

/* Judge failed requests by the URL that actually failed, not by the console
   text. The console message for a 404 carries no URL, so matching on it means
   guessing from whatever page.url() happens to be mid-navigation — which is
   how an exemption ends up swallowing real failures. */
page.on("response", (r) => {
  if (r.status() < 400) return;
  const path = new URL(r.url()).pathname.replace(/\/$/, "");
  if (isAppRoute(path)) return; // the bounce itself
  errors.push(`${r.status()} ${r.url()}`);
});

await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
check("/ renders a heading", (await page.locator("h1").count()) > 0);

await page.goto(`${BASE}/learn`, { waitUntil: "networkidle" });
check("/learn renders", (await page.content()).length > 5000);

const card = page
  .locator("button, a")
  .filter({ hasText: /Caching|Networking|API design/ })
  .first();

if (await card.count()) {
  await card.click();
  await page.waitForTimeout(600);
  check("opening a card puts its id in the URL", /\/learn\/[a-z-]+/.test(page.url()));

  const deepLink = page.url();

  await page.goBack();
  await page.waitForTimeout(600);
  check("back returns to the index", page.url().replace(/\?.*/, "").endsWith("/learn"));

  // Loading the URL cold is the case that breaks: no history, no prior state.
  await page.goto(deepLink, { waitUntil: "networkidle" });
  check("a card deep-links on a cold load", (await page.content()).length > 5000);
} else {
  console.log("FAIL  no card control matched — the selector has drifted");
  failures++;
}

await page.goto(`${BASE}/learn?q=redis`, { waitUntil: "networkidle" });
check("search survives in the query string", page.url().includes("q=redis"));

/* GitHub Pages has no SPA rewrite: /learn is a 404, and 404.html bounces the
   browser to /?/learn for the shim in index.html to decode back. A dev server
   routes /learn itself and never runs that shim, so this path is invisible
   locally and is the only thing a real visitor to a shared link ever hits.
   It shipped broken — "/" + "/learn" concatenated to "//learn", which is
   protocol-relative, so the browser resolved the host as "learn". */
for (const [encoded, expected] of [
  ["/?/learn", "/learn"],
  ["/?/learn&q=redis", "/learn?q=redis"],
  ["/?/build", "/build"],
]) {
  await page.goto(BASE + encoded, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check(`404 shim decodes ${encoded} to ${expected}`, page.url() === BASE + expected);
}

await page.goto(`${BASE}/build`, { waitUntil: "networkidle" });
check("/build renders", (await page.content()).length > 3000);

/* Walk the whole questionnaire. This is the part of the site with real state —
   ten answers, a recommendation derived from them, and a diagram built from
   that. It renders a plausible-looking shell at every step even when the
   recommendation logic is broken, so only finishing the run proves anything.
   Drive it by the progress counter, not by looking for words like
   "recommended": that string is in the intro copy and matching it exits the
   loop on question one while reporting success. */
const body = () => page.evaluate(() => document.body.innerText);
for (let i = 0; i < 25; i++) {
  if (!/\d+\s*\/\s*10/.test(await body())) break;
  const answers = page
    .locator("button")
    .filter({ hasNotText: /back|skip|start over|start again|change last|profile/i });
  if (!(await answers.count())) break;
  await answers.first().click();
  await page.waitForTimeout(400);
}

const result = await body();
check("questionnaire reaches the end", !/\d+\s*\/\s*10/.test(result));
check(
  "recommendation names real technologies",
  /(Postgres|Redis|Kafka|S3|Cloudflare|Fargate|Cloud Run|SQS|Sentry)/i.test(result),
);
check("recommendation renders a diagram", (await page.locator("svg").count()) > 0);
check("components offer an alternative", /switch this/i.test(result));

check("no runtime errors", errors.length === 0);
if (errors.length) console.log(errors.slice(0, 8).join("\n"));

await browser.close();
process.exit(failures ? 1 : 0);
