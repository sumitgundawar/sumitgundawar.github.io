import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const ICON = readFileSync("public/favicon.svg", "utf8");

function palette() {
  const css = readFileSync("src/index.css", "utf8");
  const read = (name) => {
    const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
    if (!m) throw new Error(`gen-og: --${name} not found in src/index.css`);
    return m[1];
  };
  return { INK: read("ink"), PAPER: read("text-hi"), GREEN: read("accent"), DIM: read("text-lo") };
}

const { INK, PAPER, GREEN, DIM } = palette();

const card = `
<!doctype html>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; background: ${INK}; color: ${PAPER};
    font-family: Georgia, "Times New Roman", serif;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 64px 72px; position: relative;
  }
  .row { display: flex; align-items: center; gap: 18px; }
  .icon { width: 44px; height: 44px; }
  .mono { font-family: "SF Mono", Menlo, Consolas, monospace; }
  .kicker { font-size: 19px; letter-spacing: 0.14em; text-transform: uppercase; color: ${DIM}; font-weight: 700; }
  h1 { font-size: 92px; line-height: 0.98; letter-spacing: -0.03em; font-weight: 500; max-width: 15em; }
  p { font-size: 26px; line-height: 1.45; color: ${PAPER}; opacity: 0.78; max-width: 24em; margin-top: 26px; }
  .foot { display: flex; align-items: baseline; gap: 20px; }
  .fig { font-size: 20px; color: ${PAPER}; border: 1px solid ${DIM}; padding: 10px 16px; letter-spacing: 0.03em; white-space: nowrap; }
  .site { font-size: 21px; color: ${DIM}; margin-left: auto; letter-spacing: 0.04em; }
  .mark { position: absolute; width: 14px; height: 14px; border-color: ${GREEN}; }
  .tl { left: 26px; top: 26px; border-left: 2px solid; border-top: 2px solid; }
  .tr { right: 26px; top: 26px; border-right: 2px solid; border-top: 2px solid; }
  .bl { left: 26px; bottom: 26px; border-left: 2px solid; border-bottom: 2px solid; }
  .br { right: 26px; bottom: 26px; border-right: 2px solid; border-bottom: 2px solid; }
</style>
<span class="mark tl"></span><span class="mark tr"></span>
<span class="mark bl"></span><span class="mark br"></span>

<div class="row">
  <span class="icon">${ICON}</span>
  <span class="mono kicker">sumit gundawar</span>
</div>

<div>
  <h1>I design systems around how they fail.</h1>
  <p>Full-stack engineer in London. Sole engineer on a multi-product clinical platform, and 221 topics of system design where every number carries its source.</p>
</div>

<div class="foot">
  <span class="mono fig">$75M+ sales impacted</span>
  <span class="mono fig">13h to 8h</span>
  <span class="mono fig">13+ products shipped</span>
  <span class="mono site">sumitgundawar.com</span>
</div>
`;

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

const icoSizes = [32, 16];
const pngs = icoSizes.map((s) => readFileSync(`public/favicon-${s}.png`));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(icoSizes[i], e);
  header.writeUInt8(icoSizes[i], e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
writeFileSync("public/favicon.ico", Buffer.concat([header, ...pngs]));

console.log(
  `og: og.png 1200x630, icons 180/32/16, favicon.ico (${icoSizes.join("+")}), manifest, palette ink ${INK} text ${PAPER}`,
);
