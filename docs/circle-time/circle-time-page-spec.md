# Circle Time page — clone spec (week 1 → week 2)

Reconnaissance only, from the week-1→week-2 build session. Source of truth:
`public/circle-time.html` in the `montree` repo (structure below was captured from the
week-1 page before it was archived as `circle-time-week1.html`).

---

## 1. File shape

Single self-contained static file. No build step, no framework, no external JS.
- One `<link>` to Google Fonts: `Fredoka:wght@500;600` + `Atkinson Hyperlegible` (ital 400/700).
- One `<style>` block (CSS custom properties, light + dark + `[data-theme]` overrides).
- One `<script>` at the bottom (~45 lines): tabs, print-one clone, password gate.
- `<meta name="robots" content="noindex">`; `<title>Whale Class Circle Time</title>`.

Top-level DOM order:
1. `#gate` (fixed overlay, `hidden` by default in markup)
2. `div.wrap` (`hidden` in markup; kicker, h1, theme-line, guidebook, glance, tabs, 8 `section.day`, `.extra` details, `.foot`)
3. `#printOneHost` (empty div — the print-one clone target)
4. `<script>`

## 2. Tabs and section ids

Tabs are `button.tab[role=tab][data-day=N]` inside `.tabs[role=tablist]`, each with a
`<small>` sub-label. Sections are `section.day#dayN`.

JS:
```js
const tabs=[...document.querySelectorAll('.tab')];
const days={1:day1,...,8:day8};          // relies on implicit id globals
function show(n){ aria-selected on tabs; days[k].hidden = (k!=String(n)); }
const wd=new Date().getDay(); show(wd>=1&&wd<=5?wd:1);   // auto-opens today Mon–Fri, else Mon
```
Only `#day1` lacks `hidden` in markup; `#day2`–`#day8` are `hidden`.

### Day-section internal structure (identical for day1–day5)
```
.day-head       h2 "Day N · <title>"  +  p "Today's words: <b>…</b>"
.grab           "<b>Grab:</b> …"  (materials line)
.block × 5-6    h3 [ <span class="badge">N min</span> + block title ]
                optional  <button class="sectionprint" onclick="printSection('sng-…')">
                body: <p>, .t (teacher/everyone script box with .who label),
                      .kids (chorused kid response chip), .g (italic stage direction),
                      .rhyme (song/chant block, left rule), .tip (<b>-led aside)
```
Every day ends with a "Close" block. Days 1–5 each carry a Song block whose
`sectionprint` targets `sng-chorus` (Mon) or `sng-verses` (Tue–Fri).

## 3. Password gate

Pure client-side, no network, no obfuscation:
```js
var ok = sessionStorage.getItem('wc_ct2')==='1';   // key varies per staged/live page
if(v.toUpperCase()==='THISDL'){ sessionStorage.setItem('wc_ct2','1'); unlock(); }
```
`unlock()` = `gate.hidden=true; wrap.hidden=false`. Wrong password reveals `#gateErr`.
Enter key on `#pw` also submits. **A staged copy must use a different sessionStorage key**
(e.g. week 1 = `wc_ct2`, week 2 staging = `wc_ct3`) or the two pages unlock each other —
and note the password is visible in page source, so this is obscurity, not security.

## 4. Print system — three modes, all `window.print()` + a body class

`afterprint` listener removes all three classes and empties `#printOneHost`.

| mode | body class | trigger | what prints |
|---|---|---|---|
| song sheet | *(none)* | `.printbtn` on Song tab → `window.print()` | base `@media print` shows only `#day6` |
| whole pack | `print-pack` | Print tab button (`classList.add('print-pack')`) | `#day7` only; each `.sheet` = one page (`page-break-after:always`) |
| wrap-up | `print-wrap` | Wrap tab button | `#day8` only, no page breaks (1 page, though it actually renders 2 — see HANDOFF gotchas) |
| one section | `print-one` | `printSection(id)` | clone of `#id` inside `#printOneHost` |

`printSection` (the "print-one clone mechanism"):
```js
function printSection(id){
  var src=document.getElementById(id); var host=document.getElementById('printOneHost');
  host.innerHTML=''; host.appendChild(src.cloneNode(true));
  document.body.classList.add('print-one'); window.print();
}
```
`body.print-one` hides `.wrap` entirely and shows `#printOneHost`. Because the clone
lives outside `#day7`, **every print-pack sizing rule has a mirrored
`body.print-one #printOneHost …` selector** — card images (130px), portrait SVG
(620×571), poster `min-height:266mm`, poster `.p-img{flex:1 1 0}`. Two known past
bugs are commented in the CSS: the two paths disagreeing on card size (96 vs 130px),
and `.day-head` spilling the theme poster onto a blank page. Keep both paths in step.

Base print CSS also hides `.tabs .glance .extra .foot .kicker .theme-line .printbtn
.guidebook .sectionprint`, `h1`, and `.screen-only`; `@page{margin:12mm}`.

Print-one buttons exist on: `sng-chords`, `sng-chorus`, `sng-verses`, `sng-uketips`
(Song tab, plus the day1–day5 song blocks), and on all 13 print-pack ids.

## 5. Song tab (`#day6`) format

`.day-head` (h2 `Theme Song · "<song name>"`) → `.printbtn` → four `.block`s:

- **`#sng-chords`** — three `.chordbox` in `.chords`: name in `.nm`, hand-written
  inline SVG fretboard (86×104 viewBox, `.nut/.st/.dot/.fn` classes, `o` marks for
  open strings, `G C E A` string legend). Standard shapes reused week to week:
  **C (0003), F (2010), G7 (0212)** — Am is available but not required unless a song
  needs it. Then `.strum` box (e.g. "Down · Down · Down-Up") and a `.tip` on tempo.
- **`#sng-chorus`** — `.lyric` with chord chips inline: `<span class="chd">C</span>`
  placed immediately before the syllable they land on (hyphenated mid-word:
  `I like my-<span class="chd">C</span>self`). Stage directions in `.g`.
- **`#sng-verses`** — five verses, each headed by `<p class="vt">Monday · <title></p>`;
  verses typically use only two of the three chords. Closing `.tip` explains the build.
- **`#sng-uketips`** — one paragraph practice loop for beginners.

The printed song sheet (`#pt-ukulele`, page 9) is a **separate flattened copy** of the
same lyrics using `.songsheet` markup (`.sv` verse headings, `.sc` chord chips) —
edit both when lyrics change.

## 6. Midjourney image wiring

- Path: `/circle-time-images/weekN/ct-weekN-<slug>.jpg` (absolute, served from `public/`).
- Two classes only:
  - `.p-img` — poster images. Screen: `max-width:min(70%,340px); max-height:340px`.
    Print: `flex:1 1 0; min-height:0; max-width/height:100%; object-fit:contain` so the
    image claims the leftover page height under the title/caption.
  - `.card-img` — card images. Screen 96×96; print 130×130 (both print paths).
- Every `<img>` has a descriptive `alt` ("Illustrated eyes", "Illustrated child jumping"…).
- **Images appear only in the Print tab (`#day7`).** The five day tabs, the Song tab
  and the Wrap tab are text-only.
- A week's image folder typically holds **38 files** (7-9 `poster-*`, ~30 `card-*`,
  1 `badge-star`) — see the week's own MJ prompt doc for the exact slug list.

## 7. The 18-page print pack (`#day7`, in print order)

Each page is preceded by `<p class="sheet-label screen-only">Page N · …</p>` and a
`🖨️ Print this page` button. Sheet ids (13 of them; three ids cover multiple pages):

| Pages | id | Purpose / structure |
|---|---|---|
| 1 | `pt-theme` | Theme poster: `.p-img` + `.p-title` (week theme, `<br>` split) + `.p-sub` "Whale Class 🐳" |
| 2–6 | `pt-words` | Wrapper div holding **5** `.sheet.poster` — one per key word: `.p-img` + `.p-word` (the word) + `.p-sub` (its sentence) |
| 7 | `pt-sentence` | Sentence-frames poster: image + `.p-title` "We can say…" + `.p-frames` with 4 frames, blanks as `<span class="bl">___</span>` |
| 8 | `pt-songchorus` | Chorus poster: image + chorus text as `.p-title` (font-size 2.8rem inline) + `.p-sub` song name |
| 9 | `pt-ukulele` | `.sheet.songsheet` — full ukulele sheet (chorus + 5 verses, chord chips `.sc`, header line naming chord shapes and strum) |
| 10 | `pt-bodycontrol` | 3-part cards, **control cards** (`.cards.c2`, 6 `.card`: 5 items + a themed "control cards — do not cut" card) |
| 11 | `pt-bodycutapart` | Same 5 pictures with no words (`.cards.c2` + "cut all cards apart ✂️") **and** a second `.cards.c2` of word-only label cards (`min-height:70px`) |
| 12–13 | `pt-yummymat` | Wrapper holding **2** full-page `.sheet.poster` sorting signs (the week's binary — id kept literally `pt-yummymat` across weeks even when the binary changes, e.g. week 2's "Inside/Outside") |
| 14 | `pt-sortcards` | `.cards.c3` — 12 cards to sort, plus a closing "no wrong answers" line |
| 15 | `pt-actioncards` | `.cards.c2` — 8 "I can ___!" action cards |
| 16 | `pt-portrait` | Self-portrait worksheet: `.p-title`, inline `svg.portrait-svg` (360×330 screen / 620×571 print), instruction line, "My name is `<span class="writeline">`" |
| 17 | `pt-awards` | 2 award cards (cut in half): badge image, praise line, `.writeline` for the name, week/class footer |
| 18 | `pt-shelfguide` | Teacher-facing shelf guide: `.p-title`, intro line, `table.shelfguide` with **4 trays** (left→right, easiest→hardest), closing lamination note |

Header button text is hard-coded: **"Print the whole pack (18 pages)"** — update it if the
page count changes. Sheet count must equal the label numbering: 1+5+1+1+1+1+1+2+1+1+1+1+1 = 18.

## 8. Wrap tab (`#day8`) format

`.day-head` + `.screen-only` "Print the wrap-up (1 page)" button + a per-section print
button, then one `.sheet.wrapup#pt-wrapup` containing, in order:

1. `.p-title` "Whale Class · Week Wrap-Up 🐳"
2. Grey sub-line: `<date range> · Theme: <b>theme</b> · Letter of the week: <b>Xx</b>`
3. `h3` **What we did** — one warm narrative paragraph, `<b>`/`<i>` for key words
4. `h3` **Words we learned** — `.wchips` of `.wchip` pills (typically ~10 chips)
5. `h3` **Sentences to listen for at home** — `.say2` phrases, plus a littles line
6. `h3` **Our song · "<song name>"** — chorus quoted in `<i>`, one line of context
7. `h3` **Letter of the week · Xx ("<lesson title>")** — the Dark Phonics tie-in:
   sound, catchphrase, vocabulary hunt words, decodable words + heart word, book titles
8. `h3` **Try this at home (2 minutes)** — 4 numbered micro-activities (one is the letter)
9. `p.sig` "Thank you for a lovely week — the Whale Class 🐳"

## 9. Week-to-week content slots (everything that changes)

**Header / global**
- `<h1>` theme title
- `.theme-line` — `Week of <strong>date range</strong>`
- `.glance h2` "Five words they'll own by Friday" + 5 `.chip` words
- `.frames` — Littles blurb, Bigs sentence frames
- 8 tab `<small>` sub-labels (day themes; Song/Print/Wrap stay)
- image folder + file prefix (`weekN` / `ct-weekN-`)
- sessionStorage gate key, if staged alongside another live week

**Per day (×5)** — `h2` day title, "Today's words", `.grab` materials, each `.block`
(badge minutes + title + script/`.t`/`.kids`/`.rhyme`/`.tip`), the Close chant.

**Song** — song name, three chord shapes (SVG dots) if the key changes, strum, chorus
lyrics + chord chips, five verse blocks (`.vt` heading + 2 lines each), and the mirrored
copy inside `#pt-ukulele`.

**Print pack** — theme poster title/caption; 5 word posters (word + sentence + image);
4 sentence frames; chorus poster text; song sheet; the card sets and their words;
the 2 sorting-sign captions; portrait sheet prompt; award card wording; shelf guide
title, 4 tray descriptions and their page-number references; the "Print the whole pack
(N pages)" label; every `sheet-label` "Page N · …" string; every `img src` + `alt`.

**Wrap** — date range, theme, letter of the week, the narrative paragraph, word chips,
sentences, song quote, the whole Dark Phonics paragraph, the 4 home activities.

**Unchanged across weeks** — all CSS, the gate mechanism, `printSection`, tab JS,
`.extra` "Weekly rituals" details block, `.foot`. The "Principal coverage map" details
block is week-specific in content but same in structure.

---

## 10. Guide-book PDF — how it's built

Method: headless-Chrome print-to-PDF of a re-authored HTML guide page (A4,
`@page { margin: 14mm 14mm 12mm 24mm }` — 24mm left margin clears the ≥22mm
hole-punch/ring-bind requirement; verified with pdfplumber, min text x ≥ 22mm on
every page). Content is condensed from the day-by-day content doc (four blocks per
day instead of five, with the Song block folded into a "today's song moment" footer
per day page) so each day fits one A4 page. Cover · Week overview · one page per
weekday · Songbook = a typical 8-page shape (a week that also carried extra songbook
pages, like week 1 originally did, ran to 16 — the one-song-per-week rule retired
those extras).

The page links it as `<a class="guidebtn" href="/circle-guide.pdf" target="_blank"
rel="noopener">📖 Guide Book</a>` inside `div.guidebook`, with `.guidebook-cap`
"Print · laminate · ring-bind — your in-circle guide". The staged/next-week copy
points at its own `/circle-guide-weekN.pdf` until go-live, when the href is fixed
to point at `/circle-guide.pdf`.

## 11. Dark Phonics — the next lesson

Source: `lib/montree/dark-phonics/lessons.ts` → `export const RAW: RawLesson[]`.
Note `n` is the curriculum number (5–53); the UI shows `displayN(n) = n − 4`. Each
circle-time week's "Letter of the week" is the next entry in this list. Sound
objects for the vocabulary hunt come from `app/admin/english-guide/data.ts`
(`BEGINNING_SOUND_OBJECTS`, `ENDING_SOUND_OBJECTS`, keyed by `sound`).

## 12. Midjourney prompts — conventions

Style phrase **"soft gouache storybook"** goes immediately after the subject, not at
the end. Cards open with `one single …` or `a pair of simple friendly cartoon …` —
isolated object, no scene, no props. Character cards open with
`a <ethnicity> preschool boy/girl <doing the action>`, with ethnicity varied
deliberately across the set. Plain cream (posters) or plain white (cards) background
always, no border/frame/shadow scene. Flags: posters `--ar 3:4 --v 8.2`; cards/badge
`--ar 1:1 --v 8.2 --raw --stylize 50`; every prompt ends with the negative clause
`--no text, letters, words, watermark` verbatim — MJ hallucinates stray text into
children's illustrations otherwise.

## 13. Routing — how `/teachers` resolves, and how to stage/archive a week

Two files are involved (`app/page.tsx` is not one of them — its "Teachers" header
button points elsewhere and is hidden).

1. **`next.config.ts` → `async rewrites()` → `afterFiles`:**
   ```ts
   { source: '/teachers', destination: '/circle-time.html' },
   { source: '/teachers-next', destination: '/circle-time-weekN.html' },
   { source: '/teachers-weekN', destination: '/circle-time-weekN.html' }, // archive
   ```
   `afterFiles` means a real file in `public/` wins first; the rewrite only fires on a miss.

2. **`middleware.ts` → `publicPaths`** — every route above needs an entry, plus its
   guide PDF (`.pdf` is not in the matcher's extension exclusion list, so without an
   explicit entry it 302s to `/` for anyone without a session):
   ```ts
   '/teachers', '/circle-guide.pdf',
   '/teachers-next', '/circle-guide-weekN.pdf',
   '/teachers-weekN', '/circle-guide-weekN.pdf',
   ```
   None of these are in `WHALE_ONLY_PREFIXES`, so they serve on www.teacherpotato.xyz
   as well as montree.xyz's middleware pass-through.

3. **`middleware.ts` static-asset passthrough** — `STATIC_ASSET_PREFIXES` lists the
   Supabase-proxied dirs. `/circle-time-images/` is **not** there, so per-week art is
   served straight from `public/`.

**To stage a new week:** add `public/circle-time-weekN.html` +
`public/circle-time-images/weekN/`, point `/teachers-next` at it, add its
`publicPaths` entries, give it its own sessionStorage gate key, keep
`<meta name="robots" content="noindex">`.

**To go live:** archive the outgoing week under `-weekN` filenames (page + PDF, plus
a `/teachers-weekN` route), promote the incoming week's files to the canonical
`circle-time.html` / `circle-guide.pdf` names, fix the guide-book `href` inside the
promoted page, commit, push, verify live.
