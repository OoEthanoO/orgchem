/**
 * Additional course-sized naming exercises. These are candidate structures,
 * never trusted name/structure pairs: build-quiz-bank.mjs --expand obtains the
 * name and structure from PubChem and checks both against OPSIN before adding.
 */
export function expansionCandidates() {
  const entries = [];
  const add = (category, smiles) => entries.push({ category, smiles });
  const ring = (size, branches = []) => Array.from({ length: size }, (_, i) =>
    `C${i === 0 ? "1" : ""}${branches.filter(([at]) => at === i + 1).map(([, group]) => `(${group})`).join("")}${i === size - 1 ? "1" : ""}`,
  ).join("");

  // Rings and branched substituents add parent selection and numbering work,
  // rather than simply extending the original bank's straight-chain series.
  for (let size = 3; size <= 8; size++) {
    for (const group of ["C", "CC", "C(C)C"]) add("alkanes", ring(size, [[1, group]]));
    for (const at of [1, 2, 3]) add("alkanes", ring(size, [[1, "C"], [at, "C"]]));
    add("alkanes", ring(size, [[1, "CC"], [2, "C"]]));
  }
  for (const smiles of ["C", "CC", "CCC", "CC(C)C", "CC(C)(C)C", "C1CC1", "C1CCCCCCC1", "CC(C)(C)CC(C)(C)C", "CCC(C)(C)CCC", "CCC(CC)CC(CC)CC", "CC(C)CCC(C)(C)C", "CCC(C)C(C)(C)CC", "CCC(C)(CC)CC", "CC(C)C(C)C(C)CC", "CCC(CC)C(CC)CC"]) add("alkanes", smiles);

  for (const smiles of [
    "C=C", "C#C", "C=CC", "CC#C", "C=C(C)CC", "C=CC(C)C", "C=C(C)CCC", "C=C(C)C(C)C", "CC=C(C)CC", "CC=C(C)CCC", "C=CC(C)CC", "C=CCC(C)C", "CC(C)C#C", "CC(C)CC#C", "CCC(C)C#C", "CC(C)C#CC", "CC(C)CC#CC", "CC(C)(C)C#C", "C=CC#C", "C=CCC#C", "C=CCCC=C", "C=CC=CC=C", "C=C(C)C=C", "C=C(C)C(C)=C", "C#CC#C", "CC#CC#C", "C1=CC1", "C1=CCC1", "C1=CCCC1", "C1=CCCCCC1", "C1=CCCCCCC1", "CC1=CCCC1", "CC1=CCC(C)C1", "CC1=CC(C)CC1", "C=C1CCCCC1", "C=CC1CCCCC1", "C1=CCC=CC1", "C1=CC=CCC1",
    "C/C=C/CCC", "C/C=C\\CCC", "CC/C=C/CC", "C/C=C/CCCC", "C/C=C\\CCCC", "CC/C=C/CCC", "CC/C=C\\CCC", "C/C=C/C(C)C", "C/C=C\\C(C)C", "C/C=C/C(C)CC", "C/C=C\\C(C)CC", "C/C=C/C=C\\C", "C/C=C\\C=C/C", "CC(C)/C=C/C(C)C", "CC(C)/C=C\\C(C)C", "CC(C)C=C(C)CC", "CCC(C)=C(C)CC",
  ]) add("unsaturated", smiles);

  for (let size = 3; size <= 6; size++) {
    for (const halogen of ["Cl", "Br", "F"]) {
      add("halides", ring(size, [[1, halogen]]));
      add("halides", ring(size, [[1, "C"], [1, halogen]]));
      add("halides", ring(size, [[1, "C"], [2, halogen]]));
    }
  }
  for (const smiles of ["FCF", "FC(F)F", "ClCCl", "BrCBr", "ClCBr", "FCCF", "BrCCBr", "ClCC(Cl)Cl", "ClC(Cl)CC", "BrCC(C)(C)C", "FCC(C)C", "ClCC(C)(C)C", "CC(Br)CCCl", "CC(F)C(Cl)C", "CC(Cl)C(Cl)C", "CC(Br)C(Br)C"]) add("halides", smiles);

  for (let size = 3; size <= 7; size++) {
    add("alcohols", ring(size, [[1, "O"]]));
    add("alcohols", ring(size, [[1, "O"], [1, "C"]]));
    add("alcohols", ring(size, [[1, "O"], [2, "C"]]));
    add("alcohols", ring(size, [[1, "O"], [3, "C"]]));
    add("alcohols", ring(size, [[1, "CO"]]));
  }
  for (const smiles of ["CO", "CCO", "CC(O)C", "CC(C)(O)CC", "CCC(O)(C)CC", "CC(C)(C)CO", "OCCC(C)C", "OCC(C)(C)C", "OCCCCO", "OCC(O)CC", "CC(O)C(O)C", "OC1CCCCC1O", "C=CCO", "C=CCC(O)C", "CC#CCO", "C#CCO", "CCCOCC", "CCCOCCC", "COCCC", "COCC(C)C", "COC(C)(C)C", "CCOC(C)C", "COC1CCCCC1", "COCCO", "CCOCCO", "C1CO1", "C1COC1", "C1CCOC1", "C1CCOCC1", "C1COCCO1"]) add("alcohols", smiles);

  for (let size = 3; size <= 8; size++) {
    add("carbonyls", ring(size, [[1, "=O"]]));
    for (const at of [2, 3]) add("carbonyls", ring(size, [[1, "=O"], [at, "C"]]));
    add("carbonyls", ring(size, [[1, "C=O"]]));
    if (size >= 4) add("carbonyls", ring(size, [[1, "=O"], [2, "C"], [3, "C"]]));
  }
  for (const smiles of [
    "C=O", "CC=O", "CC(=O)C", "CCC(C)C=O", "CCCC(C)C=O", "CCC(CC)C=O", "CC(C)(C)C=O", "CCC(C)(C)C=O", "CC(C)C(C)C=O", "CC(C)CC(C)CC=O", "CCC(C)CC(C)C=O", "CC(C)(C)CC=O", "CC(C)(C)CC(C)=O", "CC(=O)C(C)(C)C", "CCC(=O)C(C)CC", "CCC(=O)CC(C)C", "CC(=O)C(C)CC", "CCC(=O)C(C)C", "CC(=O)C(C)C(C)C", "CC(=O)CC(C)(C)C", "C=CC=O", "CC=CC=O", "C=CC(=O)C", "CC(=O)C=C(C)C", "CC(=O)C=CC", "O=CCCC=O", "CC(=O)C(=O)C", "CC(=O)CCC(C)=O", "O=CC(C)C=O", "CC(=O)C(O)C", "O=CC(O)C", "O=CC(Cl)C", "CC(=O)CCCl", "CC(=O)CO", "CC(=O)COC",
  ]) add("carbonyls", smiles);

  for (let size = 3; size <= 6; size++) {
    add("acids", ring(size, [[1, "C(=O)O"]]));
    add("acids", ring(size, [[1, "C(=O)O"], [2, "C"]]));
    add("acids", ring(size, [[1, "C(=O)OC"]]));
    add("acids", ring(size, [[1, "C(=O)N"]]));
  }
  for (const smiles of ["C(=O)O", "O=C(O)C(=O)O", "CCC(C)(C)C(=O)O", "CC(C)(C)C(=O)O", "CC(C)C(=O)OC", "CC(C)C(=O)OCC", "CC(=O)OC(C)C", "CC(=O)OCCC", "CC(=O)OCC(C)C", "CCC(=O)OC(C)C", "CCC(=O)OCCC", "CCCC(=O)OC", "CCC(C)C(=O)OC", "COC(=O)CC(=O)OC", "CCOC(=O)CC(=O)OCC", "CC(O)C(=O)O", "CC(O)CC(=O)O", "OCC(=O)O", "CC(=O)C(=O)O", "CC(=O)CC(=O)O", "CC(Br)C(=O)O", "ClCCC(=O)O", "C=CC(=O)O", "CC=CC(=O)O", "C=C(C)C(=O)O", "C=CC(=O)OC", "CC(C)C(=O)N", "CCCC(=O)N", "CC(=O)N(C)C", "CC(=O)NCC", "CCC(=O)NC", "CCC(=O)N(C)C", "CC(C)C(=O)Cl", "CCCC(=O)Cl", "CC(=O)OC(C)=O"]) add("acids", smiles);

  for (let size = 3; size <= 7; size++) {
    add("amines", ring(size, [[1, "N"]]));
    add("amines", ring(size, [[1, "N"], [2, "C"]]));
    add("amines", ring(size, [[1, "C#N"]]));
    add("amines", ring(size, [[1, "CN"]]));
    add("amines", ring(size, [[1, "NC"]]));
  }
  for (const smiles of [
    "CC(C)CN", "CCC(C)CN", "CC(C)(C)N", "CC(C)(C)CN", "CC(C)CCN", "CC(C)C(N)C", "CCC(N)CC", "CCN(C)C", "CCN(CC)CC", "CCN(C)CC", "CCCNCC", "CCNC(C)C", "CCCN(C)C", "CNCC(C)C", "CN(C)C(C)C", "CNCCC", "NCCCCN", "NCC(C)CN", "NCC(N)C", "NCCC(C)N", "CC(C)C(C)CN", "CC(C)CC(C)N", "NCC(C)(C)C", "CCC(C)(C)N", "CCNC1CCCCC1", "CN1CCCCC1", "N1CCCC1", "N1CCCCC1", "N1CCOCC1", "CCC(C)C#N", "CC(C)(C)C#N", "CC(C)CC#N", "CCCC(C)C#N", "CC(C)CCC#N", "N#CCC#N", "N#CCCC#N", "C=CC#N", "C=C(C)C#N", "CC=CC#N", "CC(O)C#N", "CCC[N+](=O)[O-]", "CC([N+](=O)[O-])C", "CC(C)C[N+](=O)[O-]", "CC(C)CC(C)C[N+](=O)[O-]",
  ]) add("amines", smiles);

  const aromaticPairs = [["Cl", "Br"], ["F", "C"], ["O", "Cl"], ["O", "O"], ["N", "C"], ["N", "[N+](=O)[O-]"], ["C", "CO"], ["C", "C#N"], ["CO", "Cl"], ["C(=O)O", "O"], ["C(=O)O", "Cl"], ["C=O", "O"], ["OC", "C=O"], ["OC", "[N+](=O)[O-]"]];
  for (const [a, b] of aromaticPairs) {
    for (const skeleton of [`c1(${a})ccccc1${b}`, `c1(${a})cccc(${b})c1`, `c1(${a})ccc(${b})cc1`]) add("aromatics", skeleton);
  }
  for (const smiles of ["COc1ccccc1", "CCOc1ccccc1", "OCc1ccccc1", "NCCc1ccccc1", "CC(=O)c1ccccc1", "CCC(=O)c1ccccc1", "N#Cc1ccccc1", "COC(=O)c1ccccc1", "CCOC(=O)c1ccccc1", "CC(=O)Oc1ccccc1", "O=C(N)c1ccccc1", "CC(=O)Nc1ccccc1", "ClC(=O)c1ccccc1", "CC(C)c1ccccc1", "CC(C)(C)c1ccccc1", "Cc1cc(C)c(C)cc1", "Cc1c(C)cccc1C", "Clc1cc(Cl)cc(Cl)c1", "Cc1cc(Cl)ccc1O", "COc1cc(C=O)ccc1O", "Oc1ccc(O)c(O)c1", "c1ccncc1", "c1ccoc1", "c1ccsc1", "c1ccc(-c2ccccc2)cc1"]) add("aromatics", smiles);
  return entries;
}
