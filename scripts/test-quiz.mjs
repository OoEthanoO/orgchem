/**
 * Offline checks on the question bank and the marking logic.
 *
 * The bank's names were verified against OPSIN when it was built; these are
 * the invariants that must hold every time it is loaded.
 */
import * as OCL from "openchemlib";
import { registerHooks } from "node:module";

import { QUIZ_BANK } from "../src/lib/quiz-bank.ts";
import { CATEGORIES, DIFFICULTIES, QUIZ_MODES, TOPIC_ALIASES, checkChoice, countFor, pickQuestion } from "../src/lib/quiz.ts";
import { classifyQuizTopic } from "./quiz-topics.mjs";
import { DEFAULT_DISPLAY, depict } from "../src/lib/depict.ts";

/** Pull one specific question out by narrowing until only it can be chosen. */
function describeById(index) {
  const entry = QUIZ_BANK[index];
  const others = QUIZ_BANK.map((_, i) => i).filter((i) => i !== index);
  const picked = pickQuestion("name", entry.category, entry.difficulty, others);
  return picked?.id === index ? picked : null;
}

const failures = [];
let pass = 0;
const check = (name, ok) => (ok ? pass++ : failures.push(name));

const categoryIds = new Set(CATEGORIES.map((c) => c.id));

const formulaOfEntry = (index) => {
  const molecule = OCL.Molecule.fromSmiles(QUIZ_BANK[index].smiles);
  return molecule.getMolecularFormula().formula;
};
const formulaMatches = (a, b) => formulaOfEntry(a) === formulaOfEntry(b);

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

// Independently specified functional-group examples include names whose
// spelling would be misleading (acetyl acetate is an anhydride) and molecules
// with several groups. Classification stays within the original course group.
const topicFixtures = [
  ["alkanes", "CCCC", "alkanes"],
  ["alkanes", "CC(C)C", "alkanes"],
  ["alkanes", "CC1CCCCC1", "cycloalkanes"],
  ["alkanes", "C1CCCCCCC1", "cycloalkanes"],
  ["alkanes", "CC1CCCCCCC1", "cycloalkanes"],
  ["alkanes", "C1CCCCCCCCCCC1", "cycloalkanes"],
  ["unsaturated", "C/C=C/C", "alkenes"],
  ["unsaturated", "CC#CC", "alkynes"],
  ["unsaturated", "C=CC#C", "enynes"],
  ["unsaturated", "C#CCC=C", "enynes"],
  ["alcohols", "CCO", "alcohols"],
  ["alcohols", "COCCO", "alcohols"],
  ["alcohols", "O(CC)CC", "ethers"],
  ["alcohols", "C1CCOC1", "ethers"],
  ["carbonyls", "C=O", "aldehydes"],
  ["carbonyls", "CCC=O", "aldehydes"],
  ["carbonyls", "O=CCC=O", "aldehydes"],
  ["carbonyls", "CC(=O)C", "ketones"],
  ["carbonyls", "CC(=O)CO", "ketones"],
  ["carbonyls", "O=C1CCCCC1", "ketones"],
  ["acids", "CC(=O)O", "acids"],
  ["acids", "CC(O)C(=O)O", "acids"],
  ["acids", "CC(=O)OC", "esters"],
  ["acids", "COC=O", "esters"],
  ["acids", "CC(=O)N", "amides"],
  ["acids", "CC(=O)N(C)C", "amides"],
  ["acids", "CC(=O)Cl", "acyl-halides"],
  ["acids", "CC(=O)Br", "acyl-halides"],
  ["acids", "CC(=O)OC(=O)C", "anhydrides"],
  ["amines", "CCN", "amines"],
  ["amines", "CN(C)C", "amines"],
  ["amines", "N1CCOCC1", "amines"],
  ["amines", "CC#N", "nitriles"],
  ["amines", "CC(O)C#N", "nitriles"],
  ["amines", "O=[N+]([O-])C", "nitro"],
  ["aromatics", "COc1ccccc1", "aromatics"],
  ["aromatics", "CC(=O)c1ccccc1", "aromatics"],
  ["aromatics", "N#Cc1ccccc1", "aromatics"],
  ["halides", "ClCCO", "halides"],
];
for (const [original, smiles, expected] of topicFixtures) {
  check(`${smiles}: correct topic within ${original}`, classifyQuizTopic(original, smiles) === expected);
  check(`${smiles}: reclassification preserves its specific topic`, classifyQuizTopic(expected, smiles) === expected);
}
let nitrileMisreadAsAlkyne = false;
try { classifyQuizTopic("unsaturated", "CC#N"); nitrileMisreadAsAlkyne = true; } catch { /* No carbon-carbon multiple bond. */ }
check("a nitrile triple bond is not an alkyne", !nitrileMisreadAsAlkyne);
check("every bank topic agrees with its structural class", QUIZ_BANK.every((entry) => classifyQuizTopic(entry.category, entry.smiles) === entry.category));
const classifiedBankFixtures = [
  [300, "acetyl acetate", "anhydrides"],
  [340, "2-ethoxyethanol", "alcohols"],
  [343, "2-methoxyethanol", "alcohols"],
  [705, "but-1-en-3-yne", "enynes"],
  [719, "pent-1-en-4-yne", "enynes"],
  [611, "formaldehyde", "aldehydes"],
  [559, "1-hydroxypropan-2-one", "ketones"],
  [582, "3-hydroxybutan-2-one", "ketones"],
  [284, "2-hydroxyacetic acid", "acids"],
  [285, "2-hydroxypropanoic acid", "acids"],
  [427, "2-hydroxypropanenitrile", "nitriles"],
];
for (const [id, name, category] of classifiedBankFixtures) {
  check(`${name}: ID preserved with specific topic`, QUIZ_BANK[id]?.name === name && QUIZ_BANK[id]?.category === category);
}
for (const id of [382, 388, 393, 398, 407, 411, 416, 422]) {
  check(`cyclooctane question ${id}: large ring belongs to cycloalkanes`, QUIZ_BANK[id].category === "cycloalkanes");
}

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
    const picked = pickQuestion("name", category, difficulty, []);
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
const sample = pickQuestion("name", null, null, []);
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
    "name",
    QUIZ_BANK[withLocants].category,
    QUIZ_BANK[withLocants].difficulty,
    [],
  );
  check("the last hint hides the digits", Boolean(question) && !/\d/.test(question.hints[2].replace(/^Hint \d/, "")));
}

// Asking repeatedly with everything excluded still returns something.
const all = QUIZ_BANK.map((_, index) => index);
check("exhausting the pool starts over rather than failing", pickQuestion("name", null, null, all) !== null);
check("an impossible selection returns nothing", pickQuestion("name", "no-such-category", null, []) === null);

// Retained names and heterocycles do not reliably spell out their family.
// The first hint must use the actual topic in both practice directions.
for (const [name, family] of [
  ["oxane", "an ether"],
  ["1-nitroethane", "a nitro compound"],
  ["acetyl acetate", "an acid anhydride"],
  ["but-1-en-3-yne", "an enyne, with both a double and a triple bond"],
  ["piperidine", "an amine"],
  ["formaldehyde", "an aldehyde"],
]) {
  const target = QUIZ_BANK.findIndex((entry) => entry.name === name);
  for (const mode of QUIZ_MODES) {
    const question = target < 0 ? null : pickQuestion(mode, null, null, all.filter((id) => id !== target));
    check(`${name}: ${mode} family hint identifies its structural class`, question?.id === target && question.hints[0].endsWith(`it is ${family}.`));
  }
}

// A selected topic is part of one combined pool. Exhausting the first topic
// must not reset it while another selected topic still has unseen questions.
const selectedTopics = Object.freeze(["alkanes", "alcohols"]);
for (const difficulty of [null, ...DIFFICULTIES]) {
  const expected = selectedTopics.reduce((sum, topic) => sum + countFor(topic, difficulty), 0);
  check(`multi-topic count is the union at ${difficulty ?? "any"} level`, countFor(selectedTopics, difficulty) === expected);
  check(`duplicate topics do not inflate the count at ${difficulty ?? "any"} level`, countFor(["alkanes", "alcohols", "alkanes"], difficulty) === expected);
  check(`empty topic array means all at ${difficulty ?? "any"} level`, countFor([], difficulty) === countFor(null, difficulty));
  for (const topic of selectedTopics) {
    const target = QUIZ_BANK.findIndex((entry) => entry.category === topic && (!difficulty || entry.difficulty === difficulty));
    if (target < 0) continue;
    for (const mode of QUIZ_MODES) {
      const question = pickQuestion(mode, selectedTopics, difficulty, all.filter((id) => id !== target));
      check(`${mode}: unseen ${topic} question survives the union at ${difficulty ?? "any"} level`, question?.id === target);
    }
  }
}
const unionReset = pickQuestion("name", selectedTopics, "hard", all);
check("exhausted union resets only within its topics and difficulty", unionReset && selectedTopics.includes(unionReset.category) && unionReset.difficulty === "hard");
check("unknown topic arrays have no questions", countFor(["no-such-category"], null) === 0 && pickQuestion("name", ["no-such-category"], null) === null);

// Legacy links for retired IDs still mean the old union. Combining an alias
// with one of its children must not count or sample that child twice.
for (const [legacy, children] of Object.entries(TOPIC_ALIASES)) {
  for (const difficulty of [null, ...DIFFICULTIES]) {
    const expected = children.reduce((sum, topic) => sum + countFor(topic, difficulty), 0);
    check(`${legacy}: legacy count is its child union at ${difficulty ?? "any"} level`, countFor(legacy, difficulty) === expected);
    check(`${legacy}: overlapping alias selections count each question once`, countFor([legacy, ...children, legacy], difficulty) === expected);
  }
  for (const child of children) {
    const target = QUIZ_BANK.findIndex((entry) => entry.category === child);
    for (const mode of QUIZ_MODES) {
      check(`${legacy}: ${mode} can pick an unseen ${child} question`, pickQuestion(mode, legacy, null, all.filter((id) => id !== target))?.id === target);
    }
  }
}
for (const category of categoryIds) {
  check(`${category}: specific topic count excludes sibling topics`, countFor(category, null) === QUIZ_BANK.filter((entry) => entry.category === category).length);
}

// Load the real Next handler under Node with the same aliases/extension that
// Next resolves at build time. Keep this adapter local to the route import.
const routeImports = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/quiz") return nextResolve(new URL("../src/lib/quiz.ts", import.meta.url).href, context);
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    return nextResolve(specifier, context);
  },
});
let quizGet;
try { ({ GET: quizGet } = await import("../src/app/api/quiz/route.ts")); }
finally { routeImports.deregister(); }
const secondTopicTarget = QUIZ_BANK.findIndex((entry) => entry.category === "alcohols" && entry.difficulty === "easy");
const unseenSecondTopic = all.filter((id) => id !== secondTopicTarget).join(",");
for (const mode of QUIZ_MODES) {
  const response = await quizGet(new Request(`http://localhost/api/quiz?mode=${mode}&category=alkanes&category=alcohols&category=alkanes&difficulty=easy&seen=${unseenSecondTopic}`));
  const question = await response.json();
  check(`${mode}: API reads every repeated topic and respects history/difficulty`, response.status === 200 && question.id === secondTopicTarget && question.difficulty === "easy");
}
const legacyTopicResponse = await quizGet(new Request("http://localhost/api/quiz?category=alkanes"));
check("API preserves single-topic requests", legacyTopicResponse.status === 200 && (await legacyTopicResponse.json()).category === "alkanes");
const emptyTopicResponse = await quizGet(new Request(`http://localhost/api/quiz?category=&category=&seen=${unseenSecondTopic}`));
check("empty API topic values mean all topics", emptyTopicResponse.status === 200 && (await emptyTopicResponse.json()).id === secondTopicTarget);
check("API preserves unknown-only topic 404", (await quizGet(new Request("http://localhost/api/quiz?category=no-such-category"))).status === 404);
for (const [legacy, topic] of [["unsaturated", "enynes"], ["carbonyls", "ketones"]]) {
  const target = QUIZ_BANK.findIndex((entry) => entry.category === topic);
  const seen = all.filter((id) => id !== target).join(",");
  const response = await quizGet(new Request(`http://localhost/api/quiz?category=${legacy}&category=${topic}&seen=${seen}`));
  check(`API supports legacy ${legacy} with overlapping ${topic} selection`, response.status === 200 && (await response.json()).id === target);
}
const etherResponse = await quizGet(new Request("http://localhost/api/quiz?category=ethers"));
check("API supports the separate ethers topic", etherResponse.status === 200 && (await etherResponse.json()).category === "ethers");

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

// --- the multiple-choice direction -----------------------------------------
const choiceProblems = [];
let choicesChecked = 0;
let sameUnderAnyNonce = 0;
for (let attempt = 0; attempt < 60; attempt++) {
  const question = pickQuestion("structure", null, null, []);
  if (!question || question.mode !== "structure") {
    choiceProblems.push("pickQuestion did not return a structure question");
    break;
  }
  choicesChecked++;

  if (question.choices.length !== 4) choiceProblems.push(`${question.name}: ${question.choices.length} choices`);
  if (question.choices.some((choice) => !choice.svg)) choiceProblems.push(`${question.name}: a choice has no drawing`);
  if ("smiles" in question || "answer" in question) choiceProblems.push(`${question.name}: payload leaks the answer`);

  // The options are drawings and a position each. Anything that told them
  // apart — a bank index above all, since the right one is the question's own
  // id — would put the answer in the browser before the question was tried.
  const described = question.choices.flatMap((choice) => Object.keys(choice));
  if (described.some((key) => key !== "svg")) {
    choiceProblems.push(`${question.name}: choices carry ${[...new Set(described)].join(", ")}`);
  }
  const drawings = question.choices.map((choice) => choice.svg);
  if (new Set(drawings).size !== drawings.length) choiceProblems.push(`${question.name}: a choice is repeated`);

  // Exactly one position must mark as correct, and it must be the one the
  // verdict points the reader at.
  const positions = question.choices.map((_, position) => position);
  const marked = positions.map((position) => checkChoice(question.id, position, question.nonce));
  const correct = marked.filter((verdict) => verdict.correct);
  if (correct.length !== 1) choiceProblems.push(`${question.name}: ${correct.length} choices mark as correct`);
  const pointed = new Set(marked.map((verdict) => verdict.correctChoice));
  if (pointed.size !== 1 || !marked[[...pointed][0]]?.correct) {
    choiceProblems.push(`${question.name}: correctChoice does not point at the right option`);
  }

  // Marking has to survive the round trip through the client, which sends back
  // a position and a nonce and nothing else.
  const rebuilt = checkChoice(question.id, [...pointed][0], question.nonce);
  if (!rebuilt.correct) choiceProblems.push(`${question.name}: the option list did not rebuild`);
  // Not an error in itself — one arrangement in four puts the answer back in
  // the same place — but every nonce agreeing would mean it is not being used.
  const otherNonce = checkChoice(question.id, [...pointed][0], `${question.nonce}x`);
  if (otherNonce.correctChoice === [...pointed][0]) sameUnderAnyNonce++;

  // The name shown must not be blank, and "show me" must reveal the structure.
  if (!question.name?.trim()) choiceProblems.push(`question ${question.id}: no name shown`);
  const revealed = checkChoice(question.id, -1, question.nonce);
  if (revealed.correct || revealed.answer !== question.name || revealed.correctChoice !== [...pointed][0]) {
    choiceProblems.push(`${question.name}: "show me" did not reveal the answer`);
  }
}
check("the nonce decides the arrangement", sameUnderAnyNonce < choicesChecked);
check(`multiple choice is well formed (${choicesChecked} sampled)`, choiceProblems.length === 0);
if (choiceProblems.length) failures.push(...[...new Set(choiceProblems)].slice(0, 5));

// Distractors are only worth offering if they could plausibly be the compound
// named, so most should be true isomers of it.
// The distractors are only named by marking a pick, which is all the browser
// can learn about them either.
const bankByName = new Map(QUIZ_BANK.map((entry, index) => [entry.name, index]));
let sameFormula = 0;
let totalDistractors = 0;
for (let attempt = 0; attempt < 40; attempt++) {
  const question = pickQuestion("structure", null, null, []);
  if (question?.mode !== "structure") continue;
  question.choices.forEach((_, position) => {
    const verdict = checkChoice(question.id, position, question.nonce);
    if (verdict.correct) return;
    totalDistractors++;
    const distractor = bankByName.get(verdict.named);
    if (distractor !== undefined && formulaMatches(distractor, question.id)) sameFormula++;
  });
}
check(
  `most distractors are true isomers (${sameFormula}/${totalDistractors})`,
  totalDistractors > 0 && sameFormula / totalDistractors > 0.5,
);

// Hard must not offer easy cross-family eliminations when enough same-family
// isomers exist. Find a real four-drawing pool, then test the public question
// and answer flow rather than depending on the option-building internals.
const hardIsomerTarget = QUIZ_BANK.findIndex((entry, id) => {
  if (entry.difficulty !== "hard") return false;
  const peers = QUIZ_BANK.flatMap((candidate, index) =>
    candidate.category === entry.category && formulaMatches(id, index) ? [candidate] : [],
  );
  return new Set(peers.map((candidate) => depict(candidate.smiles, DEFAULT_DISPLAY).svg)).size >= 4;
});
check("Hard has a pool of closely related same-family isomers", hardIsomerTarget >= 0);
if (hardIsomerTarget >= 0) {
  const target = QUIZ_BANK[hardIsomerTarget];
  for (let attempt = 0; attempt < 6; attempt++) {
    const question = pickQuestion("structure", target.category, "hard", all.filter((id) => id !== hardIsomerTarget));
    const verdicts = question.choices.map((_, position) => checkChoice(question.id, position, question.nonce));
    const peers = verdicts.filter((verdict) => !verdict.correct).map((verdict) => bankByName.get(verdict.named));
    check(`Hard distractors stay in the same family and formula (${attempt})`, peers.length === 3
      && peers.every((id) => id !== undefined && QUIZ_BANK[id].category === target.category && formulaMatches(id, hardIsomerTarget)));
    check(`Hard isomer options have exactly one correct choice (${attempt})`, verdicts.filter((verdict) => verdict.correct).length === 1);
  }
}

check("both modes are offered", QUIZ_MODES.length === 2);

console.log(`${pass}/${pass + failures.length} passed  (${QUIZ_BANK.length} questions)`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
