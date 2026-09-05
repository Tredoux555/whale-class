# HANDOFF — Book Works, the-vest, blocked by MidJourney (2026-09-06)

## Read this first
This supersedes the workflow note in `HANDOFF_BOOK_WORKS_2026-08-30.md` (the original mission doc — still the source of truth for the locked lesson formula and source-of-truth contract). Brain checkpoint: `docs/mission-control/brain.json` key `BOOK_WORKS_THE_VEST_BLOCKED_2026_09_06`.

## Where things actually stand
- Book-works mission: 21 lessons live (commit `defd8fe6b`), working book-by-book on the remaining letter books: **the-vest (v, 22) is current.**
- the-vest MidJourney art: **all 8 images now exist in Tredoux's MJ feed** — p1-vest (he submitted), plus p2-ant, p3-apple, p4-sun, p7-cat, p8-recap, p9-potato, cover.png (an agent submitted these on 2026-09-06 — see incident below).
- **Nothing has been picked or saved to Downloads yet.** Nothing filed to `phonics-images/dark-phonics-books/the-vest/`. Lesson 22 is not wired. No commit made for book-works since `defd8fe6b`.
- Repo HEAD has moved on (`a98a8667f` at time of writing) but that's all *other* concurrent-session work — Writing Shelf print fixes, materials-uniformity audit, circle-time. None of it touches book-works.
- Tredoux is **blocked by MidJourney until 2026-09-08** and is stepping away from this mission until then.

## Critical incident — read before touching MidJourney again
The p2–p9 + cover prompts for the-vest were submitted by an agent **driving MidJourney directly through Chrome browser automation** (typing into the prompt box, pressing Enter, via the claude-in-chrome tools). This is exactly the pattern already banned in `brain.json`'s `CIRCLE_TIME_YEAR_2026_27_CLOSEOUT_2026_09_04` entry, which records that this same kind of scripted submission got Tredoux's MidJourney account blocked for 3 days once before, with MidJourney's own words: *"accessing Midjourney via third-party tools or scripting is strictly forbidden and is grounds for a permanent ban."*

That rule existed in the repo before this happened. It should have been checked and applied project-wide — it wasn't, because it lived under a circle-time-specific entry and the original book-works mission doc (2026-08-30) explicitly said "Claude may submit via Chrome." That line was wrong and is now retracted. Tredoux telling us today that he's blocked until the 8th lines up with this automated run — it's the most likely cause.

**New permanent rule, project-wide, not just circle-time:** no agent submits prompts to MidJourney through any browser tool, ever, for any reason. An agent may prepare exact prompt text (as below), but Tredoux pastes it in himself and saves finals to Downloads.

## the-vest prompts (for reference — paste by hand only, no rerolls needed unless he wants variety)
All follow: scene + house style (`colored hand-drawn pen-and-ink, fine crosshatch, whimsical Dr. Seuss children's-book style, plain white background, expressive big googly eyes on every character, no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark`) + cast description + `--ar 1:1`. Full text for all 7 is saved in `brain.json` → `BOOK_WORKS_THE_VEST_BLOCKED_2026_09_06.the_vest_prompts_for_reference_if_reroll_needed`.

## Resume plan (2026-09-08 or later)
1. Tredoux picks finals for all 8 the-vest images from his MJ feed (already generated) and saves them to Downloads.
2. Agent files picks to `phonics-images/dark-phonics-books/the-vest/<exact filename>` per `_dark-phonics-book-run/ARTWORK-HANDOFF.md` naming (`p1-vest.png` … `p9-potato.png`, `cover.png`), duplicates `cover.png` to `public/dark-phonics-books/covers/the-vest.png`.
3. Wire lesson 22 the same way lessons 19–21 were wired: regenerate `lib/montree/dark-phonics/book-works-lessons.ts` (never hand-edit), `sips -Z 700` the art into `public/dark-phonics-live/pages/the-vest/`, run verify (tsc, eslint, verbatim-text audit against ARTWORK-HANDOFF.md's corrected captions, paths-resolve, allowlist `['matched','drop','trace']`, voice-gating untouched).
4. Fresh-eyes audit, commit via Desktop Commander only, push.
5. Only then start the-swim (w, 23) — book-by-book law is still locked. Remaining order: the-swim → the-yam (y, 25) → the-zip (z, 26) → the-quilt (qu, 27). Fox-in-a-box (x, 24) decision still open (wire from existing art as book-works, or leave reader-only).

## Also still pending
Migration 343 (Supabase SQL) — unlocks the 📖 Book button on the live teacher stage. Still not run as of 2026-09-06.
