# Dark Phonics books — the whole Aug 26 saga, handed forward

**2026-08-26 · Sonnet (Cowork), writing up five same-day Opus/Sonnet passes
for the next session.** Read this before touching any Dark Phonics book
build pipeline. It supersedes nothing in `HANDOFF_SATCAST_PAGE_ORDER_AUG26.md`
— still accurate and worth reading for full detail — this doc is the
consolidated map of what happened, why, and what's still open. (An earlier
same-day doc, `HANDOFF_SATCAST_UNIFORMITY_AUG26.md`, has been folded in here
and removed — its content lives in this file now.)

## The short version

Roughly seven earlier sessions shipped Dark Phonics book "fixes" that looked
clean and were not. Today's five passes found and fixed the real defects,
rebuilt every affected book, and re-synced. Nothing here needs a git push or
Railway deploy to go live — the PDFs are static files served from a Supabase
bucket — but the **code changes** that produced them do need pushing, and
that's this session's last step.

## Root cause: why ~7 sessions in a row shipped it "fixed" and it wasn't

Three separate reasons, compounding:

1. **Three drifted copies of the same pagination logic.**
   `scripts/curriculum/flashcards/build_booklets.py` (the sat-cast letter-book
   reader), `scripts/curriculum/flashcards/build_tracing_booklet.py` (its
   tracing companion), and `scripts/curriculum/dark-phonics-readers/dpbuild.py`
   (the picture-word pattern-book reader) each carried their **own** copy of
   "lay out the page list." They drifted out of sync with each other over
   many editing sessions, and no single function was ever the source of truth.
2. **Verification checked the wrong thing.** Every prior pass confirmed the
   *shipped file matched the source* (hash comparison, or file size/HTTP
   headers) — never that *the source itself produced a correct booklet*
   (correct page order, correct facing pairs, no stranded blanks). A byte-
   perfect sync of a wrongly-paginated PDF still hashes clean.
3. **Wrong book, for a while.** Every early-Aug session working "the apple
   book" edited `an-apple-for-ant` in `books_def.py` — a sat-cast letter book.
   The book Tredoux actually uses for lesson n=6 (sound /a/), linked from the
   Dark Phonics library page, is `ant-on-my-apple` — a **picture-word**
   pattern reader defined in a completely different file
   (`scripts/curriculum/dark-phonics-storybooks/manifest.json` +
   `build_a5_readers.py`'s `SPLITS`/`COVERS`). `an-apple-for-ant` is real and
   currently correct, but it is not linked from the library page and was
   never the book anyone was looking at.

## What changed, commit by commit

All five commits are from 2026-08-26, in order:

1. **`cb37fbbdf`** — *"Dark Phonics sat-cast: word list to the back, no
   stranded blanks, one reveal-word size band."* First code change (the
   earlier same-day pass that first confirmed the bold-word rule changed no
   code — it only rebuilt+resynced against already-correct source). Fixed in
   `build_booklets.py`: page order (word list moved from page 2 to the back,
   matching `dpbuild.py`), the padding-blanks-stranded-after-the-gag bug, the
   wordless-cameo-spread-rendering-as-a-numbered-blank bug, and replaced every
   book's ad hoc per-spread `size=` with one shared `reveal_size()` band
   (`REVEAL_MAX=92`, `REVEAL_FLOOR=60`, `REVEAL_SCALE=1.25`, all in
   `books_def.py`'s own size units). Rebuilt + re-synced all 20 buildable
   sat-cast books (160 files).
2. **`a242e80b8`** — *"Dark Phonics: tracing booklets share the reader's
   page-list builder."* `build_tracing_booklet.py` had its own duplicate body
   loop that still emitted a trace page for the wordless cameo spread,
   producing a 24pp tracing workbook against the reader's 20pp for
   `an-apple-for-ant`. Deleted the duplicate loop; `build_trace_booklet()` now
   calls `bb.story_pages(book, trace_text_page)` — the reader's own function,
   with the trace-page painter passed in as a factory. `story_pages()` /
   `is_wordless_spread()` / `last_worded_index()` were split out in
   `build_booklets.py` to make this possible.
3. **`ad19271ff`** — *"Dark Phonics pattern readers: fix facing pairs
   (alligator art was labelled 'anteater')."* This is where the
   `ant-on-my-apple` bug actually got fixed. `dpbuild.py`'s `build()` had its
   own stale fork of the page-list logic (`cover · half-title · text · art ·
   …`, an even 2-page front matter that puts every text page on an ODD folio)
   — never updated when `cb37fbbdf` fixed the sat-cast books. Folded, a
   saddle-stitched booklet faces (2,3), (4,5), (6,7)…, so with an even front
   matter every picture faced the **next** spread's word: the alligator art
   sat opposite "An anteater on my… apple." `dpbuild.build()` now delegates
   to `bb.paginate(bb.story_pages(...))`, the same single source of truth.
   Only `ant-on-my-apple` was rebuilt in this commit; the fix applies to every
   book built through `dpbuild.py` (all 29 live pattern storybooks).
4. **`5f5c5d995`** — *"Dark Phonics: rebuild + re-sync the whole picture-word
   series on the fixed page list."* Rebuilt, verified and re-synced all 29
   live pattern storybooks (manifest holds 30; `pig-ate-a-pineapple` is
   `retired: true`) plus their 29 tracing workbooks — 87 files, layout only,
   no story text or art mapping touched. Also corrected stale prose: the
   series is 29 live books, not "27" (`build_a5_readers.py`'s docstring and
   `lessons.ts` still say 27 — cosmetic, not fixed, low priority).
5. **`cfd07150b`** — *"Dark Phonics: hero-word tracing is now the default
   across the picture-word series."* `build_a5_tracing.py`'s `hero_word(slug)`
   now derives each book's traced word from its own `SPLITS` (needs a `nar` +
   single-string `text`, no per-spread `style`) instead of a hand-kept
   `UNIFORM_TARGET` dict, which is now empty by design. 27 of 29 books trace
   their one hero word; `oh-no-goat` and `oh-no-lion` keep whole-sentence
   tracing because their reveal word genuinely changes per spread (no single
   hero word exists).

Two of the day's five passes (the "third pass" fixing `ant-on-my-apple`
itself, and this write-up) landed in the two prior handoff docs — see those
for the full page-by-page before/after tables and every verification command
run.

## The locked standard — every future Dark Phonics book follows this

- Every narrative reveal page: only the literal **last word** of the sentence
  is big/bold (the shout); everything before it is small italic (`nar`).
  Never a full bold phrase.
- `reveal_size()` — one shared size band, `REVEAL_MAX=92` (books_def.py size
  units) shrunk only as far as needed to fit the page's usable width (120.5mm
  at a 92→115pt effective ceiling). Per-spread `size=` is ignored on
  narrative pages.
- Page list: **cover · blank · half-title · story (text page even folio, art
  page odd folio, facing) · WORDS IN THIS BOOK · [blanks] · back cover.**
  N is always a multiple of 4. No blanks inside the story run; padding blanks
  go inside-front (before half-title) and inside-back (after the word list),
  never stranded between the last story page and the back cover.
- A spread with neither `nar` nor `text` (a deliberate wordless cameo) draws
  as ONE full-page picture — no numbered blank text page opposite it.
- `style='drop'` (recap/celebration chants) and `style='whisper'` pages keep
  their own authored treatment — untouched by the uniform reveal band.
- Sheet 1 of every booklet-print PDF carries one small grey print note:
  `Duplex · flip on SHORT edge · nest sheets, sheet 1 outside`.
- Tracing workbook = identical page list to the reader, hero word traced at
  the reader's own reveal size (`hero_word(slug)` for picture-word books;
  `target_word()` from `book['new']` for sat-cast books). Books with no
  single hero word (`oh-no-goat`, `oh-no-lion` — the reveal word changes
  per spread) keep whole-sentence tracing instead.

## How verification is actually done (don't skip steps)

Hashing the shipped file against the source is necessary but **not
sufficient** — it only proves sync, not correctness. The real check, run on
every book before syncing:

1. **Page-list check** — `pdftotext` + `pypdf` image-XObject inspection:
   confirm the page order matches the locked standard above, N is a multiple
   of 4, zero blanks inside the story run, zero blanks stranded after the
   last story page.
2. **Facing-pair check** — every story text page lands on an even folio, its
   art page on the odd folio facing it. Asserted per spread, not sampled.
3. **Art identity by pixel hash** — extract each embedded image XObject from
   the built PDF, downsample (e.g. 256×256) and MD5 it against the same
   transform of the source PNG, then assert it matches the manifest's own art
   key for that spread. This is the step that catches a mislabeled or
   misplaced image that a filename-only check would miss — it's exactly how
   the `ant-on-my-apple` alligator/anteater swap was confirmed and then
   confirmed fixed.
4. **Imposition table** — for every booklet-print PDF, each A4 side's
   left|right folios must match the table derived from the code for that
   book's N (`(N-k, k+1)` alternating, sheets = N/2). Print note present on
   sheet 1 only, absent everywhere else.
5. **Render-and-look** — `pdftoppm` a sample of pages/sheets per book and
   view them by eye. Hashes and folio math don't catch an over-large reveal
   word overflowing the trim, or a gag that just doesn't read — look at the
   actual page.
6. **Only after all of the above passes**, sync with
   `node scripts/curriculum/publish-static-materials.mjs <files>` and
   MD5-verify every uploaded file against a fresh cache-busted download of
   its live URL.

## Two false alarms worth knowing about (don't re-chase these)

Two "still wrong" reports during this saga turned out not to be new bugs —
worth keeping in mind before assuming a fresh screenshot means a fresh bug:

1. **Chrome's built-in PDF viewer does not re-fetch an already-open tab.** A
   viewer tab showing a stale page after a fix had already shipped was not
   evidence of a bug — Chrome loads a PDF once per tab and won't re-fetch it
   as you page through, even with a `?v=` cache-busting query param on the
   URL. A fresh cache-busted `curl` + hash of the same URL, at the same
   moment, was clean. Always close and reopen the tab (or hard-reload)
   before trusting a "still broken" screenshot.
2. **A HEIC photo of a printed page can be from an old draft, not the current
   file.** A printed page showing a whole bold phrase (predating the
   last-word-only rule) was a paper printout from an older draft of
   `an-apple-for-ant`, not evidence the live PDF was still wrong — the actual
   current PDF matched `books_def.py` exactly, checked page-by-page.

## Open items for the next session

- **Versioned PDF links to defeat the 24h cache.** The proxy route
  (`app/api/montree/media/proxy/[...path]/route.ts`) sets
  `Cache-Control: public, max-age=86400, ...` on every PDF it serves. A
  freshly-synced file is correct in the bucket immediately, but a browser (or
  Tredoux's own eyes on an old tab) can keep serving the stale cached copy
  for up to 24 hours. No `?v=` cache-buster is wired into the library page's
  PDF links today. Worth adding a version query param (bumped per rebuild) so
  Tredoux never has to remember to hard-reload before trusting a screenshot.
- **`ant-on-my-apple` has 3 trailing blank leaves** (pages 17-19 of its 20,
  between the word list and the back cover) — a direct, accepted consequence
  of the locked page-order standard (front matter must stay odd-length for
  facing parity; N must round up to a multiple of 4). Not a bug, but worth
  knowing if anyone flips through the printed booklet and wonders about the
  blank pages near the end.
- **27 of the 29 built picture-word books are correct at their bucket URLs
  but unlinked from the library page.** They were retired from
  `app/montree/library/dark-phonics/page.tsx` / `lib/montree/dark-phonics/
  lessons.ts` on 2026-08-03 (assets untouched, per that commit's comment) —
  nothing about today's fixes changes that. Only `snake-in-my-sock` (n=5) and
  `ant-on-my-apple` (n=6) are currently linked from `books[]`. The other 27
  are correctly built, correctly paginated, correctly synced, and simply
  waiting at their `dark-phonics-books/print/<slug>-A5-*.pdf` /
  `dark-phonics-materials/<slug>/tracing-workbook.pdf` URLs if Tredoux ever
  wants to re-link them.
- **Stale "27 books" prose.** `build_a5_readers.py`'s docstring and
  `lessons.ts`'s comments both still say "27 pattern storybooks" — the
  manifest actually holds 30 (29 live, `pig-ate-a-pineapple` retired).
  Cosmetic only, not corrected this pass.
- `spat` (missing `tiles/BK4-p6.png`) and the sat-cast variant of
  `snake-in-my-sock` (missing `bk1/*.png`) remain unbuilt — deliberately, per
  Tredoux ("Pat is better," re: spat). The picture-word `snake-in-my-sock`
  (n=5, the one actually linked) is a different book entirely and IS built
  and correct.

## Operational notes (still true, still easy to forget)

- Git push / network / `.env.local` credentials on the Mac → **Desktop
  Commander only**, never the Cowork device bridge (`device_bash` has no
  outbound network).
- `export MONTREE_CANVAS_FONTS="$(pwd)/canvas-fonts/"` before running
  `build_booklets.py` directly (its default font path is cloud-container-only);
  `build_tracing_booklet.py` and the picture-word builders already default
  correctly from the repo's own `scripts/curriculum/flashcards/canvas-fonts/`.
- The PDFs and covers under `public/dark-phonics-books/` and `public/
  dark-phonics-materials/` are gitignored and `.dockerignore`d — they are
  never part of a git commit or a Railway deploy. Syncing them to the
  Supabase `static-assets` bucket via `publish-static-materials.mjs` is what
  makes them live; no other step is required.
- Full reference on the underlying mechanics — page-list rules, the
  three-file drift, verification method, per-book before/after page counts —
  lives in `docs/handoffs/HANDOFF_SATCAST_PAGE_ORDER_AUG26.md` (the full
  five-pass fix, including the `ant-on-my-apple` wrong-book discovery). Read
  it if you need more detail than this summary carries.
