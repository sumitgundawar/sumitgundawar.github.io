/**
 * Screenshot the built site at phone, tablet and desktop widths.
 *
 * The agent edits layout blind otherwise: it cannot tell whether a change fixed
 * the overflow or merely moved it, and "content is clipped" is invisible in a
 * diff. Run after `npm run build`; writes PNGs the agent can read.
 *
 *   node scripts/shots.mjs [outDir]
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = "dist";
const OUT = process.argv[2] || ".shots";

/** Routes come from the router itself, so a new page is covered the moment it
 *  exists rather than silently going unscreenshotted. */
function routes() {
  try {
    const src = readFileSync("src/App.tsx", "utf8");
    const found = [...src.matchAll(/path=["'`]([^"'`]+)["'`]/g)]
      .map((m) => m[1])
      .filter((p) => p.startsWith("/") && !p.includes(":") && !p.includes("*"));
    return [...new Set(["/", ...found])];
  } catch {
    return ["/"];
  }
}

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },    // iPhone 14
  { name: "tablet", width: 820, height: 1180 },  // iPad Air
  { name: "desktop", width: 1440, height: 900 },
];

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".ico": "image/x-icon", ".json": "application/json",
  ".woff": "font/woff", ".woff2": "font/woff2", ".pdf": "application/pdf",
};

/** Static server with SPA fallback, so client-side routes render. */
function serve(port) {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = join(DIST, normalize(url).replace(/^(\.\.[/\\])+/, ""));
    if (!existsSync(file) || statSync(file).isDirectory()) {
      const index = join(file, "index.html");
      file = existsSync(index) ? index : join(DIST, "index.html");
    }
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

const port = 4319;
const server = await serve(port);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const written = [];

for (const path of routes()) {
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  await page.goto(`http://localhost:${port}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400); // let fonts settle so text metrics are real

  // Horizontal overflow is the most common mobile break and is easy to miss in
  // a screenshot, so measure it and name the widest offenders explicitly.
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const guilty = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > docWidth + 1) {
        guilty.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 80),
          overshoot: Math.round(r.right - docWidth),
        });
      }
    }
    return {
      scrolls: document.documentElement.scrollWidth > docWidth + 1,
      docWidth,
      scrollWidth: document.documentElement.scrollWidth,
      worst: guilty.sort((a, b) => b.overshoot - a.overshoot).slice(0, 8),
    };
  });

  const slug = path === "/" ? "home" : path.replace(/\//g, "-").replace(/^-/, "");
  const file = join(OUT, `${slug}-${vp.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  written.push({ ...vp, path, file, ...overflow });
  await page.close();
}
}

await browser.close();
server.close();

for (const r of written) {
  const flag = r.scrolls ? `OVERFLOWS by ${r.scrollWidth - r.docWidth}px` : "no horizontal overflow";
  console.log(`${r.path}  ${r.name} (${r.width}px): ${r.file} — ${flag}`);
  for (const g of r.worst) {
    console.log(`    +${g.overshoot}px  <${g.tag} class="${g.cls}">`);
  }
}
