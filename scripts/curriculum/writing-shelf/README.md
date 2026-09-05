# Writing Shelf print scripts

Generators and fixers for the ten classroom printables under
`public/dark-phonics-shelf/v2/`.

The original generator for the v2 set was lost — the PDFs were the only
artefacts. These scripts exist so that never costs a session again.

## `build_sound_frame_mat.py`

Rebuilds `01-sound-frame-mat.pdf` from scratch, both sides, at exact A4
landscape (297 × 210 mm). Every dimension is a named constant at the top of the
file; a `check()` runs on every build and refuses to write a sheet whose ticks
break the printer-safe margin or whose trim rectangle is not centred.

```
python3 scripts/curriculum/writing-shelf/build_sound_frame_mat.py
```

Current spec (2026-09-05):

| | frames | gutters | span |
|---|---|---|---|
| Side 1 · Tray 1 | 3 × 70 mm | 6 mm | 222 mm |
| Side 2 · Tray 3 | 4 × 66 mm | 4 mm | 276 mm |

Trim rectangle 282 × 100 mm, centred, **identical on both sides** — one cut
serves both faces after a short-edge flip. Ticks reach to 5.6 mm from the left
and right edges, inside the 5.5 mm printer-safe margin.

Type is Andika (`public/fonts/`). The v2 sheets were set in Atkinson
Hyperlegible, which reached them as a Google webfont; only 40-glyph subsets
survive inside the old PDF and there is no copy of the family in this repo.

## `build_backup_object_cards.py`

Builds `11-backup-object-cards.pdf` — a printed 50 × 50 mm stand-in for every
miniature the shelf asks for, 26 pieces of 16 objects, 15 per A4 landscape
sheet over 2 sheets.

```
python3 scripts/curriculum/writing-shelf/build_backup_object_cards.py
```

The object list and its per-object copy counts are the data block at the top of
the file and are the `#miniatures` table on `dark-phonics-shelves.html`, read
straight down; the layout constants sit under it. A `check()` runs on every
build and refuses a sheet whose ticks break the 5.5 mm printer-safe margin,
whose gutter is too narrow to hold two facing tick pairs, whose head or footer
sits on the grid, or whose footer overruns the bottom of the page.

Photographs come from `phonics-images/satpin-v2/cvc-photos/` (**gitignored** —
Mac only) and are downscaled to 600 px / JPEG q82 at build time, embedded once
per distinct word. Four objects — `sun`, `pot`, `pan`, `tin` — have no
photograph yet: their slots print as amber dashed outlines with the word on
them and no cut ticks. Prompts for the four are in
`MJ-PROMPTS-BACKUP-CARDS.md`; drop the winners into the photo folder and rerun,
and the slots fill themselves.

This is the one landscape card sheet in the set. Three columns of five 50 mm
cards fill an A4 portrait page with no room left for a footer, and the footer
is the only place the tray allocation is written down.

## `add_cut_guides.py`

Adds cut guides to the sheets whose generators are gone, as an **overlay**: it
reads a pristine copy from `src/`, draws marks with reportlab, merges with
pypdf, and writes the result into `public/dark-phonics-shelf/v2/`.

```
python3 scripts/curriculum/writing-shelf/add_cut_guides.py
```

Idempotent by construction — the input is always `src/`, never the published
file — so running it twice cannot double the marks. **If you ever regenerate a
source sheet, refresh its copy in `src/` first.**

Touches `02`, `03` (page-edge midpoint ticks + a centre cross; these are 2×2 A6
grids that tile A4 exactly, so no other position is safe) and `06` (page-edge
ticks on all three pages, plus the dotted card rectangles that pages 2 and 3
were missing). The per-sheet geometry table and the list of sheets deliberately
left alone, with reasons, are at the top of the script.

## `src/`

Pristine, mark-free copies of the sheets the overlay works on. Do not edit
these by hand and do not point the overlay anywhere else.

## Duplex

Both duplex sheets (`02`, `03`) are imposed for **short edge**, verified
2026-09-05 by reading every quadrant of every page. Short-edge flip of a
portrait sheet swaps top and bottom and leaves left and right alone, so front
top-left is backed by back *bottom*-left. The pairing table is in the docstring
of `add_cut_guides.py`.
