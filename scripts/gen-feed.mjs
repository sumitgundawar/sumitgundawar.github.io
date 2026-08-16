/* RSS from the articles list.
 *
 * Everything he has written is on a publisher's domain, so there is no feed
 * anyone can follow him by: the newsletter is the only way to hear about a new
 * piece, and it asks for an email before you have read one. A feed costs
 * nothing, needs no consent, and is how most of the people who would want this
 * actually read.
 *
 * The items point at the publishers rather than at copies here. Republishing
 * with a canonical tag is the stronger move for search, and it needs the
 * publisher's agreement, so that is a separate decision. This works either way.
 */
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
