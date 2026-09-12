import { createReadStream, existsSync, statSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const BANDS = [
  { name: "iphone-se", width: 375, height: 667 },
  { name: "android-min", width: 360, height: 800 },
  { name: "iphone", width: 390, height: 844 },
  { name: "iphone-max", width: 430, height: 932 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "ipad-air", width: 820, height: 1180 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "ipad-pro", width: 1180, height: 820 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "laptop-mb", width: 1440, height: 900 },
  { name: "laptop-mbp", width: 1512, height: 982 },
  { name: "desktop", width: 1728, height: 1080 },
];

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp",
  ".ico": "image/x-icon", ".json": "application/json", ".xml": "application/xml",
  ".woff": "font/woff", ".woff2": "font/woff2", ".pdf": "application/pdf",
  ".txt": "text/plain", ".mp4": "video/mp4", ".webmanifest": "application/manifest+json",
};

const MIN_TARGET = 44;
const MIN_FONT = 11;
const MIN_PROSE_FONT = 14;

function serve() {
  const server = createServer((req, res) => {
    const url = (req.url || "/").split("?")[0];
    let p = join("dist", normalize(url));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
    if (!existsSync(p)) p = existsSync(`${p}.html`) ? `${p}.html` : join("dist", "index.html");
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const audit = ({ MIN_TARGET, MIN_FONT, MIN_PROSE_FONT }) => {
  const problems = [];
  const de = document.documentElement;

  if (de.scrollWidth > window.innerWidth + 1) {
    const wide = [...document.querySelectorAll("*")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(el).position !== "fixed";
      })
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""}`);
    problems.push(`horizontal overflow: ${de.scrollWidth}px in ${window.innerWidth}px (${wide.join(", ") || "unknown"})`);
  }

  const interactive = [...document.querySelectorAll('a, button, input, select, textarea, [role="button"], summary')];
  for (const el of interactive) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") continue;
    if (style.display === "inline" && el.closest("p, li")) continue;
    if (style.clip === "rect(0px, 0px, 0px, 0px)" || parseFloat(style.clipPath ? 0 : 0) === -1) continue;
    if (r.width <= 4 && r.height <= 4) continue;
    if (r.height < MIN_TARGET - 0.5 || r.width < MIN_TARGET - 0.5) {
      const label = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 36);
      problems.push(`target ${Math.round(r.width)}x${Math.round(r.height)} below ${MIN_TARGET}: "${label}"`);
    }
  }

  for (const el of document.querySelectorAll("p, li, span, div, a, button, td, th")) {
    if (!el.textContent?.trim() || el.children.length) continue;
    const style = getComputedStyle(el);
    const size = parseFloat(style.fontSize);
    if (!size) continue;
    const prose = el.matches("p, li") && el.textContent.trim().length > 60;
    const floor = prose ? MIN_PROSE_FONT : MIN_FONT;
    if (size < floor) {
      problems.push(`font-size ${size}px below ${floor}: "${el.textContent.trim().slice(0, 32)}"`);
    }
  }

  const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((h) => +h.tagName[1]);
  const h1s = headings.filter((l) => l === 1).length;
  if (h1s !== 1) problems.push(`${h1s} h1 elements, expected exactly 1`);
  for (let i = 1; i < headings.length; i += 1) {
    if (headings[i] - headings[i - 1] > 1) {
      problems.push(`heading order jumps h${headings[i - 1]} to h${headings[i]}`);
      break;
    }
  }

  return [...new Set(problems)];
};

const server = await serve();
const base = `http://localhost:${server.address().port}`;
const routes = [
  ...new Set(
    [...readFileSync("public/sitemap.xml", "utf8").matchAll(/<loc>[^<]*?(\/[a-z0-9/-]*)<\/loc>/g)]
      .map((m) => m[1] || "/")
      .filter((r) => !r.startsWith("/learn/") || r === "/learn"),
  ),
  "/learn/caching",
];

const browser = await chromium.launch();
let checked = 0;
const failures = [];

for (const band of BANDS) {
  const page = await browser.newPage({
    viewport: { width: band.width, height: band.height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  for (const route of routes) {
    await page.goto(base + route, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(120);
    const problems = await page.evaluate(audit, { MIN_TARGET, MIN_FONT, MIN_PROSE_FONT });
    checked += 1;
    for (const p of problems) failures.push(`${band.width}px ${route}: ${p}`);
  }
  await page.close();
}

await browser.close();
server.close();

console.log(`layout: ${checked} page renders across ${BANDS.length} widths and ${routes.length} routes`);
if (failures.length) {
  for (const f of failures) console.error(`FAIL  ${f}`);
  console.error(`\n${failures.length} layout problem(s)`);
  process.exit(1);
}
console.log("layout: clean, no overflow, every target 44px or larger, type floor held, heading order sound");
