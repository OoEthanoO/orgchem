/**
 * The resolver takes free text from a search box, so it has to survive
 * anything typed into one: empty strings, punctuation, other scripts, pasted
 * code, absurd formulas. None of it should reach the user as a 500, and none
 * should hang.
 *
 * Needs the dev server running: node scripts/test-robustness.mjs
 */
const BASE = process.env.ORGCHEM_URL ?? "http://localhost:3000";

const CASES = [
  // Nothing, or nearly nothing.
  "",
  "   ",
  "?",
  "!!!",
  "0",
  "-",
  "()",
  // Unbalanced or truncated structure syntax.
  "((((",
  "))))",
  "C(",
  "[",
  "]",
  "(((CH3)))",
  "C[C@H](N)",
  // Very long inputs.
  "a".repeat(200),
  "C".repeat(300),
  "CH3".repeat(60),
  "CH3(CH2)999CH3",
  // Things that are not chemistry at all.
  "<script>alert(1)</script>",
  "'; DROP TABLE compounds;--",
  "../../etc/passwd",
  "the quick brown fox",
  "benzene benzene",
  "1,2,3,4,5,6",
  // Other scripts and symbols.
  "水",
  "café",
  "Ω",
  // Prefixes with nothing after them.
  "smiles:",
  "name:",
  "formula:",
  "inchi:",
  "smiles:))))",
  // Formulas that are syntactically fine and chemically absurd.
  "C6H6O600",
  "C99999H1",
  "H",
  "X",
  "Xx1",
];

const failures = [];
let handled = 0;

for (const query of CASES) {
  const label = JSON.stringify(query).slice(0, 36);
  try {
    const response = await fetch(`${BASE}/api/resolve?q=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.json();
    if (response.status >= 500) {
      failures.push(`${label}: HTTP ${response.status}`);
    } else if (!body.error && !body.smiles) {
      failures.push(`${label}: neither a structure nor an error`);
    } else {
      handled++;
    }
  } catch (error) {
    failures.push(`${label}: ${error.name}`);
  }
}

console.log(`${handled}/${CASES.length} handled cleanly`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
