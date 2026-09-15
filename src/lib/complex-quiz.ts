import "server-only";

import { randomBytes } from "node:crypto";

import { complexKey, complexSvg, parseComplex, type CoordinationComplex } from "./complexes";
import type { Category, Difficulty, NameQuestion, QuizMode, StructureQuestion, Verdict } from "./quiz";

export const COMPLEX_CATEGORIES: Category[] = [
  { id: "single-ligand", label: "One ligand type", blurb: "ligand prefixes, ion charge and metal oxidation states" },
  { id: "mixed-ligands", label: "Mixed ligands", blurb: "alphabetical order and different ligand charges" },
  { id: "chelates", label: "Chelates", blurb: "ligands with more than one donor atom" },
  { id: "salts", label: "Complex salts", blurb: "complex ions and their counterions" },
];

export const COMPLEX_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const COMPLEX_QUIZ_MODES: QuizMode[] = ["name", "structure"];

interface BankEntry {
  name: string;
  category: string;
  difficulty: Difficulty;
}

// Names describe composition only: no cis/trans or fac/mer configuration is
// implied by either a formula or the deliberately schematic ligand drawing.
export const COMPLEX_QUIZ_BANK: BankEntry[] = [
  { name: "hexaaquachromium(III)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaaquacobalt(II)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaaquairon(II)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaaquairon(III)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaaquanickel(II)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaaquacopper(II)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaamminecobalt(III)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaamminechromium(III)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaamminenickel(II)", category: "single-ligand", difficulty: "easy" },
  { name: "diamminesilver(I)", category: "single-ligand", difficulty: "easy" },
  { name: "tetraamminecopper(II)", category: "single-ligand", difficulty: "easy" },
  { name: "tetrachloridozincate(II)", category: "single-ligand", difficulty: "medium" },
  { name: "tetrachloridocobaltate(II)", category: "single-ligand", difficulty: "medium" },
  { name: "tetracyanidonickelate(II)", category: "single-ligand", difficulty: "medium" },
  { name: "hexacyanidoferrate(II)", category: "single-ligand", difficulty: "medium" },
  { name: "hexacyanidoferrate(III)", category: "single-ligand", difficulty: "medium" },
  { name: "hexachloridoplatinate(IV)", category: "single-ligand", difficulty: "hard" },
  { name: "triamminetriaquachromium(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaamminechloridocobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "tetraamminedichloridocobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaaquachloridochromium(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "tetraaquadichloridochromium(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "diamminedichloridoplatinum(II)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaammineaquacobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "amminetrichloridoplatinate(II)", category: "mixed-ligands", difficulty: "hard" },
  { name: "tris(ethane-1,2-diamine)cobalt(III)", category: "chelates", difficulty: "hard" },
  { name: "tris(ethane-1,2-diamine)nickel(II)", category: "chelates", difficulty: "hard" },
  { name: "trioxalatoferrate(III)", category: "chelates", difficulty: "hard" },
  { name: "trioxalatochromate(III)", category: "chelates", difficulty: "hard" },
  { name: "potassium hexacyanidoferrate(II)", category: "salts", difficulty: "hard" },
  { name: "potassium hexacyanidoferrate(III)", category: "salts", difficulty: "hard" },
  { name: "potassium tetrachloridoplatinate(II)", category: "salts", difficulty: "hard" },
  { name: "potassium hexachloridoplatinate(IV)", category: "salts", difficulty: "hard" },
  { name: "sodium tetrachloridozincate(II)", category: "salts", difficulty: "hard" },
  { name: "hexaamminecobalt(III) chloride", category: "salts", difficulty: "hard" },
  { name: "pentaamminechloridocobalt(III) chloride", category: "salts", difficulty: "hard" },
  { name: "tetraamminedichloridocobalt(III) chloride", category: "salts", difficulty: "hard" },
  { name: "potassium trioxalatoferrate(III)", category: "salts", difficulty: "hard" },
];

export type ComplexQuestion = NameQuestion | (Omit<StructureQuestion, "choices"> & {
  choices: Array<{ svg: string; formula: string }>;
});

export type ComplexVerdict = Verdict & { formula?: string };

const complexes = new Map<number, CoordinationComplex>();

function complexFor(id: number): CoordinationComplex {
  const cached = complexes.get(id);
  if (cached) return cached;
  const parsed = parseComplex(COMPLEX_QUIZ_BANK[id].name);
  if (!parsed) throw new Error(`Invalid complex practice entry: ${COMPLEX_QUIZ_BANK[id].name}`);
  complexes.set(id, parsed);
  return parsed;
}

function matches(entry: BankEntry, category: string | null, difficulty: Difficulty | null) {
  return (!category || category === entry.category) && (!difficulty || difficulty === entry.difficulty);
}

export function countComplexQuestions(category: string | null, difficulty: Difficulty | null): number {
  return COMPLEX_QUIZ_BANK.filter((entry) => matches(entry, category, difficulty)).length;
}

export function pickComplexQuestion(
  mode: QuizMode,
  category: string | null,
  difficulty: Difficulty | null,
  exclude: number[] = [],
): ComplexQuestion | null {
  const matching = COMPLEX_QUIZ_BANK.flatMap((entry, id) => matches(entry, category, difficulty) ? [id] : []);
  const excluded = new Set(exclude);
  const unseen = matching.filter((id) => !excluded.has(id));
  const pool = unseen.length ? unseen : matching;
  if (!pool.length) return null;
  const id = pool[Math.floor(Math.random() * pool.length)];
  const entry = COMPLEX_QUIZ_BANK[id];
  const complex = complexFor(id);
  const base = { id, category: entry.category, difficulty: entry.difficulty, hints: hintsFor(complex, mode) };

  if (mode === "name") {
    return { ...base, mode, formula: complex.formula, svg: complexSvg(complex) };
  }

  const nonce = randomBytes(16).toString("hex");
  return {
    ...base,
    mode,
    name: complex.canonicalName,
    // Sending the correct formula here would reveal which option to choose.
    // It is returned with the verdict after an answer or a reveal request.
    formula: "",
    nonce,
    choices: optionsFor(id, nonce).map((option) => {
      const candidate = complexFor(option);
      return { svg: complexSvg(candidate), formula: candidate.formula };
    }),
  };
}

function hintsFor(complex: CoordinationComplex, mode: QuizMode): string[] {
  if (mode === "structure") {
    return [
      "Read each ligand's multiplying prefix, then count that ligand inside the brackets of each option.",
      "The Roman numeral is the metal's oxidation state. Add the ligand charges to it to find the complex ion's charge.",
      complex.counterion
        ? "The ions outside the brackets are counterions. Their total charge must balance the complex ions."
        : "Check the metal symbol as well as every ligand and the overall charge; matching just one ligand is not enough.",
    ];
  }
  const ligandCharge = complex.ligands.reduce((sum, ligand) => sum + ligand.count * ligand.charge, 0);
  return [
    "Name the ligands first: NH3 is ammine and H2O is aqua. Count ligands, rather than individual atoms, for the multiplying prefixes.",
    `The ligands together have charge ${ligandCharge}. Metal oxidation state + (${ligandCharge}) = the complex ion's charge (${complex.charge}). Write the oxidation state as a Roman numeral.`,
    complex.counterion
      ? "Name the cation before the anion. Within a complex, alphabetize ligand names without their multiplying prefixes; a complex anion uses a metal name ending in -ate."
      : complex.charge < 0
        ? "Alphabetize the ligand names without their multiplying prefixes. This is a complex anion, so the metal name ends in -ate (iron becomes ferrate)."
        : "Alphabetize the ligand names without their multiplying prefixes, then add the metal name and its oxidation state. Chelating ethane-1,2-diamine uses bis or tris with parentheses.",
  ];
}

function randomFrom(seed: string): () => number {
  let state = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) state = Math.imul(state ^ seed.charCodeAt(index), 0x01000193);
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 0x100000000;
  };
}

function shuffle<T>(items: T[], random: () => number) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function optionsFor(id: number, nonce: string): number[] {
  const random = randomFrom(`${id}:${nonce}`);
  const expected = complexFor(id);
  const available = COMPLEX_QUIZ_BANK.map((_, index) => index).filter((index) => index !== id);
  // Prefer the same metal so learners must inspect ligand counts and charges.
  // All candidates are identities from the curated bank, never invented salts.
  const preferred = shuffle(available.filter((index) => complexFor(index).metal.symbol === expected.metal.symbol), random);
  const fallback = shuffle(available.filter((index) => !preferred.includes(index)), random);
  const identities = new Set([complexKey(expected)]);
  const options = [id];
  for (const candidate of [...preferred, ...fallback]) {
    const key = complexKey(complexFor(candidate));
    if (identities.has(key)) continue;
    identities.add(key);
    options.push(candidate);
    if (options.length === 4) break;
  }
  return shuffle(options, random);
}

function unavailable(): ComplexVerdict {
  return { correct: false, outcome: "unreadable", message: "That question is no longer available.", answer: "" };
}

export function checkComplexAnswer(id: number, answer: string): ComplexVerdict {
  if (!Number.isInteger(id) || !COMPLEX_QUIZ_BANK[id]) return unavailable();
  const expected = complexFor(id);
  const revealed = { answer: expected.canonicalName, formula: expected.formula };
  const cleaned = answer.trim();
  if (!cleaned) return { ...revealed, correct: false, outcome: "unreadable", message: "Here is the name." };

  // A formula identifies the entity but does not answer a naming exercise.
  const submitted = /\[|\]/.test(cleaned) ? null : parseComplex(cleaned);
  if (!submitted) {
    return { ...revealed, correct: false, outcome: "unreadable", message: "That name was not recognized. Check the ligand spelling, prefixes and Roman numeral." };
  }
  const correct = complexKey(submitted) === complexKey(expected);
  return {
    ...revealed,
    correct,
    outcome: correct ? "correct" : "different-compound",
    message: correct
      ? "That names the complex shown."
      : "That describes a different complex. Check ligand counts, metal oxidation state and any counterions.",
    named: correct ? undefined : submitted.canonicalName,
  };
}

export function checkComplexChoice(id: number, choice: number, nonce: string): ComplexVerdict {
  if (!Number.isInteger(id) || !COMPLEX_QUIZ_BANK[id]) return unavailable();
  const expected = complexFor(id);
  const options = optionsFor(id, nonce);
  const correctChoice = options.indexOf(id);
  const picked = Number.isInteger(choice) && choice >= 0 && choice < options.length ? complexFor(options[choice]) : null;
  const correct = picked !== null && complexKey(picked) === complexKey(expected);
  return {
    correct,
    outcome: correct ? "correct" : "different-compound",
    message: correct
      ? "That is the complex the name describes."
      : picked
        ? "Check the metal, ligand counts and charge against the name."
        : "Here is the complex the name describes.",
    answer: expected.canonicalName,
    formula: expected.formula,
    named: picked && !correct ? picked.canonicalName : undefined,
    correctChoice,
  };
}
