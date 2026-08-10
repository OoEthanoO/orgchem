import Link from "next/link";
import { Suspense } from "react";

import { IsomerGrid, IsomerGridSkeleton } from "@/components/IsomerGrid";
import { SearchForm } from "@/components/SearchForm";
import { StereoSection, StereoSectionSkeleton } from "@/components/StereoSection";
import { StructureView } from "@/components/StructureView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DepictionError, depict, type DisplayOptions } from "@/lib/depict";
import { ResolveError, resolveQuery } from "@/lib/resolve";

export const dynamic = "force-dynamic";

const EXAMPLES: Array<{ query: string; note: string }> = [
  { query: "CH₃CH₂CH₂CH₂CH₂–", note: "condensed formula for a group" },
  { query: "2-methylbutan-1-ol", note: "IUPAC name" },
  { query: "(CH₃)₃COH", note: "branches in parentheses" },
  { query: "caffeine", note: "common name" },
  { query: "CH₃(CH₂)₁₆COOH", note: "repeat units" },
  { query: "hexa-2,4-diene", note: "locants and unsaturation" },
  { query: "CC(=O)Oc1ccccc1C(=O)O", note: "SMILES" },
  { query: "C₄H₁₀O", note: "ambiguous molecular formula" },
];

export default async function Page({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const query = firstValue(params.q)?.trim() ?? "";
  const display: DisplayOptions = {
    showHydrogens: firstValue(params.h) === "1",
    showCarbons: firstValue(params.c) === "1",
    showAtomNumbers: firstValue(params.n) === "1",
    showStereoLabels: firstValue(params.s) === "1",
  };
  const showIsomers = firstValue(params.iso) === "1";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-tight text-text">orgchem</span>
          <span className="hidden text-sm text-text-dim sm:inline">
            type anything, see the structure
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <SearchForm initialQuery={query} />

      {query ? (
        <Result query={query} display={display} showIsomers={showIsomers} />
      ) : (
        <Landing />
      )}

      <footer className="mt-auto grid gap-2 pt-6 text-xs text-text-faint">
        <p>
          Built by{" "}
          <a
            className="text-text-dim hover:text-text hover:underline"
            href="https://www.ethanyanxu.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            Ethan Yan Xu
          </a>
          . More work at{" "}
          <a
            className="text-text-dim hover:text-text hover:underline"
            href="https://www.ethanyanxu.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            ethanyanxu.com
          </a>{" "}
          and{" "}
          <a
            className="text-text-dim hover:text-text hover:underline"
            href="https://map.ethanyanxu.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            map.ethanyanxu.com
          </a>
          .
        </p>
        <p>
        Names resolved with{" "}
        <a
          className="hover:text-text-dim hover:underline"
          href="https://github.com/dan2097/opsin"
          target="_blank"
          rel="noreferrer noopener"
        >
          OPSIN
        </a>{" "}
        and{" "}
        <a
          className="hover:text-text-dim hover:underline"
          href="https://pubchem.ncbi.nlm.nih.gov/"
          target="_blank"
          rel="noreferrer noopener"
        >
          PubChem
        </a>
        ; structures drawn with{" "}
        <a
          className="hover:text-text-dim hover:underline"
          href="https://github.com/cheminfo/openchemlib-js"
          target="_blank"
          rel="noreferrer noopener"
        >
          OpenChemLib
        </a>
        . Predicted properties are estimates, not measurements.
        </p>
      </footer>
    </div>
  );
}

async function Result({
  query,
  display,
  showIsomers,
}: {
  query: string;
  display: DisplayOptions;
  showIsomers: boolean;
}) {
  let resolution;
  try {
    resolution = await resolveQuery(query);
  } catch (error) {
    return (
      <Problem
        title={error instanceof ResolveError ? error.message : "Something went wrong."}
        hint={error instanceof ResolveError ? error.hint : undefined}
      />
    );
  }

  let depiction;
  try {
    depiction = depict(resolution.smiles, display);
  } catch (error) {
    return (
      <Problem
        title="That resolved to a structure that could not be drawn."
        hint={error instanceof DepictionError ? error.message : undefined}
      />
    );
  }

  // A structure with an open valence is a fragment, and fragments do not have
  // a molecular formula that anything else shares.
  const canListIsomers = depiction.openValences === 0;
  // Asking for a formula is already asking for its isomers.
  const isomersOpen = showIsomers || resolution.source === "formula";

  return (
    <div className="grid gap-4">
      <StructureView
        query={query}
        resolution={resolution}
        depiction={depiction}
        display={display}
        isomers={
          canListIsomers
            ? { open: isomersOpen, href: isomerHref(query, display, !isomersOpen) }
            : undefined
        }
      />
      <Suspense fallback={<StereoSectionSkeleton />}>
        <StereoSection smiles={resolution.smiles} />
      </Suspense>
      {canListIsomers && isomersOpen && (
        <Suspense fallback={<IsomerGridSkeleton formula={depiction.formulaPlain} />}>
          <IsomerGrid formula={depiction.formulaPlain} current={resolution.smiles} />
        </Suspense>
      )}
    </div>
  );
}

function Problem({ title, hint }: { title: string; hint?: string }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
      <p className="text-text">{title}</p>
      {hint && <p className="mt-2 text-sm text-text-dim">{hint}</p>}
      <ExampleList className="mt-5" />
    </section>
  );
}

function Landing() {
  return (
    <section className="grid gap-6">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-sm font-medium text-text">What it understands</h2>
        <ul className="mt-3 grid gap-2 text-sm text-text-dim sm:grid-cols-2">
          <li>
            <strong className="font-medium text-text">Condensed formulas</strong> — the way
            structures get written by hand, including branches, repeat units and open valences.
          </li>
          <li>
            <strong className="font-medium text-text">IUPAC names</strong> — locants, multipliers,
            unsaturation, functional-group suffixes, stereodescriptors.
          </li>
          <li>
            <strong className="font-medium text-text">Common and trade names</strong> — from
            acetone to amoxicillin.
          </li>
          <li>
            <strong className="font-medium text-text">SMILES and InChI</strong> — pasted straight
            in, or prefixed with <code className="font-mono text-text">smiles:</code> to be sure.
          </li>
        </ul>
        <ExampleList className="mt-6" />
      </div>
    </section>
  );
}

function ExampleList({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium tracking-wide text-text-faint uppercase">Try one</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <li key={example.query}>
            <Link
              href={`/?q=${encodeURIComponent(example.query)}`}
              title={example.note}
              className="inline-block rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-text-dim transition-colors hover:border-accent hover:text-text"
            >
              {example.query}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The current URL with the isomer list switched on or off. */
function isomerHref(query: string, display: DisplayOptions, open: boolean): string {
  const params = new URLSearchParams({ q: query });
  if (display.showHydrogens) params.set("h", "1");
  if (display.showCarbons) params.set("c", "1");
  if (display.showAtomNumbers) params.set("n", "1");
  if (display.showStereoLabels) params.set("s", "1");
  if (open) params.set("iso", "1");
  return `/?${params}`;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
