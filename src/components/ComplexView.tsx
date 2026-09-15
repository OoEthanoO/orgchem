import Link from "next/link";

import { complexSvg, type CoordinationComplex } from "@/lib/complexes";
import { ComplexFormula } from "./ComplexFormula";
import { CopyButton } from "./CopyButton";

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value).replace("-", "−");
}

export function ComplexView({ complex, query }: { complex: CoordinationComplex; query: string }) {
  const ligandCharge = complex.ligands.reduce((sum, ligand) => sum + ligand.count * ligand.charge, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
        <header className="border-b border-border px-4 py-4 sm:px-5">
          <span className="mb-2 inline-block rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">coordination complex</span>
          <h1 className="break-words text-lg font-medium text-text sm:text-xl">{complex.canonicalName}</h1>
          <p className="mt-2 text-xl text-text-dim"><ComplexFormula formula={complex.formula} /></p>
          {complex.charge === 0 && !complex.counterion && query.includes("[") && (
            <p className="mt-2 text-sm text-text-dim">No charge was written, so this formula is read as neutral. Include the charge or counterions for an ion.</p>
          )}
        </header>
        <div
          role="img"
          aria-label={`Coordination schematic of ${complex.canonicalName}. ${complex.coordinationNumber} donor atoms around ${complex.metal.name}.`}
          className="structure flex min-h-[20rem] items-center justify-center overflow-x-auto p-4 sm:p-6"
          dangerouslySetInnerHTML={{ __html: complexSvg(complex) }}
        />
        <div className="border-t border-border px-4 py-3 text-sm text-text-dim sm:px-5">
          <p>{complex.geometryNote}</p>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-border px-4 py-3 text-sm sm:px-5">
          <a className="text-accent-text hover:underline" href={`/api/svg?q=${encodeURIComponent(query)}`}>Download SVG</a>
          <Link className="text-accent-text hover:underline" href="/practice/complexes">Practise complexes →</Link>
        </div>
      </section>
      <aside className="grid gap-4">
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
          <h2 className="text-sm font-medium text-text">The coordination sphere</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            {[
              ["Central metal", `${complex.metal.name} (${complex.metal.symbol})`],
              ["Metal oxidation state", signed(complex.oxidationState)],
              ["Complex charge", signed(complex.charge)],
              ["Coordination number", String(complex.coordinationNumber)],
              ["Geometry", complex.geometry],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-text-dim">{label}</dt>
                <dd className="text-right text-text">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-text-dim">
            Charge balance: metal ({signed(complex.oxidationState)}) + ligands ({signed(ligandCharge)}) = complex ({signed(complex.charge)}).
          </p>
          {complex.counterion && <p className="mt-2 text-xs text-text-dim">The salt contains {complex.complexCount} complex {complex.complexCount === 1 ? "ion" : "ions"} and {complex.counterion.count} {complex.counterion.name} {complex.counterion.count === 1 ? "ion" : "ions"} per formula unit.</p>}
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
          <h2 className="text-sm font-medium text-text">Ligands</h2>
          <ul className="mt-3 grid gap-3 text-sm">
            {complex.ligands.map((ligand) => <li key={ligand.name}>
              <p className="text-text">{ligand.count} × {ligand.name} <span className="text-text-dim">(<ComplexFormula formula={ligand.formula} />)</span></p>
              <p className="mt-0.5 text-xs text-text-dim">{ligand.donor} donor · charge {signed(ligand.charge)} each · {ligand.denticity === 1 ? "monodentate" : `${ligand.denticity} donor sites each`}</p>
            </li>)}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
            <span className="flex items-center gap-1 text-xs text-text-dim">Formula <CopyButton value={complex.formula} label="formula" /></span>
            <span className="flex items-center gap-1 text-xs text-text-dim">Name <CopyButton value={complex.canonicalName} label="name" /></span>
          </div>
        </section>
      </aside>
    </div>
  );
}
