/* Render every route to static HTML at build time.
 *
 * The site shipped 6,475 bytes with zero characters of visible text. Every
 * route is client-rendered, so the only description of this person that a
 * crawler could read on the first request was the structured data in the head.
 * Google does execute JavaScript, on a second and slower pass with no guarantee
 * about when, and most other crawlers and nearly every social scraper never do.
 * For someone who is job-seeking and about to speak publicly, that is the
 * difference between being findable and not.
 *
 * This is not server rendering. The app still boots and takes over on the
 * client; what changes is that the file on disk already contains the words. The
 * result is the same HTML a visitor would see after the bundle runs, captured
 * once at build time rather than recomputed per request.
 *
 * Routes come from sitemap.xml rather than a list kept here, so a page that is
 * added to the site and to the sitemap cannot be silently left unrendered.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const PORT = 4327;

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp",
  ".mp4": "video/mp4", ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png",
  ".svg": "image/svg+xml", ".xml": "application/xml", ".pdf": "application/pdf",
  ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain",
};

/* Serves dist the way Pages does, including the SPA fallback, so the routes
   resolve exactly as they will in production. */
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let file = path.join(dist, url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  const body = fs.readFileSync(file);
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  res.end(body);
});

/* Remove any directory form left by an earlier build. A stale
   dist/writing/index.html sitting beside a fresh dist/writing.html makes the
   directory win, and the URL 308s to a trailing slash again. */
for (const entry of ["learn", "build", "writing"]) {
  const dir = path.join(dist, entry);
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, "index.html"))) {
    fs.rmSync(path.join(dir, "index.html"));
  }
}

const sitemap = fs.readFileSync(path.join(dist, "sitemap.xml"), "utf8");
const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname)
  .filter((p, i, all) => all.indexOf(p) === i);

await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

/* The API is not called during prerender. Its answers are per-reader and
   time-dependent, and baking one into a static file would ship a stale answer to
   everybody. Analytics beacons are refused for the same reason: a build must not
   register as traffic. */
await page.route("**/site-agent-relay.sumitgundawar3.workers.dev/**", (r) => r.abort());
await page.route("**/googletagmanager.com/**", (r) => r.abort());

let written = 0;
let smallest = Infinity;
const failures = [];

for (const route of routes) {
  try {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "load", timeout: 30000 });
    // Wait for the app to have put something on the page, not for the network.
    await page.waitForFunction(() => (document.querySelector("#root")?.textContent ?? "").trim().length > 200, null, {
      timeout: 20000,
    });

    const html = await page.content();
    const text = await page.evaluate(() => (document.querySelector("#root")?.textContent ?? "").trim().length);
    if (text < 200) {
      failures.push(`${route}: only ${text} characters rendered`);
      continue;
    }
    smallest = Math.min(smallest, text);

    /* Written as <route>.html, not <route>/index.html.
     *
     * Pages serves an extension-less request from a matching .html file
     * directly, whereas a directory gets a 308 to a trailing slash. Writing
     * directories made every URL in the sitemap redirect once before it
     * resolved, which wastes crawl budget and leaves two addresses for one
     * page. This keeps the clean URL the sitemap and every link already use. */
    const out = route === "/" ? path.join(dist, "index.html") : path.join(dist, `${route.replace(/^\//, "")}.html`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    written++;
  } catch (error) {
    failures.push(`${route}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  }
}

await browser.close();
server.close();

for (const f of failures) console.error(`FAIL  ${f}`);
console.log(`prerender: ${written}/${routes.length} routes written, smallest ${smallest} characters of text`);
process.exit(failures.length ? 1 : 0);
