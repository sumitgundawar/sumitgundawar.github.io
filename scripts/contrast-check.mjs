/* WCAG contrast, checked rather than commented.
 *
 * The palette already documented its ratios in comments, which is how --cool
 * came to sit at 3.91:1 on surface and 3.25:1 on surface-2 while the file next
 * to it said the borders were "measured, not guessed". A comment is a claim. It
 * was used at 12px in six places, one of them a link, so it failed AA for small
 * text everywhere it appeared.
 *
 * Thresholds are from WCAG 2.2: 4.5:1 for text under 18.66px, 3:1 for large
 * text and for the boundaries of UI components (1.4.11).
 */

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

const INK = token("ink");
const SURFACE = token("surface");
const SURFACE_2 = token("surface-2");

/* Every pairing that actually occurs. --cool and --c-text-dim are used as small
   text on both surfaces, so both have to clear the text threshold, and the
   lighter surface is the binding one. */
const cases = [
  ["--c-text on surface", token("c-text"), SURFACE, 4.5],
  ["--c-text on surface-2", token("c-text"), SURFACE_2, 4.5],
  ["--c-text on ink", token("c-text"), INK, 4.5],
  ["--c-text-dim on surface", token("c-text-dim"), SURFACE, 4.5],
  ["--c-text-dim on surface-2", token("c-text-dim"), SURFACE_2, 4.5],
  ["--c-text-dim on ink", token("c-text-dim"), INK, 4.5],
  ["--cool on surface", token("cool"), SURFACE, 4.5],
  ["--cool on surface-2", token("cool"), SURFACE_2, 4.5],
  ["--cool on ink", token("cool"), INK, 4.5],
  /* The status colours are text, not only dots: --crit and --signal are both
     used as a colour on words in LearnPage. So they are held to the text
     threshold on both surfaces, which is what caught --crit at 4.31:1. */
  ["--signal on surface", token("signal"), SURFACE, 4.5],
  ["--signal on surface-2", token("signal"), SURFACE_2, 4.5],
  ["--warn on surface", token("warn"), SURFACE, 4.5],
  ["--warn on surface-2", token("warn"), SURFACE_2, 4.5],
  ["--crit on surface", token("crit"), SURFACE, 4.5],
  ["--crit on surface-2", token("crit"), SURFACE_2, 4.5],
  // 1.4.11: component boundaries, not text.
  ["--hair-strong on surface", token("hair-strong"), SURFACE, 3],
  ["--hair-strong on surface-2", token("hair-strong"), SURFACE_2, 3],
];

let failed = 0;
for (const [name, fg, bg, min] of cases) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name.padEnd(28)} ${fg} on ${bg}  ${r.toFixed(2)}:1  (needs ${min})`);
}

console.log(`\n${cases.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
