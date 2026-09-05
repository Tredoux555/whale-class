# Writing Shelf GENERATOR — same works, your own words and pictures

**2026-09-06.** An ADD-ON to the Dark Phonics Writing Shelf, built overnight.

The eleven printables in `public/dark-phonics-shelf/v2/` and their Python
builders in `scripts/curriculum/writing-shelf/` are **untouched and remain
canonical**. Nothing in this session regenerated a PDF. What is new is a way to
make the *same works* again with different words or different pictures, on the
same locked print rules — Rule A "cut once", printed = finished − 20 mm,
short-edge duplex (CLAUDE.md, "WRITING SHELF PRINT RULES — LOCKED", and
`HANDOFF_SHELF_PRINT_FIX_2026-09-05.md` §8).

---

## 1 · What it is

`/montree/library/tools/writing-shelf-generator`, a card on
`/montree/library/tools`. Three tabs, one per work:

| tab | the work | sheet it mirrors |
|---|---|---|
| **Sound-frame mat** | the letter sorting mat, "the first work" | 01 |
| **Chain cards** | picture front, five-line chain back | 02 |
| **Dictation photo cards** | picture front, one big word back | 03 |

Each tab has: editable words (and, on the chain tab, the five chain lines per
card), a picture per card from the photo bank, a live front/back preview at the
true page aspect, the duplex calibration card, **Reset to shelf defaults**, and
three print buttons — front+back as one duplex job, front only, back only. The
mat tab also has A4 / A3.

The page is **hardcoded English**, the sanctioned SATPIN / Dark Phonics
exception, stated in a comment at the top of the file. It does not touch
`lib/montree/i18n/*` — a new key there without every translation trips the
strict pre-commit drift check. The tools-page card is rendered outside the
i18n-keyed `TOOLS` array for the same reason.

Pictures come from the photo bank via `resolvePhotoBankImages()` (label → URL),
with each card's default pre-selected where the bank has a matching label. The
static `docs/picture-bank/photos/<word>/<word>.jpg` tree is NOT served by the
app and is deliberately not used. A word the bank has nothing for shows a clear
amber **"no photo"** placeholder in the preview and prints the word only — it
does not silently print an empty card.

## 2 · Files

New:

- `lib/montree/print/duplex-calibration.ts` — `clampDuplexOffset`,
  `backPageTransform`, `useDuplexCalibration`, `DEFAULT_DUPLEX_CALIBRATION_STORAGE_KEY`
- `lib/montree/print/calibration-sheet.ts` — the duplex test sheet
- `lib/montree/print/fonts.ts` — `PRINT_FONT_STACK` and `andikaFontFaceCss()`
- `lib/montree/print/print-window.ts` — `printHtmlDocument()`, the house
  window.open + document.write + print() pipeline in one place
- `components/montree/print/DuplexCalibration.tsx` — the shared 🎯 card
- `lib/montree/writing-shelf/generator/{cut-guides,page-shell,sound-frame-mat,flip-cards,defaults,index}.ts`
- `app/montree/library/tools/writing-shelf-generator/page.tsx`
- `tests/writing-shelf-generator.test.ts`
- `scripts/curriculum/writing-shelf/generator-samples.mjs`, `tsconfig.wsgen.json`
- this file

Edited:

- `app/montree/library/tools/page.tsx` — the tool card
- `public/dark-phonics-shelf/v2/PRINT-GUIDE.html` — generator pointer, and the
  two stale sentences below
- `public/dark-phonics-shelves.html` — generator pointer on the `#print` note
- `CLAUDE.md` — a five-line pointer under the locked print-rules block

Also present but disposable: `tsconfig.wsgen-check.tmp.json` (the scoped tsc
this session ran — the full-repo `tsc -p tsconfig.json` runs the compiler out of
memory on this machine, which is why the repo is full of `tsconfig.*.tmp.json`).

## 3 · How the duplex gizmo is shared

Lifted from `app/montree/library/tools/phonics-fast/bingo/page.tsx` — same
clamp (±3 mm, snapped to 0.5), same slider pair, same reset, same
read-then-write hydration guard, and the guard is still deliberately **state,
not a ref**, for the reason spelled out in the bingo file: within one React
effect flush a ref is already visible to the write effect and would not block
the premature write.

Two things changed on purpose:

1. **A new global key, `montree.print.duplexCalibration.v1`.** A duplex offset
   is a property of the *printer*, not of a tool, so one calibration now serves
   every duplex work. The bingo page is **not modified** and keeps its old
   page-scoped key `montree.phonicsFast.callingCards.duplexCalibration.v1`; it
   can migrate later by calling `useDuplexCalibration(thatKey)`, or by dropping
   the key argument once the owner is happy to recalibrate once.
2. **`backPageTransform(x, y, mirror)` takes the mirrored axis.** The sliders
   always mean the same thing — +X moves the back content RIGHT, +Y moves it
   DOWN, as seen with the front side up — and are never negated in state or in
   storage. The negation happens at the single point of use, and *which* axis is
   negated depends on the flip:
   - `'vertical'` (top/bottom swap): SHORT-edge flip of a **portrait** sheet —
     the flip cards. Y is negated.
   - `'horizontal'` (left/right swap): SHORT-edge flip of a **landscape** sheet
     — the mat. And long-edge flip of a portrait sheet, which is bingo's case,
     where the same negation is hard-coded today. X is negated.

   Bingo negated X because its flip is long-edge portrait. Copying that blindly
   onto a short-edge portrait sheet would have nudged the wrong way; hence the
   parameter, and hence the unit test that pins both signs.

**Calibration test sheet.** The card carries a "Print calibration test sheet"
button: one duplex page with a crosshair, a ring and a 1 mm ruler at the exact
page centre — the fixed point of both flips — in black on the front and amber
on the back, with the six-step instruction printed on the sheet in plain
English. Hold it to the light, read the gap off the ruler, type the two numbers
into the sliders, print it again to check.

`@page { margin: 0 }` remains the structural half of the fix and is in
`page-shell.ts` and in the calibration sheet, with the reason written next to
it: a non-zero @page margin resolves against the printable area, which is not
the same box on the two faces of a sheet on most printers.

## 4 · The A3 mat maths

A4 is the mat exactly as it ships and the numbers are asserted in the tests:
trim **282 × 100** centred, front **3 × 70.00 × 70.00** with 6 mm gutters
(30 mm mat margin), back **4 × 66.00 × 66.00** with 4 mm gutters (3 mm mat
margin, the floor). Three different margins, all inherited, all correct.

A3 was asked to be *neat*: **one border value everywhere**. So the A3 mat runs
in uniform-border mode — the single `border` (default **15 mm**) is the mat's
outer margin AND every gap between frames, and the frames are computed to fill
the trim exactly:

```
frameW = (trimW - (n + 1) * border) / n
frameH =  trimH - 2 * border
```

At the defaults — A3 landscape 420 × 297, trim **400 × 111** centred, border
**15 mm**:

| side | frames | size | every gap |
|---|---|---|---|
| Front (Tray 1) | 3 | **113.33 × 81.00 mm** | 15.00 mm |
| Back (Tray 3) | 4 | **81.25 × 81.00 mm** | 15.00 mm |

The back frames come out square to a quarter of a millimetre, which is what set
the 111 mm trim height. Both sides share the identical centred trim, so one cut
still serves both faces under the landscape short-edge flip's left↔right
mirror. Nearest ink to a paper edge is 10 + 15 = **25 mm**, far outside the
5.5 mm printer-safe margin; the Rule A cut lines themselves run edge to edge
with a black triangle at each end, on the 5.5 mm margin, as on every other
sheet. The tool prints the computed frame size on screen, and any spec breach
(frames inside the safe margin, mat margin under 3 mm, trim off centre) is
listed in the UI as a plain-English warning rather than thrown.

## 5 · The duplex pairing, encoded once

`flip-cards.ts` is the only place the pairing exists:

```
frontSlot(i)          = { col: i % cols, row: floor(i / cols) }   // row 0 = top
backSlot({col, row})  = { col, row: rows - 1 - row }              // mirror top-to-bottom
```

and the back card's content is drawn **rotated 180°** in the back page's own
frame, so it reads upright once the sheet is flipped. Read off the generated
sample, page by page, the default chain sheet lands: front `tap mop / peg bin`
at (25, 28.5) (105, 28.5) (25, 148.5) (105, 148.5); back `tap` at (25, 148.5) —
front top-left backed by back bottom-left, exactly as
`HANDOFF_SHELF_PRINT_FIX_2026-09-05.md` §3 requires. Sheet 2 of the same job
puts `nut rat` in the top row of the front and in the bottom row of the back,
which is the blank-quadrant proof from §3 reproduced by the new code.

## 6 · Verification

```
npx vitest run tests/writing-shelf-generator.test.ts     # 25 passed / 25
npx tsc --noEmit -p tsconfig.wsgen-check.tmp.json        # 0 errors
npx eslint <the new files>                               # 0 problems
node scripts/curriculum/writing-shelf/generator-samples.mjs
```

The samples script compiles just the pure library to CommonJS with the repo's
own `tsc` (there is no `tsx` or `ts-node` in this checkout) and writes the
default-config print HTML, with self-contained placeholder photo data-URIs, to
`_to_delete/ws-gen-samples/`:

- `sound-frame-mat-A4.html`, `sound-frame-mat-A3.html`
- `chain-cards-A4.html`, `dictation-photo-cards-A4.html`,
  `dictation-photo-cards-A4-no-photos.html`
- `duplex-calibration-sheet-A4.html`

Open any of them in a browser and print to PDF to see exactly what the tool
prints. The tests pin: the pairing map (and that it never changes the column,
which would be the long-edge geometry), the clamp, both signs of
`backPageTransform`, the A4 and A3 frame arithmetic, and that a 2 × 2 butted
block emits 3 + 3 full-page hairlines and 12 triangles per page.

## 6a · The printed face (audit fix)

The first cut rendered the card backs in a serif. Two causes, both fixed in
`lib/montree/print/fonts.ts` and used by every document this library builds:

* a print window opened by `window.open('')` has no base URL, so a relative
  font `src` never loads — the `@font-face` rules now carry **absolute**
  `/fonts/Andika-Regular.ttf` and `/fonts/Andika-Bold.ttf` urls, mirroring
  `lib/montree/english-curriculum/render/html-shell.ts` `fontFaceCss()`;
* the old house stack ended in the generic `cursive`, which falls through to a
  serif-ish face on a machine without Comic Sans. `PRINT_FONT_STACK` is now
  `'Andika', 'Fredoka', 'Nunito', Arial, sans-serif` — all sans.

**Andika** is the right face: it is what `build_flip_cards.py` and
`build_sound_frame_mat.py` register from `public/fonts/`, and it is the rounded
child-reading sans with the single-storey a and g. Every builder accepts a
`fontFaceCss` override; `generator-samples.mjs` passes the two TTFs inlined as
base64, so a sample opened straight off disk renders in the real face (files
grew from ~6–28 KB to ~72–94 KB, as expected).

The calibration sheet's ±5 ruler labels were removed — they collided with the
axis and each other exactly where the reading is taken. Only ±10 and ±15 are
numbered now, and the two label runs are put in different quadrants so they
cannot collide at all: the horizontal axis's numbers sit 3 mm BELOW their own
ticks, the vertical axis's numbers 4 mm to the LEFT of the axis, right-aligned
against it. All 30 one-millimetre ticks per axis stay, and step 4 now says "1 small tick = 1 mm, the longer ticks are every
5 mm".

## 7 · Prose fixed while in there

Two stale sentences the audit found in `PRINT-GUIDE.html`, both left over from
the pre-Rule-A guides:

- sheet 01: *"cut the single dotted rectangle"* → "cut along every grey line,
  edge to edge between the black triangles, to trim the mat out at 282 × 100 mm";
- sheet 04: *"the STOP / QUESTION / SHOUT labels stay on the waste between the
  crop marks"* → "…on the waste outside the outermost grey cut lines".

## 8 · Not done, not verified

* **Nothing has been printed on paper.** Every claim here is geometric or from
  the generated HTML. The one thing only paper can prove — front/back
  registration on the owner's actual printer — is exactly what the calibration
  test sheet exists for, and it is the first thing to run.
* **The optional works were not built**: `object-cards.ts` (sheet 11, single
  sided, 50 × 50 on a 5 × 3 grid) and `story-cards.ts` (sheet 06, 70 × 70,
  2 × 2). The word list sheet 11 needs is already in `defaults.ts` as
  `OBJECT_CARD_WORDS`, in the shipped order with its duplicate counts, so that
  module is mostly layout.
* **The bingo page was not migrated** to the shared gizmo — deliberately, to
  keep this change additive. See §3.
* **The chain content was read out of the PDF text layer**, not out of a
  generator (02's generator is still lost). The six chains and the twelve
  dictation words in `defaults.ts` match the shipped sheets and the pairing
  table of §3 of the print-fix handoff, and each chain was checked to move
  exactly one letter per line.
* **Type size on the card back is computed, not measured.** A single word lands
  at about a 20 mm cap height as asked; a five-line chain is clamped by the
  112 mm content height and comes out smaller than the re-imposed sheet's
  measured 57–59 mm width, because that sheet scaled a raster ink box and this
  one sizes type. It is within the 4 mm clearance either way.
* `tsconfig.wsgen-check.tmp.json` is throwaway. The full-repo `tsc` OOMs on this
  machine; that is pre-existing and not investigated here.
