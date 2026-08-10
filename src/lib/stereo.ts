import "server-only";

import * as OCL from "openchemlib";

/**
 * Builds the two stereoisomers of a structure and gives each one 3D
 * coordinates.
 *
 * A flat drawing cannot show what a stereocentre means. Two structures that
 * differ only in configuration have identical skeletons on paper and are
 * different compounds in a flask, and the difference is only visible in three
 * dimensions — which is what this exists to provide.
 *
 * It handles the case where a structure has exactly one stereogenic element,
 * because that is the case where "both stereoisomers" names an unambiguous
 * pair: one stereocentre gives R and S, one stereogenic double bond gives E
 * and Z. With two or more elements there are up to 2^n isomers and no pair to
 * single out, so nothing is offered rather than something arbitrary.
 */

export interface Atom3D {
  /** Element symbol. */
  el: string;
  x: number;
  y: number;
  z: number;
}

export interface Model3D {
  atoms: Atom3D[];
  /** [from, to, bond order] */
  bonds: Array<[number, number, number]>;
}

export interface StereoIsomer {
  /** CIP descriptor: R, S, E or Z. */
  label: string;
  smiles: string;
  /** True when this is the isomer the query actually specified. */
  matchesInput: boolean;
  model: Model3D;
}

export interface StereoPair {
  kind: "stereocentre" | "double bond";
  /** True when the query left the configuration open. */
  wasUnspecified: boolean;
  isomers: StereoIsomer[];
}

const M = OCL.Molecule;

/** The conformer generator needs OpenChemLib's torsion tables loaded. */
let resourcesReady = false;
function ensureResources(): void {
  if (resourcesReady) return;
  OCL.Resources.registerFromNodejs();
  resourcesReady = true;
}

type Element =
  | { kind: "stereocentre"; index: number }
  | { kind: "double bond"; index: number };

/**
 * The single stereogenic element of a structure, or null if it has none or
 * more than one.
 *
 * Whether an element is genuinely stereogenic is decided by flipping it and
 * seeing whether the molecule changes: a centre in a symmetric environment
 * comes back identical and is not a stereocentre at all.
 */
function soleStereoElement(smiles: string): Element | null {
  const molecule = fresh(smiles);
  const found: Element[] = [];

  for (let atom = 0; atom < molecule.getAtoms(); atom++) {
    if (!molecule.isAtomStereoCenter(atom)) continue;
    if (!flippingChangesMolecule(smiles, { kind: "stereocentre", index: atom })) continue;
    found.push({ kind: "stereocentre", index: atom });
    if (found.length > 1) return null;
  }

  for (let bond = 0; bond < molecule.getAllBonds(); bond++) {
    if (molecule.getBondOrder(bond) !== 2) continue;
    if (!flippingChangesMolecule(smiles, { kind: "double bond", index: bond })) continue;
    found.push({ kind: "double bond", index: bond });
    if (found.length > 1) return null;
  }

  return found.length === 1 ? found[0] : null;
}

function flippingChangesMolecule(smiles: string, element: Element): boolean {
  const first = configure(smiles, element, 1);
  const second = configure(smiles, element, 2);
  if (!first || !second) return false;
  return fresh(first).getIDCode() !== fresh(second).getIDCode();
}

/** Apply one of the two configurations to `element` and return the SMILES. */
function configure(smiles: string, element: Element, parity: number): string | null {
  try {
    const molecule = fresh(smiles);
    if (element.kind === "stereocentre") {
      molecule.setAtomParity(element.index, parity, false);
    } else {
      molecule.setBondParity(element.index, parity, false);
    }
    molecule.setParitiesValid(0);
    molecule.ensureHelperArrays(M.cHelperCIP);
    return molecule.toSmiles();
  } catch {
    return null;
  }
}

function fresh(smiles: string): OCL.Molecule {
  const molecule = M.fromSmiles(smiles);
  molecule.ensureHelperArrays(M.cHelperCIP);
  return molecule;
}

/**
 * Read the CIP descriptor back off a built isomer rather than assuming it
 * follows from the parity that was set.
 *
 * The descriptor is only available from a freshly parsed molecule, and parsing
 * renumbers the atoms, so the element is located again by its own property
 * instead of by the index it had in the original structure.
 */
function descriptorOf(smiles: string, kind: Element["kind"]): string {
  const molecule = fresh(smiles);

  if (kind === "stereocentre") {
    for (let atom = 0; atom < molecule.getAtoms(); atom++) {
      if (!molecule.isAtomStereoCenter(atom)) continue;
      const parity = molecule.getAtomCIPParity(atom);
      if (parity === M.cAtomCIPParityRorM) return "R";
      if (parity === M.cAtomCIPParitySorP) return "S";
    }
    return "";
  }

  for (let bond = 0; bond < molecule.getAllBonds(); bond++) {
    if (molecule.getBondOrder(bond) !== 2) continue;
    const parity = molecule.getBondCIPParity(bond);
    if (parity === M.cBondCIPParityEorP) return "E";
    if (parity === M.cBondCIPParityZorM) return "Z";
  }
  return "";
}

/**
 * 3D coordinates for a structure, hydrogens included — the fourth substituent
 * at a stereocentre is usually a hydrogen, so without them there is nothing to
 * see.
 */
function conformer(smiles: string): Model3D | null {
  ensureResources();
  const generator = new OCL.ConformerGenerator(42);
  const molecule = M.fromSmiles(smiles);
  const placed = generator.getOneConformerAsMolecule(molecule);
  if (!placed) return null;

  const atoms: Atom3D[] = [];
  for (let atom = 0; atom < placed.getAllAtoms(); atom++) {
    atoms.push({
      el: placed.getAtomLabel(atom),
      x: round(placed.getAtomX(atom)),
      y: round(placed.getAtomY(atom)),
      z: round(placed.getAtomZ(atom)),
    });
  }

  const bonds: Array<[number, number, number]> = [];
  for (let bond = 0; bond < placed.getAllBonds(); bond++) {
    bonds.push([placed.getBondAtom(0, bond), placed.getBondAtom(1, bond), placed.getBondOrder(bond)]);
  }

  return { atoms, bonds };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * The stereoisomer pair for a structure, or null when there is not exactly one
 * stereogenic element to vary.
 */
export function stereoPair(smiles: string): StereoPair | null {
  let element: Element | null;
  try {
    element = soleStereoElement(smiles);
  } catch {
    return null;
  }
  if (!element) return null;

  const inputCode = safeIdCode(smiles);
  const isomers: StereoIsomer[] = [];

  for (const parity of [1, 2]) {
    const isomerSmiles = configure(smiles, element, parity);
    if (!isomerSmiles) return null;
    const model = conformer(isomerSmiles);
    if (!model) return null;
    isomers.push({
      label: descriptorOf(isomerSmiles, element.kind),
      smiles: isomerSmiles,
      matchesInput: inputCode !== null && safeIdCode(isomerSmiles) === inputCode,
      model,
    });
  }

  if (isomers.some((isomer) => !isomer.label)) return null;
  // Sort so the pair always reads R before S and E before Z.
  isomers.sort((a, b) => a.label.localeCompare(b.label));

  return {
    kind: element.kind,
    wasUnspecified: isomers.every((isomer) => !isomer.matchesInput),
    isomers,
  };
}

function safeIdCode(smiles: string): string | null {
  try {
    return fresh(smiles).getIDCode();
  } catch {
    return null;
  }
}
