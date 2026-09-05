# Dark Phonics — Book Works restore + guillotine layout standard — HANDOFF (2026-08-27)

Live site: montree.xyz/montree/library/dark-phonics
Repo: montree (Railway project "happy-flow", service "whale-class")
Current HEAD when this was written: `06f7c09bc`

---

## 1. The problem

The 4 "book works" PDFs per letter book/reader — Work 1 (picture match),
Work 2 (sentence & picture match), Work 3 (sentence builder, guided), Work 4
(sentence builder, free) — had been trimmed off the Dark Phonics library page
UI in commit `ee0127b3d` (22 Aug), part of a pass that pulled the Printables
row back down to the clean 6-pill ant-on-my-apple set. The files themselves
were never deleted, just unlinked. Tredoux found the kids actually need these
4 works for progression, so they're back.

---

## 2. What changed

### `eef800957` — restore the 4 pills

`app/montree/library/dark-phonics/page.tsx`, inside `BookPrintablePills`
(~line 397): re-added the 4 `Pill` links, gated on `book.works` (same flag
added back on 22 Aug, previously inert). All 30 works-flagged books/readers
in `lib/montree/dark-phonics/lessons.ts` now show them. The reader-only
inline pill block was left untouched — this only touches the book path.

PDFs are served straight from the Supabase `static-assets` bucket via the
`next.config.ts` rewrites (`/dark-phonics-books/:path*` →
`/api/montree/media/proxy/bucket/static-assets/dark-phonics-books/:path*`).
`public/dark-phonics-books/` and `public/dark-phonics-materials/` are both
gitignored — the built PDFs never go into a git commit or a Railway deploy;
what makes them live is the Supabase sync (§4 below).

### `06f7c09bc` — guillotine layout standard v3, all 30 books rebuilt

`scripts/curriculum/book-works/build_book_works.py` was rewritten to the
**"LAYOUT STANDARD (2026-08-27, approved)"** documented in its own docstring
and mirrored in §4 of `docs/curriculum/DARK_PHONICS_NEW_BOOK_PLAYBOOK.md`.
Modelled on the word-cards page of `build_tracing.py`. Locked — do not revert
to the old rounded/dashed-card-per-item layout:

1. **Base / working / control sheets** — solid thin rules (0.6pt), square
   corners, zero gap between cells: a plain shared-boundary table grid. Every
   slot is drawn full size and bordered. These sheets are never cut.
2. **Cut sheets** — the only lines are DASHED guillotine lines. Tabs carry no
   border of their own; you cut directly on the dashed line. Cut sheets reuse
   the base grid's row/column count so a cut tab always corresponds 1:1 to a
   slot.
3. **One continuous stroke per boundary** — each cut line is a single
   full-width/full-height stroke (`grid_lines`), never one rect per cell, so
   each boundary is exactly one straight guillotine cut.
4. **`TAB_GAP = 2mm`** — a cut tab must drop into its slot, so each cut-grid
   cell (`tab_grid`) is 2mm smaller on every side than the slot it fills
   (4mm narrower, 4mm shorter). The cut grid is centred on the sheet.
5. **Instruction line states the cut count** — cut sheets print "Cut on the
   dashed lines — N straight cuts.", `N = (n_rows + 1) + (n_cols + 1)`
   (`cut_note`).

Also fixed in this commit:

- `EASY_READERS_ART_ROOTS` pointed only at a Desktop folder that no longer
  exists on this Mac. Now a list, checked in order: the repo copy
  (`phonics-images/easy-readers/<slug>/pN.jpg`) first, the old Desktop path
  (`~/Desktop/English Curriculum 2026/Dark Phonics/Easy Readers`) kept only
  as a fallback for machines that still have it.
- Added `word_pad()` plus a 7pt font floor on word tabs (`sb_page`, sentence
  builder rows) so word text can never touch a cut line. `word_pad()` asks
  for the normal `CELL_PAD` where a cell has room, or 15% of the cell width
  (min 3mm) on narrow, word-dense grids — the old flat padding could bottom
  out with words crowding or crossing the dashed line. Worst case measured
  (the-cat-sat, 8-word-column sentence) still holds 2.45mm clearance at the
  7pt floor.

### Rebuild + publish

All 30 slugs (17 sat-cast letter books + ant-on-my-apple/snake-in-my-sock +
11 standalone Easy Readers) were rebuilt on the Mac — this has to happen on
the Mac, the letter-book art lives at absolute Mac paths, not in the repo.
Output copied into `public/dark-phonics-books/works/<slug>/` (4 PDFs ×
30 slugs = 120 files), then uploaded with:

```bash
node scripts/curriculum/publish-static-materials.mjs \
  --dir public/dark-phonics-books/works
```

120 files total. The Cowork device bridge dropped partway through the run;
re-ran the same command and it picked up the ~62 files that hadn't gone
through, rather than needing a from-scratch retry. Verified live in
production via `curl -I` — `Last-Modified` on the bucket URLs shows 27 Aug.

---

## 3. How to regenerate

### One book

```bash
export MONTREE_CANVAS_FONTS="$(pwd)/scripts/curriculum/flashcards/canvas-fonts/"
python3 scripts/curriculum/book-works/build_book_works.py <slug>
cp materials-out/book-works/<slug>/*.pdf public/dark-phonics-books/works/<slug>/
node scripts/curriculum/publish-static-materials.mjs \
  public/dark-phonics-books/works/<slug>/<slug>-work1-picture-match.pdf \
  public/dark-phonics-books/works/<slug>/<slug>-work2-sentence-picture-match.pdf \
  public/dark-phonics-books/works/<slug>/<slug>-work3-sentence-builder-guided.pdf \
  public/dark-phonics-books/works/<slug>/<slug>-work4-sentence-builder-free.pdf
```

Run from the repo root on the Mac (or via Desktop Commander) — the publish
step needs `.env.local` Supabase credentials and network, which the Cowork
device bridge doesn't have.

### All 30 books

```bash
export MONTREE_CANVAS_FONTS="$(pwd)/scripts/curriculum/flashcards/canvas-fonts/"
python3 scripts/curriculum/book-works/build_book_works.py \
  the-sat the-spat the-pit the-pat the-nap the-mat the-sad the-dig the-dog \
  the-cot the-kit the-egg the-mud the-rat the-hot the-bug the-tall \
  ant-on-my-apple snake-in-my-sock \
  mud-pup hen-in-bed fox-in-a-box cat-cot-cut the-bell-fell fish-and-chick \
  this-and-that jump-in-the-sand frog-and-crab big-splash the-cat-sat
# copy materials-out/book-works/<slug>/*.pdf into public/dark-phonics-books/works/<slug>/ for each slug
node scripts/curriculum/publish-static-materials.mjs \
  --dir public/dark-phonics-books/works
```

If the bridge drops mid-run, just re-run the same publish command — it only
re-sends files that didn't go through.

---

## 4. Open items

- **the-cat-sat, work3/4** — 8 word columns hits the 7pt font floor on
  sentence builder word tabs. It's within clearance (2.45mm) but tight —
  needs a layout decision: narrow the picture column, or wrap long
  sentences onto a second line. Not urgent, flagging for next pass.
- **`STORYBOOK_PRINT_VERSION`** (page.tsx, ~line 63) was **not** bumped —
  still `22`. Bump it by 1 if a cache-busting issue shows up on any book's
  Printables row (browsers/CDN keep serving the old file otherwise).
- Scratch preview files `_contact-v2.png` / `_contact-v3.png` left behind in
  `materials-out/book-works/the-sat/preview/` — safe to delete, not used by
  any script.
- The working tree has ~100 other dirty/untracked files unrelated to this
  session (other in-flight work) — left alone, not touched or committed.

---

## Commits, oldest to newest (main, pushed, deployed)

```
eef800957  Dark Phonics: restore 4 book-works pills for the-sat
06f7c09bc  Dark Phonics book works: guillotine layout standard v3, rebuilt all books
```

---

## 5. Addendum (2026-08-27, later same day) — cover bookplate + flashcard label fix

Two more changes landed after the book-works work above, on top of the same
dirty tree:

### Cover bookplate — "This book belongs to" standard

`page_cover()` (`build_booklets.py`) now draws a small ex-libris bookplate
in the bottom-left corner of every book cover — 56x25mm, sitting on the
14mm margin, red ownership dot re-centred on it at M+12.5mm, art floor
raised to M+28mm to clear it. See `draw_bookplate()` and the "COVER
STANDARD (2026-08-27, approved)" comment block right above it in
`build_booklets.py`, and the matching subsection in
`docs/curriculum/DARK_PHONICS_NEW_BOOK_PLAYBOOK.md`. This reaches every
family that calls `page_cover()`: sat-cast readers/booklet-prints, the two
pattern-book readers/booklet-prints (`ant-on-my-apple`,
`snake-in-my-sock`), and both tracing editions.

The old per-tracing-edition `written by ___` line (drawn in the same
bottom-left footprint) had to come out to avoid colliding with the plate.
It was removed from `build_tracing_booklet.py`
(`_written_by_line()` deleted, its two call sites dropped) — but
`build_a5_tracing.py` (the pattern-book tracing pipeline) also called
`tb._written_by_line(c)` and wasn't touched by the original edit; it threw
`AttributeError` on the first real build. Fixed the same way: call
dropped, `page_trace_cover()`'s docstring updated to say the bookplate is
now page_cover's own.

All 19 book families that use `page_cover()` were rebuilt on the Mac and
republished — 17 sat-cast (`the-sat` ... `the-tall`, including `the-tall`
itself, which `build_tracing_booklet.py --all` silently skips because
`is_sat_cast_letter_book()` excludes anything with "companion reader" in
its band; it was built explicitly by slug) plus `ant-on-my-apple` and
`snake-in-my-sock`. 57 PDFs (`-A5-reading.pdf`, `-A5-booklet-print.pdf`,
`tracing-workbook.pdf` x 19) published via
`node scripts/curriculum/publish-static-materials.mjs <57 explicit paths>`,
701MB, 57/57 uploaded, 0 failures. Reading/booklet-print page counts were
diffed against the live PDFs before the rebuild (fetched via curl) and are
unchanged for every book. `STORYBOOK_PRINT_VERSION` bumped 22 -> 23.

The 11 standalone Easy Readers (`mud-pup`, `hen-in-bed`, ... `the-cat-sat`)
do **not** use `page_cover()` and were not touched — see Pipeline C in
`HANDOFF_2026-08-22.md`, still blocked/not full storybooks as of this
writing. `dark-phonics-readers/dpbuild.py` and its `book07.py`...`book27.py`
/ `bookI.py` / `bookN.py` drivers do import `page_cover` and would pick up
the bookplate too, but their slugs (`dad-and-the-dog`, `sam-and-the-monkey`,
...) don't match any live `reader:`/`books:` slug in `lessons.ts` and their
default output dir is `/tmp/work/print` — nothing in the site publishes
them. Left alone; flagging as apparent dead code, not rebuilt.

Commit: `a795c1d90` — "Dark Phonics covers: This book belongs to bookplate
standard, all books rebuilt" (`build_booklets.py`, `build_tracing_booklet.py`,
`build_a5_tracing.py`, `DARK_PHONICS_NEW_BOOK_PLAYBOOK.md`, `page.tsx`
version bump).

### Photo bank flashcards: editable card labels

`b94da4436` — "Photo bank flashcards: editable card labels" — unrelated
UI change to `VocabularyFlashcards.tsx` (photo-bank flashcards, not Dark
Phonics), already committed and pushed before this addendum was written.
Noted here only per the day's session log; no further action needed.


---

## Addendum 2026-08-28 — designed filler pages replace the tail blanks

Saddle stitch pads every booklet to a multiple of 4. `paginate()` puts that
padding in two places: ONE fixed page after the cover (the inside front
cover — still conventionally blank) and 0-3 pages between WORDS IN THIS BOOK
and the back cover. Those tail pages printed as true blanks, so 20 of the 22
books in `books_def.py` threw away 1-3 A5 pages each. Tredoux approved
filling them with designed work.

**`build_booklets.py` — comment block `FILLER STANDARD (2026-08-27)`.**
Three painter factories, all data-driven from the book dict, plus an ordered
`FILLER_LADDER`; `filler_pages(book, k)` takes the first k painters that
return non-None and pads with `page_blank` if the ladder runs dry:

1. **MY WORDS** — handwriting work. The book's own `new` -> `decodable` ->
   `review` words (`oral_words` excluded: picture words a child shouts but
   cannot write; `heart` is a caption, not a list), grey Outfit-Regular model
   on the same baseline as the writing rule, dashed x-height guide above it.
   Short lists earn 2-3 rules per word with an 8mm group gap so the page
   fills; >7 words goes two-column, capped at 12.
2. **MY PICTURE** — prompt derived from the title (`The ___ Sat!` -> "Draw
   the ___ that sat!"; override per book with a `draw_prompt` key) over one
   large frame in `draw_bookplate()`'s exact language (0.6pt RULE_GREY at
   1.5mm radius over a 0.35pt HAIR_GREY inset hairline).
3. **I CAN READ** — every sentence verbatim as (Lora italic narration +
   Outfit Bold reveal word) behind a thin-ruled check box; block centred on
   its widest line, size and leading both give way as the list grows, and an
   over-long line word-wraps onto an indented continuation (the-tall's
   five-noun recap). Nothing truncates or oversets.

All three share the WORDS IN THIS BOOK header baseline and close on the red
dot. Adding a fourth filler = write a factory, append it to `FILLER_LADDER`.

**Ladder assignment (audited, all 22 books):** 12 get all three, 2 get
words+picture, 6 get words only, 2 have no tail slots. Page counts are
UNCHANGED for every book — `tail_blanks` is still computed from `body` alone,
before any filler exists; the slots were already there, just empty.

**Opt-in wiring.** `paginate(..., book=None)` — pass `book` to fill, omit to
keep true blanks. `build_booklets.build()` passes it. `dpbuild.py` and
`build_tracing_booklet.py` do NOT and are unchanged. The tracing builders do
share the same tail-blank padding and would take fillers with the same one
keyword (`bb.paginate(body, ..., book=book)` at `build_tracing_booklet.py`
~L506), but that was deliberately left alone this pass: MY WORDS duplicates
what a tracing workbook already is, and those PDFs were not in the approved
preview. Flagging, not doing.

**Heart glyph fix (same pass).** `books_def.py` writes its heart-word
captions as `'♥  heart word — a'`, but none of the four canvas-design faces
carries U+2665, so Lora printed a .notdef box on the WORDS IN THIS BOOK page
of all 20 books that have one. Rather than add a fifth font for one glyph,
`draw_heart()` draws it as a path in the caption's own red, sized off the
caption's point size; `draw_heart_line()` strips the character, sets the rest
in Lora italic and keeps heart + text centred as one unit.

**Rebuild + publish.** 20 books rebuilt (`_build_one.py <slug>`), reading +
booklet-print = 40 PDFs, published with
`node scripts/curriculum/publish-static-materials.mjs --dir
public/dark-phonics-books/print --since 2026-08-28` — 40/40 uploaded, 0
failures, 474.6MB (one transient `fetch failed` on the first file, succeeded
on retry). Verified live: `the-sat-A5-booklet-print.pdf`,
`the-sat-A5-reading.pdf`, `the-tall-A5-booklet-print.pdf` all return 200 with
a 2026-08-28 `Last-Modified` and content-lengths matching the local files.
`STORYBOOK_PRINT_VERSION` bumped 23 -> 24.

**Two books NOT rebuilt — pre-existing missing art, unrelated to this work:**
`snake-in-my-sock` references `bk1/p1.png`...`bk1/p8.png`, a directory that
does not exist anywhere in the repo (it is also unaffected: 0 tail slots, no
`heart` key, so its live PDFs are still correct). `spat` referenced
`tiles/BK4-p6.png` for its whisper spread; `tiles/` holds only `SAT-p*.png`.
The likely intended file was
`phonics-images/satpin-v2/books/spat/spat-p6-hushed-hover.png`, so at the
time of this handoff `the-spat` had never been published to
`public/dark-phonics-books/print/` at all.

**Update (2026-09-05, per AUDIT_2026-09-05_materials-uniformity.md):** this
is now fixed and stale as written above. `books_def.py` points `the-spat`'s
p6 spread at `phonics-images/satpin-v2/books/the-spat/spat-p6.png`, which
exists, and `the-spat` is fully built, published, and live (confirmed 200
on its print PDFs). Do not treat `the-spat` as broken or unpublished.

Commit: `6560961db` — "Dark Phonics booklets: filler pages replace tail
blanks (My Words / My Picture / I Can Read); fix heart glyph"
(`build_booklets.py`, `page.tsx` version bump).

## 6. Work 3 v2 (2026-09-05)

Velcro cut-out cards physically cover the printed changing-word slot on
Work 3 (the sentence builder), so the grey guide word underneath it was
useless — the child can't see it once the card is placed. v2 fixes this:
the changing-word slot is now printed **blank** (no grey guide text) and
the control of error moves to page 2, matching the layout already used on
Works 1, 2 and 4. The grid itself is unchanged. The cut-out strip on page 1
is unchanged.

v1 (`build_work3` / `<slug>-work3-sentence-builder-guided.pdf`) is kept
as-is, unmodified, as a possible future starting point for a magnetic-sheet
version of the material — not deleted, not overwritten.

New output file name: `<slug>-work3-sentence-builder-guided-v2.pdf`. Built
for all 30 dark-phonics book slugs and published to Supabase Storage
(`static-assets` bucket, same `dark-phonics-books/works/<slug>/` path
convention as every other book-works file — see the bucket path mapping
note at the top of `scripts/curriculum/publish-static-materials.mjs`).

The dark-phonics library page (`app/montree/library/dark-phonics/page.tsx`)
now shows a second pill next to the existing Work 3 pill: **"Work 3 v2"**,
linking to the new file. The original Work 3 pill is untouched.

Build script: `scripts/curriculum/book-works/build_book_works.py` —
`sb_page()` gained a `blank_changing` parameter (when true, the
changing-word slot renders with no grey guide fill) and a new
`build_work3_v2()` function reuses `build_work3()`'s grid/cut-out layout
with `blank_changing=True` and page 2 as a control-of-error page (the same
control-page renderer works 1/2/4 already call). `build_slug()` calls both
`build_work3()` and `build_work3_v2()` per slug, writing both PDFs
side-by-side. This is documented as rule 10 in the script's own module
docstring.
