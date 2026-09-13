# HANDOFF — Dark Phonics: the digital works match the printed cast (2026-09-12)

## What shipped in `826ae01e9`, just before this

Three fixes landed together earlier the same day, and it's worth being precise
about each one since this handoff's own change set builds directly on the
third.

**The tittle on i and j could never be completed.** `TraceSurface.tsx` drew
the dot above a lowercase i or j, but an old design comment — *"the tittles of
i and j — drawn, never traced: a dot is not a stroke"* — had it right that a
dot isn't a stroke, and wrong about what that meant for the model: the dot was
excluded from `model.dots` sampling entirely, so nothing a child did to it was
ever recorded as progress. A child could trace the stem of the i perfectly and
the page simply would not turn. The fix keeps the dot un-sampled — it's still
not a stroke — but gives it a second life as a tap target: once every stroke
of the word is written (`strokesDone`), each dot still missing lights up green
exactly like a stroke's start dot and waits for a finger. The word isn't
`done` — and the page doesn't turn — until every dot has been tapped as well
as every stroke traced.

**Lesson 4 was teaching the wrong book.** The parent shelf's letter-P lesson
was `the-spat` ("The ___ Spat!"), which is not the book Tredoux teaches — he
teaches `the-pat` ("The ___ Can Pat!"). The swap moved lesson 4's pages, cast,
match rounds, yes/no questions and script over to `the-pat`, with live-page
art generated from the existing `the-pat` print originals rather than new art.
`the-spat` is retired from the shelf and from `tracker-works.ts`, and
`migrations/356_tracker_the_pat.sql` was written to fix the description text
already seeded into every existing classroom's `montree_classroom_curriculum_
works` rows (see Open Items below — it still needs to be run). Print assets
for `the-spat` are untouched; it's still print-only.

**Lesson 5's potato card was reciting a question, not an answer.** `the-pit`
ends on the unresolved cliffhanger "And the…?!" over its potato page, and that
cliffhanger had been lifted straight into the potato *work* card — a child was
asked to match a picture to a sentence that isn't a sentence. The fix (via
`sync_lessons.py`'s `CARD_OVERRIDE`, at the time) forced the resolved line
"The potato sat in the… pit!", sourced from `dp-the-pit.json`, onto that one
card. That override does not survive this session's change set — see below,
it turned out to be solving a problem that a truer read of the print made
disappear a different way.

## What this second commit does

Every printed Dark Phonics work sheet — the picture-match work, the
sentence-and-picture work, both sentence-builder works — uses the book's
**whole** cast. The digital shelf's `book-works-lessons.ts` had been rendering
only four characters for every letter book from lesson 3 through lesson 18,
because it was originally cut from a different, four-item worksheet pack (see
Root Cause below) rather than from the works themselves. A child doing Work 2
on the tablet met four characters; the same child doing the identical work on
paper met six or seven. This commit widens the digital cast, `matchOrder` and
`rounds[]` to match print, for every lesson where print disagrees with what
was there:

| Lesson | Book | Cast before | Cast after | Potato |
|---|---|---|---|---|
| 3 | the-sat | 4 (ant, snake, star, cat) | 6 (+ apple, sun) | never had one |
| 4 | the-pat | 4 (ant, snake, star, cat) | 6 (+ apple, sun) | never had one |
| 5 | the-pit | 4 (ant, snake, cat, **potato**) | 6 (+ apple, sun, star) | **removed** |
| 6 | the-nap | 4 (ant, snake, cat, potato) | 7 (+ apple, sun, star) | kept |
| 7 | the-mat | 4 | 7 (+ apple, sun, star) | kept |
| 8 | the-sad | 4 | 7 (+ apple, sun, star) | kept |
| 9 | the-dig | 4 | 7 (+ apple, sun, star) | kept |
| 10 | the-dog | 4 | 7 (+ apple, sun, star) | kept |
| 11 | the-cot | 4 | 7 (+ apple, sun, star) | kept |
| 12 | the-kit | 4 | 7 (+ apple, sun, star) | kept |
| 13 | the-cat-sat | 5 (word tiles, not characters) | unchanged | n/a |
| 14 | the-egg | 4 | 7 (+ apple, sun, star) | kept |
| 15 | the-mud | 4 | 7 (+ apple, sun, star) | kept |
| 16 | the-rat | 4 | 7 (+ apple, sun, star) | kept |
| 17 | the-hot | 4 | 7 (+ apple, sun, star) | kept |
| 18 | the-bug | 4 | 7 (+ apple, sun, star) | kept |

Lesson 2 (`ant-on-my-apple`) and lessons 19–21 (the Easy Readers `the-fast` /
`the-lost` / `the-jump`) are untouched on purpose: the a-words book's printed
cast really is four, and none of the three Easy Readers has a printed works
pack to check against at all. `questions[]` — the spoken yes/no work — did not
widen either; it has no printed sheet of its own, so print can't govern it.

`the-pit` needed the opposite move from everything else: it had picked up a
**seventh potato card it should never have had**. `dp-the-pit.json` gives p9 a
resolved line, and the `CARD_OVERRIDE` fix in `826ae01e9` (described above)
used that resolved line to build a potato work card — but the printed
`the-pit` works pack prints six boxes, not seven, because `build_book_works.
py`'s `characters_of()` names a character from the page's own sentence, and an
unnamed cliffhanger page never becomes a printed box. The seventh card was a
card no child ever held on paper. It's gone now, and `CARD_OVERRIDE` — whose
only entry it was — is deleted with it, not just emptied, so nothing is left
around to be quietly reapplied later. `pages[]` and `endingLine` are
untouched: the potato is still `the-pit`'s p9 end-page reveal and "And the…?!"
is still its last line. This reverses part of what `826ae01e9` did that same
morning, and it's recorded here so it isn't quietly re-made the other way
again: **the-sat, the-pat and the-pit end on the unnamed cliffhanger and print
six; every other sat-cast book resolves the potato's line and prints seven.**

`matchOrder` at the wider lengths follows the same shape the four-card files
already used — the even slots in order, then the odd ones — with the same
minimal repair (swap the offending slot with its neighbour) wherever that
would otherwise leave a card facing its own twin. `rounds[]` widened one round
per cast card, `candidateIds` rotated to start one after the answer so the
answer still lands last, exactly as the four-card rounds always did. None of
this is a new invention — it's the dp files' own four-card pattern, generalized
and re-applied by `sync_lessons.py`, not a one-off script (the one-off applier
that first did this work has been deleted; its header claimed a source the
printed PDFs contradict, and a runnable tool carrying wrong data is worse than
no tool).

The shelf UI needed three changes to stop silently assuming four:

- **`work-engine.tsx`'s pile packer.** `packPile()` bisects a scale that fills
  the tray exactly, then nudges each card inward and jitters it for a natural,
  heaped look. At four cards there was always slack for the jitter to land in.
  At a widened cast — the-mat's seven-row free builder scatters close to fifty
  cards — the bisection leaves no slack at all, and the jitter pushed the
  bottom shelf of cards straight through the floor of the tray and over the
  work sheet underneath. Cards are now clamped to the tray's actual edge after
  the jitter is applied, not just offset by it.
- **`MatchWork.tsx`'s pile tray.** Its width was a fixed Tailwind class,
  copied by hand into the live stage and the control board with a "change one,
  change the other" comment holding them in sync — exactly the kind of
  duplication a cast-length change slips past. It's now one function,
  `pileTrayClass(pieceCount)`, called from both places, that grows the tray's
  share of the stage as the piece count grows.
- **`BookWorks.tsx`'s two step layouts.** `StepMatch` (Work 2/3) used to give
  every row a fixed 86px regardless of cast size; rows now share the height
  the tray actually has, clamped between a finger (56px) and that old 86px
  ceiling, so six or seven rows fit without a fixed board overflowing.
  `StepFind`'s candidate grid was a fixed two-column grid, which at five or
  seven candidates stranded the last card alone on the left of its own row; a
  new `candidateColumns(n)` picks a column count that always closes on a
  centred final row instead.

## The root cause, plainly

`lib/montree/dark-phonics/book-works-lessons.ts` was never generated from the
printed work sheets. It was cut, once, from `scripts/curriculum/satpin-
paperwork/letters/dp-<slug>.json` — a *different* worksheet pack, one that
legitimately caps at four items per book, built for a different purpose. The
file's own header says, in capitals, "REGENERATE rather than hand-edit" — but
no generator from the dp-json pack to this file, or from anything else to this
file, has ever existed. It has always been maintained by a mix of hand edits
and `sync_lessons.py`'s regex surgery on the file's own text. Nobody had
noticed the four-item cap was wrong, because nobody had checked the digital
lesson data against the print.

**Record this as the standing rule: the printed work PDFs under
`public/dark-phonics-books/works/<slug>/` are the source of truth for a
work's cast. The `dp-*.json` pack under `scripts/curriculum/satpin-paperwork/`
is not**, and was never meant to be — it's a real, correct pack for its own
purpose, it simply isn't this one.

Worth flagging honestly: an early scout in this session got this backwards —
it read the dp-json pack, concluded four was correct, and only the print PDFs
themselves, extracted with `pdftotext -layout` and counted by hand, settled
which books are six, which are seven, and which single book (`the-sat`) has
its own book-order rather than the shared sat-cast order. The next session
touching this file should do the same: open the actual PDF under `public/
dark-phonics-books/works/<slug>/`, not the JSON that happens to sit next to
the generator.

## Product decisions recorded here

- **The potato is not a character in the Characters work.** This is Tredoux's
  call from 8 September, reaffirmed by him again on the 12th when this cast
  question came back up. The potato is not printed on the Characters strip in
  any book, and none of this session's changes add it there.
- **The potato remains the end-page reveal.** `pages[]`, `endingImage` and
  `endingLine` are untouched everywhere in this change set — only `cast[]`,
  `matchOrder`, `rounds[]` and the questions that reference cast art moved.
- **`the-pit` prints six with no potato.** `the-mat` and the rest of the
  sat-cast books print seven, potato included. Both are correct; they are
  different books.
- **Lesson 4 is the pat book, not the spat book.** This reverses the
  `retired_note` on `pig-ate-a-pineapple` in `scripts/curriculum/dark-phonics-
  storybooks/manifest.json`, which used to read simply "do not resurrect this
  one" for the P slot. `826ae01e9` updated that note in place to record the
  supersession explicitly — *"Superseded 2026-09-12: the letter-P book is The
  ___ Can Pat! (the-pat); The ___ Spat is print-only now. Either way, do not
  resurrect this one"* — so a future session reading that note doesn't wonder
  whether the-pat itself is also banned. It isn't; the-spat is.

## A pipeline for this, in three sizes — none of them decided

None of the three levels below is approved. They're recorded so the next
session (or Tredoux) has real options rather than having to rediscover the
shape of the problem from scratch.

**Level 1 — a committed side-car per book.** Have `build_book_works.py` emit a
small JSON file next to each book's PDFs — cast, sentences, match order — and
add a conformance test to `.github/workflows/tests.yml` that fails when the
digital lesson data disagrees with it. This is close to free: `characters_of()`
(`build_book_works.py:1762`) is already a pure function that returns exactly
the cast list this needs, and `load_book()` (`:1094`) already returns a clean
tuple of everything else before any drawing happens. The data already exists
in memory during every print build; right now it's simply discarded once the
PDF is drawn. The one real obstacle: `public/dark-phonics-books/` is
gitignored, so a CI test has nothing to read the PDFs against — the side-car
*is* what makes a CI test possible at all, not an optional nicety on top of
one.

**Level 2 — generate `book-works-lessons.ts` itself from that side-car.**
Roughly 90% of the file's 1213 lines are mechanically derivable from a side-car
like Level 1's — art paths, sentences, cast, match order, rounds, the
`imageArt`/`imageWord` resolution. The irreducible, hand-authored remainder is
`script[]` (the teacher's spoken script, roughly 100–120 lines spread across
20 lessons) and product overrides like the lesson-4 book swap, which are
editorial calls no PDF encodes. This level would also retire `scripts/
curriculum/dark-phonics-storybooks/sync_lessons.py`, which today does regex
surgery on the TypeScript file's *text* rather than generating the file — and
which silently clobbered a fix earlier today (the `CARD_OVERRIDE` entry it
carried was itself a patch over a wrong cast; a generator working from the
side-car wouldn't need a card-level override to exist in the first place).

**Level 3 — one source of truth for everything.** Print, digital, tracker
names (`tracker-works.ts`), `lessons.ts`, and both language tracks all read
from one place. Not scoped, not estimated, genuinely just named so it's on
the map.

**Recommendation, for what it's worth: Level 1 next, Level 2 when the next
book is authored** rather than as a standalone refactor — a generator is
easiest to trust when it's proven against a book being built for the first
time, not retrofitted under 27 existing ones at once. Tredoux has not signed
off on this recommendation or on doing any of the three levels at all.

## Open items

**`migrations/356_tracker_the_pat.sql` still needs to be run by him.** It
fixes the `description` text already seeded into every existing classroom's
tracker rows for the five `dp:p:*` works (created by migration 344, before the
the-pat swap). It's idempotent — safe to re-run — and reads:

```sql
BEGIN;

UPDATE montree_classroom_curriculum_works
   SET description = 'Characters — The ___ Can Pat!'
 WHERE work_key = 'dp:p:1'
   AND description = 'Characters — The ___ Spat!';

UPDATE montree_classroom_curriculum_works
   SET description = 'Picture match — The ___ Can Pat!'
 WHERE work_key = 'dp:p:2'
   AND description = 'Picture match — The ___ Spat!';

UPDATE montree_classroom_curriculum_works
   SET description = 'Sentence & picture match — The ___ Can Pat!'
 WHERE work_key = 'dp:p:3'
   AND description = 'Sentence & picture match — The ___ Spat!';

UPDATE montree_classroom_curriculum_works
   SET description = 'Sentence builder (guided) — The ___ Can Pat!'
 WHERE work_key = 'dp:p:4'
   AND description = 'Sentence builder (guided) — The ___ Spat!';

UPDATE montree_classroom_curriculum_works
   SET description = 'Sentence builder (free) — The ___ Can Pat!'
 WHERE work_key = 'dp:p:5'
   AND description = 'Sentence builder (free) — The ___ Spat!';

COMMIT;

-- Verify (expect 0 rows):
--   SELECT classroom_id, work_key, description
--     FROM montree_classroom_curriculum_works
--    WHERE work_key LIKE 'dp:p:%' AND description LIKE '%Spat%';
```

**Work 5 at seven rows needs a real tablet in hand.** The sentence-builder
free-tray work at a seven-character cast scatters roughly 49 cards into a tray
sized by `pileTrayClass()`'s widest bracket, at roughly 40px tall each by the
math — small enough that it deserves an actual eyeball on an actual tablet
before it's trusted, not just a passing test suite. Nobody has done that yet
this session.

**`tsconfig.dpcheck.json` may still need deleting by hand.** It was a previous
agent's scratch tsconfig (scoped `include` over exactly the dark-phonics
lib/component trees, to make a full-repo `tsc --noEmit` avoidable on this ~4GB
VM). This session's `rm` succeeded, so as of this handoff it's already gone —
but earlier sessions had hit "Operation not permitted" trying to remove
scratch files on this mount, so if a future session finds it back, that's why,
and Desktop Commander (direct Mac shell, not the sandboxed device mount) is
the way to actually remove it.

## Verification

`npx tsc --noEmit` scoped to `lib/montree/dark-phonics/**` and `components/
montree/dark-phonics-live/**` (via a temporary include-scoped tsconfig, since
a full-repo run OOMs this VM): clean, exit 0, 637 files resolved including
dependencies. `vitest run` filtered to the dark-phonics suites: 361 of 361
passing across three files (`tracker-works.test.ts`, `sentence-builder-cards.
test.ts`, `dark-phonics-v2-shelf.test.ts` — up from the 360 baseline, since
`tests/dark-phonics-v2-shelf.test.ts` picked up new assertions for the wider
casts as part of this change set).

---

## Level 1 SHIPPED (2026-09-13)

The first of the three levels above is built. Level 2 and Level 3 remain
unapproved and unstarted, and the recommendation is unchanged: Level 2 when the
next book is authored, not as a standalone refactor.

**What exists now.** `build_book_works.py` writes a committed JSON side-car per
book to `scripts/curriculum/book-works/sidecars/<slug>.json`, recording exactly
what that build draws: the Work 1 strip cast from `characters_of()`, the Works
2–5 rows from `load_book()`, the book's pages, and the pair order. It is
written on **every** print build, before any drawing, so the committed JSON
cannot fall behind the PDFs it transcribes; a new `--sidecars-only` flag emits
for one slug, several, or (with no slug) every slug the script knows, drawing
nothing at all. Output is deterministic — sorted keys, stable ordering,
trailing newline, identical md5 across runs — and first-language only: the
second-language track rewords every sentence, so `--sidecars-only --track
second-language` is refused with a message rather than quietly writing
side-cars nobody would want committed.

33 side-cars were written. One slug, `spat`, cannot load at all — `books_def.py`
carries a stale art path for it (`tiles/BK4-p6.png`). That is pre-existing, it
is not on the shelf, and the sweep now reports and skips an unloadable book
rather than dying on it, so one broken entry cannot stop the other thirty-odd
being written.

**The conformance test** is `tests/dark-phonics/book-works-sidecar-conformance.
test.ts` — 106 assertions, vitest, the house runner. `.github/workflows/
tests.yml` needed **no change**: it runs `npx vitest run`, and
`vitest.config.ts` already globs `tests/**/*.test.ts`.

**No drift was found.** Every lesson on the shelf already agrees with the print
— the 12 September cast fix holds, and this is now held in place rather than
merely believed. To be sure the test can actually fail, `the-mat`'s side-car
was deliberately truncated to four cards: three assertions failed, naming the
slug and the field, and the side-car was regenerated.

### What the print governs, and what it does not

Every side-car whose book has a printed pack — 31 of the 33 — was cross-checked
against the actual PDFs with `pdftotext -layout` (the `work0` control page for
the strip, the `work2` control page for the rows). **31 of 31 exact, zero
mismatches.** But two things had to be got right first, and both are traps:

**🚨 The two casts are not the same list, and not the same length.** `the-mat`'s
Work 1 strip prints SIX — ant, apple, sun, star, snake, cat — because the potato
is excluded from the Characters work by standing product decision. Its Works 2–5
sheets print SEVEN, the potato's resolved line included. Both are read straight
off the PDFs. The shelf's `cast[]` drives the match and round works, so it must
equal the side-car's **`cards`**, never its `characters`. Anyone comparing it to
`characters` will "find" a bug in every book that resolves its potato. The
side-car carries both lists, under those two names, and says so in the file that
emits it.

**🚨 Print governs which cards exist, in what order, with what sentence — and
nothing else.** Three things were nearly asserted verbatim and must not be:

- **Card ids are the shelf's own keys.** `the-bug`'s last row reads "The bug saw
  a… potato!"; its subject noun is *bug*, and the shelf sensibly keys the card on
  the *potato* it pictures. `the-cat-sat`'s five cards are word tiles — cat, sat,
  on, cats, tip-top — not characters at all. Both are correct. The side-car emits
  a derived `subject` per row for a human reading the file, and the test never
  asserts it.
- **`matchOrder`'s exact permutation is not printed.** A work sheet has no
  shuffle; it prints its rows in book order. Lesson 2 takes its order straight
  from `dp-ant-on-my-apple.json`'s `matchDisplayOrder` and lesson 13 is
  hand-authored — neither follows the `[2, 4, 1, 3]` rule this handoff's own
  earlier section describes as universal. It is not. The side-car emits
  `derivedMatchOrder` as a reference shape, clearly labelled advisory, and the
  test holds the shelf to the real invariant instead: the order is a permutation
  of the PRINTED cards and a derangement. The same applies to `rounds` — one per
  printed card, in printed order, each quoting its own card, but not a fixed
  rotation.
- **Art file names differ between print and shelf.** `the-pit` prints
  `pit-p2.png` where the shelf serves `p2-ant.png`, and two books legitimately
  draw their `pages[]` from a different source than their works pack
  (`ant-on-my-apple` from the storybook manifest, four pages against the shelf's
  six). Comparing basenames fails on both. The test asserts the
  source-independent thing instead: **a card must show the lesson's own page
  that carries that card's sentence.**

### How to regenerate

```
python3 scripts/curriculum/book-works/build_book_works.py --sidecars-only
python3 scripts/curriculum/book-works/build_book_works.py --sidecars-only the-mat
```

Side-cars are GENERATED — never hand-edit one. The printed PDFs remain the
source of truth; when the conformance test fails, the print wins over the
TypeScript, and a **stale** side-car is fixed by re-running the command, never by
editing the JSON. `scripts/curriculum/book-works/sidecars/README.md` says the
same thing next to the files.

### Still unverified against print

`an-apple-for-ant` and `sit-sit-sit` get side-cars but have no printed works
pack, so nothing cross-checked them and no lesson reaches them. The three Easy
Readers the shelf does carry — `the-fast`, `the-lost`, `the-jump` — have no
printed pack either and are named explicitly in the test's
`SHELF_SLUGS_WITHOUT_PRINTED_PACK`, so a book that loses its side-car by
accident fails rather than quietly opting out.
