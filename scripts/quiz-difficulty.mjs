/** Naming difficulty shared by the builder, offline regrader, and tests. */
import * as OCL from "openchemlib";

const MULTIPLIER = /(?:di|tri|tetra|penta|hexa)(?:methyl|ethyl|propyl|butyl|chloro|bromo|fluoro|iodo|hydroxy|amino|nitro|methoxy|ethoxy|ol|one|oic|al|ene|yne|amine)/;
const PREFIX = /(?:^|[^a-z])(?:di|tri|tetra|penta|hexa)?(methyl|ethyl|propyl|butyl|chloro|bromo|fluoro|iodo|hydroxy|amino|nitro|methoxy|ethoxy|oxo|cyano)/g;

/** Exposed so regressions can check why a molecule is difficult. */
export function namingComplexity(smiles, name) {
  const molecule = OCL.Molecule.fromSmiles(smiles);
  molecule.ensureHelperArrays(OCL.Molecule.cHelperCIP);
  let branches = 0;
  let aromaticAttachments = 0;
  let specifiedStereo = 0;
  for (let atom = 0; atom < molecule.getAtoms(); atom++) {
    const parity = molecule.getAtomParity(atom);
    if (parity === OCL.Molecule.cAtomParity1 || parity === OCL.Molecule.cAtomParity2) specifiedStereo++;
    if (molecule.getAtomicNo(atom) !== 6) continue;
    let carbonNeighbours = 0;
    let outsideAromaticRing = false;
    for (let i = 0; i < molecule.getConnAtoms(atom); i++) {
      const neighbour = molecule.getConnAtom(atom, i);
      if (molecule.getAtomicNo(neighbour) === 6) carbonNeighbours++;
      if (!molecule.isAromaticAtom(neighbour)) outsideAromaticRing = true;
    }
    // Aromatic ring junctions are not chain branches. Count the actual ring
    // substitution pattern separately, including heteroatom substituents.
    if (molecule.isAromaticAtom(atom)) {
      if (outsideAromaticRing) aromaticAttachments++;
    } else if (carbonNeighbours >= 3) branches++;
  }
  for (let bond = 0; bond < molecule.getBonds(); bond++) {
    // Small rings have geometrically fixed alkene parity without requiring an
    // E/Z descriptor. Only explicitly directed, acyclic double bonds count.
    if (!/[/\\]/.test(smiles) || molecule.getBondOrder(bond) !== 2 || molecule.isRingBond(bond)) continue;
    const parity = molecule.getBondParity(bond);
    if (parity === OCL.Molecule.cBondParityEor1 || parity === OCL.Molecule.cBondParityZor2) specifiedStereo++;
  }

  // Descriptor locants are handled by the stereo dimension. Read whole
  // numbers: 2,10 is two locants, not the three digits 2,1,0.
  const constitutionName = name.replace(/^\([^)]*\)-/, "");
  const locants = new Set(constitutionName.match(/\d+/g) ?? []).size;
  const prefixKinds = new Set([...constitutionName.matchAll(PREFIX)].map((match) => match[1])).size;
  const repeated = MULTIPLIER.test(constitutionName);
  // These names cross a numbering/attachment boundary (ester halves, N
  // substitution, or suffix carbon outside a ring), rather than just adding
  // atoms. One point alone never makes a question Hard.
  const separateParts = /\S+yl\s.+(?:oate|acetate)$/.test(constitutionName)
    || /(?:^|[-,(])N(?:[,'-]|$)/.test(constitutionName)
    || /(?:carboxylic acid|carboxamide|carbonitrile|carbonyl (?:chloride|bromide))$/.test(constitutionName);
  const mixedGroups = /(?:hydroxy|amino|oxo|methoxy|ethoxy|cyano)/.test(constitutionName)
    && /(?:ol|one|al|oic acid|oate|amide|nitrile|amine)$/.test(constitutionName);

  const score = Math.min(3, branches)
    + Math.min(2, Math.max(0, aromaticAttachments - 1))
    + Math.min(2, Math.max(0, locants - 1))
    + Math.min(2, Math.max(0, prefixKinds - 1))
    + Number(repeated)
    + Number(separateParts || mixedGroups)
    + Math.min(4, specifiedStereo * 2);
  return { branches, aromaticAttachments, specifiedStereo, locants, prefixKinds, repeated, separateParts, mixedGroups, score };
}

export function difficultyOf(smiles, name) {
  const { score, specifiedStereo } = namingComplexity(smiles, name);
  // Two explicit stereodescriptors require several independent assignments;
  // otherwise Hard needs a combination of numbering/branching/group rules.
  if (specifiedStereo >= 2 || score >= 5) return "hard";
  return score <= 1 ? "easy" : "medium";
}
