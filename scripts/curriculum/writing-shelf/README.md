# Writing Shelf print scripts

## The cutting standard (`cutmarks.py`, locked 2026-09-05 late) — CUT ONCE

The morning's version of this asked for two cuts per card edge: down one side of
a 5 mm gutter, then down the other, with a strip of waste falling out between
them. Tredoux's rule now:

1. cards **BUTT** — no gutters anywhere;
2. every cut line runs the **full width or the full height of the page, edge to
   edge**, so one straight stroke of the blade separates the cards on both sides
   of it at once;
3. the lines are **light-grey 0.25 mm hairlines**. They are cut away — half of a
   0.25 mm line is 0.125 mm — so a line may cross a card edge: it *is* the card
   edge;
4. a small **black triangle** at each end, sitting at the 5.5 mm printer-safe
   margin, points along the line. That is what you sight the blade on, because a
   hairline dies in the last few millimetres of any printer;
5. card **content stops 4 mm inside every card edge** (`CM.CONTENT_CLEAR`);
6. one footer: **Cut along every grey line · N cards**.

No crop marks, no dotted rectangles and no ticks anywhere in the set.

A triangle is drawn ONLY where a line ends at the page edge, and nothing in the
set now needs a line that stops short. Adult text starts at least 14 mm from a
page edge and at least 3 mm clear of any vertical, so no line of type begins on a
cut line or above the triangle at the foot of one; every builder checks it.

`cutmarks.py` is the only place any of those numbers live. Do not hand-roll a cut
line in a builder.

## Printed size vs mounted size

Every card that goes into a **card stand or an envelope is mounted by hand on a
coloured backing card with a 1 cm border all round**, so the PRINTED card is the
finished card minus 20 mm each way. The unmounted sheets print at finished size.

| sheet | printed | mounted | why |
|---|---|---|---|
| 02, 03 flip cards | 80 × 120 | **100 × 140** | fits his 100 mm card stands |
| 13 story starter cards | 80 × 120 | **100 × 140** | the same card as 02/03 — they are turned over |
| 06 picture sequences | 70 × 70 | **90 × 90** | fits the 10 × 10 cm envelopes |
| 04 cards / tiles | 60 × 35 / 60 × 42 | not mounted | loose in tins |
| 05 sentence strips | 190 × 60 | not mounted | loose on the tray |
| 11 backup objects | 50 × 50 | not mounted | sits beside 3–6 cm miniatures |

## `impose.py`

The v2 generators for 02–06 are lost, so those sheets are re-laid-out by cutting
each piece out of the pristine original in `src/` and placing it, uniformly
scaled, on a fresh page. `clearance_scale()` returns the largest scale that keeps
the measured ink 4 mm inside the new card; each builder shows its working. The
per-placement `inset` shrinks the CLIP only — the old sheets drew their dotted
rule exactly on the line the piece is cut out along, and without an inset it
rides into the new card as a second, wrong, cut line.

## `extract_imgs.py`

Placement rectangle of every image XObject on a page, walked out of the content
stream. This is how the flip cards find their photograph: 75.94 mm square on
every one of those sheets, and nothing else in the quadrant is as reliable.

## `build_flip_cards.py` — 02 and 03

Four butted 80 × 120 mm cards, block 160 × 240 centred on A4: 25 mm side margin,
28.5 mm head and foot. The card is RE-LAID, not shrunk: the photograph is lifted
out by its placement rectangle and re-placed at 72 × 72 mm, and the word on the
back is lifted by its ink box (measured off a 300 dpi raster, because this font
is subsetted and reports unreliable widths) and scaled up to a 20 mm cap height,
clamped by the 112 mm content height where the face is a five-line chain. **Duplex is unchanged: SHORT EDGE.** The block is centred,
so the grid is symmetric under `(x, y) -> (x, H - y)` and every quadrant keeps
the place it had; verified after every rebuild by image-comparing each source
quadrant against each output card.

## `build_cut_sheets.py` — 04, 05 and 06

Butted re-imposition of the three single-sided sheets. 04's punctuation tiles are
60 × 42, the same WIDTH as its word cards, so the sheet is one three-column grid
and every line runs edge to edge; do not narrow them back to 34 mm. 06 stays four cards to a sheet because a sheet IS a
set; `C06_COLS`/`C06_ROWS` is where to change that if a sheet of card is worth
more than the set, and its clip inset (7.5 mm) is what removes the old dotted
frame and corner ticks that sat inside each picture box.

## `build_06_source.py` — 06's pristine source, from the art

The one sheet in `src/` that HAS a generator again. New Midjourney pictures land
in `phonics-images/satpin-v2/sequences/` as `seq-A-1.png` … `seq-C-4.png`
(reading order, square, >= 1024 px) and the whole of Tray 6 rebuilds with:

```
python3 scripts/curriculum/writing-shelf/build_06_source.py
python3 scripts/curriculum/writing-shelf/build_cut_sheets.py --only 06
```

Move the pictures being replaced into `sequences/_replaced_<date>/` first, and
rasterise the result and look at it. Geometry is the measured geometry of the
frozen sheet — a 75.918 mm square centred in each 90.5 mm box — so nothing about
`SRC06` or `CLIP_INSET_06` has to move. The old dotted trim rectangle, its corner
ticks and the teacher prose are NOT redrawn: the 7.5 mm clip lands 0.17–0.25 mm
inside the picture on all four sides and throws every one of them away. The sheet
this replaces is kept at `src/_prev/06-picture-sequences.orig.pdf`.

`--only NN` on `build_cut_sheets.py` rebuilds just the sheets named; 04 and 05
still have no generator behind their frozen sources, so leaving them alone is the
normal case.

## `build_13_story_starter_cards.py` — 13, and the second sheet built FROM art

Tray 5's supplement: a picture on the front, the one decodable sentence it is of
on the back. The child pulls a card when the blank sentence line has him stuck,
says what he sees, builds it out of the word tin, then **turns the card over** —
the back IS the control of error. That physical turn is why it uses the FLIP CARD
size (80 × 120 printed, 100 × 140 mounted, `build_flip_cards.py`'s geometry
constant for constant) and not the 70 × 70 story card of sheet 06, which is
looked at and never turned. No third size was invented.

Duplex is SHORT EDGE, like 02 and 03. The block is centred so the grid is
symmetric under `(x, y) -> (x, H - y)`: front (col c, row r) is backed by back
(col c, ROWS-1-r), and each back is drawn **rotated 180°** so that it reads
upright once the sheet is flipped. That pairing is read off the shipped
`03-dictation-photo-cards.pdf` and is what
`lib/montree/writing-shelf/generator/flip-cards.ts` encodes as
`frontSlot()` / `backSlot()`.

Art lands in `phonics-images/satpin-v2/story-starters/<slug>.png` (**gitignored**,
Mac only — the same rule as `sequences/` and `cvc-photos/`): one square PNG a
card, >= 1024 px, named for its slug. `CARDS` in the builder is the slug →
sentence table and is the only place to add or reword a card.

Two things are done TO the art and nothing else is:

* `PATCHES` whites out the small `(c)` glyph the image generator baked into the
  paper below the drawing on `dog-log` and `frog-bog`. The boxes are fractions of
  the square, and `check_art()` refuses to build if a box has drifted onto ink or
  off the glyph, so a re-rolled picture cannot be silently damaged.
* `paper()` — build_14's, IMPORTED, not a second copy — lifts a cream, grey or
  scanned-textured ground to paper white (`pig-wig` and `bee-tree`). A tinted
  panel on a white card prints as a visible rectangle with a visible edge, which
  is the one thing a picture card must not have. The white point is the **5th
  percentile** of the border band, never its median: `bee-tree`'s scanned grain
  runs 226–245 within the one picture, and a median white point puts the middle
  of that grain at paper and leaves the dark half of it below — which is exactly
  the soft grey box the teacher sent back on 2026-09-13. The percentile is
  floored so art touching the border cannot drag it down, and a border already at
  paper is left completely alone. Do not reintroduce a per-sheet `whiten()`.

The sentence is **Comic Neue**, written **all in lower case**, wrapped to the
FEWEST lines that still reach the full 13 mm em, most balanced split first,
which puts the fourteen at one or two lines and an 8.7 mm cap height. Both come
off the teacher's review of the printed proofs, 2026-09-12. Lower case because
the card carries the literal words a four-year-old says about the picture — `hen
in a pen`, not `Hen in a pen` — and the capital and the full stop are his to add
with a punctuation tile off the tray; the change is in `CARDS`, the SOURCE data,
so it propagates to anything else that reads it. Comic Neue because Andika, the
house literacy face, read as a formal printed sentence: Comic Neue is the free
SIL-OFL face metrically similar to **Comic Sans MS**, which is Microsoft-licensed
and cannot be embedded in a PDF this shelf ships. It lives beside Andika in
`public/fonts/ComicNeue-Regular.ttf` with its licence. Adult text in the margin
is still Andika. Sheet 12's word cards are **Comic Neue too** (they were
Fredoka while the tin was a flashcard set; it is a writing material now).

THE FRAME COLOUR IS THE TIER (2026-09-13), the same pink / blue / green code as
sheet 14 and read off the words on the card's back: pink = every content word a
pure three-letter CVC (10 cards), blue = four letters or more with no blend
(0 cards on this deck — everything past CVC here steps straight into a blend,
though the tier is wired through so a future card just works), green = a
consonant blend (4 cards: frog in a bog, bee on a tree, duck in a truck, sheep
asleep). `TIER_C`/`TIER_NAME` are IMPORTED from
`build_14_sentence_builder_cards.py`, never re-typed, so the two sheets cannot
drift. It replaces the old deck-wide warm charcoal with one pink card, which
signalled nothing a child or a teacher could act on.

ONE TIER TO A PAGE. `CARDS` is written in tier order and `paginate()` fills a
page from one tier and then stops, leaving the tier's last page short rather
than topping it up from the next — each tier is printed onto its own colour of
card stock, so a mixed page is unusable. `check_pages()` re-derives, per page,
that the page is single-tier, that no card was lost or duplicated by the
regrouping, and that each sentence back still lands behind its own picture front
after the short-edge flip. Every page header names its tier on both faces:
`story starter cards · pink · picture side · sheet 1 of 4`.

```
python3 scripts/curriculum/writing-shelf/build_13_story_starter_cards.py
pdftoppm -png -r 70 public/dark-phonics-shelf/v2/13-story-starter-cards.pdf /tmp/s
```

Four cards a page, 2 × 2, 8 pages = 4 duplex sheets: PINK on sheets 1–3
(4 + 4 + 2, so the third is 2 cards and 2 blanks — deliberate, never padded from
the green tier) and GREEN on sheet 4 (4 cards). Look at a front and its back together: the back grid must be the
front grid mirrored top to bottom, upside down.

## `build_14_sentence_builder_cards.py` — 14, the GRADED picture-then-words card

Sheet 13's structure, graded into the Montessori Pink / Blue / Green reading
series so the child picks his own level off the tray. Eighteen cards: 6 pink
(three-letter CVC), 6 blue (four-letter), 6 green (one consonant blend a card —
st, sp, bl, cr, nd, mp).

**Front is the picture and nothing else; back is the sentence and nothing else.**
The sentence used to sit under the picture on the same face and the teacher sent
that proof back (2026-09-12): a picture with its words beside it is a LABEL, and
the child reads the words and stops looking. This is the Montessori three-part
card. Duplex is SHORT EDGE and the registration is `build_13`'s constant for
constant — centred block, front (col c, row r) backed by back (col c, ROWS-1-r),
each back drawn rotated 180°.

**The tier is ONE EVEN RULE**, 1.5 mm, the same on both faces and the same width
on all four sides, its outer edge on the 4 mm content line. The 8 mm solid
colour bar that used to run along the top of the card is GONE: it was the top of
the border, and on the printed proof it read — correctly — as a border thicker
on one side than the others. `check()` now measures the four margins off the
content box and refuses to build if they are not equal. There is still no
written difficulty label anywhere on the card; the backing card repeats the
colour, which is what actually sorts the tray.

Type is Comic Neue, lower case, sheet 13's `lay_out()` against the 64 × 104 mm
back, and every one of the eighteen lands at the same 13 mm em / 8.7 mm cap.

`SENTENCE_BUILDER_CARDS` in
`lib/montree/dark-phonics/writing-shelf-language.ts` is the ONE source for the
slug, tier, sentence and print-art path; `check_source()` parses that file and
refuses to build if this script has drifted from it. Edit the TypeScript first,
then mirror it here — never the other way. Art sources are always the
FULL-RESOLUTION originals, never the 700 px web copies under `public/`; aspect
ratio is preserved and the picture is letterboxed on white inside a 64 mm box.

```
python3 scripts/curriculum/writing-shelf/build_14_sentence_builder_cards.py
pdftoppm -png -r 70 public/dark-phonics-shelf/v2/14-sentence-builder-cards.pdf /tmp/s
```

Four cards a page, 2 × 2, 10 pages = 5 duplex sheets; the last sheet is 2 cards
and 2 blanks.

## `build_12_word_card_tin.py` — 12, the word-card tins

**Four sets, 164 cards, 4 pages single-sided, ONE TIN TO A PAGE** — pink 62,
blue 20, green 37, free composition 45 (35 reader words + 10 blanks). Nothing in
it is typed: every tier tin is DERIVED from the sentences of **both** Tray 5
decks — sheet 13's fourteen story starters and sheet 14's eighteen sentence
cards, thirty-two in all — through `sentences()`, and printed through
`build_14.display_words()`, the one transform, so `cat on a mat` asks the tin for
`Cat`, `on`, `a`, `mat.` and nothing here ever types a capital or a full stop.

**The count is a SUM, not a maximum** (owner, 2026-09-14): a tin must lay ALL of
its tier's sentences out at once, on the mat, together — so pink holds eleven
`a` cards because eleven of its sixteen sentences want one. Sheet 13 was absent
from the derivation until 2026-09-14 and nineteen of its words (mat, pen, dog,
log, bug, rug, rat, hat, nut, hut, pan, cub, bog, bee, tree, duck, truck, sheep,
asleep) had no card in any tin — the defect a teacher hit in class.
`check_buildable()` re-derives from both decks that every one of the thirty-two
sentences is SIMULTANEOUSLY buildable out of what the plan prints, and refuses
to build otherwise; `--check` runs it with a negative control.

A page carries ONE tin, for sheets 13 and 14's reason — each tin prints onto its
own colour of card stock — and the page header names it. The cards are laid in
butted 28 mm STRIPS, not a grid: the width of a card is its word's own INK plus
G = 7.0 mm, so butted cards leave a constant word space, ink to ink.

The tin and the app's `WORD_CLASSES` / `SENTENCE_BANK` ledger in
`writing-shelf-language.ts` are **deliberately independent** — a tile existing is
not the same fact as the word having been taught, and none of the nineteen was
added to the ledger. Do not sync them.

```
python3 scripts/curriculum/writing-shelf/build_12_word_card_tin.py
python3 scripts/curriculum/writing-shelf/build_12_word_card_tin.py --check
```

## `build_backup_object_cards.py` — 11

26 pieces of 16 objects, 50 × 50 mm, 5 × 3 butted on A4 landscape, 2 sheets.
Photographs come from `phonics-images/satpin-v2/cvc-photos/` (**gitignored**, Mac
only) and fall back to the Montessori picture bank at
`docs/picture-bank/photos/<word>/<word>.jpg`, which is where sun, pot, pan and
tin live — **nothing on this sheet is waiting on a photograph any more**. Bank
photographs are 3:2 and are padded to square on white, never cropped. The amber
"photo to come" slot is kept for the next object that has none.

## `add_cut_guides.py` — 09 only

One A4 landscape sheet cut once down the middle. Overlay on the pristine copy in
`src/`: whites out the old end ticks, draws the grey hairline edge to edge, puts
a triangle at each end. Idempotent — the input is always `src/`.

## `build_sound_frame_mat.py` — 01

On the new standard: four grey lines edge to edge at the trim edges, triangles at
the page edges, the standard footer. **Frames and trim are settled** — the mat
fits a 中托盘 (32.5 × 25 cm outside, ≈ 30.5 × 23 cm inside) with about 1 cm of
play, and does not fit a 小托盘; Tray 1 must be a medium tray.

The parameters are `TRIM_W` / `TRIM_H` (the mat), `FRONT_FRAME`/`FRONT_GUTTER`/
`FRONT_N`, `BACK_FRAME`/`BACK_GUTTER`/`BACK_N` and `MAT_MARGIN_MIN`. The formula
is `max_frame()`:

```
frame = (trim_len - 2 * margin - (n - 1) * gutter) / n
```

bounded by `(PAGE_W - trim_len) / 2 + margin >= SAFE`, which on A4 landscape with
a 3 mm mat margin caps the trim length at 292 mm. Current values: trim 282 × 100,
3 × 70 mm front / 4 × 66 mm back; at that trim length the largest frame would be
88.00 mm at n=3 and 66.00 mm at n=4.

## `src/`

Pristine, mark-free copies of 02, 03, 04, 05, 06 and 09. Do not edit by hand, and
if a source sheet is ever regenerated, refresh its copy here first. 06 is the
exception: `build_06_source.py` writes it from the twelve PNGs, so it is an
output, not a relic. `_prev/` holds the sheet it replaced.

## How to rerun everything

```
python3 scripts/curriculum/writing-shelf/build_flip_cards.py
python3 scripts/curriculum/writing-shelf/build_06_source.py
python3 scripts/curriculum/writing-shelf/build_cut_sheets.py
python3 scripts/curriculum/writing-shelf/add_cut_guides.py
python3 scripts/curriculum/writing-shelf/build_backup_object_cards.py
python3 scripts/curriculum/writing-shelf/build_13_story_starter_cards.py
python3 scripts/curriculum/writing-shelf/build_sound_frame_mat.py
```

Needs `reportlab`, `pypdf`, `pikepdf`, `pdfplumber`, `Pillow`. All deterministic
and idempotent — the re-imposers always read `src/`, never the published file.
