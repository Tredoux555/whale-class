# Handoff — Dark Phonics Writing Shelf, sheets 25 / 26 / 27

2026-09-19. Three new Tray 5 printables: digraph work, blend work, sound book.
SHELF PRINT VERSION is now **12** (`public/dark-phonics-shelves.html`, and every
`/dark-phonics-shelf/v2/` href on it carries `?v=12`).

## What was built

| file | pages | bytes |
|---|---|---|
| `25-digraph-mats.pdf` | 5 | 1 424 846 |
| `25-digraph-mats-control.pdf` | 5 | 1 424 838 |
| `25-digraph-tabs.pdf` | 5 | 34 488 |
| `26-blend-mats.pdf` | 5 | 1 264 822 |
| `26-blend-mats-control.pdf` | 5 | 1 265 085 |
| `26-blend-tabs.pdf` | 5 | 33 785 |
| `27-sound-book-print.pdf` | 20 | 2 517 183 |
| `27-sound-book-reading.pdf` | 40 | 2 532 270 (proofing only, in no count) |

Builders: `scripts/curriculum/writing-shelf/build_25_digraph_work.py` (the
ENGINE and the digraph config), `build_26_blend_work.py` (thirty lines: the
blend config, run through the same engine), `build_27_sound_book.py`, and
`update_shelf_index.py` (recomputes manifest + PRINT-GUIDE numbers).

## The rules that matter

* **The gap is `build_12.card_w()`**, called and never copied. A tab cut off the
  tab sheet fills the hole on the mat because both numbers come out of one
  function, and that fit is the control of error.
* **Mats and controls are never cut and never laminated.** No cut line is drawn
  on either file. Only the tab sheets carry `cutmarks.py`.
* **Art gate, two reasons.** `docs/picture-bank/photos` passes (sheet 23 vetted
  it; all 74 words used from it are one object on a plain ground).
  `phonics-images`' green1/green2/green3 and blue1/blue2/blue3 sets are STOCK
  SCENE PHOTOGRAPHY and are held back entire — `bath` is a face among daisies,
  `cook` a chef, `neck` two giraffes, `shed` a lake, `zoo` a gorilla, `band` a
  drum kit — with two named exceptions that do keep the rule, `clip` and
  `light`. Both skip lists print every run and are the artwork commission.
* **Nothing is invented.** A thin group is a SHORT page with empty trailing
  cells — no picture, no rule, no tick. Cells fill column by column.
* **Green tabs serve both sheets.** A blend word carrying a digraph (spoon,
  snow, broom, tree, truck, clock, brick, crown, flower, glue) leaves both gaps;
  the green tab is counted into `25-digraph-tabs.pdf` and the blend mats' caption
  says where it comes from. `26-blend-tabs.pdf` prints blue only.
* **Sheet 27 imports sheet 15's page machinery** — the same rule, tab, folio,
  logical page and saddle imposition. Its fore edge is halved (green digraphs
  top, blue blends bottom), not divided in three.

## Decisions taken without the owner

1. **Long and short `oo` are one sound on paper.** The tab is `oo` either way;
   two keys would print two identical tabs. Group 3 is `oo (long and short) · ow`.
2. **`shoe` is carried into group 5** as its one `oe` word with artwork (it also
   earns its place on group 1 as `sh`). Without it the `oe` column is empty.
3. **The adult foot line on a mat sits 8 mm up, not the canvas's 4 mm** — 4 mm is
   inside the 5.5 mm printer-safe margin.
4. **The rule breaks at the gap.** The approved canvas's rule segmentation is
   inconsistent between rows; the spec sentence ("exact tab-width gaps via
   `build_12.card_w`") was followed instead, and the control fills those gaps
   with the sound in green.
5. **The phonics-images blanket hold-back** (see above). It costs a lot of words
   and it is the single biggest open item.

## Open items

* **Artwork commission.** Run either builder to print the current list. The
  expensive gaps: `th` has one word (moth), `ea` has one (leaf), `sm`, `sk`,
  `sc`, `pr`, `bl` and final `nd` have NONE, and group 5 of sheet 25 is four
  cells of eighteen. Re-shoot in the picture-bank house style and both sheets
  grow with no code change.
* The **anchor list Tredoux named** (shrimp, crash, thrush, branch, splash,
  drink, stitch, brush, fresh, trash) has **no artwork at all** — not one of the
  ten. The anchors that actually print are the ten named above.
* Two sound-book pages print `st` (initial `st`, final `st`). Left as is: they
  are genuinely different work. Decide whether the page should say which.
* `update_shelf_index.py` does not touch `dark-phonics-shelves.html`; that page's
  `?v=` bump and its three prose tables are still by hand.
