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
