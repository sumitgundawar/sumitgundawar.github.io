/* Typography rules, enforced across everything that ships.
 *
 * The site bans em and en dashes. That was held at zero across src/ by grepping
 * by hand, which is not enforcement: index.html was never in anyone's grep, and
 * shipped four of them, three in the <title>, og:title and twitter:title. Every
 * browser tab and every LinkedIn preview broke the rule for as long as the rule
 * existed.
 *
 * So the check covers every surface that reaches a reader, not just the one
 * somebody remembered, and it runs in the build.
 *
 * U+2011 is included because it is not a dash anyone types by hand. It showed up
 * in a live answer from the model, which is the other way a banned character
 * gets onto the page: the system prompt asks for no dashes, and a prompt is a
 * request, not a constraint. The Worker also strips these from answers at
 * runtime; this catches them in anything checked in.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BANNED = [
  ["—", "em dash"],
  ["–", "en dash"],
  ["‑", "non-breaking hyphen"],
  ["‒", "figure dash"],
  ["―", "horizontal bar"],
];

/* Directories walked in full, plus individual files. public/ is included
   because robots.txt, the sitemap and the feed are all read by somebody. */
const ROOTS = ["src", "worker/src", "public", "index.html"];
const EXT = new Set([".ts", ".tsx", ".css", ".html", ".txt", ".xml", ".json", ".md"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "ui"]);
/* Generated from the topic content and rewritten by gen:topics; checking it
   here would report the same finding as the source it is generated from. */
const SKIP_FILES = new Set(["worker/src/topics.generated.ts"]);

function walk(rel, out = []) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return out;
  const st = fs.statSync(abs);
  if (st.isFile()) {
    if (EXT.has(path.extname(abs))) out.push(rel);
    return out;
  }
  for (const entry of fs.readdirSync(abs)) {
    if (SKIP_DIRS.has(entry)) continue;
    walk(path.join(rel, entry), out);
  }
  return out;
}

const files = ROOTS.flatMap((r) => walk(r)).filter((f) => !SKIP_FILES.has(f));

const hits = [];
for (const rel of files) {
  const lines = fs.readFileSync(path.join(root, rel), "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const [ch, name] of BANNED) {
      if (line.includes(ch)) hits.push({ rel, line: i + 1, name, text: line.trim().slice(0, 90) });
    }
  });
}

if (hits.length) {
  for (const h of hits) console.error(`FAIL  ${h.rel}:${h.line}  ${h.name}\n        ${h.text}`);
  console.error(`\n${hits.length} banned character${hits.length === 1 ? "" : "s"} across ${files.length} files checked`);
  process.exit(1);
}

console.log(`prose: clean, ${files.length} files checked for ${BANNED.length} banned characters`);
