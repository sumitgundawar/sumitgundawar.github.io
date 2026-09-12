import { foundations } from "./foundations";
import { languages } from "./languages";
import { design } from "./design";
import { design2 } from "./design2";
import { design3 } from "./design3";
import { delivery } from "./delivery";
import { practice } from "./practice";
import { caseStudies } from "./caseStudies";
import { caseStudies2 } from "./caseStudies2";
import { interview } from "./interview";
import { companies } from "./companies";
import { security } from "./security";
import { dissections } from "./dissections";
import type { Card, Level, Topic } from "./types";

export * from "./types";

export const cards: Card[] = [
  ...foundations,
  ...languages,
  ...design,
  ...design2,
  ...design3,
  ...delivery,
  ...practice,
  ...caseStudies,
  ...caseStudies2,
  ...interview,
  ...companies,
  ...security,
  ...dissections,
];

export const allTopics: Topic[] = cards.flatMap((c) => c.topics);

export const topicCount = allTopics.length;
export const cardCount = cards.length;

export function countByLevel(level: Level): number {
  return allTopics.filter((t) => t.level === level).length;
}

export function cardsForLevel(level: Level | "all"): Card[] {
  if (level === "all") return cards;
  return cards
    .map((c) => ({ ...c, topics: c.topics.filter((t) => t.level === level) }))
    .filter((c) => c.topics.length > 0);
}
