import { writeFileSync } from "node:fs";
import { articles, identity } from "../src/data/content.ts";

const SITE = "https://sumitgundawar.com";
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const items = [...articles]
  .sort((a, b) => (a.iso < b.iso ? 1 : -1))
  .map(
    (a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(a.url)}</link>
      <guid isPermaLink="true">${esc(a.url)}</guid>
      <pubDate>${new Date(a.iso).toUTCString()}</pubDate>
      <source url="${SITE}/writing">${esc(a.publication)}</source>
      <description>${esc(a.summary)}</description>
    </item>`,
  )
  .join("\n");

writeFileSync(
  "public/feed.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(identity.name)}</title>
    <link>${SITE}/writing</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Writing on building systems that survive production.</description>
    <language>en-GB</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`,
);
console.log(`wrote feed.xml with ${articles.length} items`);
