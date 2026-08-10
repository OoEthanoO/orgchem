import OCL from "openchemlib";
import { DICTIONARY } from "../src/lib/dictionary.ts";
let bad = [];
for (const [name, smi] of Object.entries(DICTIONARY)) {
  try {
    const m = OCL.Molecule.fromSmiles(smi);
    const f = m.getMolecularFormula().formula;
    if (!f || m.getAllAtoms() === 0) bad.push(`${name}: empty (${smi})`);
  } catch (e) { bad.push(`${name}: ${e.message} (${smi})`); }
}
console.log(`${Object.keys(DICTIONARY).length - bad.length}/${Object.keys(DICTIONARY).length} ok`);
if (bad.length) { console.log(bad.join("\n")); process.exit(1); }
