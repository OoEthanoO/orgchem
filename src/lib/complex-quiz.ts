import "server-only";

import { randomBytes } from "node:crypto";

import { complexKey, complexSvg, parseComplex, type CoordinationComplex } from "./complexes";
import type { Category, CategorySelection, Difficulty, NameQuestion, QuizMode, StructureQuestion, Verdict } from "./quiz";

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
// Hard combines naming decisions: charged and neutral ligands with chelates,
// salt balance, three ligand types or an anionic metal name; charged-chelate
// salts; or negative oxidation states together with counterions. A rare metal,
// a single ligand prefix or an ordinary one-ligand salt is not enough.
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
  { name: "hexachloridoplatinate(IV)", category: "single-ligand", difficulty: "medium" },
  { name: "triamminetriaquachromium(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaamminechloridocobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "tetraamminedichloridocobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaaquachloridochromium(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "tetraaquadichloridochromium(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "diamminedichloridoplatinum(II)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaammineaquacobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "amminetrichloridoplatinate(II)", category: "mixed-ligands", difficulty: "hard" },
  { name: "tris(ethane-1,2-diamine)cobalt(III)", category: "chelates", difficulty: "medium" },
  { name: "tris(ethane-1,2-diamine)nickel(II)", category: "chelates", difficulty: "medium" },
  { name: "trioxalatoferrate(III)", category: "chelates", difficulty: "medium" },
  { name: "trioxalatochromate(III)", category: "chelates", difficulty: "medium" },
  { name: "potassium hexacyanidoferrate(II)", category: "salts", difficulty: "medium" },
  { name: "potassium hexacyanidoferrate(III)", category: "salts", difficulty: "medium" },
  { name: "potassium tetrachloridoplatinate(II)", category: "salts", difficulty: "medium" },
  { name: "potassium hexachloridoplatinate(IV)", category: "salts", difficulty: "medium" },
  { name: "sodium tetrachloridozincate(II)", category: "salts", difficulty: "medium" },
  { name: "hexaamminecobalt(III) chloride", category: "salts", difficulty: "medium" },
  { name: "pentaamminechloridocobalt(III) chloride", category: "salts", difficulty: "hard" },
  { name: "tetraamminedichloridocobalt(III) chloride", category: "salts", difficulty: "hard" },
  { name: "potassium trioxalatoferrate(III)", category: "salts", difficulty: "hard" },

  // Append-only: existing IDs are used by active practice sessions. Sources
  // and independently specified formula fixtures live in scripts/.
  { name: "hexaaquazinc(II)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaaquamanganese(II)", category: "single-ligand", difficulty: "easy" },
  { name: "tetraamminezinc(II)", category: "single-ligand", difficulty: "easy" },
  { name: "tetraammineplatinum(II)", category: "single-ligand", difficulty: "easy" },
  { name: "tetraamminepalladium(II)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaammineruthenium(III)", category: "single-ligand", difficulty: "easy" },
  { name: "hexaammineruthenium(II)", category: "single-ligand", difficulty: "easy" },
  { name: "tetracarbonylnickel(0)", category: "single-ligand", difficulty: "medium" },
  { name: "pentacarbonyliron(0)", category: "single-ligand", difficulty: "medium" },
  { name: "hexacarbonylchromium(0)", category: "single-ligand", difficulty: "medium" },
  { name: "hexacarbonylmolybdenum(0)", category: "single-ligand", difficulty: "medium" },
  { name: "hexacarbonyltungsten(0)", category: "single-ligand", difficulty: "medium" },
  { name: "dicyanidoargentate(I)", category: "single-ligand", difficulty: "medium" },
  { name: "dicyanidoaurate(I)", category: "single-ligand", difficulty: "medium" },
  { name: "tetracyanidocuprate(I)", category: "single-ligand", difficulty: "medium" },
  { name: "hexacyanidocobaltate(III)", category: "single-ligand", difficulty: "medium" },
  { name: "tetrachloridoaurate(III)", category: "single-ligand", difficulty: "medium" },
  { name: "tetrachloridopalladate(II)", category: "single-ligand", difficulty: "medium" },
  { name: "tetrachloridoplatinate(II)", category: "single-ligand", difficulty: "medium" },
  { name: "hexachloridoiridate(III)", category: "single-ligand", difficulty: "medium" },
  { name: "hexachloridoiridate(IV)", category: "single-ligand", difficulty: "medium" },
  { name: "tetrahydroxidozincate(II)", category: "single-ligand", difficulty: "medium" },
  { name: "tetrabromidocobaltate(II)", category: "single-ligand", difficulty: "medium" },
  { name: "tetracarbonylcobaltate(-I)", category: "single-ligand", difficulty: "medium" },
  { name: "tetracarbonylferrate(-II)", category: "single-ligand", difficulty: "medium" },
  { name: "potassium dicyanidoargentate(I)", category: "salts", difficulty: "medium" },
  { name: "potassium dicyanidoaurate(I)", category: "salts", difficulty: "medium" },
  { name: "potassium hexacyanidocobaltate(III)", category: "salts", difficulty: "medium" },
  { name: "potassium tetrachloridoaurate(III)", category: "salts", difficulty: "medium" },
  { name: "sodium hexachloridoiridate(IV)", category: "salts", difficulty: "medium" },
  { name: "potassium hexachloridoiridate(IV)", category: "salts", difficulty: "medium" },
  { name: "tetraammineplatinum(II) chloride", category: "salts", difficulty: "medium" },
  { name: "hexaamminechromium(III) nitrate", category: "salts", difficulty: "medium" },
  { name: "sodium tetracarbonylcobaltate(-I)", category: "salts", difficulty: "hard" },
  { name: "sodium tetracarbonylferrate(-II)", category: "salts", difficulty: "hard" },
  { name: "pentaamminefluoridocobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaamminebromidocobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaammineiodidocobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaammineaquaruthenium(II)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaamminehydroxidocobalt(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "pentaamminechloridorhodium(III)", category: "mixed-ligands", difficulty: "medium" },
  { name: "tris(ethane-1,2-diamine)ruthenium(II)", category: "chelates", difficulty: "medium" },
  { name: "dichloridobis(ethane-1,2-diamine)cobalt(III)", category: "chelates", difficulty: "hard" },
  { name: "tris(ethane-1,2-diamine)chromium(III)", category: "chelates", difficulty: "medium" },
  { name: "tris(ethane-1,2-diamine)zinc(II)", category: "chelates", difficulty: "medium" },
  { name: "tris(ethane-1,2-diamine)copper(II)", category: "chelates", difficulty: "medium" },
  { name: "diaquabis(ethane-1,2-diamine)nickel(II)", category: "chelates", difficulty: "medium" },
  { name: "dichlorido(ethane-1,2-diamine)platinum(II)", category: "chelates", difficulty: "medium" },
  { name: "bis(ethane-1,2-diamine)platinum(II)", category: "chelates", difficulty: "medium" },
  { name: "diaquadioxalatochromate(III)", category: "chelates", difficulty: "hard" },
  { name: "diaquadioxalatocobaltate(II)", category: "chelates", difficulty: "hard" },
  { name: "trioxalatocobaltate(III)", category: "chelates", difficulty: "medium" },
  { name: "dichloridobis(ethane-1,2-diamine)cobalt(III) chloride", category: "salts", difficulty: "hard" },
  { name: "dichloridobis(ethane-1,2-diamine)cobalt(III) perchlorate", category: "salts", difficulty: "hard" },
  { name: "tris(ethane-1,2-diamine)zinc(II) sulfate", category: "salts", difficulty: "medium" },
  { name: "tris(ethane-1,2-diamine)copper(II) sulfate", category: "salts", difficulty: "medium" },
  { name: "tris(ethane-1,2-diamine)nickel(II) sulfate", category: "salts", difficulty: "medium" },
  { name: "potassium diaquadioxalatochromate(III)", category: "salts", difficulty: "hard" },
  { name: "potassium trioxalatocobaltate(III)", category: "salts", difficulty: "hard" },

  // Advanced compositions verified against the primary sources and literal
  // formula/charge fixtures in scripts/. Preserve the preceding 97 IDs.
  { name: "diamminedibromidodichloridoplatinum(IV)", category: "mixed-ligands", difficulty: "hard" },
  { name: "diamminedichloridodiiodidoplatinum(IV)", category: "mixed-ligands", difficulty: "hard" },
  { name: "triamminetrichloridoplatinum(IV) chloride", category: "salts", difficulty: "hard" },
  { name: "triamminetribromidoplatinum(IV) bromide", category: "salts", difficulty: "hard" },
  { name: "amminechloridobis(ethane-1,2-diamine)cobalt(III)", category: "chelates", difficulty: "hard" },
  { name: "amminechloridobis(ethane-1,2-diamine)cobalt(III) nitrate", category: "salts", difficulty: "hard" },
  { name: "aquachloridobis(ethane-1,2-diamine)cobalt(III)", category: "chelates", difficulty: "hard" },
  { name: "aquachloridobis(ethane-1,2-diamine)cobalt(III) sulfate", category: "salts", difficulty: "hard" },
  { name: "amminebromidobis(ethane-1,2-diamine)cobalt(III)", category: "chelates", difficulty: "hard" },
  { name: "amminebromidobis(ethane-1,2-diamine)cobalt(III) bromide", category: "salts", difficulty: "hard" },
  { name: "bis(ethane-1,2-diamine)oxalatocobalt(III)", category: "chelates", difficulty: "hard" },
  { name: "bis(ethane-1,2-diamine)oxalatocobalt(III) chloride", category: "salts", difficulty: "hard" },
  { name: "(ethane-1,2-diamine)dioxalatocobaltate(III)", category: "chelates", difficulty: "hard" },
  { name: "sodium (ethane-1,2-diamine)dioxalatocobaltate(III)", category: "salts", difficulty: "hard" },
  { name: "tetraammineoxalatocobalt(III)", category: "chelates", difficulty: "hard" },
  { name: "aquabis(ethane-1,2-diamine)hydroxidocobalt(III)", category: "chelates", difficulty: "hard" },
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

function matches(entry: BankEntry, category: CategorySelection, difficulty: Difficulty | null) {
  return (!category || (typeof category === "string"
    ? category === entry.category
    : category.length === 0 || category.includes(entry.category))) && (!difficulty || difficulty === entry.difficulty);
}

export function countComplexQuestions(category: CategorySelection, difficulty: Difficulty | null): number {
  return COMPLEX_QUIZ_BANK.filter((entry) => matches(entry, category, difficulty)).length;
}

export function pickComplexQuestion(
  mode: QuizMode,
  category: CategorySelection,
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
      "The metal's oxidation state is written as a Roman numeral, or 0 for zero; a minus sign indicates a negative oxidation state. Add the ligand charges to find the complex's overall charge.",
      complex.counterion
        ? "The ions outside the brackets are counterions. Their total charge must balance the complex ions."
        : "Check the metal symbol as well as every ligand and the overall charge; matching just one ligand is not enough.",
    ];
  }
  const ligandCharge = complex.ligands.reduce((sum, ligand) => sum + ligand.count * ligand.charge, 0);
  return [
    "Name the ligands first: NH3 is ammine and H2O is aqua. Count ligands, rather than individual atoms, for the multiplying prefixes.",
    `The ligands together have charge ${ligandCharge}. Metal oxidation state + (${ligandCharge}) = the complex's charge (${complex.charge}). Write 0 for zero oxidation state; otherwise use a Roman numeral, with a minus sign if negative.`,
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
  // All candidates are identities from the curated bank, never invented salts.
  // Hard keeps the closest compositions first; shuffle before sorting so ties
  // still vary by nonce and the marker can reconstruct the exact same options.
  const preferred = shuffle(available.filter((index) => complexFor(index).metal.symbol === expected.metal.symbol), random);
  const fallback = shuffle(available.filter((index) => !preferred.includes(index)), random);
  if (COMPLEX_QUIZ_BANK[id].difficulty === "hard") {
    preferred.sort((a, b) => compositionDistance(expected, complexFor(a)) - compositionDistance(expected, complexFor(b)));
    fallback.sort((a, b) => compositionDistance(expected, complexFor(a)) - compositionDistance(expected, complexFor(b)));
  }
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

/** Close distractors share ligand types and require checking counts or charge. */
function compositionDistance(expected: CoordinationComplex, candidate: CoordinationComplex): number {
  const wanted = new Map(expected.ligands.map((ligand) => [ligand.name, ligand.count]));
  const offered = new Map(candidate.ligands.map((ligand) => [ligand.name, ligand.count]));
  const names = new Set([...wanted.keys(), ...offered.keys()]);
  let distance = 0;
  for (const name of names) {
    // Changing a ligand type matters more than changing its multiplying prefix.
    if (!wanted.has(name) || !offered.has(name)) distance += 8;
    distance += Math.abs((wanted.get(name) ?? 0) - (offered.get(name) ?? 0));
  }
  if (Boolean(expected.counterion) !== Boolean(candidate.counterion)) distance += 5;
  if (expected.counterion?.formula !== candidate.counterion?.formula) distance += 2;
  distance += 4 * Math.abs(expected.coordinationNumber - candidate.coordinationNumber);
  distance += Math.min(4, Math.abs(expected.charge - candidate.charge));
  distance += 2 * Math.min(4, Math.abs(expected.oxidationState - candidate.oxidationState));
  return distance;
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
