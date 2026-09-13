import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync("src/index.css", "utf8");
const tailwind = readFileSync("tailwind.config.js", "utf8");
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

const signal = css.match(/--accent:\s*(#[0-9a-fA-F]{3,8})/)?.[1];
if (signal && !svg.toLowerCase().includes(signal.toLowerCase())) {
  problems.push(`favicon.svg does not use the accent colour ${signal}`);
}

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

/* Tailwind keeps its own rem scale alongside the px token scale this project
 * defines, so `pt-20` silently means 80px and `mt-10` silently duplicates
 * `mt-40`. Both shipped. Every spacing utility now has to name a token. */
const tokens = new Set(
  [...tailwind.matchAll(/^\s{8}(-?[0-9]+(?:\.[0-9]+)?)\s*:\s*"/gm)].map((m) => m[1]),
);
tokens.add("0");
if (tokens.size < 8) problems.push("could not read the spacing scale out of tailwind.config.js");

const SPACING = new RegExp(
  String.raw`(?<![\w:./-])(?:(?:sm|md|lg|xl|2xl|@min-\[\d+px\]):)?-?(?:[mp][tblrxy]?|gap(?:-[xy])?|space-[xy])-(\d+(?:\.\d+)?)(?![\w.%\[])`,
  "g",
);

const walkSrc = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSrc(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
};

for (const file of walkSrc("src")) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(SPACING)) {
      if (tokens.has(m[1])) continue;
      problems.push(
        `${file}:${i + 1} uses "${m[0]}", which is ${
          Number(m[1]) * 4
        }px off Tailwind's rem scale rather than a spacing token`,
      );
    }
  });
}

if (problems.length) {
  for (const p of problems) console.error(`FAIL  ${p}`);
  console.error(`\n${problems.length} brand inconsistency(ies)`);
  process.exit(1);
}

console.log(
  `brand: clean, one ink (${ink}) across index.html, the manifest and the mark; icons present; every spacing utility on the ${tokens.size - 1}-step token scale`,
);
