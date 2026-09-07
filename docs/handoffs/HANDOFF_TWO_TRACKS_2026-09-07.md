# HANDOFF — TWO TRACKS (2026-09-07)

Supersedes the delivery half of `HANDOFF_FOUR_WORD_RULE_2026-09-07.md`. That
pass cut every Dark Phonics reader sentence to four words **over the top of**
the originals. Tredoux wants both. So both now exist.

| | FIRST LANGUAGE | SECOND LANGUAGE |
|---|---|---|
| the rule | the original wording, exactly as it was at `b1c4d4a56` | every sentence a child reads is **no more than four words** |
| where | every path and URL it has always had — **nothing live moved** | the same filenames under a `second-language/` sibling folder |
| how | the generators' default, no flag | `--track second-language` (or `DP_TRACK=second-language`) |
| art | shared | shared — same covers, same page pictures |

---

## Folder layout

```
public/dark-phonics-books/print/                     FIRST   readers + booklet prints
public/dark-phonics-books/covers/                    FIRST   (shared art)
public/dark-phonics-books/works/<slug>/              FIRST   186 works PDFs
public/dark-phonics-books/second-language/print/     SECOND  135 files
public/dark-phonics-books/second-language/works/     SECOND  186 files
public/dark-phonics-books/second-language/covers/    SECOND  12 files

public/dark-phonics-materials/<slug>/                FIRST   tracing + paperwork
public/dark-phonics-materials/second-language/<slug>/ SECOND 111 files

public/satpin-materials/dp-<slug>/                   FIRST   4 legacy mirrors
public/satpin-materials/second-language/dp-<slug>/   SECOND  4 legacy mirrors

materials-out/book-works/<slug>/                     FIRST   works staging (tracked)
materials-out/book-works-second-language/<slug>/     SECOND  works staging
```

`public/dark-phonics-books/`, `public/dark-phonics-materials/` and
`public/satpin-materials/` are **gitignored** (`.gitignore:199-202`). There is
no copy of these PDFs in git — that is why the first-language set had to be
**rebuilt** from the HEAD text sources rather than checked out.

---

## The source of truth

`scripts/curriculum/dark-phonics-storybooks/four_word.py` — one importable
module, no side effects, nothing on disk.

```python
track()                      # 'first-language' | 'second-language', from argv/env
is_second(track)             # bool
transform_sentence(s)        # one sentence -> its four-word form (identity if unknown)
transform_lines(lines)       # a stacked line list -> (lines, size override)
transform_book(book)         # a books_def / make_book / load_reader_book dict
transform_reader_entry(e)    # an easy-readers-manifest-v2 reader
transform_dp_cfg(cfg)        # a satpin-paperwork letters/dp-*.json
sync_dp_cfg(cfg)             # rule 7: dp sentences re-derived from the L2 reader
reader_pages(slug)           # (title, {page number: the sentence the L2 reader prints})
patch_readers_module(mod)    # rewrites build_a5_readers.COVERS/SPLITS in place
out_root(kind, track)        # 'print'|'covers'|'works'|'materials'|'satpin'
SKIP_SLUGS                   # the-vest the-swim the-yam the-zip the-quilt
```

It carries the exact wordings the four-word pass landed on: **428 whole-sentence
mappings** (from `_four_word_apply.py`), the structural line stacks (cover
`title_lines`, the recap chants as the tail phrase ×3 in the house `drop`
style, ending `?!`), the potato/negation pages
(`Not on the… mat!`, `Not in a… cot!`, `Not in the… mud!`,
`Didn't chase the… rat!`), the-pit's hand-cut model wording
(`Cat in the… pit!`, recap `In the pit!` ×3, cover `In the Pit!`) and the four
corrections-pass-2 rulings (`Fox in a box.`, `Six in a box!`,
`Hen in my bed!`, `Bell on a hill.`).

The one-offs `_four_word_apply.py`, `_four_word_structural.py`,
`_four_word_sync_paperwork.py`, `_four_word_sync_lessons.py` are now **history
only** — they mutate the sources in place and must not be run again.

---

## Building each track

Set once (this mount can't see the Mac's absolute font path):

```bash
cd <repo>
export REPO=$PWD
export MONTREE_CANVAS_FONTS=$REPO/scripts/curriculum/flashcards/canvas-fonts
export MONTREE_REPO_ROOT=$REPO
```

### First language (default — no flag anywhere)

```bash
cd $REPO/scripts/curriculum/dark-phonics-storybooks && python3 build_a5_readers.py
cd $REPO/scripts/curriculum/flashcards && MONTREE_FLASHCARDS_DIR=$PWD \
  python3 _patched_build.py the-mat the-cot the-kit the-egg the-dog the-mud the-rat \
                            the-bug the-sad the-tall nap-ant-nap the-pit
MONTREE_FLASHCARDS_DIR=$PWD python3 _patched_trace.py the-mat the-cot the-kit the-egg \
  the-dog the-mud the-rat the-bug the-sad the-tall nap-ant-nap the-pit the-sat \
  the-spat the-pat the-dig the-hot
python3 build_tracing_booklet.py --readers --all
cd ../dark-phonics-storybooks && python3 _patched_a5_tracing.py --all
cd ../book-works && python3 build_book_works.py <31 slugs>          # ~13 s/book
cp -R $REPO/materials-out/book-works/<slug>/*.pdf \
      $REPO/public/dark-phonics-books/works/<slug>/
cd ../satpin-paperwork
for s in <54 stems>; do python3 build_paperwork.py --letter dp-$s --repo-root $REPO \
   --out $REPO/public/dark-phonics-materials/$s; done
for s in ant-on-my-apple snake-in-my-sock the-pit the-spat; do \
   python3 build_paperwork.py --letter dp-$s --repo-root $REPO; done   # legacy mirrors
```

### Second language

The **same commands with `--track second-language`**. Every generator picks its
own output folder from `four_word.out_root()`; nothing else changes.

```bash
python3 build_a5_readers.py --track second-language
MONTREE_FLASHCARDS_DIR=$PWD python3 _patched_build.py --track second-language <12 slugs>
MONTREE_FLASHCARDS_DIR=$PWD python3 _patched_trace.py --track second-language <17 slugs>
python3 build_tracing_booklet.py --readers --all --track second-language
python3 _patched_a5_tracing.py --all --track second-language
python3 build_book_works.py --track second-language <31 slugs>
#   -> materials-out/book-works-second-language/, then copy to
#      public/dark-phonics-books/second-language/works/<slug>/
python3 build_paperwork.py --track second-language --letter dp-<stem> --repo-root $REPO \
        --out $REPO/public/dark-phonics-materials/second-language/<stem>
```

`DP_TRACK=second-language` does the same thing for every one of them.

### Verify

```bash
cd $REPO/scripts/curriculum/dark-phonics-storybooks && python3 two_track_audit.py
```

Read-only. Walks every dp sentence in both tracks, counts words, and checks
each sentence actually appears in that track's paperwork pack and each works
row in that track's work-2 sheet.

---

## Verification done, 2026-09-07

- **The second-language pipeline reproduces the four-word pass exactly.** All
  **387** second-language PDFs (272 books + 111 materials + 4 satpin mirrors)
  were rebuilt from scratch by `--track second-language` and their extracted
  text compared against the Phase-2 files they replaced: **0 differences**.
- `two_track_audit.py`: second language **0 sentences over four words**,
  **0** paperwork mismatches over 54 packs, **0** row mismatches over 31 work-2
  sheets. First language: same two cross-source checks, **0 / 0**.
- Every first-language TEXT SOURCE is byte-identical to `b1c4d4a56`:
  `git status` is clean for `books_def.py`, `manifest.json`,
  `easy-readers-manifest-v2.json`, `lessons.ts`, `book-works-lessons.ts`,
  the 62 `letters/dp-*.json`, the 48 `shims/dp-*.py` and the library page's
  content (only the deliberate two-track edit shows).
- First-language readers still print the HEAD wording and never the cut
  (`the-pit` prints `The ant sat in the… pit!`, its second-language twin
  prints `Ant in the… pit!`).
- `npx tsc --noEmit` over `app/montree/library/dark-phonics/page.tsx` with the
  project tsconfig: **clean**.

### What could NOT be proven byte-for-byte

The first-language PDFs are **rebuilt**, not restored: `public/**` is
gitignored, Phase 2 overwrote the originals in place, and no backup of them
exists anywhere in the tree. They are built from HEAD sources by the
unmodified default path, and their text was spot-checked against HEAD, but a
PDF embeds a creation timestamp so byte-identity was never available. For the
64 tracked `materials-out/book-works/**` PDFs, the sentences match HEAD
exactly; their sheet headers differ because HEAD's copies predate the
2026-08-27 grid/format change (that dirt was already in the tree).

---

## The library page

`app/montree/library/dark-phonics/page.tsx`

- `STORYBOOK_PRINT_VERSION` **29 → 30** so the cache-buster refreshes.
- The **Printables** row is unchanged in look. The Letter card still sits at
  the top of it (same card on both tracks). Beneath it are two collapsible
  tabs, **First language** and **Second language**, both **closed by default**.
- Opening one renders **exactly the pill layout that used to be there** —
  Book · Tracing workbook · Paperwork pack · Work 1–5 + the Work 4 v2 pill,
  same order, same `Pill` component, same styling — with that track's paths.
  Clicking the open tab closes it.
- Availability is **per pill, per track**, not per tab: six explicit sets near
  the top of the file — `L1_PRINT` / `L2_PRINT`, `L1_TRACING` / `L2_TRACING`,
  and `PAPERWORK` / `WORKS` (the same on both tracks) — with the predicates
  `hasPrint` / `hasTracing` / `hasPaperwork` / `hasWorks`. A missing file greys
  out only that pill:
  - `nap-ant-nap`, `the-fast`, `the-jump`, `the-lost` have a tracing workbook
    but have **never** had a paperwork pack, on either track — that pill is now
    dropped for them (it was a dead link on the first language before this).
  - `the-nap`, `the-sat`, `the-spat`, `the-pat`, `the-dig`, `the-hot` have
    second-language paperwork and works but no second-language reader — the
    Book pill is dropped on that track only.
  - `the-vest`, `the-swim`, `the-yam`, `the-zip`, `the-quilt` are in no
    second-language set at all.
- A book with nothing at all on a track greys that whole tab out and labels it
  "· coming soon" (`hasTrack`).
- **Href check: 552 hrefs generated across both tracks, 0 dead links.**
- Regenerate those sets by listing, per track root:
  `.../print/<slug>-A5-booklet-print.pdf`, `.../works/`,
  `.../<slug>/tracing-workbook.pdf`, `.../<slug>/paperwork-pack.pdf`.
- No new design language, no new components beyond the `TrackTabs` toggle,
  which reuses the existing `Pill` sizing and the page's disabled-button style.

---

## Publishing

`public/dark-phonics-books/`, `public/dark-phonics-materials/` and
`public/satpin-materials/` are gitignored **and** `.dockerignore`d — they are
NOT served from Railway's `public/`. `next.config.ts` rewrites
`/dark-phonics-books/:path*` and `/dark-phonics-materials/:path*` to the media
proxy over the Supabase `static-assets` bucket, so every printable on both
tracks is served from Supabase and a Railway deploy only matters for the page
code, never for the PDFs.

`scripts/curriculum/publish-static-materials.mjs` `DEFAULT_DIRS` now reads:

```js
'public/dark-phonics-materials',            // BOTH tracks — second-language/ is a subdir
'public/dark-phonics-books/works',          // first language works
'public/dark-phonics-books/second-language' // second language print + works + covers
```

`public/dark-phonics-books/print` (the **first-language readers**) is **not**
a default dir and never has been — nothing else in the repo uploads it
(`publish-storybooks.mjs` is a different job: the 27 storybook PDFs from a
Desktop source into the separate `dark-phonics` bucket). The readers are
published by naming the dir explicitly:

```bash
node scripts/curriculum/publish-static-materials.mjs --dir public/dark-phonics-books/print
```

The script uploads `*.pdf` only, so the `covers/*.png` in either track are not
touched by it (the page reads covers through the media proxy, not that path).

Env: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, read from
`.env.local` at the repo root.

---

## NOT wired: the digital lessons

`lib/montree/dark-phonics/book-works-lessons.ts` is **first language**,
byte-identical to HEAD.

`lib/montree/dark-phonics/book-works-lessons.second-language.ts` is generated
(170 sentences re-derived from the second-language readers, 0 unresolved) by

```bash
python3 scripts/curriculum/dark-phonics-storybooks/sync_lessons.py --track second-language
```

**Nothing imports it.** Tredoux has not decided whether the digital side gets
two tracks, so it is produced and parked, nothing more. `sync_lessons.py` with
no flag is a dry report against the first-language file (it needs `--write` to
touch it).

---

## Stale files / caveats

- `_to_delete/tracing-proofs/` — 117 intermediate `-A5-tracing.pdf` proofs.
  This mount cannot `rm`, so builders move them there.
- `_to_delete/stale-git-locks/index.lock.1126`, `_to_delete/tmp-tsconfigs/` —
  a stale 90-minute-old `.git/index.lock` from another session that blocked
  `git checkout`, and the scoped tsconfig used for the type-check.
- Because of that lock the first-language sources were restored with
  `git show HEAD:<path> > <path>` rather than `git checkout` — same bytes, no
  index write. Git still leaves a stale `.git/index.lock` behind on this mount
  after most commands; it is harmless and self-reused.
- `public/dark-phonics-books/second-language/print/_preview/` also caught the
  four-word pass's scratch proofs (`pv-BOOK-*.png`, `the-pit-A/B/FINAL-*`).
  Nothing in the app references `_preview`; the 13 contact sheets under
  `_preview/sheets/` are the second-language ones.
- `the-fast`, `the-lost`, `the-jump` have no paperwork pack on either track —
  they never had one.
- `app/montree/dashboard/raz/page.tsx` and `materials-out/**` were dirty before
  this session; `materials-out/book-works/**` was rebuilt (first language) as
  part of restoring the works.
- Nothing was committed, pushed or published.

---

## Files to stage for the commit

Stage these paths explicitly — **never `git add -A`**, other sessions share
this repo and there are ~150 unrelated untracked files in the tree.

```
git add \
  app/montree/library/dark-phonics/page.tsx \
  docs/handoffs/HANDOFF_TWO_TRACKS_2026-09-07.md \
  docs/handoffs/HANDOFF_FOUR_WORD_RULE_2026-09-07.md \
  docs/mission-control/brain.json \
  lib/montree/dark-phonics/book-works-lessons.second-language.ts \
  scripts/curriculum/dark-phonics-storybooks/four_word.py \
  scripts/curriculum/dark-phonics-storybooks/sync_lessons.py \
  scripts/curriculum/dark-phonics-storybooks/two_track_audit.py \
  scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py \
  scripts/curriculum/dark-phonics-storybooks/build_a5_tracing.py \
  scripts/curriculum/dark-phonics-storybooks/_patched_a5_tracing.py \
  scripts/curriculum/dark-phonics-storybooks/_four_word_apply.py \
  scripts/curriculum/dark-phonics-storybooks/_four_word_structural.py \
  scripts/curriculum/dark-phonics-storybooks/_four_word_sync_paperwork.py \
  scripts/curriculum/dark-phonics-storybooks/_four_word_sync_lessons.py \
  scripts/curriculum/dark-phonics-storybooks/four_word_audit.py \
  scripts/curriculum/flashcards/_patched_build.py \
  scripts/curriculum/flashcards/_patched_trace.py \
  scripts/curriculum/flashcards/build_tracing_booklet.py \
  scripts/curriculum/book-works/build_book_works.py \
  scripts/curriculum/satpin-paperwork/build_paperwork.py \
  scripts/curriculum/publish-static-materials.mjs \
  materials-out/book-works \
  docs/curriculum/dark-phonics-materials/FOUR_WORD_AUDIT_2026-09-07.md
```

`materials-out/` is gitignored (`.gitignore:194`). `materials-out/book-works/`
has 64 files inside it that were force-added at some point in the past, so
`git add materials-out/book-works` picks up their modifications without `-f`.
`materials-out/book-works-second-language/` is deliberately **NOT** staged: it
is regenerable staging output for a gitignored directory, the deliverables it
feeds live under `public/` and are published to Supabase, and force-adding 186
new binaries would extend a partial historical exception rather than follow a
convention. Rebuild it with
`python3 build_book_works.py --track second-language <31 slugs>`.

`books_def.py`, `manifest.json`, `easy-readers-manifest-v2.json`,
`lessons.ts`, `book-works-lessons.ts`, `letters/dp-*.json` and `shims/dp-*.py`
are **clean** — do not stage them, there is nothing to stage.

Do **not** stage `_to_delete/`, `__pycache__/`, `app/montree/dashboard/raz/page.tsx`,
or any of the pre-existing untracked scratch at the repo root.

The `public/**` PDFs of both tracks are gitignored and are published, not
committed. Publish first language to its existing paths and second language to
the `second-language/` paths.
