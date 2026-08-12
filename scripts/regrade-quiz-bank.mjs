/**
 * Re-scores the question bank's difficulty from the structures and names it
 * already holds, without going back to the network.
 *
 * The first pass counted any carbon with three heavy neighbours as a chain
 * branch, which made every secondary alcohol and every carbonyl carbon look
 * like extra complexity — heptan-2-ol came out "hard". A branch is a carbon
 * with three or more *carbon* neighbours; a functional group is counted by
 * what it does to the name instead.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { QUIZ_BANK } from "../src/lib/quiz-bank.ts";
import { difficultyOf } from "./quiz-difficulty.mjs";

const regraded = QUIZ_BANK.map((question) => ({
  ...question,
  difficulty: difficultyOf(question.smiles, question.name),
}));

const counts = { easy: 0, medium: 0, hard: 0 };
const moved = [];
for (const [index, question] of regraded.entries()) {
  counts[question.difficulty]++;
  if (question.difficulty !== QUIZ_BANK[index].difficulty) {
    moved.push(`${question.name}: ${QUIZ_BANK[index].difficulty} -> ${question.difficulty}`);
  }
}

console.log("by difficulty:", counts);
console.log(`\n${moved.length} regraded, e.g.:`);
for (const line of moved.slice(0, 12)) console.log("  " + line);

const source = readFileSync("src/lib/quiz-bank.ts", "utf8");
const header = source.slice(0, source.indexOf("export const QUIZ_BANK"));
writeFileSync(
  "src/lib/quiz-bank.ts",
  `${header}export const QUIZ_BANK: BankQuestion[] = ${JSON.stringify(regraded, null, 2)};\n`,
);
console.log("\nwrote src/lib/quiz-bank.ts");
