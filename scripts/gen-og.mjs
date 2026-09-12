/* The share image, and the icons, rendered rather than drawn by hand.
 *
 * A link to this site was previewing with an image that described nothing about
 * it, and a link preview is the whole of the first impression on Slack, on
 * LinkedIn and in a message. This generates the card from the same palette and
 * type as the site, so the preview looks like the page it opens, and it is
 * generated rather than exported from a design tool so that changing the words
 * is a one-line diff rather than an afternoon.
 *
 * Playwright is already a dependency for prerendering, so this costs nothing
 * new to run. Sizes: 1200 by 630 is the Open Graph standard and is what every
 * platform crops from; 180 is the Apple touch icon; 32 and 16 are the classic
 * favicon sizes for browsers that will not take the SVG.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const ICON = readFileSync("public/favicon.svg", "utf8");

/* The palette is read from the stylesheet rather than restated here.
 *
 * It used to be four hand-copied hex values, and all four had drifted from the
 * site they were meant to match: the ground was #14171a against a site whose
 * ink is #0e1110, which is both lighter and cooler, so the icon read as a
 * blue-grey tile on a green-black page and the card behind a shared link did
 * the same. The text was #f1f4f2 against a warm #edebe3. The manifest then
 * published #14171a as the theme colour while index.html published #0e1110, so
 * the site gave two answers to one question.
 *
 * None of that could be seen in a diff, and all of it follows from the palette
 * living in two places. Now there is one. */
function palette() {
  const css = readFileSync("src/index.css", "utf8");
  const read = (name) => {
    const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
    if (!m) throw new Error(`gen-og: --${name} not found in src/index.css`);
    return m[1];
  };
  return { INK: read("ink"), PAPER: read("c-text"), GREEN: read("signal"), DIM: read("c-text-dim") };
}

const { INK, PAPER, GREEN, DIM } = palette();

/* Deliberately not a poster. The card carries the three things someone deciding
   whether to click actually wants: who this is, what is on the other side of
   the link, and one reason to believe it is worth the tap. */
const card = `
<!doctype html>
<meta charset="utf-8">
<style>
  @font-face { font-family: fallback; src: local("Helvetica Neue"), local("Arial"); }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; background: ${INK}; color: ${PAPER};
    font-family: "Mona Sans", "Helvetica Neue", Arial, sans-serif;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 64px 72px; position: relative; overflow: hidden;
  }
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 60px 60px;
  }
  .row { display: flex; align-items: center; gap: 16px; position: relative; }
  .icon { width: 56px; height: 56px; }
  .mono { font-family: "SF Mono", Menlo, Consolas, monospace; }
  .label { font-size: 20px; letter-spacing: 0.16em; text-transform: uppercase; color: ${DIM}; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: ${GREEN}; }
  h1 { font-size: 78px; line-height: 1.02; letter-spacing: -0.03em; font-weight: 600; position: relative; }
  h1 em { font-style: normal; color: ${GREEN}; }
  p { font-size: 27px; line-height: 1.45; color: #c9d1cd; max-width: 22em; margin-top: 22px; position: relative; }
  .foot { display: flex; align-items: baseline; gap: 28px; position: relative; }
  .chip {
    font-size: 20px; letter-spacing: 0.04em; color: ${PAPER};
    border: 1px solid rgba(255,255,255,0.18); padding: 9px 16px;
  }
  .site { font-size: 22px; color: ${DIM}; margin-left: auto; }
</style>
<div class="grid"></div>

<div class="row">
  <span class="icon">${ICON}</span>
  <span class="mono label">sumit gundawar</span>
  <span class="dot"></span>
  <span class="mono label" style="letter-spacing:0.1em">open to roles</span>
</div>

<div>
  <h1>Systems that survive<br><em>production</em>.</h1>
  <p>APIs, integrations and data pipelines, written up with what broke and what the fix cost. Plus a free system design course and an architecture builder.</p>
</div>

<div class="foot">
  <span class="mono chip">/learn</span>
  <span class="mono chip">/build</span>
  <span class="mono chip">JAX London 2026</span>
  <span class="mono site">sumitgundawar.com</span>
</div>
`;

/* The mark carries its ground colour, so it is rewritten from the palette too
   rather than being a fifth copy of the ink hex, and the corrected SVG is
   written back. Without writing it back the file on disk stays a hand-edited
   copy that can drift again, which is the whole defect this is fixing: after
   this runs, the SVG, the three PNGs, the ICO and the manifest are all derived
   from src/index.css, and the only ink written by hand anywhere is the
   theme-color in index.html, which check:brand asserts. */
const icon = ICON.replace(/(<rect[^>]*fill=")#[0-9a-fA-F]{3,8}(")/, `$1${INK}$2`);
if (icon !== ICON) writeFileSync("public/favicon.svg", icon);

const iconPage = (size) => `
<!doctype html>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; }
  body { width: ${size}px; height: ${size}px; }
  svg { width: ${size}px; height: ${size}px; display: block; }
</style>
${icon}
`;

const browser = await chromium.launch();

const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(card, { waitUntil: "load" });
await page.screenshot({ path: "public/og.png" });

for (const size of [180, 32, 16]) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(iconPage(size), { waitUntil: "load" });
  await p.screenshot({ path: size === 180 ? "public/apple-touch-icon.png" : `public/favicon-${size}.png`, omitBackground: true });
  await p.close();
}

await browser.close();

/* A web app manifest, so an installed shortcut and an Android home screen use
   the same mark rather than a screenshot of the page. */
writeFileSync(
  "public/site.webmanifest",
  JSON.stringify(
    {
      name: "Sumit Gundawar",
      short_name: "Sumit",
      start_url: "/",
      display: "standalone",
      background_color: INK,
      theme_color: INK,
      icons: [
        { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
        { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    null,
    2,
  ) + "\n",
);

/* favicon.ico, because browsers request it from the root whether or not it is
   declared, and the one that was there was a black and white leftover with none
   of this mark in it. An ICO may embed PNGs, which every browser since IE11
   reads, so the two already-generated sizes are wrapped rather than redrawn. */
const icoSizes = [32, 16];
const pngs = icoSizes.map((s) => readFileSync(`public/favicon-${s}.png`));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2); // type 1 = icon
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(icoSizes[i], e);
  header.writeUInt8(icoSizes[i], e + 1);
  header.writeUInt8(0, e + 2); // palette entries, 0 for true colour
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); // colour planes
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync("public/favicon.ico", Buffer.concat([header, ...pngs]));

console.log(
  `og: og.png 1200x630, icons 180/32/16, favicon.ico (${icoSizes.join("+")}), manifest, palette ink ${INK} text ${PAPER}`,
);
