/**
 * Finds dictionary entries whose structure is not the compound PubChem knows
 * by that name.
 *
 * The stereochemistry check catches a configuration that is wrong. This
 * catches the worse thing underneath it: the wrong skeleton entirely, which
 * for a trivial name is silent — "theobromine" held the structure of
 * paraxanthine, its 1,7-isomer, and every part of the app downstream agreed
 * with it.
 *
 * An InChIKey's first block encodes constitution alone, and PubChem computes
 * both keys here, so tautomers of one compound compare equal: adenine written
 * with the hydrogen on either nitrogen is still adenine, and a comparison that
 * flagged it would be noise.
 *
 * Runs against the network, one name at a time, so it takes a few minutes:
 *   node --experimental-strip-types --import ./scripts/loader.mjs \
 *     scripts/check-dictionary.mjs [name ...]
 */
import { DICTIONARY } from "../src/lib/dictionary.ts";

const PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound";

/**
 * Entries whose structure is deliberately not PubChem's, with the reason. Each
 * one is a judgement about what the reader is asking for, not an oversight.
 */
const DELIBERATE = {
  ribose:
    "PubChem's record is the pyranose; the furanose is the ring in RNA and the one worth drawing",
  co: "PubChem reads the name as the element cobalt",
  no: "PubChem reads the name as the element nobelium",
  "nitric oxide":
    "the entry is PubChem's own SMILES for the name; asked to read it back, PubChem fills the radical's spare valence with a hydrogen and answers nitroxyl",
};

const constitution = (key) => key.split("-")[0];

async function pubchem(path, body) {
  const url = `${PUBCHEM}/${path}/property/SMILES,InChIKey,Title/JSON`;
  try {
    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/x-www-form-urlencoded" } : undefined,
      body,
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return null;
    return (await response.json())?.PropertyTable?.Properties?.[0] ?? null;
  } catch {
    return null;
  }
}

const only = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));
const entries = Object.entries(DICTIONARY).filter(([name]) => !only.length || only.includes(name));

const mismatches = [];
const unchecked = [];
let checked = 0;

for (const [name, smiles] of entries) {
  const ours = await pubchem("smiles", new URLSearchParams({ smiles }));
  const theirs = await pubchem(`name/${encodeURIComponent(name)}`);
  await new Promise((resolve) => setTimeout(resolve, 220));

  // A name PubChem does not know, or a record it holds as a mixture, says
  // nothing about whether the entry is right.
  if (!ours?.InChIKey || !theirs?.InChIKey) {
    unchecked.push(`${name}: no record to compare`);
    continue;
  }
  if (theirs.SMILES?.includes(".") !== smiles.includes(".")) {
    unchecked.push(`${name}: one of the two records is a mixture`);
    continue;
  }

  checked++;
  if (constitution(ours.InChIKey) === constitution(theirs.InChIKey)) continue;
  if (DELIBERATE[name]) {
    console.log(`  (skipping ${name}: ${DELIBERATE[name]})`);
    continue;
  }

  mismatches.push({ name, ours, theirs, smiles });
}

console.log(`\nchecked ${checked} of ${entries.length} entries`);
if (unchecked.length) console.log(`${unchecked.length} could not be compared`);

if (mismatches.length === 0) {
  console.log("\nevery structure is the compound PubChem knows by that name");
} else {
  console.log(`\n${mismatches.length} disagree:\n`);
  for (const m of mismatches) {
    console.log(`  ${m.name}`);
    console.log(`    holds  ${m.smiles}`);
    console.log(`           which PubChem calls ${m.ours.Title}`);
    console.log(`    wants  ${m.theirs.SMILES}`);
    console.log(`           which PubChem calls ${m.theirs.Title}`);
  }
  // Nothing is rewritten: which structure a trivial name should carry is a
  // judgement — ribose is a ring size, nylon is a polymer — and a script that
  // guessed would be how a wrong one got in.
  process.exit(1);
}
