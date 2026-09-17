# HANDOFF 2026-09-17 — Circle Time uncommitted-work triage

## What broke

Tredoux showed a friend teacherpotato.xyz and hit three embarrassing live failures in a row.
All three traced back to **one root cause**: the 2026-09-15 circle-time renumbering session
(old internal weeks 1–36 → school weeks 3–38) did the work correctly **on disk** but was
**never committed or pushed**, and its own notes described the plain 8-page bullet-list guide
template as "locked" — so later sessions built against the wrong reality, thinking the
un-pushed state was current.

## The three failures, live

1. **`/circle-guide-week2.pdf` → 404.** Redirects existed in `next.config.ts` but were
   uncommitted, so they weren't live. Fix: belt-and-braces 308 redirects added directly in
   `middleware.ts` (`CIRCLE_TIME_RENAMED` block, ~L261–290), `next.config.ts` entries kept,
   `publicPaths` gained the missing `w37`/`w38`. Commit `f3b5c4bf`. Live-verified both hosts:
   `week1.pdf→week3`, `week2.pdf→week4`, `/teachers-week1→/teachers-w3`,
   `/teachers-next→/teachers-w4` (308).

2. **Tab strip on `/teachers-w4` showed old labels** ("W4 · My Feeling" linking to My Body).
   `public/circle-time-weeks.js` (36-entry manifest), the 36 pre-rendered tab strips, and
   `newsletter.html` had been renumbered in the tree but never reached HEAD/live. Fix: those
   files committed; live week set correctly — `public/circle-time.html` = week 5 copy
   (`data-week 5`), `public/circle-guide.pdf` = week 5 guide, `LIVE_WEEK=5`,
   `render_tabs.py` re-run. Commit `88a82323`. Live-verified.

3. **`/circle-guide-week6.pdf` said "Week 4" inside and used the plain bullet-list template.**
   The tree already had the real Week-3 design (coloured word pills, Littles/Bigs cards, navy
   flow boxes with arrows, cream Weekly Rituals panel, per-day accent pages) plus correct
   school numbers — uncommitted, and mislabeled "locked" (it was the OLD template that was
   locked in the stale notes). Fix: added `split_chips()` to
   `docs/circle-time/guide-src/build_guide.py` (word-frame chips render as separate white
   chips, were one grey blob), regenerated W5–W38 (8pp each; W3 is the 16pp hand-built page
   and was left untouched), updated CLAUDE.md so the Week-3 design is documented as standard.
   Commit `bfac7f8c`.
   - Deploy was blocked ~20 min by an **unrelated** build break from another session
     (`a2f9afe0c6` "Retire AI photo recognition" — `teacher_confirmed` missing on the
     `GalleryItem` type, `gallery/page.tsx:924`), fixed by that session's `45efd49df`.
   - Verified live 12:00 UTC: week6 title reads "Week 6", dates Sep 21–24, designed look
     confirmed visually; week20 and week38 correct; week3 still 16pp as intended.

## Not a bug

Friend's-laptop "site didn't open" is **not reproducible** — DNS, TLS and error-rate all
clean. Best hypothesis: China intermittent Cloudflare-edge blocking (see
`docs/DNS_ERROR_1034_FIX.md` history). Ask her if she was on a VPN. No fix made or needed.

## Commits

| Commit | What |
|---|---|
| `f3b5c4bf` | Redirect fix — week1/2 pdf + teachers-week1/next → w3/w4, middleware belt-and-braces |
| `88a82323` | Tab-strip renumbering (W3–W38) + live week → W5 |
| `bfac7f8c` | Guide-book rebuild — school-week numbering inside PDFs + Week-3 design template W5–W38 |
| `45efd49df` | (unrelated, another session) gallery build-break fix that had blocked deploy #3 |

## Leftovers / not done

- `_to_delete/guide-compare/` and `_to_delete/tmp-tsconfigs/` — scratch, gitignored, delete
  whenever convenient.
- 4 unrelated pre-staged `materials-out/the-pat/*.pdf` were unstaged and left in the tree
  (not this session's work — do not sweep into a future commit blind).
- Documented `check_week.py` drifts remain open: 27× card-/sign- prompt-filename mismatches,
  8× line-count mismatches.

## NEXT SESSION

Before touching circle-time again: run `git status` on the Mac checkout FIRST and diff
against live via curl — do not trust disk state or a prior session's handoff notes alone.
See the new CLAUDE.md rule (2026-09-17): a circle-time (or any site-facing) session is not
done until commit + push + live-URL curl verification all happened.
