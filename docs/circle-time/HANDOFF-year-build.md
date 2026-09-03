# HANDOFF — build the rest of the 2026-27 circle-time year

**Written 2026-09-03 (Asia/Shanghai). Read this file first.**
Whale Class · AMS Montessori · Beijing · mixed-age 2.5–6, English learners · 13 minutes a day.
Repo: `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree` (= `$HOME/mnt/montree` over
the remote-devices bridge). Branch `main`. Railway auto-deploys on push.

---

## Goal

Ship a circle-time page + guide PDF + Midjourney artwork for **every remaining teaching week
of the 35-week 2026-27 year**, in the same proven shape as the seven weeks that
already exist, always staying **at least three weeks ahead of the calendar** so Tredoux never
opens a Monday without a page.

28 weeks still to build: **3–29 and 35**. Five more (30–34, the May "Space" month) are built
but have no art. Regenerate this line any time with `python3 scripts/circle-time/status.py`.

The *shape* never changes; only the content does. `docs/circle-time/WEEK_BUILD_SPEC.md` is the
mechanical procedure for one week and is the authority on shape — this file is the plan for
the year and the authority on order, numbering and integration.

---

## ⚠️ Read this before you touch anything — week numbering

**The single authority on which week is which — its number, theme, real dates, day count,
Dark Phonics lesson and build status — is
[`docs/circle-time/YEAR_CALENDAR_2026-27.md`](YEAR_CALENDAR_2026-27.md).** Written 2026-09-03
from the principal's PRINTED plan, which Tredoux declared canonical for the year from October
onward. Where this handoff, `public/circle-time-weeks.js` or any built page disagrees with that
table, **that table wins**.

**The year is 36 taught weeks: Week 1 (Sep 1) … Week 36 (Graduation, Jun 14–18).**

**🚨 `sheet = site + 2` is DEAD. Do not resurrect it.** The printed plan merges two of her weeks,
drops three and adds four, so no constant offset exists any more. The decoded doc
(`Whale_Class_Circle_Time_Decoded_2026-2027.md`) now heads its sections with **SITE** numbers
(`## WEEK <site>`), and every re-slotted section names the sheet week it came from in its own
lead note. The calendar file's `Sheet` column is the only map that still exists.

| Site week | Page file | Images | Guide PDF | Route | Gate key |
|---|---|---|---|---|---|
| **1** | `public/circle-time-week1.html` | `week1/` | `circle-guide-week1.pdf` | `/teachers-week1` | `wc_ct1` |
| **2** | `public/circle-time-week2.html` | `week2/` | `circle-guide-week2.pdf` | `/teachers-next` | `wc_ct2` |
| **3 … 36** | `public/circle-time-week<N>.html` | `week<N>/` | `circle-guide-week<N>.pdf` | `/teachers-w<N>` | `wc_ct<N>` |

Weeks 1 and 2 keep their historical route spellings — already-shared URLs. Everything else is
uniform. `public/circle-time.html` + `public/circle-guide.pdf` are the LIVE COPY of whichever
week is current (the Sunday swap, §Promotion), not a week's own files.

### The two locked date strings — do not "fix" them

The live pages for weeks 1 and 2 print **"Sep 1–5"** and **"Sep 8–12"**. Week 1 is really a
four-day week (Tue 1 – Fri 4 Sep). Tredoux locked those two printed strings; every calculation
downstream uses the real dates in the year calendar.

### Three weeks are not five days

Week 4 (Sep 21–24) and week 26 (Apr 6–9) are **four**-day weeks; week 30 (May 6–7) is a **two**-day
week because of Labour Day. Week 5 is a normal five-day week that **straddles 国庆**: Mon 28,
Tue 29, Wed 30 Sep + Thu 8, Fri 9 Oct — one week, one song, one shelf, with the holiday inside it.

## Current state — every week

Regenerate this table at any time with `python3 scripts/circle-time/status.py`
(`--plain` for aligned text, `--next` for just what's next). It reads the week list straight out
of `public/circle-time-weeks.js` and scans `public/`, `docs/circle-time/`, `next.config.ts` and
`middleware.ts`. There is no `Sheet` column any more — see the numbering section above.

| Wk | Dates | Theme | Plan | Page | PDF | Prompts | Images | URL |
|---|---|---|---|---|---|---|---|---|
| 1 | Sep 1–5 | I Am Special! I Like Myself | decoded | built (916 ln) | yes | - | 37/37 | /teachers-week1 |
| 2 | Sep 8–12 | My Body! From Head to Toe | decoded | built (1012 ln) | yes | - | 37/37 | /teachers-next |
| 3 | Sep 14–18 | My 5 Senses | decoded | built (1045 ln) | yes | yes | 0/37 | /teachers-w3 |
| 4 | Sep 21–24 | My Feeling (four-day week) | decoded | built (1015 ln) | yes | yes | 0/37 | /teachers-w4 |
| | | _中秋节 Fri 25 Sep_ | | | | | | |
| 5 | Sep 28–Oct 9 | Autumn (1) — split by 国庆 Oct 1–7 | decoded | - | - | - | 0/37 | - |
| | | _国庆节 holiday Oct 1–7 falls INSIDE this week_ | | | | | | |
| 6 | Oct 12–16 | Autumn (2) | decoded | - | - | - | 0/37 | - |
| 7 | Oct 19–23 | Five Food Groups | decoded | built (1034 ln) | yes | yes | 0/37 | /teachers-w7 |
| 8 | Oct 26–30 | Healthy Food & Healthy Habits | decoded | built (1044 ln) | yes | yes | 0/37 | /teachers-w8 |
| 9 | Nov 2–6 | Family Members | decoded | - | - | - | 0/37 | - |
| 10 | Nov 9–13 | My House | decoded | - | - | - | 0/37 | - |
| 11 | Nov 16–20 | The Cycle of Plants | decoded | - | - | - | 0/37 | - |
| 12 | Nov 23–27 | Thanksgiving Day | decoded | - | - | - | 0/37 | - |
| 13 | Nov 30–Dec 4 | Community Helpers | decoded | - | - | - | 0/37 | - |
| 14 | Dec 7–11 | Tools & Transportation | decoded | - | - | - | 0/37 | - |
| 15 | Dec 14–18 | Christmas | decoded | - | - | - | 0/37 | - |
| | | _winter holiday Dec 21 – Jan 1_ | | | | | | |
| 16 | Jan 4–8 | Winter Is Coming | decoded | - | - | - | 0/37 | - |
| 17 | Jan 11–15 | Weather | decoded | - | - | - | 0/37 | - |
| 18 | Jan 18–22 | Beijing | decoded | - | - | - | 0/37 | - |
| 19 | Jan 25–29 | China | decoded | - | - | - | 0/37 | - |
| 20 | Feb 1–5 | Chinese New Year (Fri 5 Feb is 除夕) | decoded | - | - | - | 0/37 | - |
| | | _春节 Sat 6 Feb · holiday Feb 8–26_ | | | | | | |
| 21 | Mar 1–5 | The Seven Continents | decoded | - | - | - | 0/37 | - |
| 22 | Mar 8–12 | The Five Oceans | decoded | - | - | - | 0/37 | - |
| 23 | Mar 15–19 | One Continent — Africa | decoded | - | - | - | 0/37 | - |
| 24 | Mar 22–26 | One Country — South Africa | decoded | - | - | - | 0/37 | - |
| 25 | Mar 29–Apr 2 | Spring & the Life Cycle of Animals | decoded | - | - | - | 0/37 | - |
| | | _清明 Mon 5 Apr_ | | | | | | |
| 26 | Apr 6–9 | Animal Habitats (four-day week) | decoded | - | - | - | 0/37 | - |
| 27 | Apr 12–16 | The Earth | decoded | - | - | - | 0/37 | - |
| 28 | Apr 19–23 | Landforms | decoded | - | - | - | 0/37 | - |
| 29 | Apr 26–30 | Earth Day | decoded | - | - | - | 0/37 | - |
| | | _Labour Day May 1–5_ | | | | | | |
| 30 | May 6–7 | Big Bang & the Universe (two-day week) | decoded | built (1017 ln) | yes | yes | 37/37 | /teachers-w30 |
| 31 | May 10–14 | Solar System | decoded | built (1037 ln) | yes | yes | 37/37 | /teachers-w31 |
| 32 | May 17–21 | Space Exploration | decoded | built (1014 ln) | yes | yes | 0/37 | /teachers-w32 |
| 33 | May 24–28 | Dinosaurs & Fossils (1) | decoded | built (1027 ln) | yes | yes | 0/37 | /teachers-w33 |
| 34 | May 31–Jun 4 | Dinosaurs & Fossils (2) | decoded | built (1044 ln) | yes | yes | 0/37 | /teachers-w34 |
| 35 | Jun 7–11 | Summer | decoded | - | - | - | 0/37 | - |
| 36 | Jun 14–18 | Graduation | decoded | - | - | - | 0/37 | - |

week numbering   : SITE weeks 1-36 (docs/circle-time/YEAR_CALENDAR_2026-27.md)
built pages      : [1, 2, 3, 4, 7, 8, 30, 31, 32, 33, 34]
no plan yet      : none
built, no art    : [3, 4, 7, 8, 32, 33, 34]
built, NOT WIRED : none
still to build   : [5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 35, 36]

next up          : [5, 6, 9, 10, 11]

`check_week.py --all` currently reports **PASS on weeks 1, 2, 3, 4, 7, 8, 30, 31, 32, 33, 34**
(most with one warning: art not generated yet; week 1's warning is that it predates
`imgFallback`, but all 37 of its images are on disk).

**Guide PDFs that need re-rendering:** weeks **7, 8, 30, 31, 32, 33, 34**. Their pages were
re-dated and re-phonic'd on 2026-09-03 but the PDFs still carry the old dates and the old sound
of the week. Re-render each from its page per §Per-week checklist.

**"Plan" means:** a full section in `docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md`
— 5 words, Littles/Bigs tiers, five Magic Box objects, the daily games, one ukulele song with
chorus + 5 verses, four shelf trays, Friday parent wrap-up and that week's Dark Phonics sound.
Sections are headed by **SITE** number (`## WEEK <site>`). Site weeks 1 and 2 are the
principal's own and were built straight from her sheet, before the decode.

---

## Build order

**Rule: always stay ≥3 weeks ahead of today.** Today is Thu 3 Sep 2026 and site week 2
(Sep 8–12) is the next teaching week, so weeks 5 and 6 are the urgent ones — weeks 3 and 4 are
already built.

### Batch 0 — reconcile the numbering (DONE, 2026-09-03)

Renumbered the May pages/routes/gate keys/prompt files from 32–36 to site 30–34, rebuilt
`public/circle-time-weeks.js` as one clean list, rekeyed weeks 1/2 to `wc_ct1`/`wc_ct2`, moved
`status.py` / `check_week.py` / `mj_convert.sh` onto site numbering, and added
`scripts/circle-time/render_tabs.py` so the week strip is baked into every page at build time.

### Batch 0b — the printed-plan re-plan (DONE, 2026-09-03 evening)

Tredoux declared the principal's PRINTED plan canonical, which produced
`docs/circle-time/YEAR_CALENDAR_2026-27.md` (36 weeks) and killed the sheet offset. Applied
mechanically the same evening: weeks 3 and 4 wired live; the two built October pages re-slotted
(`week5` → **Week 7** Five Food Groups, `week6` → **Week 8** Healthy Food & Healthy Habits) with
new dates, gate keys, image tokens and phonics; the five May pages (30–34) re-dated and
re-phonic'd, with week 30 marked as a two-day week; the manifest rebuilt as a 1–36 list; routes
added for w3/w4/w7/w8; the scripts and this handoff moved to 1–36. **Week 8 stays `built:false`
in the manifest** — its page is a re-slotted shell that a builder must rewrite as the *merged*
food + habits week before it is advertised in the tab strip.

### Then, in calendar order, in batches of ~5  (SITE numbers)

| Batch | Weeks | Why grouped |
|---|---|---|
| 1 | 5, 6, 8, 9, 10 | urgent — the two Autumn weeks, the merged Healthy Food/Habits rewrite, then Family + My House |
| 2 | 11, 12, 13, 14, 15 | Nov–Dec: plants, Thanksgiving, Helpers, Transport, Christmas |
| 3 | 16, 17, 18, 19, 20 | Jan; Beijing + China pair naturally, then CNY before the break |
| 4 | 21, 22, 23, 24, 25 | the geography run + Spring |
| 5 | 26, 27, 28, 29 | the Earth run (26 is a four-day week) |
| 6 | 35, 36 | Summer, then Graduation — build it last, it references the year |

Weeks 30–34 are built; they need **art only** (see the MJ runbook below) plus a guide-PDF
re-render. Weeks 3, 4 and 7 need art and (7) a guide-PDF re-render.

**Parallelism.** Within a batch, run one Opus subagent per week, in parallel, each owning
**only its own week's files** (`public/circle-time-week<N>.html`, its guide-PDF source, its
`docs/circle-time/mj-prompts-week<N>.md`, its image folder). Do **not** let a worker touch
`next.config.ts`, `middleware.ts` or `public/circle-time-weeks.js` — parallel edits to those
three will conflict. The main session (or one nominated integrator) lands every line in those
three files, once, at the end of the batch, then runs `render_tabs.py`. Sonnet does the audits.

---

## Per-week checklist

Condensed. **`docs/circle-time/WEEK_BUILD_SPEC.md` is the full procedure — read it once at the
start of a batch and keep it open.** Section numbers below point into it.

- [ ] **Read** the decoded doc's `## WEEK <NN>` section end to end. That is the content brief;
      it wins on content, the spec wins on shape. (spec §0, §1)
- [ ] **Copy the container**: `cp public/circle-time-week2.html public/circle-time-week<NN>.html`
      (or the most recently shipped week). Never hand-write the shell. (spec §3)
- [ ] **Do not touch**: the `<style>` block, the head `imgFallback` script, `#gate`,
      `#printOneHost`, the tail script, the `pt-*` / `sng-*` / `day1–day8` ids. Renaming any
      id breaks a print button or a tab **silently**. (spec §3a, §3b, §12)
- [ ] **Replace the content regions in file order** (spec §3c): `data-week`, `<h1>` +
      `.theme-line` dates, `.guidebook` href → `/circle-guide-week<NN>.pdf`, the 5 `.chip`
      words + Littles/Bigs `.frame`s, the 8 tab `<small>` labels, `#day1`–`#day5` scripts,
      `#day6` song, `#day7` 18-page print pack, `#day8` wrap-up, the Principal-coverage-map row.
- [ ] **Bump the gate key** to `wc_ct<NN>`. Two pages sharing a key unlock each other. Password
      stays `THISDL`.
- [ ] **The formula, non-negotiable** (spec §1): 5 words by Friday · Littles + Bigs named out
      loud every day · 13-min flow 2/4/3/3/1 (Magic Box → teach → song → game → close) · one
      real object per day · **exactly ONE ukulele song per week**, C/F/G7/Am, same chorus daily,
      one new verse a day, whole song Friday (that *is* the review) · teacher gets it wrong once
      on purpose · whisper → normal → **SHOUT** close · 4 shelf trays with controls of error,
      favouring the week's Magic Box objects · Friday wrap-up carries the week's Dark Phonics
      sound · Chinese angle (solar term, festival, characters) wherever natural.
- [ ] **18-page print pack, exact order** (spec §5). Button text must stay truthful.
- [ ] **Guide PDF**, 8 A4 pages, day scripts *word-for-word* the HTML day tabs, **left text
      edge ≥22 mm** (ring-bound, punch holes eat the gutter). Build it **in the cloud
      container** — the Mac has neither Playwright nor pdfplumber — render with Playwright,
      then run the pdfplumber assertion block in spec §8 before delivering. Land it on the Mac
      with `device_commit_files` and **check byte size + sha256 on the Mac** before committing.
      Keep the HTML source in your scratchpad and name its path in your session notes.
- [ ] **MJ prompts** → `docs/circle-time/mj-prompts-week<NN>.md`, 37 prompts, filenames
      identical to the HTML `src` set. See `docs/circle-time/mj-prompts-README.md`.
- [ ] **Verify**: `python3 scripts/circle-time/check_week.py <NN>` → all PASS.
- [ ] The page **ships before its art**. Every `<img>` has `onerror="imgFallback(this,'<emoji>')"`,
      so a week is usable in class with zero images on disk.

---

## Batch integration checklist

Run **once per batch**, by one agent, after every week's page passes `check_week.py`.

1. **`next.config.ts`** → `rewrites()` → `afterFiles`, beside the existing entries (~line 366+),
   one per week:
   ```ts
   { source: '/teachers-w<NN>', destination: '/circle-time-week<NN>.html' },
   ```
2. **`middleware.ts`** → `publicPaths` (~line 510+), **two lines per week, both required**:
   ```ts
   '/teachers-w<NN>',            // Week NN · <theme> (<dates>)
   '/circle-guide-week<NN>.pdf', // its guide book
   ```
   `.pdf` and `.js` are **not** in the matcher's static-extension exclusion
   (`svg|png|jpg|jpeg|gif|webp|html|avif|json|webmanifest`), so an unlisted guide PDF **302s to
   `/`** for a logged-out teacher. This is why `/circle-time-weeks.js` has its own entry too.
3. **`public/circle-time-weeks.js`** → set `built:true`, `route`, `short` (≤2 words), `full`,
   `dates`, `mon`/`fri` for each week in the batch. **This is the only week navigation.** The
   old `<details id="weekpicker">` "📅 Other weeks" list was removed from every page on
   2026-09-03 — do not reintroduce a second list to keep in sync. (spec §4)
   > If you were briefed to "add the week to the 📅 Other weeks picker": that instruction is
   > stale. The shared week-tab strip replaced it. Register the week in the manifest instead.
4. **Manifest audit** — `node --check public/circle-time-weeks.js`, then the route-coverage
   one-liner in spec §10 that asserts every `built:true` route exists in **both**
   `next.config.ts` and `middleware.ts`.
5. **Sonnet audit** before commit — one Sonnet subagent per week, given the decoded section and
   the built page, checking: the formula (one song, 13-min flow, both tiers, 4 trays, phonics in
   the wrap-up), day scripts == guide PDF scripts word-for-word, 18 pages in the print pack, no
   leftover text or ids from the template week, and `check_week.py` output.
6. **Commit, via Desktop Commander `start_process` only.** The remote-devices bridge shell
   cannot write `.git/index.lock` ("Operation not permitted"). **Never `git add -A` or
   `git commit -a`** — the tree carries ~65 unrelated dirty/untracked files. Add explicit paths:
   ```bash
   cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
   git add public/circle-time-week<NN>.html public/circle-guide-week<NN>.pdf \
           docs/circle-time/mj-prompts-week<NN>.md \
           public/circle-time-weeks.js next.config.ts middleware.ts
   git commit -m "circle-time: weeks <A>–<B> (<themes>)"
   git push origin main
   ```
7. **Verify live** a few minutes after the push (Railway auto-deploys `main`):
   ```bash
   for n in <weeks>; do
     echo -n "w$n "; curl -s -o /dev/null -w "%{http_code}\n" \
       "https://www.teacherpotato.xyz/teachers-w$n"
     curl -s -o /dev/null -w "  pdf %{http_code}\n" \
       "https://www.teacherpotato.xyz/circle-guide-week$n.pdf"
   done
   ```
   A `302` means a missing `publicPaths` entry. Then, by eye: gate → `THISDL` → 8 day tabs
   render, the week strip highlights this week and scrolls it into view, unbuilt weeks are
   dashed and unclickable, "Print the whole pack" previews as exactly 18 pages.

---

## MJ image pipeline runbook

Full detail: **`docs/circle-time/mj-prompts-README.md`**. The shape of it:

**prompts → generate → pick → download → convert → commit → verify live**

- 37 images per week: 8 posters `--ar 3:4` (928×1232), 28 cards + 1 badge `--ar 1:1`
  (1000×1000). Locked gouache style suffix on every prompt, `--raw --stylize 50 --v 8.2`.
  Filenames must equal the HTML `src` set exactly — `check_week.py` enforces it.
- Submit through Tredoux's authenticated `midjourney.com/imagine` tab via
  `Control_Chrome__execute_javascript` against an **explicit `tab_id`**; set `#desktop_input_bar`
  with the native `HTMLTextAreaElement` value setter + an `input` event, then click the sibling
  button whose text is exactly `Submit`.
- **≤1 prompt per 30 s.** Faster trips a ~1 h "Temporarily Blocked" timeout. No job after ~3
  tries = a silent block; check the banner before retrying.
- The moderator flags bare body-part wording even in cartoon prompts — drop "bare", add
  "flat cartoon illustration, children's book art, no photo-realism".
- Pick winners from each 2×2 on literal subject match, no text, one subject, plain ground,
  big simple shapes. Download full-res via `fetch()` from **inside** the authenticated tab
  (a Mac `curl` to `cdn.midjourney.com` hits a Cloudflare challenge), **one file per tool call**,
  with a `<100 KB` size guard — a challenge page saved under a real filename has happened.
  Land them in `~/Downloads/circle-time-mj-week<NN>/`.
- Convert and place: `scripts/circle-time/mj_convert.sh <NN>` (`sips` → JPEG q80 into
  `public/circle-time-images/week<NN>/`; reports the count and lists exactly which filenames are
  still missing versus the page's `src` set). **Nothing to wire** — the `src`s already point
  there. Then `git add public/circle-time-images/week<NN>` via Desktop Commander.
- Binary files move Mac↔container with **`device_commit_files` only**, never base64 through the
  conversation; re-check `sha256` on the Mac after any transfer.

### Do weeks 30–34 first

Weeks 30–34 are **already built, already routed, already have their 37 prompts written** — they
are five clean 37-image runs with zero content work in front of them, and they are the cheapest
possible way to shake out the MJ pipeline end to end before the year's 28 unbuilt weeks start
generating art. `docs/circle-time/mj-prompts-may-ALL.md` holds all 185 prompts in one file with
a run preamble, for a single sitting.

At 30 s per prompt, 185 prompts is ~1.5 h of submissions plus picking and downloading — expect
to spread it over sessions and to lose an hour somewhere to a block. Convert each week as it
completes; commit per week, not all at the end.

---

## Promotion — how "this week" gets onto `/teachers`

`/teachers` serves `public/circle-time.html`, and `/circle-guide.pdf` serves
`public/circle-guide.pdf`. Today those are copies of week 1. Two ways forward.

### Option A — keep the Sunday swap (what exists today)

Every Sunday evening, copy the incoming week's files over the canonical names (spec §7):

```bash
cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree"
cp public/circle-time-week<NN>.html public/circle-time.html
cp public/circle-guide-week<NN>.pdf public/circle-guide.pdf
```
then, **inside `public/circle-time.html` only**: check `data-week` is the copied week's number
(the #1 swap regression — the page looks fine and the strip lies), and change the `.guidebook`
href to `/circle-guide.pdf`. In `circle-time-weeks.js` set `LIVE_WEEK = <NN>`. If the outgoing
week's route was temporary (week 4's `/teachers-next`), flip it to its archive URL after adding
the rewrite + publicPaths lines. Commit those files only, push, verify.

- Costs: a human or an agent every Sunday, forever; ~34 more chances to ship the `data-week`
  bug; the repo carries duplicate copies of one page under two names.
- Buys: `/teachers` is a stable bookmark that always shows the right week, with zero JS.

> **Another session is already preparing exactly this swap for Sunday Sep 6** (week 4 "My Body"
> onto `/teachers`) and has created `public/circle-time-week1.html`, `circle-guide-week1.pdf`
> and `docs/circle-time/HANDOFF-week2-my-body.md`. **Do not clobber its work.** Read that
> handoff before touching `circle-time.html`, `circle-guide.pdf` or the week-1/2 routes.

### Option B — retire the swap: the strip plus a "this week" redirect  ← **recommended**

Delete `public/circle-time.html` as a *copy*. Make `/teachers` resolve to whichever week's page
the manifest says is current, from the `mon`/`fri` dates that are already in
`circle-time-weeks.js` — either a tiny redirect page at `/teachers` that reads the manifest and
sends the teacher to the right `/teachers-w<NN>`, or a `middleware.ts` rewrite that picks the
route by today's date. `/circle-guide.pdf` becomes a redirect to the current week's PDF the
same way.

- Buys: no weekly ritual, no duplicate file, the `data-week` bug becomes structurally
  impossible, and the week strip already renders the whole year from the same manifest.
- Costs: one build task now; `/teachers` gains a redirect hop; the manifest's `mon`/`fri` dates
  become load-bearing (they are already the tab strip's source of truth, so this is a feature —
  it forces the dates to be right).

**Recommendation: Option B**, done once the Sep 6 swap has landed and settled — say the week of
Sep 14, before the batch-2 pages start arriving. It removes the only recurring manual step in
the whole year and kills the swap's one silent failure mode.

**Neither option is implemented here.** This is a decision for Tredoux, not a change to make
unasked.

---

## Gotchas

- **`git add -A` / `git commit -a` are forbidden.** ~65 unrelated dirty and untracked files
  live in this tree (pycache, tsbuildinfo, scratch dirs, other sessions' handoffs). Add by
  explicit path, always.
- **Run git through Desktop Commander `start_process`, not the bridge shell.** The bridge
  cannot write `.git/index.lock` — "Operation not permitted". If you see a stale `index.lock`,
  remove it *through Desktop Commander* and re-run; never through the bridge.
- **`.pdf` and `.js` need `middleware.ts` publicPaths entries.** They are not in the matcher's
  extension exclusion. Missing entry = a silent `302` to `/` for logged-out teachers, on a URL
  that works perfectly for you because you have a session.
- **Never rename a `pt-*`, `sng-*` or `day1–day8` id.** The tab script resolves `day1…day8` by
  implicit global and `printSection()` by string. Renaming breaks a tab or a print button with
  no error anywhere.
- **Never edit the shared print CSS.** It encodes hard-won fixes: the 130px card size that
  unified two disagreeing print paths, the `flex:1 1 0` poster image that self-sizes around
  caption text, `body.print-pack .day-head{display:none}` which is what keeps the pack at
  exactly 18 pages.
- **Two pages sharing a `wc_ct<NN>` key unlock each other**, including a half-built one. Bump it.
- **The remote-devices file bridge has silently corrupted and staled transfers** (Aug 2026: two
  binary batches each landed as the same 476 KB HTML page), and **the bridge can drop entirely
  mid-session** — it did on 2026-09-03. Retry once; if it stays down, wait rather than
  improvising another transfer route. After any transfer, grep for a known-new marker and check
  `sha256` **on the Mac**.
- **Other sessions are working in this repo right now.** Before editing `circle-time.html`,
  `circle-guide.pdf`, `circle-time-week1.html`, `circle-time-week2.html` or the week-1/2 routes,
  read `docs/circle-time/HANDOFF-week2-my-body.md` and re-check `git log --oneline -5`.
  `docs/circle-time/WEEK_BUILD_SPEC.md`, `middleware.ts`, `CLAUDE.md` and all seven
  circle-time pages currently have **uncommitted modifications** from that session.
- **Parallel workers must not touch `next.config.ts`, `middleware.ts` or
  `circle-time-weeks.js`.** One integrator lands all of those lines, once, per batch.
- **The wrap-up print button says "1 page" but prints 2.** Inherited from week 1, present on
  every page, still unresolved. Not a regression you introduced — flag it, don't chase it.
- **Site numbering is now uniform**: `circle-time-week<N>.html` = site week N for every week,
  1–36 — pages, routes, gate keys, image folders, the decoded doc's `## WEEK <n>` headings, all
  of it. There is no sheet offset to convert any more; the authority is
  `docs/circle-time/YEAR_CALENDAR_2026-27.md`.
- **Re-run `python3 scripts/circle-time/render_tabs.py` after any manifest edit**, or every
  page ships a stale week strip. `check_week.py` fails a page with no `week-tabs:start` marker.

---

## Where everything lives

| What | Path |
|---|---|
| **This handoff** | `docs/circle-time/HANDOFF-year-build.md` |
| **The per-week build procedure** | `docs/circle-time/WEEK_BUILD_SPEC.md` ← the authority on shape |
| **The content, weeks 9–37** | `docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md` |
| **The principal's sheet** | `docs/circle-time/2026-2027_全年中文课程计划_全年已填.xlsx` (`工作表1`, `English`) |
| **The page container / DOM anatomy** | `public/circle-time-week2.html` · `docs/circle-time/circle-time-page-spec.md` |
| **The week manifest + tab strip** | `public/circle-time-weeks.js` ← the ONLY registration point |
| **Week-2 build diary + swap history** | `docs/circle-time/HANDOFF-week2-my-body.md` |
| **May weeks 30–34 notes** | `docs/circle-time/MAY_README.md` |
| **MJ prompt runbook** | `docs/circle-time/mj-prompts-README.md` |
| **MJ prompts, per week** | `docs/circle-time/mj-prompts-week<N>.md` · all-May: `mj-prompts-may-ALL.md` |
| **Week checker** | `scripts/circle-time/check_week.py <N> [...]` · `--all` |
| **State table generator** | `scripts/circle-time/status.py` · `--plain` · `--next` |
| **MJ PNG → repo JPEG** | `scripts/circle-time/mj_convert.sh <N> [--dry]` (macOS, needs `sips`) |
| **Bake the week strip into every page** | `scripts/circle-time/render_tabs.py` (run after ANY manifest edit) |
| Pages | `public/circle-time-week<N>.html` (+ the live copy `circle-time.html`) |
| Guide PDFs | `public/circle-guide-week<N>.pdf` (+ the live copy `circle-guide.pdf`) |
| Images | `public/circle-time-images/week<N>/ct-week<N>-<slug>.jpg` (37 each) |
| Routing | `next.config.ts` `rewrites().afterFiles` (~line 366) · `middleware.ts` `publicPaths` (~line 510) |
| Dark Phonics lesson sequence | `lib/montree/dark-phonics/lessons.ts` (week 4 = entry `n: 8`) |
| Project conventions | `CLAUDE.md` § "🐳 Circle Time (Teachers tab)" |
| Live site | `https://www.teacherpotato.xyz` — password `THISDL` on every circle-time page |

---

## The first five actions

**All week numbers below are SITE numbers.**

1. Run `python3 scripts/circle-time/status.py` and
   `python3 scripts/circle-time/check_week.py --all`, and read
   `docs/circle-time/HANDOFF-week2-my-body.md` + `git log --oneline -5` + `git status --short`
   — confirm the table above still matches reality and find out what other sessions have
   landed since 2026-09-03.
2. Ask Tredoux about the off-by-one dates on the two live pages (weeks 1–2 print Tue–Sat, her
   sheet says Mon–Fri); do not change them unasked.
3. Build **weeks 3, 4, 5 and 6** as batch 1 (sheet 5–8 in the decoded doc: My 5 Senses,
   My Feeling — a four-day week, Five Food Groups — opens after the Oct 1–7 国庆 gap, and
   Healthy Food) — one Opus subagent per week, Sonnet audit each.
4. Kick off the **weeks 30–34 Midjourney run** in parallel with the building — those five pages
   are already built and their 185 prompts are already written in
   `docs/circle-time/mj-prompts-may-ALL.md`. It is the cheapest end-to-end test of the art
   pipeline, and it is the only remaining work on five finished weeks.
5. Integrate: one agent lands the `next.config.ts` / `middleware.ts` / `circle-time-weeks.js`
   lines, runs `python3 scripts/circle-time/render_tabs.py`, commits by explicit path through
   Desktop Commander, pushes `main`, and curl-verifies. Then keep going in calendar order,
   never letting the buffer fall below three weeks.

## Decisions from Tredoux (Sep 3 2026, evening) — these override anything above that conflicts
1. **Week numbering = taught weeks, counted from Sep 1.** The site labels run "Week 1, Week 2, Week 3 …" consecutively up to **Week 36 = Graduation**. *(Superseded the same evening by the printed-plan re-plan — the themes named in the original wording of this line are stale; `docs/circle-time/YEAR_CALENDAR_2026-27.md` is the list. The sheet offset is dead.)* Don't touch the printed date strings on weeks 1–2.
2. **"Principal week" ghost tabs are a mistake.** Weeks 3–6 (sheet 5–8) are real teaching weeks whose themes the principal set; we simply haven't written our plans for them yet. Give them their real names/dates in the manifest now; build them first.
3. **Tab strip flicker must go.** Tabs currently disappear for a moment on every page switch because the strip is rendered by JS after load. Fix so the strip is present on first paint: render the strip statically into each page's HTML (generated from the manifest by a build script, `scripts/circle-time/render_tabs.py`), keep the JS only for highlighting/no-op, and reserve the strip's height in CSS. Verify with a Playwright screenshot at DOMContentLoaded that the strip is already there.
4. Get on with it: after batch 0, write plans for weeks 3–6, build them, then continue in calendar order; run the May MJ images in parallel. Ask only when a decision is genuinely his.
