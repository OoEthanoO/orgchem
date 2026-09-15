import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Quiz } from "@/components/Quiz";
import { ThemeToggle } from "@/components/ThemeToggle";
import { COMPLEX_CATEGORIES, COMPLEX_DIFFICULTIES, countComplexQuestions } from "@/lib/complex-quiz";

export const metadata: Metadata = {
  title: "chem — coordination complex practice",
  description: "Practice naming coordination complexes and matching names to formulas, from ammine and aqua ligands to chelates and complex salts.",
};

export default function ComplexPracticePage() {
  const total = countComplexQuestions(null, null);
  const availability: Record<string, number> = {};
  for (const category of [null, ...COMPLEX_CATEGORIES.map((item) => item.id)]) {
    for (const difficulty of [null, ...COMPLEX_DIFFICULTIES]) {
      availability[`${category ?? "*"}:${difficulty ?? "*"}`] = countComplexQuestions(category, difficulty);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="text-xl font-semibold tracking-tight text-text">chem</Link>
          <span className="text-sm text-text-dim">naming practice</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-dim transition-colors hover:border-border-strong hover:text-text">
            Look something up
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <nav aria-label="Practice subject" className="flex gap-2">
        <Link href="/practice" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-dim transition-colors hover:border-border-strong hover:text-text">
          Organic compounds
        </Link>
        <Link href="/practice/complexes" aria-current="page" className="rounded-lg border border-accent bg-accent-soft px-3 py-2 text-sm font-medium text-accent-text">
          Coordination complexes
        </Link>
      </nav>

      <p className="text-sm text-text-dim">
        {total} complex ions and salts. Name a formula, or find the complex a name describes.
        Practise ligand prefixes, oxidation states, chelates and counterions. Both modern names
        such as chlorido and traditional names such as chloro are accepted.
      </p>

      <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-2xl bg-surface-2" />}>
        <Quiz categories={COMPLEX_CATEGORIES} availability={availability} endpoint="/api/complex-quiz" subject="complexes" />
      </Suspense>

      <footer className="mt-auto pt-6 text-xs text-text-faint">
        Formulas and ligand schematics specify composition, not stereochemistry. Answers are
        checked by metal, oxidation state, ligands, charge and counterions.
      </footer>
    </div>
  );
}
