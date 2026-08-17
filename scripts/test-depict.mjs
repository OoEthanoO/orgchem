/**
 * Checks the drawing and the property sheet.
 *
 * Most of the numbers come from OpenChemLib, but the ones stated here are the
 * ones a reader would check by hand — degrees of unsaturation is this file's
 * own arithmetic — and the drawing has to arrive as the page expects it:
 * themed through CSS variables, with the depictor's own stylesheet stripped
 * out so one set of rules serves every structure.
 */
import { DEFAULT_DISPLAY, depict } from "../src/lib/depict.ts";

const failures = [];
let pass = 0;
const check = (what, ok, detail = "") => (ok ? pass++ : failures.push(`${what}${detail && `: ${detail}`}`));

/** [smiles, formula, degrees of unsaturation, rings, aromatic rings, heavy atoms] */
const CASES = [
  ["c1ccccc1", "C6H6", 4, 1, 1, 6],
  ["c1ccc2ccccc2c1", "C10H8", 7, 2, 2, 10],
  ["C1CCCCC1", "C6H12", 1, 1, 0, 6],
  ["CCO", "C2H6O", 0, 0, null, 3],
  ["C#C", "C2H2", 2, 0, null, 2],
  ["CC(C)=O", "C3H6O", 1, 0, null, 4],
  ["ClC(Cl)Cl", "CHCl3", 0, 0, null, 4],
  ["NCC(=O)O", "C2H5NO2", 1, 0, null, 5],
  ["OCC1OC(O)C(O)C(O)C1O", "C6H12O6", 1, 1, 0, 12],
  ["CC(=O)Oc1ccccc1C(=O)O", "C9H8O4", 6, 1, 1, 13],
  ["Cn1cnc2c1c(=O)n(C)c(=O)n2C", "C8H10N4O2", 6, 2, null, 14],
  // The charges of a nitro group cancel in the count, as they must: the ring
  // and the double bond are still all there is to find.
  ["[O-][N+](=O)c1ccccc1", "C6H5NO2", 5, 1, 1, 9],
  ["CC(C)CCCC(C)C1CCC2C1(CCC3C2CC=C4C3(CCC(C4)O)C)C", "C27H46O", 5, 4, 0, 28],
];

for (const [smiles, formula, unsaturation, rings, aromatic, heavy] of CASES) {
  const drawing = depict(smiles, DEFAULT_DISPLAY);
  const value = (label) => drawing.properties.find((p) => p.label === label)?.value;

  check(`${formula}: formula`, drawing.formulaPlain === formula, drawing.formulaPlain);
  check(
    `${formula}: degrees of unsaturation`,
    Number(value("Degrees of unsaturation")) === unsaturation,
    value("Degrees of unsaturation"),
  );
  check(`${formula}: rings`, Number(value("Rings")) === rings, value("Rings"));
  check(`${formula}: heavy atoms`, Number(value("Heavy atoms")) === heavy, value("Heavy atoms"));
  if (aromatic !== null) {
    check(
      `${formula}: aromatic rings`,
      Number(value("Aromatic rings")) === aromatic,
      value("Aromatic rings"),
    );
  }
}

// Degrees of unsaturation is only defined for the elements it was derived for,
// and a fraction would mean the formula was not a molecule.
const withSilicon = depict("C[Si](C)(C)C", DEFAULT_DISPLAY);
check(
  "no unsaturation count where the formula cannot support one",
  withSilicon.properties.every((p) => p.label !== "Degrees of unsaturation"),
);

// What the rest of the app reads off a depiction.
const salt = depict("[Na+].[Cl-]", DEFAULT_DISPLAY);
check("a salt is counted as two fragments", salt.fragmentCount === 2, String(salt.fragmentCount));

const group = depict("[CH2]CCCC", DEFAULT_DISPLAY);
check("a substituent group reports its open valence", group.openValences === 1, String(group.openValences));

const unspecified = depict("CC=CC", DEFAULT_DISPLAY);
check("an unspecified double bond is reported", unspecified.undefinedDoubleBonds === 1);
check("a specified one is not", depict("C/C=C/C", DEFAULT_DISPLAY).undefinedDoubleBonds === 0);
check("an unspecified stereocentre is reported", depict("CCC(C)O", DEFAULT_DISPLAY).undefinedStereocentres === 1);

// The drawing itself: themed, and free of the depictor's own stylesheet, which
// globals.css replaces so that one set of rules serves every structure.
const drawing = depict("CCO", DEFAULT_DISPLAY);
check("the drawing is an SVG", /^<svg[\s>]/.test(drawing.svg.trim()), drawing.svg.slice(0, 40));
check("bond colours are theme variables", drawing.svg.includes("var(--mol-bond)"));
check("element colours are theme variables", drawing.svg.includes("var(--mol-o)"));
check("no hard-coded black", !/#000000|stroke="black"/.test(drawing.svg));
check("the depictor's stylesheet is stripped", !drawing.svg.includes("<style"));

const labelled = depict("CCO", {
  showHydrogens: true,
  showCarbons: true,
  showAtomNumbers: true,
  showStereoLabels: false,
});
check("hydrogens can be drawn", />H</.test(labelled.svg));
check("carbons can be labelled", /> C </.test(labelled.svg) || />C</.test(labelled.svg));
check("atoms can be numbered", />1</.test(labelled.svg));

// An empty or unreadable structure has to fail rather than draw nothing, which
// is what lets the resolver try the next reading of the input. Malformed
// SMILES that OpenChemLib salvages an atom from is not this test's business —
// the resolver refuses those before they reach here.
for (const bad of ["", "not a structure"]) {
  let threw = false;
  try {
    depict(bad, DEFAULT_DISPLAY);
  } catch {
    threw = true;
  }
  check(`"${bad}" is refused`, threw);
}

console.log(`${pass}/${pass + failures.length} passed`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
