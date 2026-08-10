import Link from "next/link";

import { constitutionKey, thumbnail } from "@/lib/depict";
import { isomersOfFormula } from "@/lib/resolve";

import { Formula } from "./Formula";

const LIMIT = 48;

/**
 * Every structure sharing the molecular formula, drawn.
 *
 * A list of names does not answer "what else has this formula" — the whole
 * question is what the skeletons look like. Each card links through so any of
 * them can become the main structure.
 */
export async function IsomerGrid({ formula, current }: { formula: string; current: string }) {
  const isomers = await isomersOfFormula(formula, LIMIT);
  if (isomers.length === 0) {
    return (
      <Section formula={formula}>
        <p className="mt-2 text-sm text-text-dim">
          PubChem has no other structures on file with this formula.
        </p>
      </Section>
    );
  }

  const currentKey = constitutionKey(current);
  const cards = isomers.map((isomer) => ({
    ...isomer,
    svg: thumbnail(isomer.smiles),
    isCurrent: currentKey !== null && constitutionKey(isomer.smiles) === currentKey,
  }));

  return (
    <Section formula={formula} count={cards.length} atLimit={cards.length >= LIMIT}>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.smiles}>
            <Link
              href={`/?q=${encodeURIComponent(`smiles:${card.smiles}`)}&iso=1`}
              className={`flex h-full flex-col overflow-hidden rounded-xl border transition-colors ${
                card.isCurrent
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface-2 hover:border-border-strong"
              }`}
            >
              <div
                className="structure flex h-24 items-center justify-center px-2 pt-3"
                {...(card.svg ? { dangerouslySetInnerHTML: { __html: card.svg } } : {})}
              />
              <span className="line-clamp-2 px-2.5 pt-2 pb-2.5 text-xs text-text-dim">
                {card.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Section({
  formula,
  count,
  atLimit,
  children,
}: {
  formula: string;
  count?: number;
  atLimit?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-text">
          Isomers of <Formula formula={formula} />
        </h2>
        {count !== undefined && (
          <p className="text-xs text-text-faint">
            {atLimit ? `first ${count}` : `${count} structure${count === 1 ? "" : "s"}`} found
          </p>
        )}
      </div>
      <p className="mt-1 max-w-2xl text-sm text-text-dim">
        Same atoms, joined differently. Every one of these is a separate compound with its own
        boiling point, smell and reactions. These are the ones PubChem has on file, which for a
        larger formula is fewer than the number that could exist on paper.
      </p>
      {children}
    </section>
  );
}

export function IsomerGridSkeleton({ formula }: { formula: string }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
      <h2 className="text-sm font-medium text-text">
        Isomers of <Formula formula={formula} />
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="h-36 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </ul>
    </section>
  );
}
