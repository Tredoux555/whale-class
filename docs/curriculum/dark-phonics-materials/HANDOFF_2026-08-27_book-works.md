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
