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
if a source sheet is ever regenerated, refresh its copy here first.

## How to rerun everything

```
python3 scripts/curriculum/writing-shelf/build_flip_cards.py
python3 scripts/curriculum/writing-shelf/build_cut_sheets.py
python3 scripts/curriculum/writing-shelf/add_cut_guides.py
python3 scripts/curriculum/writing-shelf/build_backup_object_cards.py
python3 scripts/curriculum/writing-shelf/build_sound_frame_mat.py
```

Needs `reportlab`, `pypdf`, `pikepdf`, `pdfplumber`, `Pillow`. All deterministic
and idempotent — the re-imposers always read `src/`, never the published file.
