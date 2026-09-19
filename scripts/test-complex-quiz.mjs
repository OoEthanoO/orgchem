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

check(COMPLEX_QUIZ_BANK.length >= 90, "Expanded practice bank size");
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
  const traditionalName = entry.name
    .replaceAll("chlorido", "chloro").replaceAll("cyanido", "cyano")
    .replaceAll("bromido", "bromo").replaceAll("fluorido", "fluoro")
    .replaceAll("iodido", "iodo").replaceAll("hydroxido", "hydroxo");
  check(checkComplexAnswer(id, traditionalName).correct, `${entry.name}: traditional aliases accepted`);
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

// Expected compositions are transcribed/derived from independent references,
// not computed using the parser under test. Each appended entry is covered.
// See complex-practice-references.md for the source keys in the last column.
// Columns: name, formula, metal oxidation state, entity charge, donor count, source.
const addedFixtures = [
  ["hexaaquazinc(II)", "[Zn(H2O)6]^2+", 2, 2, 6, "Zn-aqua"],
  ["hexaaquamanganese(II)", "[Mn(H2O)6]^2+", 2, 2, 6, "Mn-aqua"],
  ["tetraamminezinc(II)", "[Zn(NH3)4]^2+", 2, 2, 4, "Zn-ammine"],
  ["tetraammineplatinum(II)", "[Pt(NH3)4]^2+", 2, 2, 4, "Pt-Pd-ammine"],
  ["tetraamminepalladium(II)", "[Pd(NH3)4]^2+", 2, 2, 4, "Pt-Pd-ammine"],
  ["hexaammineruthenium(III)", "[Ru(NH3)6]^3+", 3, 3, 6, "Ag-Au-cyanide"],
  ["hexaammineruthenium(II)", "[Ru(NH3)6]^2+", 2, 2, 6, "Co-Ru-redox"],
  ["tetracarbonylnickel(0)", "[Ni(CO)4]", 0, 0, 4, "Ni-carbonyl"],
  ["pentacarbonyliron(0)", "[Fe(CO)5]", 0, 0, 5, "Fe-carbonyl"],
  ["hexacarbonylchromium(0)", "[Cr(CO)6]", 0, 0, 6, "Cr-carbonyl"],
  ["hexacarbonylmolybdenum(0)", "[Mo(CO)6]", 0, 0, 6, "Mo-carbonyl"],
  ["hexacarbonyltungsten(0)", "[W(CO)6]", 0, 0, 6, "W-carbonyl"],
  ["dicyanidoargentate(I)", "[Ag(CN)2]^-", 1, -1, 2, "Ag-Au-cyanide"],
  ["dicyanidoaurate(I)", "[Au(CN)2]^-", 1, -1, 2, "Ag-Au-cyanide"],
  ["tetracyanidocuprate(I)", "[Cu(CN)4]^3-", 1, -3, 4, "Cu-en-cyanide"],
  ["hexacyanidocobaltate(III)", "[Co(CN)6]^3-", 3, -3, 6, "Co-cyanide"],
  ["tetrachloridoaurate(III)", "[AuCl4]^-", 3, -1, 4, "Au-chloride"],
  ["tetrachloridopalladate(II)", "[PdCl4]^2-", 2, -2, 4, "Pd-chloride"],
  ["tetrachloridoplatinate(II)", "[PtCl4]^2-", 2, -2, 4, "Pt-chloride"],
  ["hexachloridoiridate(III)", "[IrCl6]^3-", 3, -3, 6, "Ir-chloride"],
  ["hexachloridoiridate(IV)", "[IrCl6]^2-", 4, -2, 6, "Ir-chloride"],
  ["tetrahydroxidozincate(II)", "[Zn(OH)4]^2-", 2, -2, 4, "Zn-hydroxide"],
  ["tetrabromidocobaltate(II)", "[CoBr4]^2-", 2, -2, 4, "Co-bromide"],
  ["tetracarbonylcobaltate(-I)", "[Co(CO)4]^-", -1, -1, 4, "Co-carbonyl"],
  ["tetracarbonylferrate(-II)", "[Fe(CO)4]^2-", -2, -2, 4, "Fe-carbonyl-anion"],
  ["potassium dicyanidoargentate(I)", "K[Ag(CN)2]", 1, -1, 2, "Ag-Au-cyanide"],
  ["potassium dicyanidoaurate(I)", "K[Au(CN)2]", 1, -1, 2, "Ag-Au-cyanide"],
  ["potassium hexacyanidocobaltate(III)", "K3[Co(CN)6]", 3, -3, 6, "Co-cyanide"],
  ["potassium tetrachloridoaurate(III)", "K[AuCl4]", 3, -1, 4, "Au-chloride"],
  ["sodium hexachloridoiridate(IV)", "Na2[IrCl6]", 4, -2, 6, "Ir-chloride"],
  ["potassium hexachloridoiridate(IV)", "K2[IrCl6]", 4, -2, 6, "K-Ir-chloride"],
  ["tetraammineplatinum(II) chloride", "[Pt(NH3)4]Cl2", 2, 2, 4, "Pt-Pd-ammine"],
  ["hexaamminechromium(III) nitrate", "[Cr(NH3)6](NO3)3", 3, 3, 6, "Ag-Au-cyanide"],
  ["sodium tetracarbonylcobaltate(-I)", "Na[Co(CO)4]", -1, -1, 4, "Co-carbonyl"],
  ["sodium tetracarbonylferrate(-II)", "Na2[Fe(CO)4]", -2, -2, 4, "Fe-carbonyl-anion"],
  ["pentaamminefluoridocobalt(III)", "[Co(NH3)5F]^2+", 3, 2, 6, "Co-Ru-redox"],
  ["pentaamminebromidocobalt(III)", "[Co(NH3)5Br]^2+", 3, 2, 6, "Co-Ru-redox"],
  ["pentaammineiodidocobalt(III)", "[Co(NH3)5I]^2+", 3, 2, 6, "Co-Ru-redox"],
  ["pentaammineaquaruthenium(II)", "[Ru(NH3)5(H2O)]^2+", 2, 2, 6, "Co-Ru-redox"],
  ["pentaamminehydroxidocobalt(III)", "[Co(NH3)5(OH)]^2+", 3, 2, 6, "Co-hydroxide"],
  ["pentaamminechloridorhodium(III)", "[Rh(NH3)5Cl]^2+", 3, 2, 6, "Rh-Co-aquation"],
  ["tris(ethane-1,2-diamine)ruthenium(II)", "[Ru(en)3]^2+", 2, 2, 6, "Co-Ru-redox"],
  ["dichloridobis(ethane-1,2-diamine)cobalt(III)", "[CoCl2(en)2]^+", 3, 1, 6, "Rh-Co-aquation"],
  ["tris(ethane-1,2-diamine)chromium(III)", "[Cr(en)3]^3+", 3, 3, 6, "Cr-en"],
  ["tris(ethane-1,2-diamine)zinc(II)", "[Zn(en)3]^2+", 2, 2, 6, "Zn-en"],
  ["tris(ethane-1,2-diamine)copper(II)", "[Cu(en)3]^2+", 2, 2, 6, "Zn-Cu-en-sulfate"],
  ["diaquabis(ethane-1,2-diamine)nickel(II)", "[Ni(H2O)2(en)2]^2+", 2, 2, 6, "Ni-en-aqua"],
  ["dichlorido(ethane-1,2-diamine)platinum(II)", "[PtCl2(en)]", 2, 0, 4, "Pt-en-chloride"],
  ["bis(ethane-1,2-diamine)platinum(II)", "[Pt(en)2]^2+", 2, 2, 4, "Pt-en"],
  ["diaquadioxalatochromate(III)", "[Cr(H2O)2(C2O4)2]^-", 3, -1, 6, "Cr-aqua-oxalate"],
  ["diaquadioxalatocobaltate(II)", "[Co(H2O)2(C2O4)2]^2-", 2, -2, 6, "Co-aqua-oxalate"],
  ["trioxalatocobaltate(III)", "[Co(C2O4)3]^3-", 3, -3, 6, "Co-oxalate"],
  ["dichloridobis(ethane-1,2-diamine)cobalt(III) chloride", "[CoCl2(en)2]Cl", 3, 1, 6, "Co-en-chloride"],
  ["dichloridobis(ethane-1,2-diamine)cobalt(III) perchlorate", "[CoCl2(en)2]ClO4", 3, 1, 6, "Co-en-perchlorate"],
  ["tris(ethane-1,2-diamine)zinc(II) sulfate", "[Zn(en)3]SO4", 2, 2, 6, "Zn-Cu-en-sulfate"],
  ["tris(ethane-1,2-diamine)copper(II) sulfate", "[Cu(en)3]SO4", 2, 2, 6, "Zn-Cu-en-sulfate"],
  ["tris(ethane-1,2-diamine)nickel(II) sulfate", "[Ni(en)3]SO4", 2, 2, 6, "Ni-en-sulfate"],
  ["potassium diaquadioxalatochromate(III)", "K[Cr(H2O)2(C2O4)2]", 3, -1, 6, "Cr-aqua-oxalate"],
  ["potassium trioxalatocobaltate(III)", "K3[Co(C2O4)3]", 3, -3, 6, "Co-oxalate"],
];
check(addedFixtures.length === COMPLEX_QUIZ_BANK.length - 38, "Independent fixture for every appended entry");
for (const [index, [name, formula, oxidationState, charge, coordinationNumber, source]] of addedFixtures.entries()) {
  check(COMPLEX_QUIZ_BANK[index + 38].name === name, `${name}: append-only ID ${index + 38}`);
  const complex = parseComplex(name);
  check(complex.formula === formula, `${name}: independent formula from ${source}, expected ${formula}, got ${complex.formula}`);
  check(complex.oxidationState === oxidationState, `${name}: independently checked oxidation state`);
  check(complex.charge === charge, `${name}: independently checked complex charge`);
  check(complex.coordinationNumber === coordinationNumber, `${name}: independently checked donor count`);
}
check(countComplexQuestions("chelates", "medium") >= 5, "Medium chelates are available");
check(countComplexQuestions("salts", "medium") >= 5, "Medium salts are available");
check(!checkComplexAnswer(nameId("tetracarbonylcobaltate(-I)"), "tetracarbonylcobalt(I)").correct, "Negative oxidation state cannot be replaced by positive");
check(!checkComplexAnswer(nameId("tetracarbonylnickel(0)"), "tetracarbonylnickel(II)").correct, "Zero oxidation state cannot be replaced by positive");
check(questionFor(nameId("tetracarbonylnickel(0)")).hints.some((hint) => hint.includes("Write 0 for zero")), "Hints explain zero oxidation state");
check(questionFor(nameId("tetracarbonylcobaltate(-I)")).hints.some((hint) => hint.includes("minus sign")), "Hints explain negative oxidation states");

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

const selectedTopics = Object.freeze(["chelates", "salts"]);
for (const difficulty of [null, ...COMPLEX_DIFFICULTIES]) {
  const expected = selectedTopics.reduce((sum, category) => sum + countComplexQuestions(category, difficulty), 0);
  check(countComplexQuestions(selectedTopics, difficulty) === expected, `Multiple topics count their union at ${difficulty ?? "any"} level`);
  check(countComplexQuestions(["salts", "chelates", "salts"], difficulty) === expected, `Repeated topics are counted once at ${difficulty ?? "any"} level`);
  check(countComplexQuestions([], difficulty) === countComplexQuestions(null, difficulty), `Empty topic array means all at ${difficulty ?? "any"} level`);
  for (const category of selectedTopics) {
    const target = COMPLEX_QUIZ_BANK.findIndex((entry) => entry.category === category && (!difficulty || entry.difficulty === difficulty));
    if (target < 0) continue;
    for (const mode of ["name", "structure"]) {
      const question = pickComplexQuestion(mode, selectedTopics, difficulty, ids.filter((id) => id !== target));
      check(question?.id === target, `${mode}: unseen ${category} question survives combined history at ${difficulty ?? "any"} level`);
    }
  }
}
const unionReset = pickComplexQuestion("name", selectedTopics, "medium", ids);
check(unionReset && selectedTopics.includes(unionReset.category) && unionReset.difficulty === "medium", "Exhausted union resets within the selected topics and level");
check(countComplexQuestions(["unknown"], null) === 0 && pickComplexQuestion("name", ["unknown"], null) === null, "Unknown topic array has no questions");
check(pickComplexQuestion("name", selectedTopics, "easy") === null, "Empty union/difficulty selection returns no question");

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
for (const query of ["?mode=other", "?category=other", "?category=salts&category=other", "?category=other&category=salts", "?difficulty=other", "?seen=1,nope", "?seen=-1"]) {
  check(get(query).status === 400, `Bad query rejected ${query}`);
}
check(get("?category=chelates&difficulty=easy").status === 404, "Empty filter has explicit 404");
check(get("?category=chelates&category=salts&difficulty=easy").status === 404, "Empty topic union has explicit 404");
const secondTopicTarget = COMPLEX_QUIZ_BANK.findIndex((entry) => entry.category === "salts" && entry.difficulty === "medium");
const unseenSecondTopic = ids.filter((id) => id !== secondTopicTarget).join(",");
for (const mode of ["name", "structure"]) {
  const unionResponse = get(`?mode=${mode}&category=chelates&category=salts&category=chelates&difficulty=medium&seen=${unseenSecondTopic}`);
  const question = await unionResponse.json();
  check(unionResponse.status === 200 && question.id === secondTopicTarget && question.difficulty === "medium", `${mode}: endpoint reads every selected topic and combined history`);
}
const emptyTopics = get(`?category=&category=&seen=${unseenSecondTopic}`);
check(emptyTopics.status === 200 && (await emptyTopics.json()).id === secondTopicTarget, "Empty API topic values preserve all-topic selection");

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
