# Dark Phonics sat-cast — page order, padding, cameo spread, uniform reveal size

**2026-08-26 · Opus (Cowork).** Follows `HANDOFF_SATCAST_UNIFORMITY_AUG26.md`,
which closed the last-word-bold question and left the font-size decision open.
Tredoux made the calls; this pass implemented them, rebuilt all 20 buildable
sat-cast slugs (160 files) and re-synced. **Source changed this time** — the
previous pass changed no code.

## Root cause

Four separate defects, all in `scripts/curriculum/flashcards/`, none of which
earlier sessions caught because **they only ever verified that the shipped file
matched the source** — never that the source itself produced a correct booklet.
Hash-vs-source is not a correctness check.

1. **Page-list divergence.** `build_booklets.py` laid out
   `cover · WORDS · half-title · spreads · back`, while
   `scripts/curriculum/dark-phonics-readers/dpbuild.py` laid out
   `cover · half-title · spreads · WORDS · back`. Two readers in the same
   product, two different page orders.
2. **Stranded padding.** `build_booklets.py` appended the multiple-of-4 padding
   blanks at the END of the list, so the-pit / the-sad / the-cot / the-kit each
   put two blank pages between the last story spread and the back cover — the
   gag landed, then two dead pages. `dpbuild.py` already did this right
   ("never strand blanks after the gag": split them front/back).
3. **Art-only spread rendered as a numbered blank.** A spread with neither
   `nar` nor `text` (the deliberate "wordless potato cameo" the art manifest
   specifies for an-apple-for-ant p8, sit-sit-sit p9, snake-in-my-sock p8,
   spat p9) still emitted an empty *text* page that drew a folio number — so
   the cameo art faced a numbered blank. an-apple-for-ant page 18 was that
   blank.
4. **Ad hoc reveal-word sizes.** Every spread in `books_def.py` carried a
   hand-picked `size=` between 44 and 92, set independently over many editing
   sessions. the-pit printed its shout word at roughly HALF the size of
   the-dig's, for no reason other than edit history.

## What changed

`scripts/curriculum/flashcards/build_booklets.py`
- **`reveal_size(c, lines)`** — one function, one band, for every narrative
  reveal word in every book. Starts at `REVEAL_MAX = 92` (in `books_def.py`'s
  own `size=` units; `REVEAL_SCALE = 1.25` converts to points, exactly as
  `make_text_page()` always did, so a word previously authored at 92 renders
  identically) and shrinks only as far as needed to fit the text page's usable
  width `PW - 2*M` (120.5mm). `REVEAL_FLOOR = 60` is the intended bottom of the
  band. Result: **every 3-6 letter word in every book now renders at 115pt.**
  Only genuinely long words come down — "toothbrush!" 63pt, "astronaut." 70pt,
  "anchor." 96pt, "potato!" 99pt. Two of those sit below the 60 floor because
  they physically cannot fit the page at 60; overflowing the trim is never the
  better failure, and the floor is documented as soft for that reason.
  Per-spread `size=` is now **ignored** on narrative pages. `style='drop'`
  (recap/celebration chants) and `style='whisper'` keep their own authored
  treatment, untouched. The last-word-bold rule is untouched — it was correct.
- **`story_pages(book)`** — an art-only spread now renders as ONE genuine
  full-page picture instead of a numbered blank + art.
- **`paginate(...)`** — new page order `cover · [blank] · half-title · story ·
  WORDS IN THIS BOOK · [blanks] · back cover`, with dpbuild's front/back blank
  split ported in, so padding never sits between the last story page and the
  back cover.
- **`PRINT_NOTE` / `draw_print_note()`** — one line, 5.5pt light grey, bottom-
  left of **sheet 1 only** of every booklet-print PDF:
  `Duplex · flip on SHORT edge · nest sheets, sheet 1 outside`.
  Sheet 1's left panel is always the back cover (no folio there), so it never
  collides with anything.

`scripts/curriculum/flashcards/build_tracing_booklet.py`
- `book_word_xheight()` now sizes the traced guide word through
  `bb.reveal_size()` — the same function the reader uses — instead of copying
  the book's most common authored `size=`. All 20 books now trace at a 20.12mm
  x-height, matching their 115pt reveal word exactly. (the-pit's traced word
  was previously about half that.)
- Same `bb.paginate()` page order/padding and the same print note.

Deleted (approved): `public/satpin-books/print/an-apple-for-ant-A5-reading.pdf`
and `-A5-booklet-print.pdf` — stale Aug-10 duplicates of the live
`dark-phonics-books/print/` pair.

## ⚠️ The one consequence Tredoux should look at: page counts

Moving the word list to the back **costs a leaf on some books**, and this is
unavoidable, not a bug. Folded, a saddle-stitched booklet faces pages (2,3),
(4,5), (6,7)… so a spread's text page must land on an EVEN page for its own
art page to sit opposite it. The old layout got that for free because the word
list was page 2 — three pages of front matter. With the word list at the back,
front matter is two pages, which flips the parity and would make every picture
face the NEXT spread's word. `paginate()` fixes it with one blank between the
cover and the half-title (classic book typography anyway), which pushes the
total up.

| | before | after |
|---|---|---|
| the-sat, the-pat, the-nap, the-mat, the-dig, the-dog, the-egg, the-mud, the-rat, the-hot, the-bug | 20pp / 5 sheets | **24pp / 6 sheets** |
| the-spat, the-tall | 16pp / 4 sheets | **20pp / 5 sheets** |
| the-pit, the-sad, the-cot, the-kit, sit-sit-sit | 24pp | 24pp (unchanged, and the 2 stranded blanks are gone) |
| an-apple-for-ant, nap-ant-nap | 20pp | 20pp (unchanged) |

**If the extra sheet is unacceptable,** the only 20-page layout that keeps the
word list at the back and keeps text facing art is to drop the half-title page
entirely (`cover · story · words · [blank] · back`) — a one-line change in
`paginate()`. That was not done, because the half-title was named as part of
the requested page list.

## Verification (before sync, not hashes)

- `pdftotext` + `pypdf` image-XObject inspection of all 20 reading PDFs: page
  list is `cover · blank · half-title · story · words · [blanks] · back` for
  every book; every N a multiple of 4; **zero blanks inside the story run**;
  **zero blanks between the last story page and the back cover**; every story
  text page on an even folio and its art page on the odd folio facing it.
  an-apple-for-ant page 18 is the potato cameo ART (confirmed visually), not a
  blank. sit-sit-sit page 20 likewise.
- `pdftotext -bbox` folio extraction on all **60** booklet-print PDFs (reading,
  tracing, sentence-tracing): every side's left|right page identity matches the
  imposition table derived from the code for that book's N; sheet count is
  always N/2. the-dig at N=24 gives `24|1 2|23 22|3 4|21 20|5 6|19 18|7 …` —
  the same shape the earlier diagnosis confirmed at N=20. **0 failures.**
- `pdftoppm` renders viewed by eye: an-apple-for-ant p4/p18, the-pit p4,
  the-tall p8 ("toothbrush!" fits with clear margins), the-dog p4, the-dig
  sheet 1 (print note reads correctly, small and grey), the-pit/the-dig
  tracing p4 (traced words now visibly identical in size).
- Sync: 160/160 files uploaded, then MD5-verified against fresh cache-busted
  downloads.

## Not built (unchanged from last pass)

`spat` (missing `tiles/BK4-p6.png`) and `snake-in-my-sock` (missing `bk1/*.png`)
— still blocked on absent art, still deliberately unpublished.
