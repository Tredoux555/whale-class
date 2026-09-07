# HANDOFF — THE FOUR-WORD RULE (2026-09-07)

## The rule (Tredoux, 2026-09-07, final)

> **Every sentence a child reads in a Dark Phonics reader is NO MORE THAN FOUR WORDS.**

- Count **per sentence**, `nar` + `text` together; punctuation and the "…" reveal are
  ignored; `___` counts as a word. A page with two sentences is fine if each is ≤ 4
  (`Nap, Ant, nap! “I nap in it!”` stays exactly as it is).
- A sentence already ≤ 4 words is left **byte-identical**. Nothing was "tidied".
- Cut order: **(a)** drop the leading article, **(b)** if still over, drop the verb.
  Never collapse `is not` / `can not` (`The potato is not… sad!` → `Potato is not… sad!`).
  Never drop the subject noun.
- The nar/text reveal split and the ellipsis stay exactly as they are, and the target
  word stays the literal last word, alone in `text`
  (`An alligator on my… apple.` → `Alligator on my… apple.`).
- Recap / chant pages are the **tail phrase ×3** in the house `drop` style, exactly as
  the-pit does (`In the pit!` ×3) — never a cast list.
- Covers lose the frame the same way: `The ___ Sat on the Mat!` → `On the Mat!`.
- Works, tracing and paperwork text **must match the book text 1:1**. The
  `dp-<slug>.json` `sentence` fields are copies of the reader page, never a separate
  rewrite. Teacher-read yes/no questions are NOT rewritten.

Model book: **the-pit**. The rule is now written into the two governing headers —
`scripts/curriculum/flashcards/books_def.py` (above the-pit) and the LOCKED TEXT RULE
block in `scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py`.

## What changed

| source | change |
|---|---|
| `scripts/curriculum/flashcards/books_def.py` | 11 letter books' nar lead-ins, potato/crew pages, 8 cover `title_lines`, the-tall recap chant, nap-ant-nap p2–p4 |
| `scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py` | SPLITS lead-ins for all 26 pattern books, 24 recap chants → tail phrase ×3 `drop`, 17 COVERS titles, the-fast/-lost/-jump recap normalised to a single line |
| `.../dark-phonics-storybooks/manifest.json` | every page `text` + book `title` brought to the reader wording |
| `scripts/curriculum/satpin-paperwork/letters/dp-*.json` (55) | `sentence` + `bookTitle` re-derived from the reader, verbatim |
| `scripts/curriculum/satpin-paperwork/shims/dp-*.py` (48) | same sentences |
| `lib/montree/english-curriculum/spec/easy-readers-manifest-v2.json` | the 8 over-long Easy Reader pages |
| `lib/montree/dark-phonics/book-works-lessons.ts` | pages/cast/rounds/endingLine sentences (machine substitution — see caveat below) |
| `lib/montree/dark-phonics/lessons.ts` | RAW book titles |
| `app/montree/library/dark-phonics/page.tsx` | `STORYBOOK_PRINT_VERSION` 29 → **30** |

Three one-off scripts did the work and are committed so the pass is reproducible:

- `scripts/curriculum/dark-phonics-storybooks/_four_word_apply.py` — 693 whole-quoted-literal
  sentence swaps (never a substring, so a longer sentence can't be mangled).
- `scripts/curriculum/dark-phonics-storybooks/_four_word_structural.py` — 54 list/tuple edits
  (recap chants, `title_lines`, `COVERS`).
- `scripts/curriculum/dark-phonics-storybooks/_four_word_sync_paperwork.py
scripts/curriculum/dark-phonics-storybooks/_four_word_sync_lessons.py` — rule 7: rewrites
  every dp json/shim sentence as a copy of its reader page, matched by page number, using
  `build_book_works.clean_sentence()` (the same function the works use).

## Generators run, in order (repeatable pipeline)

```bash
cd <repo>
# 1. text
python3 scripts/curriculum/dark-phonics-storybooks/_four_word_apply.py
python3 scripts/curriculum/dark-phonics-storybooks/_four_word_structural.py
python3 scripts/curriculum/dark-phonics-storybooks/_four_word_sync_paperwork.py
python3 scripts/curriculum/dark-phonics-storybooks/_four_word_sync_lessons.py

# 2. readers
cd scripts/curriculum/dark-phonics-storybooks && python3 build_a5_readers.py          # 29 pattern books
cd ../flashcards && MONTREE_REPO_ROOT=<repo> MONTREE_FLASHCARDS_DIR=$PWD \
  python3 _patched_build.py the-mat the-cot the-kit the-egg the-dog the-mud the-rat \
                            the-bug the-sad the-tall nap-ant-nap                       # 11 letter books

# 3. tracing
MONTREE_REPO_ROOT=<repo> MONTREE_FLASHCARDS_DIR=$PWD python3 _patched_trace.py \
  the-mat the-cot the-kit the-egg the-dog the-mud the-rat the-bug the-sad the-tall \
  nap-ant-nap the-pit the-sat the-spat the-pat the-dig the-hot                         # letter books
python3 build_tracing_booklet.py --readers --all                                       # 11 Easy Readers
cd ../dark-phonics-storybooks && python3 _patched_a5_tracing.py --all                  # 29 pattern books

# 4. works  (six PDFs per book; ~7 books/minute)
cd ../book-works && python3 build_book_works.py <all 31 slugs>
#    then copy materials-out/book-works/<slug>/*.pdf -> public/dark-phonics-books/works/<slug>/

# 5. paperwork  (one per dp json, out dir = the json stem minus "dp-")
cd ../satpin-paperwork
python3 build_paperwork.py --letter dp-<stem> --repo-root <repo> \
        --out <repo>/public/dark-phonics-materials/<stem>
#    plus the four legacy mirrors in public/satpin-materials/dp-*/ (no --out)

# 6. verify
python3 scripts/curriculum/dark-phonics-storybooks/four_word_audit.py --stdout
```

`_patched_a5_tracing.py` is new: `build_a5_tracing.py` `os.remove()`s its intermediate
proof, which the Cowork device mount refuses; the wrapper moves it to
`_to_delete/tracing-proofs/` instead, exactly as `_patched_trace.py` already did.

## Verification (all machine-checked, 2026-09-07)

- Per-sentence audit over every text source: **823 rows walked, 0 sentences over 4 words**
  in any built book (`four_word_audit.py` + a per-sentence splitter; the audit's own row
  counter treats a whole page line as one sentence, which is why the raw `over=29` figure
  it prints is all skipped-book rows and two-sentence pages).
- **319 reader pages** extracted from the rebuilt `-A5-reading.pdf` files: every page's
  printed sentence found in the PDF, **0 sentences over 4 words**.
- Superseded-string sweep over **49 readers + 60 tracing workbooks + 186 works PDFs +
  54 paperwork packs**: **0 hits** (the only hit found, the-pit's tracing workbook still
  carrying `The ___ Sat in the Pit!`, was a stale pre-rule build and was rebuilt).
- Cross-source match: every dp sentence present in its paperwork pack (54/54) and every
  works row present in its work-2 sheet (31/31) — **0 mismatches**.
- Re-verified after corrections pass 2: audit **0 sentences over 4 words**, cross-source
  **0 mismatches**, superseded-string sweep over 349 PDFs **0 hits** (the pass-1 wordings
  `Potato not on/in…`, `Potato didn't chase…`, `In my mug???`, `On a drum?????` were added
  to the sweep's blacklist).
- Contact sheets (all pages, 4/row, numbered) in
  `public/dark-phonics-books/print/_preview/sheets/<slug>.png` for the 11 rebuilt letter
  books; six were eyeballed (the-mat, the-cot, the-kit, the-sad, the-tall, nap-ant-nap).

## Corrections pass 2 (coordinator, same day)

1. **Potato / negation pages keep their preposition phrase and drop the SUBJECT** — the
   potato lives in the picture, exactly as the recap chants do:
   the-mat p8 `Not on the… mat!`, the-cot p8 `Not in a… cot!`,
   the-mud p8 `Not in the… mud!`, the-rat p8 `Didn't chase the… rat!`.
   (the-cot uses `a`, not `the`, to match its own cast pages `Ant in a… cot.`)
   `Potato has no… kit!` (the-kit) and `Crew is not… sad!` (the-sad) are already four
   words and were left alone; `Potato in my… sock?` (snake-in-my-sock) already keeps its
   phrase. Those six are the only negation pages in the series — checked by walking every
   reader page for a negation token.
2. **Recap chant punctuation normalised to a single `?!`**: `In my mug?!` ×3 and
   `On a drum?!` ×3 (were `???` and `?????`). Every other chant already ended `?!`.
3. fox-in-a-box p3 stays `Six in a box!`.

Pass 2 also caught a gap in pass 1: `book-works-lessons.ts` stores the letter books'
sentences in the **reveal form with the ellipsis** (`The ant sat on the… mat!`), which the
whole-literal swap did not match. A new one-off,
`scripts/curriculum/dark-phonics-storybooks/_four_word_sync_lessons.py`, re-derives every
`sentence:` / `endingLine` / `rounds[].sentence` in that file from the reader page that
governs it (matched by slug + page number, honouring the source order its own header
records) — 120 sentences rewritten, 0 unresolved. That file now has **0 sentences over
four words**.

Rebuilt for pass 2: the-mat, the-cot, the-mud, the-rat (readers, tracing, works,
paperwork, dp json + shim), monkey-in-my-mug and dinosaur-on-a-drum (readers + tracing +
paperwork; they have no book-works), and all 29 pattern readers re-run so the two recap
changes land. Contact sheets regenerated for all six.

## PROVISIONAL rows — Tredoux to eyeball

| book | page | now reads | note |
|---|---|---|---|
| the-cat-sat | 3, 4 | `Cat on a cat.` / `Cat on a cat!` | near-twins by construction |
| fox-in-a-box (reader) | 3 | `Six in a box!` | keeps the six-fox gag; p2 already cuts to `Fox in a box.` |
| fox-in-a-box (reader) | 4 | `Big fox, big mix.` | |
| hen-in-bed | 4 | `Hen ran to bed.` | |
| the-bell-fell | 4 | `Off the hill!` | |
| mud-pup | 4 | `A mud pup!` | mechanical cut was ungrammatical (`Pup a mud pup.`) |
| jump-in-the-sand | 4 | `A big jump!` | mechanical cut was ungrammatical (`Big in the sand.`) |

## Skipped — no reader built yet (art pending)

`the-vest`, `the-swim`, `the-yam`, `the-zip`, `the-quilt`. Nothing of theirs was touched:
not their dp json, not their shim, not their lesson data. They still carry pre-rule
sentences and must be cut when their art lands.

## Stale files / caveats

- `_to_delete/tracing-proofs/` holds 117 intermediate `-A5-tracing.pdf` proofs; this
  session's shell cannot `rm`, so they were moved there instead of deleted.
- No generator for `lib/montree/dark-phonics/book-works-lessons.ts` is committed anywhere
  in the repo (its header says "REGENERATE rather than hand-edit", but the script is not
  in-tree). It was updated by the same machine substitution as every other source — no
  hand-authored text — but it should be regenerated from its real generator when that
  surfaces, to pick up anything the substitution could not see.
- `materials-out/book-works/**` and `app/montree/dashboard/raz/page.tsx` were already
  dirty in the working tree before this pass.
- `the-cot` / `the-kit` p22 "WORDS IN THIS BOOK" review line overflows the page edge.
  Pre-existing (the review strings are unchanged) — worth a separate fix.
- Nothing was committed, pushed or published to Supabase.

## Files to stage for the commit

```
app/montree/library/dark-phonics/page.tsx
docs/handoffs/HANDOFF_FOUR_WORD_RULE_2026-09-07.md
docs/mission-control/brain.json
lib/montree/dark-phonics/book-works-lessons.ts
lib/montree/dark-phonics/lessons.ts
lib/montree/english-curriculum/spec/easy-readers-manifest-v2.json
scripts/curriculum/dark-phonics-storybooks/_four_word_apply.py
scripts/curriculum/dark-phonics-storybooks/_four_word_structural.py
scripts/curriculum/dark-phonics-storybooks/_four_word_sync_paperwork.py
scripts/curriculum/dark-phonics-storybooks/_four_word_sync_lessons.py
scripts/curriculum/dark-phonics-storybooks/_patched_a5_tracing.py
scripts/curriculum/dark-phonics-storybooks/build_a5_readers.py
scripts/curriculum/dark-phonics-storybooks/manifest.json
scripts/curriculum/flashcards/books_def.py
scripts/curriculum/satpin-paperwork/letters/dp-*.json          (55 files)
scripts/curriculum/satpin-paperwork/shims/dp-*.py              (48 files)
public/dark-phonics-books/print/*-A5-reading.pdf               (40 rebuilt)
public/dark-phonics-books/print/*-A5-booklet-print.pdf         (40 rebuilt)
public/dark-phonics-books/covers/*.png                         (11 rebuilt)
public/dark-phonics-books/works/*/*.pdf                         (186)
public/dark-phonics-books/print/_preview/sheets/*.png           (13 contact sheets)
public/dark-phonics-materials/*/tracing-workbook.pdf            (57 rebuilt)
public/dark-phonics-materials/*/paperwork-pack.pdf              (54, all rebuilt)
public/satpin-materials/dp-*/paperwork-pack.pdf                 (4 legacy mirrors)
materials-out/book-works/*/*.pdf                                (the works source copies)
```

Do NOT stage: `_to_delete/`, `__pycache__/`, `app/montree/dashboard/raz/page.tsx`
(unrelated pre-existing edit).
