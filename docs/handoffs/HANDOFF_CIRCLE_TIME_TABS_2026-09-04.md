# HANDOFF — Circle Time week tabs + clean build pipeline
**2026-09-04 · scope: the Whale Class circle-time static pages only.**

Tredoux's ask: *"I want to be able to flip through the weeks at my leisure. There are many
more weeks of planning about to be created — get this pipeline clean and clear. This formula
works and is effective in class. Make sure the daily circles follow this pipeline and I want
them all visible tabs at the top."*

---

## What shipped

### 1. A tab strip on every circle-time page
A single horizontal strip pinned to the top of the page content (above the "Whale Class ·
Weekly Circle Time" kicker), one tab per week of the year — **W1 … W37**.

- **Built weeks** are solid, clickable tabs pointing at their stable clean URL.
- **Unbuilt weeks** are dashed ghost tabs with no link — Tredoux can see the whole year and
  what is still to come.
- **This page's week** is highlighted (whale blue, `aria-current="page"`) and the strip
  **auto-scrolls it into view** on load — including after the password gate opens, which is
  when the page first has a measurable width.
- The week currently live on `/teachers` carries a small coral dot.
- Full theme + dates are in each tab's tooltip; the label truncates on narrow screens.
- `@media print { #week-tabs { display:none !important } }` — the strip never appears in any
  of the three print paths (whole pack / wrap-up / print-one).
- The strip sits sticky at `top:0`; the existing sticky day-tab row is pushed down by a
  `--wt-h` custom property the renderer measures at runtime, so the two never overlap.
- The week tabs use `.wt`, **never** `.tab` — the page's own
  `document.querySelectorAll('.tab')` must keep returning exactly the 8 day tabs. Verified.

### 2. One manifest, one registration point — `public/circle-time-weeks.js`
The whole year lives in one array: week number, short tab label, full theme name, human date
range, ISO Mon/Fri, route, `built` flag. Plus `LIVE_WEEK` (which week `/teachers` serves).

Publishing a new week to the tabs = **editing one entry** (`built:false → true`, add `route`).
No page markup changes, no second list to keep in sync.

Each page declares its own number: `<div id="week-tabs" data-week="N"></div>`.
`public/circle-time.html` is a copy of the live week, so **its `data-week` carries the copied
week's number** (currently `1`) — the Sunday swap step must keep that correct, and the spec
says so in two places.

### 3. The old picker is gone
The `📅 Other weeks` `<details>` table (7 rows + "you are here") was removed from all eight
pages. The tabs replace it; there is now exactly one week navigation in the product.

### 4. The pipeline spec — `docs/circle-time/WEEK_BUILD_SPEC.md` (rewritten)
Was "how five workers each build one May week". Now: **how any session builds any week N**.

- §1 states **THE FORMULA** as non-negotiable: 5 words to own by Friday · Littles/Bigs tiers ·
  the 13-minute daily flow (Magic Box → teach → the song/finger-play slot that carries that
  day's verse → game → whisper-to-shout close) · one real object per day · **exactly one
  ukulele song per week** (chorus daily, verse per day, Friday finale, C/F/G7/Am only) ·
  weekly rituals verbatim · 4-tray shelf with controls of error · Friday review + parent
  wrap-up naming that week's Dark Phonics letter · 18-page print pack with per-section print
  buttons · A4 ring-bound guide PDF with ≥22 mm left margin.
- §6 is the mechanical run: copy the latest week → fill from the decoded doc → guide PDF
  (Playwright + pdfplumber verify) → MJ prompt file → images → **rewrite + publicPaths (two
  files, both required)** → **`built:true` in the manifest** → stage → verify → swap → commit.
- §7 is the Sunday swap, including flipping the outgoing week's manifest route to its archive
  URL (week 2: `/teachers-next` → `/teachers-week2`, once its rewrite/publicPaths land).
- §10 is a copy-pasteable verification checklist, including a `node -e` manifest audit that
  cross-checks every `built:true` route against `next.config.ts` and `middleware.ts`.
- §11 keeps the hard deployment rule: **explicit paths only, never `git add -A`**, git via
  Desktop Commander on the Mac.

---

## Files touched

Created:
- `public/circle-time-weeks.js`
- `docs/handoffs/HANDOFF_CIRCLE_TIME_TABS_2026-09-04.md` (this file)

Modified:
- `public/circle-time.html`, `circle-time-week1.html`, `circle-time-week2.html`,
  `circle-time-week32.html`, `circle-time-week33.html`, `circle-time-week34.html`,
  `circle-time-week35.html`, `circle-time-week36.html` — picker removed, `#week-tabs` +
  script added
- `middleware.ts` — `'/circle-time-weeks.js'` added to `publicPaths`
- `docs/circle-time/WEEK_BUILD_SPEC.md` — rewritten
- `CLAUDE.md` — circle-time section now describes the tab strip and the manifest

`next.config.ts` needed **no** change: `/circle-time-weeks.js` is a real file in `public/`,
served at its own path. But `.js` is **not** in the middleware matcher's static-extension
exclusion (`svg|png|jpg|jpeg|gif|webp|html|avif|json|webmanifest`), so without the
`publicPaths` entry the legacy Supabase gate would 302 the script to `/` and every page would
lose its tabs. Same trap as `.pdf`.

---

## Verification run

- `node --check public/circle-time-weeks.js` → OK.
- Manifest audit: 37 entries, sequential 1→37, no overlapping date ranges, every `built:true`
  route present in **both** `next.config.ts` rewrites and `middleware.ts` publicPaths
  (`/teachers-week1`, `/teachers-next`, `/teachers-w32…w36`), and
  `'/circle-time-weeks.js'` public. All pass.
- **DOM-stub harness in Node executing the manifest's real render() per page (jsdom is not installed in this repo): each
  renders 37 tabs — 6 links, 30 ghosts, exactly 1 highlighted tab, and the highlighted one is
  the page's own week, is a `<span>` (not a self-link), and carries `aria-current="page"`.
  No JS errors on any page. `.tab` still returns exactly 8 day tabs. Injected CSS present with
  the print-hide rule. No `#weekpicker` left anywhere.
- `grep` sweep: old picker 0 hits across all 8 pages; `data-week` correct on each.

Not done (needs a browser and Tredoux's eye): visual check of the strip on a phone, and a
print preview to confirm the pack is still 18 pages with no strip on it.

---

## Two things Tredoux should look at

1. **Weeks 3–8 have no dates and no themes anywhere in the repo.** The decoded year doc says
   in as many words that weeks 1–8 are the principal's own and are not part of the decode. So
   those six tabs render as ghosts labelled **"Principal week"** with no date. They cannot be
   guessed: week 2 ends Sep 12 and week 9 starts Mon Oct 19, which is five teaching weeks of
   room for six weeks of plan — the National Day break is presumably in there, but that is not
   written down. **Send her sheet for Sep–Oct and it's a 10-minute fill-in** (`short`, `full`,
   `dates`, `mon`, `fri` on entries 3–8 of the manifest).

2. **Some date ranges are not Mon–Fri.** Copied verbatim from the principal's sheet, flagged
   rather than silently corrected:
   - weeks **24** (Mar 9–13) and **25** (Mar 16–20) fall on **Tue–Sat** in 2027;
   - week **28** (Apr 7–10) is the four-day Qingming week ending **Sat 10 Apr**, a make-up
     school day — the decoded doc explains this one;
   - the two shipped September pages print **Sep 1–5** and **Sep 8–12**, which are also
     **Tue–Sat** in 2026 (Sep 1 2026 is a Tuesday).
   If the intended weeks are Mon-start, weeks 1 and 2 are each a day out on the page and in
   the guide PDFs. Fix the decode/pages first, then the manifest — not the other way round.

---

## Next session, to build week 3

1. Get weeks 3–8 from the principal (see above), fill the manifest entries.
2. Follow `docs/circle-time/WEEK_BUILD_SPEC.md` top to bottom. It is self-contained.
3. Register: `built:true`, `route:'/teachers-w3'`, plus the `next.config.ts` and
   `middleware.ts` lines. The tab appears on all eight existing pages automatically.
