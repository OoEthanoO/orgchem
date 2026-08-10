import "server-only";

import { canDepict, constitutionKey, openValenceCount } from "./depict";
import { normalizeInput, normalizeName } from "./normalize";
import { parseCondensed } from "./condensed";
import { parseIupacName } from "./iupac";
import { lookupDictionary } from "./dictionary";

/**
 * Turns whatever the user typed into a structure.
 *
 * Inputs are tried against a cascade of interpretations, cheapest and most
 * certain first. Order matters: a condensed formula like `CH3CH2OH` is not
 * something OPSIN or PubChem accepts, while a name like `aspirin` is not
 * something the formula parser should be allowed to mangle, so each stage is
 * strict enough to fall through rather than guess.
 */

export type SourceId =
  | "dictionary"
  | "condensed"
  | "smiles"
  | "opsin"
  | "local-name"
  | "pubchem"
  | "formula";

export interface Resolution {
  smiles: string;
  source: SourceId;
  /** Short description of how the input was read, shown to the user. */
  interpretation: string;
  /** Number of unfilled valences: non-zero means a substituent group. */
  openValences: number;
  /** Names and identifiers picked up along the way. */
  title?: string;
  iupacName?: string;
  inchi?: string;
  inchiKey?: string;
  cid?: number;
  /** Alternative structures, when the input was ambiguous. */
  candidates?: Array<{ title: string; smiles: string; cid?: number }>;
}

export class ResolveError extends Error {
  readonly hint?: string;
  constructor(message: string, hint?: string) {
    super(message);
    this.hint = hint;
  }
}

const OPSIN_URL = "https://www.ebi.ac.uk/opsin/ws";
const PUBCHEM_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound";
const NETWORK_TIMEOUT_MS = 6000;
/** Enrichment only labels an answer we already have, so it waits less. */
const ENRICH_TIMEOUT_MS = 3500;

/** Resolved inputs are stable, so a bounded in-process cache is safe. */
const cache = new Map<string, Resolution>();
const CACHE_LIMIT = 500;

function remember(key: string, value: Resolution): Resolution {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
  return value;
}

export async function resolveQuery(raw: string): Promise<Resolution> {
  const input = normalizeInput(raw);
  if (!input) throw new ResolveError("Nothing to look up.");
  if (input.length > 400) throw new ResolveError("That input is too long to be a structure.");

  const cached = cache.get(input);
  if (cached) return cached;

  // An explicit prefix skips the guessing entirely.
  const prefixed = /^(smiles|name|formula|inchi)\s*[:=]\s*(.+)$/i.exec(input);
  if (prefixed) {
    const [, kind, rest] = prefixed;
    return remember(input, await resolveExplicit(kind.toLowerCase(), rest.trim()));
  }

  const attempts: Array<() => Promise<Resolution | null> | Resolution | null> = [
    () => fromDictionary(input),
    () => fromCondensed(input),
    () => fromSmiles(input),
    () => fromName(input),
    // Formula before name lookup: PubChem's name search will happily match
    // "C3H6O" to whichever compound happens to carry it as a synonym, when
    // what the input actually asks for is the set of isomers.
    () => fromMolecularFormula(input),
    () => fromPubChemName(input),
  ];

  for (const attempt of attempts) {
    const result = await attempt();
    // A stage only wins if what it produced is a structure that can be drawn,
    // so a plausible-looking miss falls through instead of failing the page.
    if (!result || !canDepict(result.smiles)) continue;

    // Read the open valences off the structure rather than trusting the stage:
    // OPSIN answers `pentan-1-yl` without saying it is a fragment, and a
    // fragment must not be looked up as if it were a compound.
    const checked = { ...result, openValences: openValenceCount(result.smiles) };
    const enriched = await enrich(checked);
    // Enrichment can come back empty because PubChem rate-limited this
    // request, not because the compound is unknown. Caching that would make a
    // momentary hiccup permanent, so an unlabelled result is returned but not
    // kept.
    return needsEnrichment(enriched) ? enriched : remember(input, enriched);
  }

  throw new ResolveError(
    `Could not work out a structure for "${raw.trim()}".`,
    "Try an IUPAC name (2-methylbutan-1-ol), a condensed formula (CH3CH2COOH), a common name (caffeine), or a SMILES string.",
  );
}

async function resolveExplicit(kind: string, value: string): Promise<Resolution> {
  if (kind === "smiles") {
    const result = fromSmiles(value, true);
    if (result) return result;
    throw new ResolveError(`"${value}" is not valid SMILES.`);
  }
  if (kind === "formula") {
    const result = await fromMolecularFormula(value);
    if (result) return result;
    throw new ResolveError(`No structures found with the formula ${value}.`);
  }
  if (kind === "inchi") {
    const result = await fromPubChemInchi(value);
    if (result) return result;
    throw new ResolveError("That InChI could not be resolved.");
  }
  const result = (await fromName(value)) ?? (await fromPubChemName(value));
  if (result) return result;
  throw new ResolveError(`"${value}" was not recognised as a chemical name.`);
}

// --- stages ----------------------------------------------------------------

function fromDictionary(input: string): Resolution | null {
  // Exact spelling first, then progressively looser: "D-glucose" has to match
  // its own key before the hyphen-as-space form catches "ethylene-glycol".
  const spellings = [input, normalizeName(input), normalizeName(input).replace(/-/g, " ")];
  const smiles = spellings.reduce<string | null>(
    (found, spelling) => found ?? lookupDictionary(spelling),
    null,
  );
  if (!smiles) return null;
  // The title is left for enrichment to supply, so the heading reads
  // "Aspirin" rather than echoing however the user capitalised it.
  return {
    smiles,
    source: "dictionary",
    interpretation: "Recognised as a common name",
    openValences: 0,
  };
}

function fromCondensed(input: string): Resolution | null {
  try {
    const parsed = parseCondensed(input);
    return {
      smiles: parsed.smiles,
      source: "condensed",
      interpretation:
        parsed.openValences > 0
          ? "Read as a condensed formula for a substituent group"
          : "Read as a condensed structural formula",
      openValences: parsed.openValences,
    };
  } catch {
    return null;
  }
}

/**
 * SMILES is only accepted when the string carries syntax that a name or a
 * condensed formula never has, or when nothing else claimed it first.
 */
function fromSmiles(input: string, force = false): Resolution | null {
  const distinctive = /[[\]@\\/%]|(?:^|[^A-Za-z])[bcnops](?:[0-9(]|$)|\d(?=[A-Za-z(])/.test(input);
  if (!force && !distinctive) return null;
  if (/\s/.test(input)) return null;
  return {
    smiles: input,
    source: "smiles",
    interpretation: "Read as SMILES",
    openValences: 0,
  };
}

/**
 * Systematic names. OPSIN is authoritative and gets the final say; the local
 * parser is worked out first because it costs nothing, and answers only when
 * the service is unreachable or does not recognise the name.
 */
async function fromName(input: string): Promise<Resolution | null> {
  const name = normalizeName(input);
  if (!/[a-z]{3}/.test(name)) return null;

  const local = (() => {
    try {
      return parseIupacName(name);
    } catch {
      return null;
    }
  })();

  // OPSIN sees the name with its capitalisation intact, since stereo and
  // configurational descriptors ((2R,3S)-, D-, N-) are case-carrying.
  const opsin = await fetchOpsin(normalizeInput(input));
  if (opsin) {
    return {
      smiles: opsin.smiles,
      source: "opsin",
      interpretation: "Parsed as a systematic IUPAC name",
      openValences: 0,
      inchi: opsin.stdinchi,
      inchiKey: opsin.stdinchikey,
    };
  }

  if (local) {
    return {
      smiles: local.smiles,
      source: "local-name",
      interpretation: "Parsed as a systematic IUPAC name (offline parser)",
      openValences: local.openValences,
    };
  }

  return null;
}

async function fromPubChemName(input: string): Promise<Resolution | null> {
  const data = await fetchPubChemProperties(`name/${encodeURIComponent(input)}`);
  if (!data) return null;
  return {
    smiles: data.smiles,
    source: "pubchem",
    interpretation: "Looked up in PubChem",
    openValences: 0,
    title: data.Title,
    iupacName: data.IUPACName,
    inchi: data.InChI,
    inchiKey: data.InChIKey,
    cid: data.CID,
  };
}

async function fromPubChemInchi(value: string): Promise<Resolution | null> {
  const body = new URLSearchParams({ inchi: value });
  const data = await fetchPubChemProperties("inchi", body);
  if (!data) return null;
  return {
    smiles: data.smiles,
    source: "pubchem",
    interpretation: "Resolved from InChI via PubChem",
    openValences: 0,
    title: data.Title,
    iupacName: data.IUPACName,
    inchi: data.InChI,
    inchiKey: data.InChIKey,
    cid: data.CID,
  };
}

/**
 * A bare molecular formula does not describe one structure. Rather than pick
 * an isomer, offer the ones PubChem knows about and show the first.
 */
async function fromMolecularFormula(input: string): Promise<Resolution | null> {
  const formula = input.replace(/\s+/g, "");
  if (!/^(?:[A-Z][a-z]?\d*)+$/.test(formula)) return null;
  if (!/\d/.test(formula)) return null;

  const url = `${PUBCHEM_URL}/fastformula/${encodeURIComponent(formula)}/property/Title,SMILES/JSON?MaxRecords=30`;
  const rows = await fetchJson<{
    PropertyTable?: { Properties?: Array<{ CID: number; Title?: string; SMILES?: string }> };
  }>(url);
  const properties = rows?.PropertyTable?.Properties?.filter((p) => p.SMILES) ?? [];
  if (properties.length === 0) return null;

  // One entry per distinct connectivity: the search returns each enantiomer
  // and each labelled isotopologue separately, which is not what "isomers of
  // this formula" means to someone typing a formula in.
  const seen = new Set<string>();
  const candidates: NonNullable<Resolution["candidates"]> = [];
  for (const property of properties) {
    const smiles = property.SMILES as string;
    // Records like "cyclobutane monohydrate" add up to the same formula but
    // are mixtures, not isomers of a single molecule.
    if (smiles.includes(".")) continue;
    const key = constitutionKey(smiles);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    candidates.push({ title: property.Title ?? "", smiles, cid: property.CID });
  }
  if (candidates.length === 0) return null;

  // Records PubChem has no name for are the obscure ones; lead with something
  // recognisable, since the first candidate is the structure that gets drawn.
  candidates.sort((a, b) => Number(Boolean(b.title)) - Number(Boolean(a.title)));
  for (const candidate of candidates) {
    if (!candidate.title) candidate.title = `CID ${candidate.cid}`;
  }

  return {
    smiles: candidates[0].smiles,
    source: "formula",
    interpretation: `${formula} is a molecular formula, which does not fix one structure — showing known isomers`,
    openValences: 0,
    title: candidates[0].title,
    cid: candidates[0].cid,
    candidates,
  };
}

/**
 * Fills in the identifiers a stage could not know.
 *
 * Someone who types `(CH3)3COH` wants to be told it is 2-methylpropan-2-ol,
 * and someone who types `aspirin` wants the InChIKey — but a condensed formula
 * carries no name and the local dictionary carries no identifiers. A structure
 * lookup by SMILES supplies both. It is best-effort: the structure is already
 * correct without it.
 */
function needsEnrichment(resolution: Resolution): boolean {
  // An open valence means a fragment, which PubChem does not index, so those
  // are complete as they are.
  if (resolution.openValences > 0) return false;
  return !resolution.iupacName || !resolution.inchiKey;
}

async function enrich(resolution: Resolution): Promise<Resolution> {
  if (!needsEnrichment(resolution)) return resolution;

  const data = await fetchPubChemProperties(
    "smiles",
    new URLSearchParams({ smiles: resolution.smiles }),
    ENRICH_TIMEOUT_MS,
  );
  if (!data) return resolution;

  return {
    ...resolution,
    title: resolution.title ?? data.Title,
    iupacName: resolution.iupacName ?? data.IUPACName,
    inchi: resolution.inchi ?? data.InChI,
    inchiKey: resolution.inchiKey ?? data.InChIKey,
    cid: resolution.cid ?? data.CID,
  };
}

// --- network helpers -------------------------------------------------------

interface OpsinResponse {
  status: string;
  smiles?: string;
  stdinchi?: string;
  stdinchikey?: string;
}

async function fetchOpsin(name: string): Promise<Required<OpsinResponse> | null> {
  const url = `${OPSIN_URL}/${encodeURIComponent(name)}.json`;
  const data = await fetchJson<OpsinResponse>(url);
  if (!data || data.status !== "SUCCESS" || !data.smiles) return null;
  return {
    status: data.status,
    smiles: data.smiles,
    stdinchi: data.stdinchi ?? "",
    stdinchikey: data.stdinchikey ?? "",
  };
}

interface PubChemProperties {
  CID: number;
  smiles: string;
  Title?: string;
  IUPACName?: string;
  InChI?: string;
  InChIKey?: string;
  MolecularFormula?: string;
}

async function fetchPubChemProperties(
  path: string,
  body?: URLSearchParams,
  timeout = NETWORK_TIMEOUT_MS,
): Promise<PubChemProperties | null> {
  const properties = "SMILES,ConnectivitySMILES,MolecularFormula,IUPACName,InChI,InChIKey,Title";
  const url = `${PUBCHEM_URL}/${path}/property/${properties}/JSON`;
  const data = await fetchJson<{
    PropertyTable?: {
      Properties?: Array<
        Record<string, string | number> & { CID: number; SMILES?: string; ConnectivitySMILES?: string }
      >;
    };
  }>(url, body, timeout);
  const row = data?.PropertyTable?.Properties?.[0];
  const smiles = row?.SMILES ?? row?.ConnectivitySMILES;
  if (!row || !smiles) return null;
  return {
    CID: row.CID,
    smiles,
    Title: row.Title as string | undefined,
    IUPACName: row.IUPACName as string | undefined,
    InChI: row.InChI as string | undefined,
    InChIKey: row.InChIKey as string | undefined,
    MolecularFormula: row.MolecularFormula as string | undefined,
  };
}

/** GET (or POST, when a body is given) with a timeout; network errors are not fatal. */
async function fetchJson<T>(
  url: string,
  body?: URLSearchParams,
  timeout = NETWORK_TIMEOUT_MS,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: body ? "POST" : "GET",
      headers: body
        ? { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }
        : { accept: "application/json" },
      body,
      // Structures for a given query never change.
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
