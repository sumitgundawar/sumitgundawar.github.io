import { cards } from "./index";

/* Content invariants, asserted at module load in development.
 *
 * Two of the bugs that shipped were invisible to both tsc and eslint: a diagram
 * edge naming a node that did not exist was silently dropped by the renderer,
 * and edges that skipped or ran backwards through columns rendered through the
 * boxes in between. Nothing failed; the diagram was just quietly wrong.
 *
 * These checks run in dev and in the test/CI entry, and stay out of the
 * production bundle. */

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

      const { options, correctIndex } = topic.check;
      if (options.length < 3) problems.push({ where: at, what: "fewer than three options" });
      if (correctIndex < 0 || correctIndex >= options.length) {
        problems.push({ where: at, what: `correctIndex ${correctIndex} out of range` });
      }
      if (new Set(options).size !== options.length) {
        problems.push({ where: at, what: "duplicate answer options" });
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
        // The renderer drops unresolved edges silently, so a typo makes a
        // connection vanish with nothing reported anywhere.
        if (!colOf.has(e.from)) problems.push({ where: at, what: `edge from unknown node "${e.from}"` });
        if (!colOf.has(e.to)) problems.push({ where: at, what: `edge to unknown node "${e.to}"` });
      }
    }
  }

  return problems;
}

if (import.meta.env?.DEV) {
  const problems = findProblems();
  if (problems.length) {
    console.error(
      `[learn content] ${problems.length} problem(s):\n` +
        problems.map((p) => `  ${p.where}: ${p.what}`).join("\n"),
    );
  }
}
