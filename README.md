# orgchem

Type anything that names or describes an organic compound, and see its structure.

```
CH₃CH₂CH₂CH₂CH₂–        →  the pentyl group
2-methylbutan-1-ol      →  the alcohol
(CH₃)₃COH               →  tert-butanol
caffeine                →  1,3,7-trimethylpurine-2,6-dione
C₄H₁₀O                  →  all seven isomers
CC(=O)Oc1ccccc1C(=O)O   →  aspirin
```

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. `npm test` runs the parser suites offline;
`npm run test:live` runs the two that need the app up — what the resolver does
with anything typed into a search box, and how a typed answer is marked, both
of which go out to OPSIN and PubChem. `npm run build` produces a production
build.

## What it accepts

**Condensed structural formulas** — the notation people actually write by hand.
This is the part no name-to-structure service handles, so it is parsed here
(`src/lib/condensed.ts`). It understands branches `CH₃CH(CH₃)CH₃`, repeat units
`CH₃(CH₂)₁₆COOH`, reversed left-hand groups `HOCH₂CH₂OH`, a hydrogen written in
front of the group it belongs to `HCOOH`, groups written before the atom they
hang off `(CH₃CH₂)₂NH`, bond symbols `CH₃CH=CHCH₃`, abbreviations `tBuOH`,
`PhCH₂COOH`, `CF₃COOH`, and open valences.

The parser is valence driven, which is what lets it settle the notation's
ambiguities without guessing:

| Input | Question | Resolved by |
| --- | --- | --- |
| `CH₃CH(CH₃)CH₃` vs `CH₃(CH₂)₃CH₃` | is `(X)n` a branch or a repeat unit? | the CH has spare valence and CH₃ is monovalent, so it branches; the CH₃ is saturated and CH₂ is divalent, so it repeats |
| `CH₃CHOHCH₃` vs `CH₃CH₂OH` | does OH continue the chain or hang off it? | OH cannot carry what follows, so mid-formula it must branch |
| `CH₃CH₂CH₂CH₂CH₂` | molecule or substituent group? | the last CH₂ has one bond spare, so it is the pentyl group — the dash a chemist writes is confirmation, not information |
| `HOCH₂(CHOH)₄CHO` | does the OH inside a repeat unit end the unit or hang off it? | a repeat unit always has the next copy after it, and OH cannot carry that, so it branches: the unit is CH(OH) |

**IUPAC names** go to [OPSIN](https://github.com/dan2097/opsin), with a local
parser (`src/lib/iupac.ts`) covering chains, rings, locants, multipliers,
unsaturation and the common suffixes so the app still answers when the network
does not.

**Common and trade names** come from a local dictionary of ~260 compounds first,
then [PubChem](https://pubchem.ncbi.nlm.nih.gov/).

**SMILES** is accepted directly, and `smiles:`, `name:`, `formula:` or `inchi:`
prefixes force a particular reading.

**Molecular formulas** are treated as the ambiguous things they are: `C₅H₁₂`
does not name a structure, so the isomers are listed rather than one being
picked silently. Any result can show the same list on demand — "show all
isomers" under the formula draws everything sharing it, so `1-hexanol` leads to
the other 31 structures with the formula C₆H₁₄O.

**Stereochemistry gets three dimensions.** Where a structure has exactly one
stereogenic element — one stereocentre, or one double bond that could be cis or
trans — both isomers are built, given 3D coordinates and drawn as ball-and-stick
models side by side. Each turns independently — by drag, or by tabbing to it
and using the arrow keys — so one can be brought into the orientation that
makes the comparison you want. With two or more stereo elements
there are up to 2ⁿ isomers and no pair to single out, so nothing is offered
rather than something arbitrary.

Orientation is held as a rotation matrix rather than a pair of angles. Angles
have to be clamped at the poles to stay usable, and past the clamp a drag simply
stops doing anything; composing matrices in screen space has no poles, so the
models turn freely and indefinitely in every direction.

A stereodescriptor can be written in front of a condensed formula, which is
otherwise unable to express configuration: `(E)-CH₃CH=C(Cl)CH₂O` resolves to
(E)-2-chlorobut-2-en-1-ol. It applies where there is a single stereogenic
element for the descriptor to refer to, and says so plainly when there is not.

Whatever the route in, the result is enriched from PubChem, so a condensed
formula comes back with its IUPAC name and a name comes back with its
identifiers.

## Naming practice

`/practice` drills 283 structures in both directions, filtered by topic
(alkanes, alkenes, haloalkanes, alcohols, carbonyls, acids, amines, aromatics)
and by level. **Name the structure** shows a drawing and takes a typed name.
**Find the structure** shows a name and offers four drawings, three of them
usually true isomers of the answer — same formula, different connectivity,
which is the discrimination the exercise is about. A candidate drawn exactly
like the answer is never offered beside it: a double bond whose geometry the
structure leaves open is drawn as the plain double bond it is, which is the
same picture as its E isomer, so but-2-ene and (E)-but-2-ene would otherwise
appear as two identical drawings with one of them marked wrong.

Three hints are available one at a time: what class of compound it is, how big
the parent is and what hangs off it, and finally the part the exercise turns
on — naming a structure, the name with only its numbers removed; finding one,
which positions to count on each option to tell them apart.

Typed answers are marked by resolving them back into a structure and comparing
it with the one shown, rather than by matching a string. Any name that
identifies the right compound is accepted, so `2-propanol`, `isopropyl alcohol`
and `propan-2-ol` all pass. It also tells a near miss from a real one: naming
the right skeleton with the wrong configuration is reported as that, not simply
marked wrong.

What is being drilled lives in the URL, as the lookup page's query does, so a
selection can be handed to someone:
`/practice?mode=structure&topic=alcohols&level=easy` sets them down in front of
exactly that. Anything the bank cannot fill is dropped rather than becoming an
error. The multiple choice is answerable from the keyboard — the number keys
pick an option, Enter moves on — as the typed direction already was.

The answer stays on the server in both directions. An option is identified only
by its position, and the server rebuilds the same list from the question and a
nonce sent with it — so nothing in the question distinguishes the right drawing
from the other three, and the arrangement is still shuffled afresh every time.
Once it is over the right structure is marked whether or not it was the one
picked, since seeing which drawing the name belonged to is the lesson.

The bank is generated by `scripts/build-quiz-bank.mjs`. Nothing here can name a
structure — OPSIN only runs names to structures — so PubChem supplies each name
and OPSIN then reads it back; a pair is kept only if OPSIN's structure for the
name is the structure it was paired with. Difficulty is computed from what makes
naming hard (branches, how many locants have to be placed, whether there is
stereochemistry) rather than assigned by hand.

## How it fits together

```
input → normalize → dictionary → condensed formula → SMILES
                  → OPSIN ∥ local IUPAC parser
                  → molecular formula (isomer list) → PubChem name
                  → PubChem enrichment → OpenChemLib → SVG + properties
```

Each stage is strict enough to fall through rather than guess, and a stage only
wins if what it produced is a structure that actually parses.

Rendering and property prediction use
[OpenChemLib](https://github.com/cheminfo/openchemlib-js) on the server — it is
a megabyte of compiled Java, so the page ships finished SVG rather than a
chemistry engine. Bond colours are emitted as CSS custom properties so one
drawing works in both themes.

The query and the display options live in the URL, which makes results
shareable and keeps the page working without client-side JavaScript.

| Path | |
| --- | --- |
| `src/lib/condensed.ts` | condensed structural formula → SMILES |
| `src/lib/iupac.ts` | offline systematic-name parser |
| `src/lib/dictionary.ts` | trivial and trade names |
| `src/lib/resolve.ts` | the resolution cascade and network lookups |
| `src/lib/depict.ts` | SMILES → SVG and property sheet |
| `src/lib/stereo.ts` | stereoisomer enumeration and 3D coordinates |
| `src/lib/rotation.ts` | free rotation for the 3D viewers |
| `src/lib/quiz.ts` | question selection, hints and answer marking |
| `src/lib/quiz-bank.ts` | generated question bank (do not edit by hand) |
| `src/app/practice` | the naming drill |
| `src/app/api/resolve` | JSON API: `/api/resolve?q=CH3CH2COOH` |
| `src/app/api/svg` | the structure as a downloadable SVG |

## Caveats

Predicted properties (cLogP, polar surface area, hydrogen-bond counts) are
estimates from OpenChemLib's models, not measurements. The offline name parser
covers introductory nomenclature only and defers to OPSIN for anything harder.
Where an input does not fix stereochemistry, the page says so rather than
quietly drawing one enantiomer.

Isomer lists come from PubChem's holdings, which for a larger formula is fewer
than the number that could exist on paper: C₆H₁₄O has 39 constitutional isomers
in principle and 32 on file. Charged species and co-crystals that happen to
share an atom count are filtered out, and enantiomers and isotopologues are
collapsed, so the list counts structures rather than records.

The dictionary's stereochemistry is checked against PubChem by
`scripts/check-stereochemistry.mjs`, which compares InChIKey blocks so a wrong
configuration is caught without a right one being overwritten by a vaguer
record.
