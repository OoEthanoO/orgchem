/** Offline regressions for the naming decisions that distinguish Hard. */
import assert from "node:assert/strict";
import { QUIZ_BANK } from "../src/lib/quiz-bank.ts";
import { difficultyOf, namingComplexity } from "./quiz-difficulty.mjs";

let passed = 0;
function check(description, predicate) {
  assert.ok(predicate, description);
  passed++;
}

for (const [smiles, name, expected] of [
  ["CCCC", "butane", "easy"],
  ["CCCCCCCCCCCCCCCCCCCC", "icosane", "easy"],
  ["CCCCCCCCCCCCCCCCCCCCO", "icosan-1-ol", "easy"],
  ["CC(O)CC", "butan-2-ol", "easy"],
  ["CCC(C)CCCC", "3-methylheptane", "easy"],
  ["CC=CC", "but-2-ene", "easy"],
  ["C1=CCCCC1", "cyclohexene", "easy"],
  ["c1ccc2ccccc2c1", "naphthalene", "easy"],
  ["OCC(C)CC", "2-methylbutan-1-ol", "medium"],
  ["CC(C)CC(C)C", "2,4-dimethylpentane", "medium"],
  ["OCC(O)C", "propane-1,2-diol", "medium"],
  ["C/C=C/C", "(E)-but-2-ene", "medium"],
  ["C[C@H](O)CC", "(2S)-butan-2-ol", "medium"],
  ["CC(C)C(C)C(C)C", "2,3,4-trimethylpentane", "hard"],
  ["CC(C)C(Cl)C(C)C", "3-chloro-2,4-dimethylpentane", "hard"],
  ["COC(=O)C(C)C(C)C", "methyl 2,3-dimethylbutanoate", "hard"],
  ["CC(=O)C(C)CC(C)C", "3,5-dimethylhexan-2-one", "hard"],
  ["C/C=C/C=C/C", "(2E,4E)-hexa-2,4-diene", "hard"],
]) {
  check(`${name} is ${expected}`, difficultyOf(smiles, name) === expected);
}

// A molecule that could have stereoisomers does not require the learner to
// assign a descriptor until that configuration is specified in the question.
check("unassigned stereocentre contributes no stereo", namingComplexity("CC(O)CC", "butan-2-ol").specifiedStereo === 0);
check("one assigned centre contributes exactly one stereo decision", namingComplexity("C[C@H](O)CC", "(2S)-butan-2-ol").specifiedStereo === 1);
check("unassigned alkene contributes no stereo", namingComplexity("CC=CC", "but-2-ene").specifiedStereo === 0);
check("two direction markers describe one alkene", namingComplexity("C/C=C/C", "(E)-but-2-ene").specifiedStereo === 1);
check("two assigned alkenes are two stereo decisions", namingComplexity("C/C=C/C=C/C", "(2E,4E)-hexa-2,4-diene").specifiedStereo === 2);
check("ring-imposed alkene parity is not a requested descriptor", namingComplexity("C1=CCCCC1", "cyclohexene").specifiedStereo === 0);

const longBranched = Array.from({ length: 12 }, (_, index) => `C${[1, 9].includes(index) ? "(C)" : ""}`).join("");
const fullLocants = namingComplexity(longBranched, "2,10-dimethyldodecane");
check("2 and 10 are two locants, not three separate digits", fullLocants.locants === 2);
check("a long dimethyl chain stays Medium", difficultyOf(longBranched, "2,10-dimethyldodecane") === "medium");
check("duplicated locants do not invent extra numbering choices", namingComplexity("CC(C)(C)C", "2,2-dimethylpropane").locants === 1);
check("aromatic ring junctions are not chain branches", namingComplexity("c1ccc2ccccc2c1", "naphthalene").branches === 0);
check("the tri in nitrile is not a multiplying prefix", !namingComplexity("CCC#N", "propanenitrile").repeated);

// Pin diverse, verified Hard exercises. This prevents a threshold change from
// silently leaving only a few stereoisomers or highly branched hydrocarbons.
for (const name of [
  "2-methoxy-3,4-dimethylpentane",
  "N-ethyl-2,3-dimethylbutanamide",
  "ethyl 2-hydroxy-3-methylbutanoate",
  "3,4-dimethylhex-1-yne",
  "3,4-dimethylhex-1-en-5-yne",
  "2-hydroxy-3,4-dimethylpentanal",
  "4-chloro-2-methoxy-5-methylphenol",
  "2-chloro-3,4-dimethylpentanenitrile",
  "(2S,3R)-pentane-2,3-diol",
  "(2R,3S)-2-bromo-3-chlorobutane",
]) {
  const question = QUIZ_BANK.find((entry) => entry.name === name);
  check(`${name} remains a verified Hard exercise`, question && question.difficulty === "hard" && difficultyOf(question.smiles, question.name) === "hard");
}
const twoCentres = QUIZ_BANK.find((entry) => entry.name === "(2S,3R)-pentane-2,3-diol");
check("two assigned tetrahedral centres count separately", twoCentres && namingComplexity(twoCentres.smiles, twoCentres.name).specifiedStereo === 2);

const inconsistent = QUIZ_BANK.filter((entry) => entry.difficulty !== difficultyOf(entry.smiles, entry.name));
check(`all ${QUIZ_BANK.length} stored levels agree with the shared grader: ${inconsistent.map((entry) => entry.name).join(", ")}`, inconsistent.length === 0);
const hard = QUIZ_BANK.filter((entry) => entry.difficulty === "hard");
check("Hard remains a substantial practice pool", hard.length >= 65);
check("Hard covers at least fifteen topics", new Set(hard.map((entry) => entry.category)).size >= 15);
check("most Hard exercises challenge constitution rather than rely on stereo", hard.filter((entry) => namingComplexity(entry.smiles, entry.name).specifiedStereo === 0).length > hard.length / 2);
console.log(`${passed}/${passed} difficulty checks passed (${hard.length} Hard questions)`);
