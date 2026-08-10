import { depict } from "@/lib/depict";
import { resolveQuery } from "@/lib/resolve";

/**
 * The structure as a standalone SVG download. Theme variables are resolved to
 * fixed colours here, since the file leaves the page that defines them.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim();
  if (!query) return new Response("Pass a query as ?q=", { status: 400 });

  try {
    const resolution = await resolveQuery(query);
    const depiction = depict(resolution.smiles, {
      showHydrogens: params.get("h") === "1",
      showCarbons: params.get("c") === "1",
      showAtomNumbers: params.get("n") === "1",
      showStereoLabels: params.get("s") === "1",
    });

    return new Response(inlineColors(depiction.svg), {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "content-disposition": `attachment; filename="${fileName(query)}.svg"`,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Could not draw that structure.", { status: 404 });
  }
}

const FIXED_COLORS: Record<string, string> = {
  "var(--mol-bond)": "#1f1d1a",
  "var(--mol-o)": "#c62828",
  "var(--mol-n)": "#2547c4",
  "var(--mol-s)": "#9a7a09",
  "var(--mol-cl)": "#1a8f3c",
  "var(--mol-br)": "#9c4221",
  "var(--mol-f)": "#4d8f1f",
  "var(--mol-p)": "#c2610c",
  "var(--mol-i)": "#6b21a8",
  "var(--mol-x)": "#57534e",
};

function inlineColors(svg: string): string {
  return svg.replace(/var\(--mol-[a-z]+\)/g, (match) => FIXED_COLORS[match] ?? "#1f1d1a");
}

function fileName(query: string): string {
  const slug = query
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "structure";
}
