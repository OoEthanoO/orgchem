/**
 * A local, substitutive-nomenclature parser for systematic IUPAC names.
 *
 * OPSIN is the authority for name-to-structure and is tried first, so this
 * exists to keep the app answering when the network is slow or unreachable,
 * and to make the common classroom names resolve without a round trip. It
 * covers what an introductory organic course uses:
 *
 *   substituent prefixes with locants and multipliers   2,3-dimethylbutane
 *   chains and rings                                    cyclohexane
 *   unsaturation                                        hexa-2,4-diene
 *   principal characteristic groups                     hexan-1-ol
 *   substituent groups                                  pentan-1-yl
 *   simple esters and benzene derivatives               methyl butanoate
 *
 * It deliberately does not attempt fused polycyclics, bridged systems,
 * stereodescriptors or complex bracketed substituents; those fall through to
 * OPSIN. Anything it cannot parse with confidence throws.
 */

const STEMS: Array<[string, number]> = [
  ["henicos", 21],
  ["heneicos", 21],
  ["nonadec", 19],
  ["octadec", 18],
  ["heptadec", 17],
  ["hexadec", 16],
  ["pentadec", 15],
  ["tetradec", 14],
  ["tridec", 13],
  ["dodec", 12],
  ["undec", 11],
  ["eicos", 20],
  ["icos", 20],
  ["dec", 10],
  ["non", 9],
  ["oct", 8],
  ["hept", 7],
  ["hex", 6],
  ["pent", 5],
  ["but", 4],
  ["prop", 3],
  ["eth", 2],
  ["meth", 1],
];

const MULTIPLIERS: Record<string, number> = {
  di: 2,
  bis: 2,
  tri: 3,
  tris: 3,
  tetra: 4,
  tetrakis: 4,
  penta: 5,
  hexa: 6,
  hepta: 7,
  octa: 8,
  nona: 9,
  deca: 10,
};

/** Substituent prefixes. `order` 2 means the group is doubly bonded (oxo). */
const PREFIXES: Array<[string, { smiles: string; order?: number }]> = [
  ["trifluoromethyl", { smiles: "C(F)(F)F" }],
  ["trichloromethyl", { smiles: "C(Cl)(Cl)Cl" }],
  ["hydroxymethyl", { smiles: "CO" }],
  ["cyclopropyl", { smiles: "C1CC1" }],
  ["cyclobutyl", { smiles: "C1CCC1" }],
  ["cyclopentyl", { smiles: "C1CCCC1" }],
  ["cyclohexyl", { smiles: "C1CCCCC1" }],
  ["isopropyl", { smiles: "C(C)C" }],
  ["isobutyl", { smiles: "CC(C)C" }],
  ["isopentyl", { smiles: "CCC(C)C" }],
  ["isoamyl", { smiles: "CCC(C)C" }],
  ["neopentyl", { smiles: "CC(C)(C)C" }],
  ["sec-butyl", { smiles: "C(C)CC" }],
  ["tert-butyl", { smiles: "C(C)(C)C" }],
  ["tertbutyl", { smiles: "C(C)(C)C" }],
  ["t-butyl", { smiles: "C(C)(C)C" }],
  ["methoxy", { smiles: "OC" }],
  ["ethoxy", { smiles: "OCC" }],
  ["propoxy", { smiles: "OCCC" }],
  ["butoxy", { smiles: "OCCCC" }],
  ["phenoxy", { smiles: "Oc1ccccc1" }],
  ["benzyloxy", { smiles: "OCc1ccccc1" }],
  ["methylthio", { smiles: "SC" }],
  ["carboxy", { smiles: "C(=O)O" }],
  ["carbamoyl", { smiles: "C(N)=O" }],
  ["formyl", { smiles: "C=O" }],
  ["acetyl", { smiles: "C(C)=O" }],
  ["benzoyl", { smiles: "C(=O)c1ccccc1" }],
  ["phenyl", { smiles: "c1ccccc1" }],
  ["benzyl", { smiles: "Cc1ccccc1" }],
  ["naphthyl", { smiles: "c1ccc2ccccc2c1" }],
  ["methyl", { smiles: "C" }],
  ["ethenyl", { smiles: "C=C" }],
  ["ethynyl", { smiles: "C#C" }],
  ["ethyl", { smiles: "CC" }],
  ["propenyl", { smiles: "C=CC" }],
  ["propyl", { smiles: "CCC" }],
  ["butyl", { smiles: "CCCC" }],
  ["pentyl", { smiles: "CCCCC" }],
  ["hexyl", { smiles: "CCCCCC" }],
  ["heptyl", { smiles: "CCCCCCC" }],
  ["octyl", { smiles: "CCCCCCCC" }],
  ["vinyl", { smiles: "C=C" }],
  ["allyl", { smiles: "CC=C" }],
  ["fluoro", { smiles: "F" }],
  ["chloro", { smiles: "Cl" }],
  ["bromo", { smiles: "Br" }],
  ["iodo", { smiles: "I" }],
  ["hydroxy", { smiles: "O" }],
  ["sulfanyl", { smiles: "S" }],
  ["mercapto", { smiles: "S" }],
  ["amino", { smiles: "N" }],
  ["nitroso", { smiles: "N=O" }],
  ["nitro", { smiles: "[N+](=O)[O-]" }],
  ["cyano", { smiles: "C#N" }],
  ["oxo", { smiles: "O", order: 2 }],
  ["keto", { smiles: "O", order: 2 }],
  ["thioxo", { smiles: "S", order: 2 }],
];

/**
 * Principal characteristic groups. `onChain` groups modify a chain carbon that
 * already exists; `addsCarbon` groups bring their own carbon atom.
 */
type Suffix = {
  /** Branches added to the carbon at the suffix locant. */
  branches: Array<{ smiles: string; order: number }>;
  /** Where the locant defaults when the name omits it. */
  defaultLocant?: number;
  /** The group supplies its own carbon (carboxylic acid, carbonitrile). */
  addsCarbon?: boolean;
  /** Marks an open valence rather than adding atoms (-yl). */
  openValence?: boolean;
  /** The alkyl half of an ester bonds through an added oxygen. */
  ester?: boolean;
};

const SUFFIXES: Array<[string, Suffix]> = [
  ["carboxylic acid", { branches: [{ smiles: "C(=O)O", order: 1 }], addsCarbon: true }],
  ["carbaldehyde", { branches: [{ smiles: "C=O", order: 1 }], addsCarbon: true }],
  ["carbonitrile", { branches: [{ smiles: "C#N", order: 1 }], addsCarbon: true }],
  ["oic acid", { branches: [{ smiles: "O", order: 2 }, { smiles: "O", order: 1 }] }],
  ["dioic acid", { branches: [{ smiles: "O", order: 2 }, { smiles: "O", order: 1 }] }],
  ["oate", { branches: [{ smiles: "O", order: 2 }], ester: true }],
  ["nitrile", { branches: [{ smiles: "N", order: 3 }] }],
  ["amide", { branches: [{ smiles: "O", order: 2 }, { smiles: "N", order: 1 }] }],
  ["amine", { branches: [{ smiles: "N", order: 1 }] }],
  ["thiol", { branches: [{ smiles: "S", order: 1 }] }],
  ["one", { branches: [{ smiles: "O", order: 2 }], defaultLocant: 2 }],
  ["ol", { branches: [{ smiles: "O", order: 1 }] }],
  ["al", { branches: [{ smiles: "O", order: 2 }] }],
  ["yl", { branches: [], openValence: true }],
];

/** Aromatic parents, given as a ring template with numbered attachment points. */
type AromaticParent = {
  /** Ring atoms in locant order, as SMILES atom tokens. */
  ring: string[];
  /** Branches already present on the parent (the OH of phenol). */
  fixed?: Array<{ locant: number; smiles: string; order: number }>;
};

const AROMATIC_PARENTS: Record<string, AromaticParent> = {
  benzene: { ring: ["c", "c", "c", "c", "c", "c"] },
  phenol: {
    ring: ["c", "c", "c", "c", "c", "c"],
    fixed: [{ locant: 1, smiles: "O", order: 1 }],
  },
  aniline: {
    ring: ["c", "c", "c", "c", "c", "c"],
    fixed: [{ locant: 1, smiles: "N", order: 1 }],
  },
  toluene: {
    ring: ["c", "c", "c", "c", "c", "c"],
    fixed: [{ locant: 1, smiles: "C", order: 1 }],
  },
  benzaldehyde: {
    ring: ["c", "c", "c", "c", "c", "c"],
    fixed: [{ locant: 1, smiles: "C=O", order: 1 }],
  },
  "benzoic acid": {
    ring: ["c", "c", "c", "c", "c", "c"],
    fixed: [{ locant: 1, smiles: "C(=O)O", order: 1 }],
  },
  pyridine: { ring: ["n", "c", "c", "c", "c", "c"] },
};

/** Alkyl groups that can name the ester half of `<alkyl> <parent>oate`. */
const ESTER_ALKYLS: Record<string, string> = {
  methyl: "C",
  ethyl: "CC",
  propyl: "CCC",
  isopropyl: "C(C)C",
  butyl: "CCCC",
  isobutyl: "CC(C)C",
  "tert-butyl": "C(C)(C)C",
  pentyl: "CCCCC",
  phenyl: "c1ccccc1",
  benzyl: "Cc1ccccc1",
  vinyl: "C=C",
  allyl: "CC=C",
};

/** Substituent groups named without a parsable chain stem. */
const RADICAL_GROUPS: Record<string, string> = {
  isopropyl: "C[CH]C",
  isobutyl: "[CH2]C(C)C",
  isopentyl: "[CH2]CC(C)C",
  isoamyl: "[CH2]CC(C)C",
  neopentyl: "[CH2]C(C)(C)C",
  "sec-butyl": "C[CH]CC",
  "tert-butyl": "C[C](C)C",
  tertbutyl: "C[C](C)C",
  "t-butyl": "C[C](C)C",
  phenyl: "[c]1ccccc1",
  benzyl: "[CH2]c1ccccc1",
  vinyl: "[CH]=C",
  ethenyl: "[CH]=C",
  allyl: "[CH2]C=C",
  ethynyl: "[C]#C",
  formyl: "[CH]=O",
  acetyl: "C[C]=O",
  carboxy: "[C](=O)O",
  cyclopropyl: "[CH]1CC1",
  cyclobutyl: "[CH]1CCC1",
  cyclopentyl: "[CH]1CCCC1",
  cyclohexyl: "[CH]1CCCCC1",
};

class NameError extends Error {}

const BOND_SYMBOL: Record<number, string> = { 1: "", 2: "=", 3: "#" };

type Branch = { smiles: string; order: number };

type BuildAtom = {
  sym: string;
  branches: Branch[];
  /** Bond order to the next atom in the chain; 0 for the last one. */
  next: number;
  /** True when the atom carries an unfilled valence (-yl). */
  open: boolean;
  /** Ring closure digit emitted after this atom, if any. */
  ring: number;
};

export interface NameResult {
  smiles: string;
  openValences: number;
}

/** Parse a systematic name into SMILES. Throws when the name is not covered. */
export function parseIupacName(input: string): NameResult {
  const name = cleanName(input);
  if (!name) throw new NameError("empty");

  // Esters are written as two words: "methyl butanoate". The acyl half is
  // built with only its double-bonded oxygen, and the alkyl half is written
  // first so the ester oxygen ends up between them.
  const words = name.split(" ");
  if (words.length === 2 && words[1].endsWith("oate")) {
    const alkyl = ESTER_ALKYLS[words[0]];
    if (alkyl) {
      const acyl = parseSingleName(words[1]);
      return { smiles: `${alkyl}O${acyl.smiles}`, openValences: 0 };
    }
  }

  return parseSingleName(name);
}

/**
 * Stands in for a nitrogen locant while the rest of the name is lowercased.
 * Not a character any name can contain, so nothing else can be mistaken for it.
 */
const N_LOCANT = "@";

/** Strip the decorations this parser deliberately ignores. */
function cleanName(input: string): string {
  // An uppercase N in front of a substituent is a locant — it says the group
  // sits on the nitrogen — where a lowercase one means "normal", as in
  // n-butanol. Only the case tells them apart, so the locant is marked before
  // lowercasing loses it and the strip below takes N-ethylethanamine for a
  // plain ethylethanamine.
  let s = input.trim().replace(/\bN(?=[,-])/g, N_LOCANT).toLowerCase();
  // Stereodescriptors and configurational prefixes: (2R,3S)-, (E)-, cis-, D-.
  s = s.replace(/^\(([0-9rsezRSEZ,'\s+-]|alpha|beta)*\)-/g, "");
  // ortho, meta and para are left in place: they are positions, not
  // decorations, and are read as locants below.
  s = s.replace(/^(cis|trans|syn|anti|dl|meso|d|l|r|s|e|z|n)-/g, "");
  s = s.replace(/\((\d*[rsez])\)-/g, "");
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

/**
 * How far round the ring the second substituent sits, for names that say it in
 * words: ortho is next to the first, meta one further, para opposite.
 */
const RELATIVE_POSITIONS: Record<string, number> = {
  ortho: 2,
  meta: 3,
  para: 4,
  o: 2,
  m: 3,
  p: 4,
};

function parseSingleName(name: string): NameResult {
  const relative = /^(ortho|meta|para|o|m|p)-/.exec(name);
  const separation = relative ? RELATIVE_POSITIONS[relative[1]] : null;
  if (relative) name = name.slice(relative[0].length);

  const { prefixes, rest } = peelPrefixes(name);

  const aromatic = matchAromaticParent(rest);
  if (aromatic) return buildAromatic(aromatic.parent, prefixes, separation);
  // Nothing else has a ring for ortho and para to mean anything on.
  if (separation !== null) throw new NameError("a relative position without a ring to put it on");

  // Substituent groups whose names have no chain stem to parse (isopropyl).
  if (prefixes.length === 0) {
    const radical = RADICAL_GROUPS[rest];
    if (radical) return { smiles: radical, openValences: 1 };
  }

  const parent = parseParent(rest);
  return buildChain(parent, prefixes);
}

/** A position on the parent chain, or the nitrogen of its characteristic group. */
type Locant = number | typeof N_LOCANT;

type PrefixInstance = { locant: Locant | null; smiles: string; order: number };

/**
 * Consume `2,3-dimethyl`-style substituent prefixes from the front of the name
 * until what remains is the parent hydride.
 */
function peelPrefixes(name: string): { prefixes: PrefixInstance[]; rest: string } {
  const prefixes: PrefixInstance[] = [];
  let rest = name;

  for (;;) {
    const locantMatch = new RegExp(`^-?((?:\\d+|\\${N_LOCANT})(?:,(?:\\d+|\\${N_LOCANT}))*)-?`).exec(
      rest,
    );
    const locantText = locantMatch?.[1];
    const after = locantMatch ? rest.slice(locantMatch[0].length) : rest.replace(/^-/, "");

    const multiplierMatch = /^(tetrakis|tetra|tris|bis|penta|hexa|hepta|octa|nona|deca|tri|di)/.exec(
      after,
    );
    const withoutMultiplier = multiplierMatch ? after.slice(multiplierMatch[0].length) : after;

    const found = PREFIXES.find(([p]) => withoutMultiplier.startsWith(p));
    if (!found) {
      // A multiplier that is not followed by a substituent belongs to the
      // parent instead ("2,4-dienol"), so stop here.
      break;
    }

    const [prefixName, spec] = found;
    const locants: Locant[] = locantText
      ? locantText.split(",").map((text) => (text === N_LOCANT ? N_LOCANT : Number(text)))
      : [];
    const count = multiplierMatch ? MULTIPLIERS[multiplierMatch[0]] : 1;
    const pending: PrefixInstance[] = [];
    for (let k = 0; k < count; k++) {
      pending.push({
        locant: locants[k] ?? locants[0] ?? null,
        smiles: spec.smiles,
        order: spec.order ?? 1,
      });
    }

    const remainder = withoutMultiplier.slice(prefixName.length).replace(/^-/, "");
    // "pentyl" on its own is a parent hydride with a -yl ending, not a prefix
    // with nothing after it, so leave it for the parent parser.
    if (!remainder) break;
    prefixes.push(...pending);
    rest = remainder;
  }

  return { prefixes, rest };
}

function matchAromaticParent(rest: string): { parent: AromaticParent } | null {
  const parent = AROMATIC_PARENTS[rest];
  return parent ? { parent } : null;
}

type Parent = {
  size: number;
  ring: boolean;
  doubleBonds: number[];
  tripleBonds: number[];
  suffix: Suffix | null;
  suffixLocants: number[];
};

/** Parse `cyclohexane`, `hexa-2,4-dien-1-ol`, `pentan-1-yl` and friends. */
function parseParent(input: string): Parent {
  let rest = input;
  const ring = rest.startsWith("cyclo");
  if (ring) rest = rest.slice("cyclo".length);

  const stem = STEMS.find(([s]) => rest.startsWith(s));
  if (!stem) throw new NameError(`no parent chain in "${input}"`);
  rest = rest.slice(stem[0].length);
  const size = stem[1];

  const doubleBonds: number[] = [];
  const tripleBonds: number[] = [];

  // Unsaturation: `an`, `-2-en`, `a-2,4-dien`, `-1,3-diyn`.
  for (;;) {
    const m = /^a?-?(\d+(?:,\d+)*)?-?(tetra|penta|tri|di)?(an|en|yn)/.exec(rest);
    if (!m) break;
    rest = rest.slice(m[0].length);
    if (m[3] === "an") continue;
    const locants = m[1] ? m[1].split(",").map(Number) : [1];
    const count = m[2] ? MULTIPLIERS[m[2]] : 1;
    for (let k = 0; k < count; k++) {
      const locant = locants[k] ?? locants[0];
      (m[3] === "en" ? doubleBonds : tripleBonds).push(locant);
    }
  }

  // What remains is the principal characteristic group. The stem's terminal
  // "e" survives when the suffix is written with a locant ("ethane-1,2-diol").
  if (rest === "e" || rest === "") {
    return { size, ring, doubleBonds, tripleBonds, suffix: null, suffixLocants: [] };
  }
  rest = rest.replace(/^e(?=[a-z0-9-])/, "");

  const sm = /^-?(\d+(?:,\d+)*)?-?(tetra|penta|tri|di)?(.*)$/.exec(rest);
  if (!sm) throw new NameError(`unparsed ending "${rest}"`);
  const suffixEntry = SUFFIXES.find(([s]) => sm[3] === s);
  if (!suffixEntry) throw new NameError(`unknown ending "${sm[3]}"`);

  const [, suffix] = suffixEntry;
  const count = sm[2] ? MULTIPLIERS[sm[2]] : 1;
  // "hexanedioic acid" names both chain ends without writing the locants.
  const implied = count === 2 && !suffix.defaultLocant ? [1, size] : [suffix.defaultLocant ?? 1];
  const locants = sm[1] ? sm[1].split(",").map(Number) : implied;
  const suffixLocants: number[] = [];
  for (let k = 0; k < count; k++) suffixLocants.push(locants[k] ?? locants[0]);

  return { size, ring, doubleBonds, tripleBonds, suffix, suffixLocants };
}

/**
 * A branch that can carry substituents written on the nitrogen: the N of an
 * amine or an amide, which is emitted as part of that group rather than as an
 * atom of the parent chain.
 */
function carriesNitrogenSubstituents(branch: { smiles: string; order: number }): boolean {
  return branch.smiles === "N" && branch.order === 1;
}

/** `N` with what an N-methyl or an N,N-dimethyl hangs off it. */
function withNitrogenSubstituents(substituents: PrefixInstance[]): string {
  return `N${substituents.map((s) => `(${s.smiles})`).join("")}`;
}

/**
 * The chain position a substituent names. Nitrogen locants are taken out
 * before this is reached, so anything left that is not a number is a
 * substituent written without a locant, which falls to the first position.
 */
function chainIndex(locant: Locant | null): number {
  return (typeof locant === "number" ? locant : 1) - 1;
}

function buildChain(parent: Parent, prefixes: PrefixInstance[]): NameResult {
  const { size, ring, suffix } = parent;
  // A substituent on the nitrogen is not a position on the chain, so it is
  // taken out before the chain positions are filled and spliced into the
  // characteristic group instead. Where there is no nitrogen to take it, or
  // more than one and nothing to say which is meant, the name is refused
  // rather than the group put somewhere plausible.
  const nitrogenSubstituents = prefixes.filter((p) => p.locant === N_LOCANT);
  prefixes = prefixes.filter((p) => p.locant !== N_LOCANT);
  if (nitrogenSubstituents.length > 0) {
    if (!suffix?.branches.some(carriesNitrogenSubstituents) || suffix.openValence) {
      throw new NameError("nothing for an N- substituent to sit on");
    }
    if (parent.suffixLocants.length > 1) {
      throw new NameError("more than one nitrogen and nothing to say which is meant");
    }
  }
  const atoms: BuildAtom[] = Array.from({ length: size }, () => ({
    sym: "C",
    branches: [],
    next: 1,
    open: false,
    ring: 0,
  }));
  atoms[atoms.length - 1].next = 0;

  for (const locant of parent.doubleBonds) setBond(atoms, locant, 2, ring);
  for (const locant of parent.tripleBonds) setBond(atoms, locant, 3, ring);

  for (const p of prefixes) {
    // A substituent written without a locant cannot be placed by guessing.
    // "methylpropene" is isobutylene, but assuming position 1 would build
    // but-2-ene — a different compound with a name of its own. On a chain of
    // three or more carbons the position matters, so the name goes to a
    // resolver that knows the convention instead.
    if (p.locant === null && atoms.length > 2) {
      throw new NameError("substituent has no locant and the position is not forced");
    }
    const index = chainIndex(p.locant);
    if (index < 0 || index >= atoms.length) throw new NameError(`locant ${p.locant} out of range`);
    atoms[index].branches.push({ smiles: p.smiles, order: p.order });
  }

  let openValences = 0;
  if (suffix) {
    for (const locant of parent.suffixLocants) {
      const index = locant - 1;
      if (index < 0 || index >= atoms.length) {
        throw new NameError(`locant ${locant} out of range`);
      }
      if (suffix.openValence) {
        atoms[index].open = true;
        openValences++;
      } else {
        for (const b of suffix.branches) {
          const smiles =
            nitrogenSubstituents.length > 0 && carriesNitrogenSubstituents(b)
              ? withNitrogenSubstituents(nitrogenSubstituents)
              : b.smiles;
          atoms[index].branches.push({ ...b, smiles });
        }
      }
    }
  }

  if (ring) {
    atoms[0].ring = 1;
    atoms[atoms.length - 1].ring = 1;
  }

  return { smiles: emit(atoms, ring), openValences };
}

function buildAromatic(
  parent: AromaticParent,
  prefixes: PrefixInstance[],
  separation: number | null,
): NameResult {
  const atoms: BuildAtom[] = parent.ring.map((sym) => ({
    sym,
    branches: [],
    next: 1,
    open: false,
    ring: 0,
  }));
  atoms[atoms.length - 1].next = 0;
  atoms[0].ring = 1;
  atoms[atoms.length - 1].ring = 1;

  // As on a chain: an N- substituent belongs to the nitrogen the parent
  // carries — the one aniline is named for — not to a ring position.
  const nitrogenSubstituents = prefixes.filter((p) => p.locant === N_LOCANT);
  prefixes = prefixes.filter((p) => p.locant !== N_LOCANT);
  const fixed = parent.fixed ?? [];
  if (nitrogenSubstituents.length > 0 && !fixed.some(carriesNitrogenSubstituents)) {
    throw new NameError("nothing for an N- substituent to sit on");
  }

  for (const f of fixed) {
    const smiles =
      nitrogenSubstituents.length > 0 && carriesNitrogenSubstituents(f)
        ? withNitrogenSubstituents(nitrogenSubstituents)
        : f.smiles;
    atoms[f.locant - 1].branches.push({ smiles, order: f.order });
  }
  /*
    Where a substituent goes when the name does not number it.

    A bare ring is the same at every carbon, so the first one can only be
    position 1 — that is how nitrobenzene needs no locant. After that the ring
    is no longer symmetric and the position is real information: ortho, meta
    and para supply it, and without them there is nothing to place a second
    substituent by. Guessing put it on carbon 1 alongside the first, which is
    not a crowded structure but an impossible one — p-nitrotoluene came back as
    a ring carbon with five bonds.
  */
  const taken = new Set<number>([
    ...fixed.map((f) => f.locant),
    ...prefixes.map((p) => p.locant).filter((locant): locant is number => typeof locant === "number"),
  ]);

  for (const p of prefixes) {
    let locant = typeof p.locant === "number" ? p.locant : null;
    if (locant === null) {
      if (taken.size === 0) locant = 1;
      else if (separation !== null && !taken.has(separation)) locant = separation;
      else throw new NameError("substituent has no locant and the ring is not symmetric");
      taken.add(locant);
    }
    const index = locant - 1;
    if (index < 0 || index >= atoms.length) throw new NameError(`locant ${locant} out of range`);
    atoms[index].branches.push({ smiles: p.smiles, order: p.order });
  }

  return { smiles: emit(atoms, true), openValences: 0 };
}

function setBond(atoms: BuildAtom[], locant: number, order: number, ring: boolean): void {
  const index = locant - 1;
  if (index < 0 || index >= atoms.length) throw new NameError(`locant ${locant} out of range`);
  if (index === atoms.length - 1) {
    if (!ring) throw new NameError(`no bond starts at position ${locant}`);
    return; // the ring-closing bond; left single for simplicity
  }
  atoms[index].next = order;
}

/** Serialise the built chain or ring to SMILES. */
function emit(atoms: BuildAtom[], ring: boolean): string {
  let out = "";
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    if (i > 0) out += BOND_SYMBOL[atoms[i - 1].next];

    if (a.open) {
      const used =
        (i > 0 ? atoms[i - 1].next : 0) +
        a.next +
        (ring && (i === 0 || i === atoms.length - 1) ? 1 : 0) +
        a.branches.reduce((sum, b) => sum + b.order, 0);
      const h = Math.max(0, 4 - used - 1);
      out += `[${a.sym}${h === 0 ? "" : h === 1 ? "H" : `H${h}`}]`;
    } else {
      out += a.sym;
    }

    if (a.ring) out += String(a.ring);
    for (const b of a.branches) out += `(${BOND_SYMBOL[b.order]}${b.smiles})`;
  }
  return out;
}
