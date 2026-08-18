/* Structured data, generated from content.ts rather than kept by hand.
 *
 * The block in index.html was one Person with a name, a job title and three
 * sameAs links, written by hand and therefore frozen at whatever was true the
 * day it was written. Meanwhile content.ts holds three degrees, fifteen
 * published articles, two podcast appearances and a conference talk, none of
 * which a search engine could see.
 *
 * That matters more here than on most sites. The page ships no readable text at
 * all: everything is client-rendered, so / is about six kilobytes with zero
 * words in it. Google executes JavaScript, on a second and slower pass, and most
 * other crawlers and social scrapers never do. Structured data in the head is
 * the one description of this person that every crawler can read on the first
 * request.
 *
 * Generated, because the hand-written version had already drifted: it still said
 * nothing about the MSc, the IEEE paper or JAX London. Anything derived from
 * content.ts cannot drift.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { articles, education, identity, speaking, timeline, recognition } from "../src/data/content.ts";

const SITE = "https://sumitgundawar.com";
const START = "<!-- BEGIN generated structured data: scripts/gen-jsonld.mjs -->";
const END = "<!-- END generated structured data -->";

const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${SITE}/#person`,
  name: identity.name,
  url: SITE,
  image: `${SITE}/sumit-gundawar.webp`,
  jobTitle: identity.title,
  description: identity.bio,
  address: { "@type": "PostalAddress", addressLocality: "London", addressCountry: "GB" },
  email: `mailto:${identity.email}`,
  sameAs: [
    identity.linkedin,
    "https://github.com/sumitgundawar",
    "https://dataconomy.com/author/sumit-gundawar/",
  ],
  knowsAbout: [
    "API design",
    "Distributed systems",
    "Data engineering",
    "System design",
    "Integration resilience",
    "Idempotency",
    "Caching",
  ],
  // Only the current role. A schema worksFor listing every past employer says
  // he works for all of them at once.
  worksFor: timeline
    .filter((t) => t.label === "Now" && t.org)
    .map((t) => ({ "@type": "Organization", name: t.org })),
  alumniOf: education.map((e) => ({
    "@type": "EducationalOrganization",
    name: e.school,
    // The award belongs on the person's relationship to the school, and this is
    // the field a rich result actually surfaces.
    ...(e.degree ? { description: e.degree } : {}),
  })),
};

/* Each article as its own node, pointing at the publisher's URL. They are the
   canonical copies and they are where the ranking already is; this only tells a
   crawler that one author wrote all of them, which is the fact that is currently
   impossible to discover. */
const articleNodes = articles.map((a) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: a.title,
  url: a.url,
  datePublished: a.iso,
  description: a.summary,
  author: { "@id": `${SITE}/#person` },
  publisher: { "@type": "Organization", name: a.publication },
}));

/* Search Console reported six non-critical Events issues, all of them fields a
   rich result is built from: description, image, offers, endDate, and an address
   inside the location. Each one is emitted only when the talk actually carries
   it, so an announced conference produces a complete node and a talk with
   nothing but a title still produces a valid one rather than a node full of
   plausible filler. startDate falls back to the display string, which is the
   honest answer when only a year is known. */
const eventNodes = speaking.map((t) => ({
  "@context": "https://schema.org",
  "@type": "Event",
  name: t.title,
  url: t.url,
  startDate: t.startDate ?? t.when,
  ...(t.endDate ? { endDate: t.endDate } : {}),
  ...(t.abstract ? { description: t.abstract } : {}),
  image: [`${SITE}/og.png`],
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: {
    "@type": "Place",
    name: t.venueName ?? t.venue,
    ...(t.street
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: t.street,
            addressLocality: t.locality,
            postalCode: t.postalCode,
            addressCountry: t.country,
          },
        }
      : {}),
  },
  ...(t.ticketsUrl
    ? {
        offers: {
          "@type": "Offer",
          url: t.ticketsUrl,
          availability: "https://schema.org/InStock",
        },
      }
    : {}),
  performer: { "@id": `${SITE}/#person` },
  organizer: { "@type": "Organization", name: t.venue },
}));

const site = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  url: SITE,
  name: identity.name,
  author: { "@id": `${SITE}/#person` },
};

const nodes = [person, site, ...articleNodes, ...eventNodes];

const block = [
  START,
  ...nodes.map((n) => `    <script type="application/ld+json">\n${JSON.stringify(n, null, 2)
    .split("\n")
    .map((l) => `    ${l}`)
    .join("\n")}\n    </script>`),
  `    ${END}`,
].join("\n    ");

const file = "index.html";
let html = readFileSync(file, "utf8");

if (html.includes(START)) {
  html = html.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block.trim());
} else {
  /* First run: replace the hand-written Person block, so the generated output
     takes its place rather than sitting alongside a stale duplicate. */
  const existing = /<!-- Person markup[\s\S]*?<\/script>/;
  if (!existing.test(html)) throw new Error("could not find the existing JSON-LD block to replace");
  html = html.replace(existing, block.trim());
}

writeFileSync(file, html);

const counts = `${articleNodes.length} articles, ${eventNodes.length} events, ${person.alumniOf.length} schools`;
console.log(`structured data: ${nodes.length} nodes written to index.html (${counts})`);
