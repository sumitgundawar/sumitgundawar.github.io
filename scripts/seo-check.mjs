import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SITE = "https://sumitgundawar.com";

function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (entry.endsWith(".html")) out.push(p);
  }
  return out;
}

const files = htmlFiles("dist");
const sitemap = new Set(
  [...readFileSync("public/sitemap.xml", "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
);

const problems = [];
const seen = new Map();

for (const f of files) {
  const html = readFileSync(f, "utf8");

  const canonical = html.match(/rel="canonical"\s+href="([^"]*)"/)?.[1];
  if (!canonical) {
    problems.push(`${f}: no canonical`);
    continue;
  }

  const rel = f.replace(/^dist/, "").replace(/\.html$/, "").replace(/\/index$/, "/");
  const expected = SITE + (rel === "" ? "/" : rel);
  if (canonical !== expected) problems.push(`${f}: canonical is ${canonical}, expected ${expected}`);

  if (seen.has(canonical)) problems.push(`${f}: shares its canonical with ${seen.get(canonical)}`);
  seen.set(canonical, f);

  if (!sitemap.has(canonical)) problems.push(`${f}: canonical ${canonical} is not in the sitemap`);

  const ogUrl = html.match(/property="og:url"\s+content="([^"]*)"/)?.[1];
  if (ogUrl && ogUrl !== canonical) problems.push(`${f}: og:url ${ogUrl} disagrees with the canonical`);

  if (/<meta[^>]+name="robots"[^>]+noindex/i.test(html)) problems.push(`${f}: carries noindex`);

  const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
  if (!title) problems.push(`${f}: no title`);
}

for (const loc of sitemap) {
  if (!seen.has(loc)) problems.push(`sitemap lists ${loc} but no page was built with that canonical`);
}

if (problems.length) {
  for (const p of problems) console.error(`FAIL  ${p}`);
  console.error(`\n${problems.length} indexing problem(s) across ${files.length} pages`);
  process.exit(1);
}

console.log(
  `seo: clean, ${files.length} pages each canonical to themselves, all in the sitemap, titles present`,
);
