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

### Second pass, same day: the tracing booklets had drifted too

Tredoux viewed `public/dark-phonics-materials/an-apple-for-ant/tracing-workbook.pdf`
and found it 24pp against the reader's 20pp, with the word list, cameo and
blanks all a leaf out of step. Cause: `build_trace_booklet()` had its own copy
of the body loop, and that copy still emitted a trace page for the **wordless
cameo spread**, so its body was 2×S pages where the reader's was 2×S−1. Both
tracing variants were affected. Fixed by deleting the duplicate loop: the body
now comes from `bb.story_pages(book, trace_text_page)` — the reader's own
function — with the trace-page painter passed in as a factory. `story_pages()`
is now documented as the single source of truth; do not re-implement it.

The 'I can write <word>!' celebration used to hang off `i == len(spreads)-1`,
which was the cameo spread; it now hangs off `bb.last_worded_index(book)`, the
last spread that actually gets a page.

**Not a bug, do not "fix" it without a decision:** word mode traces the book's
ONE hero word (`target_word()` from `book['new']`) on *every* spread, under that
spread's own narration. So an-apple-for-ant p6 reads "An" + traced **ant** where
the reader reads "An / ax." That is the format as designed on 2026-08-22, not a
duplicate spread or an off-by-one. If the traced word should instead follow the
spread (ax, anchor, astronaut…), that is a format change to `make_trace_page()`,
not a pagination fix.

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

**Tredoux reviewed the-sat and an-apple-for-ant and locked this format
(2026-08-26): keep the half-title, keep these page counts.** The 20-page
alternative (drop the half-title) is explicitly rejected.

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
- Second pass: for all 20 books the **reading, tracing and sentence-tracing
  page lists are byte-identical in structure** — same N, same page identities
  position by position. 40/40 tracing booklet-print files match the imposition
  table for their N. Rendered and eyeballed an-apple-for-ant and the-sat
  tracing sides 3-6.
- One verification gotcha worth keeping: a trace page draws its word as vector
  dot strokes, so `pdftotext` returns nothing for it and a naive classifier
  calls it BLANK. Distinguish by content-stream size — a true blank page is 42
  bytes, a trace page is ~18-21 KB.
- Sync: 160/160 files uploaded on the first pass, 100/100 tracing files on the
  second, both MD5-verified against fresh cache-busted downloads.

## Not built (unchanged from last pass)

`spat` (missing `tiles/BK4-p6.png`) and `snake-in-my-sock` (missing `bk1/*.png`)
— still blocked on absent art, still deliberately unpublished.

---

## ⚠️ Third pass, same day: the target book was `ant-on-my-apple` all along

**Read this before touching "the apple book" again.** Every earlier session in
this thread worked on **`an-apple-for-ant`** — a sat-cast letter book in
`scripts/curriculum/flashcards/books_def.py`. That is **not** the book Tredoux
was looking at.

The book on the Dark Phonics library page (`/montree/library/dark-phonics`,
lesson n=6, sound /a/) is **`ant-on-my-apple`**, "Ant on My Apple" — a
**picture-word pattern reader**, defined in a completely different place:

| | `an-apple-for-ant` (wrong book) | `ant-on-my-apple` (the real target) |
|---|---|---|
| definition | `scripts/curriculum/flashcards/books_def.py` | `scripts/curriculum/dark-phonics-storybooks/manifest.json` (text + art keys) + `build_a5_readers.py`'s `SPLITS`/`COVERS` (page splits, cover) |
| builder | `build_booklets.build()` | `build_a5_readers.py` → `scripts/curriculum/dark-phonics-readers/dpbuild.py` |
| tracing | `build_tracing_booklet.py` | `build_a5_tracing.py` (wraps `build_tracing_booklet`, `mode='word'`, `UNIFORM_TARGET['ant-on-my-apple'] = 'apple.'`) |
| library links | — | `lib/montree/dark-phonics/lessons.ts` `RAW` n=6 → `app/montree/library/dark-phonics/page.tsx` `printPdf()` pills |

Live URLs the page actually links:
`/dark-phonics-books/print/ant-on-my-apple-A5-{reading,booklet-print}.pdf` and
`/dark-phonics-materials/ant-on-my-apple/tracing-workbook.pdf`.

### The bug: the alligator picture was labelled "An anteater on my… apple."

`dpbuild.build()` was a **stale fork of the pagination**. Both this pass's and
the earlier passes' fix landed in `build_booklets.paginate()`, but `dpbuild.py`
never called it — it had its own copy, and that copy laid out

    cover · half-title · text · art · text · art · …          (16pp)

An EVEN two-page front matter puts every text page on an ODD folio, and a
folded saddle-stitch booklet faces (2,3), (4,5), (6,7)… — so **every picture
faced the NEXT spread's word**: p4 apple art opposite p5 "An ant…", p6 ant art
opposite p7 "An alligator…", p8 alligator art opposite p9 "An anteater…". The
art files themselves were all correctly named and correct (verified by
rendering all six PNGs and looking at them); nothing was wrong with the
manifest, the `SPLITS`, or the art. Only the page list.

The tracing workbook was already correct — commit `a242e80b8` moved
`build_trace_booklet()` onto `bb.story_pages()`/`bb.paginate()`. So since this
morning the reader (16pp, dpbuild's fork) and its own tracing workbook (20pp,
bb.paginate) disagreed on structure. They now agree.

### What changed — `scripts/curriculum/dark-phonics-readers/dpbuild.py` only

- `build()` no longer computes a page list. It calls
  `bb.paginate(bb.story_pages(book, lambda sp, i: make_text_page(sp)), …)` —
  the same single source of truth the sat-cast readers and both tracing
  variants use — passing dpbuild's own `make_text_page` as the painter factory
  and resolving `page_cover`/`page_back` from module globals at call time so
  `build_a5_readers.py`'s monkeypatches still win.
- `make_text_page()` now sizes narrative reveal words through
  `bb.reveal_size()` (uniform band) instead of its own `size=`-driven `fit()`.
  `style='drop'` recap/celebration chants keep their authored size, untouched.
- `PRINT_NOTE` via `bb.draw_print_note()` on sheet 1 of the booklet-print.

**This changes every book built through `dpbuild.py`** — all 27 pattern
storybooks in `dark-phonics-storybooks/manifest.json` plus the
`dark-phonics-readers` books. Only `ant-on-my-apple` was rebuilt and re-synced
this pass; the rest will pick up the new (correct) page order the next time
they are built, and their page counts will move the same way the table above
records for the sat-cast books. **Rebuild + re-sync them deliberately, in one
reviewed batch — do not assume the shipped files still match this source.**

### `ant-on-my-apple` after the fix — 20pp / 5 sheets / 10 A4 sides

    1 cover · 2 blank · 3 half-title
    4 "An apple."            | 5  apple art
    6 "An ant on my… apple." | 7  ant art
    8 "An alligator on my…"  | 9  alligator art
    10 "An anteater on my…"  | 11 anteater art
    12 "An ambulance on my…" | 13 ambulance art
    14 "Apple! Apple! Apple!"| 15 all-on-apple recap art
    16 WORDS IN THIS BOOK · 17-19 blanks · 20 back cover

Every text page on an even folio, its art on the odd folio facing it; no blanks
inside the story run; none stranded between the last story page and the back
cover; N a multiple of 4.

### Verification (not hashes)

- **Art identity was checked by looking at pixels, not filenames** — the trap
  earlier sessions fell into. All six source PNGs were rendered and viewed by
  eye (apple / ant / alligator / anteater / ambulance / all-four recap: every
  filename honest). Then each art page's embedded image XObject was extracted
  from the built PDF, downsampled and MD5'd against the same transform of the
  source PNGs, giving a hard page→file map: reading pp. 5,7,9,11,13,15 →
  p1-apple, p2-ant, p3-alligator, p4-anteater, p5-ambulance, p6-recap. Cross-
  checked against `pdftotext` per page: every animal named on the even page is
  the animal pictured on the odd page facing it.
- Imposition: all 10 A4 sides' left|right folios match the table derived from
  the code for N=20 (`20|1 2|19 18|3 4|17 16|5 6|15 14|7 8|13 12|9 10|11`);
  sides = N/2. Print note present on side 1 only, both files.
- All 10 booklet-print sides and the tracing sides rendered with `pdftoppm`
  and viewed by eye.
- Tracing workbook: same N, same page identities position-by-position as the
  reader; hero word "apple" traced on every spread under that spread's own
  narration; `book_word_xheight()` → `bb.reveal_size(['apple.'])` = **115pt**,
  x-height 0.496 × 115 = 20.12mm — the same figure the sat-cast books trace at,
  and the same size the reader prints "apple." at.
- Sync: 3/3 uploaded, MD5-verified against fresh cache-busted downloads of the
  exact URLs the library page links. **These PDFs are served from the Supabase
  `static-assets` bucket** (`/public/dark-phonics-books/` and
  `/public/dark-phonics-materials/` are gitignored and `.dockerignore`d;
  `next.config.ts` rewrites forward to the bucket proxy) — so the sync alone
  makes them live. **No git push or Railway deploy is required for the PDFs.**
