# Handoff — Dark Phonics side-cars + Writing Shelf Tray 5 word tin (2026-09-14)

Fable directed, Opus built, Sonnet audited and committed. Two independent pieces of work landed this session.

## What shipped

### A. Dark Phonics Level 1 pipeline — commit `f90c814f4`
`scripts/curriculum/book-works/build_book_works.py` now writes a committed JSON side-car per book to `scripts/curriculum/book-works/sidecars/<slug>.json` (33 books) on every print build, before any drawing happens, and via a new `--sidecars-only` flag that draws nothing at all. The side-cars are deterministic and the directory's `README.md` states they are generated, never hand-edited.

`tests/dark-phonics/book-works-sidecar-conformance.test.ts` holds `lib/montree/dark-phonics/book-works-lessons.ts` to the side-cars and fails on any disagreement (468/468 dark-phonics tests green). All 31 printed books were cross-checked against their PDFs with `pdftotext -layout`: 0 mismatches, no TS drift — the 2026-09-12 cast fix holds.

The side-car distinguishes `characters` (the printed Characters strip — 6, never potato) from `cards` (work rows — 7, where the potato line is resolved). The digital shelf's `cast[]` must equal `cards`, not `characters`.

Levels 2 and 3 of the pipeline are NOT approved yet — Level 1 (side-cars + conformance test) is the only piece shipped.

### B. Writing Shelf Tray 5 word tin (sheet 12) — commit `e2e9e1635`, Railway deploy `37d38226` SUCCESS
Live `12-word-card-tin.pdf` confirmed 200, 55242 bytes.

Tredoux used the old tin in class on Sep 14 and it was "woefully short." His rule: a word for every word on every sentence. Root cause: the tin (`build_12_word_card_tin.py`) only ever derived from sheet 14's 18 sentence cards — sheet 13's 14 story-starter cards were never counted, so 19 words had no card and no story starter had its capitalised lead card.

Tredoux's decisions, now locked in the code and in CLAUDE.md:
- Scope is sheets 13 + 14 only, 32 sentences total. The app's `SENTENCE_BANK` / `WORD_CLASSES` in `lib/montree/dark-phonics/writing-shelf-language.ts` was NOT touched and stays deliberately independent of the printed tin.
- Copies are a SUM across a tier's sentences, not a maximum, so a tier tin can lay every one of its sentences out at once. Pink holds 11 `a` cards because 11 of pink's 16 sentences want one.
- One tin per page, in tray order, each page header naming its tin (each tin prints on its own colour of card stock, matching sheets 13/14).

`sentences()` now reads `build_13.CARDS + build_14.CARDS`; `tier_need()` sums instead of maxing; the free-composition set is derived from both decks; a new `check_buildable()` re-derives from both decks that all 32 sentences are simultaneously buildable and refuses to build otherwise (`build_12_word_card_tin.py --check` runs it with a negative control — verified it actually fails when a sentence is made unbuildable).

Result: 164 cards, 4 single-sided pages — pink 62 / blue 20 / green 37 / free composition 45 (35 words + 10 blanks). Sheet 13's story starters go through sheet 14's `display_words()` so capitalisation and the trailing stop come out right (`cat on a mat` → `Cat` / `on` / `a` / `mat.`); "sheep asleep" splits into `Sheep` + `asleep.`, with `asleep` filed as an adjective.

Tredoux then asked whether blue (20 cards) was really enough. Hand-verified: blue is exactly 6 sentences — *a fox in a box / the ant naps / the ant digs / the cat naps / the cat digs / the sun naps* — which sums to exactly 20 cards (`The`×5, `A`, `a`, `ant`×2, `cat`×2, `sun`, `fox`, `in`, `box.`, `naps.`×3, `digs.`×2). Blue is thin because the curriculum has no blue story starters (sheet 13 has 0 blue cards by design — every card past three-letter CVC on that deck steps straight into a blend), not because the tin under-counts.

Reprinting sheet 12 alone is 4 pages. A rebuild changes only the PDF's `CreationDate`/`ModDate`/`ID`; the drawn content is fully deterministic.

## How to regenerate

Dark Phonics side-cars, no drawing:
```
python3 scripts/curriculum/book-works/build_book_works.py --sidecars-only <slug> [<slug> ...]
```
Full print build (also (re)writes the side-car for each book before drawing):
```
python3 scripts/curriculum/book-works/build_book_works.py <slug> [<slug> ...]
```
Run the conformance test: `npx vitest run tests/dark-phonics/book-works-sidecar-conformance.test.ts`

Writing Shelf word tin, normal build:
```
python3 scripts/curriculum/writing-shelf/build_12_word_card_tin.py
```
Negative-control / buildability check:
```
python3 scripts/curriculum/writing-shelf/build_12_word_card_tin.py --check
```
(Edit `SENTENCE_BUILDER_CARDS` in `lib/montree/dark-phonics/writing-shelf-language.ts` first, then mirror the change into the Python `CARDS` — `check_source()` refuses to build on drift, and it is always TypeScript first.)

## Rules learned

The printed PDF is the source of truth for a book's cast, not the TypeScript — that is why the side-car test reads `pdftotext` output rather than asserting against hand-typed expectations. Potato is never a character; it lives only in the resolved work rows (`cards`), never in the printed Characters strip (`characters`) — conflating the two is the bug the 2026-09-12 session fixed and the side-car test now guards permanently.

The word tin must derive from BOTH sheet 13 and sheet 14, and per-tier copy counts must be summed across every sentence in that tier, never maxed — a tin that maxes instead of sums will always be too short to lay a full tier out at once. Frame colour on Tray 5 cards is the difficulty of the words, not the deck or group a card is filed under (see the carried `fox-box` card, pink-framed inside the blue group, in CLAUDE.md).

## Open items

- Tredoux still owes: running `migrations/356_tracker_the_pat.sql` (the SQL was pasted into chat on 2026-09-13), and eyeballing Work 5 on the-mat (the 7-row free builder, ~49 cards at ~40px) on a real tablet.
- `materials-out/book-works/the-pat/*.pdf` (work1–work4) are modified-but-unstaged, left over from a verification build during the side-car audit — not part of this commit, safe to regenerate or discard.
- `spat` cannot load in `books_def.py` — a pre-existing stale-tile issue, not caused by this session.
- `tests/tracking/writing-shelf-curriculum.test.ts` is a pre-existing failing test (migration 352 vs. emitter drift), unrelated to this session's changes.
- `_to_delete/tsconfig.sidecar.tmp.json` is scratch from the side-car work; safe to delete whenever someone next clears `_to_delete/`.
- Dark Phonics pipeline Levels 2 and 3 are not approved or built — only Level 1 (side-cars + conformance test) shipped.

## Resume prompt for a fresh session

"Read `docs/handoffs/HANDOFF_2026-09-14_SIDECARS_AND_WORD_TIN.md`, then `docs/mission-control/brain.json` checkpoints `DARK_PHONICS_SIDECARS_2026_09_13`, `WRITING_SHELF_TIN_SHEET13_2026_09_14`, and `SESSION_CLOSE_2026_09_14_SIDECARS_WORD_TIN`. Confirm whether Tredoux has run `migrations/356_tracker_the_pat.sql` yet and whether he's eyeballed the-mat Work 5 on a tablet — if both are done, close those open items. Otherwise pick up where this session left off: Dark Phonics pipeline Level 2, or whatever Tredoux directs next."
