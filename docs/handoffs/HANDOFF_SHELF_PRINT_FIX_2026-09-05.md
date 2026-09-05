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

---

## 6 · Sheet 11 — backup object cards (added the same day)

> "Have a look through the pictures we created, the ones in the picture bank,
> and make backup cards for all these objects. So if we don't have the objects
> we can just print the pictures at the relevant size." — Tredoux

`public/dark-phonics-shelf/v2/11-backup-object-cards.pdf`, built by
`scripts/curriculum/writing-shelf/build_backup_object_cards.py`. A printed
stand-in for every miniature in the `#miniatures` table on
`dark-phonics-shelves.html` — **26 pieces of 16 objects**, at miniature scale,
so a tray is never held up by a shopping list. Five of the sixteen (mop, peg,
tin, bin, kit) are flagged on that table as hard to buy; this is the answer to
all five at once.

### The card

**50 × 50 mm square.** A miniature is 3–6 cm, so a 50 mm card sits in a child's
hand about the same way and — the reason it is square and on 300 gsm — stands
up in a tray rather than lying flat like a picture card. The photograph is inset
**2 mm**, leaving a white margin inside the dotted cut line; the source images
are the 1024 × 1024 studio photographs in
`phonics-images/satpin-v2/cvc-photos/` (gitignored, Mac-only), downscaled to
600 px at JPEG q82 — 50 mm at 300 dpi is 590 px, so anything larger only makes
the file fat. Twelve distinct images, embedded once each: 373 KB for the sheet.

**No word is printed on any card**, and not only by the throw-away rule. These
are sound-box objects: the child names the picture, and a word on the card hands
him the answer.

### Landscape, and why

A4 **landscape**, 5 columns × 3 rows = 15 cards a page, 2 pages. Portrait was
tried first and does not work: three columns of five 50 mm cards fill an A4
portrait sheet from 15 mm of the top to 15 mm of the bottom, which leaves
nowhere for a footer — and this sheet needs one, because the tray allocation is
the only place the counts are written down. Turned landscape it is the same 15
cards in the same 2 pages with **36 mm of waste under the grid** for the words.

| | |
|---|---|
| Sheet | A4 landscape, 297 × 210 mm |
| Card | **50.00 × 50.00 mm**, measured off the render at 254 dpi |
| Gutters | **5.00 mm**, both axes |
| Grid | x 13.5 → 283.5, y 36.0 → 196.0 mm |
| Ink margin | **7.20 mm** worst case (safe margin 5.5) |
| Cards | 15 on sheet 1, 11 on sheet 2 |

The 5 mm gutter is not arbitrary: it is the narrowest gap that holds two facing
tick pairs (`TICK_GAP 0.6 + TICK_LEN 1.6`, twice) with clear paper between them.
`check()` refuses a build that closes it.

### Order — by object, not by tray

The 26 pieces are laid out in the order of the `#miniatures` table, read
straight down, **duplicates adjacent**: cat ×3, pig ×3, hat ×3, dog ×2, sun ×2,
mug ×2, bed ×2, then one each of pot, pan, tin, mop, peg, nut, bin, cot, kit.
Tray order was the obvious alternative and is worse: cat is wanted by three
different trays, so a tray-ordered sheet scatters the three cats across two
pages and you hunt for them. Ordered by object they come off the blade already
stacked, and the sheet reads in the same order as the shopping table it came
from. Which tray each goes to is in the footer of sheet 2, where the counts
belong.

### The four that are missing

`sun`, `pot`, `pan` and `tin` have no photograph — **five of the 26 pieces**,
because sun is wanted twice. Their slots print as **amber dashed outlines with
the word on them and no cut ticks**: there is nothing to cut, and amber is the
v2 palette's one meaningful thing. Midjourney prompts for all four are in
`scripts/curriculum/writing-shelf/MJ-PROMPTS-BACKUP-CARDS.md`, in the house
string with per-word disambiguators (pot is not a flower pot, pan is shot at a
three-quarter angle so it is not a circle, tin is unlabelled because a label
would put words on a card). Drop the winners into
`phonics-images/satpin-v2/cvc-photos/`, rerun the builder, and the slots fill
themselves — nothing else needs editing.

Note this is a **different** "no photo card" from the one in the `#miniatures`
table's Notes column: that one is about Tray 4's 12-card dictation deck, and it
stays as it is.

### Files changed

- `public/dark-phonics-shelf/v2/11-backup-object-cards.pdf` — new, 2 pp, 373 KB
- `scripts/curriculum/writing-shelf/build_backup_object_cards.py` — new
- `scripts/curriculum/writing-shelf/MJ-PROMPTS-BACKUP-CARDS.md` — new
- `scripts/curriculum/writing-shelf/README.md` — the new generator documented
- `public/dark-phonics-shelf/v2/manifest.json` — item 11; stock counts 10 → 11
  printables, 16 → 18 sheets, 22 → 24 printed sides, 7 → 8 laminated; the note
- `public/dark-phonics-shelf/v2/PRINT-GUIDE.html` — standfirst, at-a-glance row
  K, and a per-sheet section K
- `public/dark-phonics-shelves.html` — row 11 on the `#print` table, "Ten
  printables" → "Eleven", and a pointer paragraph under the `#miniatures` table
- this file

### How to rerun

```
python3 scripts/curriculum/writing-shelf/build_backup_object_cards.py
```

Deterministic and idempotent. Every dimension is a named constant at the top of
the file, the object list and its counts are the data block above them, and
`check()` runs on every build — it refuses a sheet whose ticks break the 5.5 mm
printer-safe margin, whose gutter is too narrow for facing ticks, whose head or
footer would sit on the grid, or whose footer overruns the bottom margin. The
photo folder is gitignored, so a checkout without it fails the "declared
missing" check loudly rather than printing a sheet full of empty slots.

---

## 7 · ADDENDUM — 2026-09-05, evening: 100 × 140 flip cards, and one cut standard

Two more calls from Tredoux, after looking at the sheets above:

1. **"Make the flip cards 100 × 140."**
2. the guides were **"still a little ambiguous"** — every sheet marked its cut a
   different way (some a dotted rectangle, some paired ticks, some both, 02 and
   03 almost nothing), and a dotted line is exactly the thing a blade wanders
   off.

### 7.1 · Why 100 × 140, and why the squares stay 90

The A6 tiling was the whole problem in §2: four exact A6 cards fill an A4 with
**no margin at all**, so there was nowhere for a mark to live except on the cut
line itself. At **100 × 140** the four cards sit inside a 5 mm gutter cross, and
the gutter is where the crop marks go. 100 mm is also the card the shelf wants:
it stands up in a tray and reads across a table.

**The square cards did NOT change and must not.** Sheet 06 stays 90 × 90 and
sheet 11 stays 50 × 50 — 90 mm is what drops into the 10 × 10 cm envelopes, so
"rounding it up to match" would break the storage the shelf is built around.

The trade, stated plainly: two 100 mm cards plus a 5 mm gutter is 205 mm on a
210 mm page, so the side margin is **2.5 mm** and the outer trim lines of 02 and
03 sit *inside* the 5.5 mm printer-safe margin. There is no layout that avoids
it — 2 × 100 mm leaves 10 mm of slack in total, so even a zero gutter gives only
5 mm. It is still strictly better than the A6 version, whose cards ran to the
paper edge. The consequence is handled rather than ignored: **on those two
sheets the crop marks are in the gutters only**, nothing is printed in the outer
margins, and the footer sits in the middle gutter, 148 mm from any edge.

Sheets 02 and 03 are **re-imposed, not redrawn** — the v2 generator is still
lost. Each A6 quadrant is placed whole from the pristine `src/` copy, uniformly
scaled by **0.9426** and centred in its new card, so the photograph stays
centred (measured off the built file: card centre 52.50 / 221.00 mm, photo
centre 52.55 / 221.04 mm) and nothing is clipped. Photo 75.9 → **71.59 mm**.

**Duplex is unchanged — SHORT EDGE, and it was re-verified, not assumed.** The
new grid is symmetric under `(x, y) -> (x, H - y)` (rows 6–146 and 151–291 swap
onto each other, columns are untouched) and every quadrant kept the place it
had. Read back off the rebuilt files by quadrant position: 02 p1 tap · mop · peg
· bin is backed by p2 peg · bin · tap · mop; 03 p1 cat · pig · rug · hat backed
by p2 rug · hat · cat · pig; p3 mug · bed · dog · cot by p4 dog · cot · mug ·
bed; p5 pen · bag · log · jam by p6 log · jam · pen · bag. Front top-left is
backed by back bottom-left on all ten pages, exactly as §3 says it should be.

### 7.2 · The cut standard, on every sheet

It now lives in one file, `scripts/curriculum/writing-shelf/cutmarks.py`, and
nothing hand-rolls a trim line any more:

* a **solid** trim line, **0.3 mm**, mid-grey `#8C857B`, exactly on the card
  edge — the line you cut on;
* **crop marks** at every corner: **4 mm**, 0.3 mm, house ink, **offset 1 mm**
  from the corner so they never touch a card, and never closer than 1 mm to a
  neighbouring card;
* a one-line footer, **"Cut on the solid line · N cards"**.

The one rule that bends is mark LENGTH, and it bends by measurement, not by
taste: a mark is **shortened** where a page edge (the 5.5 mm printer-safe
margin) or a neighbour is closer than 4 mm, and **dropped** where less than 1 mm
would survive — a 0.4 mm smudge that may not leave the printer is worse than no
mark beside a line that is drawn solid anyway. Every builder prints the shortest
mark it drew, so a layout that strangles its own marks says so at build time.

04, 05 and 09 were on the "left alone" list in §2 and are **not** any more:
"already unambiguous" is not the same as "reads like the others", and reading
like the others was the point. Their generators are still lost, so the solid
line is drawn **straight over** the old dotted rectangle — 0.30 mm over 0.265 mm
covers the dots — and the stale sentence *"cut on the dotted line, where two
ticks point at each other."*, which is baked into 04, 05 and all three pages of
06, is **whited out and replaced by the standard footer**. A sheet that says
"dotted" while showing a solid line is the exact ambiguity this was called in to
remove. (Cosmetic residue: the replacement is shorter than the sentence it
covers, so those footers now carry a small gap where the old words were.)

**09 is the honest exception.** Its two A5 halves *are* the page: there is no
waste anywhere, so no crop mark and no footer can be printed without printing it
on a card. It gets the solid trim line and nothing else.

### 7.3 · Measured, off the rebuilt PDFs

Trim rectangles read back at 254 dpi; "nearest ink" is the closest any trim line
or crop mark comes to a page edge (safe margin 5.5 mm).

| sheet | card / trim | gutters | crop marks | nearest ink |
|---|---|---|---|---|
| 01 mat | **282.00 × 100.00 mm** | — | 8, shortest **1.00 mm** (7.5 mm side margin) | **5.50 mm** |
| **02 chain** | **100.00 × 140.00 mm** ×4 | **5.00 / 5.00 mm** | 16 in the gutters + centre cross; 16 dropped at the page edge | **2.50 mm** (the outer trim line — see §7.1) |
| **03 dictation** | **100.00 × 140.00 mm** ×4 | **5.00 / 5.00 mm** | 16 in the gutters + centre cross; 16 dropped | **2.50 mm** |
| 04 small objects | 60.59 × 35.45 ×12, 34.66 × 42.33 ×3 | 7.41 / 8.47 mm | 104, shortest 4.00 mm, 16 dropped | 6.56 mm |
| 05 strips | 190.50 × 60.33 ×4 | 7.67 mm | 32, shortest 3.16 mm | **5.50 mm** |
| 06 sequences | 90.50 × 90.50 ×4, 3 pages | 9.50 / 9.50 mm | 32, shortest 3.10 mm | **5.50 mm** |
| 09 script card | one full-height trim line at x 148.565 | — | none possible | line runs to the edge, by definition |
| 11 backup cards | 50.00 × 50.00 mm | 5.00 / 5.00 mm | 104 over 2 sheets, shortest 3.00 mm | 9.50 mm |

Every page of every sheet above was rasterised and looked at, not merely
measured. Sheet 11's crop marks are capped at 3 mm because its running head and
footer sit 5 mm off the grid; its footer leading dropped 4.0 → 3.7 mm to make
room for the standard line, and its prose now says 13 cuttable cards on sheet 1
and 8 on sheet 2 (the amber "photo to come" slots are markers, not cards, and
get no trim line).

### 7.4 · Files

New:

- `scripts/curriculum/writing-shelf/cutmarks.py` — the standard, and the only
  place its numbers live
- `scripts/curriculum/writing-shelf/build_flip_cards.py` — re-imposes 02 and 03
- `scripts/curriculum/writing-shelf/src/{04-small-objects,05-lined-sentence-strips,09-teacher-script-card}.pdf`
  — pristine copies, added so the overlay can work on them

Rewritten or edited:

- `scripts/curriculum/writing-shelf/add_cut_guides.py` — now 04, 05, 06, 09
  (02/03 moved out); draws the standard and patches the stale sentence
- `scripts/curriculum/writing-shelf/build_sound_frame_mat.py` — on the standard
- `scripts/curriculum/writing-shelf/build_backup_object_cards.py` — on the standard
- `scripts/curriculum/writing-shelf/README.md`

Regenerated:

- `public/dark-phonics-shelf/v2/01-sound-frame-mat.pdf`
- `public/dark-phonics-shelf/v2/02-chain-cards.pdf`
- `public/dark-phonics-shelf/v2/03-dictation-photo-cards.pdf`
- `public/dark-phonics-shelf/v2/04-small-objects.pdf`
- `public/dark-phonics-shelf/v2/05-lined-sentence-strips.pdf`
- `public/dark-phonics-shelf/v2/06-picture-sequences.pdf`
- `public/dark-phonics-shelf/v2/09-teacher-script-card.pdf`
- `public/dark-phonics-shelf/v2/11-backup-object-cards.pdf`
- `public/dark-phonics-shelf/v2/manifest.json` — sizes, cut prose, byte counts

### 7.5 · How to rerun

```
python3 scripts/curriculum/writing-shelf/build_sound_frame_mat.py
python3 scripts/curriculum/writing-shelf/build_flip_cards.py
python3 scripts/curriculum/writing-shelf/add_cut_guides.py
python3 scripts/curriculum/writing-shelf/build_backup_object_cards.py
```

Needs `reportlab`, `pypdf`, `pikepdf`, `pdfplumber`, `Pillow`. All four are
deterministic and idempotent — the overlays always read `src/`, never the
published file.

### 7.6 · Still owed

- **The prose on `PRINT-GUIDE.html` and `dark-phonics-shelves.html` still calls
  02 and 03 "A6" and quotes 105 × 148.5 mm**, and still describes the old
  dotted-line-and-ticks guides. `manifest.json` was updated; those two pages
  were not. They need a read-through.
- Sheet 07 (one amber fold/cut line), 08 (no cut) and 10 were left as shipped;
  10 is a token/control-card sheet whose generator is also lost, and bringing it
  onto the standard means measuring its token boxes the same way 04 was measured.
- Print one sheet of 02 duplex on the real printer before laminating a set: the
  2.5 mm outer trim line is the one thing on these sheets a printer may clip.

---

## 8 · ADDENDUM — 2026-09-05, late: CUT ONCE, and printed ≠ finished

Tredoux looked at §7's sheets and changed two rules. Everything in §7 about
gutters, crop marks and 100 × 140 flip cards is **superseded** by this section;
§7 is kept as the record of how the set got here.

### 8.1 · Rule A — cut once

The §7 standard asked for **two cuts per card edge**: down one side of a 5 mm
gutter, then down the other, with a strip of waste falling out between them.
That is twice the cutting and twice the chance of a wandering blade. So:

* cards **BUTT** — no gutters anywhere;
* every cut line runs the **full width or the full height of the page, edge to
  edge**, so one straight stroke separates the cards on both sides of it at once;
* the lines are **light-grey 0.25 mm hairlines**, not crop marks and not dotted
  rectangles. They are cut away — half a 0.25 mm line is 0.125 mm — so a line may
  cross a card edge: it *is* the card edge;
* a small **black triangle** at each end, at the 5.5 mm printer-safe margin,
  points along the line. That is what you sight the blade on: a hairline dies in
  the last few millimetres of any printer, a filled triangle does not;
* card **content stops 4 mm inside every card edge**, so a 1–2 mm drift never
  touches a photograph or a word;
* one footer: **"Cut along every grey line · N cards"**;
* the outer edge of the block is a full-length line like any other, and what is
  left over is a centred margin — where the triangles and the footer live.

All crop marks, dotted rectangles and ticks are gone from the set. The standard
lives in `cutmarks.py` and nothing hand-rolls a line.

**A triangle is drawn only where a line ends at the PAGE EDGE.** Nothing in the
set now needs a line that stops short: sheet 04 had one for a few hours, because
its punctuation tiles were narrower than its word cards, and Tredoux called that
a violation of cut once — correctly. The tiles were widened instead (§8.8), so
every line on every sheet runs the full width or the full height of the page and
carries a triangle at both ends.

### 8.2 · Rule B — printed size is finished size minus 20 mm, where it is mounted

Every card that goes into a card stand or an envelope is **mounted by hand on a
coloured backing card with a 1 cm border all round**. The finished sizes are
fixed by the stationery already bought, so the printed sizes follow:

| sheet | printed | mounted | why that finished size | per A4 |
|---|---|---|---|---|
| 02 chain cards | **80 × 120** | **100 × 140** | his 100 mm card stands | 4, butted 2 × 2 |
| 03 dictation cards | **80 × 120** | **100 × 140** | same stands | 4, butted 2 × 2 |
| 06 picture sequences | **70 × 70** | **90 × 90** | 10 × 10 cm envelopes | 4, butted 2 × 2 |
| 04 word cards / tiles | 60 × 35 / **60 × 42** | not mounted | loose in tins | 12 + 3 |
| 05 sentence strips | 190 × 60 | not mounted | loose on the tray | 4 |
| 09 script cards | 148.5 × 210 | not mounted | the two halves ARE the sheet | 2 |
| 11 backup objects | 50 × 50 | not mounted | sits beside 3–6 cm miniatures | 15 |

**06 stays four cards to a sheet, not eight.** 3 × 4 portrait leaves zero side
margin and is out; 2 × 4 landscape fits eight and would save one sheet of card —
at the cost of putting two different sets on one sheet, when "one sheet is one
complete set" is how the material keeps a set together before it reaches its
envelope. `C06_COLS`/`C06_ROWS` in `build_cut_sheets.py` is the one place to
change that if the sheet of card is worth more. The set name now prints in the
top margin, because the source sheet's running head does not survive
re-imposition.

02–06 are **re-imposed, not redrawn** (the v2 generator is still lost): each
piece is cut out of the pristine `src/` copy and placed, uniformly scaled, in its
new card. On 04 and 05 the scale is the largest at which the measured ink stays
4 mm inside the new card (`impose.clearance_scale`); on 02 and 03 the card is
RE-LAID instead — see §8.8, because scaling the whole quadrant down made the
picture far too small. A per-placement clip inset
was needed because the old sheets drew their dotted rule exactly ON the line the
piece is cut out along: without it that rule rides into the new card and reads as
a second, wrong, cut line. 04/05 clip 0.6 mm in; **06 clips 7.5 mm in**, which is
where its photograph starts, so its old dotted frame *and* corner ticks stay
behind.

**Duplex on 02 and 03 is unchanged — SHORT EDGE — and was re-verified, not
assumed.** The new block is centred, so the grid is symmetric under
`(x, y) → (x, H − y)` (rows 28.5–148.5 and 148.5–268.5 swap; columns untouched).
Every source quadrant was image-compared against every output card, page by page:
each lands in the same named quadrant it had. The only two ties are 02 p3 and p4,
where the quadrants in question are blank on the source. Read off the rebuilt 03:
p1 cat · pig · rug · hat is backed by p2 rug · hat · cat · pig — front top-left
backed by back bottom-left, exactly as §3 says.

### 8.3 · Rule C — sheet 11 has no missing photographs any more

§6 shipped `sun`, `pot`, `pan` and `tin` as amber "photo to come" slots because
`phonics-images/satpin-v2/cvc-photos/` had none. **All four are in the Montessori
picture bank**, at `docs/picture-bank/photos/<word>/<word>.jpg` — real objects on
white, which is the house rule for these cards, and all four are right for the
job (the pot is a cooking pot with a lid, the pan is at three-quarters, the tin
is unlabelled so no word reaches a card). Border luminance 223–254, i.e. white
ground. The builder now falls back to the bank when `cvc-photos` has nothing, and
pads the 3:2 bank photographs to square **on white, never cropping** — a crop can
cut the object. **26 of 26 pieces are real cards; nothing is owed.** The amber
empty-slot drawing is kept for the next object that has none.

Sheet 11's card also gained 4 mm of white inside the cut line (was 2), so the
photograph is 42 mm on a 50 mm card.

### 8.4 · Measured, off the rebuilt PDFs at 600 dpi

Card sizes are line-centre to line-centre; "line ends" is how close every cut
line gets to the paper edge; "clearance" is the tightest gap between a card edge
and any ink inside it; "nearest black" is the closest black ink (the triangles)
comes to a paper edge, against the 5.5 mm printer-safe margin.

| sheet | measured card | cut lines | line ends | clearance | nearest black |
|---|---|---|---|---|---|
| 01 mat | 282 × 100 trim, both sides | 2 V + 2 H | **0.00 mm** | — | 5.50 mm |
| 02 chain | **80.00 × 120.00** ×4 | 3 V + 3 H | **0.00 mm** | 3.99 mm (the 72 mm picture) | 5.50 mm |
| 03 dictation | **80.00 × 120.00** ×4 | 3 V + 3 H | **0.00 mm** | 3.99 mm | 5.50 mm |
| 04 small objects | **60.01 × 35.00** ×12, **60.00 × 42.02** ×3 | 4 V + 6 H, all full-page | 0.00 mm | 4.06 mm | 5.50 mm |
| 05 strips | **189.99 × 60.00** ×4 | 2 V + 5 H | 0.00 mm | 10.43 mm | 5.50 mm |
| 06 sequences | **70.02 × 70.02** ×4, 3 pp | 3 V + 3 H | 0.00 mm | 3.98 mm | 5.50 mm |
| 09 script card | one full-height line at x 148.53 | 1 V | 0.00 mm | — | 5.59 mm |
| 11 backup cards | **50.00 × 50.00** ×26 | 6 V + 4 H | 0.00 mm | 3.96 mm | 5.50 mm |

(3.96–3.98 against a nominal 4.00 is the raster's own sampling error at 600 dpi,
±0.04 mm; the geometry is exact and every builder's `check()` refuses a layout
that is genuinely under.) Every page of every sheet was rasterised at 150 dpi and
looked at, not merely measured: `_to_delete/shelf-render-v3/<sheet>-p<N>.png`,
all 24 pages of the eleven sheets.

### 8.5 · Sheet 01 — the mat, and the tray it has to fit

**The tray is measured and the mat is right: it fits a 中托盘 (32.5 × 25 cm
outside, ≈ 30.5 × 23 cm inside) with about 1 cm of play all round. It does NOT
fit a 小托盘 (25 × 20 cm) — Tray 1 must be a medium tray.** The 282 × 100 mm trim
and both frame rows therefore stay exactly as they are; the sheet was rebuilt
only to bring its cut guide onto Rule A (four grey lines edge to edge, triangles
at the page edges, the standard footer).

Current values: trim rectangle **282 × 100 mm**, centred, identical on both
sides; front **3 × 70 mm** frames with 6 mm gutters (30.0 mm mat margin); back
**4 × 66 mm** with 4 mm gutters (3.0 mm mat margin); `MAT_MARGIN_MIN` 3.0 mm.

The formula, now a function (`max_frame()`):

```
frame = (trim_len − 2 × margin − (n − 1) × gutter) / n
```

bounded by `(PAGE_W − trim_len) / 2 + margin ≥ 5.5`, i.e. the frames carry ink
and must stay inside the printer-safe margin, which caps the trim length at
**292 mm** on A4 landscape with a 3 mm mat margin. (Under the new standard the
cut lines themselves may run to the paper edge; only the ink may not.) At the
current 282 mm trim the largest frame would be **88.00 mm at n = 3** and
**66.00 mm at n = 4** — the back is already at its maximum.

### 8.6 · Files

New: `scripts/curriculum/writing-shelf/impose.py`,
`scripts/curriculum/writing-shelf/build_cut_sheets.py`.

Rewritten: `cutmarks.py` (the standard), `build_flip_cards.py` (80 × 120 butted),
`add_cut_guides.py` (09 only now), `build_backup_object_cards.py` (butted, 4 mm
inset, picture-bank fallback), `README.md`.
Edited: `build_sound_frame_mat.py` (new standard + `max_frame()`, not run).

Regenerated: `02-chain-cards.pdf`, `03-dictation-photo-cards.pdf`,
`04-small-objects.pdf`, `05-lined-sentence-strips.pdf`,
`06-picture-sequences.pdf`, `09-teacher-script-card.pdf`,
`11-backup-object-cards.pdf`, `manifest.json`.
**Not** regenerated: `01-sound-frame-mat.pdf`.

Prose, the two spots §7.6 owed: `PRINT-GUIDE.html` (every cutline, the A6 sizes,
and the coda about tiling sheets) and `dark-phonics-shelves.html` (Tray 3 and
Tray 4 make/print lists, the tray diagrams, the card-stand buy rows, and the Cut
column of both print tables). "A6" no longer appears on either page.

### 8.7 · Still owed

* **Print one sheet of 02 duplex on the real printer before laminating a set.**
  The 2.5 mm margin problem of §7 is gone — the block now keeps a 25 mm side
  margin — but the front/back registration is still a thing only paper can prove.
* Nothing further on sheet 01 — the tray is measured and the mat fits.
* Sheets 07, 08 and 10 are still as shipped; 10's generator is lost and bringing
  it onto the standard means measuring its token boxes the way 04's were.

### 8.8 · Round two — the director's four fixes, same day

**1 · The picture on 02 and 03 was far too small.** The first pass scaled the
whole A6 quadrant down into the 80 mm card, so the quadrant's own generous
margins came along and the photograph landed at ~58 mm. The card is **re-laid**
now, not shrunk: the photograph is lifted out by its own placement rectangle —
read from the PDF content stream, **75.94 mm square on every one of these
sheets** — and re-placed at the full clearance width, **72.00 × 72.00 mm**,
centred both ways. The word on the back is lifted by its **ink box, measured off
a 300 dpi raster** (this font is subsetted and reports unreliable widths; a box
from the text layer would have clipped the word) and scaled up ×2.00 to a **cap
height of 20–22 mm** on 03. 02's backs are five-line chains, so the 112 mm
content height clamps them to ×1.22–1.26 — 57–59 mm wide by the full 112 mm
tall, which is simply what a five-line card holds. A stray "tap" hiding behind
02 p1's photograph, left by the lost generator, is dropped with the rest of the
quadrant.

**Duplex re-verified after the re-lay**, and by a better method than pixels:
every source face was cropped from a 150 dpi render of the pristine sheet and
compared against every placed box of the rebuilt card. 12 faces on 02 and 24 on
03 all match their own named card, worst self-difference 1.27 and 8.70 of 255
(resampling noise). Front top-left is still backed by back bottom-left.

**2 · Sheet 04 was violating cut once.** The punctuation tiles were 34 mm wide
against the cards' 60, so their verticals had to stop at the band edge. The tiles
are now **60 × 42 mm** — same width as a card — and the sheet is ONE
three-column grid, four rows of cards and one row of tiles: **4 verticals and 6
horizontals, every one edge to edge, 20 triangles**. A 60 × 42 tile still lies
flat in a mint tin, and nothing on this sheet is mounted, so 60 × 35 and 60 × 42
are the finished sizes. The tile size is corrected in `PRINT-GUIDE.html`,
`manifest.json`, the Tray 5 make/buy copy and the tray diagram on
`dark-phonics-shelves.html`.

**3 · Adult text was starting on a cut line.** On 11 the head and footer began at
x = 23.5 mm, which is exactly the outer vertical, so the triangle at the foot of
that line sat under the words. Text now starts **4 mm inside the outer cut line**
— 27.5 mm on 11, 19 mm on 04, 14 mm on 01 — and every builder now refuses a
footer that starts within 14 mm of a page edge or within 3 mm of a vertical.
11's footer also moved up 2 mm (its lowest line now reaches 11.5 mm on sheet 1,
15.2 mm on sheet 2, against a floor of 9.6 mm, which is the top of a triangle
plus 1.5). Checked on every other sheet: 02/03 start at 30 mm, 05 at 15 mm, 06 at
40 mm, all at least 4 mm clear of their nearest line.

**4 · Sheet 01 brought onto Rule A** — see §8.5. Frames and trim untouched.

**Measured after round two** (600 dpi, every sheet, every page): every cut line
reaches **0.00 mm** of the paper edge; tightest content clearance **3.96 mm**
(11's 4.00 mm photo inset, at the raster's ±0.04 mm); nearest black ink to any
edge **5.50 mm** on every sheet (5.59 on 09, whose line is inherited). Card sizes
read back 80.00 × 120.00, 60.01 × 35.00, 60.00 × 42.02, 189.99 × 60.00,
70.02 × 70.02, 50.00 × 50.00 and the 282 × 100 trim. All 24 pages re-rendered to
`_to_delete/shelf-render-v3/`.

**Files added or changed in round two:** new
`scripts/curriculum/writing-shelf/extract_imgs.py` (image placement rectangles
out of a PDF content stream); `impose.py` gained `reimpose_pages()` for
per-page placement; `build_flip_cards.py` re-laid; `build_cut_sheets.py` (04
uniform grid, footer check); `build_backup_object_cards.py` (text inset, footer
floor); `build_sound_frame_mat.py` (Rule A, standard footer, `TEXT_X`, dead tick
constants removed); `add_cut_guides.py` (one label); `README.md`;
`01-sound-frame-mat.pdf` now regenerated as well as 02–06, 09 and 11;
`manifest.json`; `PRINT-GUIDE.html`; `dark-phonics-shelves.html`.
