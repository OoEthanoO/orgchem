/**
 * Input normalisation shared by every resolver.
 *
 * Users paste chemistry from textbooks, Wikipedia and Word documents, so the
 * raw string is full of typographic characters that no parser understands:
 * subscript digits (CH₃), en/em dashes (CH₃–), the triple-bond character (≡),
 * non-breaking spaces, smart quotes and Greek letters.
 */

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Characters that all mean "single bond" / "open valence". */
const DASHES = /[‐‑‒–—―−﹘﹣－]/g;

/** Characters that all mean "triple bond". */
const TRIPLE = /[≡≣]/g;

/** Characters that all mean "double bond". */
const DOUBLE = /[=═]/g;

const SUPERSCRIPT_SIGNS: Record<string, string> = { "⁺": "+", "⁻": "-" };

export function normalizeInput(raw: string): string {
  let s = raw.normalize("NFKC");

  // Subscript and superscript digits -> plain digits.
  s = s.replace(/[₀-₉]/g, (c) => String(SUBSCRIPTS.indexOf(c)));
  s = s.replace(/[⁰-⁹]/g, (c) => String(SUPERSCRIPTS.indexOf(c)));
  s = s.replace(/[⁺⁻]/g, (c) => SUPERSCRIPT_SIGNS[c]);

  // Unify bond glyphs.
  s = s.replace(DASHES, "-");
  s = s.replace(TRIPLE, "#");
  s = s.replace(DOUBLE, "=");

  // Middle dot is used both for radicals and for hydrate adducts; the adduct
  // reading is far more common in pasted formulas.
  s = s.replace(/[·•⋅]/g, ".");

  // Smart quotes used as primes in locants (2′-deoxy...).
  s = s.replace(/[‘’‛′]/g, "'");
  s = s.replace(/[“”″]/g, '"');

  // Whitespace: collapse every flavour of space to a single ASCII space.
  s = s.replace(/[\s  -​  　]+/g, " ");

  return s.trim();
}

/**
 * Greek letters are spelled out in IUPAC names (alpha-D-glucose) but usually
 * pasted as glyphs. Only applied on the name path, never to formulas.
 */
const GREEK: Record<string, string> = {
  α: "alpha",
  β: "beta",
  γ: "gamma",
  δ: "delta",
  ε: "epsilon",
  ζ: "zeta",
  η: "eta",
  θ: "theta",
  ι: "iota",
  κ: "kappa",
  λ: "lambda",
  μ: "mu",
  ν: "nu",
  ξ: "xi",
  ο: "omicron",
  π: "pi",
  ρ: "rho",
  σ: "sigma",
  τ: "tau",
  υ: "upsilon",
  φ: "phi",
  χ: "chi",
  ψ: "psi",
  ω: "omega",
};

export function normalizeName(raw: string): string {
  let s = normalizeInput(raw).toLowerCase();
  s = s.replace(/[α-ω]/g, (c) => GREEK[c] ?? c);
  // "2 - methylbutane" and "2-methyl butane" both happen when copying from PDFs.
  s = s.replace(/\s*-\s*/g, "-");
  return s.trim();
}
