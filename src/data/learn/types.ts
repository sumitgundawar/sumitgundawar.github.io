export type Level = "beginner" | "intermediate" | "advanced";

export const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

export interface Check {
  prompt: string;
  options: string[];
  correctIndex: number;

  explain: string;
}

export type NodeKind = "client" | "edge" | "service" | "data" | "queue" | "external";

export interface DiagramNode {
  id: string;
  label: string;

  sub?: string;
  kind?: NodeKind;

  why?: string;

  setup?: string;

  alternative?: boolean;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;

  async?: boolean;
}

export const NODE_TEXT_WIDTH = 140;
export const LABEL_PX = 13.5;
export const LABEL_EM_PER_CHAR = 0.53;
export const SUB_PX = 11;
export const SUB_EM_PER_CHAR = 0.6;

export const LABEL_MAX_CHARS = Math.floor(NODE_TEXT_WIDTH / (LABEL_PX * LABEL_EM_PER_CHAR));

export const SUB_MAX_CHARS = Math.floor(NODE_TEXT_WIDTH / (SUB_PX * SUB_EM_PER_CHAR));

export const SUB_MAX_LINES = 2;

export function wrapSub(text: string, perLine = SUB_MAX_CHARS, maxLines = SUB_MAX_LINES): string[] {
  const lines: string[] = [];
  let rest = text.trim();
  while (rest.length && lines.length < maxLines) {
    if (rest.length <= perLine) {
      lines.push(rest);
      rest = "";
      break;
    }

    let cut = rest.lastIndexOf(" ", perLine);
    if (cut <= 0) cut = perLine;
    lines.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest.length && lines.length) {
    const last = lines[lines.length - 1];
    lines[lines.length - 1] = last.slice(0, Math.max(1, perLine - 1)) + "\u2026";
  }
  return lines;
}

export function subFits(text: string): boolean {
  return !wrapSub(text).some((l) => l.endsWith("\u2026"));
}

export interface Diagram {
  caption: string;

  columns: DiagramNode[][];
  edges: DiagramEdge[];
}

export interface Source {
  label: string;
  url: string;

  supports: string;
}

export interface Topic {
  id: string;
  title: string;
  level: Level;

  body: string[];
  diagram?: Diagram;

  why?: string;

  inPractice?: string;

  check: Check;

  checks?: Check[];

  sources?: Source[];
}

export type Track =
  | "foundations"
  | "languages"
  | "design"
  | "delivery"
  | "practice"
  | "case-study"
  | "dissection"
  | "interview";

export interface Card {
  id: string;
  title: string;
  summary: string;
  track: Track;
  topics: Topic[];

  subject?: {
    title: string;
    url: string;
    publisher: string;

    published: string;

    note: string;
  };
}

export const TRACKS: { id: Track; label: string; blurb: string }[] = [
  { id: "foundations", label: "Foundations", blurb: "What everything else assumes you already know." },
  { id: "languages", label: "Programming", blurb: "The concepts every language shares, and the languages worth knowing properly." },
  { id: "design", label: "System design", blurb: "The building blocks, and when each one is the wrong choice." },
  { id: "delivery", label: "Delivery and infrastructure", blurb: "Getting it running, and keeping it running." },
  { id: "practice", label: "Engineering practice", blurb: "Testing, security, code quality, and how teams actually work." },
  { id: "case-study", label: "Case studies", blurb: "How Netflix, Uber and others actually built it." },
  { id: "dissection", label: "Blog dissections", blurb: "Deeply technical engineering writing, taken apart and redrawn in plainer language." },
  { id: "interview", label: "Interview preparation", blurb: "Senior and staff level: what is being assessed, and how to show it." },
];

export interface CardMeta {
  id: string;
  title: string;
  summary: string;
  track: Track;

  group: string;
  topics: { id: string; title: string; level: Level }[];
}
