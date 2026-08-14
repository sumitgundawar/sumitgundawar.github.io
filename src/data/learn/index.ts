import { foundations } from "./foundations";
import { design } from "./design";
import { design2 } from "./design2";
import { delivery } from "./delivery";
import { practice } from "./practice";
import { caseStudies } from "./caseStudies";
import { interview } from "./interview";
import { companies } from "./companies";
import type { Card, Level, Topic } from "./types";

export * from "./types";

/** Ordered so a reader working top to bottom goes foundations first and
 *  interview last. Tracks group them on the page. */
export const cards: Card[] = [
  ...foundations,
  ...design,
  ...design2,
  ...delivery,
  ...practice,
  ...caseStudies,
  ...interview,
  ...companies,
];

export const allTopics: Topic[] = cards.flatMap((c) => c.topics);

export const topicCount = allTopics.length;
export const cardCount = cards.length;

export function countByLevel(level: Level): number {
  return allTopics.filter((t) => t.level === level).length;
}

/** Cards that still have something to show once a level filter is applied. */
export function cardsForLevel(level: Level | "all"): Card[] {
  if (level === "all") return cards;
  return cards
    .map((c) => ({ ...c, topics: c.topics.filter((t) => t.level === level) }))
    .filter((c) => c.topics.length > 0);
}
