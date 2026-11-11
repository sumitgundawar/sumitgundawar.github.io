import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { startDist } from "./lib/serve.mjs";

const xml = readFileSync("public/sitemap.xml", "utf8");
const routes = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1].replace(/^https?:\/\/[^/]+/, "") || "/")
  .filter((r, i, a) => a.indexOf(r) === i);

const WIDTHS = [390, 768, 1024, 1440];

const audit = () => {
  const out = [];
  const de = document.documentElement;
  if (de.scrollWidth > window.innerWidth + 1) out.push(`overflow ${de.scrollWidth}>${window.innerWidth}`);

  const boxes = [...document.querySelectorAll("main h1, main h2, main h3, main p, main a, main button")]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter((b) => b.r.width > 2 && b.r.height > 2);

  for (const b of boxes) {
    const cs = getComputedStyle(b.el);
    if (b.r.right > window.innerWidth + 1) out.push(`offscreen-right: ${(b.el.innerText || "").slice(0, 28)}`);
    if (b.el.scrollWidth > b.el.clientWidth + 2 && cs.overflow !== "visible" && cs.textOverflow !== "ellipsis") {
      out.push(`clipped: ${(b.el.innerText || "").slice(0, 28)}`);
    }
  }
  const main = document.querySelector("main");
  if (main && main.getBoundingClientRect().height < 200) out.push("main shorter than 200px");
  if (!document.querySelector("main h1")) out.push("no h1 in main");
  return out;
};

const server = await startDist();
const browser = await chromium.launch();
const problems = [];
let screens = 0;

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 80)));
  for (const route of routes) {
    errs.length = 0;
    try {
      await page.goto(server.base + route, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(220);
      const found = await page.evaluate(audit);
      screens += 1;
      for (const f of [...found, ...errs.map((e) => "jserror " + e)]) {
        problems.push(`${String(width).padStart(4)} ${route}  ${f}`);
      }
    } catch (e) {
      problems.push(`${String(width).padStart(4)} ${route}  LOAD ${String(e).split("\n")[0].slice(0, 60)}`);
    }
  }
  await ctx.close();
}
await browser.close();
await server.close();

console.log(`swept ${screens} screens across ${routes.length} routes x ${WIDTHS.length} widths`);
const uniq = [...new Set(problems)];
console.log(`problems: ${uniq.length}`);
for (const p of uniq.slice(0, 40)) console.log("  " + p);
