/**
 * Which reading of an input wins.
 *
 * Several stages will accept the same string and hand back different
 * compounds, all of them drawable, so nothing downstream can notice that the
 * wrong one won — `CCO` is ethanol as SMILES and acetaldehyde read as a
 * condensed formula. The order in the cascade is what decides, and this is
 * where that decision is written down.
 *
 * Needs the dev server running: node scripts/test-resolution.mjs
 */
import OCL from "openchemlib";

const BASE = process.env.ORGCHEM_URL ?? "http://localhost:3000";

const canonical = (smiles) => OCL.Molecule.fromSmiles(smiles).getIDCode();

/** [query, which stage should win, the structure it should come back with] */
const CASES = [
  // Written without hydrogens: SMILES, whatever else it could be read as.
  ["CCO", "smiles", "CCO"],
  ["CC(C)C", "smiles", "CC(C)C"],
  ["CC(C)(C)C", "smiles", "CC(C)(C)C"],
  ["C1CCCCC1", "smiles", "C1CCCCC1"],
  ["CC(=O)O", "smiles", "CC(=O)O"],
  ["CN", "smiles", "CN"],
  ["CCN", "smiles", "CCN"],
  ["CC(=O)Oc1ccccc1C(=O)O", "smiles", "CC(=O)Oc1ccccc1C(=O)O"],
  ["C[C@@H](N)C(=O)O", "smiles", "C[C@@H](N)C(=O)O"],

  // Hydrogens written out: condensed notation, which is what they are for.
  ["CH3CH2OH", "condensed", "CCO"],
  ["CH3COOH", "condensed", "CC(=O)O"],
  ["CH3CH(CH3)CH3", "condensed", "CC(C)C"],
  ["HCOOH", "condensed", "OC=O"],
  ["(CH3CH2)2NH", "condensed", "CCNCC"],
  ["CH3CH2CH2CH2CH2-", "condensed", "[CH2]CCCC"],

  // Abbreviations are condensed notation too, and mean nothing in SMILES —
  // BnBr would be boron and an aromatic nitrogen.
  ["BnBr", "condensed", "BrCc1ccccc1"],
  ["PhOMe", "condensed", "COc1ccccc1"],
  ["tBuOH", "condensed", "CC(C)(C)O"],
  ["CCl4", "condensed", "ClC(Cl)(Cl)Cl"],

  // The dictionary comes first, so a name that is also a structure is a name.
  ["CO", "dictionary", "[C-]#[O+]"],
  ["aspirin", "dictionary", "CC(=O)Oc1ccccc1C(=O)O"],

  // Names, and formulas, which name a set rather than a structure.
  ["2-methylbutan-1-ol", "opsin", "CCC(C)CO"],
  ["C4H10O", "formula", null],

  // An explicit prefix settles it whatever the input looks like.
  ["smiles:CCO", "smiles", "CCO"],
  ["formula:C4H10O", "formula", null],
];

const failures = [];
let pass = 0;

for (const [query, source, structure] of CASES) {
  let body;
  try {
    const response = await fetch(`${BASE}/api/resolve?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(30000),
    });
    body = await response.json();
  } catch (error) {
    failures.push(`${query}: ${error.name}`);
    continue;
  }

  const wrong = [];
  if (body.source !== source) wrong.push(`read by ${body.source ?? "nothing"}, want ${source}`);
  if (structure !== null) {
    try {
      if (canonical(body.smiles) !== canonical(structure)) {
        wrong.push(`gave ${body.smiles}, want ${structure}`);
      }
    } catch {
      wrong.push(`gave ${JSON.stringify(body.smiles)}, which does not parse`);
    }
  }

  if (wrong.length) failures.push(`${query}: ${wrong.join("; ")}`);
  else pass++;
}

console.log(`${pass}/${CASES.length} read as intended`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
