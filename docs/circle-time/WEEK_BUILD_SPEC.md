# WEEK BUILD SPEC — Whale Class circle-time weeks
**Written 2026-09-02 by a read-only scout. Source of truth = the two shipped weeks:
`public/circle-time.html` (week 1, "I'm special") and `public/circle-time-week2.html`
(week 2, "My Body", Sep 8–12). Week 2 is the TEMPLATE — copy it, never hand-write the shell.**

Audience: five parallel workers, one May week each (weeks 32–36 of the principal's sheet,
content already decoded in `docs/circle-time/May_circle_time_decoded.md`).
Follow this top to bottom. Do not read the whole codebase; everything you need is here.

All paths are absolute-from-repo-root of
`/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree`
(= `$HOME/mnt/montree` over the remote-devices bridge).

---

## 0. Week assignment table (agree these BEFORE anyone writes a file)

| Worker | Week | Dates | Theme | 5 words | Song |
|---|---|---|---|---|---|
| A | 32 | 10–14 May | Big Bang and the Universe | dark · light · star · big · bang | "The Big Bang Boom" (C·F·G7) |
| B | 33 | 17–21 May | Solar System | sun · moon · Earth · round · hot | "Round and Round" (C·F·G7·Am) |
| C | 34 | 24–28 May | Space Exploration | rocket · astronaut · up · down · blast off | "Blast Off!" (C·F·G7) |
| D | 35 | 31 May – 4 Jun | Dinosaurs and Fossils (1) | dinosaur · big · teeth · roar · egg | "Dinosaur Stomp" (C·F·G7·Am) |
| E | 36 | 7–11 Jun | Dinosaurs and Fossils (2) + May review | fossil · bone · dig · rock · old | "Dig, Dig, Dig" (C·F·G7) |

Everything else per week (Magic Box object per day, 13-min flow, four shelf trays, Friday
wrap-up, Dark Phonics sound) is already written in `docs/circle-time/May_circle_time_decoded.md`
— that doc is your CONTENT BRIEF. This spec is the CONTAINER.

---

## 1. Files to create (naming convention — extend the existing `weekN` scheme)

For week `NN` (32…36):

| Thing | Path |
|---|---|
| Page | `public/circle-time-week<NN>.html` |
| Images | `public/circle-time-images/week<NN>/ct-week<NN>-<slug>.jpg` |
| Guide PDF | `public/circle-guide-week<NN>.pdf` |
| Clean URL | `/teachers-w<NN>` |

Wiring (two one-line edits each — **coordinate, these two files are shared by all five workers;
one worker should land all ten lines in a single commit, or workers must serialise**):

1. `next.config.ts` → inside `async rewrites()` → `afterFiles` array, next to the existing
   `/teachers` and `/teachers-next` entries (~line 366–376):
   ```ts
   { source: '/teachers-w32', destination: '/circle-time-week32.html' },
   ```
2. `middleware.ts` → `publicPaths` array (next to the existing `'/teachers'`,
   `'/circle-guide.pdf'`, `'/teachers-next'`, `'/circle-guide-week2.pdf'` entries):
   ```ts
   '/teachers-w32',            // May week 32 circle-time page (rewrite → public/circle-time-week32.html)
   '/circle-guide-week32.pdf', // its guide book — top-level public/*.pdf is NOT covered by the matcher's extension exclusion
   ```
   Both entries are REQUIRED. Without them the legacy Supabase gate 302s the page and the PDF to `/`.

**There is no week picker today.** `/teachers` (week 1) and `/teachers-next` (week 2) are not linked
to each other; `app/page.tsx` line ~278 links only `/teachers`. If a picker is wanted, that is a
separate, single-owner task — do not each add one.

---

## 2. Build the page: copy week 2, replace only the marked regions

```bash
cp public/circle-time-week2.html public/circle-time-week32.html
```

### 2a. COPY VERBATIM — do not touch
- Lines 1–8: doctype/head/meta/`<title>Whale Class Circle Time</title>`/Google-Fonts link
  (Fredoka + Atkinson Hyperlegible).
- Lines 9–229: the entire `<style>` block. Every rule in it is load-bearing. Specifically
  **hard-won print CSS you must not "clean up":**
  - `@page{margin:12mm}`
  - `body.print-pack .poster{min-height:266mm}` and the same for `body.print-one #printOneHost .poster`
  - `body.print-pack .poster .p-img{flex:1 1 0; min-height:0; width:auto; max-width:100%; max-height:100%; object-fit:contain}`
    — flex-grow is what lets a poster image self-size around variable caption text. A fixed size
    fights the text and spills pages.
  - `body.print-pack .card .card-img, body.print-one #printOneHost .card .card-img{width:130px;height:130px}`
    — the two print paths (whole-pack vs print-one) used to disagree (96px vs 130px); they are
    unified at 130px. Screen stays 96px (`.card .card-img`).
  - `body.print-pack .day-head{display:none!important}` — leaving the day heading visible pushed
    the theme poster onto a second page and threw the whole 18-page count off by one.
  - `body.print-pack .sheet{... page-break-after:always}` + `:last-child{page-break-after:auto}`
  - the `#pt-portrait` enlargement block (`.portrait-svg` → 620×571 in print).
  - `.p-emoji.fb` / `.card .ce.fb` emoji-fallback sizing.
- Lines 231–246: the head `<script>` defining `imgFallback(el,emo)` (must stay in the HEAD — the
  `onerror` fires while the body is still parsing).
- Lines 247–257: `#gate` markup (🐳 / "Whale Class Teachers" / password input).
- The tail `<script>` (~lines 968–1004): tab wiring, `printSection(id)` clone-into-`#printOneHost`,
  `afterprint` cleanup, and the password gate.
  - **Password is `THISDL`** (compared upper-cased).
  - **`sessionStorage` key: bump it per week** — week 2 uses `wc_ct3`. Use `wc_ct<NN>` (e.g.
    `wc_ct32`) so a teacher unlocking one week doesn't silently unlock a half-built one.
  - `show(wd>=1&&wd<=5?wd:1)` opens today's tab on weekdays. Keep.
- `<div id="printOneHost"></div>` immediately before the tail script. Keep.

### 2b. IDs THAT MUST SURVIVE UNCHANGED
Section ids: `day1 … day8` (`days={1:day1,…,8:day8}` in the tail script resolves them by
implicit global — renaming breaks the tabs silently).
Song-tab print ids: `sng-chords`, `sng-chorus`, `sng-verses`, `sng-uketips`.
Print-pack ids (referenced by every 🖨️ button):
`pt-theme`, `pt-words`, `pt-sentence`, `pt-songchorus`, `pt-ukulele`, `pt-bodycontrol`,
`pt-bodycutapart`, `pt-yummymat`, `pt-sortcards`, `pt-actioncards`, `pt-portrait`, `pt-awards`,
`pt-shelfguide`, `pt-wrapup`.
> The `pt-` names are historical (week 1 was "yummy/yuck", week 2 reused `pt-yummymat` for
> Inside/Outside signs). **Keep the id, change the visible label.** Renaming ids for tidiness is
> the single easiest way to ship a broken print button.

### 2c. REGIONS TO REPLACE (in file order, week-2 line numbers as a map)
| Lines | Region | What to write |
|---|---|---|
| 260–262 | `<h1>` + `.theme-line` | Theme title; `Week of <strong>May 10&ndash;14</strong> · 13 min a day · ages 2.5&ndash;6, English learners` |
| 264–267 | `.guidebook` | `href="/circle-guide-week32.pdf"` |
| 269–277 | `.glance` | 5 `.chip` words; Littles / Bigs `.frame` lines (from the May doc) |
| 279–286 | 8 `.tab` buttons | Mon–Fri `<small>` = that day's sub-theme; Song/Print/Wrap unchanged |
| 290–351 | `#day1` | Full Monday script (see §6 voice template) |
| 352–407 | `#day2` | Tuesday |
| 408–466 | `#day3` | Wednesday |
| 467–523 | `#day4` | Thursday |
| 524–576 | `#day5` | Friday |
| 577–678 | `#day6` Song tab | Song title/blurb; keep the three SVG chord boxes (C/F/G7) verbatim — add an Am box only if the week's song needs it; replace lyric blocks inside `sng-chorus` / `sng-verses`; `sng-uketips` is generic, keep |
| 679–888 | `#day7` Print pack | 18 pages — see §3 |
| 889–933 | `#day8` Wrap-up | Friday parent recap inside `#pt-wrapup` |
| 935–963 | `.extra` `<details>` | "Weekly rituals" is generic — keep verbatim. "Principal coverage map" — update to this week's row |

---

## 3. The print pack — exactly 18 pages, this order

The button text says the count: `Print the whole pack (18 pages)`. Keep it truthful.

| Page(s) | id | Content |
|---|---|---|
| 1 | `pt-theme` | Theme poster: `.p-img` + `.p-title` + `.p-sub` "Whale Class 🐳" |
| 2–6 | `pt-words` | 5 word posters, one `.sheet.poster` each: image + `.p-word` + `.p-sub` sentence |
| 7 | `pt-sentence` | Sentence-frames poster: image + "We can say…" + `.p-frames` with `<span class="bl">___</span>` blanks |
| 8 | `pt-songchorus` | Chorus poster: image + chorus as `.p-title` (font-size:2.8rem) + `.p-sub` song name |
| 9 | `pt-ukulele` | `.sheet.songsheet`: title, chord/strum line, `.sv` section headers, `<span class="sc">C</span>` inline chord chips, chorus + 5 daily verses |
| 10 | `pt-bodycontrol` | 3-part cards, CONTROL sheet: `.cards.c2`, 6 `.card`s = image + `.cw` word, last one is the whole-theme control card with `.cs` "control cards — do not cut" |
| 11 | `pt-bodycutapart` | Same 5 images with NO words + a `.cs` "cut all cards apart ✂️" tile, then a second `.cards.c2` of label-only cards (`style="min-height:70px"`) |
| 12–13 | `pt-yummymat` | Two full-page sorting signs (`.sheet.poster` ×2) — this week's binary (Inside/Outside in wk2; e.g. Light/Dark for wk32) |
| 14 | `pt-sortcards` | `.cards.c3` of 12 sorting cards + a `.cs` paragraph explaining the control of error (tick the backs) |
| 15 | `pt-actioncards` | `.cards.c2` of 8 "I can ___!" action cards |
| 16 | `pt-portrait` | One-per-child worksheet: `.p-title`, the inline `<svg class="portrait-svg">` line drawing, instruction line, two `.writeline` fill-ins |
| 17 | `pt-awards` | Two identical award halves (`.card` min-height:220px) using the badge image + a `.writeline` for the name |
| 18 | `pt-shelfguide` | `<table class="shelfguide">`, 4 rows = the four trays from the May doc, each naming which printed pages feed it |

Each page is preceded by:
```html
<p class="sheet-label screen-only">Page N · …</p>
<button class="sectionprint" onclick="printSection('pt-xxx')">🖨️ Print this page</button>
```
`.sheet-label` and `.screen-only` are hidden in every print path — they exist only so the teacher
can see the page order on screen.

The `#pt-portrait` SVG in week 2 is a body outline with dashed label leaders. For a non-body week,
swap it for a themed drawing frame (a rocket window, a fossil-dig square) **keeping**
`class="portrait-svg"`, `role="img"` and a real `aria-label` — the print CSS enlarges by class.

---

## 4. Images: Midjourney → repo

### 4a. Counts and shapes (week 1 and week 2 are both exactly 37 files)
- 8 posters, portrait **928×1232** JPEG: `theme`, the 5 word posters, `sentence-frames`, `chorus`
- 28 cards, square **1000×1000** JPEG: the 3-part-card set, the sorting set, 8 `can-*` action
  cards, the whole-theme `*-control` card
- 1 award badge: `badge-star`

### 4b. Filename convention
`ct-week<NN>-poster-<word>.jpg` · `ct-week<NN>-card-<word>.jpg` ·
`ct-week<NN>-card-can-<verb>.jpg` · `ct-week<NN>-card-<theme>-control.jpg` ·
`ct-week<NN>-badge-star.jpg`
(all lower-case, hyphens only; the `src` in the HTML is
`/circle-time-images/week<NN>/<file>.jpg`)

### 4c. Prompt style — LOCKED, keep May consistent with weeks 1–2
Style suffix appended to every prompt (subject description first):

> `, soft gouache storybook illustration, warm muted palette, simple rounded shapes, thick soft outlines, plain off-white background, children's picture-book art. no text, no words, no letters, no numbers, no captions, no speech bubbles, no border, no watermark, no frame`

Flags: `--raw --stylize 50` · posters `--ar 3:4` · cards `--ar 1:1`.

Rules learned on weeks 1–2:
- **Cards must be hyper-literal and singular.** "one single <thing>, centred, nothing else in
  frame" — a card that shows a scene cannot be matched by a 3-year-old.
- Always include the full negative list verbatim; MJ hallucinates stray text into children's art.
- `--raw --stylize 50` keeps MJ from prettifying past the house look. Do not raise stylize.
- ⚠️ This style string is reconstructed from the shipped art + the week-1/2 build session; it is
  **not** otherwise recorded in the repo. If Tredoux has the original prompt sheet, prefer his copy
  and update this section. (Do NOT use the Dark Phonics pen-and-ink style in `CLAUDE.md` — that is
  a different, unrelated style system.)

### 4d. Pipeline
1. Write all ~37 prompts as a numbered list; Tredoux (or an MJ browser agent) runs them.
2. He saves the chosen upscales as PNG into `~/Downloads/circle-time-mj/`, named
   `ct-week<NN>-<slug>.png` (this is exactly what week 1's folder looks like today).
3. Convert to JPEG and place them (run on the Mac):
   ```bash
   cd ~/Downloads/circle-time-mj
   mkdir -p "$MONTREE/public/circle-time-images/week32"
   for f in ct-week32-*.png; do
     sips -s format jpeg -s formatOptions 80 "$f" \
       --out "$MONTREE/public/circle-time-images/week32/${f%.png}.jpg" >/dev/null
   done
   ls "$MONTREE/public/circle-time-images/week32" | wc -l   # expect 37
   ```
   Target total ≈ 2–5 MB per week folder (wk1 4.8M, wk2 2.1M).
4. Every `<img>` in the page uses the fallback pattern so the page is shippable BEFORE the art lands:
   ```html
   <img class="p-img" src="/circle-time-images/week32/ct-week32-poster-theme.jpg"
        alt="Illustrated title poster: …" onerror="imgFallback(this,'🌟')">
   <img class="card-img" src="/circle-time-images/week32/ct-week32-card-star.jpg"
        alt="Illustrated single star" onerror="imgFallback(this,'⭐')">
   ```
   The emoji in `onerror` is the v1 emoji art for that slot — pick a real one for every image.
   `alt` text must describe the picture (it becomes the fallback's `aria-label`).

---

## 5. The guide book PDF (A4, ring-bound in-circle book)

`public/circle-guide-week2.pdf` = **8 A4 pages** (595×842pt):
1. Cover — WHALE CLASS / Circle Time / Guide / "Everything you need, one page per day" / theme title
2. Week Overview — 🗺 "Print · laminate · ring-bind · hold this all week", the 5 words, Littles/Bigs columns
3. MONDAY · sub-theme · "Today's words:" · "Grab:" · then the verbatim script with `2 MIN MAGIC BOX HOOK`-style time badges, ending in a "Today's song moment" footer
4. TUESDAY · same shape
5. WEDNESDAY · same shape
6. THURSDAY · same shape
7. FRIDAY · same shape
8. Songbook — ⭐ song title, `C (0003) · F (2010) · G7 (0212)` chord chips, chorus + all five verses,
   "chorus → today's verse → chorus; Friday sing the whole thing top to bottom"

Layout rules (measured off the shipped PDF):
- `@page { size: A4; margin: 0 }` with the page body padding producing a **left text edge at ≈24mm
  and a right edge at ≈196mm** — i.e. **never less than 22mm of left margin**, because the pages are
  ring-bound and the punch holes eat the gutter.
- One day = exactly one page. Never let a day spill.
- Scripts are **verbatim the same words as the HTML day tab** — the teacher must not find two
  different wordings.

### Build (run in the CLOUD CONTAINER — the Mac has neither Playwright nor pdfplumber)
```bash
# 1. author the source next to the page, in scratch:
#    /tmp/claude-*/scratchpad/circle-guide-week32.html
# 2. render
node -e '
const {chromium}=require("playwright");(async()=>{
 const b=await chromium.launch();const p=await b.newPage();
 await p.goto("file:///ABS/PATH/circle-guide-week32.html",{waitUntil:"networkidle"});
 await p.pdf({path:"/ABS/PATH/circle-guide-week32.pdf",format:"A4",printBackground:true,
              margin:{top:"0",right:"0",bottom:"0",left:"0"}});
 await b.close();})();'
# 3. verify BEFORE delivering
python3 - <<'PY'
import pdfplumber
p=pdfplumber.open("/ABS/PATH/circle-guide-week32.pdf")
assert len(p.pages)==8, len(p.pages)
for i,pg in enumerate(p.pages):
    w=pg.extract_words(); x0=min(x["x0"] for x in w)/72*25.4
    assert 592<pg.width<598 and 838<pg.height<846, (pg.width,pg.height)
    assert x0>=22, (i+1,x0)          # ring-bind gutter
    print(i+1, "%.1fmm"%x0, (pg.extract_text() or "").split("\n")[0][:40])
PY
```
Then deliver the PDF to the Mac at `public/circle-guide-week32.pdf`
(`SendUserFile` → `device_commit_files`, or Desktop Commander `write_file`) and
**verify the byte size / sha256 on the Mac before committing** — the file bridge has corrupted
transfers before (see CLAUDE.md, Aug 2026: two batches each landed as the same 476KB HTML page).

Keep the guide's HTML source in your scratchpad and paste its path into your handoff; it is NOT
currently kept in the repo (weeks 1–2 have no committed source either).

---

## 6. Voice + length template (copy the rhythm exactly)

Every day = five `.block`s: **2 min hook → 3 min teach → 3 min song → 4 min game → 1 min close**
(the May doc's 13-min flow is 2/4/3/3/1 — use the May numbers). Verbatim, from week 2, Monday:

```html
<section class="day" id="day1">
  <div class="day-head">
    <h2>Day 1 · My Body Parts</h2>
    <p>Today's words: <b>body · head · hands · feet</b></p>
  </div>
  <div class="grab"><b>Grab:</b> a large paper foot cut-out (trace your own shoe) in the Magic Box;
    a roll of butcher paper + a fat marker for the outline; blu-tack.</div>

  <div class="block">
    <h3><span class="badge">2 min</span> Magic Box hook</h3>
    <p>Shake the box, hold it to your ear. Whole class chants:</p>
    <div class="t"><span class="who">Everyone</span>“What's in the box? What's in the box?”</div>
    <p>Peek in. Gasp. Pull out the giant paper foot and hold it against your own foot.</p>
    <div class="t"><span class="who">Teacher</span>“A FOOT! Whose foot? … MY foot!”
      <span class="g">(stamp it twice)</span> “I have two feet — one, two!”</div>
    <p>Everyone stamps twice. <span class="kids">“Feet!”</span></p>
  </div>

  <div class="block">
    <h3><span class="badge">3 min</span> Teach · Head, hands, feet</h3>
    <div class="rhyme">
      <p>This is my <b>head</b>! <span class="g">(pat-pat)</span></p>
      …
    </div>
    <p>Littles just touch and say the one word. Bigs echo the whole line.</p>
    <p class="tip"><b>Teacher fails:</b> say “This is my head” while patting your <b>tummy</b>.
      Wait. The correction shout is the loudest language of the day — let them fix you twice.</p>
  </div>

  <div class="block">
    <h3><span class="badge">3 min</span> Song · … — chorus + Monday verse</h3>
    <button class="sectionprint" onclick="printSection('sng-chorus')">🖨️ Print sheet music</button>
    <div class="rhyme">…chorus lines with <span class="g">(actions)</span>…
      <p><b>Monday's verse:</b> …</p></div>
    <p class="tip"><b>The one song of the week</b> — same chorus at every circle, one new verse each
      morning. Chords and the full sheet are on the Song tab. Sing it twice.</p>
  </div>

  <div class="block">
    <h3><span class="badge">4 min</span> Game · The big body outline</h3>
    <p>“One, two, three — eyes on me!” …</p>
    <div class="t"><span class="who">Teacher</span>“What's this?” <span class="g">(point)</span></div>
    <p><span class="kids">“Head!”</span> &nbsp;Bigs: <span class="kids">“This is my head.”</span></p>
    <p class="tip">Trace the <b>littlest</b> child — smallest body, fastest trace, biggest pride.</p>
  </div>

  <div class="block">
    <h3><span class="badge">1 min</span> Close</h3>
    <p>… whisper → normal → shout:</p>
    <div class="t"><span class="who">Everyone</span>“This is my body… this is my body… THIS IS MY BODY!”</div>
    <p class="tip"><b>Got 3 spare minutes?</b> <i>Book title</i> (author) — don't read it, <b>do</b> it.</p>
  </div>
</section>
```

Class conventions:
- `.badge` = the time chip. `.grab` = the materials line, always right under `.day-head`.
- `.t` + `.who` = a spoken line (who = `Teacher` / `Everyone`). `.g` = an italic stage direction.
- `.kids` = a coral pill for what the children shout back.
- `.rhyme` = the chant/verse block. `.tip` = the small grey teacher note, one or two per block.
- Littles/Bigs are named in every day at least once. Every day ends whisper→shout.
- Day 5 is always the booklet/review day; the "Got 3 spare minutes?" book suggestion closes most days.
- Length calibration: ~55 lines of HTML per day section; week 2's whole page is **1006 lines**.
  If your page is under ~900 or over ~1150 lines, something is wrong.

---

## 7. Deployment (Tredoux's rules — follow exactly)

- **The working tree is dirty with ~124 unrelated modified files** right now (regenerated
  `materials-out/book-works/**` PDFs, `docs/mission-control/brain.json`). **NEVER `git add -A` /
  `git commit -a`.** Add only your own files by explicit path.
- **Run git through Desktop Commander `start_process` on the Mac**, not through the bridge shell —
  the bridge cannot write `.git/index.lock` ("Operation not permitted").
```bash
cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
git add public/circle-time-week32.html \
        public/circle-guide-week32.pdf \
        public/circle-time-images/week32 \
        next.config.ts middleware.ts
git commit -m "Add May week-32 circle-time page (Big Bang and the Universe)

...

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin main
```
- Branch is **`main`**; pushing to main triggers the **Railway auto-deploy**. Live in a few minutes at
  `https://www.teacherpotato.xyz/teachers-w32`.
- Reference commits: `6bec723d2` (week 2 page + 37 images + PDF + routing) and
  `61a3f6001` (guide PDF + button).

---

## 8. Verification checklist (all must pass before you push)

- [ ] `grep -c 'circle-time-images/week<NN>' public/circle-time-week<NN>.html` → **43**
      (week 1 and 2 both have 43 image references across the 37 unique files)
- [ ] `grep -o "week[0-9]*" public/circle-time-week<NN>.html | sort -u` → only `week<NN>`
      (no stray `week2` left from the copy)
- [ ] `grep -c imgFallback public/circle-time-week<NN>.html` ≥ 44 (1 definition + 43 handlers)
- [ ] every `printSection('…')` id exists: `for i in $(grep -o "printSection('[a-z-]*'" f | ...); do grep -q "id=\"$i\"" f; done`
- [ ] `sessionStorage` key is `wc_ct<NN>`, password still `THISDL`
- [ ] Print-pack button text matches the actual page count (18)
- [ ] Guide PDF: 8 pages, A4, left text edge ≥22mm (§5 verifier), day scripts word-for-word equal
      to the HTML day tabs
- [ ] `/teachers-w<NN>` added to BOTH `next.config.ts` rewrites and `middleware.ts` publicPaths,
      plus `/circle-guide-week<NN>.pdf` in publicPaths
- [ ] Open the file locally in a browser: gate → `THISDL` → all 8 tabs render → "Print the whole
      pack" preview shows 18 pages, no blank pages, posters full-bleed, cut-apart cards small
- [ ] `git status --short` shows ONLY your intended paths staged

---

## 9. Known landmines
1. Renaming a `pt-*` / `sng-*` / `day*` id breaks a print button or a tab **silently**.
2. Editing the shared print CSS re-breaks the 96px-vs-130px card mismatch and the poster page-spill.
3. `.pdf` is not in the middleware matcher's extension exclusion — a guide PDF without a
   `publicPaths` entry 302s to `/` for logged-out teachers.
4. The remote-devices file bridge has silently corrupted transfers and served stale staged copies —
   grep for a known-new marker and check sha256 on the Mac after any transfer.
5. Five workers editing `next.config.ts` / `middleware.ts` at once WILL conflict. Serialise those
   two files, or nominate one worker to land all ten lines.
