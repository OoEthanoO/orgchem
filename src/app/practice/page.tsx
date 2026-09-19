import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Quiz } from "@/components/Quiz";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CATEGORIES, DIFFICULTIES, TOPIC_ALIASES, countFor } from "@/lib/quiz";

export const metadata: Metadata = {
  title: "chem — organic naming practice",
  description:
    "See a structure, name it — or read a name and find it. IUPAC naming drills by topic and difficulty.",
};

export default function PracticePage() {
  const total = countFor(null, null);

  // How many questions sit behind every selection the UI can offer, so a
  // combination the bank cannot fill is shown as unavailable instead of
  // failing when it is picked.
  const availability: Record<string, number> = {};
  for (const category of [null, ...CATEGORIES.map((item) => item.id)]) {
    for (const difficulty of [null, ...DIFFICULTIES]) {
      availability[`${category ?? "*"}:${difficulty ?? "*"}`] = countFor(category, difficulty);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <Link href="/" className="text-xl font-semibold tracking-tight text-text">
            chem
          </Link>
          <span className="text-sm text-text-dim">naming practice</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-dim transition-colors hover:border-border-strong hover:text-text"
          >
            Look something up
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <nav aria-label="Practice subject" className="flex gap-2">
        <Link href="/practice" aria-current="page" className="rounded-lg border border-accent bg-accent-soft px-3 py-2 text-sm font-medium text-accent-text">
          Organic compounds
        </Link>
        <Link href="/practice/complexes" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-dim transition-colors hover:border-border-strong hover:text-text">
          Coordination complexes
        </Link>
      </nav>

      <p className="text-sm text-text-dim">
        {total} structures, each with a name checked against two independent systems. Name one, or
        find one from its name. Any name that identifies the right compound is accepted — not just
        the one on file.
      </p>

      {/*
        The drill reads its selection from the query string, which the page
        around it does not need: everything above and below here is the same
        whatever is being practised, so it stays prerendered while this waits.
      */}
      <Suspense fallback={<div className="h-[28rem] animate-pulse rounded-2xl bg-surface-2" />}>
        <Quiz categories={CATEGORIES} availability={availability} topicAliases={TOPIC_ALIASES} />
      </Suspense>

      <footer className="mt-auto pt-6 text-xs text-text-faint">
        Answers are marked by resolving what you type back into a structure and comparing it with
        the one shown.
      </footer>
    </div>
  );
}
