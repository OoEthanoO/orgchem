import { NextResponse } from "next/server";

import { DEFAULT_DISPLAY, DepictionError, depict } from "@/lib/depict";
import { ResolveError, resolveQuery } from "@/lib/resolve";

/**
 * JSON version of what the page does, for scripting against.
 *
 *   GET /api/resolve?q=CH3CH2COOH
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "Pass a query as ?q=" }, { status: 400 });
  }

  try {
    const resolution = await resolveQuery(query);
    const depiction = depict(resolution.smiles, {
      ...DEFAULT_DISPLAY,
      showHydrogens: new URL(request.url).searchParams.get("h") === "1",
    });

    return NextResponse.json({
      query,
      smiles: depiction.canonicalSmiles,
      inputSmiles: resolution.smiles,
      formula: depiction.formulaPlain,
      undefinedStereocentres: depiction.undefinedStereocentres,
      undefinedDoubleBonds: depiction.undefinedDoubleBonds,
      molecularWeight: Number(depiction.weight),
      source: resolution.source,
      interpretation: resolution.interpretation,
      openValences: depiction.openValences,
      title: resolution.title,
      iupacName: resolution.iupacName,
      inchi: resolution.inchi,
      inchiKey: resolution.inchiKey,
      cid: resolution.cid,
      properties: Object.fromEntries(depiction.properties.map((p) => [p.label, p.value])),
      candidates: resolution.candidates,
      svg: depiction.svg,
    });
  } catch (error) {
    if (error instanceof ResolveError) {
      return NextResponse.json({ error: error.message, hint: error.hint }, { status: 404 });
    }
    if (error instanceof DepictionError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Unexpected failure." }, { status: 500 });
  }
}
