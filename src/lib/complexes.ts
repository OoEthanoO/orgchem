/**
 * An intentionally bounded parser for introductory, mononuclear coordination
 * chemistry. It describes composition and donor connectivity, not a particular
 * stereoisomer. No ordinary covalent SMILES is invented for coordination bonds.
 *
 * Naming reference: IUPAC's Brief Guide to Inorganic Nomenclature, section 2:
 * https://iupac.qmul.ac.uk/BriefGuide/inorganic.html
 */

export type ComplexLigand = {
  name: string;
  formula: string;
  count: number;
  charge: number;
  donor: string;
  denticity: number;
};

export type ComplexCounterion = {
  name: string;
  formula: string;
  charge: number;
  count: number;
};

export type CoordinationComplex = {
  canonicalName: string;
  /** Whole formula: a charged coordination entity, or a neutral salt. */
  formula: string;
  /** Coordination entity alone, including its charge (even for a salt). */
  ionFormula: string;
  metal: { name: string; symbol: string };
  oxidationState: number;
  /** Charge of one coordination entity, not of the neutral salt. */
  charge: number;
  coordinationNumber: number;
  ligands: ComplexLigand[];
  geometry: string;
  geometryNote: string;
  counterion?: ComplexCounterion;
  /** Number of coordination entities per salt formula unit; otherwise 1. */
  complexCount: number;
};

type LigandDefinition = Omit<ComplexLigand, "count"> & {
  aliases: string[];
  formulaAliases?: string[];
  compoundName?: boolean;
};

const LIGANDS: LigandDefinition[] = [
  { name: "ammine", formula: "NH3", charge: 0, donor: "N", denticity: 1, aliases: ["ammine"] },
  { name: "aqua", formula: "H2O", charge: 0, donor: "O", denticity: 1, aliases: ["aqua", "aquo"], formulaAliases: ["OH2"] },
  { name: "bromido", formula: "Br", charge: -1, donor: "Br", denticity: 1, aliases: ["bromido", "bromo"] },
  { name: "carbonyl", formula: "CO", charge: 0, donor: "C", denticity: 1, aliases: ["carbonyl"] },
  { name: "chlorido", formula: "Cl", charge: -1, donor: "Cl", denticity: 1, aliases: ["chlorido", "chloro"] },
  { name: "cyanido", formula: "CN", charge: -1, donor: "C", denticity: 1, aliases: ["cyanido", "cyano"] },
  { name: "ethane-1,2-diamine", formula: "en", charge: 0, donor: "N", denticity: 2, aliases: ["ethane-1,2-diamine", "ethylenediamine"], formulaAliases: ["C2H8N2", "NH2CH2CH2NH2"], compoundName: true },
  { name: "fluorido", formula: "F", charge: -1, donor: "F", denticity: 1, aliases: ["fluorido", "fluoro"] },
  { name: "hydroxido", formula: "OH", charge: -1, donor: "O", denticity: 1, aliases: ["hydroxido", "hydroxo"] },
  { name: "iodido", formula: "I", charge: -1, donor: "I", denticity: 1, aliases: ["iodido", "iodo"] },
  { name: "oxalato", formula: "C2O4", charge: -2, donor: "O", denticity: 2, aliases: ["oxalato"], formulaAliases: ["ox"] },
];

type MetalDefinition = { name: string; symbol: string; anion: string; min: number; max: number };

// These bounds exclude impossible introductory oxidation-state answers; they
// are not a claim that every combination inside the bounds is a stable species.
const METALS: MetalDefinition[] = [
  { name: "chromium", symbol: "Cr", anion: "chromate", min: -4, max: 6 },
  { name: "cobalt", symbol: "Co", anion: "cobaltate", min: -1, max: 4 },
  { name: "iron", symbol: "Fe", anion: "ferrate", min: -2, max: 6 },
  { name: "nickel", symbol: "Ni", anion: "nickelate", min: -2, max: 4 },
  { name: "copper", symbol: "Cu", anion: "cuprate", min: 0, max: 4 },
  { name: "zinc", symbol: "Zn", anion: "zincate", min: 0, max: 2 },
  { name: "silver", symbol: "Ag", anion: "argentate", min: 0, max: 3 },
  { name: "gold", symbol: "Au", anion: "aurate", min: -1, max: 5 },
  { name: "platinum", symbol: "Pt", anion: "platinate", min: 0, max: 6 },
  { name: "palladium", symbol: "Pd", anion: "palladate", min: 0, max: 4 },
  { name: "manganese", symbol: "Mn", anion: "manganate", min: -3, max: 7 },
  { name: "titanium", symbol: "Ti", anion: "titanate", min: -2, max: 4 },
  { name: "vanadium", symbol: "V", anion: "vanadate", min: -1, max: 5 },
  { name: "molybdenum", symbol: "Mo", anion: "molybdate", min: -4, max: 6 },
  { name: "tungsten", symbol: "W", anion: "tungstate", min: -4, max: 6 },
  { name: "ruthenium", symbol: "Ru", anion: "ruthenate", min: -2, max: 8 },
  { name: "rhodium", symbol: "Rh", anion: "rhodate", min: -1, max: 6 },
  { name: "iridium", symbol: "Ir", anion: "iridate", min: -3, max: 6 },
];

type CounterionDefinition = Omit<ComplexCounterion, "count"> & { aliases?: string[] };

const COUNTERIONS: CounterionDefinition[] = [
  { name: "lithium", formula: "Li", charge: 1 },
  { name: "sodium", formula: "Na", charge: 1 },
  { name: "potassium", formula: "K", charge: 1 },
  { name: "ammonium", formula: "NH4", charge: 1 },
  { name: "magnesium", formula: "Mg", charge: 2 },
  { name: "calcium", formula: "Ca", charge: 2 },
  { name: "barium", formula: "Ba", charge: 2 },
  { name: "fluoride", formula: "F", charge: -1 },
  { name: "chloride", formula: "Cl", charge: -1 },
  { name: "bromide", formula: "Br", charge: -1 },
  { name: "iodide", formula: "I", charge: -1 },
  { name: "nitrate", formula: "NO3", charge: -1 },
  { name: "sulfate", formula: "SO4", charge: -2, aliases: ["sulphate"] },
  { name: "perchlorate", formula: "ClO4", charge: -1 },
  { name: "phosphate", formula: "PO4", charge: -3 },
  { name: "hydroxide", formula: "OH", charge: -1 },
];

const SIMPLE_PREFIXES = ["", "", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa", "nona", "deca", "undeca", "dodeca"];
const COMPOUND_PREFIXES = ["", "", "bis", "tris", "tetrakis", "pentakis", "hexakis"];
const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

const nameAliases = LIGANDS.flatMap((ligand) => ligand.aliases.map((alias) => ({ alias, ligand })))
  .sort((a, b) => b.alias.length - a.alias.length);
const formulaAliases = LIGANDS.flatMap((ligand) => [ligand.formula, ...(ligand.formulaAliases ?? [])].map((alias) => ({ alias, ligand })))
  .sort((a, b) => b.alias.length - a.alias.length);
const prefixes = SIMPLE_PREFIXES.map((prefix, count) => ({ prefix, count })).filter(({ prefix }) => prefix)
  .sort((a, b) => b.prefix.length - a.prefix.length);

function namedLigand(definition: LigandDefinition, count: number): ComplexLigand {
  const { name, formula, charge, donor, denticity } = definition;
  return { name, formula, charge, donor, denticity, count };
}

function countValue(raw: string): number | null {
  if (!raw) return 1;
  if (!/^[1-9]\d?$/.test(raw)) return null;
  const count = Number(raw);
  return count <= 12 ? count : null;
}

function parseNameLigands(input: string): ComplexLigand[] | null {
  let rest = input;
  const ligands: ComplexLigand[] = [];
  while (rest) {
    let count = 1;
    let definition: LigandDefinition | undefined;
    const grouped = /^(?:(bis|tris|tetrakis|pentakis|hexakis))?\(([^()]+)\)/.exec(rest);
    if (grouped) {
      count = grouped[1] ? COMPOUND_PREFIXES.indexOf(grouped[1]) : 1;
      definition = nameAliases.find(({ alias }) => alias === grouped[2])?.ligand;
      rest = rest.slice(grouped[0].length);
    } else {
      const prefix = prefixes.find(({ prefix }) => rest.startsWith(prefix));
      if (prefix) {
        count = prefix.count;
        rest = rest.slice(prefix.prefix.length);
      }
      const match = nameAliases.find(({ alias }) => rest.startsWith(alias));
      if (!match) return null;
      definition = match.ligand;
      // Compound ligand names need enclosing marks and bis/tris for repeats.
      if (definition.compoundName) return null;
      rest = rest.slice(match.alias.length);
    }
    if (!definition || ligands.some((ligand) => ligand.name === definition.name)) return null;
    ligands.push(namedLigand(definition, count));
    if (ligands.length > 12) return null;
  }
  // Multipliers do not affect alphabetical ligand ordering in names.
  if (ligands.some((ligand, i) => i > 0 && ligands[i - 1].name.localeCompare(ligand.name) > 0)) return null;
  return ligands.length ? ligands : null;
}

function parseFormulaLigands(input: string): ComplexLigand[] | null {
  let rest = input;
  const ligands: ComplexLigand[] = [];
  while (rest) {
    let definition: LigandDefinition | undefined;
    let rawCount = "";
    if (rest.startsWith("(")) {
      const group = /^\(([^()]+)\)(\d*)/.exec(rest);
      if (!group) return null;
      definition = formulaAliases.find(({ alias }) => alias === group[1])?.ligand;
      rawCount = group[2];
      rest = rest.slice(group[0].length);
    } else {
      const token = formulaAliases.find(({ alias }) => rest.startsWith(alias));
      if (!token) return null;
      definition = token.ligand;
      rest = rest.slice(token.alias.length);
      rawCount = /^\d*/.exec(rest)![0];
      // A polyatomic formula's internal digits must never be read as an
      // external multiplier: repeated polyatomic ligands require parentheses.
      if (rawCount && !/^[A-Z][a-z]?$/.test(token.alias)) return null;
      rest = rest.slice(rawCount.length);
    }
    const count = countValue(rawCount);
    if (!definition || count === null || ligands.some((ligand) => ligand.name === definition.name)) return null;
    ligands.push(namedLigand(definition, count));
    if (ligands.length > 12) return null;
  }
  return ligands.length ? ligands : null;
}

function chargeSuffix(charge: number): string {
  return charge === 0 ? "" : `^${Math.abs(charge) === 1 ? "" : Math.abs(charge)}${charge > 0 ? "+" : "-"}`;
}

function formulaPart(formula: string, count: number): string {
  const grouped = /^[A-Z][a-z]?$/.test(formula) ? formula : `(${formula})`;
  return `${grouped}${count === 1 ? "" : count}`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function geometryDescription(coordinationNumber: number): { geometry: string; geometryNote: string } {
  const common: Record<number, string> = {
    2: "Two-coordinate complexes are often linear.",
    3: "Three-coordinate complexes are often trigonal planar.",
    4: "Four-coordinate complexes may be tetrahedral or square planar, among other geometries.",
    5: "Five-coordinate complexes may be trigonal bipyramidal or square pyramidal.",
    6: "Six-coordinate complexes are commonly octahedral.",
  };
  return {
    geometry: "Not specified",
    geometryNote: `${common[coordinationNumber] ?? "Coordination number alone does not determine geometry."} This schematic shows donor connections only; it does not specify 3D geometry, cis/trans, fac/mer, or optical isomers.`,
  };
}

function assemble(
  metal: MetalDefinition,
  ligands: ComplexLigand[],
  oxidationState: number,
  counterion?: CounterionDefinition,
): CoordinationComplex | null {
  if (!Number.isInteger(oxidationState) || oxidationState < metal.min || oxidationState > metal.max) return null;
  const coordinationNumber = ligands.reduce((sum, ligand) => sum + ligand.count * ligand.denticity, 0);
  if (coordinationNumber < 1 || coordinationNumber > 12) return null;
  const charge = oxidationState + ligands.reduce((sum, ligand) => sum + ligand.count * ligand.charge, 0);
  if (Math.abs(charge) > 8 || (counterion && charge * counterion.charge >= 0)) return null;
  const ordered = [...ligands].sort((a, b) => a.name.localeCompare(b.name));
  const ligandName = ordered.map((ligand) => {
    const compoundName = LIGANDS.find((definition) => definition.name === ligand.name)?.compoundName;
    return compoundName
      ? `${COMPOUND_PREFIXES[ligand.count]}(${ligand.name})`
      : `${SIMPLE_PREFIXES[ligand.count]}${ligand.name}`;
  }).join("");
  const oxidationLabel = `${oxidationState < 0 ? "-" : ""}${ROMAN[Math.abs(oxidationState)]}`;
  const entityName = `${ligandName}${charge < 0 ? metal.anion : metal.name}(${oxidationLabel})`;
  // A familiar, consistent classroom ordering; the entity's atom counts and
  // charge are independent of which valid ligand order appeared in its formula.
  const bracket = `[${metal.symbol}${ordered.map((ligand) => formulaPart(ligand.formula, ligand.count)).join("")}]`;
  const ionFormula = `${bracket}${chargeSuffix(charge)}`;
  let complexCount = 1;
  let countedCounterion: ComplexCounterion | undefined;
  let formula = ionFormula;
  let canonicalName = entityName;
  if (counterion) {
    const divisor = gcd(Math.abs(charge), Math.abs(counterion.charge));
    complexCount = Math.abs(counterion.charge) / divisor;
    countedCounterion = { name: counterion.name, formula: counterion.formula, charge: counterion.charge, count: Math.abs(charge) / divisor };
    const saltEntity = `${bracket}${complexCount === 1 ? "" : complexCount}`;
    const saltCounterion = countedCounterion.count === 1
      ? counterion.formula
      : formulaPart(counterion.formula, countedCounterion.count);
    formula = counterion.charge > 0 ? `${saltCounterion}${saltEntity}` : `${saltEntity}${saltCounterion}`;
    canonicalName = counterion.charge > 0 ? `${counterion.name} ${entityName}` : `${entityName} ${counterion.name}`;
  }
  return {
    canonicalName, formula, ionFormula,
    metal: { name: metal.name, symbol: metal.symbol },
    oxidationState, charge, coordinationNumber, ligands: ordered,
    ...geometryDescription(coordinationNumber),
    ...(countedCounterion ? { counterion: countedCounterion } : {}),
    complexCount,
  };
}

function parseName(input: string): CoordinationComplex | null {
  let compact = input.toLowerCase().replace(/\s+/g, "");
  const hasIon = compact.endsWith("ion");
  if (hasIon) compact = compact.slice(0, -3);
  const state = /^(.*)\((-?(?:viii|vii|vi|iv|iii|ii|v|i)|0)\)([a-z]*)$/.exec(compact);
  if (!state) return null;
  const negative = state[2].startsWith("-");
  const oxidationState = ROMAN.indexOf(state[2].replace(/^-/, "").toUpperCase()) * (negative ? -1 : 1);
  let head = state[1];
  let counterion = COUNTERIONS.find((ion) => ion.charge > 0 && head.startsWith(ion.name));
  if (counterion) head = head.slice(counterion.name.length);
  if (state[3]) {
    if (counterion) return null;
    counterion = COUNTERIONS.find((ion) => ion.charge < 0 && [ion.name, ...(ion.aliases ?? [])].includes(state[3]));
    if (!counterion) return null;
  }
  const metal = METALS.find((entry) => head.endsWith(entry.name) || head.endsWith(entry.anion));
  if (!metal) return null;
  const usesAnionName = head.endsWith(metal.anion);
  const ligands = parseNameLigands(head.slice(0, -(usesAnionName ? metal.anion : metal.name).length));
  if (!ligands) return null;
  const complex = assemble(metal, ligands, oxidationState, counterion);
  if (!complex || usesAnionName !== (complex.charge < 0) || (hasIon && (counterion || complex.charge === 0))) return null;
  return complex;
}

function parseCounterionFormula(input: string, sign: number): ComplexCounterion | null {
  for (const ion of COUNTERIONS.filter((entry) => entry.charge * sign > 0)) {
    let rawCount: string | null = null;
    if (input.startsWith(`(${ion.formula})`)) rawCount = input.slice(ion.formula.length + 2);
    else if (input === ion.formula) rawCount = "";
    else if (/^[A-Z][a-z]?$/.test(ion.formula) && input.startsWith(ion.formula)) rawCount = input.slice(ion.formula.length);
    if (rawCount === null) continue;
    const count = countValue(rawCount);
    if (count !== null) return { name: ion.name, formula: ion.formula, charge: ion.charge, count };
  }
  return null;
}

function parseFormula(input: string): CoordinationComplex | null {
  const compact = input.replace(/\s+/g, "");
  const match = /^([^\[\]]*)\[([A-Z][a-z]?)([^\[\]]+)\]([^\[\]]*)$/.exec(compact);
  if (!match) return null;
  const metal = METALS.find((entry) => entry.symbol === match[2]);
  const ligands = parseFormulaLigands(match[3]);
  if (!metal || !ligands) return null;
  let charge = 0;
  let counterion: ComplexCounterion | null = null;
  let complexCount = 1;
  if (match[1]) {
    counterion = parseCounterionFormula(match[1], 1);
    const parsedCount = countValue(match[4]);
    if (!counterion || parsedCount === null) return null;
    complexCount = parsedCount;
    charge = -counterion.charge * counterion.count / complexCount;
  } else if (match[4]) {
    const chargeMatch = /^\^?(?:(\d{1,2})?([+-])|([+-])(\d{1,2})?)$/.exec(match[4]);
    if (chargeMatch) {
      const rawMagnitude = chargeMatch[1] || chargeMatch[4] || "1";
      const magnitude = Number(rawMagnitude);
      if (!/^[1-9]\d?$/.test(rawMagnitude) || magnitude > 8) return null;
      charge = magnitude * ((chargeMatch[2] || chargeMatch[3]) === "+" ? 1 : -1);
    } else {
      const salt = /^(\d*)(.+)$/.exec(match[4]);
      if (!salt) return null;
      const parsedCount = countValue(salt[1]);
      counterion = parseCounterionFormula(salt[2], -1);
      if (parsedCount === null || !counterion) return null;
      complexCount = parsedCount;
      charge = -counterion.charge * counterion.count / complexCount;
    }
  }
  const oxidationState = charge - ligands.reduce((sum, ligand) => sum + ligand.count * ligand.charge, 0);
  const complex = assemble(metal, ligands, oxidationState, counterion ?? undefined);
  if (!complex) return null;
  // A salt formula must give the smallest whole-number ratio; do not silently
  // repair a wrong counterion count or infer fractional oxidation numbers.
  if (counterion && (complex.complexCount !== complexCount || complex.counterion?.count !== counterion.count)) return null;
  return complex;
}

/**
 * Read a complete supported additive name or bracket formula. Bare brackets
 * denote a neutral entity; ionic formulae must supply a charge or counterions.
 * Stereo, bridging, hydrates, mixed counterions, and unspecified linkage modes
 * are outside this parser. Ethane-1,2-diamine and oxalato use their usual
 * bidentate chelating mode. Unknown or malformed input returns null.
 */
export function parseComplex(input: string): CoordinationComplex | null {
  if (typeof input !== "string" || input.length > 400) return null;
  const normalized = input.normalize("NFKC").replace(/[−–]/g, "-").trim();
  if (!normalized || /[<>\u0000-\u001f]/.test(normalized)) return null;
  return normalized.includes("[") ? parseFormula(normalized) : parseName(normalized);
}

/**
 * Recognize the coordination inputs that must not fall through to an organic
 * name/SMILES resolver after a failed parse. Ordinary bracket atoms in organic
 * SMILES, e.g. [NH4+] and [C@H], are deliberately outside this guard.
 */
export function looksLikeComplex(input: string): boolean {
  if (typeof input !== "string" || input.length > 400) return false;
  const normalized = input.normalize("NFKC").replace(/[−–]/g, "-");
  // Match the element symbol as a whole: [CO] starts with carbon, not cobalt.
  // Include common metals outside the parser's bounded teaching vocabulary.
  const metalSymbols = "(?:Sc|Ti|V|Cr|Mn|Fe|Co|Ni|Cu|Zn|Y|Zr|Nb|Mo|Tc|Ru|Rh|Pd|Ag|Cd|Hf|Ta|W|Re|Os|Ir|Pt|Au|Hg|Al|Ga|In|Sn|Pb|La|Ce|U)";
  if (new RegExp(`\\[\\s*${metalSymbols}(?=\\s*(?:[A-Z(]|[a-z]{2}))`).test(normalized)) return true;
  const name = normalized.toLowerCase();
  const ligand = /ammine|aqua|aquo|chlorido|bromido|fluorido|iodido|cyanido|hydroxido|oxalato|carbonyl|ethane-1,2-diamine|ethylenediamine|thiocyanato|nitrito|nitro|chloro|cyano|hydroxo/;
  const metalName = /(?:scandium|titanium|titanate|vanadium|vanadate|chromium|chromate|manganese|manganate|iron|ferrate|cobalt|cobaltate|nickel|nickelate|copper|cuprate|zinc|zincate|silver|argentate|gold|aurate|platinum|platinate|palladium|palladate|molybdenum|molybdate|tungsten|tungstate|ruthenium|ruthenate|rhodium|rhodate|iridium|iridate|aluminium|aluminum|aluminate|cadmium|cadmate|mercury|mercurate|osmium|osmate|rhenium|rhenate)(?=\s*\(|\b)/g;
  for (const metal of name.matchAll(metalName)) {
    if (ligand.test(name)) return true;
    // Unknown ligands still have recognizable additive-name structure. Without
    // this branch, e.g. tris(bipyridine)iron(II) could be sent to PubChem and its
    // disconnected covalent fragments displayed as if they were the complex.
    const before = name.slice(0, metal.index);
    const suffix = name.slice(metal.index! + metal[0].length);
    if (/[a-z]/.test(before) && /^\s*\((-?(?:viii|vii|vi|iv|iii|ii|v|i)|0)\)(?:\s*[a-z ]+)?$/.test(suffix)) return true;
  }
  return false;
}

/** Composition identity, including the salt, without assigning stereochemistry. */
export function complexKey(complex: CoordinationComplex): string {
  const ligands = [...complex.ligands].sort((a, b) => a.name.localeCompare(b.name))
    .map((ligand) => `${ligand.name}:${ligand.count}:${ligand.denticity}:${ligand.donor}`).join("|");
  const salt = complex.counterion
    ? `${complex.counterion.formula}:${complex.counterion.count}:${complex.complexCount}`
    : "ion";
  return `${complex.metal.symbol}:${complex.oxidationState}:${complex.charge}|${ligands}|${salt}`;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

function subscriptFormula(value: string): string {
  return escapeXml(value).replace(/\d+/g, (digits) => `<tspan baseline-shift="sub" font-size="10">${digits}</tspan>`);
}

/**
 * A donor-connectivity diagram. Ligand formulae identify each group; paired
 * donors are joined by a dotted guide for a bidentate ligand. Neither the name
 * nor the oxidation state appears, so the SVG can also be a practice question.
 */
export function complexSvg(complex: CoordinationComplex): string {
  const cx = 280;
  const cy = 215;
  const donors: Array<{ ligand: ComplexLigand; group: number; angle: number }> = [];
  let group = 0;
  for (const ligand of complex.ligands) {
    for (let copy = 0; copy < ligand.count; copy++) {
      for (let d = 0; d < ligand.denticity; d++) donors.push({ ligand, group, angle: 0 });
      group++;
    }
  }
  const total = donors.length;
  donors.forEach((donor, i) => { donor.angle = -Math.PI / 2 + i * Math.PI * 2 / total; });
  const position = (angle: number, radius: number) => ({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  const color: Record<string, string> = {
    N: "var(--mol-n, #2547c4)", O: "var(--mol-o, #c62828)", C: "var(--mol-c, #3f3a34)",
    Cl: "var(--mol-cl, #1a8f3c)", Br: "var(--mol-br, #9c4221)", F: "var(--mol-f, #4d8f1f)", I: "var(--mol-i, #6b21a8)",
  };
  const bond = "var(--mol-bond, #1f1d1a)";
  const muted = "var(--mol-x, #57534e)";
  const strokes = donors.map(({ angle }) => {
    const start = position(angle, 32);
    const end = position(angle, 109);
    return `<line x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}" stroke="${bond}" stroke-width="2"/>`;
  }).join("");
  const atoms = donors.map(({ ligand, angle }) => {
    const point = position(angle, 125);
    return `<text x="${point.x.toFixed(1)}" y="${point.y.toFixed(1)}" fill="${color[ligand.donor] ?? muted}" font-size="23" font-weight="600" dominant-baseline="middle">${escapeXml(ligand.donor)}</text>`;
  }).join("");
  const groups = Array.from({ length: group }, (_, id) => donors.filter((donor) => donor.group === id));
  const labels = groups.map((members) => {
    const angle = members.reduce((sum, member) => sum + member.angle, 0) / members.length;
    const point = position(angle, 171);
    let guide = "";
    if (members.length === 2) {
      const first = position(members[0].angle, 145);
      const last = position(members[1].angle, 145);
      guide = `<path d="M${first.x.toFixed(1)},${first.y.toFixed(1)} A145,145 0 0 1 ${last.x.toFixed(1)},${last.y.toFixed(1)}" fill="none" stroke="${muted}" stroke-width="1.5" stroke-dasharray="3 4"/>`;
    }
    return `${guide}<text x="${point.x.toFixed(1)}" y="${point.y.toFixed(1)}" font-size="15" fill="${muted}" dominant-baseline="middle">${subscriptFormula(members[0].ligand.formula)}</text>`;
  }).join("");
  const charge = complex.charge ? `${Math.abs(complex.charge) === 1 ? "" : Math.abs(complex.charge)}${complex.charge > 0 ? "+" : "−"}` : "0";
  const salt = complex.counterion
    ? `${complex.counterion.count} × ${complex.counterion.formula}${chargeSuffix(complex.counterion.charge)} outside each ${complex.complexCount === 1 ? "coordination entity" : `${complex.complexCount} coordination entities`}`
    : `Coordination entity charge: ${charge}`;
  const description = `${complex.coordinationNumber} donor atoms bonded to ${complex.metal.symbol}. Schematic only; geometry and stereochemistry are unspecified.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 470" width="560" height="470" role="img" aria-label="${escapeXml(description)}"><title>Coordination connectivity schematic</title><desc>${escapeXml(description)}</desc><g font-family="Arial, sans-serif" text-anchor="middle">${strokes}${atoms}${labels}<text x="${cx}" y="${cy}" dominant-baseline="middle" font-size="31" font-weight="600" fill="${bond}">${escapeXml(complex.metal.symbol)}</text><path d="M65,24 H51 V404 H65 M495,24 H509 V404 H495" fill="none" stroke="${muted}" stroke-width="1.5"/><text x="526" y="28" font-size="19" fill="${bond}">${escapeXml(charge)}</text><text x="280" y="430" font-size="13" fill="${muted}">${escapeXml(salt)}</text><text x="280" y="454" font-size="12" fill="${muted}">Donor connections only · not a 3D geometry</text></g></svg>`;
}
