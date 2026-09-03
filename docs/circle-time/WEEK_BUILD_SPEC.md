# WEEK BUILD SPEC — Whale Class circle-time, any week N
**Rewritten 2026-09-03. This is the mechanical build procedure for ONE week of circle time.
A fresh session should be able to build week N from this file alone.**

Original version (2026-09-02) was written for the five May weeks only. This version is
generic: same proven formula, same container, one week at a time, for weeks 3–37 and beyond.

Repo root (Mac): `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree`
(= `$HOME/mnt/montree` over the remote-devices bridge). All paths below are repo-relative.

---

## ⚠️ Week numbers — SITE numbering (locked by Tredoux, 2026-09-03)

`N` everywhere in this spec is a **site week: a taught week counted from Sep 1
2026**, 1–36. Week 1 = "I'm Special" (Sep 1–5) … Week 36 = Graduation
(Jun 14–18). This is what the pages, routes, gate keys,
`public/circle-time-weeks.js`, `status.py`, `check_week.py` and `mj_convert.sh`
all use.

**The authority on which week is which — number, theme, real dates, day count,
Dark Phonics lesson — is `docs/circle-time/YEAR_CALENDAR_2026-27.md`.** Read it
before building a week. `Whale_Class_Circle_Time_Decoded_2026-2027.md` now heads
its sections with the same SITE numbers (`## WEEK <site>`).

**🚨 The old `sheet = site + 2` offset is DEAD** — the principal's printed plan
merges two weeks, drops three and adds four, so no constant offset exists. The
calendar file's `Sheet` column is the only map back to her sheet.

---

## 0. Sources of truth — read these three, in this order

| # | File | What it gives you |
|---|---|---|
| 1 | `docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md` | **THE CONTENT.** One `## WEEK <sheet>` section per week (sheet 5–37 = site 3–35): theme, 5 words, Littles/Bigs tiers, the five Magic Box objects, the daily games, the week's ukulele song with chords + chorus + five verses, the four shelf trays, the Friday parent wrap-up and its Dark Phonics letter. The principal's own sheet weeks 1–4 (site weeks 1–2 plus her two untaught August weeks) are **not** in this doc. |
| 2 | `public/circle-time-week2.html` (or the most recently shipped week) | **THE CONTAINER.** Copy it; never hand-write the shell. |
| 3 | `public/circle-time-weeks.js` | **THE REGISTRY.** The year's week manifest + the tab strip every page renders. One entry per week; flipping `built:false → true` is what publishes a week to the tabs. |

Supporting: `docs/circle-time/circle-time-page-spec.md` (DOM/CSS anatomy),
`docs/circle-time/HANDOFF-week2-my-body.md` (the week-1→2 build diary),
`CLAUDE.md` § "🐳 Circle Time (Teachers tab)".

---

## 1. THE FORMULA — non-negotiable, this is what works in class

Every week, every day, without exception. If the decoded doc and this list ever disagree,
the decoded doc wins on *content* and this list wins on *shape*.

1. **Five words to own by Friday.** Named on the page in `.glance` as five `.chip`s.
2. **Two tiers, every day.** *Littles (2.5–3)* get one word + a gesture. *Bigs (4–6)* get
   2–3 sentence frames. Both tiers are named out loud in at least one block per day.
3. **The 13-minute daily flow, always in this order:**
   | Minutes | Block | |
   |---|---|---|
   | 2 | **Magic Box hook** | box chant → shake → sniff → dramatic peek → the day's real object |
   | 4 | **Teach** | the day's word dramatised with that object; teacher gets it wrong once on purpose so the class corrects him |
   | 3 | **Song — the finger-play slot** | chorus → **today's verse** → chorus, with the actions. This slot is what carries the day's verse; it is never skipped and never replaced by a second song. |
   | 3 | **Game** | one named game, tied to the day's word |
   | 1 | **Close** | whisper → normal → **SHOUT**, the week's line |
   (The two shipped September weeks say "10–15 min" and run 2/4/3/3/1 with a longer teach.
   Weeks 9+ in the decoded doc are written to 13 min. Use the decoded doc's numbers.)
4. **One real object per day in the Magic Box** — five for the week, listed in the decoded doc.
5. **Exactly ONE original ukulele song per week.** Same chorus at every circle, one new verse
   each morning, the whole song top-to-bottom on Friday — *that Friday run-through IS the
   week's review*. **Never a second sung song in the same week.**
   **Chords: C · F · G7 · Am only.** Reuse shapes across weeks; add a shape only if the melody
   truly needs it (it never has yet).
6. **Weekly rituals stay verbatim** — the generic `.extra` `<details>` block "Weekly rituals"
   is copied unchanged from week to week. Only the "Principal coverage map" table changes.
7. **Montessori theme shelf: exactly 4 trays**, each with a control of error, each favouring an
   object the children already met in that week's Magic Box. Printed as page 18 of the pack.
8. **Friday = full-week review + parent wrap-up**, and the wrap-up names **that week's Dark
   Phonics letter/sound** (decoded doc gives it per week).
9. **18-page print pack**, per-section 🖨️ print buttons on every printable section, plus the
   whole-pack and wrap-up print modes.
10. **A4 ring-bound guide PDF**, 8 pages, **left text edge ≥ 22 mm** (punch-hole gutter).
11. **Chinese angle worked in wherever it is natural** (solar terms, festivals, characters) —
    the decoded doc marks these per week.

---

## 2. Files a week owns

For week `N` (use the bare number: `3`, `17`, `32` — no zero padding):

| Thing | Path |
|---|---|
| Page | `public/circle-time-week<N>.html` |
| Images | `public/circle-time-images/week<N>/ct-week<N>-<slug>.jpg` |
| Guide PDF | `public/circle-guide-week<N>.pdf` |
| MJ prompts | `docs/circle-time/mj-prompts-week<N>.md` |
| Clean URL | `/teachers-w<N>` |

`/teachers` + `/circle-guide.pdf` are the LIVE week — a *copy* of one of the above, swapped
on Sunday (§7). They are not a week's own files.

**Two historical route spellings exist and must not be "tidied":** site week 1 is at
`/teachers-week1` and site week 2 at `/teachers-next`. Everything from week 3 on uses
`/teachers-w<N>`. The tab strip reads each week's route out of the manifest, so the odd ones
cost nothing — just never hardcode a route anywhere else.

---

## 3. Build the page

```bash
cd "$HOME/mnt/montree"
cp public/circle-time-week2.html public/circle-time-week<N>.html   # or the latest shipped week
```

### 3a. COPY VERBATIM — do not touch
- Head: doctype/meta/`<title>Whale Class Circle Time</title>`/Google-Fonts link
  (Fredoka + Atkinson Hyperlegible).
- The whole `<style>` block. Every rule is load-bearing. **Hard-won print CSS you must not
  "clean up":**
  - `@page{margin:12mm}`
  - `body.print-pack .poster{min-height:266mm}` and the same for `body.print-one #printOneHost .poster`
  - `body.print-pack .poster .p-img{flex:1 1 0; min-height:0; width:auto; max-width:100%; max-height:100%; object-fit:contain}`
    — flex-grow is what lets a poster image self-size around variable caption text. A fixed
    size fights the text and spills pages.
  - `body.print-pack .card .card-img, body.print-one #printOneHost .card .card-img{width:130px;height:130px}`
    — the two print paths used to disagree (96px vs 130px); unified at 130px. Screen stays 96px.
  - `body.print-pack .day-head{display:none!important}` — leaving it visible pushes the theme
    poster to a second page and throws the 18-page count off by one.
  - `body.print-pack .sheet{… page-break-after:always}` + `:last-child{page-break-after:auto}`
  - the `#pt-portrait` enlargement block (`.portrait-svg` → 620×571 in print).
  - `.p-emoji.fb` / `.card .ce.fb` emoji-fallback sizing.
- The head `<script>` defining `imgFallback(el,emo)` — it must stay in the HEAD (the `onerror`
  fires while the body is still parsing).
- `#gate` markup (🐳 / "Whale Class Teachers" / password input).
- `<div id="week-tabs" data-week="…"></div>` as the FIRST child of `.wrap` — change only the
  number (§4).
- `<div id="printOneHost"></div>` immediately before the tail script.
- The tail `<script>`: tab wiring, `printSection(id)`, `afterprint` cleanup, password gate.
  - **Password `THISDL`** (compared upper-cased).
  - **Bump the `sessionStorage` key per week**: `wc_ct<N>`. Two pages sharing a key unlock
    each other, including a half-built one.
  - `show(wd>=1&&wd<=5?wd:1)` opens today's tab on weekdays. Keep.
- `<script src="/circle-time-weeks.js" defer></script>` as the last line before `</body>`.

### 3b. IDS THAT MUST SURVIVE UNCHANGED
- Sections `day1 … day8` — `days={1:day1,…,8:day8}` resolves them by implicit global;
  renaming breaks the tabs **silently**.
- Song-tab print ids: `sng-chords`, `sng-chorus`, `sng-verses`, `sng-uketips`.
- Print-pack ids: `pt-theme`, `pt-words`, `pt-sentence`, `pt-songchorus`, `pt-ukulele`,
  `pt-bodycontrol`, `pt-bodycutapart`, `pt-yummymat`, `pt-sortcards`, `pt-actioncards`,
  `pt-portrait`, `pt-awards`, `pt-shelfguide`, `pt-wrapup`.
> The `pt-` names are historical (week 1 was "yummy/yuck"; week 2 reused `pt-yummymat` for
> Inside/Outside signs). **Keep the id, change the visible label.** Renaming ids for tidiness
> is the single easiest way to ship a broken print button.
- `#week-tabs` and the `.wt*` classes belong to the tab strip. The week tabs deliberately do
  **not** use `.tab` — `document.querySelectorAll('.tab')` in the tail script must keep
  returning exactly the 8 day tabs.

### 3c. REGIONS TO REPLACE, in file order
| Region | What to write |
|---|---|
| `<div id="week-tabs" data-week="N">` | this week's number |
| `<h1>` + `.theme-line` | theme title; `Week of <strong>May 10&ndash;14</strong> · 13 min a day · ages 2.5&ndash;6, English learners` |
| `.guidebook` | `href="/circle-guide-week<N>.pdf"` |
| `.glance` | the 5 `.chip` words; Littles / Bigs `.frame` lines (from the decoded doc) |
| 8 `.tab` buttons | Mon–Fri `<small>` = that day's sub-theme; Song / Print / Wrap unchanged |
| `#day1 … #day5` | the five day scripts (§6 voice template) |
| `#day6` Song tab | song title/blurb; keep the C/F/G7 SVG chord boxes verbatim, add the Am box only if the song needs it; replace the lyric blocks inside `sng-chorus` / `sng-verses`; `sng-uketips` is generic — keep |
| `#day7` Print pack | 18 pages — §5 |
| `#day8` Wrap-up | Friday parent recap inside `#pt-wrapup`, ending with the week's Dark Phonics letter |
| `.extra` `<details>` | "Weekly rituals" is generic — keep verbatim. Update the "Principal coverage map" table to this week's row |

Length calibration: ~55 lines of HTML per day section; a finished page is **900–1150 lines**.
Outside that range, something is wrong.

---

## 4. The tab strip — ONE registration point

Every page renders the same horizontal week strip at the very top of `.wrap`, from
`public/circle-time-weeks.js`. Two ingredients, and nothing else:

```html
<div class="wrap" hidden>
  <div id="week-tabs" data-week="<N>"></div>     <!-- first child of .wrap -->
  …
<script src="/circle-time-weeks.js" defer></script>   <!-- last line before </body> -->
```

**`data-week` is the page's own week number** — it is what gets highlighted, and the strip
auto-scrolls that tab into view on load. `public/circle-time.html` is a copy of whichever
week is live, so **its `data-week` must be the copied week's number**, not 1 forever. The
Sunday swap (§7) is the step that keeps it correct.

To publish a week to the tabs, edit **one entry** in `public/circle-time-weeks.js`:

```js
{ n: 3, short: "…", full: "…", dates: "Sep 15–19",
  mon: "2026-09-15", fri: "2026-09-19", route: "/teachers-w3", built: true },
```

- `short` — the tab label after `W3 · `. Two words max; it truncates with the full text in
  the tooltip on narrow screens.
- `full` / `dates` — tooltip text.
- `mon` / `fri` — ISO first and last teaching day. Every week 1–36 has real dates; `null`
  is only for a week whose dates genuinely aren't recorded anywhere.
- `route` — the week's stable clean URL. **Read routes from here; never hardcode a route in
  a page.** Week 2's route is `/teachers-next` **only until its Sunday swap** — at swap time
  it becomes `/teachers-week2` (add the rewrite + publicPaths entries first, §6).
- `built: false` renders a dashed ghost tab with no link; `true` renders a solid link.
- `LIVE_WEEK` at the top of the file = the week currently served at `/teachers`. It draws the
  small live dot. Bump it in the swap step.

Four ranges in the manifest are **not** Mon–Fri: weeks 22 and 23 run Tue–Sat, week 4 is a
four-day week (Sep 21–24) and week 26 is the four-day Qingming week ending Sat 10 Apr (a
make-up school day). They are copied verbatim from the principal's sheet as decoded. **Do not
"fix" them here** — fix the decode first. The shipped September weeks (1: Sep 1–5,
2: Sep 8–12) are also Tue–Sat as printed on the pages; that is an open question for Tredoux,
not a bug to silently correct.

**The strip is PRE-RENDERED, not built by JavaScript.** After ANY edit to
`public/circle-time-weeks.js` — a new week, a `built:true`, a renamed route, a date fix — run:

```bash
python3 scripts/circle-time/render_tabs.py          # --check to preview
```

It bakes the manifest's own markup (and the strip's `<style>`) into every
`public/circle-time*.html` between `<!-- week-tabs:start -->` / `<!-- week-tabs:end -->`
markers, so the strip is on screen at first paint instead of flickering in after load. The
markup and the CSS both come out of `circle-time-weeks.js` itself (`window.WHALE_WEEK_TABS_HTML`
/ `_CSS`) — the script never re-implements them. It is idempotent; `check_week.py` fails a page
whose markers are missing. The JS still renders client-side as a fallback for a page that has
never been through the script.

**There is no other week navigation.** The old `📅 Other weeks` `<details>` picker was removed
from all eight pages on 2026-09-03 — do not reintroduce a second list to keep in sync.

---

## 5. The print pack — exactly 18 pages, this order

The button says `Print the whole pack (18 pages)`. Keep it truthful.

| Page(s) | id | Content |
|---|---|---|
| 1 | `pt-theme` | Theme poster: `.p-img` + `.p-title` + `.p-sub` "Whale Class 🐳" |
| 2–6 | `pt-words` | 5 word posters, one `.sheet.poster` each: image + `.p-word` + `.p-sub` sentence |
| 7 | `pt-sentence` | Sentence frames: image + "We can say…" + `.p-frames` with `<span class="bl">___</span>` blanks |
| 8 | `pt-songchorus` | Chorus poster: image + chorus as `.p-title` (2.8rem) + `.p-sub` song name |
| 9 | `pt-ukulele` | `.sheet.songsheet`: title, chord/strum line, `.sv` section headers, `<span class="sc">C</span>` inline chips, chorus + 5 daily verses |
| 10 | `pt-bodycontrol` | 3-part cards, CONTROL sheet: `.cards.c2`, 6 `.card`s = image + `.cw` word, last is the whole-theme control card with `.cs` "control cards — do not cut" |
| 11 | `pt-bodycutapart` | Same 5 images with NO words + a `.cs` "cut all cards apart ✂️", then a second `.cards.c2` of label-only cards (`style="min-height:70px"`) |
| 12–13 | `pt-yummymat` | Two full-page sorting signs — this week's binary (Inside/Outside wk2, Light/Dark wk32) |
| 14 | `pt-sortcards` | `.cards.c3` of 12 sorting cards + a `.cs` explaining the control of error (tick the backs) |
| 15 | `pt-actioncards` | `.cards.c2` of 8 "I can ___!" action cards |
| 16 | `pt-portrait` | One-per-child worksheet: `.p-title`, inline `<svg class="portrait-svg">` line drawing, instruction line, two `.writeline` fill-ins |
| 17 | `pt-awards` | Two identical award halves (`.card` min-height:220px), badge image + `.writeline` for the name |
| 18 | `pt-shelfguide` | `<table class="shelfguide">`, 4 rows = the four trays, each naming which printed pages feed it |

Each page is preceded by:
```html
<p class="sheet-label screen-only">Page N · …</p>
<button class="sectionprint" onclick="printSection('pt-xxx')">🖨️ Print this page</button>
```
`.sheet-label` / `.screen-only` are hidden in every print path — they exist so the teacher can
see the page order on screen.

For a non-body week, swap the `#pt-portrait` SVG for a themed drawing frame (a rocket window,
a fossil-dig square) **keeping** `class="portrait-svg"`, `role="img"` and a real `aria-label` —
the print CSS enlarges by class.

---

## 6. The mechanical build, step by step

1. **Read** the decoded doc's section for week N end to end. That is the content brief.
2. **Copy** the latest shipped week's page → `public/circle-time-week<N>.html` (§3).
3. **Fill** every region in §3c from the decoded doc; bump `sessionStorage` key to `wc_ct<N>`;
   set `data-week="<N>"`; point `.guidebook` at `/circle-guide-week<N>.pdf`.
4. **Guide PDF** → `public/circle-guide-week<N>.pdf` (§8). Day scripts word-for-word identical
   to the HTML day tabs.
5. **MJ prompts** → `docs/circle-time/mj-prompts-week<N>.md` (§9), then art →
   `public/circle-time-images/week<N>/` (§9d). The page ships before the art lands — every
   `<img>` carries `onerror="imgFallback(this,'<emoji>')"`.
6. **Routing — two files, both required:**
   - `next.config.ts` → `async rewrites()` → `afterFiles`, beside the existing entries (~line 366+):
     ```ts
     { source: '/teachers-w<N>', destination: '/circle-time-week<N>.html' },
     ```
   - `middleware.ts` → `publicPaths`, beside the existing circle-time entries (~line 510+):
     ```ts
     '/teachers-w<N>',            // Week N · <theme> (<dates>)
     '/circle-guide-week<N>.pdf', // its guide book
     ```
     Both lines are REQUIRED. `.pdf` is **not** in the matcher's static-extension exclusion
     (`svg|png|jpg|jpeg|gif|webp|html|avif|json|webmanifest`), so an unlisted PDF 302s to `/`.
     Neither is `.js` — which is why `/circle-time-weeks.js` has its own publicPaths entry.
     `publicPaths` matches `pathname === path || pathname.startsWith(path + '/')`, so entries
     are exact route strings.
7. **Register** the week in `public/circle-time-weeks.js`: `built: true` + `route` + `short` +
   `full` + `dates` + `mon`/`fri` (§4). This is the only place the tabs learn about a week.
8. **Stage** — the week is now live at `/teachers-w<N>` as a preview while `/teachers` still
   serves the current week.
9. **Verify** (§10), then commit (§11).
10. **Sunday swap** (§7) when the week goes live.

---

## 7. The Sunday swap (outgoing week → archive, incoming week → live)

Run in this order. Every step matters.

```bash
cd "$HOME/mnt/montree"
# 1. the incoming week becomes the live page
cp public/circle-time-week<N>.html public/circle-time.html
cp public/circle-guide-week<N>.pdf public/circle-guide.pdf
```
Then, **in `public/circle-time.html` only**, fix the two things a straight copy gets wrong:
- `data-week` must stay the **copied week's** number (it already is, if you copied a correct
  page — but check it, this is the #1 swap regression: a live page highlighting the wrong tab).
- the `.guidebook` href must become **`/circle-guide.pdf`** (the live alias), not
  `/circle-guide-week<N>.pdf`.
- the `sessionStorage` key: `circle-time.html` and `circle-time-week<N>.html` are now the same
  content on two URLs, so sharing `wc_ct<N>` between them is fine and intended.

In `public/circle-time-weeks.js`:
- set `LIVE_WEEK = <N>`;
- if the outgoing week's `route` was a temporary one, **flip it to its archive URL** — this is
  what week 2 needs: `/teachers-next` → `/teachers-week2`, after adding
  `{ source: '/teachers-week2', destination: '/circle-time-week2.html' }` to `next.config.ts`
  and `'/teachers-week2'` to `middleware.ts` publicPaths. (Keep the old `/teachers-next`
  entries in place so already-shared links keep working.)

Sanity: `/teachers` and `/teachers-w<N>` now serve identical content, the strip highlights
W`<N>` on both, and the previous week is still reachable from its own tab.

---

## 8. The guide book PDF

8 A4 pages (595×842pt):
1. Cover — WHALE CLASS / Circle Time / Guide / "Everything you need, one page per day" / theme
2. Week Overview — 🗺 "Print · laminate · ring-bind · hold this all week", the 5 words, Littles/Bigs
3–7. MONDAY…FRIDAY — sub-theme · "Today's words:" · "Grab:" · the verbatim script with
   `2 MIN MAGIC BOX HOOK`-style time badges, ending in a "Today's song moment" footer
8. Songbook — ⭐ song title, `C (0003) · F (2010) · G7 (0212)` chord chips, chorus + all five
   verses, "chorus → today's verse → chorus; Friday sing the whole thing top to bottom"

Layout rules (measured off the shipped PDFs):
- `@page { size: A4; margin: 0 }`, body padding producing a **left text edge ≈24mm**, right
  ≈196mm — **never less than 22mm on the left**; the pages are ring-bound and the punch holes
  eat the gutter.
- One day = exactly one page. Never let a day spill.
- Scripts are **verbatim the same words as the HTML day tab**.

### Build (run in the CLOUD CONTAINER — the Mac has neither Playwright nor pdfplumber)
```bash
# 1. author the source in scratch: /tmp/claude-*/scratchpad/circle-guide-week<N>.html
# 2. render
node -e '
const {chromium}=require("playwright");(async()=>{
 const b=await chromium.launch();const p=await b.newPage();
 await p.goto("file:///ABS/PATH/circle-guide-week<N>.html",{waitUntil:"networkidle"});
 await p.pdf({path:"/ABS/PATH/circle-guide-week<N>.pdf",format:"A4",printBackground:true,
              margin:{top:"0",right:"0",bottom:"0",left:"0"}});
 await b.close();})();'
# 3. verify BEFORE delivering
python3 - <<'PY'
import pdfplumber
p=pdfplumber.open("/ABS/PATH/circle-guide-week<N>.pdf")
assert len(p.pages)==8, len(p.pages)
for i,pg in enumerate(p.pages):
    w=pg.extract_words(); x0=min(x["x0"] for x in w)/72*25.4
    assert 592<pg.width<598 and 838<pg.height<846, (pg.width,pg.height)
    assert x0>=22, (i+1,x0)          # ring-bind gutter
    print(i+1, "%.1fmm"%x0, (pg.extract_text() or "").split("\n")[0][:40])
PY
```
Deliver to `public/circle-guide-week<N>.pdf` (`SendUserFile` → `device_commit_files`, or
Desktop Commander `write_file`) and **verify byte size + sha256 on the Mac before committing** —
the file bridge has corrupted transfers before (CLAUDE.md, Aug 2026: two batches each landed as
the same 476KB HTML page).

Keep the guide's HTML source in your scratchpad and put its path in your handoff; guide sources
are not currently committed.

---

## 9. Images: Midjourney → repo

### 9a. Counts and shapes (weeks 1, 2 and 32–36 are all exactly 37 files)
- 8 posters, portrait **928×1232** JPEG: `theme`, the 5 word posters, `sentence-frames`, `chorus`
- 28 cards, square **1000×1000** JPEG: the 3-part-card set, the sorting set, 8 `can-*` action
  cards, the whole-theme `*-control` card
- 1 award badge: `badge-star`

### 9b. Filenames
`ct-week<N>-poster-<word>.jpg` · `ct-week<N>-card-<word>.jpg` · `ct-week<N>-card-can-<verb>.jpg` ·
`ct-week<N>-card-<theme>-control.jpg` · `ct-week<N>-badge-star.jpg`
(lower-case, hyphens only; `src` = `/circle-time-images/week<N>/<file>.jpg`)

### 9c. Prompt style — LOCKED, keep every week consistent
Subject description first, then this suffix verbatim:

> `, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame`

Flags: `--raw --stylize 50` · posters `--ar 3:4` · cards `--ar 1:1`.

- **Cards must be hyper-literal and singular:** "one single \<thing\>, centred, nothing else in
  frame". A card showing a scene cannot be matched by a 3-year-old.
- Always include the full negative list; MJ hallucinates stray text into children's art.
- Do not raise stylize past 50.
- MJ's AI Moderator flags "bare" body-part wording even for cartoons — use "flat cartoon
  illustration, children's book art, no photo-realism" for those.
- Do **not** use the Dark Phonics pen-and-ink style from `CLAUDE.md` — different system.

### 9d. Pipeline
1. Write all ~37 prompts as a numbered list in `docs/circle-time/mj-prompts-week<N>.md`.
2. Tredoux (or an MJ browser agent) runs them; upscales saved as PNG into
   `~/Downloads/circle-time-mj/` named `ct-week<N>-<slug>.png`.
3. Convert + place (on the Mac):
   ```bash
   cd ~/Downloads/circle-time-mj
   mkdir -p "$MONTREE/public/circle-time-images/week<N>"
   for f in ct-week<N>-*.png; do
     sips -s format jpeg -s formatOptions 80 "$f" \
       --out "$MONTREE/public/circle-time-images/week<N>/${f%.png}.jpg" >/dev/null
   done
   ls "$MONTREE/public/circle-time-images/week<N>" | wc -l   # expect 37
   ```
   Target ≈2–5 MB per week folder (wk1 4.8M, wk2 2.1M).
4. MJ submit automation: `Control_Chrome__execute_javascript` against an explicit `tab_id`,
   never "current tab"; set the prompt via the native `HTMLTextAreaElement` value setter +
   `input` event, then click Submit by exact text match; ≤1 submit / 30s. Download full-res via
   `fetch()` from inside the authenticated Chrome tab (curl from the Mac hits a Cloudflare
   challenge); one file per tool call.

---

## 10. Verification checklist — all must pass before you push

Page:
- [ ] `grep -c 'circle-time-images/week<N>' public/circle-time-week<N>.html` → **43**
- [ ] only its own `week<N>` token outside the generated strip (`check_week.py` asserts this;
      the strip itself links every other week, e.g. `/teachers-week1`)
- [ ] `grep -c imgFallback public/circle-time-week<N>.html` ≥ 44 (1 definition + 43 handlers)
- [ ] every `printSection('…')` id exists in the file
- [ ] `sessionStorage` key is `wc_ct<N>`, password still `THISDL`
- [ ] print-pack button text matches the actual page count (18)
- [ ] file is 900–1150 lines

Tabs:
- [ ] `grep -o 'id="week-tabs" data-week="[0-9]*"' public/circle-time-week<N>.html` → `<N>`
- [ ] `grep -c 'circle-time-weeks.js' public/circle-time-week<N>.html` ≥ 1
- [ ] no `id="weekpicker"` / "Other weeks" anywhere in `public/circle-time*.html`
- [ ] `node --check public/circle-time-weeks.js`
- [ ] `python3 scripts/circle-time/render_tabs.py` run after the manifest edit (the page must
      carry `<!-- week-tabs:start -->` … `<!-- week-tabs:end -->`)
- [ ] manifest audit — weeks sequential, no overlapping date ranges, every `built:true` route
      present in BOTH `next.config.ts` and `middleware.ts`:
      ```bash
      node -e '
      const fs=require("fs");global.window={};global.document={readyState:"complete",getElementById:()=>null,addEventListener(){}};
      eval(fs.readFileSync("public/circle-time-weeks.js","utf8"));
      const W=window.WHALE_WEEKS,nc=fs.readFileSync("next.config.ts","utf8"),mw=fs.readFileSync("middleware.ts","utf8");
      W.filter(w=>w.built).forEach(w=>console.log(
        (nc.includes("source: \x27"+w.route+"\x27")&&mw.includes("\x27"+w.route+"\x27")?"OK  ":"FAIL"),w.n,w.route));'
      ```
- [ ] the 8 `.tab` day buttons still resolve (the week tabs use `.wt`, never `.tab`)

Routing / PDF:
- [ ] `/teachers-w<N>` in BOTH `next.config.ts` rewrites and `middleware.ts` publicPaths
- [ ] `/circle-guide-week<N>.pdf` in publicPaths
- [ ] guide PDF: 8 pages, A4, left text edge ≥22mm, scripts word-for-word equal to the day tabs

By eye, in a browser:
- [ ] gate → `THISDL` → all 8 day tabs render
- [ ] the week strip shows at the very top, this week's tab highlighted and scrolled into view,
      unbuilt weeks dashed and unclickable, built weeks navigating correctly
- [ ] "Print the whole pack" preview = 18 pages, no blank pages, no week strip in the preview,
      posters full-bleed, cut-apart cards small
- [ ] `git status --short` shows ONLY your intended paths staged

---

## 11. Deployment — Tredoux's rules, follow exactly

- **The working tree carries ~124 unrelated modified files.** **NEVER `git add -A` /
  `git commit -a`.** Add only the week's own files, by explicit path.
- **Run git through Desktop Commander `start_process` on the Mac**, not through the bridge
  shell — the bridge cannot write `.git/index.lock` ("Operation not permitted").

```bash
cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
git add public/circle-time-week<N>.html \
        public/circle-guide-week<N>.pdf \
        public/circle-time-images/week<N> \
        public/circle-time-weeks.js \
        docs/circle-time/mj-prompts-week<N>.md \
        next.config.ts middleware.ts
git commit -m "Add week-<N> circle-time page (<theme>)"
git push origin main
```
Branch is **`main`**; pushing triggers the Railway auto-deploy. Live in a few minutes at
`https://www.teacherpotato.xyz/teachers-w<N>`.
Reference commits: `6bec723d2` (week 2 page + 37 images + PDF + routing), `61a3f6001` (guide PDF).

---

## 12. Known landmines
1. Renaming a `pt-*` / `sng-*` / `day*` id breaks a print button or a tab **silently**.
2. Editing the shared print CSS re-breaks the 96px-vs-130px card mismatch and poster page-spill.
3. `.pdf` and `.js` are not in the middleware matcher's extension exclusion — a guide PDF or a
   script without a `publicPaths` entry 302s to `/` for logged-out teachers.
4. The remote-devices file bridge has silently corrupted transfers and served stale staged
   copies — grep for a known-new marker and check sha256 on the Mac after any transfer.
5. Parallel workers editing `next.config.ts` / `middleware.ts` / `circle-time-weeks.js` at once
   WILL conflict. Serialise those three files, or nominate one worker to land all the lines.
6. A swap that forgets `data-week` leaves `/teachers` highlighting the wrong week — the page
   looks fine, the strip lies.
