/**
 * Several dictionary entries were written without stereochemistry, which draws
 * a flat structure and a row of "?" markers on the stereocentres.
 *
 * This pulls PubChem's isomeric SMILES for those names and adopts it, but only
 * when the skeleton matches what the dictionary already had — the first block
 * of an InChIKey encodes constitution alone, so comparing it proves the
 * upgrade adds configuration without quietly swapping the compound.
 *
 * Run with:
 *   node --experimental-strip-types --import ./scripts/loader.mjs \
 *     scripts/upgrade-stereochemistry.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";

import * as OCL from "openchemlib";

import { DICTIONARY } from "../src/lib/dictionary.ts";

const WRITE = process.argv.includes("--write");
const PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound";

const skeleton = (inchiKey) => inchiKey.split("-")[0];

/**
 * Entries with stereochemistry left unwritten: a stereocentre with no
 * configuration, or a double bond that could be cis or trans and says neither
 * (the depictor draws those crossed).
 */
function needsUpgrade(smiles) {
  const molecule = OCL.Molecule.fromSmiles(smiles);
  for (let atom = 0; atom < molecule.getAtoms(); atom++) {
    if (molecule.isAtomStereoCenter(atom) && molecule.isAtomConfigurationUnknown(atom)) return true;
  }
  for (let bond = 0; bond < molecule.getAllBonds(); bond++) {
    if (molecule.getBondType(bond) === OCL.Molecule.cBondTypeCross) return true;
  }
  return false;
}

async function pubchem(path, body) {
  const url = `${PUBCHEM}/${path}/property/SMILES,InChIKey,MolecularFormula/JSON`;
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/x-www-form-urlencoded" } : undefined,
    body,
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.PropertyTable?.Properties?.[0] ?? null;
}

const upgrades = [];
const skipped = [];

for (const [name, smiles] of Object.entries(DICTIONARY)) {
  if (!needsUpgrade(smiles)) continue;

  const ours = await pubchem("smiles", new URLSearchParams({ smiles }));
  const theirs = await pubchem(`name/${encodeURIComponent(name)}`);
  await new Promise((resolve) => setTimeout(resolve, 220)); // PubChem asks for <5 req/s

  if (!ours?.InChIKey || !theirs?.InChIKey || !theirs.SMILES) {
    skipped.push(`${name}: no PubChem match`);
    continue;
  }
  if (skeleton(ours.InChIKey) !== skeleton(theirs.InChIKey)) {
    skipped.push(`${name}: different skeleton (${ours.MolecularFormula} vs ${theirs.MolecularFormula})`);
    continue;
  }
  if (!/[@/\\]/.test(theirs.SMILES)) {
    skipped.push(`${name}: PubChem has no configuration either`);
    continue;
  }
  if (needsUpgrade(theirs.SMILES) && !needsUpgrade(smiles)) {
    skipped.push(`${name}: PubChem's record is less specific`);
    continue;
  }
  upgrades.push([name, smiles, theirs.SMILES]);
}

console.log(`${upgrades.length} entries can gain stereochemistry:\n`);
for (const [name, , next] of upgrades) console.log(`  ${name.padEnd(16)} ${next}`);
if (skipped.length) console.log(`\nleft alone:\n  ${skipped.join("\n  ")}`);

if (WRITE && upgrades.length) {
  const path = "src/lib/dictionary.ts";
  let source = readFileSync(path, "utf8");
  for (const [, before, after] of upgrades) {
    source = source.replaceAll(`"${before}"`, `"${after.replaceAll("\\", "\\\\")}"`);
  }
  writeFileSync(path, source);
  console.log(`\nwrote ${path}`);
}
