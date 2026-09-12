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

const ROOTS = ["src", "worker/src", "public", "index.html"];
const EXT = new Set([".ts", ".tsx", ".css", ".html", ".txt", ".xml", ".json", ".md"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "ui"]);

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

const ALLOWED_NON_ASCII = new Set([
  "£",
  "©",
  "→", "←", "↗",
  "·", "•",
  "…",
  "▶", "✕", "✓", "×",

  "ö",
]);

const hits = [];
for (const rel of files) {
  const lines = fs.readFileSync(path.join(root, rel), "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const [ch, name] of BANNED) {
      if (line.includes(ch)) hits.push({ rel, line: i + 1, name, text: line.trim().slice(0, 90) });
    }
    for (const ch of line) {
      if (ch.codePointAt(0) < 128 || ALLOWED_NON_ASCII.has(ch)) continue;
      if (BANNED.some(([banned]) => banned === ch)) continue;
      hits.push({
        rel,
        line: i + 1,
        name: `unexpected character ${JSON.stringify(ch)} (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`,
        text: line.trim().slice(0, 90),
      });
    }
  });
}

if (hits.length) {
  for (const h of hits) console.error(`FAIL  ${h.rel}:${h.line}  ${h.name}\n        ${h.text}`);
  console.error(`\n${hits.length} banned character${hits.length === 1 ? "" : "s"} across ${files.length} files checked`);
  process.exit(1);
}

console.log(`prose: clean, ${files.length} files checked for ${BANNED.length} banned characters and anything outside ASCII`);
