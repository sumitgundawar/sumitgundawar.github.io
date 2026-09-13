import { chromium } from "playwright";
import { manifest } from "../src/data/learn/manifest.ts";
import { startDist } from "./lib/serve.mjs";
const WIDTHS = [390, 1440];

const measure = () => {
  const out = [];
  for (const svg of document.querySelectorAll("svg[role='group']")) {
    const nodes = [];
    const labels = [];
    for (const g of svg.querySelectorAll("g")) {
      const rect = g.querySelector(":scope > rect");
      const text = g.querySelector(":scope > text");
      if (!rect) continue;
      const box = rect.getBoundingClientRect();
      if (box.width === 0) continue;
      const entry = {
        x: box.left,
        y: box.top,
        r: box.right,
        b: box.bottom,
        text: (text?.textContent ?? "").trim(),
      };
      if (text && rect.getAttribute("fill") === "var(--plate)") labels.push(entry);
      else if (box.width > 60) nodes.push(entry);
    }
    const truncated = Array.from(svg.querySelectorAll("text, tspan"))
      .map((t) => t.textContent ?? "")
      .filter((t) => t.includes("…"));
    out.push({
      label: svg.getAttribute("aria-label") ?? "",
      nodes,
      labels,
      truncated,
    });
  }
  return out;
};

const overlaps = (a, b) => a.x < b.r - 1 && a.r > b.x + 1 && a.y < b.b - 1 && a.b > b.y + 1;

const { base: BASE, close } = await startDist();
const cards = manifest.map((c) => c.id);
const fails = [];
let diagrams = 0;
const browser = await chromium.launch();

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  for (const id of cards) {
    await page.goto(`${BASE}/learn/${id}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(60);
    const svgs = await page.evaluate(measure);
    for (const svg of svgs) {
      diagrams += 1;
      for (const lab of svg.labels) {
        for (const node of svg.nodes) {
          if (overlaps(lab, node)) {
            fails.push(
              `OVERLAP  /learn/${id} @${width}  "${lab.text}" crosses "${node.text.slice(0, 40)}"`,
            );
          }
        }
      }
      for (let i = 0; i < svg.labels.length; i += 1) {
        for (let j = i + 1; j < svg.labels.length; j += 1) {
          if (overlaps(svg.labels[i], svg.labels[j])) {
            fails.push(
              `LABELS   /learn/${id} @${width}  "${svg.labels[i].text}" crosses "${svg.labels[j].text}"`,
            );
          }
        }
      }
      for (const t of svg.truncated) {
        fails.push(`TRUNCATED  /learn/${id} @${width}  ${JSON.stringify(t)}`);
      }
    }
  }
  await page.close();
}
await browser.close();
close();

if (fails.length) {
  console.error(`FAIL  diagrams: ${fails.length} problems across ${diagrams} renders\n`);
  for (const f of [...new Set(fails)].slice(0, 60)) console.error("  " + f);
  process.exit(1);
}
console.log(`diagrams: ${diagrams} renders across ${cards.length} cards x ${WIDTHS.length} widths, clean`);
