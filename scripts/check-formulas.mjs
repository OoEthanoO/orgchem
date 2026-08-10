import OCL from "openchemlib";
import { DICTIONARY } from "../src/lib/dictionary.ts";
// Spot-check formulas against textbook values.
const EXPECT = {
  aspirin:"C9H8O4", caffeine:"C8H10N4O2", glucose:"C6H12O6", ibuprofen:"C13H18O2",
  paracetamol:"C8H9NO2", nicotine:"C10H14N2", benzene:"C6H6", ethanol:"C2H6O",
  "acetic acid":"C2H4O2", cholesterol:"C27H46O", morphine:"C17H19NO3", codeine:"C18H21NO3",
  sucrose:"C12H22O11", glycine:"C2H5NO2", tryptophan:"C11H12N2O2", "citric acid":"C6H8O7",
  testosterone:"C19H28O2", capsaicin:"C18H27NO3", vanillin:"C8H8O3", thc:"C21H30O2",
  adenine:"C5H5N5", "ascorbic acid":"C6H8O6", aspartame:"C14H18N2O5", naproxen:"C14H14O3",
  serotonin:"C10H12N2O", dopamine:"C8H11NO2", melatonin:"C13H16N2O2", limonene:"C10H16",
  camphor:"C10H16O", estradiol:"C18H24O2", cortisol:"C21H30O5", atp:"C10H16N5O13P3",
  "oleic acid":"C18H34O2","stearic acid":"C18H36O2","folic acid":"C19H19N7O6",
  amoxicillin:"C16H19N3O5S","penicillin g":"C16H18N2O4S", saccharin:"C7H5NO3S",
  "vitamin a":"C20H30O", eugenol:"C10H12O2", glyphosate:"C3H8NO5P", ddt:"C14H9Cl5",
};
const bad=[];
for (const [n,want] of Object.entries(EXPECT)) {
  const smi = DICTIONARY[n];
  if (!smi) { bad.push(`${n}: missing`); continue; }
  const got = OCL.Molecule.fromSmiles(smi).getMolecularFormula().formula;
  if (got !== want) bad.push(`${n}: got ${got}, want ${want}`);
}
console.log(`${Object.keys(EXPECT).length-bad.length}/${Object.keys(EXPECT).length} formulas match`);
if (bad.length) console.log(bad.join("\n"));
