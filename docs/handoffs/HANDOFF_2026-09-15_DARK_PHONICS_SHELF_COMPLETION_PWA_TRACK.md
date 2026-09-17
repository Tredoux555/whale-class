# HANDOFF — Dark Phonics V2 shelf: completion/Next on every work, iPad top-bar clipping, /parents PWA, second-language book text (2026-09-15)

Two commits, same evening, both from iPad field testing by Tredoux against
the live `/parents` shelf. The first fixes what he could feel going wrong
with his hands — clipped pips, no sense of "done" — and adds the `/parents`
PWA manifest that testing turned up was missing entirely. The second is a
content call: which book text the digital shelf teaches from.

## `4ca197c6d` — fix clipped top-bar pips on iPad, shared completion glow + Next pill on every work, /parents PWA manifest

Railway deploy `e0b3b99c` — SUCCESS, live-verified.

### What he reported from the iPad

- The numbered pips (1–4) in the top bar were half cut off once a work
  actually started — fine on the shelf's landing screen, wrong mid-lesson.
- Finishing a work gave no Next; nothing told him or the child it was safe
  to move on.
- He wanted what tracing already had — a green border flash on completion —
  on **every** work, plus a green Next pill on the right so the gesture is
  the same everywhere.

### Root cause of the clipping — a viewport-unit mismatch, not safe-area

`app/globals.css` sets `body { min-height: 100vh }`; the shelf's own root is
sized to `100dvh`. On iPad Safari, `vh` is the **large** viewport (browser
chrome collapsed), so the document rendered a toolbar-height taller than what
was actually visible — a phantom scroll region that doesn't exist on
desktop, where the two units agree. iPad Safari's toolbar sits at the **top**
of the screen, and the shelf's pieces have `touch-action: none` while the
board does not — so a finger-drag landing on the tray (not the board)
scrolled that phantom region, sliding the shelf's non-sticky 44px header
partway under the toolbar. Measured directly: a 22px scroll left 23 of a
30px pip visible. No safe-area inset was involved in reproducing it.

### The fix (`ShelfPlayer.tsx`)

- Scroll lock while the shelf is open: `html`/`body` `overflow: hidden` is
  applied on mount and the *exact* prior `min-height`/`overflow` values are
  restored on unmount or close.
- Header is now `sticky` with `top: env(safe-area-inset-top, 0px)`.
- 4-side safe-area padding added around the shelf chrome.

### Completion glow + Next, everywhere (new `WorkDone.tsx`)

New `components/montree/dark-phonics-live/v2-shelf/WorkDone.tsx`:

- `CompletionGlow` — framer-motion inset glow using
  `var(--dpl-slide-accent-2)`, holds ~1.5s.
- `NextWork` — a 111×64 pill, mid-right, background `--dpl-next-bg`
  (`#3f6b00`) / ink `--dpl-next-ink` (`#ffffff`), both new in
  `styles/dark-phonics-live-tokens.css`. The obvious choice,
  `--dpl-slide-accent-2` (`#5a8a00`), measured under AA contrast on white and
  was rejected for the pill's background.

Wired through a `finished[]` latch in `ShelfPlayer.tsx` that covers every
stage, not just tracing:

- `MatchWork`'s inline glow and `TraceSurface`'s duplicate ~1s glow are both
  removed — one glow implementation now, not three drifting copies.
- `CharacterStrip` (the Book stage) now reads shelf phase and flashes on
  completion — it had **no** completion visual before this commit.
- Tracing's `onComplete` now reaches `ShelfPlayer` directly instead of
  handling its own glow locally.
- The shelf's last stage still shows DONE and calls `onClose` itself — that
  hand-off is the director's call, unchanged.
- Bounds checked: `go()` clamps at the ends of the stage list; NEXT can't
  double-fire.

### `/parents` PWA — it had no manifest at all

`teacherpotato.xyz/parents` previously shipped with no manifest and no
`apple-mobile-web-app-*` tags. `public/manifest.json` exists but is scoped to
`montree.xyz` (`scope: /montree`) and doesn't apply here. "Add to Home
Screen" on the iPad produced a plain Safari bookmark, not a standalone-app
launch — exactly the surface this whole session was testing on.

Fix:

- New `public/parents.webmanifest` — name "Dark Phonics Shelf", short_name
  "Phonics", `start_url` + `scope` both `/parents`, `display: standalone`,
  background/theme `#07070c`, icons from `public/potato-app-icons/`.
- New `app/parents/layout.tsx` — pass-through layout (metadata only) setting
  `manifest`, `appleWebApp` (`capable: true`, `title: "Phonics"`,
  `statusBarStyle: "default"`), plus a legacy `apple-mobile-web-app-capable`
  meta tag by hand because Next 16 emits only the newer
  `mobile-web-app-capable`, which iOS Safari doesn't yet honor.
- `app/layout.tsx`'s `isTeacherPotato` branch got a **comment only** — no
  behavior change. The `teacherpotato.xyz` homepage and all of `montree.xyz`
  carry none of this; it's `/parents`-only by design.

**Owed:** he has to delete and re-add the home-screen icon for iOS to pick up
the new manifest — an existing bookmark doesn't upgrade itself.

### QA

Headless Chromium at 1180×820 and 820×1180 (dSF2, touch enabled); the match
work driven to completion with real simulated drags. 493/493 dark-phonics
vitest green. Scoped `tsc`: 0 errors.

QA rig gotcha, recorded so it isn't rediscovered: Turbopack needs to unlink
`.next`, which the device bridge can't do directly — `.next` was parked
(symlinked elsewhere) for the run and restored after. Strays land in
`_to_delete/qa-parked/` and `_to_delete/.writetest_qa_2026-09-15`.

---

## `dc1b4d3d7` — serve the second-language (simple) book text: the-pit reads "Ant in the… pit!", 2L cover titles, dual-track sidecars

Railway deploy `9abac847` — SUCCESS. Live bundle `9e826acf1dd73993.js`
verified directly to carry `"Ant in the… pit!"` and zero occurrences of the
retired `"The ant sat in the"`.

### The call

`the-pit` has two text versions on paper: the simple one Tredoux actually
teaches from (`"Ant in the… pit!"`, second-language track) and a retired
first-language version (`"The ant sat in the… pit!"`). The digital shelf was
reading the **first**-language pack.

### Root cause

`lib/montree/dark-phonics/book-works.ts` imported
`BOOK_WORKS_GENERATED_LESSONS` only from `book-works-lessons.ts`. The
second-language file already existed but was orphaned — its only importer
had already been moved to `_to_delete` as a scratch file. Print had already
moved on: `app/montree/library/dark-phonics/page.tsx` sets
`PRINTABLE_TRACK = 'second'`, so the library page has served second-language
printables for a while. Print and digital had drifted onto different tracks.

### Fix

`book-works.ts` now exports `BOOK_TRACK: 'first' | 'second' = 'second'`, with
both packs imported and the constant switching between them — flip it to
`'first'` and the shelf reverts in one line; the first-language pack is
untouched on disk either way.

Diffing the two packs: all 20 lessons are structurally identical (cast,
counts, art, rounds, questions, script shape); wording differs on 14. Lessons
3, 4, 6, 9, 17, 21 are text-identical between tracks (the-sat / the-pat /
the-nap / the-dig / the-hot / the-jump — 1L and 2L A5 readers byte-identical).

### Second-language pack fixes made as part of this commit

- Lesson 2's stray ellipsis — `"Ant on my… apple."` → `"Ant on my apple."` —
  to match the printed works pack.
- 15 teacher `script[]` quotes across 13 lessons rewritten to the simple
  wording the 2L track uses.
- 9 `bookTitles` set from the 2L A5 covers: *In the Pit!* · *On the Mat!* ·
  *___ Has a Dog!* · *In a Cot!* · *___ Has a Kit!* · *___ Has an Egg!* · *In
  the Mud!* · *___ Chased the Rat!* · *___ Saw a Bug!*
- Lessons 3/4/6/8/9/17 titles unchanged (2L cover = 1L). Lessons 2/13/19–21
  unchanged (title is the book's own name; 13 has no A5 pair).
- Hand-authored `LESSON_1` aligned to its 2L print: "In my sock?!" recap
  chant repeats ×3, ending on "Potato in my sock?".

Left alone by design, not drift: Lesson 1's cast lines end "!" where the
print ends "."; script "A snake in my sock!" vs. page "Snake in my sock!".

`books.ts:261`'s tracing instruction takes `lastWord(bookTitle)` — every new
title keeps the same last word, so tracing wasn't affected.

### Sidecars now carry both tracks

`scripts/curriculum/book-works/build_book_works.py --sidecars-only` emits
both: `sidecars/<slug>.json` (33 files, new `"track"` field only) and new
`sidecars/second-language/<slug>.json` (33 files, `"track":
"second-language"`). `tests/dark-phonics/book-works-sidecar-conformance.
test.ts` follows `BOOK_TRACK` and asserts the tag; green on both tracks. Cast
counts spot-checked against the 2L printed works PDFs.

### Bonus fix — `BookPageFace.tsx` chant line breaks

`chantLines()` split a repeated chant by raw word count, breaking "In the
pit!" × 3 mid-phrase. Now repeat-aware: one full phrase per line, one-word
chants keep the old two-line break.

### Known pre-existing, unrelated failure

`tests/tracking/writing-shelf-curriculum.test.ts` fails independently — Tray
5's word-tin text is ahead of migration 352. Not touched here.

`scripts/curriculum/book-works/__pycache__/` is not gitignored; strays from
this session were moved to `_to_delete/` rather than committed.

---

## Owed / next

- Eyeball on the real iPad: NEXT pill stays clear of loose pieces in
  portrait; lesson 5's Book stage reads "Ant in the… pit!" live.
- Delete and re-add the `/parents` home-screen icon to pick up the manifest.
- Undecided: should `tracker-works.ts`'s own `bookTitle` literals (DB rows
  seeded by migrations 344/356) follow the 2L covers too? Left as a separate
  decision — untouched by both commits; mastery tracking keys on ids
  (`dp:p:%`), not titles.
- `_to_delete/` keeps accumulating session strays and still needs an
  empty-out pass.
