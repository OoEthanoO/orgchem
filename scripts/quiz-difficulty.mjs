/**
 * How hard a structure is to name, scored from the things that actually make
 * naming hard rather than from the size of the molecule.
 *
 * Shared by the bank builder and the re-grader so the two cannot drift apart.
 */
import * as OCL from "openchemlib";

/** Multiplying prefixes, but only where they multiply something. "nitrile" contains "tri". */
const MULTIPLIER =
  /(di|tri|tetra)(methyl|ethyl|propyl|butyl|chloro|bromo|fluoro|iodo|hydroxy|amino|nitro|ol|one|oic|al|ene|yne|amine)/;

/** Classes whose naming has a rule beyond locating groups on a chain. */
const AWKWARD_CLASS = [
  /^\S+yl \S+oate$/, // esters are two words, and the halves are numbered separately
  /amide$/,
  /nitrile$/,
  /oyl chloride$/,
  /carbonyl chloride$/,
  /anhydride$/,
];

export function difficultyOf(smiles, name) {
  const molecule = OCL.Molecule.fromSmiles(smiles);
  molecule.ensureHelperArrays(OCL.Molecule.cHelperCIP);

  // A branch is a carbon with three or more *carbon* neighbours. Counting any
  // atom with three heavy neighbours would treat every secondary alcohol and
  // every carbonyl as a branch, which is not what makes them hard to name.
  let branches = 0;
  for (let atom = 0; atom < molecule.getAtoms(); atom++) {
    if (molecule.getAtomicNo(atom) !== 6) continue;
    let carbonNeighbours = 0;
    for (let i = 0; i < molecule.getConnAtoms(atom); i++) {
      if (molecule.getAtomicNo(molecule.getConnAtom(atom, i)) === 6) carbonNeighbours++;
    }
    if (carbonNeighbours >= 3) branches++;
  }

  let stereo = /[@/\\]/.test(smiles);
  for (let atom = 0; atom < molecule.getAtoms(); atom++) {
    if (molecule.isAtomStereoCenter(atom)) stereo = true;
  }

  const locants = new Set(name.match(/\d/g) ?? []).size;
  const heavy = molecule.getAtoms();

  let score = 0;
  if (heavy >= 8) score++;
  if (heavy >= 12) score++;
  score += Math.min(2, branches);
  if (locants >= 2) score++;
  if (MULTIPLIER.test(name)) score++;
  if (AWKWARD_CLASS.some((pattern) => pattern.test(name))) score++;
  if (stereo) score += 2;

  if (score <= 1) return "easy";
  if (score <= 3) return "medium";
  return "hard";
}
