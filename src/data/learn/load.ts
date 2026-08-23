import type { Card } from "./types";
import type { GroupName } from "./groups";

/* Fetching one card's material.
 *
 * The literal import calls below are the point of this file. A dynamic import
 * has to name its module in source for the bundler to split it, so a map of
 * arrow functions is the only shape that produces one chunk per group. Written
 * out rather than generated because Vite reads this file, not its output.
 *
 * Nothing here is a network call in the usual sense: these are local chunks
 * served from the same CDN as the page, so the cost is one cached request
 * rather than a round trip to a database. That is the whole reason the material
 * stays in the bundle instead of moving behind an API.
 */
const LOADERS: Record<GroupName, () => Promise<{ default?: Card[] } & Record<string, unknown>>> = {
  foundations: () => import("./foundations"),
  languages: () => import("./languages"),
  design: () => import("./design"),
  design2: () => import("./design2"),
  design3: () => import("./design3"),
  delivery: () => import("./delivery"),
  practice: () => import("./practice"),
  caseStudies: () => import("./caseStudies"),
  caseStudies2: () => import("./caseStudies2"),
  interview: () => import("./interview"),
  companies: () => import("./companies"),
  security: () => import("./security"),
};

/* A module is fetched at most once per session. The browser caches the chunk
   anyway, but parsing it again on every card open is work with no result. */
const loaded = new Map<string, Card[]>();

export async function loadGroup(group: string): Promise<Card[]> {
  const cached = loaded.get(group);
  if (cached) return cached;

  const loader = LOADERS[group as GroupName];
  if (!loader) return [];

  const mod = await loader();
  /* Each module exports its cards under its own name, and the name is the
     group, which is what makes this lookup work without a second map. */
  const cards = (mod as Record<string, unknown>)[group];
  const list = Array.isArray(cards) ? (cards as Card[]) : [];
  loaded.set(group, list);
  return list;
}

export async function loadCard(group: string, id: string): Promise<Card | null> {
  const cards = await loadGroup(group);
  return cards.find((c) => c.id === id) ?? null;
}
