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

function servePages(port, dist = "dist") {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = join(dist, normalize(url).replace(/^(\.\.[/\\])+/, ""));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");

    if (!existsSync(file)) {
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

const PORT = 4319;
const localServer = process.env.BASE_URL ? null : await servePages(PORT);
const BASE = process.env.BASE_URL || `http://localhost:${PORT}`;

let failures = 0;
function check(label, ok) {
  if (!ok) failures++;
  console.log(`${ok ? "pass" : "FAIL"}  ${label}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function go(url) {
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page
    .waitForFunction(() => document.body && document.body.innerText.trim().length > 400, { timeout: 20000 })
    .catch(() => {});
}

const isAppRoute = (path) => /^\/(learn(\/[a-z0-9-]+)?|build)$/.test(path);
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

page.on("response", (r) => {
  if (r.status() < 400) return;
  const path = new URL(r.url()).pathname.replace(/\/$/, "");
  if (isAppRoute(path)) return;
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

  await go(deepLink);
  check("a card deep-links on a cold load", (await page.content()).length > 5000);
} else {
  console.log("FAIL  no card control matched — the selector has drifted");
  failures++;
}

await go(`${BASE}/learn?q=redis`);
check("search survives in the query string", page.url().includes("q=redis"));

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

const body = () => page.evaluate(() => document.body.innerText);

const nextState = async () => {
  for (let waited = 0; waited < 12_000; waited += 300) {
    const text = await body();
    if (/copy link|start again/i.test(text)) return "done";
    const answers = page
      .locator("button")
      .filter({ hasNotText: /back|skip|start over|start again|change last|profile|ask me those/i });
    if ((await answers.count()) > 0 && /\d+\s*\/\s*\d+/.test(text)) return answers;
    await page.waitForTimeout(300);
  }
  return "stuck";
};

for (let i = 0; i < 25; i++) {
  const state = await nextState();
  if (state === "done" || state === "stuck") break;
  await state.first().click();
}

const result = await body();
check("questionnaire reaches the end", /copy link|start again/i.test(result));
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
