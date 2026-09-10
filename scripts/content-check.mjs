/* The learn material, validated as content rather than as code.
 *
 * tsc proves the shapes are right and says nothing about whether a quiz is
 * answerable. These checks are the ones that matter to a reader: an answer
 * index that points outside its options, two questions on a topic that ask the
 * same thing, and above all the length tell, where the correct option is
 * visibly longer than its distractors and the quiz can be passed without
 * knowing anything.
 *
 * It runs in the build because it caught real defects in content written
 * minutes earlier, twice.
 */
import { findProblems, findAnswerTells, findUniformity, findDiagramOverflow } from "../src/data/learn/validate.ts";

const groups = [
  ["structure", findProblems()],
  ["answer tells", findAnswerTells()],
  ["uniformity", findUniformity()],
  ["diagram text fits", findDiagramOverflow()],
];

let total = 0;
for (const [name, problems] of groups) {
  total += problems.length;
  if (!problems.length) {
    console.log(`pass  ${name}`);
    continue;
  }
  console.error(`FAIL  ${name}: ${problems.length}`);
  for (const p of problems) console.error(`        ${p.where}  ${p.what}`);
}

console.log(total ? `\n${total} content problems` : "\ncontent: clean");
process.exit(total ? 1 : 0);
