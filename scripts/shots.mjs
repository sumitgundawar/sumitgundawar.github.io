import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = "dist";
const OUT = process.argv[2] || ".shots";

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
  { name: "phone-sm", width: 360, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "ipad-portrait", width: 768, height: 1024 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "ipad-landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },

  { name: "desktop-lg", width: 1920, height: 1080 },
  { name: "desktop-xl", width: 2560, height: 1440 },
];

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".ico": "image/x-icon", ".json": "application/json",
  ".woff": "font/woff", ".woff2": "font/woff2", ".pdf": "application/pdf",
};

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

  await page.evaluate(async () => {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    await new Promise((r) => setTimeout(r, 150));
  });

  await page.waitForTimeout(400);

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

    const nav = document.querySelector("nav[aria-label=Primary]");
    const collisions = [];
    if (nav) {
      const n = nav.getBoundingClientRect();
      for (const el of document.querySelectorAll("h1, h2, p, a, button, span")) {
        if (nav.contains(el)) continue;
        const s = getComputedStyle(el);
        if (s.visibility === "hidden" || s.display === "none") continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const ox = Math.min(n.right, r.right) - Math.max(n.left, r.left);
        const oy = Math.min(n.bottom, r.bottom) - Math.max(n.top, r.top);
        if (ox > 2 && oy > 2) collisions.push(`${el.tagName.toLowerCase()} "${(el.textContent || "").trim().slice(0, 30)}"`);
      }
    }

    return {
      scrolls: document.documentElement.scrollWidth > docWidth + 1,
      docWidth,
      scrollWidth: document.documentElement.scrollWidth,
      worst: guilty.sort((a, b) => b.overshoot - a.overshoot).slice(0, 8),
      collisions: [...new Set(collisions)].slice(0, 6),
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

let broken = 0;
for (const r of written) {
  const bits = [];
  if (r.worst.length) bits.push(`CLIPS ${r.worst.length} element(s), worst +${r.worst[0].overshoot}px`);
  if (r.collisions.length) bits.push(`${r.collisions.length} UNDER FIXED NAV`);
  if (r.scrolls) bits.push(`page scrolls sideways by ${r.scrollWidth - r.docWidth}px`);
  if (bits.length) broken++;
  console.log(`${r.path}  ${r.name} (${r.width}px): ${r.file} — ${bits.length ? bits.join("; ") : "clean"}`);
  for (const g of r.worst) console.log(`    +${g.overshoot}px  <${g.tag} class="${g.cls}">`);
  for (const c of r.collisions) console.log(`    under nav: ${c}`);
}
console.log(broken ? `\n${broken} of ${written.length} screens have layout faults` : `\nall ${written.length} screens clean`);
