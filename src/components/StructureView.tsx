import type { Depiction, DisplayOptions } from "@/lib/depict";
import type { Resolution } from "@/lib/resolve";

import { CopyButton } from "./CopyButton";
import { Formula } from "./Formula";

const SOURCE_LABELS: Record<Resolution["source"], string> = {
  dictionary: "common name",
  condensed: "condensed formula",
  smiles: "SMILES",
  opsin: "IUPAC name",
  "local-name": "IUPAC name",
  pubchem: "PubChem",
  formula: "molecular formula",
};

type Props = {
  query: string;
  resolution: Resolution;
  depiction: Depiction;
  display: DisplayOptions;
  /** Link to switch the isomer list on or off, when the structure has one. */
  isomers?: { open: boolean; href: string };
};

export function StructureView({ query, resolution, depiction, display, isomers }: Props) {
  const heading = resolution.title ?? resolution.iupacName ?? query;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-medium text-text sm:text-xl" title={heading}>
              {heading}
            </h1>
            <p className="mt-0.5 text-sm text-text-dim">{resolution.interpretation}</p>
          </div>
          <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">
            read as {SOURCE_LABELS[resolution.source]}
          </span>
        </header>

        {/*
          The SVG is generated on the server by OpenChemLib. `role="img"` on the
          wrapper makes assistive technology treat the drawing as one image with
          the label below, instead of walking its atom labels and reading out
          "O O O O H".
        */}
        <div
          role="img"
          aria-label={`Structure of ${heading}, molecular formula ${spellFormula(depiction.formulaPlain)}`}
          className="structure flex min-h-[15rem] items-center justify-center overflow-x-auto bg-surface p-4 sm:min-h-[20rem] sm:p-6"
          dangerouslySetInnerHTML={{ __html: depiction.svg }}
        />

        {depiction.openValences > 0 && (
          <Note title="Substituent group.">
            {depiction.openValences === 1
              ? "The dot marks the single open valence — the point where this group attaches."
              : `The dots mark ${depiction.openValences} open valences.`}
          </Note>
        )}

        {(depiction.undefinedStereocentres > 0 || depiction.undefinedDoubleBonds > 0) && (
          <Note title="Configuration not specified.">
            {describeUndefinedStereochemistry(
              depiction.undefinedStereocentres,
              depiction.undefinedDoubleBonds,
            )}
          </Note>
        )}

        <DisplayControls query={query} display={display} />
      </section>

      <aside className="grid gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <Formula
              formula={depiction.formulaPlain}
              className="text-2xl leading-none tracking-tight text-text"
            />
            <p className="shrink-0 text-sm text-text-dim">
              {depiction.weight} <span className="text-text-faint">g/mol</span>
            </p>
          </div>
          {isomers && (
            <a
              href={isomers.href}
              className="mt-2 inline-flex items-center gap-1 text-sm text-accent-text hover:underline"
            >
              {isomers.open ? "Hide isomers" : "Show all isomers"}
              <svg
                viewBox="0 0 20 20"
                className={`size-3.5 transition-transform ${isomers.open ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
          {depiction.fragmentCount > 1 && (
            <p className="mt-2 text-xs text-text-dim">
              {depiction.fragmentCount} separate components (a salt, mixture or hydrate).
            </p>
          )}

          <dl className="mt-4 grid gap-x-3 gap-y-1.5 text-sm">
            {depiction.properties.map((property) => (
              <div key={property.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-text-dim" title={property.hint}>
                  {property.hint ? (
                    <span className="cursor-help decoration-border-strong decoration-dotted underline-offset-4 hover:underline">
                      {property.label}
                    </span>
                  ) : (
                    property.label
                  )}
                </dt>
                <dd className="shrink-0 font-mono text-text">{property.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
          <h2 className="text-xs font-medium tracking-wide text-text-faint uppercase">Identifiers</h2>
          <div className="mt-3 grid gap-3">
            <Identifier label="SMILES" value={depiction.canonicalSmiles} />
            {resolution.iupacName && <Identifier label="IUPAC name" value={resolution.iupacName} wrap />}
            {resolution.inchiKey && <Identifier label="InChIKey" value={resolution.inchiKey} />}
            {resolution.inchi && <Identifier label="InChI" value={resolution.inchi} clamp />}
          </div>

          {resolution.cid && (
            <a
              href={`https://pubchem.ncbi.nlm.nih.gov/compound/${resolution.cid}`}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex items-center gap-1 text-sm text-accent-text hover:underline"
            >
              PubChem CID {resolution.cid}
              <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5V12M11 4h5v5M16 4l-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}

/**
 * Says what the input left open, in the terms a chemist would use. Both kinds
 * of missing stereochemistry mean the drawing stands for more than one real
 * compound, which is worth stating rather than leaving to be noticed.
 */
function describeUndefinedStereochemistry(centres: number, doubleBonds: number): string {
  const parts: string[] = [];
  if (centres > 0) {
    parts.push(
      centres === 1
        ? "a stereocentre whose configuration the input did not fix"
        : `${centres} stereocentres whose configuration the input did not fix`,
    );
  }
  if (doubleBonds > 0) {
    parts.push(
      doubleBonds === 1
        ? "a double bond that could be cis or trans"
        : `${doubleBonds} double bonds that could each be cis or trans`,
    );
  }
  return `This structure has ${parts.join(", and ")}, so the drawing stands for more than one compound.`;
}

/**
 * A molecular formula as words. Read character by character, "C9H8O4" comes out
 * as an unbroken run of letters and digits; spacing the elements apart lets a
 * screen reader say "C 9, H 8, O 4".
 */
function spellFormula(formula: string): string {
  return formula.replace(/([A-Z][a-z]?)(\d*)/g, (_match, element, count) =>
    count ? `${element} ${count}, ` : `${element}, `,
  ).replace(/,\s*$/, "");
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <p className="border-t border-border bg-surface-2 px-4 py-2.5 text-sm text-text-dim sm:px-5">
      <span className="font-medium text-text">{title}</span> {children}
    </p>
  );
}

function Identifier({
  label,
  value,
  wrap,
  clamp,
}: {
  label: string;
  value: string;
  wrap?: boolean;
  clamp?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-text-faint">{label}</span>
        <CopyButton value={value} label={label} />
      </div>
      <p
        className={`mt-0.5 text-xs text-text ${
          wrap ? "break-words" : "font-mono break-all"
        } ${clamp ? "line-clamp-3" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Display toggles are plain links so the drawing options end up in the URL and
 * the page keeps working without client-side JavaScript.
 */
function DisplayControls({ query, display }: { query: string; display: DisplayOptions }) {
  const toggles = [
    { key: "h", label: "Hydrogens", on: display.showHydrogens },
    { key: "c", label: "Carbon labels", on: display.showCarbons },
    { key: "n", label: "Atom numbers", on: display.showAtomNumbers },
    { key: "s", label: "R/S labels", on: display.showStereoLabels },
  ] as const;

  const href = (changed: string, on: boolean) => {
    const params = new URLSearchParams({ q: query });
    for (const toggle of toggles) {
      const active = toggle.key === changed ? !on : toggle.on;
      if (active) params.set(toggle.key, "1");
    }
    return `/?${params}`;
  };

  const download = new URLSearchParams({ q: query });
  for (const toggle of toggles) if (toggle.on) download.set(toggle.key, "1");

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2 px-4 py-3 sm:px-5">
      {toggles.map((toggle) => (
        <a
          key={toggle.key}
          href={href(toggle.key, toggle.on)}
          title={toggle.on ? `Hide ${toggle.label.toLowerCase()}` : `Show ${toggle.label.toLowerCase()}`}
          className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
            toggle.on
              ? "border-accent bg-accent-soft text-accent-text"
              : "border-border bg-surface text-text-dim hover:border-border-strong hover:text-text"
          }`}
        >
          {toggle.on && <span aria-hidden="true">✓ </span>}
          {toggle.label}
        </a>
      ))}
      <a
        href={`/api/svg?${download}`}
        download
        className="ml-auto rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-text-dim transition-colors hover:border-border-strong hover:text-text"
      >
        Download SVG
      </a>
    </div>
  );
}
