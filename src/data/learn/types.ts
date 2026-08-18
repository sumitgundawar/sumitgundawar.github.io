/* Types for the learning material.
   Voice for all content: dry, precise, confident. No emoji, no exclamation
   marks, no buzzwords. Explain the decision, not just the mechanism. */

export type Level = "beginner" | "intermediate" | "advanced";

export const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

export interface Check {
  prompt: string;
  options: string[];
  correctIndex: number;
  /** Shown after answering, whether right or wrong. Explain the reasoning. */
  explain: string;
}

/** Where a box sits in the stack. Drives colour and depth, so the same kind of
 *  component reads the same way in every diagram on the site. */
export type NodeKind = "client" | "edge" | "service" | "data" | "queue" | "external";

export interface DiagramNode {
  id: string;
  label: string;
  /** The concrete technology, e.g. "Redis" or "Kafka". */
  sub?: string;
  kind?: NodeKind;
  /** What this component does for the system, in one or two sentences. Shown on
   *  hover, so a diagram explains itself rather than needing the prose beside
   *  it. Optional: the learn diagrams carry structure, the build page carries
   *  reasoning, and both use the same renderer. */
  why?: string;
  /** Where it runs and roughly what it costs, which is the other half of the
   *  question anyone looking at an architecture actually has. */
  setup?: string;
  /** A road not taken: drawn dashed and in a different colour, so a diagram can
   *  show what was considered as well as what was chosen. An architecture with
   *  no visible alternatives reads as the only possible answer, which is never
   *  true and is the opposite of what a design discussion should look like. */
  alternative?: boolean;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  /** Dashed means asynchronous, the caller does not wait. */
  async?: boolean;
}

export interface Diagram {
  caption: string;
  /** Columns left to right: request flows forward through the stack. */
  columns: DiagramNode[][];
  edges: DiagramEdge[];
}

export interface Topic {
  id: string;
  title: string;
  level: Level;
  /** Two to four short paragraphs. Concrete over general. */
  body: string[];
  diagram?: Diagram;
  /** The tradeoff. Why this and not the obvious alternative, the part
   *  interviews actually probe, and the part most material leaves out. */
  why?: string;
  /** How a company at scale really does it, named. */
  inPractice?: string;
  /** The question shown by default.
   *
   *  Kept as a single field rather than folded into `checks` so that every
   *  existing topic stays valid: 122 of them were written against this shape
   *  and rewriting all of them to add one question would be a migration with no
   *  benefit. */
  check: Check;
  /** Further questions on the same topic, drawn from alongside `check`.
   *
   *  One fixed question means a second visit is a memory test rather than a
   *  check of understanding, and the answer is already known. Where a topic has
   *  these, one of the set is chosen per visit. They are written, not generated:
   *  a wrong answer here teaches the wrong thing, and the explanation has to be
   *  correct rather than merely plausible. */
  checks?: Check[];
}

export type Track =
  | "foundations"
  | "languages"
  | "design"
  | "delivery"
  | "practice"
  | "case-study"
  | "interview";

export interface Card {
  id: string;
  title: string;
  summary: string;
  track: Track;
  topics: Topic[];
}

export const TRACKS: { id: Track; label: string; blurb: string }[] = [
  { id: "foundations", label: "Foundations", blurb: "What everything else assumes you already know." },
  { id: "languages", label: "Programming", blurb: "The concepts every language shares, and the languages worth knowing properly." },
  { id: "design", label: "System design", blurb: "The building blocks, and when each one is the wrong choice." },
  { id: "delivery", label: "Delivery and infrastructure", blurb: "Getting it running, and keeping it running." },
  { id: "practice", label: "Engineering practice", blurb: "Testing, security, code quality, and how teams actually work." },
  { id: "case-study", label: "Case studies", blurb: "How Netflix, Uber and others actually built it." },
  { id: "interview", label: "Interview preparation", blurb: "Senior and staff level: what is being assessed, and how to show it." },
];

/** What the index page needs, and nothing else.
 *
 *  The material itself is an order of magnitude larger than its titles, and the
 *  index renders only titles, summaries and levels. Splitting the two is what
 *  lets /learn ship a list rather than a library, with each card's contents
 *  fetched when it is opened. */
export interface CardMeta {
  id: string;
  title: string;
  summary: string;
  track: Track;
  /** Which module holds this card's material, for the dynamic import. */
  group: string;
  topics: { id: string; title: string; level: Level }[];
}
