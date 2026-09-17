# Scout report — circle-time guide rebuild (2026-09-15)

## 1. Does week-2 HTML source exist anywhere?
**NO.** Grepped docs/, scripts/, public/, _to_delete/ for "MAGIC BOX HOOK",
"Whale Class Circle Time Guide", "circle-guide-week2", "Circle Time Guide" —
no HTML source for the week-2 GUIDE BOOK exists anywhere in the repo.
Confirmed by `docs/circle-time/HANDOFF-week2-my-body.md` itself (§3 "Build"):
the 8-page guide-book HTML was authored live and printed straight to PDF via
headless Chrome (Control_Chrome print-to-pdf) — only the finished PDF
(`public/circle-guide-week2.pdf`) was ever kept; the HTML was never saved.
(`public/circle-time-week1.html` / `-week2.html` that DO exist are the
student-facing circle-time PAGE, a different artifact — not the guide book.)

**IMPORTANT — the premise may be stale.** `docs/circle-time/guide-src/build_guide.py`
(last touched 2026-09-12, i.e. AFTER the week-2 handoff) already claims to
implement "the week-2 card layout (the one Tredoux picked)" and hardcodes the
per-day accent colours "measured off circle-guide-week2.pdf": Mon #1B6FA8,
Tue #E2563A, Wed #0F8A72, Thu #B97A0A, Fri #6D4FC4. I rendered week-3's
current MONDAY page (built by this script) side-by-side with week-2's MONDAY
page: they use the **same layout system already** — big coloured day banner,
time-pill + ALL-CAPS segment titles, tinted rounded cards, dark speaker pills
(EVERYONE/TEACHER/LITTLES/BIGS), song-moment card at the foot. The only
visible difference on Monday is week-3 carries an extra small eyebrow line
above the banner ("WEEK 5 · MY 5 SENSES") that week-2 doesn't have.
**Verify this on a few more weeks before assuming a full rebuild is still
needed — it may already be substantially done, and remaining diffs (if any)
may be narrower than "different product."** Reference PNGs of both pages are
in `_to_delete/guide-ref-week2/page-3.png` (week 2 Monday) and
`_to_delete/guide-ref-week3-current/page-3.png` (current week 3 Monday) for
side-by-side eyeballing.

## 2. Week-2 design spec (extracted from the PDF)
Page size: A4, 594.96 × 841.92 pt = **209.9 × 297.0 mm**.
Left margin ≈ **24.1mm** (clears the ≥22mm rule) on every page; right ≈13.8mm;
top ≈13-15mm; bottom ≈12.4mm (except page 8, ≈22.8mm).
Fonts: **all body/heading text is embedded LiberationSans** (Regular / Bold /
Italic) + NotoColorEmoji for emoji glyphs — i.e. this PDF was NOT built with
the Fredoka/Atkinson/Noto-CJK font stack `render_guide.py`'s docstring says
the *current* pipeline embeds; it may have used a plainer/system font stack
at the time. Confirm whether that matters visually (LiberationSans reads
close to Arial/Helvetica, not a rounded display font).

Key font sizes/roles (page-by-page, largest→smallest):
- Cover: 40pt "Circle Time Guide", 20pt emoji row, 19pt italic theme title,
  12pt tagline, 11pt week-of line, 9.5pt "WHALE CLASS" eyebrow.
- Overview (p2): 20pt "Week Overview", 12.5pt section headers, 12pt table
  headers, 11.5pt word list, 10pt uke chord row.
- Day pages (p3-7): **26pt** day name banner (MONDAY/TUESDAY/…), 12.5pt
  segment/activity title under it, 10.5pt segment card titles
  ("MAGIC BOX HOOK", "TEACH · …", "GAME · …", "CLOSE"), 9.8pt small
  quoted-script lines, **8.7pt is the workhorse body-text size** (the bulk
  of every card), 8.6pt "♪ TODAY'S SONG MOMENT" label.
- Songbook (p8): 20pt song title, 17pt star emoji, 11.5pt body, 11pt strum
  line, 9pt chorus-structure note, 8.4pt small print.

Colours (hex, derived from PDF non-stroking colours):
- Cover gold accent box: **#F2C14E** (rect 214×91pt behind week-of text).
- Per-day accent (banner rule + left-border strip on every card + pills):
  **Mon #1B6FA8 (blue) · Tue #E2563A (red-orange) · Wed #0F8A72 (teal) ·
  Thu #B97A0A (amber/mustard) · Fri #6D4FC4 (purple)** — matches
  build_guide.py's DAY_COLOR array exactly.
- Body text (near-black navy): **#16202A** (0.0863,0.1255,0.1647).
- Muted/secondary text (grey-slate): **#5B6B7A** and **#6B7C8B**.
- Light hairline/divider: **#C9D4DD** (0.7882,0.8314,0.8667).
- A recurring reddish-brown (~**#C2543B**) appears on every day page
  regardless of that day's own accent — likely the "Teacher fails:" note
  colour or similar constant, not a per-day colour. Worth confirming against
  the rendered image (page-3.png shows "Teacher fails:" in plain bold black
  though — re-check what text uses #C2543B specifically if precision matters).
- White (#FFFFFF) fills every card background rect (full-page white rect
  487×768pt = the page's content-area background).

Structure per day page: 1 title-rule rect (487×3pt, day colour) below the
banner; ~4 "cards" each with a coloured LEFT-BORDER rect (3pt wide, colour =
day accent, height = card height) plus rounded-rect background drawn as
curves (25-31 curves per page = the rounded corners of the day's ~4-5 cards);
0 straight `lines` on day pages (card outlines are curves, not line
primitives) — page 2 (Overview) is the exception with 32 `lines` (a real
table grid).

Page order: 1 Cover · 2 Week Overview (rituals, Littles/Bigs, uke ref,
word list, weekly-note) · 3-7 Monday-Friday (one segment-card page each) ·
8 Songbook (chords + full lyrics).

Reference PNGs (100dpi) for all 8 pages are in
`_to_delete/guide-ref-week2/page-1.png` … `page-8.png`.

## 3. build_guide.py / render_guide.py — how they work
- **Single source of truth**: everything in a guide (5 words, Littles/Bigs
  frames, daily script, song, chords) is scraped OUT of the live student page
  `public/circle-time-week<N>.html` via BeautifulSoup — never re-authored by
  hand, so a guide can never drift from the teacher's page.
- Hardcodes the week-2 palette (DAY_COLOR/DAY_TINT/WORD_PILL arrays) + a
  `SCHOOL_WEEK_OFFSET = 2` constant (guide prints "school week" = site week+2,
  matching the printed-plan's own numbering — separate from the site's own
  week numbering, which is 1:1 with routes).
- `WEEK_NOTES` dict: per-week standing note text for the Overview page
  (holidays/solar terms/short weeks), hand-authored per week number.
- Output: writes `circle-guide-week<N>.html` into this same `guide-src/`
  folder (NOT `public/` — a separate render step converts it).
- `render_guide.py` (Playwright/Chromium) loads each HTML file, waits for a
  client-side "FIT auto-sizer," and calls `page.pdf()` with A4 + zero margins
  + printBackground, writing straight into `public/circle-guide-week<N>.pdf`.
  Its own docstring says it must run in the **cloud container**, not the Mac
  ("the Mac has neither Playwright nor pdfplumber").
- Default week range for both scripts: **3..36** (weeks 1-2 are excluded —
  they predate this generator and are hand-built/legacy, see CLAUDE.md).
- Current guide-src/ has an HTML file for every week **3 through 36**
  (34 files, confirmed by directory listing) — so on its face the generator
  already covers every remaining week; I did not verify each one is
  up-to-date/error-free, only that files exist and week-3's build resembles
  week-2's layout closely on the one page rendered.

## 4. Site week → printed/"school" week mapping (weeks 1-36)
Source: `docs/circle-time/YEAR_CALENDAR_2026-27.md`. Format: site wk → sheet
col (their "Sheet" column, i.e. the number some weeks print) / printed-plan
cell:
1→(built, prints "Sep 1–5", locked) · 2→(built, prints "Sep 8–12", locked) ·
3→Sheet 5 · 4→Sheet 6 · 5→Sheet — (split by 国庆) · 6→Sheet — ·
7→Sheet 7 · 8→Sheet 8+9 · 9→Sheet 11(family half) · 10→Sheet — · 11→Sheet 13 ·
12→Sheet 14 · 13→Sheet 15 · 14→Sheet —(replaces 16) · 15→Sheet 17 ·
16→Sheet 18 · 17→Sheet 19 · 18→Sheet 20 · 19→Sheet 21 · 20→Sheet 22 ·
21→Sheet 23 · 22→Sheet 24 · 23→Sheet 25 · 24→Sheet 26 · 25→Sheet 12(animals
half) · 26→Sheet 29 · 27→Sheet 27 · 28→Sheet 28 · 29→Sheet 30 · 30→Sheet 32 ·
31→Sheet 33 · 32→Sheet 34 · (rows 33-36 not captured in this pass — table
continues past line 75, re-run the grep for the tail if needed).
Full "Printed-plan cell" text (real dates + theme) is in the table itself —
see the file directly, it's dense (36 rows).
build_guide.py's own `SCHOOL_WEEK_OFFSET=2` constant is described in its
docstring as matching this table for every week, i.e. it does NOT use the
"Sheet" column above but a flat site-week+2 rule for what it PRINTS on the
guide page — the CLAUDE.md note that "no constant offset exists" refers to
the PRINTED-PLAN mapping (the messy one, merges/drops/splits weeks), which is
different from what the guide book itself prints. Worth double-checking
against a few of the newer guide-src HTML files whether +2 actually lines up
before trusting it for every week (weeks 5-14 in particular, where the
printed-plan table shows merges/splits that a flat +2 offset can't capture).
Week-2 cover currently prints "Week of September 8–12" (no numeral at all,
just the date range) — it does NOT print a week number on the cover.

## 5. Tooling availability
- **Linux sandbox (device_bash, this scout's environment)**: pdfplumber ✅,
  pdftoppm ✅ (poppler), pymupdf/fitz ❌, Playwright ❌, no Chrome/Chromium
  binary found anywhere on disk.
- **The real Mac (checked via Desktop Commander)**: Google Chrome.app ✅
  present, pdftoppm ✅ (homebrew), python3 pymupdf ❌, python3 pdfplumber ❌,
  playwright npm package ❌ (not in repo node_modules).
- **Verdict**: neither environment has BOTH Playwright and a working PDF
  extraction lib. The existing pipeline's own docstring already flags this
  split (render via Playwright in the cloud container; the Mac can't).
  For any rebuild work: build/inspect HTML + rasterize reference PDFs with
  pdftoppm+pdfplumber in the Linux sandbox (as this scout did); do the actual
  Playwright→PDF render in whatever cloud container session has Playwright
  installed (per render_guide.py's own instruction) — or drive real Chrome
  print-to-pdf via Control_Chrome automation on the Mac, per the original
  week-2 build method.

## FOLLOW-UP — 2026-09-15, why the live site still shows OLD format

**Root cause: the Sep-12 rebuild was never committed or pushed.** `git status`
(Desktop Commander, repo root) shows `build_guide.py`, 26+ regenerated
`guide-src/*.html` files, and **all 34 regenerated `public/circle-guide-week{3..36}.pdf`**
as uncommitted working-tree modifications (`M`), plus several week HTML
sources as untracked (`??`). `git log -3` on `build_guide.py` and
`circle-guide-week4.pdf` both stop at older commits (`6b91735fc`, `3c88f5777`)
— nothing from the Sep-12 rebuild is in history. `git status -sb` shows
`## main...origin/main` with **zero ahead/behind** — local HEAD (`0e3b9ad3f`)
equals origin, so even IF it had been committed it hasn't been pushed either.
Since Railway deploys from `origin/main`, the live site is serving whatever
PDF was last actually committed — the OLD plain format — while the new
830KB-class PDFs sit only on disk on the Mac.

**1. Format scan, all 36 (pdfplumber substituted for pymupdf — neither Mac
nor sandbox has pymupdf installed; pdfplumber gave the same text-presence
signal reliably):**
wk1=16pp legacy (lowercase "2 min", pre-dates this template — known/accepted
exception, not part of this rebuild) · wk2=8pp NEW (the reference) ·
**wk3-36 (all 34, incl. wk4) = 8pp, NEW format LOCALLY** — every one has the
"2 MIN … MAGIC BOX HOOK" day-page card. wk26 is a legitimate no-circle-time
holiday Monday page (4-day week) but still NEW template overall. All local
mtimes for wk3-36 are 2026-09-12 (either 02:08-02:09 UTC via my sandbox stat,
or Sep 12 10:08 local per Desktop-Commander `ls -la` on wk4 — same rebuild
run, just different tz display). **So there is no local straggler — the
entire local rebuild is complete and NEW-format; the gap is 100% a
commit/push gap, not a partially-finished rebuild.**

**2.** `git status --porcelain`: 34 modified PDFs + `build_guide.py` +
~26 modified/7 untracked guide-src HTML — **nothing staged, nothing
committed.** `git status -sb`: `main...origin/main`, 0 ahead/0 behind (HEAD
`0e3b9ad3f`). Last real commits touching this area: `6b91735fc` (build_guide
change) and `3c88f5777` (weeks 3-4 "live" — but that commit predates the
Sep-12 rebuild, so it shipped the OLD-format week3/4 PDFs, not these).

**3.** `curl -sI https://www.teacherpotato.xyz/circle-guide-week4.pdf` →
`content-length: 413309` (OLD, small). Local `public/circle-guide-week4.pdf`
= **830268 bytes** (Sep 12 10:08, NEW format). Sizes don't match — live is
serving the stale committed version, confirming the diagnosis in §1-2.

**4.** NEW `build_guide.py` prints the **SCHOOL week** everywhere (cover
`Week {school}` line + every page footer), never the site/route week:
```python
school = week + SCHOOL_WEEK_OFFSET   # SCHOOL_WEEK_OFFSET = 2
...
f'<div class="foot-l">Whale Class · Circle Time Guide · Week {school} · {theme}</div>'
...
<div class="cv-week">Week <span>{school}</span></div>
```
(build_guide.py lines 32, 538, 544, 553.) Confirmed against the rendered
week4 PDF: page3 eyebrow reads "WEEK 6 · MY FEELING · SHOW ME YOUR FACE" for
site week 4 (4+2=6) — matches.
