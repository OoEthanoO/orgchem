# Coordination practice expansion references

Checked 2026-09-19. The original 97 question IDs and compositions are preserved;
16 advanced exercises are appended (113 total). The earlier expansion added
59 entries after the first 38. `test-complex-quiz.mjs` supplies a literal formula,
oxidation state, entity charge and coordination number for every addition.
The fixture's source key refers to the table below.

## Scope and interpretation

- These questions test composition. A paper describing a particular cis/trans
  or optical isomer establishes that composition, but the practice schematic
  deliberately does not assign its stereochemistry.
- Bare-ion questions extract the documented coordination entity without its
  counterions. Salt questions use the stated salt formula unit. Lattice water
  or solvent is omitted; coordinated water remains inside the brackets. This
  does not claim that every experimental sample is an anhydrous crystal.
- Donor counts are independently counted from the reported compositions:
  ethane-1,2-diamine (`en`) and chelating oxalato each contribute two donors;
  the other ligands in these fixtures contribute one.
- Charges follow neutral NH3/H2O/CO/en, mononegative halido/cyanido/hydroxido,
  and dinegative oxalato. Metal oxidation states balance these charges.
  Neutral carbonyls use `(0)`; the cobaltate and ferrate carbonyl anions use
  `(-I)` and `(-II)` respectively.
- Names use modern ligand spellings according to the
  [IUPAC brief guide](https://iupac.qmul.ac.uk/BriefGuide/inorganic.html).
  Traditional spellings remain accepted by the marker.

## Hard-level standard

Twenty existing single-ligand ions and straightforward salts move from Hard
to Medium. The 16 new entries are Hard. Totals change from 18 Easy / 46 Medium /
33 Hard to 18 Easy / 66 Medium / 29 Hard.

Hard requires a combination of decisions:

- Charged and neutral ligands combined with chelation, salt charge balance,
  three ligand types, or an anionic metal name.
- Anionic chelates with counterions (or a chelated salt requiring multiple
  coordination entities in a formula unit).
- A negative metal oxidation state together with salt charge balance.

A rare metal, an ordinary homoleptic salt, or a single chelate multiplier is
insufficient by itself. For example, potassium hexacyanidoferrate(II) and
tris(ethane-1,2-diamine)cobalt(III) now belong to Medium. Hard includes
aquachloridobis(ethane-1,2-diamine)cobalt(III) sulfate and sodium
(ethane-1,2-diamine)dioxalatocobaltate(III). Optional hints remain available.

Hard multiple choice first selects real examples with the same metal, then
prefers nearby ligand compositions, coordination numbers, charges and salt
forms. It still randomizes option order and never manufactures a distractor.

## Source index

| Fixture source key | Established composition(s) used | Primary source |
| --- | --- | --- |
| Zn-aqua | `[Zn(H2O)6]2+` | [IUCr original structure, available at PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2961002/) |
| Mn-aqua | `[Mn(H2O)6]2+` | [IUCr manganese picrate structure](https://journals.iucr.org/e/issues/2008/02/00/ww2104/index.html) |
| Zn-ammine | `[Zn(NH3)4]2+` in water | [RSC original QM/MM study, DOI 10.1039/C002021D](https://pubs.rsc.org/en/content/articlelanding/2010/cp/c002021d) |
| Pt-Pd-ammine | `[Pt(NH3)4]2+`, `[Pd(NH3)4]2+`, platinum chloride salt | [IUCr original structure](https://journals.iucr.org/e/issues/2014/07/00/pk2522/index.html); [use of the platinum chloride reagent](https://iucrdata.iucr.org/x/issues/2020/07/00/bv4032/) |
| Ag-Au-cyanide | `[Ag(CN)2]-`, `[Au(CN)2]-`, their potassium salts; `[Ru(NH3)6]3+`; `[Cr(NH3)6](NO3)3` | [Original study of dicyanoaurate/argentate and metal ammonia complexes](https://www.sciencedirect.com/science/article/pii/S0020169305002938) |
| Ni-carbonyl | `Ni(CO)4` | [NIST Chemistry WebBook](https://webbook.nist.gov/cgi/cbook.cgi?Mask=2660&Source=1986REU%2FWAN399) |
| Fe-carbonyl | `Fe(CO)5` | [NIST experimental geometry record](https://cccbdb.nist.gov/expgeom2x.asp?casno=13463406) |
| Cr-carbonyl | `Cr(CO)6` | [NIST Chemistry WebBook](https://webbook.nist.gov/cgi/cbook.cgi?Name=13007-92-6) |
| Mo-carbonyl | `Mo(CO)6` | [NIST Chemistry WebBook](https://webbook.nist.gov/cgi/cbook.cgi?ID=C13939065&Mask=40) |
| W-carbonyl | `W(CO)6` | [NIST Chemistry WebBook](https://webbook.nist.gov/cgi/cbook.cgi?ID=C14040110&Mask=226) |
| Cu-en-cyanide | Discrete `[Cu(CN)4]3-` | [IUCr original structure](https://journals.iucr.org/e/issues/2013/06/00/lh5608/index.html) |
| Co-cyanide | `K3[Co(CN)6]`, `[Co(CN)6]3-` | [IUCr potassium hexacyanocobaltate redetermination](https://journals.iucr.org/paper?buy=yes&cnor=qa0043) |
| Au-chloride | `K[AuCl4]`, `[AuCl4]-` | [RSC original study, experimental materials](https://pubs.rsc.org/en/content/articlehtml/2020/ra/d0ra08731a) |
| Pd-chloride | `[PdCl4]2-` | [IUCr original crystal structure](https://iucrdata.iucr.org/x/issues/2024/01/00/tk4099/index.html) |
| Pt-chloride | `[PtCl4]2-` in potassium tetrachloroplatinate | [ACS original absorption-spectrum study, DOI 10.1021/ic50034a002](https://pubs.acs.org/doi/10.1021/ic50034a002) |
| Ir-chloride | `[IrCl6]3-`, `[IrCl6]2-`, sodium iridium(IV) salt | [IUCr original synthesis using reduction of the IV salt to III](https://journals.iucr.org/e/issues/2017/02/00/is5464/) |
| K-Ir-chloride | `K2[IrCl6]` | [IUCr original experimental phasing study](https://journals.iucr.org/d/issues/2020/08/00/qh5065/) |
| Zn-hydroxide | Tetrahydroxozincate in alkaline solution | [RSC original ligand recovery study](https://pubs.rsc.org/en/content/articlelanding/2022/cc/d2cc03661d) |
| Co-bromide | Isolated `[CoBr4]2-` | [NIST ThermoML record of the original crystal-structure study](https://trc.nist.gov/ThermoML/10.1021/je800846j.html) |
| Co-carbonyl | `Na[Co(CO)4]`, `[Co(CO)4]-` | [Original substitution study, ACS DOI 10.1021/om00055a018](https://pubs.acs.org/doi/10.1021/om00055a018) |
| Fe-carbonyl-anion | `Na2[Fe(CO)4]`, `[Fe(CO)4]2-` | [Checked Organic Syntheses procedure](https://www.orgsyn.org/demo.aspx?prep=CV6P0807) |
| Co-Ru-redox | `[Co(NH3)5X]2+` with X=F/Br/I; `[Ru(NH3)5(H2O)]2+`, `[Ru(NH3)6]2+`, `[Ru(en)3]2+` | [RSC original electron-transfer study, DOI 10.1039/DT9820002137](https://pubs.rsc.org/en/content/articlelanding/1982/dt/dt9820002137) |
| Co-hydroxide | `[Co(NH3)5(OH)]2+` | [RSC original hydrolysis study](https://pubs.rsc.org/en/content/articlehtml/1991/dt/dt9910003031) |
| Rh-Co-aquation | `[Rh(NH3)5Cl]2+`, `[CoCl2(en)2]+` | [RSC original aquation study](https://pubs.rsc.org/en/content/articlelanding/1971/j1/j19710003108) |
| Cr-en | `[Cr(en)3]3+` | [ACS original crystal structure, DOI 10.1021/ic50069a031](https://pubs.acs.org/doi/10.1021/ic50069a031) |
| Zn-en | `[Zn(en)3]2+` | [IUCr original structure of the chloride monohydrate](https://journals.iucr.org/e/issues/2008/10/00/bt2779/) |
| Zn-Cu-en-sulfate | `[Zn(en)3]SO4`, `[Cu(en)3]SO4`, and their complex cations | [Authors' published abstract, DOI 10.1107/S0108270110041466](https://research-portal.uu.nl/en/publications/twinned-low-temperature-structures-of-trisethylenediaminezincii-s/) |
| Ni-en-aqua | `[Ni(H2O)2(en)2]2+` | [ACS original equilibrium study, DOI 10.1021/ja00706a008](https://pubs.acs.org/doi/10.1021/ja00706a008) |
| Pt-en-chloride | `[PtCl2(en)]` | [IUCr original structure, DOI 10.1107/S0108270194006840](https://journals.iucr.org/paper?buy=yes&cnor=oh1064) |
| Pt-en | `[Pt(en)2]2+` | [RSC original crystal structure](https://pubs.rsc.org/en/content/articlelanding/1981/c3/c39810000851) |
| Cr-aqua-oxalate | `K[Cr(H2O)2(C2O4)2]`, its complex anion | [IUCr structure, explicitly no uncoordinated water](https://journals.iucr.org/paper?buy=yes&cnor=fi2001) |
| Co-aqua-oxalate | Isolated `[Co(H2O)2(C2O4)2]2-` units | [IUCr original 2023 structure](https://journals.iucr.org/e/issues/2023/04/00/wm5668/index.html) |
| Co-oxalate | `K3[Co(C2O4)3]`, its complex anion | [NIST compound record](https://webbook.nist.gov/cgi/formula?ID=B8000351) |
| Co-en-chloride | `[CoCl2(en)2]Cl` | [IUCr original paper's named precursor](https://journals.iucr.org/e/issues/2009/07/00/bq2142/index.html) |
| Co-en-perchlorate | `[CoCl2(en)2]ClO4` | [IUCr original structure, DOI 10.1107/S0108270186095379](https://journals.iucr.org/paper?buy=yes&cnor=a25774) |
| Ni-en-sulfate | `[Ni(en)3]SO4` | [ACS original structure, DOI 10.1021/ic50093a007](https://pubs.acs.org/doi/10.1021/ic50093a007) |
| Pt-IV-mixed-halides | `[Pt(NH3)2Br2Cl2]`, `[Pt(NH3)2Cl2I2]`, `[Pt(NH3)3Cl3]Cl`, `[Pt(NH3)3Br3]Br` | [Original Dalton Transactions synthesis and crystallography, DOI 10.1039/C4DT02627F](https://pmc.ncbi.nlm.nih.gov/articles/PMC4252584/). Lattice DMF in solvated crystals is omitted. Cis/fac descriptions in the source do not become stereochemical practice claims. |
| Co-ammine-chloride-en | `[Co(NH3)Cl(en)2](NO3)2`, its `2+` cation | [Original JACS photochemical study, DOI 10.1021/ja00450a016](https://pubs.acs.org/doi/10.1021/ja00450a016), on chloro(ammine)bis(ethylenediamine)cobalt dinitrate. |
| Co-aqua-chloride-en | `[Co(H2O)Cl(en)2]SO4`, its `2+` cation | [Inorganic Syntheses 14, chapter 14, pp.71–72](https://sites.lsa.umich.edu/jbuss/wp-content/uploads/sites/811/2020/08/inorganic-synthesis14.pdf); [publisher chapter](https://onlinelibrary.wiley.com/doi/10.1002/9780470132456.ch14). Omit two lattice waters from the reported sulfate dihydrate, retaining its coordinated water. |
| Co-ammine-bromide-en | `[Co(NH3)Br(en)2]Br2`, its `2+` cation | [Original Acta Crystallographica C53, 216–217, DOI 10.1107/S0108270196013479](https://journals.iucr.org/c/issues/1997/02/00/ta1130/ta1130.pdf). No lattice water in this formula. |
| Co-en-oxalate | `[Co(en)2(C2O4)]+` | [Original BCSJ crystal structure, DOI 10.1246/bcsj.51.3251](https://academic.oup.com/bcsj/article-abstract/51/11/3251/7357585). Only the complex cation is extracted from the hydrogen-tartrate monohydrate. |
| Co-en-oxalate-chloride | `[Co(en)2(C2O4)]Cl` | [Wiley experimental text, procedure 5.1.b](https://catalogimages.wiley.com/images/db/pdf/9780471464839.toc.pdf); [original chloride study, DOI 10.1139/v71-156](https://doi.org/10.1139/v71-156). |
| Co-en-dioxalate | `Na[Co(en)(C2O4)2]`, its `1-` anion | [Inorganic Syntheses 13, p.199](https://sites.lsa.umich.edu/jbuss/wp-content/uploads/sites/811/2020/08/inorganic-synthesis13.pdf). Omit the reported three-and-a-half lattice waters. |
| Co-ammine-oxalate | `[Co(NH3)4(C2O4)]+` | [Original BCSJ NMR study, DOI 10.1246/bcsj.49.1867](https://academic.oup.com/bcsj/article-pdf/49/7/1867/56091129/bcsj.49.1867.pdf), explicitly studying the oxalato/tetraammine composition. |
| Co-aqua-hydroxide-en | `[Co(H2O)(en)2(OH)]2+` | [Inorganic Syntheses 14, chapter 14, pp.74–75](https://sites.lsa.umich.edu/jbuss/wp-content/uploads/sites/811/2020/08/inorganic-synthesis14.pdf). Extract only the cation of the documented dithionate salt; dithionate is outside this parser's scope. |
