import { chromium } from "playwright";
import { startDist } from "./lib/serve.mjs";
const ROUTES = ["/", "/learn", "/learn/caching", "/writing", "/build", "/archive"];
const WIDTHS = [390, 820, 1440];

const LOWERCASE_OK = new Set([
  "pl.",
  "rss",
  "linkedin",
  "px",
  "ms",
  "iOS",
]);

const collect = () => {
  const out = [];
  const own = (el) =>
    Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join("")
      .replace(/\s+/g, " ")
      .trim();

  for (const el of document.querySelectorAll("body *")) {
    const text = own(el);
    if (!text) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    let container = el.parentElement;
    let containerWidth = 0;
    while (container && container !== document.body) {
      const cw = container.clientWidth;
      if (cw > 0) {
        containerWidth = cw;
        break;
      }
      container = container.parentElement;
    }

    let neighbour = false;
    if (container) {
      for (const sib of container.children) {
        if (sib === el || sib.contains(el)) continue;
        const sb = sib.getBoundingClientRect();
        if (sb.width < 24 || sb.bottom <= box.top || sb.top >= box.bottom) continue;
        if (sb.left >= box.right - 2 || sb.right <= box.left + 2) {
          neighbour = true;
          break;
        }
      }
    }

    out.push({
      text,
      tag: el.tagName.toLowerCase(),
      cls: el.className && typeof el.className === "string" ? el.className : "",
      transform: cs.textTransform,
      fontSize: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      width: Math.round(box.width),
      containerWidth: Math.round(containerWidth),
      neighbour,
      inCode: !!el.closest("code, pre, svg, [data-allow-lowercase]"),
    });
  }
  return out;
};

const words = (t) => t.split(/\s+/).filter(Boolean).length;
const hasInnerCapital = (t) => /[a-z][A-Z]|\s[A-Z]/.test(t);
const structural = (n) =>
  ["h1", "h2", "h3", "h4", "button", "a", "summary", "dt", "th", "figcaption", "label", "legend"].includes(
    n.tag,
  ) ||
  /eyebrow|kicker/.test(n.cls) ||
  n.text.length <= 64;

const fails = [];
const add = (route, width, rule, node, detail) =>
  fails.push(`${rule}  ${route} @${width}  ${detail}\n        <${node.tag} class="${node.cls.slice(0, 72)}">  ${JSON.stringify(node.text.slice(0, 96))}`);

const { base: BASE, close } = await startDist();
const browser = await chromium.launch();
let checked = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(120);
    const nodes = await page.evaluate(collect);
    checked += nodes.length;

    for (const n of nodes) {
      if (n.inCode || /\bsr-only\b/.test(n.cls)) continue;

      if (n.transform === "uppercase") {
        if (words(n.text) > 4) {
          add(route, width, "CAPS-SENTENCE", n, `${words(n.text)} words forced to uppercase`);
        } else if (hasInnerCapital(n.text)) {
          add(route, width, "CAPS-PROPER  ", n, "proper noun flattened by text-transform");
        }
      }

      const first = n.text.replace(/^[\p{P}\p{S}\s]+/u, "")[0] ?? "";
      if (
        structural(n) &&
        first >= "a" &&
        first <= "z" &&
        n.transform === "none" &&
        n.text.length > 2 &&
        !LOWERCASE_OK.has(n.text.replace(/^[\p{P}\p{S}\s]+/u, "").toLowerCase().split(/\s+/)[0]) &&
        !/^[a-z0-9._%+-]+@/.test(n.text) &&
        !/^[a-z0-9-]+(\.[a-z0-9-]+)+\b/.test(n.text)
      ) {
        add(route, width, "LOWERCASE    ", n, "label or heading starts lowercase");
      }

      if (
        n.fontSize >= 14 &&
        n.text.length > 150 &&
        n.containerWidth > 700 &&
        n.tag !== "figcaption" &&
        !n.neighbour &&
        n.width < n.containerWidth * 0.62
      ) {
        add(
          route,
          width,
          "NARROW       ",
          n,
          `prose ${n.width}px inside ${n.containerWidth}px with nothing beside it`,
        );
      }
    }
  }
  await page.close();
}

await browser.close();
close();

if (fails.length) {
  console.error(`FAIL  typography: ${fails.length} problems across ${ROUTES.length} routes\n`);
  for (const f of fails) console.error("  " + f);
  process.exit(1);
}
console.log(`typography: ${checked} text nodes across ${ROUTES.length} routes x ${WIDTHS.length} widths, clean`);
