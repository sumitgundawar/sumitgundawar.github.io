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

/* The length tell.
 *
 * Writing a question, the correct answer is the one you have the most to say
 * about, so it comes out longest — and every distractor is a throwaway you
 * spent no time on. Done across a whole quiz bank it becomes a free answer key:
 * at one point 115 of 122 correct answers were the longest option, 104 of them
 * by more than 25 characters. You could score 94% having read none of it.
 *
 * The fix is not to make the correct answer shorter. It is to write distractors
 * that are real near-misses, which makes them naturally similar in length.
 *
 * Two thresholds, because "is the correct answer the longest" is the wrong
 * question. 79 of 122 are still nominally longest, but almost all of them win
 * by one to eight characters on options that wrap differently anyway, which is
 * not something a reader can see. What is visible is a correct answer that
 * towers over its nearest rival, and a set where one option is obviously the
 * considered one. So: cap the margin over the runner-up, and cap the spread. */
const MAX_MARGIN = 8;
const MAX_SPREAD = 20;

export function findAnswerTells(): Problem[] {
  const tells: Problem[] = [];
  for (const card of cards) {
    for (const topic of card.topics) {
      const where = `${card.id}/${topic.id}`;
      const lens = topic.check.options.map((o) => o.length);
      const correct = lens[topic.check.correctIndex];
      const rivals = lens.filter((_, i) => i !== topic.check.correctIndex);

      const margin = correct - Math.max(...rivals);
      if (margin > MAX_MARGIN) {
        tells.push({ where, what: `correct answer is ${margin} chars longer than any distractor` });
      }

      const spread = Math.max(...lens) - Math.min(...lens);
      if (spread > MAX_SPREAD) {
        tells.push({ where, what: `option length spread ${spread} — some distractors are throwaways` });
      }
    }
  }
  return tells;
}

if (import.meta.env?.DEV) {
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
