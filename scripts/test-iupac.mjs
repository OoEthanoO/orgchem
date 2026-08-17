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

// toSmiles() is not canonical; the ID code is.
const canonical = (smiles) => OCL.Molecule.fromSmiles(smiles).getIDCode();

const CASES = [
  ["methane", "C"],
  ["butane", "CCCC"],
  ["cyclohexane", "C1CCCCC1"],
  ["cyclopentane", "C1CCCC1"],
  ["2-methylbutane", "CCC(C)C"],
  ["2,3-dimethylbutane", "CC(C)C(C)C"],
  ["2,2-dimethylpropane", "CC(C)(C)C"],
  ["4-ethyl-2-methylhexane", "CCC(CC)CC(C)C"],
  ["but-2-ene", "CC=CC"],
  ["but-1-ene", "C=CCC"],
  ["buta-1,3-diene", "C=CC=C"],
  ["hexa-2,4-diene", "CC=CC=CC"],
  ["but-2-yne", "CC#CC"],
  ["cyclohexene", "C1=CCCCC1"],
  ["hexan-1-ol", "OCCCCCC"],
  ["butan-2-ol", "CC(O)CC"],
  ["2-methylbutan-1-ol", "OCC(C)CC"],
  ["ethane-1,2-diol", "OCCO"],
  ["propane-1,2,3-triol", "OCC(O)CO"],
  ["propan-2-one", "CC(C)=O"],
  ["butanal", "CCCC=O"],
  ["ethanoic acid", "CC(=O)O"],
  ["butanoic acid", "CCCC(=O)O"],
  ["hexanedioic acid", "OC(=O)CCCCC(=O)O"],
  ["ethanamine", "CCN"],
  ["ethanamide", "CC(N)=O"],
  ["ethanethiol", "CCS"],
  ["methyl butanoate", "CCCC(=O)OC"],
  ["ethyl ethanoate", "CC(=O)OCC"],
  ["pentan-1-yl", "[CH2]CCCC"],
  ["pentyl", "[CH2]CCCC"],
  ["methyl", "[CH3]"],
  ["propan-2-yl", "C[CH]C"],
  ["benzene", "c1ccccc1"],
  ["nitrobenzene", "[O-][N+](=O)c1ccccc1"],
  ["1,2-dimethylbenzene", "Cc1ccccc1C"],
  ["phenol", "Oc1ccccc1"],
  ["4-chlorophenol", "Oc1ccc(Cl)cc1"],
  ["aniline", "Nc1ccccc1"],
  ["2-chlorobutane", "CC(Cl)CC"],
  ["1,2-dichloroethane", "ClCCCl"],
  ["3-methylhexan-2-one", "CCCC(C)C(C)=O"],
  ["2-hydroxypropanoic acid", "CC(O)C(=O)O"],
  ["1-phenylethanol", "CC(O)c1ccccc1"],
  ["trichloromethane", "ClC(Cl)Cl"],
  ["octadecanoic acid", "CCCCCCCCCCCCCCCCCC(=O)O"],
  ["cyclohexanol", "OC1CCCCC1"],
  ["2-methylprop-1-ene", "CC(C)=C"],
];

// Names the parser must refuse rather than answer by guessing. Placing an
// unlocanted substituent at position 1 would build a different compound.
const REJECT = [
  "methylpropene",
  "methylpropane",
  "chloropropane",
  "ethylhexane",
];

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
