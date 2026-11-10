import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(root, "src/index.css"), "utf8");

const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("@media (min-width: 400px)"));
const bandBlock = css.slice(css.indexOf("  .band {"), css.indexOf("  .grid-12 {"));

const declare = (block) => {
  const out = new Map();
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    out.set(m[1], m[2].trim());
  }
  return out;
};

const base = declare(rootBlock);
const band = declare(bandBlock);

const resolve = (name, scope) => {
  const seen = new Set();
  let value = (scope === "band" && band.get(name)) || base.get(name);
  while (value && !/^#[0-9a-fA-F]{6}$/.test(value)) {
    const ref = value.match(/^var\(--([a-z0-9-]+)\)$/);
    if (!ref) throw new Error(`token --${name} is not a hex or a plain var(): ${value}`);
    if (seen.has(ref[1])) throw new Error(`token --${name} resolves in a cycle`);
    seen.add(ref[1]);
    value = (scope === "band" && band.get(ref[1])) || base.get(ref[1]);
  }
  if (!value) throw new Error(`token --${name} not found in src/index.css`);
  return value;
};

const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const L = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [L(a), L(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const cases = [];
const add = (label, fg, bg, min) => cases.push([label, fg, bg, min]);

const FAMILIES = [
  {
    scope: "root",
    surfaces: ["base", "surface", "sunken", "pressed"],
    text: [
      ["text-hi", 7],
      ["text-mid", 7],
      ["text-lo", 4.5],
      ["signal", 4.5],
      ["signal-deep", 4.5],
    ],
    borders: [["edge", 3]],
  },
  {
    scope: "band",
    surfaces: ["band", "band-2", "sunken", "pressed"],
    text: [
      ["text-hi", 7],
      ["text-mid", 7],
      ["text-lo", 4.5],
      ["signal", 4.5],
      ["signal-deep", 4.5],
    ],
    borders: [["edge", 3]],
  },
];

for (const family of FAMILIES) {
  for (const surface of family.surfaces) {
    const bg = resolve(surface, family.scope);
    for (const [name, min] of family.text) {
      add(`--${name} on ${surface}${family.scope === "band" ? " in band" : ""}`, resolve(name, family.scope), bg, min);
    }
    for (const [name, min] of family.borders) {
      add(
        `--${name} border on ${surface}${family.scope === "band" ? " in band" : ""}`,
        resolve(name, family.scope),
        bg,
        min,
      );
    }
  }
}

add("--signal-ink on --signal-fill", resolve("signal-ink", "root"), resolve("signal-fill", "root"), 4.5);
add("--signal-ink on signal fill in band", resolve("signal-ink", "band"), resolve("signal-fill", "band"), 4.5);
add("--signal-fill on --base", resolve("signal-fill", "root"), resolve("base", "root"), 3);

const KINDS = ["client", "edge", "service", "data", "queue", "external"];
for (const kind of KINDS) {
  add(`--n-${kind}-text on its fill`, resolve(`n-${kind}-text`, "root"), resolve(`n-${kind}-fill`, "root"), 4.5);
  add(`--n-${kind} stroke on --surface`, resolve(`n-${kind}`, "root"), resolve("surface", "root"), 3);
  add(`--n-${kind} stroke on --base`, resolve(`n-${kind}`, "root"), resolve("base", "root"), 3);
  add(`--n-${kind} stroke on its fill`, resolve(`n-${kind}`, "root"), resolve(`n-${kind}-fill`, "root"), 3);
}

for (const status of ["ok", "warn", "crit"]) {
  add(`--${status} on --base`, resolve(status, "root"), resolve("base", "root"), 4.5);
  add(`--${status} on --sunken`, resolve(status, "root"), resolve("sunken", "root"), 4.5);
}

let failed = 0;
for (const [label, fg, bg, min] of cases) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed += 1;
  const line = `${ok ? "pass" : "FAIL"}  ${label.padEnd(38)} ${fg} on ${bg}  ${r.toFixed(2)}:1  (needs ${min})`;
  if (ok) console.log(line);
  else console.error(line);
}

console.log(`\n${cases.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
