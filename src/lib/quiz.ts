import "server-only";

import { constitutionKey, depict, structureKey, DEFAULT_DISPLAY } from "./depict";
import { QUIZ_BANK, type BankQuestion } from "./quiz-bank";
import { resolveQuery } from "./resolve";

/**
 * Naming practice: a structure is shown, and the answer is the IUPAC name.
 *
 * Marking is done by resolving whatever was typed back into a structure and
 * comparing it with the one on screen. That is the honest test — it accepts
 * any name that identifies the right compound, including retained names and
 * alternative but valid systematic forms, instead of demanding one blessed
 * string. It also means a wrong answer can be told apart from an unreadable
 * one, and a near miss on stereochemistry from a genuinely different compound.
 */

export type Difficulty = "easy" | "medium" | "hard";

export interface Category {
  id: string;
  label: string;
  blurb: string;
}

export const CATEGORIES: Category[] = [
  { id: "alkanes", label: "Alkanes & rings", blurb: "chains, branches and cycloalkanes" },
  { id: "unsaturated", label: "Alkenes & alkynes", blurb: "double and triple bonds, and where they sit" },
  { id: "halides", label: "Haloalkanes", blurb: "halogens as substituents" },
  { id: "alcohols", label: "Alcohols & ethers", blurb: "-ol suffixes, diols, alkoxy prefixes" },
  { id: "carbonyls", label: "Aldehydes & ketones", blurb: "-al and -one, and their locants" },
  { id: "acids", label: "Acids & derivatives", blurb: "acids, esters, amides, acyl chlorides" },
  { id: "amines", label: "Amines & nitriles", blurb: "nitrogen as the principal group" },
  { id: "aromatics", label: "Aromatics", blurb: "benzene rings and their substituents" },
];

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

/**
 * The two directions naming can be practised in. Reading a structure and
 * writing a structure are different skills, and the second is the one a
 * multiple choice can test without asking anyone to draw.
 */
export type QuizMode = "name" | "structure";

export const QUIZ_MODES: QuizMode[] = ["name", "structure"];

interface QuestionBase {
  /** Index into the bank: the answer stays on the server. */
  id: number;
  category: string;
  difficulty: Difficulty;
  formula: string;
  hints: string[];
}

/** Here is a structure — what is it called? */
export interface NameQuestion extends QuestionBase {
  mode: "name";
  svg: string;
}

/** Here is a name — which of these is it? */
export interface StructureQuestion extends QuestionBase {
  mode: "structure";
  name: string;
  choices: Array<{ id: number; svg: string }>;
}

export type Question = NameQuestion | StructureQuestion;

/** How many structures to offer in the multiple choice. */
const CHOICE_COUNT = 4;

export interface Verdict {
  correct: boolean;
  /** How close the answer was, in the terms that matter for naming. */
  outcome: "correct" | "wrong-configuration" | "different-compound" | "unreadable";
  message: string;
  /** The accepted name, revealed once the question is over. */
  answer: string;
  /** What the submitted name actually describes, when it describes something. */
  named?: string;
}

function matches(
  question: BankQuestion,
  category: string | null,
  difficulty: Difficulty | null,
): boolean {
  return (
    (!category || question.category === category) &&
    (!difficulty || question.difficulty === difficulty)
  );
}

function bankFor(category: string | null, difficulty: Difficulty | null): BankQuestion[] {
  return QUIZ_BANK.filter((question) => matches(question, category, difficulty));
}

export function countFor(category: string | null, difficulty: Difficulty | null): number {
  return bankFor(category, difficulty).length;
}

/**
 * Pick a question, avoiding ones already asked this session so a short run
 * does not repeat itself.
 */
export function pickQuestion(
  mode: QuizMode,
  category: string | null,
  difficulty: Difficulty | null,
  exclude: number[] = [],
): Question | null {
  const excluded = new Set(exclude);
  const matching: number[] = [];
  const unseen: number[] = [];
  QUIZ_BANK.forEach((question, index) => {
    if (!matches(question, category, difficulty)) return;
    matching.push(index);
    if (!excluded.has(index)) unseen.push(index);
  });
  if (matching.length === 0) return null;

  // Once every question in the pool has been asked, start over rather than
  // running out.
  const pool = unseen.length > 0 ? unseen : matching;
  const id = pool[Math.floor(Math.random() * pool.length)];
  return mode === "structure" ? describeChoice(id) : describeName(id);
}

function describeName(id: number): NameQuestion {
  const question = QUIZ_BANK[id];
  const drawing = depict(question.smiles, DEFAULT_DISPLAY);
  return {
    mode: "name",
    id,
    category: question.category,
    difficulty: question.difficulty,
    svg: drawing.svg,
    formula: drawing.formulaPlain,
    hints: hintsFor(question, drawing.formulaPlain, "name"),
  };
}

function describeChoice(id: number): StructureQuestion {
  const question = QUIZ_BANK[id];
  const formula = formulaOf(id);
  const options = [id, ...distractorsFor(id)];
  shuffle(options);

  return {
    mode: "structure",
    id,
    category: question.category,
    difficulty: question.difficulty,
    name: question.name,
    formula,
    hints: hintsFor(question, formula, "structure"),
    choices: options.map((choice) => ({
      id: choice,
      svg: depict(QUIZ_BANK[choice].smiles, DEFAULT_DISPLAY).svg,
    })),
  };
}

/** Molecular formulas, worked out once so distractors can be found by them. */
const FORMULA_INDEX = (() => {
  const byFormula = new Map<string, number[]>();
  const formulas: string[] = [];
  QUIZ_BANK.forEach((question, index) => {
    let formula = "";
    try {
      formula = depict(question.smiles, DEFAULT_DISPLAY).formulaPlain;
    } catch {
      formula = "";
    }
    formulas[index] = formula;
    if (!formula) return;
    const bucket = byFormula.get(formula);
    if (bucket) bucket.push(index);
    else byFormula.set(formula, [index]);
  });
  return { byFormula, formulas };
})();

function formulaOf(id: number): string {
  return FORMULA_INDEX.formulas[id] ?? "";
}

/**
 * The wrong answers to show alongside the right one.
 *
 * A distractor is only worth offering if it could plausibly be the compound
 * named, so true isomers come first: same formula, different connectivity, and
 * telling them apart is exactly the skill being practised. Only when there are
 * not enough of those does it fall back to structures of a similar size from
 * the same topic.
 */
function distractorsFor(id: number): number[] {
  const wanted = CHOICE_COUNT - 1;
  const question = QUIZ_BANK[id];
  const chosen: number[] = [];
  const taken = new Set([id]);

  const take = (candidates: number[]) => {
    const shuffled = [...candidates];
    shuffle(shuffled);
    for (const candidate of shuffled) {
      if (chosen.length >= wanted) return;
      if (taken.has(candidate)) continue;
      taken.add(candidate);
      chosen.push(candidate);
    }
  };

  take((FORMULA_INDEX.byFormula.get(formulaOf(id)) ?? []).filter((index) => index !== id));

  if (chosen.length < wanted) {
    const size = QUIZ_BANK[id].smiles.length;
    take(
      QUIZ_BANK.map((_, index) => index)
        .filter((index) => QUIZ_BANK[index].category === question.category)
        .sort(
          (a, b) =>
            Math.abs(QUIZ_BANK[a].smiles.length - size) -
            Math.abs(QUIZ_BANK[b].smiles.length - size),
        )
        .slice(0, 12),
    );
  }

  if (chosen.length < wanted) take(QUIZ_BANK.map((_, index) => index));

  return chosen;
}

function shuffle<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/** Substituent prefixes worth naming in a hint, longest first. */
const PREFIX_HINTS = [
  "trifluoromethyl",
  "cyclohexyl",
  "cyclopentyl",
  "isopropyl",
  "methoxy",
  "ethoxy",
  "propoxy",
  "phenyl",
  "benzyl",
  "methyl",
  "ethyl",
  "propyl",
  "butyl",
  "fluoro",
  "chloro",
  "bromo",
  "iodo",
  "hydroxy",
  "amino",
  "nitro",
  "cyano",
  "oxo",
];

const STEM_SIZES: Array<[string, string]> = [
  ["dodec", "twelve"],
  ["undec", "eleven"],
  ["dec", "ten"],
  ["non", "nine"],
  ["oct", "eight"],
  ["hept", "seven"],
  ["hex", "six"],
  ["pent", "five"],
  ["but", "four"],
  ["prop", "three"],
  ["eth", "two"],
  ["meth", "one"],
];

const FAMILY_HINTS: Array<[RegExp, string]> = [
  [/oic acid$|carboxylic acid$/, "a carboxylic acid"],
  [/oate$|yl .*oate$/, "an ester"],
  [/amide$/, "an amide"],
  [/nitrile$/, "a nitrile"],
  [/oyl chloride$|carbonyl chloride$/, "an acyl chloride"],
  [/al$/, "an aldehyde"],
  [/one$/, "a ketone"],
  [/ol$/, "an alcohol"],
  [/amine$/, "an amine"],
  [/ene$/, "an alkene"],
  [/yne$/, "an alkyne"],
  [/benzene$|phenol$|aniline$|toluene$|benzoic acid$|benzaldehyde$/, "an aromatic compound"],
  // These have to be tried before the plain alkane ending they both share.
  [/(chloro|bromo|fluoro|iodo)[a-z]*ane$/, "a haloalkane"],
  [/(methoxy|ethoxy|propoxy|butoxy)[a-z]*ane$/, "an ether"],
  [/ane$/, "an alkane"],
];

/**
 * Three hints that give away progressively more: what kind of compound it is,
 * then how big the parent is and what hangs off it, then the part that is
 * actually being tested.
 *
 * That last hint differs by direction. Naming a structure, the hard part is
 * the locants, so it shows the name with only its numbers removed. Picking a
 * structure, the name is already on screen — so the useful hint is what to
 * count on each option to tell them apart.
 */
function hintsFor(question: BankQuestion, formula: string, mode: QuizMode): string[] {
  const name = question.name;
  const hints: string[] = [];

  const family = FAMILY_HINTS.find(([pattern]) => pattern.test(name))?.[1];
  hints.push(
    family
      ? `${formula} — it is ${family}.`
      : `${formula} — work out the principal characteristic group first.`,
  );

  const substituents = substituentsIn(name);
  const parent = describeParent(name);
  hints.push(
    substituents.length > 0
      ? `${parent} Substituents to place: ${listOf(substituents)}.`
      : `${parent} There are no substituent prefixes to place.`,
  );

  if (mode === "name") {
    hints.push(`The name is "${name.replace(/\d/g, "?")}" — only the numbers are missing.`);
    return hints;
  }

  const locants = [...new Set(name.match(/\d/g) ?? [])].sort();
  hints.push(
    locants.length > 0
      ? `Number the parent chain of each option and look at position${locants.length > 1 ? "s" : ""} ${listOf(locants)} — only one option has everything in the right place.`
      : "There are no locants to check, so tell the options apart by their skeletons alone.",
  );

  return hints;
}

/** Ring parents that are named as a whole rather than by a carbon count. */
const RING_PARENTS: Array<[string, string]> = [
  ["naphthalene", "The parent is a naphthalene ring system."],
  ["benzaldehyde", "The parent is a benzene ring carrying the aldehyde."],
  ["benzoic acid", "The parent is a benzene ring carrying the acid."],
  ["benzene", "The parent is a benzene ring."],
  ["phenol", "The parent is a benzene ring carrying the hydroxyl."],
  ["aniline", "The parent is a benzene ring carrying the amine."],
  ["toluene", "The parent is a methylbenzene ring."],
  ["pyridine", "The parent is a pyridine ring."],
];

/**
 * What the parent hydride is, said in the terms the reader has to work out.
 *
 * The stem has to be looked for in the parent part of the name only. Searching
 * the whole string finds "eth" inside the "ethyl" of ethylbenzene and reports
 * a two-carbon chain that is not there.
 */
function describeParent(name: string): string {
  const ring = RING_PARENTS.find(([word]) => name.endsWith(word));
  if (ring) return ring[1];

  // An ester names two parents. The acid half is the one the suffix belongs
  // to, so that is the chain worth pointing at.
  const ester = /^\S+yl (\S+oate)$/.exec(name);
  let remainder = ester ? ester[1] : name;
  for (const prefix of PREFIX_HINTS) {
    remainder = remainder.replace(
      new RegExp(`(^|[^a-z])(di|tri|tetra|penta|hexa)?${prefix}`, "g"),
      "$1",
    );
  }

  const stem = parentStem(remainder);
  if (!stem) return "Start by finding the longest chain that carries the principal group.";
  const kind = /cyclo/.test(remainder) ? "ring" : "chain";
  return `The parent ${kind} has ${stem} carbon${stem === "one" ? "" : "s"}.`;
}

/**
 * The parent's size, read from the stem that carries the hydride ending.
 *
 * Looking for a bare stem anywhere in the name finds the wrong one constantly:
 * "cyclohexanone" contains "non", and "methanamine" contains "eth". A parent
 * stem is always followed by "an", "en" or "yn", and where two still overlap
 * the one that starts earlier is the parent.
 */
function parentStem(text: string): string | null {
  let best: { at: number; stem: string; words: string } | null = null;
  for (const [stem, words] of STEM_SIZES) {
    const at = text.search(new RegExp(`${stem}(an|en|yn)`));
    if (at < 0) continue;
    if (!best || at < best.at || (at === best.at && stem.length > best.stem.length)) {
      best = { at, stem, words };
    }
  }
  return best?.words ?? null;
}

const MULTIPLIER_COUNTS: Record<string, number> = { di: 2, tri: 3, tetra: 4, penta: 5, hexa: 6 };

/**
 * The substituent prefixes a name actually contains.
 *
 * A plain substring test is wrong in both directions: "methyl" ends with
 * "ethyl", so 2-methylpropanal would be reported as carrying both, and
 * "dimethyl" hides the "methyl" behind a multiplier. The prefix has to start
 * at a word boundary, optionally after a multiplying prefix — which also says
 * how many of them there are.
 */
function substituentsIn(name: string): string[] {
  const found: string[] = [];
  for (const prefix of PREFIX_HINTS) {
    const match = new RegExp(`(?:^|[^a-z])(di|tri|tetra|penta|hexa)?${prefix}`).exec(name);
    if (!match) continue;
    const count = match[1] ? MULTIPLIER_COUNTS[match[1]] : 1;
    found.push(count > 1 ? `${prefix} (×${count})` : prefix);
  }
  return found;
}

function listOf(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Mark a chosen structure. The comparison is by structure rather than by id, so
 * a distractor that happens to be the same compound would still count.
 */
export function checkChoice(id: number, choice: number): Verdict {
  const question = QUIZ_BANK[id];
  if (!question) {
    return {
      correct: false,
      outcome: "unreadable",
      message: "That question is no longer available.",
      answer: "",
    };
  }

  // A choice outside the offered set is the "show me" button, not a guess.
  const picked = QUIZ_BANK[choice];
  if (!picked) {
    return {
      correct: false,
      outcome: "different-compound",
      message: "Here is the answer.",
      answer: question.name,
    };
  }

  const correct = structureKey(picked.smiles) === structureKey(question.smiles);
  return {
    correct,
    outcome: correct ? "correct" : "different-compound",
    message: correct
      ? "Correct."
      : "That is a different compound — compare where the groups sit along the chain.",
    answer: question.name,
    named: correct ? undefined : picked.name,
  };
}

/** Mark an answer by resolving it and comparing structures. */
export async function checkAnswer(id: number, answer: string): Promise<Verdict> {
  const question = QUIZ_BANK[id];
  if (!question) {
    return {
      correct: false,
      outcome: "unreadable",
      message: "That question is no longer available.",
      answer: "",
    };
  }

  const cleaned = answer.trim();
  if (!cleaned) {
    return {
      correct: false,
      outcome: "unreadable",
      message: "Type a name first.",
      answer: question.name,
    };
  }

  let resolved;
  try {
    resolved = await resolveQuery(cleaned);
  } catch {
    return {
      correct: false,
      outcome: "unreadable",
      message: "That is not a name any of the resolvers recognise — check the spelling.",
      answer: question.name,
      named: undefined,
    };
  }

  const submitted = constitutionKey(resolved.smiles);
  const expected = constitutionKey(question.smiles);
  if (!submitted || !expected) {
    return {
      correct: false,
      outcome: "unreadable",
      message: "That name could not be turned into a structure.",
      answer: question.name,
    };
  }

  if (submitted !== expected) {
    return {
      correct: false,
      outcome: "different-compound",
      message: "That names a different compound.",
      answer: question.name,
      named: resolved.iupacName ?? resolved.title,
    };
  }

  // Same skeleton. If the question's structure pins down stereochemistry, the
  // answer has to as well.
  const questionHasStereo = /[@/\\]/.test(question.smiles);
  if (questionHasStereo) {
    const exact = structureKey(resolved.smiles) === structureKey(question.smiles);
    if (!exact) {
      return {
        correct: false,
        outcome: "wrong-configuration",
        message:
          "Right skeleton, but the configuration does not match — check the E/Z or R/S descriptor.",
        answer: question.name,
      };
    }
  }

  return {
    correct: true,
    outcome: "correct",
    message: "Correct.",
    answer: question.name,
  };
}
