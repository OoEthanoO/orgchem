/**
 * Offline checks on the question bank and the marking logic.
 *
 * The bank's names were verified against OPSIN when it was built; these are
 * the invariants that must hold every time it is loaded.
 */
import * as OCL from "openchemlib";

import { QUIZ_BANK } from "../src/lib/quiz-bank.ts";
import { CATEGORIES, DIFFICULTIES, countFor, pickQuestion } from "../src/lib/quiz.ts";

/** Pull one specific question out by narrowing until only it can be chosen. */
function describeById(index) {
  const entry = QUIZ_BANK[index];
  const others = QUIZ_BANK.map((_, i) => i).filter((i) => i !== index);
  const picked = pickQuestion(entry.category, entry.difficulty, others);
  return picked?.id === index ? picked : null;
}

const failures = [];
let pass = 0;
const check = (name, ok) => (ok ? pass++ : failures.push(name));

const categoryIds = new Set(CATEGORIES.map((c) => c.id));

const PREFIX_WORDS = ["trifluoromethyl","cyclohexyl","cyclopentyl","isopropyl","methoxy","ethoxy","propoxy","phenyl","benzyl","methyl","ethyl","propyl","butyl","fluoro","chloro","bromo","iodo","hydroxy","amino","nitro","cyano","oxo"];

check("bank is not empty", QUIZ_BANK.length > 0);

// Every entry has to be usable: a drawable structure, a name, and a category
// and level the UI actually offers.
const problems = [];
const names = new Set();
const structures = new Set();
for (const question of QUIZ_BANK) {
  try {
    const molecule = OCL.Molecule.fromSmiles(question.smiles);
    if (molecule.getAllAtoms() === 0) problems.push(`${question.name}: empty structure`);
    structures.add(molecule.getIDCode());
  } catch {
    problems.push(`${question.name}: unparsable SMILES ${question.smiles}`);
  }
  if (!question.name?.trim()) problems.push(`${question.smiles}: no name`);
  if (!categoryIds.has(question.category)) problems.push(`${question.name}: unknown category`);
  if (!DIFFICULTIES.includes(question.difficulty)) problems.push(`${question.name}: bad difficulty`);
  names.add(question.name);
}
check("every entry is drawable and labelled", problems.length === 0);
if (problems.length) failures.push(...problems.slice(0, 5));

check("no duplicate structures", structures.size === QUIZ_BANK.length);
check("no duplicate names", names.size === QUIZ_BANK.length);

// Stereodescriptors have to keep their case: "(e)" is not a descriptor.
const miscased = QUIZ_BANK.filter((q) => /\([0-9]*[ezrs][,)]/.test(q.name));
check("stereodescriptors are upper case", miscased.length === 0);
if (miscased.length) failures.push(`miscased: ${miscased.map((q) => q.name).join(", ")}`);

// countFor is what the page uses to grey out selections it cannot fill, so it
// has to agree with what pickQuestion will actually do for every combination
// the UI can offer. A mismatch is a dead end the reader can click on.
const inconsistent = [];
for (const category of [null, ...categoryIds]) {
  for (const difficulty of [null, ...DIFFICULTIES]) {
    const count = countFor(category, difficulty);
    const picked = pickQuestion(category, difficulty, []);
    if ((count > 0) !== (picked !== null)) {
      inconsistent.push(`${category ?? "any"}/${difficulty ?? "any"}: count ${count}, picked ${picked !== null}`);
    }
    if (picked && difficulty && picked.difficulty !== difficulty) {
      inconsistent.push(`${category ?? "any"}/${difficulty}: got a ${picked.difficulty} question`);
    }
    if (picked && category && picked.category !== category) {
      inconsistent.push(`${category}/${difficulty ?? "any"}: got a ${picked.category} question`);
    }
  }
}
check("the count and the picker agree for every selection", inconsistent.length === 0);
if (inconsistent.length) failures.push(...inconsistent.slice(0, 5));

// Every topic must offer something, even if not at every level.
const barren = [...categoryIds].filter((category) => countFor(category, null) === 0);
check("every topic has questions", barren.length === 0);
if (barren.length) failures.push(`empty topics: ${barren.join(", ")}`);

// A question must never carry its own answer to the browser.
const sample = pickQuestion(null, null, []);
check("a question can be drawn", Boolean(sample?.svg));
check("the question does not leak the answer", sample !== null && !("name" in sample));
check("the question comes with hints", (sample?.hints.length ?? 0) === 3);
check(
  "no hint spells out the whole name",
  sample !== null && !sample.hints.some((hint) => QUIZ_BANK[sample.id].name === hint),
);

// The third hint blanks the locants and nothing else.
const withLocants = QUIZ_BANK.findIndex((q) => /\d/.test(q.name));
if (withLocants >= 0) {
  const question = pickQuestion(
    QUIZ_BANK[withLocants].category,
    QUIZ_BANK[withLocants].difficulty,
    [],
  );
  check("the last hint hides the digits", Boolean(question) && !/\d/.test(question.hints[2].replace(/^Hint \d/, "")));
}

// Asking repeatedly with everything excluded still returns something.
const all = QUIZ_BANK.map((_, index) => index);
check("exhausting the pool starts over rather than failing", pickQuestion(null, null, all) !== null);
check("an impossible selection returns nothing", pickQuestion("no-such-category", null, []) === null);

// The substituent hint must name what the compound actually carries. A plain
// substring test gets this wrong both ways: "methyl" ends with "ethyl", and
// "dimethyl" buries the "methyl" behind a multiplier.
const hintProblems = [];
for (const [index, entry] of QUIZ_BANK.entries()) {
  const question = describeById(index);
  if (!question) continue;
  const listed = question.hints[1];
  const claimsEthyl = /\bethyl\b/.test(listed.replace(/methyl/g, ""));
  const reallyHasEthyl = /(?:^|[^a-z])(di|tri|tetra)?ethyl/.test(entry.name);
  if (claimsEthyl && !reallyHasEthyl) hintProblems.push(`${entry.name}: hint claims ethyl`);

  const reallyHasMethyl = /(?:^|[^a-z])(di|tri|tetra)?methyl/.test(entry.name);
  if (reallyHasMethyl && !/methyl/.test(listed)) hintProblems.push(`${entry.name}: hint omits methyl`);
}
check("substituent hints match the name", hintProblems.length === 0);
if (hintProblems.length) failures.push(...hintProblems.slice(0, 5));

// The parent hint must name the parent, not whatever stem happens to appear in
// the string: "cyclohexanone" contains "non" and "methanamine" contains "eth".
const STEM_NUMBERS = { meth:1, eth:2, prop:3, but:4, pent:5, hex:6, hept:7, oct:8, non:9, dec:10, undec:11, dodec:12 };
const WORD_NUMBERS = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12 };
const parentProblems = [];
let parentsChecked = 0;
for (const [index, entry] of QUIZ_BANK.entries()) {
  const question = describeById(index);
  if (!question) continue;
  const said = Object.entries(WORD_NUMBERS).find(([word]) => question.hints[1].includes(`has ${word} carbon`));
  if (!said) continue;
  parentsChecked++;

  const ester = /^\S+yl (\S+oate)$/.exec(entry.name);
  let rest = ester ? ester[1] : entry.name;
  for (const prefix of PREFIX_WORDS) {
    rest = rest.replace(new RegExp(`(^|[^a-z])(di|tri|tetra|penta|hexa)?${prefix}`, "g"), "$1");
  }
  let best = null;
  for (const [stem, count] of Object.entries(STEM_NUMBERS)) {
    const at = rest.search(new RegExp(`${stem}(an|en|yn)`));
    if (at < 0) continue;
    if (!best || at < best.at || (at === best.at && stem.length > best.stem.length)) {
      best = { at, stem, count };
    }
  }
  if (best && best.count !== said[1]) {
    parentProblems.push(`${entry.name}: hint says ${said[0]}, parent stem is ${best.stem}`);
  }
}
check(`parent hints name the parent (${parentsChecked} checked)`, parentProblems.length === 0);
if (parentProblems.length) failures.push(...parentProblems.slice(0, 5));

console.log(`${pass}/${pass + failures.length} passed  (${QUIZ_BANK.length} questions)`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
