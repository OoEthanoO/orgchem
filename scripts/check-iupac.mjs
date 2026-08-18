/**
 * Checks the reference structures the IUPAC suite is written against.
 *
 * `test-iupac.mjs` asserts that a name comes back as a hand-written structure,
 * which settles whether the parser agrees with whoever wrote the reference —
 * not whether either of them is right. A reference with the wrong skeleton in
 * it is a test that passes while the app draws the wrong compound, and nothing
 * downstream would notice: the same hazard `check-dictionary.mjs` was written
 * for, one table over.
 *
 * So every name goes to OPSIN, which is the authority the app itself defers to
 * whenever it can be reached, and the structure it answers with is compared
 * against the reference. Where OPSIN reads a name differently by convention
 * rather than by disagreement — an unlocanted substituent it is willing to
 * place, a fragment name it answers as a whole molecule — the case is listed
 * as uncompared rather than counted against either side.
 *
 * Runs against the network, one name at a time:
 *   node --experimental-strip-types --import ./scripts/loader.mjs \
 *     scripts/check-iupac.mjs [name ...]
 */
import OCL from "openchemlib";
import { openValenceCount } from "../src/lib/depict.ts";
import { CASES } from "./iupac-cases.mjs";

const OPSIN = "https://www.ebi.ac.uk/opsin/ws";

/**
 * References OPSIN cannot be asked about, with the reason. Each is a name the
 * parser answers deliberately, not a structure in doubt.
 */
const DELIBERATE = {
  "n-butanol": "the n- OPSIN reads is a locant, and it refuses the name outright",
  "n-hexane": "the n- OPSIN reads is a locant, and it refuses the name outright",
};

const canonical = (smiles) => OCL.Molecule.fromSmiles(smiles).getIDCode();

async function opsin(name) {
  try {
    const response = await fetch(`${OPSIN}/${encodeURIComponent(name)}.json`, {
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.status === "SUCCESS" && data.smiles ? data.smiles : null;
  } catch {
    return null;
  }
}

const only = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));
const cases = CASES.filter(([name]) => !only.length || only.includes(name));

const mismatches = [];
const unchecked = [];
let checked = 0;

for (const [name, reference] of cases) {
  if (DELIBERATE[name]) {
    console.log(`  (skipping ${name}: ${DELIBERATE[name]})`);
    continue;
  }

  const answer = await opsin(name);
  await new Promise((resolve) => setTimeout(resolve, 120));

  if (!answer) {
    unchecked.push(`${name}: OPSIN does not read this name`);
    continue;
  }

  // A fragment name is a whole molecule to OPSIN, which fills the spare
  // valence with hydrogen, so the two cannot be compared atom for atom.
  if (openValenceCount(reference) > 0) {
    unchecked.push(`${name}: names a fragment, which OPSIN answers as a molecule`);
    continue;
  }

  checked++;
  if (canonical(answer) === canonical(reference)) continue;
  mismatches.push({ name, reference, answer });
}

console.log(`\nchecked ${checked} of ${cases.length} references`);
if (unchecked.length) {
  console.log(`${unchecked.length} could not be compared:`);
  for (const line of unchecked) console.log(`  ${line}`);
}

if (mismatches.length === 0) {
  console.log("\nevery reference is the structure OPSIN reads the name as");
} else {
  console.log(`\n${mismatches.length} disagree:\n`);
  for (const m of mismatches) {
    console.log(`  ${m.name}`);
    console.log(`    reference  ${m.reference}`);
    console.log(`    OPSIN      ${m.answer}`);
  }
  // Nothing is rewritten. Which of the two is wrong is a judgement — the
  // reference may be stating something OPSIN reads by a convention this parser
  // deliberately does not — and a script that guessed would be how a wrong
  // structure got in.
  process.exit(1);
}
