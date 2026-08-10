import { stereoPair } from "@/lib/stereo";

import { StereoViewer } from "./StereoViewer";

/**
 * Generating two conformers takes up to a second or so, which is too long to
 * hold up the structure. The page streams this section in separately.
 */
export async function StereoSection({ smiles }: { smiles: string }) {
  const pair = stereoPair(smiles);
  if (!pair) return null;

  const [first, second] = pair.isomers;
  const kind = pair.kind === "stereocentre" ? "stereocentre" : "double bond";

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-text">
          Both stereoisomers, in three dimensions
        </h2>
        <p className="text-xs text-text-faint">Drag either model to turn both</p>
      </div>

      <p className="mt-1 max-w-2xl text-sm text-text-dim">
        {pair.wasUnspecified
          ? `The one ${kind} here can take either configuration, and the query did not say which. `
          : `The one ${kind} here could take either configuration. `}
        {pair.kind === "stereocentre"
          ? `(${first.label}) and (${second.label}) are mirror images: no amount of turning makes one sit on top of the other.`
          : `(${first.label}) and (${second.label}) differ in which side of the double bond the substituents sit on, and the bond cannot rotate to interconvert them.`}
      </p>

      <div className="mt-4">
        <StereoViewer isomers={pair.isomers} />
      </div>
    </section>
  );
}

/** Placeholder held in the layout while the conformers are being built. */
export function StereoSectionSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow)] sm:p-5">
      <div className="h-4 w-64 animate-pulse rounded bg-surface-2" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="h-56 animate-pulse rounded-xl bg-surface-2" />
        <div className="h-56 animate-pulse rounded-xl bg-surface-2" />
      </div>
    </section>
  );
}
