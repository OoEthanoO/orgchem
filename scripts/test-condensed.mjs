/**
 * Checks the condensed-formula parser by comparing the canonical SMILES it
 * produces against the canonical SMILES of a hand-written reference structure.
 * Run with: node --experimental-strip-types scripts/test-condensed.mjs
 */
import OCL from "openchemlib";
import { parseCondensed } from "../src/lib/condensed.ts";
import { normalizeInput } from "../src/lib/normalize.ts";

// toSmiles() is not canonical; the ID code is.
const canonical = (smiles) => OCL.Molecule.fromSmiles(smiles).getIDCode();

// [input, reference SMILES, expected open valences]
const CASES = [
  ["CH4", "C", 0],
  ["CH3CH3", "CC", 0],
  ["CH3CH2CH2CH2CH2-", "[CH2]CCCC", 1],
  ["CH₃CH₂CH₂CH₂CH₂–", "[CH2]CCCC", 1],
  ["CH3CH2CH2CH2CH2", "[CH2]CCCC", 1],
  ["CH3-", "[CH3]", 1],
  ["CH3CH2OH", "CCO", 0],
  ["HOCH2CH2OH", "OCCO", 0],
  ["CH3OCH3", "COC", 0],
  ["CH3(CH2)3CH3", "CCCCC", 0],
  ["HO(CH2)6OH", "OCCCCCCO", 0],
  ["CH3CH(CH3)CH3", "CC(C)C", 0],
  ["(CH3)3COH", "CC(C)(C)O", 0],
  ["(CH3)2CHCH2OH", "CC(C)CO", 0],
  ["(CH3)2CHCH2CH(CH3)2", "CC(C)CC(C)C", 0],
  ["(CH3)2CHCH2CH2CH(CH3)2", "CC(C)CCC(C)C", 0],
  ["CH3COOH", "CC(=O)O", 0],
  ["HOOCCH2COOH", "OC(=O)CC(=O)O", 0],
  ["CH3COOCH3", "CC(=O)OC", 0],
  ["CH3CHO", "CC=O", 0],
  ["CH3COCH3", "CC(C)=O", 0],
  ["CH3CH=CHCH3", "CC=CC", 0],
  ["CH2=CH2", "C=C", 0],
  ["CH3C#CH", "CC#C", 0],
  ["CH3CH2NH2", "CCN", 0],
  ["CH3CONH2", "CC(N)=O", 0],
  ["CH2Cl2", "ClCCl", 0],
  ["CCl4", "ClC(Cl)(Cl)Cl", 0],
  ["CH3(CH2)16COOH", "CCCCCCCCCCCCCCCCCC(=O)O", 0],
  ["C2H5OH", "CCO", 0],
  ["CH3CH2CH2COOH", "CCCC(=O)O", 0],
  ["PhCH2COOH", "OC(=O)Cc1ccccc1", 0],
  ["PhOH", "Oc1ccccc1", 0],
  ["CH3C6H5", "Cc1ccccc1", 0],
  ["CH3NO2", "C[N+](=O)[O-]", 0],
  ["CH3CH2CN", "CCC#N", 0],
  ["CF3COOH", "OC(=O)C(F)(F)F", 0],
  ["(CH3)2C=CH2", "CC(C)=C", 0],
  ["CH3CH2CH2CH3", "CCCC", 0],
  ["EtOH", "CCO", 0],
  ["CH3SO3H", "CS(=O)(=O)O", 0],
  ["-CH2CH2-", "[CH2][CH2]", 2],
  ["CH3CH2COCl", "CCC(Cl)=O", 0],
  ["H2NCH2COOH", "NCC(=O)O", 0],
  ["(CH3)3N", "CN(C)C", 0],
  ["CH3CHOHCH3", "CC(C)O", 0],
  ["EtOH", "CCO", 0],
  ["tBuOH", "CC(C)(C)O", 0],
  ["iPrOH", "CC(C)O", 0],
  ["MeOH", "CO", 0],
  ["AcOH", "CC(=O)O", 0],
  ["PhOMe", "COc1ccccc1", 0],
  ["BnBr", "BrCc1ccccc1", 0],
  ["CH3CHClCH3", "CC(Cl)C", 0],
  ["CH3CHOHCH2OH", "CC(O)CO", 0],
  ["CH3NHCH3", "CNC", 0],
  ["CH3CH2OCH2CH3", "CCOCC", 0],
  ["O2NC6H4CH3", "Cc1ccc(cc1)[N+](=O)[O-]", 0],
  ["CH3CONHCH3", "CC(=O)NC", 0],
  ["(CH3)2CHOH", "CC(C)O", 0],
  ["CH3(CH2)2CH(CH3)2", "CCCC(C)C", 0],
  // A hydrogen written in front of a group belongs to that group.
  ["HCOOH", "OC=O", 0],
  ["HCHO", "C=O", 0],
  ["HCOOCH3", "COC=O", 0],
  ["HCONH2", "NC=O", 0],
  ["HCOCH3", "CC=O", 0],
  ["HCOCl", "ClC=O", 0],
  ["HCN", "C#N", 0],
  // Groups written before the atom they hang off, more than one atom each.
  ["(CH3CH2)2NH", "CCNCC", 0],
  ["(CH3CH2)3N", "CCN(CC)CC", 0],
  ["(C2H5)2O", "CCOCC", 0],
  ["(CH3CH2CH2)2NH", "CCCNCCC", 0],
  ["(CH3O)2CH2", "COCOC", 0],
  // A repeat unit has the next copy after it, so a monovalent group at its end
  // hangs off it rather than ending the chain.
  ["HOCH2(CHOH)4CHO", "OCC(O)C(O)C(O)C(O)C=O", 0],
  ["CH3(CHCH3)CH3", "CC(C)C", 0],
  // A charge written at the end, against the open valence a dash otherwise
  // marks: the O of CH3COO- has no room for another hydrogen, the CH2 of
  // CH3CH2CH2CH2CH2- does.
  ["CH3COO-", "CC(=O)[O-]", 0],
  ["CH3O-", "C[O-]", 0],
  ["CH3NH3+", "C[NH3+]", 0],
  ["CH3CH2NH3+", "CC[NH3+]", 0],
  ["(CH3)4N+", "C[N+](C)(C)C", 0],
  // Sulfur written past its usual valence.
  ["CH3SOCH3", "CS(C)=O", 0],
  ["(CH3)2SO", "CS(C)=O", 0],
  ["CH3SO2CH3", "CS(C)(=O)=O", 0],
  ["CH3SOH", "CSO", 0],
];

// Strings that must NOT parse, so they fall through to the name resolvers.
const REJECT = [
  "benzene",
  "2-methylbutan-1-ol",
  "aspirin",
  "c1ccccc1",
  "propan-2-one",
  "H2SO4",
  "sodium chloride",
];

let pass = 0;
const failures = [];

for (const [input, reference, openValences] of CASES) {
  try {
    const got = parseCondensed(normalizeInput(input));
    const a = canonical(got.smiles);
    const b = canonical(reference);
    if (a !== b) {
      failures.push(`${input}\n    got ${got.smiles} (${a})\n    want ${reference} (${b})`);
    } else if (got.openValences !== openValences) {
      failures.push(`${input}: open valences ${got.openValences}, want ${openValences}`);
    } else {
      pass++;
    }
  } catch (e) {
    failures.push(`${input}: threw ${e.message}`);
  }
}

for (const input of REJECT) {
  try {
    const got = parseCondensed(normalizeInput(input));
    failures.push(`${input}: should have been rejected, got ${got.smiles}`);
  } catch {
    pass++;
  }
}

console.log(`${pass}/${CASES.length + REJECT.length} passed`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
