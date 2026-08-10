/**
 * Finds dictionary entries whose stereochemistry disagrees with PubChem's
 * record for the same name.
 *
 * The upgrade script only fills in configuration that was left blank. This
 * catches the other failure: configuration that was written down and is
 * wrong — "alanine" drawn as the D isomer when the name means the L one.
 *
 * An InChIKey's first block encodes constitution and its second block encodes
 * stereochemistry, so a matching first block with a differing second block is
 * exactly this error and nothing else.
 *
 * Run with:
 *   node --experimental-strip-types --import ./scripts/loader.mjs \
 *     scripts/check-stereochemistry.mjs [--write]
 */
import { readFileSync, writeFileSync } from "node:fs";

import * as OCL from "openchemlib";

import { DICTIONARY } from "../src/lib/dictionary.ts";

const WRITE = process.argv.includes("--write");
const PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound";

const constitution = (key) => key.split("-")[0];
const stereo = (key) => key.split("-")[1];

async function pubchem(path, body) {
  const url = `${PUBCHEM}/${path}/property/SMILES,InChIKey,Title/JSON`;
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/x-www-form-urlencoded" } : undefined,
    body,
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.PropertyTable?.Properties?.[0] ?? null;
}

/** Only entries that already claim some configuration can claim a wrong one. */
function hasConfiguration(smiles) {
  return /[@/\\]/.test(smiles);
}

/**
 * How much stereochemistry a structure actually pins down. PubChem's record
 * for a name is sometimes the less specific one — its "Penicillins" entry is a
 * class with no configuration at all, and its D-glucose leaves the anomeric
 * centre open — and adopting that would lose information rather than fix it.
 */
function definedStereo(smiles) {
  const molecule = OCL.Molecule.fromSmiles(smiles);
  molecule.ensureHelperArrays(OCL.Molecule.cHelperCIP);
  let count = 0;
  for (let atom = 0; atom < molecule.getAtoms(); atom++) {
    if (molecule.isAtomStereoCenter(atom) && !molecule.isAtomConfigurationUnknown(atom)) count++;
  }
  for (let bond = 0; bond < molecule.getAllBonds(); bond++) {
    if (molecule.getBondOrder(bond) === 2 && molecule.getBondType(bond) !== OCL.Molecule.cBondTypeCross) {
      if (molecule.getBondCIPParity(bond) !== 0) count++;
    }
  }
  return count;
}

const mismatches = [];
let checked = 0;

for (const [name, smiles] of Object.entries(DICTIONARY)) {
  if (!hasConfiguration(smiles)) continue;
  checked++;

  const ours = await pubchem("smiles", new URLSearchParams({ smiles }));
  const theirs = await pubchem(`name/${encodeURIComponent(name)}`);
  await new Promise((resolve) => setTimeout(resolve, 220));

  if (!ours?.InChIKey || !theirs?.InChIKey) continue;
  if (constitution(ours.InChIKey) !== constitution(theirs.InChIKey)) continue;
  if (stereo(ours.InChIKey) === stereo(theirs.InChIKey)) continue;
  if (definedStereo(theirs.SMILES) < definedStereo(smiles)) {
    console.log(`  (skipping ${name}: PubChem's record is less specific)`);
    continue;
  }

  mismatches.push({ name, before: smiles, after: theirs.SMILES, title: theirs.Title });
}

console.log(`checked ${checked} entries with stereochemistry\n`);
if (mismatches.length === 0) {
  console.log("all agree with PubChem");
} else {
  console.log(`${mismatches.length} disagree:\n`);
  for (const m of mismatches) {
    console.log(`  ${m.name.padEnd(16)} -> ${m.title}`);
    console.log(`    had  ${m.before}`);
    console.log(`    want ${m.after}`);
  }
}

if (WRITE && mismatches.length) {
  const path = "src/lib/dictionary.ts";
  let source = readFileSync(path, "utf8");
  for (const { name, before, after } of mismatches) {
    // Match the entry's exact source text. One SMILES can serve several names
    // whose right answers differ, so the key has to be part of what is matched.
    const written = [`${name}: "${before}"`, `"${name}": "${before}"`].find((literal) =>
      source.includes(literal),
    );
    if (!written) {
      console.log(`could not locate the entry for ${name}; left alone`);
      continue;
    }
    source = source.replace(written, written.replace(`"${before}"`, `"${after}"`));
  }
  writeFileSync(path, source);
  console.log(`\nwrote ${path}`);
}
