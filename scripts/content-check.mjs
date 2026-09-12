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
