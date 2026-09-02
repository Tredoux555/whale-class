# May 2027 · Space month — circle-time weeks 32–36

Five new Whale Class circle-time weeks, built from the week-2 template per
`docs/circle-time/WEEK_BUILD_SPEC.md`. Content brief: `docs/circle-time/May_circle_time_decoded.md`.

| Week | Dates | Theme | URL |
|---|---|---|---|
| 32 | May 10–14 | Big Bang and the Universe | https://www.teacherpotato.xyz/teachers-w32 |
| 33 | May 17–21 | Solar System | https://www.teacherpotato.xyz/teachers-w33 |
| 34 | May 24–28 | Space Exploration | https://www.teacherpotato.xyz/teachers-w34 |
| 35 | May 31–Jun 4 | Dinosaurs | https://www.teacherpotato.xyz/teachers-w35 |
| 36 | Jun 7–11 | Fossils + May review | https://www.teacherpotato.xyz/teachers-w36 |

Password on every page: **`THISDL`** (same as `/teachers`). Each week has its own
`sessionStorage` key `wc_ct<NN>`, so unlocking one week does not unlock the others.

## Files per week

- `public/circle-time-week<NN>.html` — the page: 8 tabs (Mon–Fri, Song, Print pack, Wrap-up),
  18-page print pack, 43 image references across 37 unique images.
- `public/circle-guide-week<NN>.pdf` — the 8-page A4 in-circle guide book (print · laminate ·
  ring-bind). Linked from the page's Guide button; day scripts are word-for-word the day tabs.
- `docs/circle-time/mj-prompts-week<NN>.md` — the 37 Midjourney prompts for that week.
- `public/circle-time-images/week<NN>/` — **not yet created** (see Pending).

Also new: `docs/circle-time/mj-prompts-may-ALL.md` — all 185 prompts in one file with a
how-to-run preamble, for a single Midjourney session covering the whole month.

## Wiring

Ten lines, landed together in the same commit as the pages:

- `next.config.ts` → `rewrites().afterFiles`: `/teachers-w32`…`/teachers-w36` →
  `/circle-time-week32.html`…`week36.html`.
- `middleware.ts` → `publicPaths`: `/teachers-w32`…`w36` **and**
  `/circle-guide-week32.pdf`…`week36.pdf`. Both halves are required — `.pdf` is not in the
  matcher's extension exclusion, so a guide PDF without its entry 302s to `/`.

A **📅 Other weeks** picker (a `<details>` in the `.extra` area, screen-only) was added to all
seven circle-time pages — weeks 1, 2 and 32–36 — so every page can reach every other. Each page
shows its own week as plain text marked "← you are here".

## Pending

- **Images — 185 files, none generated yet.** Every `<img>` uses the `imgFallback(el,emoji)`
  pattern, so all five pages are live and usable today; each missing picture renders as its emoji.
  Run `docs/circle-time/mj-prompts-may-ALL.md`, save the PNG upscales to
  `~/Downloads/circle-time-mj/` under the exact filenames, convert with the `sips` loop in that
  file's §3, then commit `public/circle-time-images/week32`…`week36` (37 files each).
- Nothing else: pages, PDFs and routing are complete.

## Promoting a May week to `/teachers`

`/teachers` always serves `public/circle-time.html`, and its guide button always points at
`/circle-guide.pdf` — that is how week 1 → week 2 was done. When a May week becomes the current
week:

```bash
cd "$HOME/Desktop/Master Brain/ACTIVE/montree"
cp public/circle-time-week33.html public/circle-time.html
cp public/circle-guide-week33.pdf public/circle-guide.pdf
```

Then, inside the copied `public/circle-time.html`:

1. change the guide link `href="/circle-guide-week33.pdf"` → `href="/circle-guide.pdf"`;
2. bump the `sessionStorage` key (two occurrences of `wc_ct33`) to a fresh value so teachers
   holding an old unlock are re-prompted;
3. in the week picker, swap the Week 33 row back to a link (`/teachers-w33`) and mark whichever
   week is now current as "← you are here".

The `/teachers-w33` URL keeps working independently — the copy is a duplicate, not a move.
Commit `public/circle-time.html` and `public/circle-guide.pdf` only; pushing to `main` triggers
the Railway auto-deploy.
