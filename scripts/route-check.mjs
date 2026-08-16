/**
 * Exercise the router against the built site.
 *
 * Types and a green build say nothing about whether navigation works: a router
 * upgrade can compile perfectly and still break the back button, drop a query
 * param, or fail only on a direct deep-link load where there is no history to
 * fall back on. Those are exactly the paths a human would have to click through
 * by hand, so they are the ones worth automating.
 *
 * Self-contained — it serves dist itself, emulating GitHub Pages:
 *   npm run build && npm run routes
 *
 * And against the deployed site, which is the run that matters — the 404 bounce
 * that GitHub Pages depends on for deep links does not exist locally, and it
 * shipped broken precisely because nothing ever exercised it:
 *   BASE_URL=https://sumitgundawar.com npm run routes
 */

import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json",
  ".woff": "font/woff", ".woff2": "font/woff2", ".pdf": "application/pdf",
};

/* Emulate GitHub Pages, not a dev server.
 *
 * This distinction is the entire reason the deep-link bug shipped. A dev server
 * — and the one in shots.mjs — falls back to index.html for any unknown path
 * and answers 200, so /learn renders and every check passes. GitHub Pages does
 * the opposite: /learn is a missing file, it answers 404, and serves 404.html,
 * which is what bounces the browser through the redirect shim. That shim was
 * broken for as long as the routes existed and nothing local could see it.
 *
 * So this server does what Pages does: real file, or 404.html with a 404. */
function servePages(port, dist = "dist") {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = join(dist, normalize(url).replace(/^(\.\.[/\\])+/, ""));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");

    if (!existsSync(file)) {
      /* Cloudflare Pages serves index.html with a 200 for unknown paths, via
         the _redirects rewrite. It only falls back to 404.html when one exists,
         which is why that file was removed: its presence overrides the rewrite.

         This emulator still read it and crashed the handler once it was gone,
         which failed six checks and sent me looking for a bug in a component
         that was fine. Mirror what Pages actually does now. */
      const notFound = join(dist, "404.html");
      if (existsSync(notFound)) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(readFileSync(notFound));
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(readFileSync(join(dist, "index.html")));
      }
      return;
    }
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  /* Fail loudly on a port clash rather than carrying on.
     A leftover server from an earlier run was holding this port, so listen()
     errored, the process kept going, and every check ran against a stale build
     that happened to still be served there. Six checks failed for reasons that
     had nothing to do with the code under test, which is worse than not running
     at all: a red result nobody can trust costs more than a missing one. */
  return new Promise((resolve, reject) => {
    server.once("error", (err) => {
      reject(
        new Error(
          err.code === "EADDRINUSE"
            ? `port ${port} is already in use, so this run would test whatever is already there rather than the current build. Free it with: lsof -ti:${port} | xargs kill -9`
            : String(err),
        ),
      );
    });
    server.listen(port, () => resolve(server));
  });
}

/* BASE_URL points the same checks at the deployed site. With it unset the
   script is self-contained: no preview server to start first, and the local run
   now reproduces production's 404 semantics. */
const PORT = 4319;
const localServer = process.env.BASE_URL ? null : await servePages(PORT);
const BASE = process.env.BASE_URL || `http://localhost:${PORT}`;

let failures = 0;
function check(label, ok) {
  if (!ok) failures++;
  console.log(`${ok ? "pass" : "FAIL"}  ${label}`);
}

/* "load", not "networkidle". Against production the analytics beacon keeps a
   connection open, so networkidle never fires and every check times out, and
   the run against the deployed site is the only one that sees the 404 bounce.
   But "load" fires before a React.lazy route chunk has resolved, so navigating
   is not the same as being ready. Wait for the app to have rendered something,
   which is the condition actually being relied on. */
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function go(url) {
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page
    .waitForFunction(() => document.body && document.body.innerText.trim().length > 400, { timeout: 20000 })
    .catch(() => {}); // let the assertion that follows report it, not a throw here
}

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

await go(`${BASE}/`);
check("/ renders a heading", (await page.locator("h1").count()) > 0);

await go(`${BASE}/learn`);
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
  await go(deepLink);
  check("a card deep-links on a cold load", (await page.content()).length > 5000);
} else {
  console.log("FAIL  no card control matched — the selector has drifted");
  failures++;
}

await go(`${BASE}/learn?q=redis`);
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
  await go(BASE + encoded);
  await page.waitForTimeout(400);
  check(`404 shim decodes ${encoded} to ${expected}`, page.url() === BASE + expected);
}

await go(`${BASE}/build`);
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
if (localServer) localServer.close();
process.exit(failures ? 1 : 0);
