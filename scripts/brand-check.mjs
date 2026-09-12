/* One ink, everywhere it is written down.
 *
 * The icon pipeline kept its own palette: four hex values hand-copied into
 * gen-og.mjs, and all four had drifted from the site. The ground was #14171a
 * against a page whose ink is #0e1110, lighter and cooler, so the favicon read
 * as a blue-grey tile on a green-black page and so did the card behind every
 * shared link. site.webmanifest then published #14171a as the theme colour
 * while index.html published #0e1110: two answers to one question, in one site.
 *
 * gen-og now derives all of it from src/index.css and writes the SVG, the PNGs,
 * the ICO and the manifest from that single source. This checks the one value
 * that is still written by hand, plus that the icon files exist and actually
 * contain the mark, because a black and white favicon.ico from a previous life
 * sat in public/ for over a year and nothing noticed.
 */
import { readFileSync, statSync } from "node:fs";

const css = readFileSync("src/index.css", "utf8");
const ink = css.match(/--ink:\s*(#[0-9a-fA-F]{3,8})/)?.[1];
if (!ink) {
  console.error("FAIL  --ink not found in src/index.css");
  process.exit(1);
}

const problems = [];
const check = (what, got, want) => {
  if (got !== want) problems.push(`${what} is ${got ?? "(absent)"}, expected ${want}`);
};

check(
  "index.html theme-color",
  readFileSync("index.html", "utf8").match(/name="theme-color"\s+content="([^"]*)"/)?.[1],
  ink,
);

const manifest = JSON.parse(readFileSync("public/site.webmanifest", "utf8"));
check("manifest theme_color", manifest.theme_color, ink);
check("manifest background_color", manifest.background_color, ink);

const svg = readFileSync("public/favicon.svg", "utf8");
check("favicon.svg ground", svg.match(/<rect[^>]*fill="([^"]*)"/)?.[1], ink);

/* The mark is a signal-green trace. An icon without it is not this site's
   icon, however well formed the file is. */
const signal = css.match(/--signal:\s*(#[0-9a-fA-F]{3,8})/)?.[1];
if (signal && !svg.toLowerCase().includes(signal.toLowerCase())) {
  problems.push(`favicon.svg does not use the signal colour ${signal}`);
}

/* Generated, so their absence means gen:og was never run, and a stale one is
   worse than none: browsers request /favicon.ico whether it is declared or not. */
for (const [file, min] of [
  ["public/favicon.ico", 300],
  ["public/favicon-16.png", 150],
  ["public/favicon-32.png", 300],
  ["public/apple-touch-icon.png", 1000],
  ["public/og.png", 10000],
]) {
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    problems.push(`${file} is missing, run npm run gen:og`);
    continue;
  }
  if (size < min) problems.push(`${file} is ${size} bytes, too small to be the real mark`);
}

/* An ICO that is not a container of PNGs is the old hand-made one. */
const ico = readFileSync("public/favicon.ico");
const count = ico.readUInt16LE(4);
if (count < 1) problems.push("favicon.ico declares no images");
else {
  const offset = ico.readUInt32LE(6 + 12);
  const png = ico.subarray(offset, offset + 8);
  if (!png.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    problems.push("favicon.ico does not embed a PNG, so it was not generated from the mark");
  }
}

if (problems.length) {
  for (const p of problems) console.error(`FAIL  ${p}`);
  console.error(`\n${problems.length} brand inconsistency(ies)`);
  process.exit(1);
}

console.log(`brand: clean, one ink (${ink}) across index.html, the manifest and the mark; icons present`);
