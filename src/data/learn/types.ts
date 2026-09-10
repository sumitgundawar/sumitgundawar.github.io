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

/* What actually fits in a diagram node, measured rather than guessed.
 *
 * The renderer draws each node in a fixed 168px box with 14px of padding either
 * side, so a label or a sub has 140px. SVG text neither wraps nor clips, so
 * anything longer used to bleed across the border, which is why the renderer
 * truncates with an ellipsis instead.
 *
 * The advance widths below were measured in the browser with the real webfonts
 * loaded, because the renderer previously assumed a single monospace advance of
 * 0.56em for both strings and was wrong twice over. The label is set in the
 * proportional sans at 13.5px, which measures 0.486 to 0.528em per character
 * across realistic label text, so 0.56 truncated labels that would have fitted:
 * "Head-of-line blocking" measures exactly 140px and was being cut to
 * "Head-of-line bloc...". The sub is set in the mono at 11px, which measures a
 * flat 0.600em, so 0.56 let a 22-character sub overflow its box by 5px.
 *
 * 0.53 for the label is the top of the measured range, which is the safe end
 * for proportional text; 0.60 for the mono is exact. */
export const NODE_TEXT_WIDTH = 140;
export const LABEL_PX = 13.5;
export const LABEL_EM_PER_CHAR = 0.53;
export const SUB_PX = 11;
export const SUB_EM_PER_CHAR = 0.6;

/** Longest label that renders without an ellipsis. One line: a label is the
 *  name of the thing and should not need two. */
export const LABEL_MAX_CHARS = Math.floor(NODE_TEXT_WIDTH / (LABEL_PX * LABEL_EM_PER_CHAR));
/** Characters of sub per line. */
export const SUB_MAX_CHARS = Math.floor(NODE_TEXT_WIDTH / (SUB_PX * SUB_EM_PER_CHAR));
/** The sub gets two lines, which is what the box has room for.
 *
 *  One line was 21 characters, and the corpus had never been written to that:
 *  138 subs were already being silently truncated before this limit was ever
 *  measured, because the author kept writing the informative second line the
 *  material wanted and the renderer kept quietly cutting it. Given a choice
 *  between rewriting several hundred good strings and giving the box the room
 *  the data has always needed, the box wins. */
export const SUB_MAX_LINES = 2;

/** Break a sub into the lines the renderer will draw.
 *
 *  Word wrap, with a hard break for a single token longer than a line, because
 *  "stale-while-revalidate" is 22 characters with nowhere to wrap and truncating
 *  it to "stale-while-revalid" tells the reader less than breaking it does.
 *  Returns at most SUB_MAX_LINES lines; anything beyond that is ellipsised,
 *  which the content check exists to prevent reaching production. */
export function wrapSub(text: string, perLine = SUB_MAX_CHARS, maxLines = SUB_MAX_LINES): string[] {
  const lines: string[] = [];
  let rest = text.trim();
  while (rest.length && lines.length < maxLines) {
    if (rest.length <= perLine) {
      lines.push(rest);
      rest = "";
      break;
    }
    /* Break at the last space that fits. If there is none, the token itself is
       longer than a line, so break inside it. */
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

/** Whether a sub fits the box without being ellipsised. */
export function subFits(text: string): boolean {
  return !wrapSub(text).some((l) => l.endsWith("\u2026"));
}

export interface Diagram {
  caption: string;
  /** Columns left to right: request flows forward through the stack. */
  columns: DiagramNode[][];
  edges: DiagramEdge[];
}

/** A citation for a claim in the material.
 *
 *  The corpus makes a lot of specific claims: that Netflix reported 28.04 per
 *  cent BD-rate savings on x264, that SQS defaults to a thirty second
 *  visibility timeout, that Google's retry budget is around ten per cent. Every
 *  one of those is checkable, and until this field existed none of them was
 *  checkable by a reader, who had to take the number on trust or go and find it
 *  themselves.
 *
 *  Prefer the primary source: the paper, the RFC, the vendor's own
 *  documentation or engineering blog. A secondary summary is acceptable only
 *  where the primary is paywalled or gone. */
export interface Source {
  /** How the source would be cited in a sentence, e.g. "Netflix TechBlog,
   *  Dynamic optimizer (2018)". Includes the year, because a claim about a
   *  moving target is only true as of a date. */
  label: string;
  url: string;
  /** Which claim in this topic the source is being offered for. Without it a
   *  list of links is an appeal to authority rather than evidence. */
  supports: string;
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
  /** Evidence for the specific claims this topic makes.
   *
   *  Held per topic rather than per card because the claims are per topic, and
   *  a reader checking one number should not have to guess which of a card's
   *  twenty links covers it. */
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
  /** For a dissection: the piece of writing being taken apart.
   *
   *  A dissection that does not link prominently to the original is a summary
   *  passing itself off as analysis. The link belongs at the top of the card,
   *  before any of the explanation, so a reader can go and read the real thing
   *  first if they would rather. */
  subject?: {
    title: string;
    url: string;
    publisher: string;
    /** ISO date of publication, rendered as a readable date. */
    published: string;
    /** Why this piece was worth dissecting, in one sentence. */
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
