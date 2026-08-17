/**
 * How typed answers are marked, end to end.
 *
 * The offline suite cannot reach this: an answer is marked by resolving it
 * into a structure, which means OPSIN and PubChem, so it is checked against a
 * running app instead.
 *
 * Needs the dev server running: node scripts/test-marking.mjs
 */
import { QUIZ_BANK } from "../src/lib/quiz-bank.ts";
import { DEFAULT_DISPLAY, depict } from "../src/lib/depict.ts";

const BASE = process.env.ORGCHEM_URL ?? "http://localhost:3000";

const indexOfName = (name) => QUIZ_BANK.findIndex((entry) => entry.name === name);

/** The first entry whose structure leaves the thing named open. */
function indexWhere(predicate) {
  return QUIZ_BANK.findIndex((entry) => {
    try {
      return predicate(depict(entry.smiles, DEFAULT_DISPLAY), entry);
    } catch {
      return false;
    }
  });
}

const flatGeometry = indexWhere((drawing) => drawing.undefinedDoubleBonds > 0);
const flatCentre = indexWhere((drawing, entry) => drawing.undefinedStereocentres > 0 && !/[/\\]/.test(entry.smiles));
const fixedStereo = QUIZ_BANK.findIndex((entry) => /[/\\]/.test(entry.smiles));
const plain = indexOfName("cyclohexanol");

/**
 * Each case is a question, an answer, and what should come back. `message` is
 * matched loosely: the wording is meant to be edited, the substance is not.
 */
const CASES = [
  {
    what: "its own name is accepted",
    id: plain,
    answer: "cyclohexanol",
    correct: true,
    outcome: "correct",
  },
  {
    what: "another valid name is accepted, and says which one is on file",
    id: plain,
    answer: "cyclohexan-1-ol",
    correct: true,
    outcome: "correct",
    message: /on file as cyclohexanol/,
  },
  {
    what: "a different compound is refused",
    id: plain,
    answer: "cyclohexanone",
    correct: false,
    outcome: "different-compound",
    named: /cyclohexanone/,
  },
  {
    what: "an unresolvable answer is refused as unreadable",
    id: plain,
    answer: "zzzzz not a compound",
    correct: false,
    outcome: "unreadable",
  },
  {
    what: "a blank answer asks for the name rather than scoring a try",
    id: plain,
    answer: "",
    correct: false,
    outcome: "unreadable",
    answerShown: "cyclohexanol",
  },
  // The two directions stereochemistry can be wrong in. A drawing that fixes
  // the configuration demands it back; one that does not cannot be read as
  // fixing it either.
  {
    what: "a name without the descriptor the drawing fixes is a near miss",
    id: fixedStereo,
    answer: () => QUIZ_BANK[fixedStereo].name.replace(/^\((\d*[EZRS],?)+\)-/, ""),
    correct: false,
    outcome: "wrong-configuration",
  },
  {
    what: "geometry the drawing does not fix is accepted, and said so",
    id: flatGeometry,
    answer: () => `(E)-${QUIZ_BANK[flatGeometry].name}`,
    correct: true,
    outcome: "correct",
    message: /cis or trans/,
  },
  {
    what: "a configuration the drawing does not fix is accepted, and said so",
    id: flatCentre,
    answer: () => `(R)-${QUIZ_BANK[flatCentre].name}`,
    correct: true,
    outcome: "correct",
    message: /enantiomer/,
  },
];

const failures = [];
let pass = 0;

for (const testCase of CASES) {
  if (testCase.id < 0) {
    failures.push(`${testCase.what}: the bank has nothing to ask it with`);
    continue;
  }
  const answer = typeof testCase.answer === "function" ? testCase.answer() : testCase.answer;

  let verdict;
  try {
    const response = await fetch(`${BASE}/api/quiz`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: testCase.id, answer }),
      signal: AbortSignal.timeout(30000),
    });
    verdict = await response.json();
  } catch (error) {
    failures.push(`${testCase.what}: ${error.name}`);
    continue;
  }

  const wrong = [];
  if (verdict.correct !== testCase.correct) wrong.push(`correct ${verdict.correct}`);
  if (verdict.outcome !== testCase.outcome) wrong.push(`outcome ${verdict.outcome}`);
  if (testCase.message && !testCase.message.test(verdict.message ?? "")) {
    wrong.push(`message ${JSON.stringify(verdict.message)}`);
  }
  if (testCase.named && !testCase.named.test(verdict.named ?? "")) {
    wrong.push(`named ${JSON.stringify(verdict.named)}`);
  }
  if (testCase.answerShown && verdict.answer !== testCase.answerShown) {
    wrong.push(`answer ${JSON.stringify(verdict.answer)}`);
  }

  if (wrong.length) failures.push(`${testCase.what} (${JSON.stringify(answer)}): ${wrong.join(", ")}`);
  else pass++;
}

console.log(`${pass}/${CASES.length} marked as intended`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
