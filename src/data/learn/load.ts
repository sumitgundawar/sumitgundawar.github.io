import type { Card } from "./types";
import type { GroupName } from "./groups";

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
  dissections: () => import("./dissections"),
};

const loaded = new Map<string, Card[]>();

export async function loadGroup(group: string): Promise<Card[]> {
  const cached = loaded.get(group);
  if (cached) return cached;

  const loader = LOADERS[group as GroupName];
  if (!loader) return [];

  const mod = await loader();

  const cards = (mod as Record<string, unknown>)[group];
  const list = Array.isArray(cards) ? (cards as Card[]) : [];
  loaded.set(group, list);
  return list;
}

export async function loadCard(group: string, id: string): Promise<Card | null> {
  const cards = await loadGroup(group);
  return cards.find((c) => c.id === id) ?? null;
}
