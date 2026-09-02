# Handoff — Parents shelf goes live: clean sentences, booklet-matched reader, Characters work (2026-09-02)

**Read this if you're about to touch the Dark Phonics library page, the letter-card print
route, `/parents` (or `/montree/parent/lessons`), anything under
`components/montree/dark-phonics-live/v2-shelf/` or `lib/montree/dark-phonics/v2-shelf/`,
or `scripts/curriculum/book-works/build_book_works.py`.**

## What shipped (five commits, same day)

1. **`0b62c0b` — Dark Phonics: printables shelf restructure + V2 digitised shelf on
   `/parents`.** The library page's per-book pill row reordered to Book · Tracing
   workbook · Paperwork pack · Characters · Work 1–4; Read-along hidden (code kept,
   `SHOW_READ_ALONG = false`); Build-it sheet removed. `/parents` and
   `/montree/parent/lessons` now mount the V2 shelf (`ParentLedLessons` →
   `ShelfPlayer`) as the only experience — the old eight-step `BookWorks` player is no
   longer offered a choice there (it stays live for the classroom clients).
2. **`ea18ec7` — Parents shelf: control card renders the finished board exactly; old
   guided player removed from `/parents`.** The control-of-error overlay
   (`ControlCard.tsx`) now draws the SAME measured `slotRects`/card layer the live
   board uses, so it is pixel-identical to what the child saw before Start and will see
   again on completion — not a lookalike table.
3. **`111aebc` — Parents shelf: tracing is now a flipping tracing workbook.** Tracing
   stopped being a single-word stage and became `TraceBook.tsx`: a react-pageflip book
   derived from the reader itself (`tracing-book.ts`), one hero word per page, the page
   turning itself half a second after the word is finished.
4. **`f0d2056` — Book works: Work 3 cuts out only the changing word; identical words
   interchangeable in Work 4.** Both the Python printable and the TS digital work now
   derive which word columns change row-to-row (`changingWordColumns()`); Work 4's
   matching is by `wordKey`, not card id, so two cards reading "The" are interchangeable.
5. **`e2cc75e` — Dark Phonics shelf: clean sentences, booklet-matched reader,
   Characters work (digital + printable).** `cleanSentence()`/`clean_sentence()` (TS and
   Python, kept in lockstep) turn "The ant…" + "Sat!" into "The ant sat!" everywhere a
   sentence is set in a work. The digital reader's page list became the PRINTED
   booklet's page list, leaf for leaf. The new Work 0 "Characters" strip — digital
   (`CharacterStrip.tsx`) and printable (`build_work0` in `build_book_works.py`) — went
   in beside the book. `STORYBOOK_PRINT_VERSION` bumped 24 → 27 across this pass (25 for
   the clean-column work, 26 for a same-day tracing-workbook rebuild fix, 27 for the
   clean-sentence + Characters rebuild — see `HANDOFF_TRACING_WORKBOOK_FIX_2026-09-02.md`
   for the 26 bump, which is a sibling fix from the same day, not part of this five-commit
   set).

Two more commits landed the same day but are **not part of this feature** and are called
out only so `git log` doesn't look like it's missing something: `0d019b1` (rebuilt all 16
sat-cast tracing-workbook PDFs to the hero-word standard, bump to 26) and `6bec723`
(unrelated: a week-2 circle-time page).

## The owner's rules (verbatim-ish — read code, not commit messages, to re-verify)

**Dark Phonics library page** (`app/montree/library/dark-phonics/page.tsx` +
`letter-card/[n]/page.tsx`):
- Per lesson, a **Letter card** pill (`l.sound` gate) links to
  `/montree/library/dark-phonics/letter-card/<n>` — a print route, not a PDF: page 1 is
  the cover of each of the lesson's book(s) (up to 2), the last page is the letter of the
  week enormous with the catchphrase beneath. `@page { size: A4 portrait; margin: 0 }` in
  a `<style dangerouslySetInnerHTML>` tag (Turbopack rejects nested `<style jsx>`, and
  `@page` cannot be scoped). A bad `n` (no matching lesson) shows "That lesson doesn't
  exist." with a back link instead of crashing.
- Read-along pill hidden behind `SHOW_READ_ALONG = false`, code kept, PDFs stay on disk.
- Book pill labelled **"Book"** (was "Print booklet A5").
- Build-it sheet pill removed entirely (PDFs stay on disk, not linked).
- Per-book pill order, exactly: **Book · Tracing workbook · Paperwork pack · Characters ·
  Work 1 · Work 2 · Work 3 · Work 4** (`BookPrintablePills` in page.tsx — Read-along sits
  before Book but is dark today).
- `STORYBOOK_PRINT_VERSION = 27` (page.tsx:63) — cache-busts the print PDFs, which carry
  no versioning of their own and sit behind a multi-hour Cache-Control.

**`/parents` and `/montree/parent/lessons`** (`ParentLedLessons.tsx` → `ShelfPlayer.tsx`):
shelf only, no old eight-step player mounted there, no "V2" string anywhere in the UI
(grepped clean). Per lesson, in shelf order:
1. **Letter card** (`LetterCard.tsx`) → **Book** (`BookReader.tsx`, react-pageflip via
   `FlipBookCore.tsx`) with the **Characters strip** standing beside it
   (`CharacterStrip.tsx`, wraps the book as `children`) — booklet-matched leaf order:
   cover · blank · half-title · `[text page, art page]` × N spreads · WORDS IN THIS BOOK ·
   0–3 filler pages (my words / my picture / I can read) · back cover (`books.ts`,
   `buildShelfBook()`). Tap-the-cover opens the book (`data-book-cover`, only rendered
   when `index === 0`). Characters strip: boxes in first-appearance order
   (`charactersForBook()` walks `lesson.pages` in book order, de-duped by art), a correct
   piece settles into its box, a wrong one flows back to the pile (shared drag engine),
   the control card shows the strip filled — same mechanism as the four works.
2. **Works 1–4** (`MatchWork.tsx` driving `work-engine.tsx`'s `useWorkBoard`): every work
   opens with the board already finished (Montessori presentation-first); pressing Start
   scatters every movable card into a jumbled, deterministically-seeded pile
   (`packPile()`, bisection-sized, centred); a correct drop **settles** into any slot
   whose `accepts` equals the card's `matchKey` (match by word/sentence/picture identity,
   not card id — two cards reading "The" are interchangeable); a wrong drop flows back to
   the pile in silence, no mark, no counter. Work 3 cuts out **only the columns that
   change** row to row (`changingWordColumns()`); the static words stay printed in the
   cell (`fixedText`) with a faint grey guide word under the cut slot. The control card
   (`ControlCard.tsx`, hold-to-peek) renders the identical finished board, from the same
   measured `slotRects` — not a lookalike.
3. **Tracing workbook** (`TraceBook.tsx` + `tracing-book.ts` + `TraceSurface.tsx`): a
   flipping book derived from the just-read reader (`tracingBookFrom(book)`), one hero
   word per page, tap-the-cover opens it, every other page turns itself half a second
   after `TraceSurface` reports the word complete (`handleComplete` → `turnNext`), "All
   done" status once the back cover is reached.
- `playAudio()` (`lib/montree/dark-phonics/v2-shelf/audio.ts`) is called at every moment
  that will eventually carry a recorded clip (a page turn, a card landing home, a letter
  sounding) but is a documented no-op today — "PURE-ISH BY LAW: no imports, no React, no
  side effects beyond the (currently absent) playback itself."
- **Nothing is persisted or scored.** The only `localStorage` write in this whole feature
  is `montree_parent_last_lesson` (a convenience "last opened" hint, read via
  `useSyncExternalStore` for hydration safety — never a `useState` initializer or a
  `useEffect` that sets state on mount).

**Sentences** — `cleanSentence()` (`lib/montree/dark-phonics/v2-shelf/works.ts`) and
`clean_sentence()` (`scripts/curriculum/book-works/build_book_works.py`), each carrying a
comment pointing at the other as the rule's mirror:
1. drop a trailing "…"/"..." off the lead-in (with its surrounding whitespace);
2. join lead-in + reveal with a single space;
3. lower-case the reveal's first letter — UNLESS the reveal opens the sentence (empty
   lead-in), or it is the pronoun "I", or it is a proper noun / ALL-CAPS word (a capital
   anywhere past the first letter is the tell);
4. exactly one terminal mark, priority "!" > "?" > ".", taken from the reveal's own
   trailing punctuation run;
5. a reveal that already closes inside a quotation mark keeps its own mark, no second one
   appended (mirrors Python's `_QUOTED_END_RE` branch).
   `"The ant…" + "Sat!" → "The ant sat!"`. Covered by 320 passing Vitest cases in
   `tests/dark-phonics-v2-shelf.test.ts`.

**Printables** (`build_book_works.py`):
- Work 3's cut sheet carries **only the changing columns** — the static words print in
  ink on the working sheet, the cut sheet's tabs are the swap words only.
- Work 0 "Characters": a 65mm strip of blank bordered boxes on the front, the same boxes
  with the characters printed in them (mirrored) on the duplex back — the control — plus
  a cut sheet of character picture tabs.
- Works 1–4 print the clean sentence, never the book's own ellipsis reveal.

## Architecture map — files, responsibilities, data flow

```
book-works-lessons.ts (ported book text, one source of truth)
        │
        ├─▶ lib/.../v2-shelf/books.ts        buildShelfBook()   → ShelfBook (reader pages,
        │                                                          booklet leaf order)
        │         │
        │         ├─▶ v2-shelf/tracing-book.ts  tracingBookFrom() → TracingBook (reader with
        │         │                                                  one page swapped)
        │         │
        │         └─▶ components/.../BookReader.tsx → FlipBookCore.tsx (react-pageflip,
        │                                               ssr:false) → BookPageFace.tsx (leaf
        │                                               rendering, faithful to the print face)
        │
        ├─▶ lib/.../v2-shelf/works.ts         buildWorks() → WorkSpec[] (work1..4)
        │                                     buildCharactersWork() → WorkSpec (characters)
        │         │  cleanSentence(), changingWordColumns(), wordKey(), seededShuffle()
        │         │
        │         └─▶ components/.../work-engine.tsx  useWorkBoard() (the one drag/pile/
        │              settle/control-of-error engine every work + the strip share)
        │                    │
        │                    ├─▶ MatchWork.tsx          (works 1–4 stage chrome)
        │                    └─▶ CharacterStrip.tsx      (wraps BookReader as children,
        │                                                 opens scattered)
        │
        └─▶ components/.../TraceBook.tsx → TraceBookFace.tsx → TraceSurface.tsx (the
             finger-trace surface: strokes.ts geometry, auto-flip on completion)

components/.../ShelfPlayer.tsx   — orders the whole lesson: letter → book(+characters) →
                                    work1..4 → trace. Owns `visited`, nothing else — no
                                    score, no persistence.
components/.../ParentLedLessons.tsx — the picker (both /parents and the parent portal
                                    mount this one component, deliberately no auth inside it)
                                    → opens ShelfPlayer.

Printables (parallel Python pipeline, same rules, independently maintained):
scripts/curriculum/book-works/build_book_works.py
    clean_sentence() · changing_word_columns() · build_work0()/characters_of() ·
    build_work3() → materials-out/book-works/<slug>/*.pdf (gitignored, dev-only)
```

## Publish procedure for printables

1. Edit `scripts/curriculum/book-works/build_book_works.py`.
2. `python3 scripts/curriculum/book-works/build_book_works.py <slug> [<slug> ...]` —
   writes 5 PDFs per slug (work0–work4) into `materials-out/book-works/<slug>/`.
3. Copy those PDFs into `public/dark-phonics-books/works/<slug>/` — this directory is
   gitignored and served straight off disk/Supabase, `materials-out/` is dev-only.
4. `node scripts/curriculum/publish-static-materials.mjs --since <date>` uploads the
   changed files to the Supabase static-assets bucket (idempotent upsert — safe to
   re-run). For a large batch (all 30 slugs = 150 files), upload in small explicit-file
   batches rather than one all-slugs invocation — a single 180s remote-shell call cannot
   finish a full run (~30-45s per ~5MB PDF serially).
5. Verify by direct bucket listing (file count), not just script exit code.
6. Bump `STORYBOOK_PRINT_VERSION` in `app/montree/library/dark-phonics/page.tsx`, commit,
   deploy — this is what busts the PDFs' multi-hour/7-day Cache-Control. **Do not bump
   pre-emptively before Tredoux has approved the visual change** (see
   `HANDOFF_BOOK_WORKS_PICTURE_LEFT_2026-08-31.md` for the incident this rule comes from).

## How to add a new book

1. Land the book's text in `book-works-lessons.ts` (or whichever upstream source that file
   ports from — its own header records which of the disagreeing Python sources governs
   each field).
2. It must have a `works: true` book on some lesson and a corresponding
   `BOOK_WORKS_LESSON_NUMBERS` entry — `buildShelfBook`/`buildWorks`/
   `buildCharactersWork` derive everything else from `getBookWorks(lessonNumber)`, no
   hand-authored TS per book.
3. If the book has no page text yet, it will surface on `/parents` in the greyed
   "Coming soon" row (`SHELF_COMING_SOON` in `ParentLedLessons.tsx`) automatically — no
   edit needed there either; it leaves that list the day its text lands.
4. Run `build_book_works.py <slug>` and follow the publish procedure above for the
   printable side.
5. Add the book to the library page's `l.books` lesson entry
   (`lib/montree/dark-phonics/lessons.ts`) with `works: true` if it isn't already there —
   `BookPrintablePills` picks up the Characters/Work 1–4 pills automatically off that flag.

## Known gaps

- **Audio is entirely placeholder.** `playAudio()` is a documented no-op; every call site
  that will eventually carry a recorded clip already calls it, so wiring a real player is
  a one-file change (`v2-shelf/audio.ts`) with zero call-site changes elsewhere.
- **8 lessons show "Coming soon" on the shelf** — their printed works exist but their book
  has no page text in the repo yet (`SHELF_COMING_SOON`, derived, not hand-listed).
- **Narrow-phone Work 3/4 layout is unverified on a real device.** The column-weight math
  (`wordColumnWeights`) and the pile packer (`packPile`) were tested against the Vitest
  suite and eyeballed in a browser, not against an actual small-screen phone.
- **react-pageflip has a CSS-based fallback** (`BookReader.tsx`/`TraceBook.tsx`'s "plain"
  mode): if the `react-pageflip` chunk doesn't announce itself within 4s the reader/trace
  book fall back to a dependency-free 3D card-turn pager with the same pages/faces/turn
  logic. This fallback exists and is wired but has not been forced-tested (e.g. by
  blocking the chunk) as part of this audit.

## Gotchas learned this session

- **`NODE_ENV=production npm install` prunes devDependencies** — if `vitest`/`eslint`
  commands start failing with "command not found" after an install, check `NODE_ENV`
  wasn't set to `production` for that install.
- **`public/dark-phonics-books` is gitignored** and served from Supabase, not the git
  repo — a `git status` showing it "untracked" after a rebuild is expected, not a mistake
  to fix by adding it.
- **The remote bridge to the owner's Mac flaps.** When it does, the working pattern is:
  clone the repo into the cloud container, make the edit there, produce a small unified
  diff, stage it back to the device under `_claude_stage/*.patch`, and apply it on the
  device side once the bridge is back — rather than trying to force a long-running
  device-side edit through a flapping connection.
- **`BookWorks.tsx` must never be deleted.** The live classroom clients still render it
  directly; only its *mount inside `ParentLedLessons.tsx`* was removed. A search for
  "delete the old player since parents doesn't use it any more" is the wrong instinct —
  check every mount site first.
- **`package-lock.json` changes should be limited to the one new dependency
  (`react-pageflip`)** — a wider lockfile diff on a PR that's supposed to be "add one
  npm package" is worth a second look before merging.

## Audit trail

An independent audit of all five commits — `tsc --noEmit` (scoped tsconfig), `eslint
components/montree/dark-phonics-live/v2-shelf --max-warnings=0`, `vitest run
tests/dark-phonics-v2-shelf.test.ts` (320 tests), and live checks against
`teacherpotato.xyz`/`montree.xyz` — passed clean with no blockers, on 2026-09-02. See
git history / session notes for the full findings list (no code changes were required).
