import { depict } from "../src/lib/depict.ts";
for (const [smi, opts] of [
  ["CC(=O)Oc1ccccc1C(=O)O", {}],
  ["[CH2]CCCC", {}],
  ["[Na+].[Cl-]", {}],
  ["CCO", { showHydrogens: true, showCarbons: true, showAtomNumbers: true }],
]) {
  const d = depict(smi, { showHydrogens: false, showCarbons: false, showAtomNumbers: false, ...opts });
  console.log(`${smi}\n  formula=${d.formula} mw=${d.weight} frags=${d.fragmentCount} canon=${d.canonicalSmiles}`);
  console.log("  props:", d.properties.map(p => `${p.label}=${p.value}`).join(", "));
  console.log("  svg:", d.svg.slice(0, 120).replace(/\n/g, " "));
  console.log("  colors:", [...new Set(d.svg.match(/var\(--mol-[a-z]+\)/g) || [])].join(","), "| events left:", (d.svg.match(/class="event"/g)||[]).length);
}
