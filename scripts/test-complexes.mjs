/** Offline chemistry checks, including independent charge / stoichiometry facts. */
import assert from "node:assert/strict";
import { parseComplex, looksLikeComplex, complexKey, complexSvg } from "../src/lib/complexes.ts";

const facts = [
  ["triamminetriaquachromium(iii)", "[Cr(NH3)3(H2O)3]^3+", 3, 3, 6],
  ["hexaamminecobalt(III)", "[Co(NH3)6]^3+", 3, 3, 6],
  ["diamminesilver(I)", "[Ag(NH3)2]^+", 1, 1, 2],
  ["tetraaquacopper(II)", "[Cu(H2O)4]^2+", 2, 2, 4],
  ["diamminedichloridoplatinum(II)", "[Pt(NH3)2Cl2]", 2, 0, 4],
  ["hexacyanidoferrate(II)", "[Fe(CN)6]^4-", 2, -4, 6],
  ["hexacyanidoferrate(III)", "[Fe(CN)6]^3-", 3, -3, 6],
  ["tetrachloridocobaltate(II)", "[CoCl4]^2-", 2, -2, 4],
  ["hexafluoridoaluminate(III)", null], // Unsupported metal, not a guessed parse.
  ["tetrahydroxidozincate(II)", "[Zn(OH)4]^2-", 2, -2, 4],
  ["tetracarbonylnickel(0)", "[Ni(CO)4]", 0, 0, 4],
  ["tris(ethane-1,2-diamine)cobalt(III)", "[Co(en)3]^3+", 3, 3, 6],
  ["trioxalatoferrate(III)", "[Fe(C2O4)3]^3-", 3, -3, 6],
  ["potassium hexacyanidoferrate(II)", "K4[Fe(CN)6]", 2, -4, 6],
  ["ammonium tetrachloridoplatinate(II)", "(NH4)2[PtCl4]", 2, -2, 4],
  ["hexaamminecobalt(III) chloride", "[Co(NH3)6]Cl3", 3, 3, 6],
  ["hexaamminecobalt(III) sulfate", "[Co(NH3)6]2(SO4)3", 3, 3, 6],
  ["calcium hexacyanidoferrate(III)", "Ca3[Fe(CN)6]2", 3, -3, 6],
  ["pentaammineaquacobalt(III) nitrate", "[Co(NH3)5(H2O)](NO3)3", 3, 3, 6],
  ["sodium trioxalatoferrate(III)", "Na3[Fe(C2O4)3]", 3, -3, 6],
];

let checks = 0;
for (const [name, formula, oxidation, charge, coordination] of facts) {
  const complex = parseComplex(name);
  if (formula === null) {
    assert.equal(complex, null, name);
    checks++;
    continue;
  }
  assert.ok(complex, name);
  assert.equal(complex.formula, formula, `${name}: formula`);
  assert.equal(complex.oxidationState, oxidation, `${name}: oxidation state`);
  assert.equal(complex.charge, charge, `${name}: charge`);
  assert.equal(complex.coordinationNumber, coordination, `${name}: donor count`);
  assert.equal(complexKey(parseComplex(formula)), complexKey(complex), `${name}: formula round trip`);
  assert.equal(complexKey(parseComplex(complex.canonicalName)), complexKey(complex), `${name}: name round trip`);
  if (complex.counterion) {
    assert.equal(complex.charge * complex.complexCount + complex.counterion.charge * complex.counterion.count, 0, `${name}: neutral salt`);
    assert.equal(parseComplex(complex.ionFormula).charge, charge, `${name}: coordination entity retains its charge`);
  }
  checks++;
}

const aliases = [
  ["diamminedichloroplatinum(II)", "diamminedichloridoplatinum(II)"],
  ["potassium hexacyanoferrate(II)", "potassium hexacyanidoferrate(II)"],
  ["tris(ethylenediamine)cobalt(III)", "tris(ethane-1,2-diamine)cobalt(III)"],
  ["tris(oxalato)ferrate(III)", "trioxalatoferrate(III)"],
  ["hexaaquochromium(iii) ion", "hexaaquachromium(III)"],
  ["[Cr(NH₃)₃(H₂O)₃]³⁺", "triamminetriaquachromium(III)"],
  ["[Cr(OH2)3(NH3)3]3+", "triamminetriaquachromium(III)"],
  ["[PtCl2(NH3)2]", "diamminedichloridoplatinum(II)"],
  ["[Fe(CN)6]-4", "hexacyanidoferrate(II)"],
  ["[Co(C2H8N2)3]^3+", "tris(ethane-1,2-diamine)cobalt(III)"],
  ["[Fe(ox)3]3-", "trioxalatoferrate(III)"],
  ["[Co(NH3)6]SO4", "hexaamminecobalt(II) sulphate"],
];
for (const [alias, expected] of aliases) {
  assert.ok(parseComplex(alias), alias);
  assert.equal(complexKey(parseComplex(alias)), complexKey(parseComplex(expected)), alias);
  checks++;
}

const invalid = [
  "", "ethanol", "chromium(III)", "triaminechromium(III)",
  "triamminetriaquachromium(IIII)", "triamminetriaquachromium(IX)",
  "triamminetriaquachromium(III) rubbish", "hexaamminecobalt(III) chloridex",
  "hexacyanidoiron(III)", "hexaamminecobaltate(III)",
  "potassium hexaamminecobalt(III)", "hexacyanidoferrate(III) chloride",
  "sodium hexacyanidoferrate(III) chloride", "tetracarbonylnickel(0) ion",
  "cis-diamminedichloridoplatinum(II)", "fac-triamminetrichloridocobalt(III)",
  "pentaamminenitrocobalt(III)", "hexaamminecobalt(III) chloride hexahydrate",
  "dichloridodiammineplatinum(II)", "ammineamminecopper(II)",
  "trisethylenediaminecobalt(III)", "di(ammine)copper(II)",
  "[Cr(NH3)3(H2O)3]3+junk", "[Cr(NH3)3(H2O)3]^0+", "[Cr(NH3)3(H2O)3]^03+", "[Cr(NH3)3(H2O)3]^99+",
  "[Cr(NH3)0(H2O)3]3+", "[Cr(NH3)03(H2O)3]3+", "[Cr(NH3)3(H2O)3", "Cr(NH3)3(H2O)3",
  "[Co(NH3)6]^3+Cl3", "K0[Fe(CN)6]", "K4[Fe(CN)6]2", "[Co(NH3)6]3(SO4)2",
  "[Co(NH3)6]2Cl6", "[Co(NH3)6](NO3)0", "[Co(NH3)6]2", "[Co(NH3)6]Cl3.H2O",
  "[Co(NH3)6][Fe(CN)6]", "[ReReCl8]2-", "[Fe(SCN)6]3-", "[Fe(NO2)6]3-",
  "[Cr(NH3)3(NH3)3]3+", "[PtNH32Cl2]", "[Co(en)7]3+", "[Zn(NH3)6]3+",
  "<script>alert(1)</script>",
];
for (const input of invalid) {
  assert.equal(parseComplex(input), null, `reject: ${input}`);
  checks++;
}

const chromium = parseComplex("triamminetriaquachromium(III)");
const svg = complexSvg(chromium);
assert.match(svg, /Coordination connectivity schematic/);
assert.match(svg, /not a 3D geometry/);
assert.equal((svg.match(/<line /g) ?? []).length, 6);
assert.ok(!svg.includes(chromium.canonicalName), "question SVG must not expose its answer");
assert.ok(!svg.includes("ammine") && !svg.includes("aqua"), "question SVG uses formula labels, not ligand names");
assert.ok(!svg.includes("III"), "question SVG must not expose oxidation-state answer");
assert.equal(parseComplex("tetrachloridocobaltate(II)").geometry, "Not specified");
assert.equal(parseComplex("diamminedichloridoplatinum(II)").geometry, "Not specified");
assert.notEqual(complexKey(chromium), complexKey(parseComplex("triamminetriaquachromium(II)")));
assert.notEqual(complexKey(parseComplex("hexaamminecobalt(III)")), complexKey(parseComplex("hexaamminecobalt(III) chloride")));
const malicious = { ...chromium, metal: { name: "chromium", symbol: '<script>alert("x")</script>' } };
assert.ok(!complexSvg(malicious).includes("<script>"), "dynamic SVG text is escaped");
checks += 11;
for (const input of ["[Co(NH3)6]3+", "[Fe(SCN)6]3-", "K2[OsCl6]", "[ReReCl8]2-", "cis-diamminedichloridoplatinum(II)", "fac-triamminetrichloridocobalt(III)", "pentaamminenitrocobalt(III)", "hexaamminecobalt(IIII)", "hexafluoridoaluminate(III)", "hexacyanoferrate", "nickel tetracarbonyl", "tris(bipyridine)iron(II)", "tris(2,2'-bipyridine)iron(II)", "tris(2,2'-bipyridine)iron(II) chloride", "tetrakis(triphenylphosphane)palladium(0)"]) {
  assert.equal(looksLikeComplex(input), true, `keep unsupported coordination input out of organic resolver: ${input}`);
  checks++;
}
for (const input of ["ethanol", "chlorobenzene", "nitromethane", "tris(2-pyridyl)amine", "N,N-bis(2-pyridylmethyl)aniline", "[NH4+]", "[C@H](O)C", "[Co+2]", "[CO]", "[CH3]CO", "[Na+].[Cl-]"]) {
  assert.equal(looksLikeComplex(input), false, `ordinary input guard: ${input}`);
  checks++;
}
console.log(`Complexes: ${checks} chemistry, parsing, salt, alias, and schematic checks passed.`);
