import ts from "typescript";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".shots", ".wrangler", "ui", "docs"]);
const SKIP_FILES = new Set(["src/data/learn/manifest.ts", "worker/src/topics.generated.ts", "worker/src/articles.generated.ts"]);
const TS_LIKE = new Set([".ts", ".tsx", ".mjs", ".js"]);

const kindOf = (f) =>
  f.endsWith(".tsx") ? ts.ScriptKind.TSX : f.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.JS;

function tsCommentRanges(src, file) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, kindOf(file));
  const seen = new Set();
  const ranges = [];
  const push = (pos, end) => {
    const key = `${pos}:${end}`;
    if (!seen.has(key)) {
      seen.add(key);
      ranges.push({ pos, end });
    }
  };
  const add = (rs) => (rs ?? []).forEach((r) => push(r.pos, r.end));
  const walk = (node) => {
    if (ts.isJsxExpression(node) && !node.expression) {
      push(node.getStart(sf), node.getEnd());
      return;
    }
    if (node.getFullStart() !== node.getEnd() || node.kind === ts.SyntaxKind.EndOfFileToken) {
      add(ts.getLeadingCommentRanges(src, node.getFullStart()));
      add(ts.getTrailingCommentRanges(src, node.getEnd()));
    }
    node.getChildren(sf).forEach(walk);
  };
  walk(sf);
  add(ts.getLeadingCommentRanges(src, 0));
  return ranges.sort((a, b) => a.pos - b.pos);
}

const normalise = (src, file) =>
  ts.transpileModule(src, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      jsx: file.endsWith(".tsx") ? ts.JsxEmit.React : undefined,
      removeComments: true,
      newLine: ts.NewLineKind.LineFeed,
    },
    fileName: file,
  }).outputText;

function stripCss(src) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += src[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function stripHtml(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    const lower = src.slice(i, i + 8).toLowerCase();
    const tag = lower.startsWith("<script") ? "script" : lower.startsWith("<style") ? "style" : null;
    if (tag) {
      const close = src.toLowerCase().indexOf(`</${tag}>`, i);
      const stop = close === -1 ? src.length : close + tag.length + 3;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    out += src[i];
    i += 1;
  }
  return out;
}

const tidy = (text) =>
  text
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(\{|\[|\()\n\n+/g, "$1\n")
    .replace(/\n\n+([ \t]*(\}|\]|\)))/g, "\n$1")
    .replace(/^\n+/, "")
    .replace(/\n*$/, "\n");

function stripFile(file) {
  const src = readFileSync(file, "utf8");
  const ext = extname(file);
  if (ext === ".css") return tidy(stripCss(src));
  if (ext === ".html") return tidy(stripHtml(src));
  let out = src;
  for (const r of tsCommentRanges(src, file).reverse()) out = out.slice(0, r.pos) + out.slice(r.end);
  out = tidy(out);
  if (normalise(src, file) !== normalise(out, file)) {
    throw new Error(`${file}: stripping would change the code, not only the comments`);
  }
  return out;
}

const roots = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const write = process.argv.includes("--write");
const targets = [];
const walkFs = (rel) => {
  const abs = join(process.cwd(), rel);
  if (!statSync(abs).isDirectory()) {
    if (TS_LIKE.has(extname(rel)) || extname(rel) === ".css" || extname(rel) === ".html") targets.push(rel);
    return;
  }
  for (const entry of readdirSync(abs)) {
    if (SKIP_DIRS.has(entry)) continue;
    walkFs(join(rel, entry));
  }
};
(roots.length ? roots : ["src", "scripts", "worker/src", "index.html"]).forEach(walkFs);

let changed = 0;
let removed = 0;
const failed = [];
for (const file of targets) {
  if (SKIP_FILES.has(file) || file.endsWith(".d.ts")) continue;
  try {
    const src = readFileSync(file, "utf8");
    const out = stripFile(file);
    if (out === src) continue;
    removed += src.split("\n").length - out.split("\n").length;
    changed += 1;
    if (write) writeFileSync(file, out);
  } catch (e) {
    failed.push(e.message);
  }
}

if (failed.length) {
  failed.forEach((f) => console.error(`FAIL  ${f}`));
  process.exit(1);
}
console.log(
  write
    ? `stripped comments from ${changed} file(s), ${removed} lines removed`
    : `${changed} file(s) contain comments, ${removed} lines would be removed (pass --write to apply)`,
);
