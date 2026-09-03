# HANDOFF — build the rest of the 2026-27 circle-time year

**Written 2026-09-03 (Asia/Shanghai). Read this file first.**
Whale Class · AMS Montessori · Beijing · mixed-age 2.5–6, English learners · 13 minutes a day.
Repo: `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree` (= `$HOME/mnt/montree` over
the remote-devices bridge). Branch `main`. Railway auto-deploys on push.

---

## Goal

Ship a circle-time page + guide PDF + Midjourney artwork for **every remaining teaching week
of the principal's 37-week 2026-27 sheet**, in the same proven shape as the seven weeks that
already exist, always staying **at least three weeks ahead of the calendar** so Tredoux never
opens a Monday without a page.

28 weeks still to build: **5, 6, 7, 8, 9–31, 37**. Five more (32–36) are built but have no art.

The *shape* never changes; only the content does. `docs/circle-time/WEEK_BUILD_SPEC.md` is the
mechanical procedure for one week and is the authority on shape — this file is the plan for
the year and the authority on order, numbering and integration.

---

## ⚠️ Read this before you touch anything — week numbering

There are **two numbering systems** in this repo and they do not agree. Getting this wrong is
the single most expensive mistake available to you.

| | |
|---|---|
| **Sheet numbering** (1–37) | The principal's, in `docs/circle-time/2026-2027_全年中文课程计划_全年已填.xlsx` (sheets `工作表1` and `English`, col C). **This is canonical.** The decoded doc and this handoff use it. |
| **Legacy site numbering** | The first two pages ever built were named `week1` / `week2`. They are **sheet weeks 3 and 4**. |

So:

| Sheet week | Theme | Page file | Images | Guide PDF | Route | Gate key |
|---|---|---|---|---|---|---|
| **3** | I'm special | `public/circle-time.html` (live) + `circle-time-week1.html` (archive) | `week1/` | `circle-guide.pdf` + `circle-guide-week1.pdf` | `/teachers` + `/teachers-week1` | `wc_ct2` |
| **4** | My Body | `public/circle-time-week2.html` | `week2/` | `circle-guide-week2.pdf` | `/teachers-next` | `wc_ct3` |
| **5 … 37** | — | `public/circle-time-week<NN>.html` | `week<NN>/` | `circle-guide-week<NN>.pdf` | `/teachers-w<NN>` | `wc_ct<NN>` |

**Leave weeks 3 and 4 exactly as they are.** Do not rename them to match. Sheet weeks 1 and 2
(August "Welcome Back" / "Classroom Rules") are not taught as circle time and have no page —
which is the only reason the `circle-time-week1.html` / `week2.html` filenames don't collide.
**Never build a page under those two filenames.**

`scripts/circle-time/check_week.py` and `status.py` both take the **sheet** number and handle
the two legacy cases internally.

### Two open questions for Tredoux — do not silently "fix" either

1. **Dates are off by one on the two shipped pages.** The sheet says week 3 = **8.31–9.4**
   (Mon–Fri) and week 4 = **9.7–9.11**. The pages print "Sep 1–5" and "Sep 8–12" (Tue–Sat),
   and `circle-time-weeks.js` copies the pages. Every week from 5 on should use the **sheet**
   dates. Ask him which he wants on the two live pages before changing them.
2. **`public/circle-time-weeks.js` has a numbering collision.** Its manifest lists Sep 1–5 as
   `n:1` and Sep 8–12 as `n:2`, and *then separately* carries ghost entries `n:3`–`n:8` labelled
   "Principal's own week — not yet decoded". Weeks 3 and 4 are therefore in the manifest twice,
   and the four genuinely-unbuilt principal weeks (5–8) have `dates:null` even though the sheet
   records them. **Fixing this is task #1 below.**

---

## Current state — every sheet week

Regenerate this table at any time with `python3 scripts/circle-time/status.py`
(`--plain` for aligned text, `--next` for just what's next). It scans `public/`,
`docs/circle-time/`, `next.config.ts` and `middleware.ts`.

| Wk | Dates | Theme | Plan | Page | PDF | Prompts | Images | URL |
|---|---|---|---|---|---|---|---|---|
| 1 | (not taught) | Welcome Back | n/a | n/a | n/a | n/a | n/a | n/a |
| 2 | (not taught) | Classroom Rules | n/a | n/a | n/a | n/a | n/a | n/a |
| 3 | Aug31–Sep 4 | I'm special / I like myself | principal (page built) | built (915 ln) | yes | – | 37/37 | `/teachers` **LIVE** |
| 4 | Sep 7–11 | My Body | principal (page built) | built (1011 ln) | yes | – | 37/37 | `/teachers-next` (staged) |
| 5 | Sep 14–18 | My 5 senses | **MISSING** | – | – | – | 0/37 | – |
| 6 | Sep 21–24 | My Feeling | **MISSING** | – | – | – | 0/37 | – |
| | | _Oct 1–7 国庆 National Day holiday — no circle time_ | | | | | | |
| 7 | Oct 5–9 | Five food groups | **MISSING** | – | – | – | 0/37 | – |
| 8 | Oct 12–16 | Healthy food | **MISSING** | – | – | – | 0/37 | – |
| 9 | Oct 19–23 | Healthy Life / habits | decoded | – | – | – | 0/37 | – |
| 10 | Oct 26–30 | Halloween Week / Dress-up Party | decoded | – | – | – | 0/37 | – |
| 11 | Nov 2–6 | People around me (family and friends) | decoded | – | – | – | 0/37 | – |
| 12 | Nov 9–13 | The cycle of animals | decoded | – | – | – | 0/37 | – |
| 13 | Nov 16–20 | The cycle of plants | decoded | – | – | – | 0/37 | – |
| 14 | Nov 23–27 | Thanksgiving day | decoded | – | – | – | 0/37 | – |
| 15 | Nov 30–Dec 4 | Community Helpers-1 | decoded | – | – | – | 0/37 | – |
| 16 | Dec 7–11 | Community Helpers-2 | decoded | – | – | – | 0/37 | – |
| 17 | Dec 14–18 | Christmas | decoded | – | – | – | 0/37 | – |
| | | _winter holiday — no circle time_ | | | | | | |
| 18 | Jan 4–8 | Winter is coming | decoded | – | – | – | 0/37 | – |
| 19 | Jan 11–15 | Weather | decoded | – | – | – | 0/37 | – |
| 20 | Jan 18–22 | Beijing | decoded | – | – | – | 0/37 | – |
| 21 | Jan 25–29 | China | decoded | – | – | – | 0/37 | – |
| | | _Chinese New Year holiday (Feb 1–19) — no circle time_ | | | | | | |
| 22 | Feb 22–26 | Chinese New Year | decoded | – | – | – | 0/37 | – |
| 23 | Mar 1–5 | The Seven Continents | decoded | – | – | – | 0/37 | – |
| 24 | Mar 9–13 | Exploring the Five Oceans | decoded | – | – | – | 0/37 | – |
| 25 | Mar 16–20 | One continent — AFRICA | decoded | – | – | – | 0/37 | – |
| 26 | Mar 22–26 | One country — SOUTH AFRICA | decoded | – | – | – | 0/37 | – |
| 27 | Mar 29–Apr 2 | The Earth | decoded | – | – | – | 0/37 | – |
| 28 | Apr 7–10 | Landforms (4-day Qingming week) | decoded | – | – | – | 0/37 | – |
| 29 | Apr 12–16 | Animal habitats | decoded | – | – | – | 0/37 | – |
| 30 | Apr 19–23 | Earth Day | decoded | – | – | – | 0/37 | – |
| 31 | Apr 26–30 | Green Energy | decoded | – | – | – | 0/37 | – |
| | | _May 1–7 Labour Day holiday — no circle time_ | | | | | | |
| 32 | May 10–14 | Big Bang and the Universe | decoded | built (1014 ln) | yes | yes | **0/37** | `/teachers-w32` |
| 33 | May 17–21 | Solar System | decoded | built (1036 ln) | yes | yes | **0/37** | `/teachers-w33` |
| 34 | May 24–28 | Space Exploration | decoded | built (1013 ln) | yes | yes | **0/37** | `/teachers-w34` |
| 35 | May 31–Jun 4 | Dinosaurs and Fossils (1) | decoded | built (1026 ln) | yes | yes | **0/37** | `/teachers-w35` |
| 36 | Jun 7–11 | Dinosaurs and Fossils (2) + May review | decoded | built (1043 ln) | yes | yes | **0/37** | `/teachers-w36` |
| 37 | Jun 14–18 | Graduation | decoded | – | – | – | 0/37 | – |

`check_week.py` currently reports **PASS on weeks 3, 4, 32, 33, 34, 35, 36** (weeks 32–36 with
one warning each: art not generated; week 3 with one warning: it predates `imgFallback`, but
all 37 of its images are on disk).

**"Plan" means:** a full section in `docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md`
— 5 words, Littles/Bigs tiers, five Magic Box objects, the daily games, one ukulele song with
chorus + 5 verses, four shelf trays, Friday parent wrap-up and that week's Dark Phonics sound.
Weeks 9–37 all have one. **Weeks 5–8 have nothing** except the principal's own sheet rows.

---

## Build order

**Rule: always stay ≥3 weeks ahead of today.** Today is Wed 3 Sep 2026 and week 4 (Sep 7–11)
is the next teaching week, so weeks 5, 6, 7 and 8 are already inside that buffer — they are
urgent, and they are also the four with no plan. That is the whole reason batch 0 exists.

### Batch 0 — reconcile + write the four missing plans (do this first, alone)

1. Fix the `public/circle-time-weeks.js` numbering collision (see above). Delete the ghost
   `n:3`/`n:4` entries, renumber the two shipped weeks to `n:3` and `n:4`, and fill in real
   `dates`/`mon`/`fri` for `n:5`–`n:8` from the sheet. Keep their `route`s untouched
   (`/teachers-week1`, `/teachers-next`) — those URLs are already shared.
2. Write the **week 5, 6, 7, 8** sections into
   `docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md`, in the same formula and
   the same markdown shape as week 9, from the principal's rows 8–11 of
   `2026-2027_全年中文课程计划_全年已填.xlsx` sheet `工作表1`. Her material, in slot order:

   | Wk | Theme | 主题内容 (E) | 汉字 (G) | 古诗/节气 (H) | 语言表达 (I) | Theme Activity (J) |
   |---|---|---|---|---|---|---|
   | 5 | My 5 senses | 我的五感 · 实验：沉浮 (sink/float) | 嗅觉 味觉 听觉 触觉 视觉 | 《初秋》孟浩然 | 我看见/我听见/我摸到/我闻到/我尝到; one sense per day | 设计 · 美工 · 烘焙 |
   | 6 | My Feeling | 情绪, 秋分, 中秋, 国庆节 | 情绪分类卡 · 秋分节气三段卡 | 秋分节气 · 《水调歌头》 | 我今天感觉很开心/很难过/很累 | 情绪角 · 中秋游园 · 庆祝国庆 |
   | 7 | Five food groups | 五大食物组 · 食物金字塔 · 寒露 (10月8日) | 食物分类卡 · 寒露节气三段卡 | 寒露节气童谣 | 苹果属于水果组 / 玉米是谷物组 / 黄豆属于蔬菜豆类组 / 牛奶是奶制品 / 鸡蛋在肉蛋坚果组 | 认识五大食物组、讨论食物来源；食物金字塔，多吃/少吃 |
   | 8 | Healthy food | 食物分类 · 重阳节 | 古诗对应汉字 | 重阳节《九月九日忆山东兄弟》 | (she left it blank — write it) | (blank — write it) |

   Each week must land the full formula: 5 English words, Littles/Bigs tiers, 5 Magic Box
   objects (one per day, favouring objects that double as cultural-shelf trays), a named game
   per day, **exactly one** original ukulele song (C · F · G7 · Am only) with chorus + 5 verses,
   4 shelf trays each with a control of error, and the Friday wrap-up naming that week's Dark
   Phonics sound.
   **Dark Phonics:** week 4 taught **Pp**; week 9 teaches **g**. Weeks 5–8 need the four sounds
   between them — check `lib/montree/dark-phonics/lessons.ts` (week 4 = entry `n: 8`) and take
   entries 9–12 in order. Do not invent a sequence.
   Note week 6 is a **four-day week** (Sep 21–24) and week 7 follows the **Oct 1–7 国庆 gap**.
   Write week 6 as four days, and open week 7 with a "welcome back from the holiday" hook.
3. Get Tredoux to eyeball weeks 5–8 before building pages from them. They are the principal's
   own weeks and she has opinions.

### Then, in calendar order, in batches of ~5

| Batch | Weeks | Why grouped |
|---|---|---|
| 1 | 5, 6, 7, 8 | urgent — inside the 3-week buffer; needs batch 0 first |
| 2 | 9, 10, 11, 12, 13 | Oct–Nov; Halloween + the two cycle weeks share a lot of art |
| 3 | 14, 15, 16, 17 | Thanksgiving, both Helpers weeks, Christmas |
| 4 | 18, 19, 20, 21 | Jan; Beijing + China pair naturally |
| 5 | 22, 23, 24, 25, 26 | CNY + the geography run |
| 6 | 27, 28, 29, 30, 31 | the Earth run |
| 7 | 37 | Graduation — the one week that *is* a review; build it last, it references the year |

Weeks 32–36 are already built; they need **art only** (see the MJ runbook below).

**Parallelism.** Within a batch, run one Opus subagent per week, in parallel, each owning
**only its own week's files** (`public/circle-time-week<NN>.html`, its guide-PDF source, its
`docs/circle-time/mj-prompts-week<NN>.md`, its image folder). Do **not** let a worker touch
`next.config.ts`, `middleware.ts` or `public/circle-time-weeks.js` — parallel edits to those
three will conflict. The main session (or one nominated integrator) lands every line in those
three files, once, at the end of the batch. Sonnet does the audits.

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

### Do weeks 32–36 first

Weeks 32–36 are **already built, already routed, already have their 37 prompts written** — they
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
`public/circle-guide.pdf`. Today those are copies of week 3. Two ways forward.

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
- **Sheet weeks 1 and 2 have no pages, and `circle-time-week1.html` / `week2.html` belong to
  sheet weeks 3 and 4.** Never create a page under those two filenames.

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
| **May weeks 32–36 notes** | `docs/circle-time/MAY_README.md` |
| **MJ prompt runbook** | `docs/circle-time/mj-prompts-README.md` |
| **MJ prompts, per week** | `docs/circle-time/mj-prompts-week<NN>.md` · all-May: `mj-prompts-may-ALL.md` |
| **Week checker** | `scripts/circle-time/check_week.py <NN> [...]` · `--all` |
| **State table generator** | `scripts/circle-time/status.py` · `--plain` · `--next` |
| **MJ PNG → repo JPEG** | `scripts/circle-time/mj_convert.sh <NN> [--dry]` (macOS, needs `sips`) |
| Pages | `public/circle-time-week<NN>.html` (+ legacy `circle-time.html`, `-week1`, `-week2`) |
| Guide PDFs | `public/circle-guide-week<NN>.pdf` (+ legacy `circle-guide.pdf`, `-week1`, `-week2`) |
| Images | `public/circle-time-images/week<NN>/ct-week<NN>-<slug>.jpg` (37 each) |
| Routing | `next.config.ts` `rewrites().afterFiles` (~line 366) · `middleware.ts` `publicPaths` (~line 510) |
| Dark Phonics lesson sequence | `lib/montree/dark-phonics/lessons.ts` (week 4 = entry `n: 8`) |
| Project conventions | `CLAUDE.md` § "🐳 Circle Time (Teachers tab)" |
| Live site | `https://www.teacherpotato.xyz` — password `THISDL` on every circle-time page |

---

## The first five actions

1. Run `python3 scripts/circle-time/status.py` and
   `python3 scripts/circle-time/check_week.py --all`, and read
   `docs/circle-time/HANDOFF-week2-my-body.md` + `git log --oneline -5` + `git status --short`
   — confirm this table still matches reality and find out what the other session has landed
   since 2026-09-03.
2. Fix the week-numbering collision in `public/circle-time-weeks.js`: drop the duplicate ghost
   entries for weeks 3 and 4, renumber the two shipped weeks to `n:3` / `n:4` keeping their
   existing routes, and fill in real `dates`/`mon`/`fri` for weeks 5–8 from the principal's
   sheet. Ask Tredoux about the off-by-one dates on the two live pages; do not change them
   unasked.
3. Write the **week 5, 6, 7 and 8** sections into
   `docs/circle-time/Whale_Class_Circle_Time_Decoded_2026-2027.md`, in the week-9 format and
   the full formula, from her rows 8–11 of the xlsx (week 6 is a 4-day week; week 7 opens after
   the Oct 1–7 国庆 gap; take the Dark Phonics sounds in order from
   `lib/montree/dark-phonics/lessons.ts` entries 9–12). Show them to Tredoux before building.
4. Kick off the **weeks 32–36 Midjourney run** in parallel with the writing — those five pages
   are already built and their 185 prompts are already written in
   `docs/circle-time/mj-prompts-may-ALL.md`. It is the cheapest end-to-end test of the art
   pipeline, and it is the only remaining work on five finished weeks.
5. Build **weeks 5–8** as batch 1 — one Opus subagent per week from the plans written in step 3,
   Sonnet audit each, then one integrator lands the `next.config.ts` / `middleware.ts` /
   `circle-time-weeks.js` lines, commits by explicit path through Desktop Commander, pushes
   `main`, and curl-verifies. Then keep going in calendar order, never letting the buffer fall
   below three weeks.
