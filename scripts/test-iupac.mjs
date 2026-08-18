/**
 * Checks the offline IUPAC parser against hand-written reference structures,
 * and then against the whole question bank — 283 names whose structures OPSIN
 * confirmed when the bank was built, which is a second opinion this parser
 * never sees at runtime: OPSIN gets the final say when it can be reached, so a
 * name the local parser reads differently only shows up when it cannot.
 *
 * Run with: node --experimental-strip-types scripts/test-iupac.mjs
 */
import OCL from "openchemlib";
import { parseIupacName } from "../src/lib/iupac.ts";
import { QUIZ_BANK } from "../src/lib/quiz-bank.ts";
import { normalizeInput } from "../src/lib/normalize.ts";
import { CASES, REJECT } from "./iupac-cases.mjs";

// toSmiles() is not canonical; the ID code is.
const canonical = (smiles) => OCL.Molecule.fromSmiles(smiles).getIDCode();

let pass = 0;
const failures = [];

for (const [name, reference] of CASES) {
  try {
    const got = parseIupacName(name);
    const a = canonical(got.smiles);
    const b = canonical(reference);
    if (a !== b) {
      failures.push(`${name}\n    got ${got.smiles} (${a})\n    want ${reference} (${b})`);
    } else pass++;
  } catch (e) {
    failures.push(`${name}: threw ${e.message}`);
  }
}

for (const name of REJECT) {
  try {
    const got = parseIupacName(name);
    failures.push(`${name}: should have been refused, got ${got.smiles}`);
  } catch {
    pass++;
  }
}

// Against the bank: the parser may refuse any of these names — it covers
// introductory nomenclature and defers to OPSIN for the rest — but a name it
// does answer has to come back as the structure the name was verified against.
// Stereochemistry is left out of the comparison, since the parser does not
// claim to read descriptors.
const flat = (smiles) => {
  const molecule = OCL.Molecule.fromSmiles(smiles);
  molecule.stripStereoInformation();
  return molecule.getIDCode();
};

let answered = 0;
const disagreements = [];
for (const entry of QUIZ_BANK) {
  let got;
  try {
    got = parseIupacName(normalizeInput(entry.name));
  } catch {
    continue;
  }
  answered++;
  try {
    if (flat(got.smiles) !== flat(entry.smiles)) {
      disagreements.push(`${entry.name}\n    got ${got.smiles}\n    want ${entry.smiles}`);
    }
  } catch (e) {
    disagreements.push(`${entry.name}: ${got.smiles} does not parse (${e.message})`);
  }
}

// A parser that suddenly refuses everything would agree with the bank
// vacuously, so the count it answers is part of what is being checked.
const FEWEST_ANSWERED = 240;
if (answered < FEWEST_ANSWERED) {
  failures.push(`the parser answered only ${answered} of the bank's ${QUIZ_BANK.length} names`);
} else pass++;

if (disagreements.length) failures.push(...disagreements);
else pass++;

console.log(
  `${pass}/${CASES.length + REJECT.length + 2} passed  (${answered} bank names answered, all agreeing)`,
);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
