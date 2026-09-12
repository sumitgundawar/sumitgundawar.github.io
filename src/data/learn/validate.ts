import { cards } from "./index";
import { LABEL_MAX_CHARS, SUB_MAX_CHARS, SUB_MAX_LINES, subFits, wrapSub } from "./types";

export interface Problem {
  where: string;
  what: string;
}

export function findProblems(): Problem[] {
  const problems: Problem[] = [];
  const topicIds = new Set<string>();
  const cardIds = new Set<string>();

  for (const card of cards) {
    if (cardIds.has(card.id)) problems.push({ where: card.id, what: "duplicate card id" });
    cardIds.add(card.id);

    if (!card.topics.length) problems.push({ where: card.id, what: "card has no topics" });

    for (const topic of card.topics) {
      const at = `${card.id}/${topic.id}`;
      if (topicIds.has(topic.id)) problems.push({ where: at, what: "duplicate topic id" });
      topicIds.add(topic.id);

      const allChecks = [topic.check, ...(topic.checks ?? [])];
      allChecks.forEach((c, ci) => {
        const label = ci === 0 ? at : `${at} check ${ci + 1}`;
        const { options, correctIndex } = c;
        if (options.length < 3) problems.push({ where: label, what: "fewer than three options" });
        if (correctIndex < 0 || correctIndex >= options.length) {
          problems.push({ where: label, what: `correctIndex ${correctIndex} out of range` });
        }
        if (new Set(options).size !== options.length) {
          problems.push({ where: label, what: "duplicate answer options" });
        }
        if (!c.prompt.trim()) problems.push({ where: label, what: "empty prompt" });
        if (!c.explain.trim()) problems.push({ where: label, what: "empty explanation" });
      });

      const prompts = allChecks.map((c) => c.prompt);
      if (new Set(prompts).size !== prompts.length) {
        problems.push({ where: at, what: "duplicate prompts within the question bank" });
      }
      if (!topic.body.length) problems.push({ where: at, what: "topic has no body" });

      const d = topic.diagram;
      if (!d) continue;

      const colOf = new Map<string, number>();
      d.columns.forEach((col, ci) =>
        col.forEach((n) => {
          if (colOf.has(n.id)) problems.push({ where: at, what: `duplicate node id "${n.id}"` });
          colOf.set(n.id, ci);
        }),
      );

      for (const e of d.edges) {
        if (!colOf.has(e.from)) problems.push({ where: at, what: `edge from unknown node "${e.from}"` });
        if (!colOf.has(e.to)) problems.push({ where: at, what: `edge to unknown node "${e.to}"` });
      }
    }
  }

  return problems;
}

export function findDiagramOverflow(): Problem[] {
  const out: Problem[] = [];
  for (const card of cards) {
    for (const topic of card.topics) {
      for (const col of topic.diagram?.columns ?? []) {
        for (const n of col) {
          const at = `${card.id}/${topic.id}`;
          if (n.label.length > LABEL_MAX_CHARS) {
            out.push({
              where: at,
              what: `label "${n.label}" is ${n.label.length} chars, ${LABEL_MAX_CHARS} fit, so it renders truncated`,
            });
          }
          if (n.sub && !subFits(n.sub)) {
            out.push({
              where: at,
              what: `sub "${n.sub}" does not fit ${SUB_MAX_LINES} lines of ${SUB_MAX_CHARS}, it renders as ${wrapSub(n.sub).join(" / ")}`,
            });
          }
        }
      }
    }
  }
  return out;
}

const MAX_MARGIN = 8;
const MAX_SPREAD = 20;

export function findAnswerTells(): Problem[] {
  const tells: Problem[] = [];
  for (const card of cards) {
    for (const topic of card.topics) {
      [topic.check, ...(topic.checks ?? [])].forEach((c, ci) => {
        const where = ci === 0 ? `${card.id}/${topic.id}` : `${card.id}/${topic.id} check ${ci + 1}`;
        const lens = c.options.map((o) => o.length);
        const correct = lens[c.correctIndex];
        const rivals = lens.filter((_, i) => i !== c.correctIndex);

        const margin = correct - Math.max(...rivals);
        if (margin > MAX_MARGIN) {
          tells.push({ where, what: `correct answer is ${margin} chars longer than any distractor` });
        }

        const spread = Math.max(...lens) - Math.min(...lens);
        if (spread > MAX_SPREAD) {
          tells.push({ where, what: `option length spread ${spread}, some distractors are throwaways` });
        }
      });
    }
  }
  return tells;
}

const MAX_SHARE = 0.55;

export function findUniformity(): Problem[] {
  const counts = new Map<number, number>();
  let total = 0;
  for (const card of cards) {
    for (const topic of card.topics) {
      counts.set(topic.body.length, (counts.get(topic.body.length) ?? 0) + 1);
      total++;
    }
  }
  const out: Problem[] = [];
  for (const [paras, n] of counts) {
    if (n / total > MAX_SHARE) {
      out.push({
        where: "corpus",
        what: `${Math.round((n / total) * 100)}% of topics have ${paras} paragraphs, the template is showing`,
      });
    }
  }
  return out;
}

if (import.meta.env?.DEV) {
  for (const u of findUniformity()) console.warn(`[learn content] ${u.what}`);
  const overflow = findDiagramOverflow();
  if (overflow.length) {
    console.error(`[learn content] ${overflow.length} diagram string(s) render truncated`);
  }
  const problems = findProblems();
  if (problems.length) {
    console.error(
      `[learn content] ${problems.length} problem(s):\n` +
        problems.map((p) => `  ${p.where}: ${p.what}`).join("\n"),
    );
  }
  const tells = findAnswerTells();
  if (tells.length) {
    console.warn(`[learn content] ${tells.length} quiz(zes) still have the length tell`);
  }
}
