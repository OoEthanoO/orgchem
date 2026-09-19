/**
 * Structures for the harder naming tier. These are proposals, not trusted
 * name/structure pairs: the builder obtains PubChem's name and verifies the
 * exact structure, including stereo, by an independent OPSIN round trip.
 */
export function hardCandidates() {
  const groups = {
    alkanes: [
      "CC(C)C(C)C(C)CCC", "CCC(C)C(CC)C(C)CC", "CC(C)CC(C)C(C)CC",
    ],
    cycloalkanes: [
      "CC1C(C)C(C)CCC1", "CCC1C(C)CCC(C)C1", "CC1CC(C)CC(C)C1",
    ],
    alkenes: [
      "CC(C)/C=C/C(C)CC", "C/C=C/C=C/CC", "C/C=C\\C=C/CC",
    ],
    alkynes: [
      "C#CC(C)C(C)CC", "CC#CC(C)C(C)CC", "C#CC(C)CC(C)C",
    ],
    enynes: [
      "C=CC(C)C(C)C#C", "C#CC(C)C(C)=CC", "C=C(C)C(C)CC#C",
    ],
    alcohols: [
      "OCC(C)C(C)C(C)C", "CC(O)C(C)C(C)CC", "C[C@H](O)[C@H](O)CC",
    ],
    ethers: [
      "COC(C)C(C)C(C)C", "CCOC(C)C(C)C(C)C", "COCC(C)C(C)C(C)C",
      "COC1C(C)C(C)CCC1", "COC(C)C(Cl)C(C)C",
    ],
    aldehydes: [
      "O=CC(C)C(C)C(C)C", "O=CC(O)C(C)C(C)C", "O=CC(Cl)C(C)C(C)C",
    ],
    ketones: [
      "CC(=O)C(C)C(C)C(C)C", "CC(=O)C(O)C(C)C", "CC(=O)C(Cl)C(C)C",
    ],
    acids: [
      "O=C(O)C(C)C(C)C(C)C", "O=C(O)C(O)C(C)C(C)C", "O=C(O)[C@H](O)[C@H](O)C",
    ],
    esters: [
      "CCOC(=O)C(C)C(C)C", "CC(C)OC(=O)C(C)C(C)C", "COC(=O)CC(C)C(C)C",
      "CCOC(=O)C(O)C(C)C", "COC(=O)[C@H](O)[C@H](O)C",
    ],
    amides: [
      "CN(C)C(=O)C(C)C(C)C", "CCN(C)C(=O)C(C)C(C)C", "CCNC(=O)C(C)C(C)C",
      "NC(=O)C(C)C(C)C(C)C", "CN(C)C(=O)C(Cl)C(C)C",
    ],
    "acyl-halides": [
      "ClC(=O)C(C)C(C)C(C)C", "ClC(=O)C(Cl)C(C)C", "ClC(=O)C(C)C(Cl)CC",
    ],
    amines: [
      "NCC(C)C(C)C(C)C", "CN(C)CC(C)C(C)C", "CCN(C)CC(C)C(C)C",
    ],
    nitriles: [
      "N#CC(C)C(C)C(C)C", "N#CC(O)C(C)C(C)C", "N#CC(Cl)C(C)C(C)C",
    ],
    nitro: [
      "O=[N+]([O-])CC(C)C(C)C(C)C", "CC(C)C([N+](=O)[O-])C(C)C", "CC(C)C(Cl)C([N+](=O)[O-])C",
    ],
    halides: [
      "CC(C)C(Cl)C(Br)C", "C[C@H](Cl)[C@H](Br)C", "CC(C)C(Cl)C(C)C(C)C",
    ],
    aromatics: [
      "COc1cc(Cl)c(C)cc1O", "CC(=O)c1cc(C)c(Cl)cc1", "COC(=O)c1cc(Cl)c(C)cc1",
      "O=C(O)c1cc(O)c(Cl)cc1", "Cc1c(Cl)cc(Br)cc1C",
    ],
  };
  return Object.entries(groups).flatMap(([category, structures]) => structures.map((smiles) => ({ category, smiles })));
}
