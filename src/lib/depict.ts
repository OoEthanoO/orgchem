import "server-only";

import * as OCL from "openchemlib";

/**
 * Turns a SMILES string into a drawing and a property sheet.
 *
 * OpenChemLib is a megabyte of compiled Java, so it stays on the server: the
 * page ships finished SVG and numbers instead of a chemistry engine.
 */

export interface DisplayOptions {
  /** Draw every hydrogen instead of leaving them implicit. */
  showHydrogens: boolean;
  /** Label every carbon rather than drawing bare skeleton vertices. */
  showCarbons: boolean;
  /** Number the atoms, for following a name's locants. */
  showAtomNumbers: boolean;
  /** Print R/S labels next to each stereocentre. */
  showStereoLabels: boolean;
}

export const DEFAULT_DISPLAY: DisplayOptions = {
  showHydrogens: false,
  showCarbons: false,
  showAtomNumbers: false,
  showStereoLabels: false,
};

export interface Property {
  label: string;
  value: string;
  /** Longer explanation shown on hover. */
  hint?: string;
}

export interface Depiction {
  svg: string;
  /** Molecular formula as plain text (C9H8O4); the UI marks up the counts. */
  formulaPlain: string;
  weight: string;
  canonicalSmiles: string;
  /** Stereocentres the input left unspecified. */
  undefinedStereocentres: number;
  /** Double bonds whose cis/trans geometry the input left unspecified. */
  undefinedDoubleBonds: number;
  /** Unfilled valences: non-zero means this is a substituent group. */
  openValences: number;
  properties: Property[];
  composition: Array<{ element: string; count: number }>;
  fragmentCount: number;
}

export class DepictionError extends Error {}

/**
 * A key for the connectivity alone, ignoring stereochemistry and isotopes.
 *
 * PubChem's formula search returns each enantiomer and each deuterated
 * variant as its own record, so an isomer list for C4H10O comes back with
 * (+)-, (-)- and (+-)-2-butanol plus butan-1-(2H)ol. Those are not different
 * structures in the sense the list is answering, and this collapses them.
 */
export function constitutionKey(smiles: string): string | null {
  try {
    const molecule = OCL.Molecule.fromSmiles(smiles);
    molecule.stripStereoInformation();
    for (let atom = 0; atom < molecule.getAllAtoms(); atom++) molecule.setAtomMass(atom, 0);
    return molecule.getIDCode();
  } catch {
    return null;
  }
}

/**
 * Whether a SMILES string actually parses. The resolver uses this to reject a
 * guess before committing to it — `C4H10O` looks enough like SMILES to fool a
 * syntax check, but it is a molecular formula and has to fall through.
 */
export function canDepict(smiles: string): boolean {
  try {
    return OCL.Molecule.fromSmiles(smiles).getAllAtoms() > 0;
  } catch {
    return false;
  }
}

export function depict(smiles: string, options: DisplayOptions = DEFAULT_DISPLAY): Depiction {
  let molecule: OCL.Molecule;
  try {
    molecule = OCL.Molecule.fromSmiles(smiles);
  } catch (error) {
    throw new DepictionError(
      error instanceof Error ? error.message : "That structure could not be read.",
    );
  }
  if (molecule.getAllAtoms() === 0) throw new DepictionError("The structure is empty.");

  const formulaInfo = molecule.getMolecularFormula();
  const formulaPlain = formulaInfo.formula;

  // The drawing may need hydrogens the property calculations should not see.
  const drawing = molecule.getCompactCopy();
  if (options.showHydrogens) {
    drawing.addImplicitHydrogens();
    drawing.inventCoordinates();
  }
  if (options.showCarbons) {
    // The depictor has no "label every atom" switch, but a custom label is
    // always drawn, so carbons get one that spells out what they already are.
    for (let atom = 0; atom < drawing.getAllAtoms(); atom++) {
      if (drawing.getAtomicNo(atom) === 6) drawing.setAtomCustomLabel(atom, "C");
    }
  }

  // A double bond whose geometry is undefined is drawn by the depictor as two
  // crossed lines. That is a real convention, but it reads as a broken bond
  // rather than as information, so the bond is drawn plainly and the missing
  // geometry is reported in words alongside the drawing.
  for (let bond = 0; bond < drawing.getAllBonds(); bond++) {
    if (drawing.getBondType(bond) === OCL.Molecule.cBondTypeCross) {
      drawing.setBondType(bond, OCL.Molecule.cBondTypeDouble);
    }
  }

  const svg = themeSvg(
    drawing.toSVG(760, 520, "structure", {
      autoCrop: true,
      autoCropMargin: 14,
      // The depictor's captions ("unknown chirality", "abs") sit outside the
      // cropped drawing, and its CIP letters land on top of the skeleton. The
      // wedge and hash bonds already carry the stereochemistry, so the letters
      // are off unless asked for, and undefined centres are reported in words.
      suppressChiralText: true,
      suppressESR: true,
      suppressCIPParity: !options.showStereoLabels,
      noStereoProblem: true,
      strokeWidth: 1.7,
      factorTextSize: 1.1,
      showAtomNumber: options.showAtomNumbers,
      noImplicitAtomLabelColors: false,
    }),
  );

  const composition = parseComposition(formulaPlain);
  const properties = collectProperties(molecule, formulaInfo, composition);

  return {
    svg,
    formulaPlain,
    weight: formatNumber(formulaInfo.relativeWeight, 2),
    canonicalSmiles: molecule.toSmiles(),
    undefinedStereocentres: countUndefinedStereocentres(molecule),
    undefinedDoubleBonds: countUndefinedDoubleBonds(molecule),
    openValences: countOpenValences(molecule),
    properties,
    composition,
    fragmentCount: countFragments(molecule),
  };
}

/**
 * Stereocentres the input left unspecified. The drawing marks these with "?",
 * which needs explaining rather than hiding: it is the difference between a
 * structure and one of its enantiomers.
 */
function countUndefinedStereocentres(molecule: OCL.Molecule): number {
  let count = 0;
  for (let atom = 0; atom < molecule.getAtoms(); atom++) {
    if (molecule.isAtomStereoCenter(atom) && molecule.isAtomConfigurationUnknown(atom)) count++;
  }
  return count;
}

/**
 * Unfilled valences, counted from the structure rather than taken on trust
 * from whichever stage resolved it — `pentan-1-yl` is a substituent group
 * whether it arrived as a name or as `CH3CH2CH2CH2CH2-`.
 */
/** Double bonds that could be cis or trans, where the input said neither. */
function countUndefinedDoubleBonds(molecule: OCL.Molecule): number {
  let count = 0;
  for (let bond = 0; bond < molecule.getAllBonds(); bond++) {
    if (molecule.getBondType(bond) === OCL.Molecule.cBondTypeCross) count++;
  }
  return count;
}

export function openValenceCount(smiles: string): number {
  try {
    return countOpenValences(OCL.Molecule.fromSmiles(smiles));
  } catch {
    return 0;
  }
}

function countOpenValences(molecule: OCL.Molecule): number {
  let count = 0;
  for (let atom = 0; atom < molecule.getAllAtoms(); atom++) {
    const radical = molecule.getAtomRadical(atom);
    if (radical !== 0) count += radical === OCL.Molecule.cAtomRadicalStateT ? 2 : 1;
  }
  return count;
}

/** Number of disconnected components: a salt or hydrate has more than one. */
function countFragments(molecule: OCL.Molecule): number {
  try {
    return Math.max(1, molecule.getFragmentNumbers(new Array(molecule.getAllAtoms()), false, false));
  } catch {
    return 1;
  }
}

function collectProperties(
  molecule: OCL.Molecule,
  formulaInfo: OCL.MolecularFormula,
  composition: Array<{ element: string; count: number }>,
): Property[] {
  const properties: Property[] = [];
  const push = (label: string, value: string | number | null, hint?: string) => {
    if (value === null || value === "") return;
    properties.push({ label, value: String(value), hint });
  };

  push("Monoisotopic mass", formatNumber(formulaInfo.absoluteWeight, 4), "Mass using the most abundant isotope of each element, as seen in mass spectrometry.");

  const unsaturation = degreesOfUnsaturation(composition);
  if (unsaturation !== null) {
    push(
      "Degrees of unsaturation",
      unsaturation,
      "Rings plus pi bonds. Each ring or double bond counts once, a triple bond twice.",
    );
  }

  const ringCount = molecule.getRingSet().getSize();
  push("Rings", ringCount);

  let aromaticRings = 0;
  const rings = molecule.getRingSet();
  for (let i = 0; i < rings.getSize(); i++) {
    if (rings.isAromatic(i)) aromaticRings++;
  }
  if (ringCount > 0) push("Aromatic rings", aromaticRings);

  push("Heavy atoms", molecule.getAtoms(), "Every atom except hydrogen.");

  try {
    const calculated = new OCL.MoleculeProperties(molecule);
    push(
      "cLogP",
      formatNumber(calculated.logP, 2),
      "Predicted octanol/water partition coefficient — how greasy the compound is.",
    );
    push(
      "Polar surface area",
      `${formatNumber(calculated.polarSurfaceArea, 1)} Å²`,
      "Surface contributed by polar atoms; drives membrane permeability.",
    );
    push("H-bond donors", calculated.donorCount);
    push("H-bond acceptors", calculated.acceptorCount);
    push(
      "Rotatable bonds",
      calculated.rotatableBondCount,
      "Single bonds between heavy atoms that are free to rotate — a measure of flexibility.",
    );
    if (calculated.stereoCenterCount > 0) {
      push("Stereocentres", calculated.stereoCenterCount);
    }
  } catch {
    // Property prediction is optional; the structure still stands without it.
  }

  return properties;
}

/** Rings plus pi bonds, from the molecular formula. */
function degreesOfUnsaturation(
  composition: Array<{ element: string; count: number }>,
): number | null {
  const counts = new Map(composition.map((c) => [c.element, c.count]));
  const carbon = counts.get("C") ?? 0;
  if (carbon === 0) return null;
  const hydrogen = counts.get("H") ?? 0;
  const nitrogen = (counts.get("N") ?? 0) + (counts.get("P") ?? 0);
  const halogens =
    (counts.get("F") ?? 0) +
    (counts.get("Cl") ?? 0) +
    (counts.get("Br") ?? 0) +
    (counts.get("I") ?? 0);

  // Only carbon, hydrogen, halogens, nitrogen-like and divalent atoms are
  // defined for this count; anything else makes the number meaningless.
  const understood = new Set(["C", "H", "N", "P", "O", "S", "F", "Cl", "Br", "I"]);
  if (composition.some((c) => !understood.has(c.element))) return null;

  const value = (2 * carbon + 2 + nitrogen - hydrogen - halogens) / 2;
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function parseComposition(formula: string): Array<{ element: string; count: number }> {
  const out: Array<{ element: string; count: number }> = [];
  for (const match of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    if (!match[1]) continue;
    out.push({ element: match[1], count: match[2] ? Number(match[2]) : 1 });
  }
  return out;
}

function formatNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toFixed(digits);
}

/**
 * OpenChemLib bakes literal colours into the SVG. Swapping them for custom
 * properties lets the same drawing work in both themes, and lets the page tune
 * heteroatom colours for contrast rather than living with CPK on dark grey.
 */
const DISPLAY_SCALE = 2.2;
const MAX_DISPLAY_HEIGHT = 380;

const COLOR_VARIABLES: Record<string, string> = {
  "rgb(0,0,0)": "var(--mol-bond)",
  "rgb(255,13,13)": "var(--mol-o)",
  "rgb(48,80,248)": "var(--mol-n)",
  "rgb(255,255,48)": "var(--mol-s)",
  "rgb(31,240,31)": "var(--mol-cl)",
  "rgb(166,41,41)": "var(--mol-br)",
  "rgb(144,224,80)": "var(--mol-f)",
  "rgb(255,128,0)": "var(--mol-p)",
  "rgb(148,0,148)": "var(--mol-i)",
  "rgb(255,181,181)": "var(--mol-x)",
};

function themeSvg(svg: string): string {
  let out = svg;

  // Invisible hit-test shapes are only useful to an editor.
  out = out.replace(/\s*<(line|circle)[^>]*class="event"[^>]*\/>/g, "");

  out = out.replace(/rgb\(\d+,\d+,\d+\)/g, (match) => COLOR_VARIABLES[match] ?? "var(--mol-x)");

  // The depictor draws at a fixed bond length, so a cropped drawing comes out
  // only 60-240px across. Scaling it up by a constant keeps bond lengths
  // consistent between compounds — a big molecule stays visibly bigger than a
  // small one — while a cap stops the largest ones overflowing the panel.
  out = out.replace(
    /^<svg([^>]*?)width="([\d.]+)px"\s+height="([\d.]+)px"/,
    (_match, attributes: string, rawWidth: string, rawHeight: string) => {
      let width = Number(rawWidth) * DISPLAY_SCALE;
      let height = Number(rawHeight) * DISPLAY_SCALE;
      if (height > MAX_DISPLAY_HEIGHT) {
        const shrink = MAX_DISPLAY_HEIGHT / height;
        width *= shrink;
        height *= shrink;
      }
      return `<svg${attributes}width="${width.toFixed(0)}" height="${height.toFixed(0)}" preserveAspectRatio="xMidYMid meet"`;
    },
  );

  return out;
}
