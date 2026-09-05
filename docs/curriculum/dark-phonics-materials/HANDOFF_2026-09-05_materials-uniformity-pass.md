# Dark Phonics — Materials Uniformity Pass — HANDOFF (2026-09-05)

Live site: montree.xyz/montree/library/dark-phonics
Repo: montree (Railway project "happy-flow", service "whale-class")
Commits this session (oldest to newest): `70e238c6b`, `1d07ba213`

---

## 1. The problem

Two things landed today, back to back, on the same dirty-tree session:

1. **Work 3's velcro cards hide the control-of-error.** Work 3 (sentence
   builder, guided) prints the changing word as a grey guide UNDER a
   velcro-backed cut-out card — but the card physically covers the guide
   once placed, so the child can't see it. Works 1, 2 and 4 all solve this
   the same way (blank slot on the front sheet, control of error on the
   back/page 2); Work 3 was the one holdout still printing a visible guide
   the card would occlude.
2. **A full uniformity audit** of all 30 Dark Phonics slugs (17 sat-cast
   letter books, `ant-on-my-apple`, `snake-in-my-sock`, 11 standalone Easy
   Readers) across every material family — book works, A5 reading/
   booklet-print, tracing workbooks, paperwork packs, covers — turned up 6
   concrete findings, all resolved in this same session. See
   `AUDIT_2026-09-05_materials-uniformity.md` (same directory) for the full
   evidence-based report; this handoff covers what was fixed and how.

---

## 2. Work 3 v2 (commit `70e238c6b`)

The changing-word slot now prints **blank** on the front sheet (no grey
guide text), and the control of error moves to page 2 — matching the layout
already used on Works 1, 2 and 4. The grid and the page-1 cut-out strip are
unchanged.

New output file: `<slug>-work3-sentence-builder-guided-v2.pdf`, built and
published for all 30 slugs, alongside the original (v1 is kept, unmodified,
as a possible future starting point for a magnetic-sheet version — not
deleted or overwritten).

**Code:** `scripts/curriculum/book-works/build_book_works.py` —
`sb_page()` gained a `blank_changing` parameter; a new `build_work3_v2()`
reuses `build_work3()`'s grid/cut-out layout with `blank_changing=True` and
a control-of-error page 2 (the same control-page renderer Works 1/2/4
already call). `build_slug()` now calls both `build_work3()` and
`build_work3_v2()` per slug, writing both PDFs side-by-side. This is rule
10 in the script's own module docstring.

**Library page:** `app/montree/library/dark-phonics/page.tsx` shows a new
**"Work 3 v2"** pill next to the existing Work 3 pill, linking to the new
file. The original Work 3 pill is untouched.

---

## 3. Uniformity audit — findings and fixes (commit `1d07ba213`)

`AUDIT_2026-09-05_materials-uniformity.md` found 6 things worth fixing.
Tredoux ruled on each; here's what changed, decision then file:

### 3.1 Paperwork packs — 4 slugs shipped 3pp instead of 4pp

`the-spat`, `the-pit`, `ant-on-my-apple`, `snake-in-my-sock` had only 4
`yesno` items in their `dp-<slug>.json` source (needs 10 — 5 true/5 false —
to fill the second Yes/No page). **Tredoux wrote the missing 6 true/false
questions for each** (5T/5F, 10 total, matching the other 26 slugs).

Files: `scripts/curriculum/satpin-paperwork/letters/dp-the-spat.json`,
`dp-the-pit.json`, `dp-ant-on-my-apple.json`, `dp-snake-in-my-sock.json`.
Rebuilt with `build_paperwork.py --letter <slug>`, copied into
`public/dark-phonics-materials/<slug>/paperwork-pack.pdf`, published. All
30 paperwork packs are now a uniform 4pp.

### 3.2 Easy Reader tracing workbooks used a different, older visual system

The 11 standalone Easy Readers' tracing workbooks were built by
`satpin-paperwork/build_tracing.py`, an older generator with a completely
different cover ("TRACE AND BUILD" label, letter-badge circle, and — worse
— a **"written by ___" line** that the 2026-08-27 cover standard explicitly
removed everywhere else because it collides with the ex-libris bookplate).
**Decision: unify.** Readers now go through the same generator as the
letter books.

`scripts/curriculum/flashcards/build_tracing_booklet.py` gained a
`--readers` mode: `load_reader_book(slug)` reads the reader's own source
data (`easy-readers-manifest-v2.json` + `phonics-images/easy-readers/
<slug>/`) and reuses every bit of the letter-book cover/bookplate/folio/
imposition machinery. Readers always build in sentence mode (a reader page
is a whole sentence, not a word-mode reveal), so their cover badge reads
**"TRACE THE STORY"** — the same badge the two pattern books already carry.
`READER_MATERIALS_SLUG = {'fox-in-a-box': 'fox-in-a-box-reader'}` encodes
the one slug/materials-directory mismatch in the family (see §4 below).

`scripts/curriculum/satpin-paperwork/build_tracing.py` is **deprecated for
tracing workbooks** — a large comment block at the top of the file says so
explicitly and points at the replacement. It still owns `build-it-sheet.pdf`
for all 30 slugs; that part is current and untouched.

All 11 readers' tracing workbooks were rebuilt with
`build_tracing_booklet.py --readers --all` and republished to
`public/dark-phonics-materials/<slug or materialsSlug>/tracing-workbook.pdf`.

### 3.3 Reader Work 0–4/v2 pills were built and live, but unreachable

`lessons.ts` had set `reader.works: true` on all 11 Easy Reader entries, but
`page.tsx` only ever checked `book.works` — the reader row's Printables
block hard-coded just Tracing workbook + Paperwork pack, no works loop.
**Decision: wire it up** (the PDFs already existed and were already
published — this was a pure page.tsx gap).

Extracted the works-pill block into a shared `WorksPills({ slug })`
component in `page.tsx`, used by both `BookPrintablePills` (books, keyed on
`book.slug`) and a new block in the reader Printables row (keyed on
`l.reader.slug` — **not** `materialsSlug`; the works PDFs live under
`public/dark-phonics-books/works/<reader.slug>/` regardless of where the
reader's tracing/paperwork materials live). `STORYBOOK_PRINT_VERSION`
bumped 28 → 29.

### 3.4 Four covers had a different aspect ratio than the other 15

`the-sat`, `the-kit`, `the-mud`, `the-tall` were 1344×896 (3:2 landscape)
while the other 15 book-family covers were 1024×1024 (square) — same
`w-16 rounded-md` thumbnail slot, different crop/fit, visibly inconsistent
framing on the shelf. **Decision: crop to square**, keeping the main
character in frame:

- `the-sat` — cropped centre (character already centred).
- `the-kit` / `the-mud` / `the-tall` — cropped offset right, to keep the
  main character (the landscape source had it right-of-centre).

Originals preserved at `public/dark-phonics-books/covers/
_landscape-originals/<slug>.png` before cropping, in case the crop needs
revisiting. All 19 book-family covers are now 1024×1024.

### 3.5 Handoff had a stale note about `the-spat`

`HANDOFF_2026-08-27_book-works.md`'s Aug-28 addendum said `the-spat` "has
never been published" (true at the time, due to a missing art file). It was
in fact fixed since then — `books_def.py` now points its p6 spread at art
that exists, and `the-spat` has been fully built/published/live for a
while. Added a short "Update (2026-09-05)" note directly under the stale
claim rather than rewriting history.

### 3.6 satpin-paperwork README didn't mention the manual copy step

The README documented `build_paperwork.py`'s default output dir
(`public/satpin-materials/<slug>/`) without mentioning that the live site
reads `paperwork-pack.pdf` from `public/dark-phonics-materials/<slug>/`
instead — a future rebuild could silently regenerate into the wrong place.
Added a short paragraph spelling out the copy step and the two directories'
different roles.

Also added to the playbook: a new "Adding a reader — `materialsSlug`
override" section documenting the `fox-in-a-box` → `fox-in-a-box-reader`
foot-gun explicitly (previously only implicit in a `??` fallback in
`page.tsx`).

---

## 4. THE CANONICAL PIPELINE (updated — copy of audit §1)

| Family | Generator | Local output | Live path | Applies to |
|---|---|---|---|---|
| A5 reading (proof) | `scripts/curriculum/flashcards/build_booklets.py` via `_build_one.py`/`_patched_build.py` (sat-cast) or `scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py` (pattern books) | `public/dark-phonics-books/print/<slug>-A5-reading.pdf` | `/dark-phonics-books/print/<slug>-A5-reading.pdf` | 19 book-family slugs only (17 sat-cast + `ant-on-my-apple` + `snake-in-my-sock`). The 11 standalone Easy Readers do **not** use this pipeline. |
| A5 booklet-print (imposed) | same as above | `public/dark-phonics-books/print/<slug>-A5-booklet-print.pdf` | `/dark-phonics-books/print/<slug>-A5-booklet-print.pdf` | same 19 |
| Letter tracing booklet | `scripts/curriculum/flashcards/build_tracing_booklet.py` — **now the single generator for all 30 slugs**: sat-cast/pattern books in word/sentence mode as before, plus `--readers` mode (`load_reader_book()`) for all 11 Easy Readers | `public/dark-phonics-materials/<slug or materialsSlug>/tracing-workbook.pdf` | `/dark-phonics-materials/<slug or materialsSlug>/tracing-workbook.pdf` | all 30, one generator |
| Sentence tracing | a mode of `build_tracing_booklet.py` (`suffix='sentence-tracing'`), not a separate site pill | `public/dark-phonics-books/print/<slug>-A5-*-sentence-tracing*.pdf` | not linked from the library page | sat-cast books whose reveal word changes per spread |
| Paperwork pack | `scripts/curriculum/satpin-paperwork/build_paperwork.py --letter <slug>` (config `letters/dp-<slug>.json`) | default `public/satpin-materials/<slug>/paperwork-pack.pdf`, copied to `public/dark-phonics-materials/<slug>/paperwork-pack.pdf` for the live site | `/dark-phonics-materials/<slug>/paperwork-pack.pdf` | all 30, uniform 4pp as of this pass |
| Cover PNG | external image generation (MJ), not a repo script | `public/dark-phonics-books/covers/<slug>.png` | `/dark-phonics-books/covers/<slug>.png` | 19 book-family slugs; all now 1024×1024 |
| Book works 0–4 (+ Work 3 v2) | `scripts/curriculum/book-works/build_book_works.py <slug>` — the single canonical generator for all 30 slugs | `materials-out/book-works/<slug>/*.pdf`, copied to `public/dark-phonics-books/works/<slug>/` | `/dark-phonics-books/works/<slug>/<slug>-work{0..4}[-v2]-*.pdf` | all 30; now reachable from the site for readers too (§3.3) |
| Publish/sync | `node scripts/curriculum/publish-static-materials.mjs [--dir DIR \| --since DATE \| explicit files]` | — | uploads `public/<rest>` 1:1 to the `static-assets` Supabase bucket at key `<rest>` | all of the above |

**Golden rule: source → generator → `public/` → `publish-static-materials.mjs`
→ Supabase `static-assets` bucket.** `public/dark-phonics-books/`,
`public/dark-phonics-materials/` and `public/satpin-materials/` are all
gitignored — a built PDF sitting in `public/` is not live and never goes
into a git commit; only the bucket sync makes it live. Bump
`STORYBOOK_PRINT_VERSION` (`page.tsx`) after republishing anything that
already has an existing live URL, or the browser/CDN cache keeps serving
the old file.

---

## 5. Verification (post-fix, all 30 slugs)

- Tracing: 30/30 ReportLab-produced, no "written by" text anywhere (checked
  the 11 readers specifically), bookplate present on all 30 covers, page
  counts 8/10/12 (A4-landscape sheets; readers are 16 A5 pages → 8 sheets,
  matching the family invariant `print pages = reading pages ÷ 2`).
- Paperwork: 30/30 at 4pp.
- Works: 30 slugs × 6 files, page counts 3/3/3/2/3/3 (work0/1/2/3/3v2/4)
  constant across every slug.
- Covers: 19/19 book-family covers at 1024×1024.
- A5 reading/booklet-print: 19/19 present, page-count invariant holds.
- `eslint` clean on `page.tsx` after the `WorksPills` refactor.

---

## 6. Published files (this session)

- 30 × `<slug>-work3-sentence-builder-guided-v2.pdf` (new Work 3 v2 files,
  all 30 slugs).
- 11 × `tracing-workbook.pdf` (Easy Readers, rebuilt on the unified
  generator).
- 4 × `paperwork-pack.pdf` (`the-spat`, `the-pit`, `ant-on-my-apple`,
  `snake-in-my-sock`, now 4pp).
- 4 × cover `.png` (`the-sat`, `the-kit`, `the-mud`, `the-tall`, now
  1024×1024).

**Cloudflare cache note:** covers can cache up to 7 days at the edge; if a
just-republished cover still shows the old crop on the live site, purge the
Cloudflare cache for that URL rather than assuming the publish failed.

---

## 7. Open items

- **A5 books are still built by two different generators** —
  `scripts/curriculum/flashcards/build_booklets.py` (sat-cast) vs.
  `scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py` (the 2
  pattern books). Outputs are uniform (same page sizes, same imposition
  rule), the code isn't. Not fixed this pass — flagging for a future
  consolidation if it's ever worth the risk of touching two working
  pipelines.
- **Easy Reader body PDFs** (`readers/<slug>.pdf`, the reader itself, not
  its materials) live in a separate Supabase bucket (`dark-phonics`, not
  `static-assets`) and are not a repo-tracked local file at all — not
  regenerable from this repo, out of scope for any of the fixes above.
- **`dp-fox-in-a-box.json` is an orphan** — 4 `yesno` items, unused;
  `dp-fox-in-a-box-reader.json` is the file actually wired to
  `fox-in-a-box`'s materials. Left alone (not deleted) — flagging so nobody
  edits the wrong file next time.
- **Unrelated dirty files, left untouched this session:**
  `materials-out/book-works/*` for 16 slugs (gitignored, dev-only build
  output — not part of this pass's diff), `public/dark-phonics-shelf/v2/*`,
  `docs/handoffs/HANDOFF_SHELF_PRINT_FIX_2026-09-05.md` (a different,
  concurrent session's work).
- **Scratch to delete manually** (safe to remove, not referenced by any
  script): `.tmp-verify/`, `_claude_stage/`, `_claude_stage_trace/`,
  `public/satpin-materials/dp-*`, `public/dark-phonics-books/covers/
  _crop-test/`, `_claude_stage/dp_audit_2026-09-05/`.

---

## 8. How to regenerate

**Work 3 v2 (one slug or all 30):**
```bash
export MONTREE_CANVAS_FONTS="$(pwd)/scripts/curriculum/flashcards/canvas-fonts/"
python3 scripts/curriculum/book-works/build_book_works.py <slug>   # builds all 6 works files incl. v2
cp materials-out/book-works/<slug>/*.pdf public/dark-phonics-books/works/<slug>/
node scripts/curriculum/publish-static-materials.mjs --dir public/dark-phonics-books/works
```

**Reader tracing workbooks (unified generator):**
```bash
cd scripts/curriculum/flashcards
python3 build_tracing_booklet.py --readers --all      # all 11 Easy Readers
python3 build_tracing_booklet.py --readers mud-pup    # just one
# writes straight to public/dark-phonics-materials/<materialsSlug>/tracing-workbook.pdf — no copy step
node ../publish-static-materials.mjs public/dark-phonics-materials/mud-pup/tracing-workbook.pdf
```

**Paperwork pack:**
```bash
cd scripts/curriculum/satpin-paperwork
python3 build_paperwork.py --letter <slug>
cp public/satpin-materials/<slug>/paperwork-pack.pdf public/dark-phonics-materials/<slug>/paperwork-pack.pdf
node ../publish-static-materials.mjs public/dark-phonics-materials/<slug>/paperwork-pack.pdf
```

**Cover crop:** manual image edit (crop to 1024×1024, keep the main
character in frame), then
`node scripts/curriculum/publish-static-materials.mjs public/dark-phonics-books/covers/<slug>.png`
— purge Cloudflare cache for that URL if the old crop still shows live.

After republishing anything with an existing live URL, bump
`STORYBOOK_PRINT_VERSION` in `app/montree/library/dark-phonics/page.tsx`.

---

## 9. Process note

The main Claude session oversaw this pass only — it did not read large
files, build PDFs, or drive the Mac directly. Sonnet/Opus worker sessions
did the actual audit, the fixes, the builds, and the publish steps.
Tredoux reviewed a sample of each material family (paperwork packs, reader
tracing covers, cropped covers, Work 3 v2 sheets) before anything was
published live.
