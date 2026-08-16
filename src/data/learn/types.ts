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
  check: Check;
}

export type Track =
  | "foundations"
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
  { id: "design", label: "System design", blurb: "The building blocks, and when each one is the wrong choice." },
  { id: "delivery", label: "Delivery and infrastructure", blurb: "Getting it running, and keeping it running." },
  { id: "practice", label: "Engineering practice", blurb: "Testing, security, code quality, and how teams actually work." },
  { id: "case-study", label: "Case studies", blurb: "How Netflix, Uber and others actually built it." },
  { id: "interview", label: "Interview preparation", blurb: "Senior and staff level: what is being assessed, and how to show it." },
];
