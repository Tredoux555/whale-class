# Dark Phonics Materials — Uniformity & Pipeline Audit (2026-09-05)

Read-only audit. Repo HEAD at time of audit: `0bb63d7ef4` (2026-09-05 17:54 +0800).
Scope: 30 books/readers named in the brief. All checks below are evidence-based
(commands + output shown or summarized); nothing here is speculation.

Tools used: `pdfinfo`/`pdftotext`/`pdffonts`/`pdftoppm` (all present on the Mac),
`curl` for live checks (run from the cloud container — the Mac's device-bridge
network was not needed since the cloud container had direct network access),
`git log` for generator freshness, Python for JSON/PNG inspection.

---

## 1. Pipeline summary per family

Read from `docs/curriculum/DARK_PHONICS_NEW_BOOK_PLAYBOOK.md`,
`docs/curriculum/dark-phonics-materials/HANDOFF_2026-08-27_book-works.md`,
and the generator scripts' own docstrings.

| Family | Generator | Local output | Live path | Applies to |
|---|---|---|---|---|
| A5 reading (proof) | `scripts/curriculum/flashcards/build_booklets.py` via `_build_one.py`/`_patched_build.py` (sat-cast) or `scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py` (pattern books) | `public/dark-phonics-books/print/<slug>-A5-reading.pdf` | `/dark-phonics-books/print/<slug>-A5-reading.pdf` | 17 sat-cast + `ant-on-my-apple` + `snake-in-my-sock` = **19 book-family slugs only**. The 11 standalone Easy Readers do **not** use this pipeline. |
| A5 booklet-print (imposed, what a printer uses) | same as above | `public/dark-phonics-books/print/<slug>-A5-booklet-print.pdf` | `/dark-phonics-books/print/<slug>-A5-booklet-print.pdf` | same 19 |
| Letter tracing booklet | `scripts/curriculum/flashcards/build_tracing_booklet.py` (`_patched_trace.py`) for sat-cast/pattern books; `scripts/curriculum/dark-phonics-storybooks/build_a5_tracing.py` for the 2 pattern books; `scripts/curriculum/satpin-paperwork/build_tracing.py` for the 11 Easy Readers (different pipeline, different visual system — see §4.3) | copied/written to `public/dark-phonics-materials/<slug>/tracing-workbook.pdf` | `/dark-phonics-materials/<slug>/tracing-workbook.pdf` | all 30, via two different generators depending on slug |
| Sentence tracing | a **mode** of `build_tracing_booklet.py` (`suffix='sentence-tracing'` when a book's reveal word doesn't repeat), not a separate family/output slot on the site | `public/dark-phonics-books/print/<slug>-A5-*-sentence-tracing*.pdf` | not linked from the library page as its own pill | sat-cast books whose reveal word changes per spread |
| Paperwork pack | `scripts/curriculum/satpin-paperwork/build_paperwork.py --letter <slug>` (config in `scripts/curriculum/satpin-paperwork/letters/dp-<slug>.json`) | default `public/satpin-materials/<slug>/paperwork-pack.pdf`, then manually placed at `public/dark-phonics-materials/<slug>/paperwork-pack.pdf` for the live site to find it (the two dirs are **not** the same thing — `satpin-materials` is keyed by letter, not slug, for most of its content) | `/dark-phonics-materials/<slug>/paperwork-pack.pdf` | all 30 |
| Cover PNG | external image generation (MJ), not a repo script | `public/dark-phonics-books/covers/<slug>.png` | `/dark-phonics-books/covers/<slug>.png` | 19 book-family slugs only (readers show a 📗 emoji pill, no cover image) |
| Book works 0–4 (+ Work 3 v2) | `scripts/curriculum/book-works/build_book_works.py <slug>` — **the single canonical generator for all 30 slugs**, auto-detecting Easy-Reader vs letter-book source data | `materials-out/book-works/<slug>/*.pdf`, copied to `public/dark-phonics-books/works/<slug>/` | `/dark-phonics-books/works/<slug>/<slug>-work{0..4}[-v2]-*.pdf` | all 30, one shared generator — this is the most uniform family in the whole audit |
| Publish/sync | `node scripts/curriculum/publish-static-materials.mjs [--dir DIR | --since DATE | explicit files]` | — | uploads `public/<rest>` 1:1 to the `static-assets` Supabase bucket at key `<rest>` | all of the above |

Two things not in scope of the brief's family list but discovered during the
audit and worth naming for completeness:
- **Easy Reader body PDF itself** (`readers/<slug>.pdf`) lives in a *different*
  Supabase bucket (`dark-phonics`, proxied via `media()`, not `static-assets`)
  and is not a repo-tracked local file at all — it predates
  `publish-static-materials.mjs` and isn't part of the file families this
  audit can check locally. All 11 resolved live 200 (§3).
- `reader.works: true` is set in `lib/montree/dark-phonics/lessons.ts` for all
  11 Easy Readers, but `app/montree/library/dark-phonics/page.tsx` never reads
  `reader.works` — only `book.works` gates the Work 0–4 pills. See §6.

---

## 2. Completeness matrix (family × slug)

Legend: ✓ = file exists locally and resolves 200 live · — = correctly not
expected for this slug's pipeline · ✗ = missing/broken.

| slug | reading | booklet-print | cover | tracing-wkbk | paperwork-pack | work0 | work1 | work2 | work3 | work3-v2 | work4 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| the-sat | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-spat | ✓ | ✓ | ✓ | ✓ | ✓ (3pp, see §5) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-pit | ✓ | ✓ | ✓ | ✓ | ✓ (3pp, see §5) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-pat | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-nap | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-mat | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-sad | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-dig | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-dog | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-cot | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-kit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-egg | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-mud | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-rat | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-hot | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-bug | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| the-tall | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ant-on-my-apple | ✓ | ✓ | ✓ | ✓ | ✓ (3pp, see §5) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| snake-in-my-sock | ✓ | ✓ | ✓ | ✓ | ✓ (3pp, see §5) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| mud-pup | — | — | — | ✓ (old-style, §4.3) | ✓ | ✓ (orphan, §6) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| hen-in-bed | — | — | — | ✓ (old-style) | ✓ | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| fox-in-a-box | — | — | — (unused file exists, see below) | ✓ (old-style, at `fox-in-a-box-reader/`) | ✓ (at `fox-in-a-box-reader/`) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| cat-cot-cut | — | — | — | ✓ (old-style) | ✓ | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| the-bell-fell | — | — | — | ✓ (old-style) | ✓ | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| fish-and-chick | — | — | — | ✓ (old-style) | ✓ | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| this-and-that | — | — | — | ✓ (old-style) | ✓ | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| jump-in-the-sand | — | — | — | ✓ (old-style) | ✓ | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| frog-and-crab | — | — | — | ✓ (old-style) | ✓ | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| big-splash | — | — | — | ✓ (old-style) | ✓ | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |
| the-cat-sat | — | — | — | ✓ (old-style) | ✓ | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) | ✓ (orphan) |

Notes on the matrix:
- **Reading/booklet-print/cover "—" for the 11 readers is correct**, not
  missing — `lessons.ts` gives these lessons a `reader:` object, not a
  `books:` array, and `BookPrintablePills` (which renders those three pill
  types) is only ever called with a `book`. This matches the playbook's
  explicit "two different kinds of book" split.
- **`fox-in-a-box` has an unused, orphaned cover file.** `public/dark-phonics-books/covers/fox-in-a-box.png` does **not** exist (confirmed missing, see raw completeness run below), but nothing links it anyway since `fox-in-a-box` is a `reader:`, not a `book:`. Not a live bug, just worth knowing there is no stray asset there.
- **Work 0–4 (and Work 3 v2) exist on disk and live for all 11 Easy Readers, but are orphaned** — never linked from the site. See §6 (Playbook drift) for the exact code line proving this.
- **`fox-in-a-box`'s materials live under a different directory name** (`fox-in-a-box-reader`) than its lesson slug (`fox-in-a-box`), via `materialsSlug` in `lessons.ts`. The live link correctly uses `materialsSlug`, so this resolves fine — flagging only because it is the one slug in the whole set where directory name ≠ site slug, a latent foot-gun for a future manual rebuild that forgets the override.

Raw completeness scan (Python, existence on disk):
```
reading:         20/30 present (10 missing = the 11 readers minus fox-in-a-box's unused cover... see note: all 11 readers correctly lack reading/booklet)
booklet-print:   20/30 present (same 10, correct)
cover:           19/30 present (all 11 readers correctly lack a cover)
tracing-workbook: 30/30 present
paperwork-pack:   30/30 present
work0..work4, work3-v2: 30/30 present each
```

---

## 3. Live check

All checks run via direct `curl` from the auditing container (the Mac's own
network was not needed — `montree.xyz` was reachable directly).

- **278/278 URLs returned HTTP 200**, covering: booklet-print + cover for all
  19 book-family slugs, and tracing-workbook + paperwork-pack + all 6 works
  files for all 30 slugs (`fox-in-a-box` checked at both its lesson slug,
  which 404s as expected since nothing publishes it, and its real
  `materialsSlug` directory, which is what's actually live).
- Spot-checked `reading` for all 19 book-family slugs individually — all 200.
- `Last-Modified` on all 30 slugs' `work3-sentence-builder-guided-v2.pdf`
  clusters tightly at **2026-09-05 08:07:19–08:09:57 GMT**, i.e. today's
  audit-morning publish run for the brand-new Work 3 v2 file — confirms the
  rollout documented in the handoff's newest addendum is fully live for
  every one of the 30 slugs, no partial rollout.
- Sat-cast `reading`/`booklet-print` `Last-Modified` cluster at
  **2026-08-28 22:31–23:29 GMT** (the filler-pages + heart-glyph rebuild);
  `ant-on-my-apple`/`snake-in-my-sock` cluster at **2026-08-27 13:39–13:40
  GMT** (the bookplate rollout, one day earlier) — consistent with the
  handoff's own account that the pattern books were *not* touched by the
  Aug-28 filler-pages pass (they have 0 tail slots to fill).

No stale-upload mismatches found: every local mtime I compared against a live
`Last-Modified` was the same day or the live copy was newer (i.e. nothing
locally regenerated and left un-synced).

---

## 4. Uniformity findings, with evidence

### 4.1 Book works (0–4, 3-v2, 4) — uniform across all 30 slugs

```
PAGE SIZES SEEN (works family, all 30 slugs × 6 files = 180 PDFs): {'595.276 x 841.89 pts (A4)'}
PRODUCERS SEEN: {'ReportLab PDF Library - (opensource)'}
work0-characters:                     page count = 3, constant across all 30
work1-picture-match:                  page count = 3, constant across all 30
work2-sentence-picture-match:         page count = 3, constant across all 30
work3-sentence-builder-guided:        page count = 2, constant across all 30 (no control page — correct per v1 spec)
work3-sentence-builder-guided-v2:     page count = 3, constant across all 30 (control page added on the back, per the v2 spec)
work4-sentence-builder-free:          page count = 3, constant across all 30
```
Single producer, single page size, page counts constant per work type and
matching the documented layout standard exactly. This is the cleanest family
in the whole system — one generator, one output shape, zero drift.
No ellipsis ("…" or "...") found in any of the 30 `work1` PDFs' extracted
text — `clean_sentence()` rule (rule 8 in the layout standard) holds
uniformly.

Visual spot-check (page 1, 4 slugs — `the-dig`, `ant-on-my-apple`, `mud-pup`,
`the-cat-sat` — rendered at 60dpi and reviewed): all four books' Work
0–4 sheets share identical header/rule/footer styling, picture-left column
order on Work 1/2 (rule 6), blank changing-word slot on Work 3 v2 (rule 10),
and consistent grid weight. No visual deviation found in this family.

### 4.2 A5 reading / booklet-print (19 book-family slugs)

```
A5-reading:       size = A5 portrait (420.945 x 595.276pt), producer = ReportLab, all 19
A5-booklet-print: size = A4 landscape (841.89 x 595.276pt), producer = ReportLab, all 19
Page counts: 4 slugs at 20/10pp (the-spat, the-tall, ant-on-my-apple, snake-in-my-sock);
             15 slugs at 24/12pp (all other sat-cast letter books)
```
The 20-vs-24-page split is expected and documented (`the-tall`/`the-spat`
have a shorter spread count than the standard 8-spread letter books; the two
pattern books have their own shorter shape) — not a defect. Booklet-print
page count is always exactly reading-page-count ÷ 2, holding the imposition
rule uniformly.

Confirmed by direct text extraction that the Aug-28 filler-page pass and the
Aug-27 heart-glyph fix are actually baked into the shipped PDF, not just
claimed in the handoff: `the-sat-A5-reading.pdf` extracted text contains
`MY WORDS`, `MY PICTURE`, `I CAN READ` and a heart-word caption rendered as
"a heart word — a" (glyph drawn as a vector, confirmed visually below).

### 4.3 Tracing workbook — TWO VISUALLY DIFFERENT DESIGN SYSTEMS (real finding)

All 30 tracing-workbook.pdf files are A4 landscape, ReportLab-produced, and
live at 200 — technically "the same pipeline family" by file-format metrics.
But **visually they are two unrelated cover/header designs**, split exactly
along the two generator boundary documented in §1:

- **19 book-family slugs** (sat-cast + 2 pattern books, built by
  `build_tracing_booklet.py`/`build_a5_tracing.py`): cover uses the
  `page_cover()`/bookplate standard — "MONTREE PHONICS" tracked header, big
  title, red dot, "This book belongs to" bookplate box bottom-left. Confirmed
  visually on `the-dig` and `ant-on-my-apple` renders.
- **11 standalone Easy Readers** (built by
  `scripts/curriculum/satpin-paperwork/build_tracing.py`): cover uses an
  **entirely different, older layout** — "TRACE AND BUILD" label, a small red
  circle with the letter/sound inside it, **a "written by ___" line** (the
  exact line the Aug-27 cover standard explicitly *removed* everywhere else
  to avoid colliding with the bookplate — see playbook: *"The old
  per-tracing-edition 'written by ___' line ... had to come out"*), and no
  bookplate box at all. Confirmed visually on both `mud-pup` and
  `the-cat-sat` renders — identical layout, both retaining "written by ___".

This is not a bug introduced by accident — the 2026-08-27 addendum says in
so many words that the 11 Easy Readers "do not use `page_cover()` and were
not touched." But it means that today, right now, a family the audit brief
calls one thing ("letter tracing booklets") is actually built by two
generators with two incompatible visual identities, and nothing on the site
or in the docs warns a parent that the reader booklets look like an older
product line. This is the single largest UNIFORMITY gap found.

### 4.4 Cover PNGs — inconsistent aspect ratio (real finding)

```
19 book-family cover PNGs, pixel dimensions:
  1024 x 1024 (square)   — 15 slugs: the-spat, the-pit, the-pat, the-nap, the-mat, the-sad,
                            the-dig, the-dog, the-cot, the-egg, the-rat, the-hot, the-bug,
                            ant-on-my-apple, snake-in-my-sock
  1344 x 896  (3:2 landscape) — 4 slugs: the-sat, the-kit, the-mud, the-tall
```
Both sizes render through the same `w-16 rounded-md` thumbnail slot on the
library page and the recap-art reuse described in the playbook ("the
recap/finale image ... is almost always reused as the book's cover
thumbnail too"), so a landscape source image gets a different crop/fit than
a square one in the same fixed-width box — visible as inconsistent framing
across the shelf. Root cause is upstream (different MJ generations/aspect
settings at art time), not the PDF pipeline itself, but it is a real,
visible non-uniformity across the family the brief asked to check.

### 4.5 Fonts

`pdffonts` was available; spot-checked works-family and reading-family PDFs
across the 4 render-sample slugs — all embed the same four canvas-design
faces (Outfit Regular/Bold, Lora Regular/Italic) with no extra/substituted
fonts. No Chrome/Pages/Canva producer strings found anywhere in the 30-slug
× 11-family scan — every PDF in every family is `ReportLab PDF Library -
(opensource)`, confirming no material was hand-exported from a different
tool.

---

## 5. Content findings

### 5.1 Paperwork pack — 4 of 30 slugs ship a short, non-standard pack (real finding)

The family's own README documents a fixed shape: *"paperwork-pack.pdf (A4
portrait, 4 pp)"*, built from 10 required `yesno` items (5 true / 5 false)
per `letters/dp-<slug>.json`. Checking every one of our 30 slugs' JSON
source file's `yesno` array length:

```
the-spat.json:          yesno = 4   (needs 10)
the-pit.json:           yesno = 4   (needs 10)
ant-on-my-apple.json:   yesno = 4   (needs 10)
snake-in-my-sock.json:  yesno = 4   (needs 10)
all other 26 slugs:     yesno = 10  ✓
```
This directly produces a **3-page pack instead of 4** for exactly those 4
slugs (confirmed by `pdfinfo`) — the second Yes/No page (items 6–10) is
simply absent because there's no data to print it from. Extracted text
confirms: `the-sat` (10 items) prints "did the ant sit? / did the snake sit?
/ did the apple sit? / did the sun sit? / did the star sit?" on page 1 and 5
more on page 2; `the-spat` (4 items) prints only 4 questions on page 1 and
has no second Yes/No page at all, going straight to Story Order as page 2/3.

This is a genuine content gap (incomplete authoring), not a bug in the
generator — `build_paperwork.py` correctly renders whatever `yesno` array it
is given; it's the source JSON for these 4 slugs that was never finished to
the 10-item standard. (These 4 JSON files were all last touched
2026-08-03…2026-08-16, i.e. from early in the family's life, well before the
10-item convention seems to have solidified for the other 26.)

### 5.2 Ellipsis-free sentences — confirmed clean

See §4.1 — zero ellipsis characters found across all 30 `work1` PDFs.

### 5.3 Reader row counts vs spread counts

Spot-checked `mud-pup` and `the-cat-sat`: Work 1/2/3/4 row counts (5 rows for
`mud-pup`, 5 rows for `the-cat-sat`) match their reader's spread/sentence
count exactly (visually confirmed against the rendered work sheets — no
truncated or padded rows).

---

## 6. Playbook drift

1. **`reader.works: true` is dead data.** All 11 Easy Reader entries in
   `lib/montree/dark-phonics/lessons.ts` set `works: true` on their `reader:`
   object (e.g. line 131: `reader: { slug: 'mud-pup', title: 'Mud Pup',
   works: true, materials: true }`). But
   `app/montree/library/dark-phonics/page.tsx` only ever checks `book.works`
   (line 405: `{book.works && (`) inside `BookPrintablePills`, which is only
   rendered for `l.books`, never for `l.reader`. The Easy Reader row (line
   ~726) renders only the 📗 reader pill; the Printables row for a
   reader-only lesson (line ~781) renders only Tracing workbook + Paperwork
   pack, hard-coded, with no works loop at all. **Net effect: the 60 Work
   0–4/v2 PDFs built and live-published for the 11 Easy Readers (`mud-pup`
   … `the-cat-sat`) are unreachable from the site.** This matches the
   handoff's own framing of book-works as a `books:`-only restoration
   (`06f7c09bc`/`eef800957` only ever mention "book" works), so the data
   flag on `reader` looks like it was copy-pasted forward rather than
   deliberately wired up — worth a decision (wire it up, or remove the dead
   flag so it stops implying these pills exist).

2. **Handoff's "spat has never been published" note is now stale (in a good
   way).** The 2026-08-28 addendum states `the-spat` "has never been
   published to `public/dark-phonics-books/print/` at all" due to a missing
   art file (`tiles/BK4-p6.png`). As of this audit, `the-spat` is fully
   built, published, and live (200, confirmed §2/§3), and `books_def.py`
   now points its p6 spread at `phonics-images/satpin-v2/books/the-spat/
   spat-p6.png`, which exists. The handoff doc was never updated to record
   the fix — a reader trusting that doc today would think `the-spat` is
   still broken.

3. **`paperwork-pack.pdf` "lives at" two different directory conventions**
   depending on which doc you read. The satpin-paperwork README says output
   lands in `public/satpin-materials/<slug>/`; the library page and the
   working live files are actually at `public/dark-phonics-materials/
   <slug>/paperwork-pack.pdf`. Neither doc calls out the manual copy step
   between the two — worth adding a line to the README (or a
   `--out public/dark-phonics-materials/<slug>` default) so a future rebuild
   doesn't silently regenerate into the wrong directory and leave the live
   site un-updated.

4. **Sentence-tracing mode isn't mentioned anywhere in the two docs the brief
   pointed at**, only discoverable in `build_tracing_booklet.py`'s own code
   (`suffix = 'tracing' if mode == 'word' else 'sentence-tracing'`) — for
   completeness this is a minor documentation gap, not a bug.

---

## 7. Fix list (prioritised)

1. **[Content gap, high]** Finish the 10-item `yesno` list for the 4
   incomplete paperwork-pack sources so all 30 packs are a uniform 4pp.
   Slugs: `the-spat`, `the-pit`, `ant-on-my-apple`, `snake-in-my-sock`.
   ```bash
   # edit each JSON's "yesno" array to 10 items (5 true / 5 false), then:
   cd scripts/curriculum/satpin-paperwork
   python3 build_paperwork.py --letter the-spat
   python3 build_paperwork.py --letter the-pit
   python3 build_paperwork.py --letter ant-on-my-apple
   python3 build_paperwork.py --letter snake-in-my-sock
   # copy each output into public/dark-phonics-materials/<slug>/paperwork-pack.pdf
   node ../publish-static-materials.mjs \
     public/dark-phonics-materials/the-spat/paperwork-pack.pdf \
     public/dark-phonics-materials/the-pit/paperwork-pack.pdf \
     public/dark-phonics-materials/ant-on-my-apple/paperwork-pack.pdf \
     public/dark-phonics-materials/snake-in-my-sock/paperwork-pack.pdf
   ```
   Effort: medium (needs 6 new true/false questions written per book, plus
   matching art references) — content authoring, not code.

2. **[Uniformity, high]** Bring the 11 Easy Readers' tracing-workbook cover
   onto the same `page_cover()`/bookplate visual standard as the other 19
   books, or explicitly document that readers are a deliberately different
   product line. At minimum, drop the leftover "written by ___" line from
   `scripts/curriculum/satpin-paperwork/build_tracing.py`'s cover — it
   directly contradicts the 2026-08-27 standard that removed this exact line
   everywhere else. Slugs: all 11 readers (`mud-pup`, `hen-in-bed`,
   `fox-in-a-box`, `cat-cot-cut`, `the-bell-fell`, `fish-and-chick`,
   `this-and-that`, `jump-in-the-sand`, `frog-and-crab`, `big-splash`,
   `the-cat-sat`). Effort: medium-high — needs a design decision from
   Tredoux first (unify vs. intentionally different), then a rebuild of 11
   tracing-workbook PDFs.

3. **[Playbook drift, medium]** Decide the fate of the 60 orphaned Easy
   Reader Work 0–4/v2 PDFs: either wire `reader.works` into
   `app/montree/library/dark-phonics/page.tsx` (add a works-pills block
   parallel to `BookPrintablePills`, gated on `l.reader?.works`), or remove
   the misleading `works: true` flags from the 11 `reader:` entries in
   `lib/montree/dark-phonics/lessons.ts`. Effort: low (a few lines either
   way) but needs an explicit product decision.

4. **[Visual uniformity, low-medium]** Regenerate the 4 landscape (1344×896)
   book covers as square (1024×1024) to match the other 15, or vice versa —
   pick one aspect ratio for the whole shelf. Slugs: `the-sat`, `the-kit`,
   `the-mud`, `the-tall`. Effort: art-side (crop/regenerate + republish 4
   PNGs), not a code fix.

5. **[Docs, low]** Update
   `docs/curriculum/dark-phonics-materials/HANDOFF_2026-08-27_book-works.md`
   to remove/correct the now-stale "spat has never been published" note, and
   add a one-line clarification to
   `scripts/curriculum/satpin-paperwork/README.md` that its default output
   dir (`public/satpin-materials/<slug>/`) is not where the live site reads
   `paperwork-pack.pdf` from — it must be copied to
   `public/dark-phonics-materials/<slug>/`. Effort: trivial (doc edits only).

6. **[Foot-gun, low]** Note `fox-in-a-box`'s `materialsSlug:
   'fox-in-a-box-reader'` override prominently in the playbook's "adding a
   reader" section (it currently only documents this pattern implicitly via
   the `??` fallback in page.tsx) so a future manual rebuild doesn't put
   files at `public/dark-phonics-materials/fox-in-a-box/` by mistake. Effort:
   trivial (doc edit only).
