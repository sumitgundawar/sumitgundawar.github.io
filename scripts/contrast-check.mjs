import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = fs.readFileSync(path.join(root, "src/index.css"), "utf8");

const token = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found in src/index.css`);
  return m[1];
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

const SURFACES = [
  ["ink", token("ink")],
  ["ink-1", token("ink-1")],
  ["ink-2", token("ink-2")],
  ["ink-3", token("ink-3")],
  ["plate", token("plate")],
];

const cases = [];

for (const [name, hex] of SURFACES) {
  cases.push([`--text-hi on ${name}`, token("text-hi"), hex, 7]);
  cases.push([`--text-mid on ${name}`, token("text-mid"), hex, 7]);
  cases.push([`--text-lo on ${name}`, token("text-lo"), hex, 4.5]);
  cases.push([`--accent on ${name}`, token("accent"), hex, 4.5]);
  cases.push([`--accent-2 on ${name}`, token("accent-2"), hex, 4.5]);
  cases.push([`--rule-3 border on ${name}`, token("rule-3"), hex, 3]);
}

cases.push(["--ink label on --accent fill", token("ink"), token("accent"), 4.5]);

const KINDS = ["client", "edge", "service", "data", "queue", "external"];
for (const kind of KINDS) {
  cases.push([
    `--n-${kind}-text on its fill`,
    token(`n-${kind}-text`),
    token(`n-${kind}-fill`),
    4.5,
  ]);
  cases.push([`--n-${kind} stroke on --plate`, token(`n-${kind}`), token("plate"), 3]);
}

for (const status of ["ok", "warn", "crit"]) {
  cases.push([`--${status} on --ink`, token(status), token("ink"), 4.5]);
  cases.push([`--${status} on --ink-2`, token(status), token("ink-2"), 4.5]);
}

let failed = 0;
for (const [label, fg, bg, min] of cases) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed += 1;
  const line = `${ok ? "pass" : "FAIL"}  ${label.padEnd(34)} ${fg} on ${bg}  ${r.toFixed(2)}:1  (needs ${min})`;
  if (ok) console.log(line);
  else console.error(line);
}

console.log(`\n${cases.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
