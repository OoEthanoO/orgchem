/**
 * Builds the naming-practice question bank.
 *
 * A question needs a structure and the name that structure actually has, and
 * nothing here can name a structure — OPSIN only runs names to structures, and
 * writing a structure-to-name engine is a project in itself. So the name comes
 * from PubChem and is then checked by running it back through OPSIN: if
 * OPSIN's structure for the name is the structure we started from, two
 * independent systems agree and the pair is safe to ask someone about.
 * Anything that fails that round trip is dropped rather than guessed at.
 *
 * Run with:
 *   node --experimental-strip-types --import ./scripts/loader.mjs \
 *     scripts/build-quiz-bank.mjs
 */
import { writeFileSync } from "node:fs";

import * as OCL from "openchemlib";

import { difficultyOf } from "./quiz-difficulty.mjs";

const PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound";
const OPSIN = "https://www.ebi.ac.uk/opsin/ws";
const PAUSE_MS = 210;

const chain = (n) => "C".repeat(n);

/** Insert a substituent branch at a 1-based position on a carbon chain. */
function substituted(n, positions) {
  let out = "";
  for (let index = 1; index <= n; index++) {
    out += "C";
    for (const [at, group] of positions) if (at === index) out += `(${group})`;
  }
  return out;
}

/** Candidate structures, grouped the way a course groups them. */
function candidates() {
  const out = [];
  const add = (category, smiles) => out.push({ category, smiles });

  // --- alkanes and cycloalkanes -------------------------------------------
  for (let n = 4; n <= 8; n++) add("alkanes", chain(n));
  for (let n = 5; n <= 8; n++) {
    for (let at = 2; at <= Math.ceil(n / 2); at++) {
      add("alkanes", substituted(n, [[at, "C"]]));
      add("alkanes", substituted(n, [[at, "CC"]]));
    }
  }
  for (let n = 5; n <= 7; n++) {
    for (let a = 2; a <= n - 1; a++) {
      for (let b = a; b <= n - 1; b++) add("alkanes", substituted(n, [[a, "C"], [b, "C"]]));
    }
  }
  for (const ring of ["C1CCC1", "C1CCCC1", "C1CCCCC1", "C1CCCCCC1"]) add("alkanes", ring);
  add("alkanes", "CC1CCCCC1");
  add("alkanes", "CCC1CCCCC1");
  add("alkanes", "CC1CCCCC1C");
  add("alkanes", "CC1CCC(C)CC1");
  add("alkanes", "CC1CCCC(C)C1");

  // --- alkenes and alkynes -------------------------------------------------
  for (let n = 4; n <= 7; n++) {
    for (let at = 1; at < n; at++) {
      add("unsaturated", chain(at - 1) + "C=C" + chain(n - at - 1));
      add("unsaturated", chain(at - 1) + "C#C" + chain(n - at - 1));
    }
  }
  add("unsaturated", "CC(C)=C");
  add("unsaturated", "CC(C)=CC");
  add("unsaturated", "C=CC=C");
  add("unsaturated", "CC=CC=C");
  add("unsaturated", "C=CCC=C");
  add("unsaturated", "C1=CCCCC1");
  add("unsaturated", "CC1=CCCCC1");
  add("unsaturated", "C/C=C/C");
  add("unsaturated", "C/C=C\\C");
  add("unsaturated", "C/C=C/CC");
  add("unsaturated", "CC/C=C\\CC");

  // --- haloalkanes ---------------------------------------------------------
  for (const halogen of ["Cl", "Br", "I", "F"]) {
    for (let n = 3; n <= 6; n++) {
      for (let at = 1; at <= Math.ceil(n / 2); at++) {
        add("halides", substituted(n, [[at, halogen]]));
      }
    }
  }
  add("halides", "ClCCCl");
  add("halides", "ClCC(Cl)C");
  add("halides", "ClC(Cl)(Cl)C");
  add("halides", "CC(C)(Cl)C");
  add("halides", "BrCC(C)C");
  add("halides", "CC(Br)C(C)C");
  add("halides", "ClCCCCBr");

  // --- alcohols and ethers -------------------------------------------------
  for (let n = 3; n <= 7; n++) {
    for (let at = 1; at <= Math.ceil(n / 2); at++) add("alcohols", substituted(n, [[at, "O"]]));
  }
  add("alcohols", "CC(C)(C)O");
  add("alcohols", "CC(C)CO");
  add("alcohols", "OCC(C)CC");
  add("alcohols", "OCCO");
  add("alcohols", "OCCCO");
  add("alcohols", "CC(O)CO");
  add("alcohols", "OCC(O)CO");
  add("alcohols", "OC1CCCCC1");
  add("alcohols", "CC1CCCCC1O");
  add("alcohols", "COC");
  add("alcohols", "CCOCC");
  add("alcohols", "COCC");
  add("alcohols", "CCCOC");
  add("alcohols", "COC(C)C");
  add("alcohols", "CCOC(C)(C)C");

  // --- aldehydes and ketones ----------------------------------------------
  for (let n = 3; n <= 7; n++) add("carbonyls", chain(n - 1) + "C=O");
  for (let n = 4; n <= 7; n++) {
    for (let at = 2; at <= Math.ceil(n / 2); at++) {
      add("carbonyls", substituted(n, [[at, "=O"]]));
    }
  }
  add("carbonyls", "CC(C)C=O");
  add("carbonyls", "CC(C)CC=O");
  add("carbonyls", "CC(C)C(C)=O");
  add("carbonyls", "O=C1CCCCC1");
  add("carbonyls", "O=C1CCCC1");
  add("carbonyls", "CC(=O)CC(C)=O");
  add("carbonyls", "O=CCC=O");

  // --- acids, esters and amides -------------------------------------------
  for (let n = 2; n <= 7; n++) add("acids", chain(n - 1) + "C(=O)O");
  add("acids", "CC(C)C(=O)O");
  add("acids", "CC(C)CC(=O)O");
  add("acids", "CC(C(=O)O)CC");
  add("acids", "OC(=O)CC(=O)O");
  add("acids", "OC(=O)CCC(=O)O");
  add("acids", "OC(=O)CCCC(=O)O");
  for (const alkyl of ["C", "CC", "CCC"]) {
    for (let n = 1; n <= 4; n++) add("acids", `${chain(n)}(=O)O${alkyl}`.replace(/^C\(/, "C("));
  }
  add("acids", "CC(=O)OC");
  add("acids", "CC(=O)OCC");
  add("acids", "CCC(=O)OC");
  add("acids", "CCCC(=O)OCC");
  add("acids", "CC(=O)N");
  add("acids", "CCC(=O)N");
  add("acids", "CC(=O)NC");
  add("acids", "CC(=O)Cl");
  add("acids", "CCC(=O)Cl");

  // --- nitrogen ------------------------------------------------------------
  for (let n = 1; n <= 5; n++) add("amines", chain(n) + "N");
  add("amines", "CC(N)C");
  add("amines", "CCC(N)C");
  add("amines", "CNC");
  add("amines", "CN(C)C");
  add("amines", "CCNCC");
  add("amines", "NCCN");
  add("amines", "NCCCN");
  for (let n = 2; n <= 5; n++) add("amines", chain(n - 1) + "C#N");
  add("amines", "CC(C)C#N");
  add("amines", "C[N+](=O)[O-]");
  add("amines", "CC[N+](=O)[O-]");

  // --- aromatics -----------------------------------------------------------
  add("aromatics", "c1ccccc1");
  for (const group of ["C", "CC", "CCC", "Cl", "Br", "O", "N", "C=O", "C(=O)O", "[N+](=O)[O-]"]) {
    add("aromatics", `c1ccccc1${group.startsWith("[") ? group : group}`);
  }
  for (const pattern of ["c1ccccc1", "Cc1ccccc1C", "Cc1cccc(C)c1", "Cc1ccc(C)cc1"]) {
    add("aromatics", pattern);
  }
  add("aromatics", "Clc1ccc(Cl)cc1");
  add("aromatics", "Clc1cccc(Cl)c1");
  add("aromatics", "Oc1ccc(C)cc1");
  add("aromatics", "Nc1ccc(Cl)cc1");
  add("aromatics", "Cc1ccc(C=O)cc1");
  add("aromatics", "OC(=O)c1ccc(C)cc1");
  add("aromatics", "c1ccc2ccccc2c1");
  add("aromatics", "C=Cc1ccccc1");
  add("aromatics", "CCc1ccccc1");

  // --- deliberately harder cases -------------------------------------------
  // Every topic needs something at each level, so these are chosen to score
  // high: several branches, two locants to place, or stereochemistry on top.
  for (const smiles of ["CC/C=C/C(C)C", "CC(C)/C=C/CC", "C/C=C/C=C/C", "CCC(C)C=CC", "CC1=CC(C)CCC1", "CC(C)C=C(C)C"]) {
    add("unsaturated", smiles);
  }
  for (const smiles of ["CC(C)CC(=O)C(C)C", "CCC(C)C(=O)C(C)C", "CC(C)CC(C)C=O", "O=C1CC(C)CCC1", "CC1CCCCC1=O", "CC(C)CC(=O)CC"]) {
    add("carbonyls", smiles);
  }
  for (const smiles of ["CC(C)C(C)C(=O)O", "OC(=O)C(C)CC(C)C", "CCC(C)C(=O)OCC", "CC(C)CC(=O)OC(C)C", "CC(Cl)C(=O)O", "CC(C)C(C)C(=O)OC"]) {
    add("acids", smiles);
  }
  for (const smiles of ["CC(C)CC(C)CN", "CCC(C)C(C)N", "CC(C)CC(C)C#N", "CN(C)CC(C)C", "NCC(C)CC(C)N", "CC(C)C(C)C#N"]) {
    add("amines", smiles);
  }
  for (const smiles of ["Cc1ccc(cc1)C(C)C", "Cc1cc(C)cc(C)c1", "OC(=O)c1ccc(Cl)cc1", "Cc1ccc(cc1)[N+](=O)[O-]"]) {
    add("aromatics", smiles);
  }
  for (const smiles of ["CCC(C)C(C)CC", "CC(C)C(C)C(C)C", "CCC(CC)C(C)CC", "CC(C)CC(C)CC"]) {
    add("alkanes", smiles);
  }
  for (const smiles of ["CC(C)C(Cl)C(C)C", "ClC(C)C(C)CBr", "CC(C)CC(Cl)C", "BrC(C)C(C)CC"]) {
    add("halides", smiles);
  }
  for (const smiles of ["CC(C)C(O)C(C)C", "OCC(C)C(C)CC", "CC(C)CC(O)CC", "OC1CC(C)CCC1"]) {
    add("alcohols", smiles);
  }

  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with a deadline and a couple of retries.
 *
 * A single request that never returns its headers took down a whole run once,
 * losing twenty minutes of work at candidate 250 of 324. A build that talks to
 * two public services several hundred times has to expect one of them to stall.
 */
async function fetchJson(url, options = {}, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000) });
      if (response.status >= 500 && attempt < attempts) {
        await sleep(1000 * attempt);
        continue;
      }
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      if (attempt === attempts) {
        console.log(`    (giving up on ${url.slice(0, 60)}…: ${error.name})`);
        return null;
      }
      await sleep(1000 * attempt);
    }
  }
  return null;
}

async function iupacNameFor(smiles) {
  const data = await fetchJson(`${PUBCHEM}/smiles/property/IUPACName,Title/JSON`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ smiles }),
  });
  const row = data?.PropertyTable?.Properties?.[0];
  return row?.IUPACName ? { name: row.IUPACName, title: row.Title } : null;
}

async function opsinStructure(name) {
  const data = await fetchJson(`${OPSIN}/${encodeURIComponent(name)}.json`);
  return data?.status === "SUCCESS" && data.smiles ? data.smiles : null;
}

const idCode = (smiles) => OCL.Molecule.fromSmiles(smiles).getIDCode();

function flatKey(smiles) {
  const molecule = OCL.Molecule.fromSmiles(smiles);
  molecule.stripStereoInformation();
  return molecule.getIDCode();
}

const pool = candidates();
console.log(`${pool.length} candidate structures\n`);

const accepted = [];
const rejected = [];
const seen = new Set();

for (const [index, candidate] of pool.entries()) {
  try {
    await considerCandidate(index, candidate);
  } catch (error) {
    rejected.push(`${candidate.smiles}: ${error.message}`);
  }
}

async function considerCandidate(index, candidate) {
  let key;
  try {
    key = idCode(candidate.smiles);
  } catch {
    rejected.push(`${candidate.smiles}: unparsable`);
    return;
  }
  if (seen.has(key)) return;
  seen.add(key);

  const named = await iupacNameFor(candidate.smiles);
  await sleep(PAUSE_MS);
  if (!named) {
    rejected.push(`${candidate.smiles}: PubChem has no IUPAC name`);
    return;
  }

  const back = await opsinStructure(named.name);
  await sleep(PAUSE_MS);
  if (!back) {
    rejected.push(`${candidate.smiles}: OPSIN cannot read "${named.name}"`);
    return;
  }

  // The round trip has to land on the same structure. Stereochemistry is
  // compared too, but a name that merely omits it is still a fair question
  // when the structure has none to omit.
  let matches;
  try {
    matches = idCode(back) === key || (flatKey(back) === flatKey(candidate.smiles) && !/[@/\\]/.test(candidate.smiles));
  } catch {
    matches = false;
  }
  if (!matches) {
    rejected.push(`${candidate.smiles}: "${named.name}" round-trips to something else`);
    return;
  }

  accepted.push({
    category: candidate.category,
    smiles: candidate.smiles,
    // PubChem's name is already lower case apart from its stereodescriptors,
    // and those carry meaning: "(E)" is not "(e)".
    name: named.name,
    title: named.title ?? "",
    difficulty: difficultyOf(candidate.smiles, named.name),
  });

  if ((index + 1) % 25 === 0) {
    console.log(`  ${index + 1}/${pool.length} checked, ${accepted.length} accepted`);
  }
}

const byCategory = {};
const byDifficulty = { easy: 0, medium: 0, hard: 0 };
for (const question of accepted) {
  byCategory[question.category] = (byCategory[question.category] ?? 0) + 1;
  byDifficulty[question.difficulty]++;
}

console.log(`\naccepted ${accepted.length} of ${pool.length}`);
console.log("by category:", byCategory);
console.log("by difficulty:", byDifficulty);
console.log(`\nrejected ${rejected.length}:`);
for (const reason of rejected.slice(0, 40)) console.log(`  ${reason}`);

accepted.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

const file = `/**
 * Naming-practice questions.
 *
 * Generated by scripts/build-quiz-bank.mjs — do not edit by hand. Every entry
 * has been round-tripped: PubChem supplied the name, and OPSIN read that name
 * back to the structure it is paired with here.
 */

export interface BankQuestion {
  category: string;
  smiles: string;
  /** The IUPAC name, verified against the structure. */
  name: string;
  /** PubChem's common title, used for the "also known as" line. */
  title: string;
  difficulty: "easy" | "medium" | "hard";
}

export const QUIZ_BANK: BankQuestion[] = ${JSON.stringify(accepted, null, 2)};
`;

writeFileSync("src/lib/quiz-bank.ts", file);
console.log("\nwrote src/lib/quiz-bank.ts");
