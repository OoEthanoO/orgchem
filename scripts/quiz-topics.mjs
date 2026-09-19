import * as OCL from "openchemlib";

/**
 * Split an existing course group by molecular connectivity. Classification is
 * bounded by that original group: aromatic derivatives remain in aromatics,
 * and a haloalcohol originally taught as a halide remains a halide. Names and
 * titles are deliberately not inputs; retained names such as acetone or
 * acetic acid and different SMILES spellings must give the same topic.
 */
export const QUIZ_TOPIC_GROUPS = {
  alkanes: ["alkanes", "cycloalkanes"],
  unsaturated: ["alkenes", "alkynes", "enynes"],
  alcohols: ["alcohols", "ethers"],
  carbonyls: ["aldehydes", "ketones"],
  acids: ["acids", "esters", "amides", "acyl-halides", "anhydrides"],
  amines: ["amines", "nitriles", "nitro"],
  halides: ["halides"],
  aromatics: ["aromatics"],
};

export function classifyQuizTopic(topic, smiles) {
  const group = Object.entries(QUIZ_TOPIC_GROUPS)
    .find(([broad, specific]) => broad === topic || specific.includes(topic))?.[0];
  if (!group) throw new Error(`Unknown practice topic: ${topic}`);
  if (group === "aromatics" || group === "halides") return group;

  const molecule = OCL.Molecule.fromSmiles(smiles);
  molecule.ensureHelperArrays(OCL.Molecule.cHelperRings);
  const atoms = Array.from({ length: molecule.getAtoms() }, (_, atom) => atom);
  const element = (atom) => molecule.getAtomicNo(atom);
  const neighbours = (atom) => Array.from({ length: molecule.getConnAtoms(atom) }, (_, index) => ({
    atom: molecule.getConnAtom(atom, index),
    order: molecule.getConnBondOrder(atom, index),
  }));
  const carbonyls = new Set(atoms.filter((atom) => element(atom) === 6
    && neighbours(atom).some((bond) => bond.order === 2 && element(bond.atom) === 8)));
  const singleNeighbours = (atom) => neighbours(atom).filter((bond) => bond.order === 1).map((bond) => bond.atom);
  const hasHydrogen = (atom) => molecule.getAllHydrogens(atom) > 0;

  if (group === "alkanes") {
    // OCL's default ring collection omits rings larger than seven atoms.
    // Walk the actual bond graph so cyclooctanes and larger rings still count.
    const visited = new Set();
    const hasCycle = (atom, parent = -1) => {
      visited.add(atom);
      for (const { atom: neighbour } of neighbours(atom)) {
        if (neighbour === parent) continue;
        if (visited.has(neighbour) || hasCycle(neighbour, atom)) return true;
      }
      return false;
    };
    return atoms.some((atom) => !visited.has(atom) && hasCycle(atom)) ? "cycloalkanes" : "alkanes";
  }

  if (group === "unsaturated") {
    let double = false;
    let triple = false;
    for (let bond = 0; bond < molecule.getBonds(); bond++) {
      if (molecule.isAromaticBond(bond)
          || element(molecule.getBondAtom(0, bond)) !== 6
          || element(molecule.getBondAtom(1, bond)) !== 6) continue;
      if (molecule.getBondOrder(bond) === 2) double = true;
      if (molecule.getBondOrder(bond) === 3) triple = true;
    }
    if (double && triple) return "enynes";
    if (triple) return "alkynes";
    if (double) return "alkenes";
  }

  if (group === "alcohols") {
    // An OH group is the principal naming exercise in a hydroxyether.
    if (atoms.some((atom) => element(atom) === 8 && hasHydrogen(atom)
      && singleNeighbours(atom).some((carbon) => element(carbon) === 6 && !carbonyls.has(carbon)))) return "alcohols";
    if (atoms.some((atom) => element(atom) === 8 && singleNeighbours(atom).length === 2
      && singleNeighbours(atom).every((carbon) => element(carbon) === 6 && !carbonyls.has(carbon)))) return "ethers";
  }

  if (group === "carbonyls") {
    if ([...carbonyls].some(hasHydrogen)) return "aldehydes";
    if ([...carbonyls].some((atom) => singleNeighbours(atom).filter((neighbour) => element(neighbour) === 6).length === 2)) return "ketones";
  }

  if (group === "acids") {
    // Recognize the atom bonded to each acyl carbon rather than any oxygen or
    // nitrogen elsewhere in the molecule. This distinguishes esters from
    // ethers, amides from amines, and anhydrides from ordinary esters.
    const acylOxygens = [...carbonyls].flatMap((atom) => singleNeighbours(atom).filter((neighbour) => element(neighbour) === 8));
    if (acylOxygens.some(hasHydrogen)) return "acids";
    if (acylOxygens.some((oxygen) => singleNeighbours(oxygen).filter((atom) => carbonyls.has(atom)).length === 2)) return "anhydrides";
    if (acylOxygens.some((oxygen) => singleNeighbours(oxygen).some((atom) => element(atom) === 6 && !carbonyls.has(atom)))) return "esters";
    if ([...carbonyls].some((atom) => singleNeighbours(atom).some((neighbour) => [9, 17, 35, 53].includes(element(neighbour))))) return "acyl-halides";
    if ([...carbonyls].some((atom) => singleNeighbours(atom).some((neighbour) => element(neighbour) === 7))) return "amides";
  }

  if (group === "amines") {
    if (atoms.some((atom) => element(atom) === 7
      && neighbours(atom).some((bond) => bond.order === 3 && element(bond.atom) === 6))) return "nitriles";
    if (atoms.some((atom) => element(atom) === 7 && molecule.getAtomCharge(atom) === 0
      && neighbours(atom).length > 0
      && neighbours(atom).every((bond) => bond.order === 1 && (element(bond.atom) === 6 || element(bond.atom) === 1))
      && !singleNeighbours(atom).some((neighbour) => carbonyls.has(neighbour)))) return "amines";
    if (atoms.some((atom) => element(atom) === 7 && molecule.getAtomCharge(atom) === 1
      && neighbours(atom).filter((bond) => element(bond.atom) === 8).length === 2
      && neighbours(atom).some((bond) => bond.order === 2 && element(bond.atom) === 8)
      && singleNeighbours(atom).some((neighbour) => element(neighbour) === 6))) return "nitro";
  }

  throw new Error(`No supported ${group} functional group found in ${smiles}`);
}
