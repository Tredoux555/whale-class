# Writing Shelf print fix — bigger sound frames, and cut guides everywhere

**2026-09-05.** Two complaints from Tredoux, both now fixed in
`public/dark-phonics-shelf/v2/`:

1. the movable-alphabet letters do not fit the sound-frame mat;
2. "I need cutting guide lines for the other printables like the chain words.
   I need to know exactly where to cut as they are duplex print."

The original generator for the v2 printables was lost. It is no longer lost for
sheet 01, and the other sheets now have a repeatable fixer. Both live in
`scripts/curriculum/writing-shelf/` — see the README there.

---

## 1 · Sound-frame mat, rebuilt bigger

`01-sound-frame-mat.pdf` was regenerated from scratch by
`scripts/curriculum/writing-shelf/build_sound_frame_mat.py`. The old file is
kept outside the repo at `~/old-01-sound-frame-mat.pdf`.

**The old sheet was not what it said it was.** It was described everywhere as
55 mm frames with 6 mm gutters; measured off the PDF it was **53.7 mm frames
with 7.2 mm gutters**. That is part of why the letters did not fit.

| | frames | gutters | frame span | mat margin |
|---|---|---|---|---|
| Side 1 · Tray 1 | **3 × 70 mm** | 6 mm | 222 mm | 30.0 mm |
| Side 2 · Tray 3 | **4 × 66 mm** | 4 mm | 276 mm | 3.0 mm |

Sheet is exact A4 landscape, 297 × 210 mm. Trim rectangle **282 × 100 mm**,
centred, and **identical on both sides**.

**Why 66 mm and not the 67 mm that was asked for.** 4 × 67 + 3 × 4 = 280 mm of
frames. Add the minimum sensible mat margin and the trim rectangle is 286 mm
wide, which puts the cut line 5.5 mm from the page edge — exactly on the
printer-safe boundary, with nowhere left for the ticks that mark the horizontal
cut lines. 66 mm is the largest frame that keeps the cut line *and* a legible
tick inside the safe margin, and it is the floor that was agreed. The ticks
that stick out sideways were also shortened to 1.4 mm (the ticks above and
below the rectangle keep the full house 3.17 mm, because vertical space is not
scarce). Measured on the rendered sheet, ink reaches 5.60 mm from the left edge
and 5.80 mm from the right.

**The duplex check, stated.** Short-edge duplex of a *landscape* sheet is a
rotation about the short (vertical) edge — a left↔right mirror in the paper
frame, `(x, y) → (W − x, y)`. A rectangle centred on the sheet maps onto
itself under that map, so the front cut line and the back cut line coincide and
one cut serves both faces. Both sides are drawn from the same four constants,
and `build_sound_frame_mat.py` refuses to write the file if the rectangle is
ever moved off centre.

**Tile guidance changed.** The old advice — "tiles ~40 mm, to fit inside the
55 mm boxes" — is gone. A 70 mm frame takes a tile of **up to about 60 mm**
with room for a finger.

Type note: the v2 sheets were set in Atkinson Hyperlegible, which reached them
as a Google webfont. Only 40-glyph subsets survive inside the old PDF and there
is no copy of the family in this repo, so the footer is now set in **Andika**,
the house literacy face already at `public/fonts/`. Everything else — ink
colours, 0.265 mm hairline, 1.84 mm corner radius, dot and dash pitch, the
amber spare frame, the text hierarchy — matches the sheet it replaces.

---

## 2 · Cut guides

Added by `scripts/curriculum/writing-shelf/add_cut_guides.py`, which overlays
marks onto pristine copies held in `scripts/curriculum/writing-shelf/src/`. It
is idempotent: the input is always `src/`, so a re-run cannot double the marks.

State of every sheet before this session, measured off the PDFs:

| sheet | had | done |
|---|---|---|
| 01 | dotted rectangle + 4 paired ticks | rebuilt |
| **02** | **nothing, all 4 pages** | **marks added** |
| **03** | **nothing, all 6 pages** | **marks added** |
| 04 | a dotted rectangle round all 15 pieces | left alone |
| 05 | dotted rectangle + paired ticks per strip | left alone |
| **06** | p1 had 4 dotted rectangles; **p2 and p3 had nothing** | **rectangles + edge ticks on all 3 pages** |
| 07 | the amber fold/cut line | left alone |
| 08 | no cut | left alone |
| 09 | dotted centre line + paired ticks | left alone |
| 10 | p1 crop ticks per token, p2 dotted rectangles | left alone |

**02 and 03 are the hard case.** Four A6 cards tile an A4 exactly, so there is
no margin — there is nowhere for a mark to live except on the cut line itself.
The marks are therefore confined to the five positions that are safe:

- a short tick at each of the **four page-edge midpoints**;
- a hairline cross at the **page centre**, where the two cuts meet.

Those are the fixed points of *both* duplex flips —
`(x, y) → (x, H − y)` short edge, `(x, y) → (W − x, y)` long edge — so the
front marks and the back marks land in the same physical place whatever the
printer does. The blade goes down the middle of each mark, so about 0.13 mm of
hairline survives onto a card. As a bonus the marks are a registration check:
hold a printed sheet to the light and the front cross should sit on the back
cross.

---

## 3 · Duplex pairing — SHORT EDGE is correct, no rebuild needed

Short-edge duplex of a **portrait** sheet flips about the top edge: top and
bottom swap, left and right do not. So **front top-left is backed by back
bottom-left**.

Every quadrant of 02 and 03 was read to check the shipped files pair correctly
under that rule:

| | front TL | front TR | front BL | front BR |
|---|---|---|---|---|
| 02 p1 photo | tap | mop | peg | bin |
| 02 p2 back (BL/BR/TL/TR resp.) | tap | mop | peg | bin |
| 02 p3 photo | nut | rat | — | — |
| 02 p4 back | nut | rat | — | — |
| 03 p1 photo | cat | pig | rug | hat |
| 03 p2 back | cat | pig | rug | hat |
| 03 p3 photo | mug | bed | dog | cot |
| 03 p4 back | mug | bed | dog | cot |
| 03 p5 photo | pen | bag | log | jam |
| 03 p6 back | pen | bag | log | jam |

(Read the second row of each pair as "the back that lands behind this front",
i.e. the back page's opposite-vertical quadrant.) Every pair matches.

The blank quadrants settle it on their own: 02 p3 carries photos in TL and TR
only, and 02 p4 carries words in BL and BR only. Under a long-edge flip front
TL would be backed by back TR, which is blank. **The printed instruction
("flip on SHORT EDGE") is correct and nothing was reimposed.**

---

## 4 · Measured sizes, against the stated spec

| sheet | stated | measured off the PDF |
|---|---|---|
| 02, 03 quadrant | 105 × 148.5 mm | **104.95 × 148.50 mm** (page is 209.89 × 297.01 mm, not exactly 210 × 297 — a browser-print artefact of the lost generator, 0.06 mm narrow) |
| 02, 03 card content | — | photo 75.9 × 75.9 mm, **centred in its quadrant to within 0.1 mm on both faces** |
| 05 strips | 190 × 60 mm | **189.97 × 60.06 mm** ✓ |
| 06 cards | 90 × 90 mm | **90.50 × 90.50 mm** measured line-centre to line-centre (90.0 inside the 0.265 mm rule) ✓ |
| 09 halves | 148.5 × 210 mm | **148.43 and 148.70 × 209.89 mm** ✓ |
| 04 cards / tiles | 60 × 35 / 34 × 42 mm | **60.59 × 35.45 / 34.66 × 42.33 mm** (outer dot edges) ✓ |
| 10 p2 strips | 190 × 60 mm | **190.50 × 60.32 mm** (outer dot edges) ✓ |

Nothing was out of spec by enough to warrant a rebuild.

---

## 5 · Files changed

- `public/dark-phonics-shelf/v2/01-sound-frame-mat.pdf` — regenerated
- `public/dark-phonics-shelf/v2/02-chain-cards.pdf` — cut marks
- `public/dark-phonics-shelf/v2/03-dictation-photo-cards.pdf` — cut marks
- `public/dark-phonics-shelf/v2/06-picture-sequences.pdf` — cut marks
- `public/dark-phonics-shelf/v2/PRINT-GUIDE.html`
- `public/dark-phonics-shelf/v2/manifest.json` — sizes, byte counts, the
  "no marks" note, and item 1's title
- `public/dark-phonics-shelves.html` — Tray 1 and Tray 3 prose, the two SVG
  tray diagrams, the buy tables, and a new **Cut** column on the `#print` table
- `scripts/curriculum/writing-shelf/` — new: `build_sound_frame_mat.py`,
  `add_cut_guides.py`, `README.md`, `src/` (pristine 02, 03, 06)
- `docs/handoffs/HANDOFF_WRITING_SHELF_2026-08-29.md` — dated note
- `docs/handoffs/HANDOFF_SHELF_PHYSICAL_BUILD_2026-08-31.md` — dated note
- `docs/handoffs/HANDOFF_BUILD_IT_TAB_2026-09-01.md` — dated note
- this file

Not touched: `public/dark-phonics-shelf/PRINT-GUIDE.html` and
`public/dark-phonics-shelf/manifest.json` — those are the **v1** set, which is
superseded and not linked from the shelf page. They still say 55 mm. If v1 is
ever meant to be deleted rather than left as history, that is a separate call.

---

## How to rerun

```
python3 scripts/curriculum/writing-shelf/build_sound_frame_mat.py
python3 scripts/curriculum/writing-shelf/add_cut_guides.py
```

Needs `reportlab` and `pypdf`. The first writes `01`; the second rewrites `02`,
`03` and `06` from `scripts/curriculum/writing-shelf/src/`. Re-run either as
often as you like — both are deterministic and idempotent.

To change a frame size, edit the constants at the top of
`build_sound_frame_mat.py` and rerun; the built-in `check()` will refuse a spec
that breaks the printer-safe margin or moves the trim rectangle off centre.
