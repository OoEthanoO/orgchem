/**
 * Parser for condensed structural formulas — the way organic structures are
 * actually written by hand and in textbooks:
 *
 *   CH3CH2CH2CH2CH2-      pentan-1-yl
 *   (CH3)3COH             2-methylpropan-2-ol
 *   CH3(CH2)16COOH        octadecanoic acid
 *   HOCH2CH2OH            ethane-1,2-diol
 *   CH3CH=CHCH3           but-2-ene
 *   CH3CHOHCH3            propan-2-ol
 *   CH2Cl2                dichloromethane
 *   PhCH2COOH             2-phenylacetic acid
 *   CF3COOH               trifluoroacetic acid
 *
 * These are not SMILES and no name-to-structure service accepts them, so the
 * translation is done here.
 *
 * The parser is valence driven. Every fragment records how much bonding
 * capacity its head and tail atoms have left once the hydrogens written in the
 * formula are subtracted, and that single number resolves the notation's
 * ambiguities.
 *
 * Whether `(X)n` is a branch repeated n times or a linker spliced n times into
 * the chain:
 *
 *   CH3CH(CH3)CH3   the CH has capacity left, and CH3 is monovalent -> branch
 *   CH3(CH2)3CH3    the CH3 is saturated, and CH2 is divalent       -> repeat
 *
 * Whether an unbracketed group hangs off the chain or continues it:
 *
 *   CH3CHOHCH3      OH cannot carry the rest of the chain           -> branch
 *   CH3CH2OH        nothing follows                                 -> chain
 *
 * And whether the formula describes a molecule or a substituent group: the
 * final CH2 of `CH3CH2CH2CH2CH2` has one unused bond, so the result is the
 * pentyl group. The trailing dash a chemist writes is confirmation, not
 * information — the formula alone already says it.
 */

/** Standard valence used for capacity accounting. */
const VALENCE: Record<string, number> = {
  H: 1,
  B: 3,
  C: 4,
  N: 3,
  O: 2,
  F: 1,
  Si: 4,
  P: 3,
  S: 2,
  Cl: 1,
  Se: 2,
  Br: 1,
  I: 1,
};

/** Two-letter symbols that really are elements in an organic formula. */
const TWO_LETTER = ["Cl", "Br", "Si", "Se"];

type AtomTok = {
  kind: "atom";
  sym: string;
  /** Hydrogen count written in the formula, or null if it was left implicit. */
  h: number | null;
  charge: number;
  /** Set by the final pass when an unused valence has to be made explicit. */
  bracket: boolean;
};

type RawTok = { kind: "raw"; s: string };
type Tok = AtomTok | RawTok;

/** A bonding site: an atom plus the valence it still has available. */
type Slot = { atom: AtomTok; cap: number };

/** A parsed run of the formula, connectable at its head and its tail. */
type Frag = {
  toks: Tok[];
  headSlot: Slot;
  tailSlot: Slot;
  /** Every slot inside, so the final pass can spot leftover valences. */
  slots: Slot[];
};

/**
 * A fragment template.
 *
 * SMILES is written left to right, so whatever comes next in the formula bonds
 * to the *last* open atom of the emitted text. A group therefore needs two
 * spellings: `toks` for when it hangs off something already written (PhOMe ->
 * `c1ccccc1` + `OC`), and `lead` for when it opens the formula with something
 * after it (tBuOH -> `CC(C)(C)` + `O`). Without the second spelling `tBuOH`
 * would come out as neopentyl alcohol.
 *
 * Capacities are the *external* bonding capacity of the head and tail atoms,
 * stated rather than derived so that a group like iPr is correctly described
 * as monovalent.
 */
type Template = {
  toks: () => Tok[];
  head: number;
  tail: number;
  headCap: number;
  tailCap: number;
  lead?: { toks: () => Tok[]; at: number };
};

function atom(sym: string, h: number | null = null, charge = 0): AtomTok {
  return { kind: "atom", sym, h, charge, bracket: false };
}

function raw(s: string): RawTok {
  return { kind: "raw", s };
}

function tpl(
  toks: () => Tok[],
  head: number,
  tail: number,
  headCap: number,
  tailCap: number,
  lead?: { toks: () => Tok[]; at: number },
): Template {
  return { toks, head, tail, headCap, tailCap, lead };
}

/** Monovalent group: one attachment point, so head and tail coincide. */
function uni(
  toks: () => Tok[],
  at: number,
  lead?: { toks: () => Tok[]; at: number },
): Template {
  return tpl(toks, at, at, 1, 1, lead);
}

/** Single-atom template with an explicit hydrogen count. */
function mono(sym: string, h: number | null): Template {
  const cap = (VALENCE[sym] ?? 4) - (h ?? 0);
  return tpl(() => [atom(sym, h)], 0, 0, cap, cap);
}

/**
 * Multi-atom abbreviations, matched longest-first before generic atoms.
 * Default spellings are written tail-last; `lead` spellings attachment-last.
 */
const MACROS: Array<[string, Template]> = [
  // --- carboxyl family -----------------------------------------------------
  ["COOH", tpl(() => [atom("C"), raw("(=O)"), atom("O")], 0, 2, 1, 0)],
  ["CO2H", tpl(() => [atom("C"), raw("(=O)"), atom("O")], 0, 2, 1, 0)],
  ["COO", tpl(() => [atom("C"), raw("(=O)"), atom("O")], 0, 2, 1, 1)],
  ["CO2", tpl(() => [atom("C"), raw("(=O)"), atom("O")], 0, 2, 1, 1)],
  ["COCl", tpl(() => [atom("C"), raw("(=O)"), atom("Cl")], 0, 2, 1, 0)],
  ["CONH2", tpl(() => [atom("C"), raw("(=O)"), atom("N", 2)], 0, 2, 1, 0)],
  ["CONH", tpl(() => [atom("C"), raw("(=O)"), atom("N", 1)], 0, 2, 1, 1)],
  [
    "CHO",
    uni(() => [atom("C"), raw("(=O)")], 0, { toks: () => [raw("O="), atom("C")], at: 1 }),
  ],
  [
    "OHC",
    uni(() => [atom("C"), raw("(=O)")], 0, { toks: () => [raw("O="), atom("C")], at: 1 }),
  ],
  [
    "CO",
    tpl(() => [atom("C"), raw("(=O)")], 0, 0, 2, 2, {
      toks: () => [raw("O="), atom("C")],
      at: 1,
    }),
  ],

  // --- nitrogen / sulfur / halogen groups ----------------------------------
  [
    "NO2",
    uni(() => [atom("N", 0, 1), raw("(=O)"), raw("[O-]")], 0, {
      toks: () => [raw("[O-]"), atom("N", 0, 1), raw("(=O)")],
      at: 1,
    }),
  ],
  [
    "O2N",
    uni(() => [atom("N", 0, 1), raw("(=O)"), raw("[O-]")], 0, {
      toks: () => [raw("[O-]"), atom("N", 0, 1), raw("(=O)")],
      at: 1,
    }),
  ],
  ["NHCO", tpl(() => [atom("N", 1), atom("C"), raw("(=O)")], 0, 1, 1, 1)],
  ["SO3H", tpl(() => [atom("S"), raw("(=O)(=O)"), atom("O")], 0, 2, 1, 0)],
  [
    "SO2",
    tpl(() => [atom("S"), raw("(=O)(=O)")], 0, 0, 2, 2, {
      toks: () => [raw("O="), atom("S"), raw("(=O)")],
      at: 1,
    }),
  ],
  [
    "CF3",
    uni(() => [atom("C"), raw("(F)(F)F")], 0, {
      toks: () => [raw("F"), atom("C"), raw("(F)(F)")],
      at: 1,
    }),
  ],
  [
    "CCl3",
    uni(() => [atom("C"), raw("(Cl)(Cl)Cl")], 0, {
      toks: () => [raw("Cl"), atom("C"), raw("(Cl)(Cl)")],
      at: 1,
    }),
  ],
  [
    "CBr3",
    uni(() => [atom("C"), raw("(Br)(Br)Br")], 0, {
      toks: () => [raw("Br"), atom("C"), raw("(Br)(Br)")],
      at: 1,
    }),
  ],

  // --- alkoxy / amino abbreviations ----------------------------------------
  ["OMe", uni(() => [atom("O"), raw("C")], 0, { toks: () => [raw("C"), atom("O")], at: 1 })],
  ["OEt", uni(() => [atom("O"), raw("CC")], 0, { toks: () => [raw("CC"), atom("O")], at: 1 })],
  [
    "OiPr",
    uni(() => [atom("O"), raw("C(C)C")], 0, { toks: () => [raw("CC(C)"), atom("O")], at: 1 }),
  ],
  [
    "OtBu",
    uni(() => [atom("O"), raw("C(C)(C)C")], 0, {
      toks: () => [raw("CC(C)(C)"), atom("O")],
      at: 1,
    }),
  ],
  [
    "OAc",
    uni(() => [atom("O"), raw("C(=O)C")], 0, { toks: () => [raw("CC(=O)"), atom("O")], at: 1 }),
  ],
  [
    "OTs",
    uni(() => [atom("O"), raw("S(=O)(=O)c1ccc(C)cc1")], 0, {
      toks: () => [raw("Cc1ccc(cc1)S(=O)(=O)"), atom("O")],
      at: 1,
    }),
  ],
  [
    "NMe2",
    uni(() => [atom("N"), raw("(C)C")], 0, {
      toks: () => [raw("C"), atom("N"), raw("(C)")],
      at: 1,
    }),
  ],
  [
    "NEt2",
    uni(() => [atom("N"), raw("(CC)CC")], 0, {
      toks: () => [raw("CC"), atom("N"), raw("(CC)")],
      at: 1,
    }),
  ],

  // --- alkyl / aryl abbreviations ------------------------------------------
  [
    "tBu",
    uni(() => [atom("C"), raw("(C)(C)C")], 0, {
      toks: () => [raw("C"), atom("C"), raw("(C)(C)")],
      at: 1,
    }),
  ],
  [
    "iBu",
    uni(() => [atom("C"), raw("C(C)C")], 0, { toks: () => [raw("CC(C)"), atom("C")], at: 1 }),
  ],
  [
    "sBu",
    uni(() => [atom("C"), raw("(C)CC")], 0, {
      toks: () => [raw("CC"), atom("C"), raw("(C)")],
      at: 1,
    }),
  ],
  ["nBu", uni(() => [atom("C"), raw("CCC")], 0, { toks: () => [raw("CCC"), atom("C")], at: 1 })],
  [
    "iPr",
    uni(() => [atom("C"), raw("(C)C")], 0, {
      toks: () => [raw("C"), atom("C"), raw("(C)")],
      at: 1,
    }),
  ],
  ["nPr", uni(() => [atom("C"), raw("CC")], 0, { toks: () => [raw("CC"), atom("C")], at: 1 })],
  ["Ph", uni(() => [atom("c"), raw("1ccccc1")], 0)],
  [
    "Bn",
    uni(() => [atom("C"), raw("c1ccccc1")], 0, {
      toks: () => [raw("c1ccccc1"), atom("C")],
      at: 1,
    }),
  ],
  [
    "Bz",
    uni(() => [atom("C"), raw("(=O)c1ccccc1")], 0, {
      toks: () => [raw("c1ccccc1"), atom("C"), raw("(=O)")],
      at: 1,
    }),
  ],
  [
    "Ac",
    uni(() => [atom("C"), raw("(=O)C")], 0, {
      toks: () => [raw("C"), atom("C"), raw("(=O)")],
      at: 1,
    }),
  ],
  [
    "Ts",
    uni(() => [atom("S"), raw("(=O)(=O)c1ccc(C)cc1")], 0, {
      toks: () => [raw("Cc1ccc(cc1)"), atom("S"), raw("(=O)(=O)")],
      at: 1,
    }),
  ],
  [
    "Ms",
    uni(() => [atom("S"), raw("(=O)(=O)C")], 0, {
      toks: () => [raw("C"), atom("S"), raw("(=O)(=O)")],
      at: 1,
    }),
  ],
  ["Cy", uni(() => [atom("C"), raw("1CCCCC1")], 0)],
  ["Et", uni(() => [atom("C"), raw("C")], 0, { toks: () => [raw("C"), atom("C")], at: 1 })],
  ["Me", uni(() => [atom("C", 3)], 0)],
  ["Bu", uni(() => [atom("C"), raw("CCC")], 0, { toks: () => [raw("CCC"), atom("C")], at: 1 })],
  ["Pr", uni(() => [atom("C"), raw("CC")], 0, { toks: () => [raw("CC"), atom("C")], at: 1 })],
];

/** Groups written back to front, which only ever happens at the left end. */
const REVERSED: Array<[string, Template]> = [
  ["HOOC", tpl(() => [atom("O"), atom("C"), raw("(=O)")], 0, 1, 1, 1)],
  ["HO2C", tpl(() => [atom("O"), atom("C"), raw("(=O)")], 0, 1, 1, 1)],
  ["H2NOC", tpl(() => [atom("N", 2), atom("C"), raw("(=O)")], 0, 1, 1, 1)],
  ["H2NCO", tpl(() => [atom("N", 2), atom("C"), raw("(=O)")], 0, 1, 1, 1)],
];

/** Ring shorthands written as CnHm, checked before the generic CnHm rule. */
const FORMULA_SPECIALS: Record<string, Template> = {
  C6H5: uni(() => [atom("c"), raw("1ccccc1")], 0),
  // Enters the ring at position 1 and leaves at position 4: para-phenylene.
  C6H4: tpl(() => [atom("c"), raw("1cc"), atom("c"), raw("(cc1)")], 0, 2, 1, 1),
  C6H6: tpl(() => [atom("c"), raw("1ccccc1")], 0, 0, 0, 0),
};

class ParseError extends Error {}

const BOND_SYMBOL: Record<number, string> = { 1: "", 2: "=", 3: "#" };

export interface CondensedResult {
  smiles: string;
  /** Number of unfilled valences — non-zero means a substituent group. */
  openValences: number;
  /** Fragments as the parser understood them, shown back to the user. */
  pieces: string[];
}

/**
 * Translate a condensed structural formula to SMILES. Throws if the string is
 * not a well-formed, valence-consistent formula, which is what lets the caller
 * fall through to the name resolvers.
 */
export function parseCondensed(source: string): CondensedResult {
  const src = source.replace(/\s+/g, "");
  if (!src) throw new ParseError("empty");
  if (!/^[A-Za-z0-9()[\]=#.+-]+$/.test(src)) throw new ParseError("bad characters");
  if (!/[A-Z]/.test(src)) throw new ParseError("no element symbols");
  if (isAmbiguousMolecularFormula(src)) throw new ParseError("molecular formula, not a structure");

  const pieces: string[] = [];
  const frag = parseChain(src, pieces);

  // Capacity still free on an atom whose hydrogens were spelled out is an open
  // valence: the formula describes a substituent group, not a whole molecule.
  let openValences = 0;
  for (const slot of frag.slots) {
    if (slot.cap > 0 && slot.atom.h !== null) {
      openValences += slot.cap;
      slot.atom.bracket = true;
    }
  }

  return { smiles: render(frag.toks), openValences, pieces };
}

/**
 * Whether the string is a molecular formula that more than one structure fits.
 *
 * `C5H12` counts atoms; it does not say whether they form pentane, isopentane
 * or neopentane, and reading it as a straight chain would be a silent guess.
 * The caller can offer the isomers instead.
 *
 * A formula only qualifies if every element appears exactly once — `CH3CH2OH`
 * repeats C and H, which is structural information — and if it has more than
 * one carbon to arrange. Single-carbon formulas (CH4, CH2Cl2) are left alone
 * because valence already fixes their structure.
 */
function isAmbiguousMolecularFormula(src: string): boolean {
  if (!/^(?:[A-Z][a-z]?\d*)+$/.test(src)) return false;
  const counts = new Map<string, number>();
  for (const [, symbol, digits] of src.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    if (counts.has(symbol)) return false;
    counts.set(symbol, digits ? Number(digits) : 1);
  }
  return (counts.get("C") ?? 0) >= 2;
}

function render(toks: Tok[]): string {
  let out = "";
  for (const t of toks) {
    if (t.kind === "raw") {
      out += t.s;
      continue;
    }
    if (t.bracket || t.charge !== 0) {
      const h = t.h === null || t.h === 0 ? "" : t.h === 1 ? "H" : `H${t.h}`;
      const c =
        t.charge === 0 ? "" : t.charge > 0 ? "+".repeat(t.charge) : "-".repeat(-t.charge);
      out += `[${t.sym}${h}${c}]`;
    } else {
      out += t.sym;
    }
  }
  return out;
}

/**
 * Parse a run of fragments joined head to tail, handling branches, repeats and
 * bond symbols. Recurses for parenthesised groups.
 */
function parseChain(src: string, pieces: string[], continues = false): Frag {
  const toks: Tok[] = [];
  const slots: Slot[] = [];
  let headSlot: Slot | null = null;
  let cur: Slot | null = null;
  let pendingBond = 1;
  /** Groups written before the atom they hang off: the (CH3)3 of (CH3)3COH. */
  let leadingBranches: string[] = [];

  let i = 0;
  while (i < src.length) {
    const ch = src[i];

    // --- explicit charge, written at the very end (CH3NH3+, CH3COO-) -------
    if (ch === "+" || (ch === "-" && i === src.length - 1 && cur && cur.cap === 0)) {
      if (!cur) throw new ParseError("stray charge");
      cur.atom.charge += ch === "+" ? 1 : -1;
      cur.cap = Math.max(0, cur.cap - 1);
      if (cur.atom.h === null) cur.atom.h = 0;
      i++;
      continue;
    }

    // --- bond symbols ------------------------------------------------------
    if (ch === "-" || ch === "=" || ch === "#") {
      // A dash at either end only marks an open valence, which the valence
      // accounting has already worked out; between groups it is a single bond.
      pendingBond = ch === "=" ? 2 : ch === "#" ? 3 : 1;
      i++;
      continue;
    }

    // --- disconnected component (salt, hydrate) ----------------------------
    if (ch === ".") {
      toks.push(raw("."));
      cur = null;
      pendingBond = 1;
      i++;
      continue;
    }

    // --- parenthesised group ----------------------------------------------
    if (ch === "(" || ch === "[") {
      const close = ch === "(" ? ")" : "]";
      const end = matchParen(src, i, ch, close);
      const inner = src.slice(i + 1, end);
      i = end + 1;
      const counted = readCount(src, i);
      i = counted.next;
      if (!inner) throw new ParseError("empty group");
      pieces.push(counted.count > 1 ? `(${inner})${counted.count}` : `(${inner})`);

      if (!cur) {
        // Nothing to hang it off yet — it belongs to the atom that follows.
        for (let k = 0; k < counted.count; k++) leadingBranches.push(inner);
        continue;
      }

      // Branch or linker? A group whose ends are divalent (CH2, O, NH) can
      // only be a repeat unit; a monovalent one on an atom that still has
      // capacity is a branch.
      const probe = parseChain(inner, []);
      const isBranch = cur.cap > 0 && probe.tailSlot.cap <= 1 && probe.headSlot.cap <= 1;

      for (let k = 0; k < counted.count; k++) {
        // A repeat unit always has something after it — the next copy — so a
        // monovalent group at its end hangs off it rather than ending it: the
        // (CHOH)4 of HOCH2(CHOH)4CHO is four CH(OH), not a chain ending in O.
        const piece = parseChain(inner, [], !isBranch);
        if (isBranch) attachBranch(toks, slots, cur, piece, pendingBond);
        else cur = attachChain(toks, slots, cur, piece, pendingBond);
        pendingBond = 1;
      }
      continue;
    }

    // --- a group -----------------------------------------------------------
    const matched = matchGroup(src, i);
    if (!matched) throw new ParseError(`unrecognised at "${src.slice(i, i + 6)}"`);
    const { template, text } = matched;
    i = matched.next;
    const counted = readCount(src, i);
    i = counted.next;

    pieces.push(counted.count > 1 ? `${text}×${counted.count}` : text);
    const moreFollows = /[A-Za-z([]/.test(src.slice(i));

    if (counted.count > 1 && cur) {
      // CH2Cl2: a repeated monovalent group hangs off the current atom.
      const isBranch = cur.cap > 0 && template.tailCap <= 1;
      for (let k = 0; k < counted.count; k++) {
        const piece = fragFromTemplate(template, false);
        if (isBranch) attachBranch(toks, slots, cur, piece, pendingBond);
        else cur = attachChain(toks, slots, cur, piece, pendingBond);
        pendingBond = 1;
      }
      continue;
    }

    for (let k = 0; k < counted.count; k++) {
      // A monovalent group in the middle of a formula cannot carry the rest of
      // the chain, so it has to be a branch: the OH of CH3CHOHCH3.
      if (
        cur &&
        (moreFollows || continues) &&
        template.tailCap - pendingBond <= 0 &&
        cur.cap > pendingBond
      ) {
        attachBranch(toks, slots, cur, fragFromTemplate(template, false), pendingBond);
        pendingBond = 1;
        continue;
      }

      const leading = cur === null && moreFollows;
      const piece = fragFromTemplate(template, leading);
      cur = attachChain(toks, slots, cur, piece, pendingBond);
      pendingBond = 1;

      if (!headSlot) {
        headSlot = piece.headSlot;
        if (leadingBranches.length) {
          if (piece.headSlot !== piece.tailSlot) {
            throw new ParseError("group written before a multi-atom fragment");
          }
          for (const b of leadingBranches) {
            attachBranch(toks, slots, cur, leadingFragment(b), 1);
          }
          leadingBranches = [];
        }
      }
    }
  }

  if (!headSlot || !cur) throw new ParseError("nothing parsed");
  if (leadingBranches.length) throw new ParseError("dangling group");
  return { toks, headSlot, tailSlot: cur, slots };
}

/** Append `piece` to the chain, returning the new tail slot. */
function attachChain(
  toks: Tok[],
  slots: Slot[],
  cur: Slot | null,
  piece: Frag,
  bond: number,
): Slot {
  if (cur) {
    if (cur.cap < bond) throw new ParseError(`too many bonds on ${cur.atom.sym}`);
    if (piece.headSlot.cap < bond) throw new ParseError("valence overflow");
    cur.cap -= bond;
    piece.headSlot.cap -= bond;
    toks.push(raw(BOND_SYMBOL[bond]));
  }
  toks.push(...piece.toks);
  slots.push(...piece.slots);
  return piece.tailSlot;
}

/**
 * A group written before the atom it hangs off, spelled so it can be emitted
 * after it.
 *
 * SMILES writes a branch after its parent, so the first atom of the branch is
 * the one carrying the bond — but the atom carrying it in the ethyls of
 * (CH3CH2)2NH is the last one written, the CH2. A run of plain atoms means the
 * same thing read from either end, so it is turned round. Anything with a
 * shape to it — a carbonyl, a branch of its own — does not survive being
 * reversed, so it is refused and the formula falls through to the resolvers
 * rather than coming back as a different compound.
 */
function leadingFragment(source: string): Frag {
  const frag = parseChain(source, []);
  if (frag.headSlot.cap > 0) return frag;
  if (frag.tailSlot.cap === 0 || !frag.toks.every(canReverse)) {
    throw new ParseError("group written before a multi-atom fragment");
  }
  return {
    toks: [...frag.toks].reverse(),
    headSlot: frag.tailSlot,
    tailSlot: frag.headSlot,
    slots: frag.slots,
  };
}

/** Whether a token means the same thing wherever it lands in the sequence. */
function canReverse(token: Tok): boolean {
  return token.kind === "atom" || token.s === "" || token.s === "=" || token.s === "#";
}

/** Hang `piece` off `cur` as a branch; the chain continues from `cur`. */
function attachBranch(
  toks: Tok[],
  slots: Slot[],
  cur: Slot,
  piece: Frag,
  bond: number,
): void {
  if (cur.cap < bond) throw new ParseError(`too many bonds on ${cur.atom.sym}`);
  if (piece.headSlot.cap < bond) throw new ParseError("valence overflow");
  cur.cap -= bond;
  piece.headSlot.cap -= bond;
  toks.push(raw("("), raw(BOND_SYMBOL[bond]), ...piece.toks, raw(")"));
  slots.push(...piece.slots);
}

function fragFromTemplate(t: Template, leading: boolean): Frag {
  const lead = leading ? t.lead : undefined;
  const toks = lead ? lead.toks() : t.toks();
  const headIdx = lead ? lead.at : t.head;
  const tailIdx = lead ? lead.at : t.tail;
  const headAtom = toks[headIdx];
  const tailAtom = toks[tailIdx];
  if (headAtom?.kind !== "atom" || tailAtom?.kind !== "atom") {
    throw new ParseError("bad template");
  }
  const headSlot: Slot = { atom: headAtom, cap: t.headCap };
  const tailSlot: Slot = headIdx === tailIdx ? headSlot : { atom: tailAtom, cap: t.tailCap };
  const slots = headIdx === tailIdx ? [headSlot] : [headSlot, tailSlot];
  return { toks, headSlot, tailSlot, slots };
}

function matchParen(src: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new ParseError("unbalanced parentheses");
}

function readCount(src: string, i: number): { count: number; next: number } {
  const m = /^\d+/.exec(src.slice(i));
  if (!m) return { count: 1, next: i };
  return { count: Number(m[0]), next: i + m[0].length };
}

type Match = { template: Template; text: string; next: number };

function matchGroup(src: string, i: number): Match | null {
  const rest = src.slice(i);

  // Reversed left-hand groups always begin with H, which no forward group does.
  if (rest[0] === "H") {
    for (const [name, template] of REVERSED) {
      if (rest.startsWith(name)) return { template, text: name, next: i + name.length };
    }

    // Hydrogen cyanide, written the way the acid is: the nitrile is otherwise
    // only recognised where nothing precedes it.
    if (rest === "HCN") {
      return {
        template: tpl(() => [atom("C", 1), raw("#"), atom("N")], 0, 2, 0, 0),
        text: "HCN",
        next: i + 3,
      };
    }

    // A hydrogen written in front of a group belongs to that group: HCOOH is
    // formic acid and HCHO is methanal. Taken instead as the hydrogen count of
    // the atom after it — which is what the H2N of H2NCH2COOH is — the group
    // behind it is never looked for, and HCOOH comes out as CH-O-OH.
    const behind = matchMacro(rest.slice(1));
    if (behind && behind.template.headCap > 0) {
      return {
        template: { ...behind.template, headCap: behind.template.headCap - 1 },
        text: `H${behind.name}`,
        next: i + 1 + behind.name.length,
      };
    }

    const m = /^H(\d*)([A-Z][a-z]?)/.exec(rest);
    if (m) {
      const sym = elementOf(m[2]);
      if (sym) {
        const h = m[1] ? Number(m[1]) : 1;
        return { template: mono(sym, h), text: m[0], next: i + m[0].length };
      }
    }
    return null;
  }

  // CnHm shorthand: C2H5 (ethyl), C3H7 (propyl), C6H5 (phenyl)...
  const cn = /^C(\d+)H(\d+)/.exec(rest);
  if (cn) {
    const template = alkylTemplate(Number(cn[1]), Number(cn[2]), cn[0]);
    if (template) return { template, text: cn[0], next: i + cn[0].length };
  }

  const macro = matchMacro(rest);
  if (macro) return { template: macro.template, text: macro.name, next: i + macro.name.length };

  // Nitrile, but only where it terminates the formula: elsewhere CN is C then N.
  if (rest === "CN") {
    return {
      template: tpl(() => [atom("C"), raw("#"), atom("N")], 0, 2, 1, 0),
      text: "CN",
      next: i + 2,
    };
  }

  // Generic: element symbol with an optional written hydrogen count.
  const m = /^([A-Z][a-z]?)(H(\d*))?/.exec(rest);
  if (!m?.[1]) return null;
  const sym = elementOf(m[1]);
  if (!sym) return null;
  const h = m[2] === undefined ? null : m[3] ? Number(m[3]) : 1;
  const consumed = sym.length + (m[2]?.length ?? 0);
  return { template: mono(sym, h), text: rest.slice(0, consumed), next: i + consumed };
}

/** The longest abbreviation the text opens with, if any. */
function matchMacro(text: string): { template: Template; name: string } | null {
  for (const [name, template] of MACROS) {
    if (!text.startsWith(name)) continue;
    // In this notation a hydrogen always follows the atom it belongs to, so
    // `COH` is C then OH, not the carbonyl macro, and `CHOH` is CH then OH.
    if (text[name.length] === "H" && !name.endsWith("H")) continue;
    return { template, name };
  }
  return null;
}

function elementOf(candidate: string): string | null {
  if (candidate.length === 2 && !TWO_LETTER.includes(candidate)) {
    // "Ca" in an organic formula is far more likely C followed by something.
    return VALENCE[candidate[0]] !== undefined ? candidate[0] : null;
  }
  return VALENCE[candidate] !== undefined ? candidate : null;
}

/** CnH(2n+1) is an alkyl group, CnH(2n+2) an alkane, CnH(2n) a divalent chain. */
function alkylTemplate(n: number, h: number, text: string): Template | null {
  const special = FORMULA_SPECIALS[text];
  if (special) return special;
  if (n < 1 || n > 30) return null;
  const chain = () => Array.from({ length: n }, () => atom("C"));
  if (h === 2 * n + 1) return tpl(chain, 0, n - 1, 1, 1);
  if (h === 2 * n + 2) return tpl(chain, 0, n - 1, 0, 0);
  if (h === 2 * n) return tpl(chain, 0, n - 1, 1, 1);
  return null;
}
