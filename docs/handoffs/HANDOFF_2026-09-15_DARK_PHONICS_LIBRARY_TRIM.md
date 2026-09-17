# HANDOFF — Dark Phonics library: trim to one track, trim the printables row (2026-09-15)

## What shipped in `c4648660c`

Owner decision, Tredoux, 2026-09-15: the teacher library page
(`app/montree/library/dark-phonics/page.tsx`) stops offering a choice of
book version, and stops printing the pack in full. Two changes, both in that
one file, both reversible without deleting anything.

**The First language / Second language / A5 variant row is gone.** The
`TrackTabs` component used to let a teacher open one of three tabs per
lesson and get a different set of pills depending which was open. It no
longer renders. Every printable on every lesson now comes from a single
constant:

```ts
const PRINTABLE_TRACK: Track = 'second';
```

`'second'` is the second-language track — every reader sentence four words
or fewer — because it is the simplest build available, not because the
first-language book was retired. `TrackTabs`, `hasTrack`, the first-language
roots and the A5 roots are all still in the file, untouched, just unused
(`void TrackTabs;` keeps the unused-vars lint from firing on the now-dead
component). See "How to restore" below.

**The printables row is trimmed to what a teacher actually hands out day to
day.** Per book, the page now shows exactly:

- Letter card (untouched, not part of this change)
- Book
- Tracing workbook (moved up to sit beside Book, unchanged position from
  before this commit)
- Work 1 · Characters (`<slug>-work0-characters.pdf`)
- Work 2 · Picture match
- Work 3 · Sentence match (`<slug>-work2-sentence-picture-match.pdf`)
- Work 4 · Sentence builder (`<slug>-work4-sentence-builder-free.pdf`)

Hidden behind `const SHOW_HIDDEN_PRINTABLES = false`: the Paperwork pack,
Work 4 guided (`-work3-sentence-builder-guided.pdf`) and Work 4 v2
(`-work3-sentence-builder-guided-v2.pdf`). Three call sites gate on that one
flag — the book pills (`BookPrintablePills`), the reader materials block,
and `WorksPills` (shared by books and readers). Nothing was deleted: the
PDFs stay on disk and on Supabase, the pills stay in the code. In the
owner's words, keep the other material in code and memory, it just doesn't
feature on the site right now.

## Why

Tredoux's call, recorded 2026-09-15: the three-way version chooser and the
full seven/eight-pill printable set were more than a teacher picking up a
lesson needs to see. The simplest track removes the language-track decision
entirely, and the trimmed pill row leaves the four works a class actually
runs plus the book and its tracing workbook.

## Files

- `app/montree/library/dark-phonics/page.tsx` — both changes live here.
  Key symbols: `Track`, `PRINTABLE_TRACK`, `SHOW_HIDDEN_PRINTABLES`,
  `TrackTabs`, `WorksPills`, `BookPrintablePills`.
- Six new second-language booklet PDFs under
  `public/dark-phonics-books/print/` for the-sat, the-spat, the-pat,
  the-nap, the-dig, the-hot (see below), plus their slugs added to
  `L2_PRINT` in the same file (41 → 47 entries).

## How to restore the hidden things

**The variant row.** Wrap the Printables pills back in
`<TrackTabs slugs={…} worksSlugs={…}>{track => (…)}</TrackTabs>` at the call
site (search the file for `PRINTABLE_TRACK` — the comment directly above the
constant names the call site and spells out the swap), and change every
`PRINTABLE_TRACK` reference passed as a `track` prop back to the `track`
argument `TrackTabs` hands its children. The constant itself, `hasTrack`,
and both language tracks' root helpers are untouched and ready to use.

**The three hidden pills.** Flip `SHOW_HIDDEN_PRINTABLES` to `true`. All
three call sites are already gated on it; no other change needed. Paperwork
pack and Work 4 guided/v2 render exactly as they did before this commit.

## Regenerating the six second-language booklets

Six sat-cast books had no second-language booklet PDF at all — the-sat,
the-spat, the-pat, the-nap, the-dig, the-hot — because their printed text
was already four words or fewer per sentence, so the second-track build had
simply never been run for them. With `PRINTABLE_TRACK = 'second'` serving
every lesson, a missing second-language Book pill would have meant a
missing Book pill, full stop, for six lessons. Generated with:

```bash
MONTREE_REPO_ROOT=<repo> MONTREE_FLASHCARDS_DIR=scripts/curriculum/flashcards \
  python3 scripts/curriculum/flashcards/_patched_build.py <slug> --track second-language
```

**the-sat is the exception**: its entry in `books_def.py` carries art paths
relative to the script's own directory, so it only builds correctly with
`cwd` set to `scripts/curriculum/flashcards` — running it from the repo
root produces broken art references.

All 12 resulting PDFs across the six slugs were verified page-count and
`pdftotext`-byte-identical against their first-language counterparts, then
published to Supabase static-assets via `publish-static-materials.mjs`
(Uploaded 12, Failed 0). Their slugs were added to `L2_PRINT`
(41 → 47 entries). Covers were **not** republished — `lessons.ts` still
points each book's cover art at its first-language path, which is correct
since cover art doesn't change between tracks.

## Verification

- `eslint`: 0 errors, 4 pre-existing warnings (none introduced by this
  change).
- `vitest run` filtered to `tests/dark-phonics`: 493/493 passing.
- Railway deploy `a641492a`: **SUCCESS**, live-verified.

## Known debt / open items

1. **Printed PDF footers now disagree with the on-screen labels.** The
   footers on the printed sheets still read "Work 3 · Sentence & picture
   match" and "Work 5 · Sentence builder (free)", and
   `lib/montree/dark-phonics/tracker-works.ts` still counts and names five
   works. This commit only changed which pills the library page renders and
   what it calls them (Work 3 → "Sentence match", Work 4 → "Sentence
   builder"); it did **not** renumber the printed sheets or the tracker.
   Renumbering print + tracker to match was not asked for — flag before
   assuming the two are in sync.
2. **141 pre-staged circle-time files rode along in this commit by
   accident.** `c4648660c`'s diff includes `docs/circle-time/*`,
   `public/circle-time*` changes, plus circle-time weeks 37/38 added and
   weeks 1/2 removed — none of that is part of this library-trim work. They
   were sitting pre-staged in the index from unrelated work when this
   commit was made with a plain `git commit -a`-style sweep. **Not
   reverted** — flagged to the owner to decide whether it needs undoing.
   Lesson for future commits on this repo: run `git status` first, and
   commit with an explicit path list (`git commit -- <paths>`) or
   `git restore --staged <paths>` to scope the index before committing,
   rather than trusting whatever happens to already be staged.
