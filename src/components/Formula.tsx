/**
 * Renders a molecular formula with real subscript markup.
 *
 * Unicode subscript digits are the obvious shortcut, but most fonts space and
 * baseline them badly — C₉H₈O₄ comes out looking like "C 9 H 8 O 4". Marking
 * up the counts instead lets the typeface do it properly, and keeps the plain
 * text selectable and searchable.
 */
export function Formula({ formula, className = "" }: { formula: string; className?: string }) {
  const parts = [...formula.matchAll(/([A-Z][a-z]?|[().+-])(\d*)/g)];

  return (
    <span className={className}>
      {parts.map(([, symbol, count], index) => (
        <span key={`${symbol}${count}${index}`}>
          {symbol}
          {count && <sub className="text-[0.7em] leading-none">{count}</sub>}
        </span>
      ))}
    </span>
  );
}
