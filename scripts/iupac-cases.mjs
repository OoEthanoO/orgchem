/**
 * The names the offline parser is checked on, and the structures each one has
 * to come back as.
 *
 * They live apart from the suite that runs them because a second script reads
 * them too: `check-iupac.mjs` puts every name here to OPSIN, so the references
 * written by hand are themselves checked against the authority the app defers
 * to. A wrong reference would otherwise be a test that passes while the parser
 * is wrong, which is the quiet way a bad structure stays in.
 */

export const CASES = [
  ["methane", "C"],
  ["butane", "CCCC"],
  ["cyclohexane", "C1CCCCC1"],
  ["cyclopentane", "C1CCCC1"],
  ["2-methylbutane", "CCC(C)C"],
  ["2,3-dimethylbutane", "CC(C)C(C)C"],
  ["2,2-dimethylpropane", "CC(C)(C)C"],
  ["4-ethyl-2-methylhexane", "CCC(CC)CC(C)C"],
  ["but-2-ene", "CC=CC"],
  ["but-1-ene", "C=CCC"],
  ["buta-1,3-diene", "C=CC=C"],
  ["hexa-2,4-diene", "CC=CC=CC"],
  ["but-2-yne", "CC#CC"],
  ["cyclohexene", "C1=CCCCC1"],
  ["hexan-1-ol", "OCCCCCC"],
  ["butan-2-ol", "CC(O)CC"],
  ["2-methylbutan-1-ol", "OCC(C)CC"],
  ["ethane-1,2-diol", "OCCO"],
  ["propane-1,2,3-triol", "OCC(O)CO"],
  ["propan-2-one", "CC(C)=O"],
  ["butanal", "CCCC=O"],
  ["ethanoic acid", "CC(=O)O"],
  ["butanoic acid", "CCCC(=O)O"],
  ["hexanedioic acid", "OC(=O)CCCCC(=O)O"],
  ["ethanamine", "CCN"],
  ["ethanamide", "CC(N)=O"],
  ["ethanethiol", "CCS"],
  ["methyl butanoate", "CCCC(=O)OC"],
  ["ethyl ethanoate", "CC(=O)OCC"],
  ["pentan-1-yl", "[CH2]CCCC"],
  ["pentyl", "[CH2]CCCC"],
  ["methyl", "[CH3]"],
  ["propan-2-yl", "C[CH]C"],
  ["benzene", "c1ccccc1"],
  ["nitrobenzene", "[O-][N+](=O)c1ccccc1"],
  ["1,2-dimethylbenzene", "Cc1ccccc1C"],
  ["phenol", "Oc1ccccc1"],
  ["4-chlorophenol", "Oc1ccc(Cl)cc1"],
  ["aniline", "Nc1ccccc1"],
  ["2-chlorobutane", "CC(Cl)CC"],
  ["1,2-dichloroethane", "ClCCCl"],
  ["3-methylhexan-2-one", "CCCC(C)C(C)=O"],
  ["2-hydroxypropanoic acid", "CC(O)C(=O)O"],
  ["1-phenylethanol", "CC(O)c1ccccc1"],
  ["trichloromethane", "ClC(Cl)Cl"],
  ["octadecanoic acid", "CCCCCCCCCCCCCCCCCC(=O)O"],
  ["cyclohexanol", "OC1CCCCC1"],
  ["2-methylprop-1-ene", "CC(C)=C"],
  // Positions written in words rather than numbers.
  ["p-nitrotoluene", "Cc1ccc(cc1)[N+](=O)[O-]"],
  ["o-dichlorobenzene", "Clc1ccccc1Cl"],
  ["m-dichlorobenzene", "Clc1cccc(Cl)c1"],
  ["para-nitrophenol", "Oc1ccc(cc1)[N+](=O)[O-]"],
  ["ortho-nitroaniline", "Nc1ccccc1[N+](=O)[O-]"],
  // Substituents on the nitrogen rather than on the chain or the ring.
  ["N-ethylethanamine", "CCNCC"],
  ["N-methylmethanamine", "CNC"],
  ["N,N-dimethylmethanamine", "CN(C)C"],
  ["N-methylbutan-2-amine", "CCC(C)NC"],
  ["N-methylethanamide", "CC(=O)NC"],
  ["N-methylaniline", "CNc1ccccc1"],
  ["N,N-dimethylaniline", "CN(C)c1ccccc1"],
  // A lowercase n- is not a locant: it says the chain is unbranched.
  ["n-butanol", "CCCCO"],
  ["n-hexane", "CCCCCC"],
  // One substituent on a plain ring needs no locant: every position is the
  // same position.
  ["methylcyclohexane", "CC1CCCCC1"],
  ["ethylcyclopentane", "CCC1CCCC1"],
  ["chlorocyclohexane", "ClC1CCCCC1"],
  ["propylcyclohexane", "CCCC1CCCCC1"],
  ["methylcyclopropane", "CC1CC1"],
  // The "e" joining stem to suffix is not the "en" of an alkene.
  ["ethanenitrile", "CC#N"],
  ["propanenitrile", "CCC#N"],
  ["butanenitrile", "CCCC#N"],
  ["prop-2-enenitrile", "C=CC#N"],
  // A substituent whose own name starts with a multiplier's letters.
  ["trifluoromethylbenzene", "FC(F)(F)c1ccccc1"],
  ["trichloromethylbenzene", "ClC(Cl)(Cl)c1ccccc1"],
  ["2-trifluoromethylphenol", "OC1=CC=CC=C1C(F)(F)F"],
  ["trifluoromethylcyclohexane", "FC(F)(F)C1CCCCC1"],
  ["trichloromethane", "ClC(Cl)Cl"],
  ["dichloromethane", "ClCCl"],
  ["triphenylmethane", "C(c1ccccc1)(c1ccccc1)c1ccccc1"],
  // Functional class names: the class is a word of its own after the groups
  // carrying it, and the amines are written solid.
  ["ethyl alcohol", "CCO"],
  ["isopropyl alcohol", "CC(C)O"],
  ["tert-butyl alcohol", "CC(C)(C)O"],
  ["benzyl alcohol", "OCc1ccccc1"],
  ["dimethyl ether", "COC"],
  ["ethyl ether", "CCOCC"],
  ["methyl ether", "COC"],
  ["methyl ethyl ether", "COCC"],
  ["methyl tert-butyl ether", "COC(C)(C)C"],
  ["methyl ethyl ketone", "CCC(C)=O"],
  ["diethyl ketone", "CCC(=O)CC"],
  ["dimethyl sulfide", "CSC"],
  ["dimethyl sulfoxide", "CS(C)=O"],
  ["dimethyl sulfone", "CS(C)(=O)=O"],
  ["methyl chloride", "CCl"],
  ["vinyl chloride", "C=CCl"],
  ["isopropyl bromide", "CC(C)Br"],
  ["acetyl chloride", "CC(Cl)=O"],
  ["benzoyl chloride", "ClC(=O)c1ccccc1"],
  ["methyl cyanide", "CC#N"],
  ["ethyl mercaptan", "CCS"],
  ["propylamine", "CCCN"],
  ["isopropylamine", "CC(C)N"],
  ["cyclohexylamine", "NC1CCCCC1"],
  ["diethylamine", "CCNCC"],
  ["triethylamine", "CCN(CC)CC"],
  ["benzylamine", "NCc1ccccc1"],
  ["phenylamine", "Nc1ccccc1"],
  ["allylamine", "NCC=C"],
  // Benzene parents named for what they already carry, so a substituent can
  // be numbered against it. Each checked against PubChem's structure.
  ["benzonitrile", "N#Cc1ccccc1"],
  ["benzamide", "NC(=O)c1ccccc1"],
  ["benzenesulfonic acid", "OS(=O)(=O)c1ccccc1"],
  ["acetophenone", "CC(=O)c1ccccc1"],
  ["cumene", "CC(C)c1ccccc1"],
  ["4-chlorobenzonitrile", "N#Cc1ccc(Cl)cc1"],
  ["4-methylacetophenone", "CC(=O)c1ccc(C)cc1"],
  ["4-nitrobenzamide", "NC(=O)c1ccc(cc1)[N+](=O)[O-]"],
  ["4-methylbenzenesulfonic acid", "OS(=O)(=O)c1ccc(C)cc1"],
];

// Names the parser must refuse rather than answer by guessing. Placing an
// unlocanted substituent at position 1 would build a different compound — and
// on a ring that already carries one, an impossible one.
export const REJECT = [
  "methylpropene",
  "methylpropane",
  "chloropropane",
  "ethylhexane",
  "chlorophenol",
  "dichlorobenzene",
  "nitrotoluene",
  "p-butane",
  "N-methylbutane",
  "N-methylbutan-1-ol",
  // A ring forces the locant only while nothing else on it distinguishes one
  // position from another.
  "dimethylcyclohexane",
  "methylcyclohexanol",
  "methylcyclohexene",
  "methylcyclohexanone",
  // A class name whose groups are not groups, and a class with the wrong
  // number of them.
  "sodium chloride",
  "ammonium chloride",
  "hydrochloric acid",
  "methylene chloride",
  "tetramethylamine",
  "amine",
];
