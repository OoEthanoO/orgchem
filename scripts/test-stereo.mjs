/**
 * Checks that the two generated stereoisomers really are different compounds,
 * and that their 3D coordinates carry the difference rather than just their
 * labels: the signed volume of the substituents around a stereocentre must
 * come out opposite for R and S.
 */
import * as OCL from "openchemlib";
import { stereoPair } from "../src/lib/stereo.ts";

/** Signed volume of the three bonds from `centre`, in the given model. */
function chirality(model, centre) {
  const neighbours = [];
  for (const [a, b] of model.bonds) {
    if (a === centre) neighbours.push(b);
    else if (b === centre) neighbours.push(a);
  }
  if (neighbours.length < 3) return null;
  const p = model.atoms[centre];
  const [u, v, w] = neighbours.slice(0, 3).map((i) => ({
    x: model.atoms[i].x - p.x,
    y: model.atoms[i].y - p.y,
    z: model.atoms[i].z - p.z,
  }));
  return (
    u.x * (v.y * w.z - v.z * w.y) -
    u.y * (v.x * w.z - v.z * w.x) +
    u.z * (v.x * w.y - v.y * w.x)
  );
}

/**
 * Index of the stereocentre in `smiles`, numbered as the conformer built from
 * that same string is. Taking the index from the structure the pair was
 * generated from would be reading the wrong atom: OpenChemLib renumbers when
 * it rewrites a SMILES, and for ibuprofen the centre moves from 10 to 8.
 */
function stereoCentre(smiles) {
  const molecule = OCL.Molecule.fromSmiles(smiles);
  molecule.ensureHelperArrays(OCL.Molecule.cHelperCIP);
  for (let atom = 0; atom < molecule.getAtoms(); atom++) {
    if (molecule.isAtomStereoCenter(atom)) return atom;
  }
  return -1;
}

const CASES = [
  ["butan-2-ol", "CCC(C)O", "stereocentre", ["R", "S"]],
  ["alanine", "CC(N)C(=O)O", "stereocentre", ["R", "S"]],
  ["ibuprofen", "CC(C)Cc1ccc(cc1)C(C)C(=O)O", "stereocentre", ["R", "S"]],
  ["but-2-ene", "CC=CC", "double bond", ["E", "Z"]],
  ["oleic acid", "CCCCCCCCC=CCCCCCCCC(=O)O", "double bond", ["E", "Z"]],
];

// Structures with no single stereogenic element: nothing should be offered.
const NONE = [
  ["ethanol", "CCO"],
  ["benzene", "c1ccccc1"],
  ["propan-2-ol", "CC(C)O"],
  ["glucose", "OCC1OC(O)C(O)C(O)C1O"],
  ["propene", "CC=C"],
];

let pass = 0;
const failures = [];

for (const [name, smiles, kind, labels] of CASES) {
  const pair = stereoPair(smiles);
  if (!pair) {
    failures.push(`${name}: no pair generated`);
    continue;
  }
  if (pair.kind !== kind) {
    failures.push(`${name}: kind ${pair.kind}, want ${kind}`);
    continue;
  }
  const got = pair.isomers.map((i) => i.label);
  if (got.join("") !== labels.join("")) {
    failures.push(`${name}: labels ${got}, want ${labels}`);
    continue;
  }
  const codes = pair.isomers.map((i) => OCL.Molecule.fromSmiles(i.smiles).getIDCode());
  if (codes[0] === codes[1]) {
    failures.push(`${name}: the two isomers are the same compound`);
    continue;
  }
  if (pair.isomers.some((i) => i.model.atoms.length === 0)) {
    failures.push(`${name}: empty 3D model`);
    continue;
  }
  // For a stereocentre, the 3D coordinates must actually be mirrored.
  if (kind === "stereocentre") {
    const volumes = pair.isomers.map((i) => chirality(i.model, stereoCentre(i.smiles)));
    // A tetrahedral centre encloses a couple of cubic angstroms; anything near
    // zero is a flat atom, whose sign says nothing about configuration.
    if (volumes.some((v) => v === null || Math.abs(v) < 1)) {
      failures.push(`${name}: no tetrahedral centre in the 3D model (${volumes})`);
      continue;
    }
    if (Math.sign(volumes[0]) === Math.sign(volumes[1])) {
      failures.push(`${name}: 3D coordinates are not mirrored (${volumes})`);
      continue;
    }
  }
  pass++;
}

for (const [name, smiles] of NONE) {
  const pair = stereoPair(smiles);
  if (pair) failures.push(`${name}: offered a pair (${pair.kind}) but should not have`);
  else pass++;
}

console.log(`${pass}/${CASES.length + NONE.length} passed`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
