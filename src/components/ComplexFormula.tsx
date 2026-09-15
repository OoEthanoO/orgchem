/** Brackets stay visible; ligand counts are subscripts and the ion charge is superscript. */
export function ComplexFormula({ formula, className = "" }: { formula: string; className?: string }) {
  const [body, charge] = formula.split("^");
  return (
    <span className={className} aria-label={formula}>
      {body.split(/(\d+)/).map((part, index) =>
        /^\d+$/.test(part)
          ? <sub key={index} className="text-[0.7em] leading-none">{part}</sub>
          : <span key={index}>{part}</span>,
      )}
      {charge && <sup className="text-[0.7em] leading-none">{charge.replace("-", "−")}</sup>}
    </span>
  );
}
