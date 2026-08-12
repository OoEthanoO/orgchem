/**
 * Double bonds must be drawn as two parallel strokes in every render path.
 *
 * The depictor crosses the strokes when a bond's geometry is undefined. The
 * page says that in words instead, so every path has to undo the crossing —
 * and the fix once lived in the main drawing only, leaving the isomer
 * thumbnails showing an X that reads as a rendering fault.
 *
 * This measures the angle between the strokes rather than trusting a flag,
 * because that is what a reader actually sees.
 */
import { DEFAULT_DISPLAY, depict, thumbnail } from "../src/lib/depict.ts";

/** Largest angle between any two strokes close enough to be one double bond. */
function worstStrokeAngle(svg) {
  const lines = (svg.match(/<line (?!id)[^>]*\/>/g) ?? []).map((line) => {
    const g = line.match(/x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/);
    return { x1: +g[1], y1: +g[2], x2: +g[3], y2: +g[4] };
  });
  let worst = 0;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = lines[i];
      const b = lines[j];
      const gap = Math.hypot((a.x1 + a.x2) / 2 - (b.x1 + b.x2) / 2, (a.y1 + a.y2) / 2 - (b.y1 + b.y2) / 2);
      if (gap > 14) continue;
      let angle =
        (Math.abs(Math.atan2(a.y2 - a.y1, a.x2 - a.x1) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) * 180) /
        Math.PI;
      if (angle > 90) angle = 180 - angle;
      worst = Math.max(worst, angle);
    }
  }
  return worst;
}

// Structures whose double-bond geometry the input leaves open, which is when
// the depictor reaches for the crossed bond.
const UNDEFINED_GEOMETRY = [
  "CC=CC",
  "CC=C(Cl)CO",
  "OCC(Cl)=CC",
  "CC=CC(Cl)O",
  "CCC=CCC",
  "CCCCCCCCC=CCCCCCCCC(=O)O",
  "CC=CC=CC",
];

// And ones that fix it, which must still be drawn correctly.
const DEFINED_GEOMETRY = ["C/C=C/C", "C/C=C\\C", "C/C=C(\\CO)/Cl", "O=C/C=C/c1ccccc1"];

const failures = [];
let pass = 0;

for (const smiles of [...UNDEFINED_GEOMETRY, ...DEFINED_GEOMETRY]) {
  for (const [path, svg] of [
    ["main drawing", depict(smiles, DEFAULT_DISPLAY).svg],
    ["thumbnail", thumbnail(smiles)],
    ["with hydrogens", depict(smiles, { ...DEFAULT_DISPLAY, showHydrogens: true }).svg],
    ["with carbon labels", depict(smiles, { ...DEFAULT_DISPLAY, showCarbons: true }).svg],
  ]) {
    if (!svg) {
      failures.push(`${smiles} (${path}): nothing rendered`);
      continue;
    }
    const angle = worstStrokeAngle(svg);
    if (angle > 5) failures.push(`${smiles} (${path}): strokes ${angle.toFixed(1)}° apart`);
    else pass++;
  }
}

console.log(`${pass}/${pass + failures.length} passed`);
if (failures.length) {
  console.log("\nFAILURES:\n  " + failures.join("\n  "));
  process.exit(1);
}
