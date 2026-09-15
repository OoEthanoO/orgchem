import assert from "node:assert/strict";

import { complexKey, parseComplex } from "../src/lib/complexes.ts";
import {
  COMPLEX_CATEGORIES,
  COMPLEX_DIFFICULTIES,
  COMPLEX_QUIZ_BANK,
  checkComplexAnswer,
  checkComplexChoice,
  countComplexQuestions,
  pickComplexQuestion,
} from "../src/lib/complex-quiz.ts";
import { GET, POST } from "../src/app/api/complex-quiz/route.ts";

let checks = 0;
function check(value, message) {
  checks++;
  assert.ok(value, message);
}

const ids = COMPLEX_QUIZ_BANK.map((_, id) => id);
const nameId = (name) => {
  const id = COMPLEX_QUIZ_BANK.findIndex((entry) => entry.name === name);
  assert.ok(id >= 0, `Missing fixture ${name}`);
  return id;
};
function questionFor(id, mode = "name") {
  const entry = COMPLEX_QUIZ_BANK[id];
  return pickComplexQuestion(mode, entry.category, entry.difficulty, ids.filter((other) => other !== id));
}

check(COMPLEX_QUIZ_BANK.length >= 24, "Useful practice bank size");
const categoryIds = new Set(COMPLEX_CATEGORIES.map((item) => item.id));
const keys = new Set();
for (const [id, entry] of COMPLEX_QUIZ_BANK.entries()) {
  const complex = parseComplex(entry.name);
  check(complex !== null, `${entry.name} parses`);
  check(categoryIds.has(entry.category), `${entry.name} has a known topic`);
  check(COMPLEX_DIFFICULTIES.includes(entry.difficulty), `${entry.name} has a known level`);
  keys.add(complexKey(complex));
  check(complex.oxidationState + complex.ligands.reduce((sum, ligand) => sum + ligand.count * ligand.charge, 0) === complex.charge, `${entry.name}: charges balance`);
  check(complex.coordinationNumber === complex.ligands.reduce((sum, ligand) => sum + ligand.count * ligand.denticity, 0), `${entry.name}: donor count`);

  const question = questionFor(id);
  check(question.id === id, `${entry.name}: requested question selected`);
  check(!("name" in question) && !("answer" in question), `${entry.name}: no answer field`);
  check(question.svg.startsWith("<svg"), `${entry.name}: drawable schematic`);
  check(!question.svg.toLowerCase().includes(complex.canonicalName.toLowerCase()), `${entry.name}: SVG does not disclose name`);
  check(question.hints.length === 3 && !question.hints.some((hint) => hint.toLowerCase().includes(complex.canonicalName.toLowerCase())), `${entry.name}: hints do not disclose name`);
  check(checkComplexAnswer(id, entry.name).correct, `${entry.name}: correct name accepted`);
  check(checkComplexAnswer(id, `  ${entry.name.toLowerCase()}  `).correct, `${entry.name}: Roman numeral case accepted`);
  check(checkComplexAnswer(id, entry.name.replaceAll("chlorido", "chloro").replaceAll("cyanido", "cyano")).correct, `${entry.name}: traditional aliases accepted`);
  check(!checkComplexAnswer(id, question.formula).correct, `${entry.name}: formula does not answer naming task`);

  const choiceQuestion = questionFor(id, "structure");
  check(choiceQuestion.formula === "", `${entry.name}: correct formula not leaked before choice`);
  check(choiceQuestion.choices.length === 4, `${entry.name}: four choices`);
  check(new Set(choiceQuestion.choices.map((choice) => choice.formula)).size === 4, `${entry.name}: distinct choice formulas`);
  const verdicts = choiceQuestion.choices.map((_, position) => checkComplexChoice(id, position, choiceQuestion.nonce));
  check(verdicts.filter((verdict) => verdict.correct).length === 1, `${entry.name}: exactly one correct choice`);
  const right = verdicts.findIndex((verdict) => verdict.correct);
  check(choiceQuestion.choices[right].formula === question.formula, `${entry.name}: marking matches displayed formula`);
  check(verdicts.every((verdict) => verdict.correctChoice === right && verdict.formula === question.formula), `${entry.name}: feedback identifies answer consistently`);
  const reveal = checkComplexChoice(id, -1, choiceQuestion.nonce);
  check(!reveal.correct && reveal.correctChoice === right, `${entry.name}: reveal is not scored correct`);
}
check(keys.size === COMPLEX_QUIZ_BANK.length, "No duplicate complex identities");

for (const category of [null, ...categoryIds]) {
  for (const difficulty of [null, ...COMPLEX_DIFFICULTIES]) {
    const count = countComplexQuestions(category, difficulty);
    const question = pickComplexQuestion("name", category, difficulty);
    check((count > 0) === (question !== null), `Filter availability ${category}/${difficulty}`);
    if (question) {
      check((!category || question.category === category) && (!difficulty || question.difficulty === difficulty), `Filter respected ${category}/${difficulty}`);
    }
  }
}
check(pickComplexQuestion("name", "unknown", null) === null, "Unknown category has no questions");
check(pickComplexQuestion("name", null, null, ids) !== null, "Question pool resets after all entries seen");

// Independently specified chemistry checks: mixed neutral ligands, cyanide
// oxidation states, chelate denticity, and salt stoichiometry.
const chromiumId = nameId("triamminetriaquachromium(III)");
const chromium = parseComplex(COMPLEX_QUIZ_BANK[chromiumId].name);
check(chromium.metal.symbol === "Cr" && chromium.charge === 3 && chromium.coordinationNumber === 6, "User's chromium example has +3 charge and six donors");
check(chromium.ligands.some((ligand) => ligand.formula === "NH3" && ligand.count === 3), "Chromium has three NH3 ligands");
check(chromium.ligands.some((ligand) => ligand.formula === "H2O" && ligand.count === 3), "Chromium has three aqua ligands");
check(!checkComplexAnswer(chromiumId, "triamminetriaquachromium(II)").correct, "Wrong oxidation state rejected");
check(!checkComplexAnswer(chromiumId, "tetraamminediaquachromium(III)").correct, "Wrong ligand counts rejected");
check(!checkComplexAnswer(chromiumId, "triamminetriaquacobalt(III)").correct, "Wrong metal rejected");
check(!checkComplexAnswer(chromiumId, "triamminetriaquachromium(III) chloride").correct, "Salt is not interchangeable with free complex ion");
check(!checkComplexAnswer(chromiumId, "").correct, "Blank answer reveals without awarding point");
check(!checkComplexAnswer(-1, "hexaaquairon(II)").correct, "Invalid question rejected");

const ferrateII = parseComplex("hexacyanidoferrate(II)");
const ferrateIII = parseComplex("hexacyanidoferrate(III)");
check(ferrateII.charge === -4 && ferrateIII.charge === -3, "Cyanide ions have oxidation-sensitive charge");
check(!checkComplexAnswer(nameId("hexacyanidoferrate(II)"), "hexacyanidoferrate(III)").correct, "Wrong complex charge rejected");
check(checkComplexAnswer(nameId("tris(ethane-1,2-diamine)cobalt(III)"), "tris(ethylenediamine)cobalt(iii)").correct, "Chelating traditional ligand name accepted");
const oxalate = parseComplex("trioxalatoferrate(III)");
check(oxalate.charge === -3 && oxalate.coordinationNumber === 6 && oxalate.ligands[0].count === 3, "Three bidentate oxalates give six-coordinate iron(III) anion");
check(checkComplexAnswer(nameId("trioxalatoferrate(III)"), "tris(oxalato)ferrate(III)").correct, "Accepted oxalato multiplier alternative");
check(!checkComplexAnswer(nameId("potassium hexacyanidoferrate(II)"), "sodium hexacyanidoferrate(II)").correct, "Wrong salt counterion rejected");

const get = (query = "") => GET(new Request(`http://localhost/api/complex-quiz${query}`));
const post = (body) => POST(new Request("http://localhost/api/complex-quiz", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
}));

let response = get("?category=mixed-ligands&difficulty=medium");
check(response.status === 200 && response.headers.get("cache-control") === "no-store", "Question endpoint is uncached");
let returned = await response.json();
check(returned.category === "mixed-ligands" && returned.difficulty === "medium", "Endpoint applies selection");
for (const query of ["?mode=other", "?category=other", "?difficulty=other", "?seen=1,nope", "?seen=-1"]) {
  check(get(query).status === 400, `Bad query rejected ${query}`);
}
check(get("?category=chelates&difficulty=easy").status === 404, "Empty filter has explicit 404");

for (const body of [null, [], 7, {}, { id: "0", answer: "" }, { id: -1, answer: "" }, { id: 999, answer: "" }, { id: 0 }, { id: 0, answer: "x".repeat(301) }, { id: 0, choice: 0 }, { id: 0, choice: 5, nonce: "a".repeat(32) }, { id: 0, choice: 0, nonce: "bad" }, { id: 0, choice: 0, nonce: "a".repeat(32), answer: "x" }]) {
  check((await post(body)).status === 400, `Invalid request rejected ${JSON.stringify(body).slice(0, 80)}`);
}
check((await POST(new Request("http://localhost/api/complex-quiz", { method: "POST", body: "{" }))).status === 400, "Invalid JSON rejected");
response = await post({ id: chromiumId, answer: "triamminetriaquachromium(iii)" });
check(response.status === 200 && (await response.json()).correct, "Typed answer works through endpoint");
response = get("?mode=structure");
returned = await response.json();
const revealed = await (await post({ id: returned.id, choice: -1, nonce: returned.nonce })).json();
const marked = await (await post({ id: returned.id, choice: revealed.correctChoice, nonce: returned.nonce })).json();
check(marked.correct && marked.formula === returned.choices[revealed.correctChoice].formula, "Choice endpoint reconstructs displayed option order");

console.log(`${checks} coordination practice checks passed (${COMPLEX_QUIZ_BANK.length} questions).`);
