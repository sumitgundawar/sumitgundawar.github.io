import { readFileSync, writeFileSync } from "node:fs";
import { articles, education, identity, speaking, timeline, recognition } from "../src/data/content.ts";

const SITE = "https://sumitgundawar.com";
const MARK = 'data-generated="jsonld"';

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

  worksFor: timeline
    .filter((t) => t.label === "Now" && t.org)
    .map((t) => ({ "@type": "Organization", name: t.org })),
  alumniOf: education.map((e) => ({
    "@type": "EducationalOrganization",
    name: e.school,

    ...(e.degree ? { description: e.degree } : {}),
  })),
};

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

const block = nodes
  .map(
    (n) =>
      `    <script type="application/ld+json" ${MARK}>\n${JSON.stringify(n, null, 2)
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")}\n    </script>`,
  )
  .join("\n");

const file = "index.html";
let html = readFileSync(file, "utf8");

const generated = /[ \t]*<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\n?/g;
if (!generated.test(html)) throw new Error("no JSON-LD block found in index.html to replace");
html = html.replace(generated, "");
html = html.replace(/([ \t]*)<\/head>/, `${block}\n$1</head>`);

writeFileSync(file, html);

const counts = `${articleNodes.length} articles, ${eventNodes.length} events, ${person.alumniOf.length} schools`;
console.log(`structured data: ${nodes.length} nodes written to index.html (${counts})`);
