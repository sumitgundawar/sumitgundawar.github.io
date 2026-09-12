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

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let file = path.join(dist, url);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, "index.html");
  const body = fs.readFileSync(file);
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  res.end(body);
});

for (const entry of ["learn", "build", "writing", "archive"]) {
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

await page.route("**/site-agent-relay.sumitgundawar3.workers.dev/**", (r) => r.abort());
await page.route("**/googletagmanager.com/**", (r) => r.abort());

let written = 0;
let smallest = Infinity;
const failures = [];

for (const route of routes) {
  try {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: "load", timeout: 30000 });

    await page.waitForFunction(
      () =>
        (document.querySelector("#root")?.textContent ?? "").trim().length > 200 &&
        !document.querySelector("[data-loading]"),
      null,
      { timeout: 20000 },
    );

    const html = await page.content();
    const text = await page.evaluate(() => (document.querySelector("#root")?.textContent ?? "").trim().length);
    if (text < 200) {
      failures.push(`${route}: only ${text} characters rendered`);
      continue;
    }
    smallest = Math.min(smallest, text);

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
