# Whale Class Circle Time — Year Calendar 2026–27
**CANONICAL. Written 2026-09-03 from the principal's PRINTED plan, which Tredoux declared the
source of truth for the year from October onward — it supersedes the xlsx-based order.**

**RENUMBERED 2026-09-15 — the `Wk` column below is now the SCHOOL's week number,
the number on the principal's printed plan and the only number anyone says out loud.
The year runs Week 3 (I'm Special, 1 Sep) to Week 38 (Graduation, 14–18 Jun): 36 taught
weeks numbered 3–38. It is the same number as the `Printed-plan cell` column, which is
exactly +2 on the old internal count for all 36 weeks (verified row by row on 2026-09-15).
Routes, guide-book file names, covers, footers, PDF titles, page titles, tabs and the
newsletter tool all carry THIS number. Two legacy numberings survive where no teacher sees
them and are NOT to be surfaced: the picture bank `public/circle-time-images/week<Wk−2>/`,
and the decoded doc's `## WEEK <Wk−2>` headings. The `Sheet` column is a third, unrelated
numbering (her old xlsx) with no constant offset — see point 2 below.**

This file is the single authority on **which week is which**: its number, its theme, its real
dates, its day count, its Dark Phonics lesson and its build status. Where
`Whale_Class_Circle_Time_Decoded_2026-2027.md`, `public/circle-time-weeks.js`,
`HANDOFF-year-build.md` or any built page disagrees with this table, **this table wins** and the
other should be corrected.

---

## The three things that changed

1. **The year is now 36 taught weeks, not 35** — Week 3 (1 Sep) to Week 38 (Graduation, 14–18 Jun).
2. **`sheet = site + 2` is dead — and that is about the `Sheet` column ONLY.** The printed plan
   merges two weeks, drops three and adds four, so the principal's old **xlsx sheet** numbers do
   not differ from the taught-week order by any constant. Every re-slotted section in the decoded
   doc names the sheet week it came from, in its own lead note; the `Sheet` column below is the
   only map that still exists to it. **This is NOT the numbering we use.** The numbering we use is
   the `Printed-plan cell` column — her PRINTED plan, which Tredoux declared canonical — and that
   one *is* a clean, gap-free run of 3…38, one cell per taught week.
3. **Dark Phonics is re-threaded strictly.** One `lib/montree/dark-phonics/lessons.ts` entry per
   taught week, in order, from Week 3 = `n:7` (**t**). Nothing skipped, nothing repeated, nothing
   invented. The old decoded doc had drifted after **qu** — it used `-ng`, which is not in the
   sequence at all, and taught **sh** twice.

## Dates: her grid vs the real one

Her printed sheet is laid out on **last year's weekday grid** (its week 1 reads 8.31–9.4). The real
2026-27 calendar starts on **Tuesday 1 September 2026**. Every date in this file has been realigned
to the real calendar; her cell dates are given in the `Printed-plan cell` column exactly as she
wrote them, so the two can always be reconciled by eye.

---

## The calendar

| Wk | Short (≤2 words) | Theme | Mon | Fri | Days | Dark Phonics | Sheet | Printed-plan cell | Status |
|---|---|---|---|---|---|---|---|---|---|
| 3 | I'm Special | I'm Special / I Like Myself | 2026-09-01 (Tue) | 2026-09-04 | 4 | `n:7` **t** | — | 3 · 9.1–9.5 · I'm special/I like myself | **built** (page prints "Sep 1–5" — locked, do not change) |
| 4 | My Body | My Body | 2026-09-07 | 2026-09-11 | 5 | `n:8` **p** | — | 4 · 9.8–9.12 · My Body | **built** (page prints "Sep 8–12" — locked) |
| 5 | 5 Senses | My 5 Senses | 2026-09-14 | 2026-09-18 | 5 | `n:9` **i** | 5 | 5 · 9.15–9.19 · My 5 senses | **built** |
| 6 | My Feeling | My Feeling | 2026-09-21 | 2026-09-24 | 4 | `n:10` **n** | 6 | 6 · 9.22–9.26 · My Feeling | **built** |
| | | *中秋节 Fri 25 Sep* | | | | | | | |
| 7 | Autumn 1 | Autumn (1) | 2026-09-28 | 2026-10-09 | 5 | `n:11` **m** | — | 7-8 · Autumn 10.9–10.17 (first half) | **built** `/teachers-w7` — **split by 国庆 1–7 Oct**: Mon 28, Tue 29, Wed 30 Sep + Thu 8, Fri 9 Oct |
| | | *国庆节 holiday 1–7 Oct — falls INSIDE Week 7* | | | | | | | |
| 8 | Autumn 2 | Autumn (2) | 2026-10-12 | 2026-10-16 | 5 | `n:12` **d** | — | 7-8 · Autumn 10.9–10.17 (second half) | **built** `/teachers-w8` |
| 9 | Food Groups | Five Food Groups | 2026-10-19 | 2026-10-23 | 5 | `n:13` **g** | 7 | 9 · 10.20–10.24 · Five food groups | **built** `/teachers-w9` (was the old `week5` page [legacy numbering] — renumbered, re-dated, phonics m→g) |
| 10 | Healthy Food | Healthy Food & Healthy Habits | 2026-10-26 | 2026-10-30 | 5 | `n:14` **o** | 8 + 9 | 10-1 Healthy food + 10-2 Healthy Life/habits | **built** `/teachers-w10` (was the old `week6` page [legacy numbering] — renumbered, re-dated, rewritten as the merged food + habits week, phonics d→o) |
| 11 | Family | Family Members | 2026-11-02 | 2026-11-06 | 5 | `n:15` **c** | 11 (family half) | 11 · 11.3–11.7 · Family members | **built** `/teachers-w11` |
| 12 | My House | My House | 2026-11-09 | 2026-11-13 | 5 | `n:16` **k** | — | 12 · 11.10–11.14 · My house | **built** `/teachers-w12` |
| 13 | Plants | The Cycle of Plants | 2026-11-16 | 2026-11-20 | 5 | `n:17` **ck** | 13 | 13 · 11.17–11.21 · The cycle of plants | **built** `/teachers-w13` — 37/37 art |
| 14 | Thanksgiving | Thanksgiving Day | 2026-11-23 | 2026-11-27 | 5 | `n:18` **e** | 14 | 14 · 11.24–11.28 · Thanksgiving day | **built** `/teachers-w14` — 37/37 art |
| 15 | Helpers | Community Helpers | 2026-11-30 | 2026-12-04 | 5 | `n:19` **u** | 15 | 15 · 12.1–12.5 · Community Helpers-1 | **built** `/teachers-w15` — 37/37 art |
| 16 | Transport | Tools & Transportation | 2026-12-07 | 2026-12-11 | 5 | `n:20` **r** | — (replaces 16) | 16 · 12.8–12.12 · tools/transportation | **built** `/teachers-w16` — new week, 37/37 art |
| 17 | Christmas | Christmas | 2026-12-14 | 2026-12-18 | 5 | `n:21` **h** | 17 | 17 · 12.15–12.19 · Christmas | **built** `/teachers-w17` — 37/37 art |
| | | *winter holiday 21 Dec – 1 Jan* | | | | | | | |
| 18 | Winter | Winter Is Coming | 2027-01-04 | 2027-01-08 | 5 | `n:22` **b** | 18 | 18 · 1.5–1.9 · winter is coming | **built** `/teachers-w18` — 37/37 art |
| 19 | Weather | Weather | 2027-01-11 | 2027-01-15 | 5 | `n:23` **f** | 19 | 19 · 1.12–1.16 · Weather | **built** `/teachers-w19` — 37/37 art |
| 20 | Beijing | Beijing | 2027-01-18 | 2027-01-22 | 5 | `n:24` **l** | 20 | 20 · 1.19–1.23 · Beijing | **built** `/teachers-w20` — 37/37 art |
| 21 | China | China | 2027-01-25 | 2027-01-29 | 5 | `n:25` **j** | 21 | 21 · 1.26–1.30 · China | **built** `/teachers-w21` — 37/37 art |
| 22 | New Year | Chinese New Year | 2027-02-01 | 2027-02-05 | 5 | `n:26` **v** | 22 | 22 · 2.2–2.6 · Chinese New Year | **built** `/teachers-w22` — 37/37 art; moved to *before* the holiday; Fri 5 Feb is 除夕 |
| | | *春节 Sat 6 Feb · holiday 8–26 Feb* | | | | | | | |
| 23 | Continents | The Seven Continents | 2027-03-01 | 2027-03-05 | 5 | `n:27` **w** | 23 | 23 · 3.2–3.6 · The Seven Continents | **built** `/teachers-w23` |
| 24 | Oceans | The Five Oceans | 2027-03-08 | 2027-03-12 | 5 | `n:28` **x** | 24 | 24 · 3.9–3.13 · Exploring the Five Oceans | **built** `/teachers-w24` |
| 25 | Africa | One Continent — Africa | 2027-03-15 | 2027-03-19 | 5 | `n:29` **y** | 25 | 25 · 3.16–3.20 · Choose one continent | **built** `/teachers-w25` — 37/37 art |
| 26 | South Africa | One Country — South Africa | 2027-03-22 | 2027-03-26 | 5 | `n:30` **z** | 26 | 26 · 3.23–3.27 · Choose one country | **built** `/teachers-w26` — 18/37 art |
| 27 | Spring | Spring & the Life Cycle of Animals | 2027-03-29 | 2027-04-02 | 5 | `n:31` **qu** | 12 (animals half) | 27 · 3.30–4.3 · Spring/Life cycle of animals | **built** `/teachers-w27` |
| | | *清明 Mon 5 Apr* | | | | | | | |
| 28 | Habitats | Animal Habitats | 2027-04-06 (Tue) | 2027-04-09 | **4** | `n:32` **review** — *All Our Sounds* | 29 | 28 · 4.7–4.10 · Animal habitats | **built** `/teachers-w28` — was a 5-day plan, now 4 |
| 29 | The Earth | The Earth | 2027-04-12 | 2027-04-16 | 5 | `n:33` **review** — *The Five Little Vowels* | 27 | 29 · 4.13–4.17 · The Earth | **built** `/teachers-w29` |
| 30 | Landforms | Landforms | 2027-04-19 | 2027-04-23 | 5 | `n:34` **review** — *We Know the Alphabet* | 28 | 30 · 4.20–4.24 · Landforms | **built** `/teachers-w30` — was a 4-day plan, now 5 |
| 31 | Earth Day | Earth Day | 2027-04-26 | 2027-04-30 | 5 | `n:35` **short A** | 30 | 31 · 4.27–4.30 · Earth Day | **built** `/teachers-w31` (Earth Day itself, 22 Apr, falls in Wk 30) |
| | | *Labour Day 1–5 May* | | | | | | | |
| 32 | Big Bang | Big Bang & the Universe | 2027-05-06 (Thu) | 2027-05-07 | **2** | `n:36` **short I** | 32 | 32 · 5.6–5.8 · Big Bang and the Universe | **built** `/teachers-w32` — two-day week, phonics short I, 37/37 art |
| 33 | Solar System | Solar System | 2027-05-10 | 2027-05-14 | 5 | `n:37` **short O** | 33 | 33 · 5.11–5.15 · Solar System | **built** — re-dated + re-phonic'd, 37/37 art |
| 34 | Space | Space Exploration | 2027-05-17 | 2027-05-21 | 5 | `n:38` **short E** | 34 | 34 · 5.18–5.22 · Space Exploration | **built** — re-dated + re-phonic'd, 37/37 art |
| 35 | Dinosaurs 1 | Dinosaurs & Fossils (1) | 2027-05-24 | 2027-05-28 | 5 | `n:39` **short U** | 35 | 35 · 5.25–5.29 · Dinosaurs and Fossils | **built** — re-dated + re-phonic'd, 37/37 art |
| 36 | Dinosaurs 2 | Dinosaurs & Fossils (2) | 2027-05-31 | 2027-06-04 | 5 | `n:40` **minimal pairs** | 36 | 36 · 6.3–6.6 · Dinosaurs and Fossils | **built** — re-dated + re-phonic'd, 37/37 art |
| 37 | Summer | Summer | 2027-06-07 | 2027-06-11 | 5 | `n:41` **ll · ff · ss · zz** | — | 37 · 6.8–6.12 · Summer | **built** `/teachers-w37` — new (端午 Wed 9 Jun) |
| 38 | Graduation | Graduation | 2027-06-14 | 2027-06-18 | 5 | `n:42` **sh** + grand review | 37 | 38 · 6.15–6.19 · Graduation | **built** `/teachers-w38` |

**Totals:** 36 taught weeks · 175 teaching days · **all 36 weeks built and wired (3–38)** —
the year is complete, nothing left to write · fully illustrated (37/37) for weeks 3–25 and 32–36 · week 26 is part-illustrated (18/37) ·
weeks 27–31, 37 and 38 are still art-free (0/37) and ship on emoji fallbacks.

## Festivals and solar terms, in order

秋分 23 Sep (just before Wk 7) · 国庆节 1–7 Oct (inside Wk 7) · 寒露 Thu 8 Oct (Wk 7, day 4) · 重阳节 Sun 18 Oct (Wk 8, Friday) · 霜降 23 Oct (Wk 9, Friday) ·
Halloween Sat 31 Oct (Wk 10, Friday — one-object nod only) · 立冬 Sat 7 Nov (Wk 11, Friday) ·
小雪 22 Nov (Wk 13) · US Thanksgiving Thu 26 Nov (Wk 14) · 大雪 Mon 7 Dec (Wk 16, day 1) ·
冬至 21/22 Dec (winter holiday) · 小寒 5 Jan (Wk 18) · 大寒 20 Jan (Wk 20) · 立春 4 Feb (Wk 22) ·
除夕 Fri 5 Feb (Wk 22, Friday) · 春节 Sat 6 Feb · 惊蛰 6 Mar (Wk 23) · 春分 Sun 21 Mar (the Sunday between Wk 25 and Wk 26) ·
清明 Mon 5 Apr (holiday) · 谷雨 20 Apr (Wk 30) · Earth Day 22 Apr (Wk 30) · 立夏 Thu 6 May (Wk 32,
day 1) · 小满 21 May (Wk 34) · 芒种 6 Jun (Wk 37) · 儿童节 Tue 1 Jun (Wk 36) · 端午节 Wed 9 Jun
(Wk 37) · 夏至 21 Jun (after graduation).

## Dark Phonics — the full thread

One `lib/montree/dark-phonics/lessons.ts` entry per taught week, in order, no gaps:

| Wk | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **n** | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 |
| **sound** | t | p | i | n | m | d | g | o | c | k | ck | e |

| Wk | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **n** | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 |
| **sound** | u | r | h | b | f | l | j | v | w | x | y | z |

| Wk | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **n** | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 |
| **sound** | qu | review | review | review | short A | short I | short O | short E | short U | min. pairs | ll·ff·ss | sh |

The alphabet finishes at **qu** in Week 27, exactly where the geography run ends and the Earth run
begins. Weeks 28–30 are the three review lessons (`All Our Sounds`, `The Five Little Vowels`,
`We Know the Alphabet`) and land on habitats, the Earth and landforms — the alphabet hunt on
**m**ountain, **r**iver, **i**sland, **l**ake is a genuinely good fit. Weeks 31–35 are the five short
vowels, Week 36 is minimal pairs, Week 37 is the double endings, and Week 38 arrives at **sh** —
graduation also re-sings the whole year's sounds as a ritual, which is noted in its wrap-up but is
*not* a change to the sequence.

---

## How the printed plan was reconciled — every decision, and who made it

All of the following were locked by Tredoux on 2026-09-03 when he declared the printed plan
canonical. They are recorded here so nobody re-litigates them or "fixes" one back.

1. **Her sheet is on last year's weekday grid.** Every date was realigned to the real 2026-27
   calendar (1 Sep 2026 = Tuesday). Her own cell dates are preserved in the table above.
2. **Week 3 is a 4-day week** (Tue 1 – Fri 4 Sep). The live page prints "Sep 1–5" and Week 4's
   prints "Sep 8–12"; **the date strings on those two live pages are locked and must not be
   changed**, but every calculation downstream uses the real dates in this table.
3. **Sep 28–30 are school days** — 国庆 in 2026 is 1–7 October only. Her sheet leaves that half-week
   unassigned; Tredoux ruled it in.
4. **Her "7-8 Autumn 10.9–10.17" is split into two taught weeks, and Week 7 STRADDLES the holiday.**
   Week 7 is a normal **five-day** formula week whose days are Mon 28, Tue 29 and Wed 30 September
   plus Thu 8 and Fri 9 October — one week, one song, one shelf, with 国庆 1–7 Oct sitting inside it.
   The manifest carries `mon: 2026-09-28`, `fri: 2026-10-09` and the note *"split by 国庆 Oct 1–7"*.
   Day 1 opens on 秋分-just-passed and 国庆 coming; Day 4 (Thu 8 Oct) opens with the welcome-back hook
   and 寒露. The break is used, not worked around: on Wednesday the class photographs a branch that is
   only just turning and asks the tree to carry on without them, and on Thursday they hold the
   photograph up against the real thing. Week 8 is the full autumn week (12–16 Oct), unchanged.
5. **重阳节 falls on Sunday 18 October**, so it is Week 8's Friday: 登高, 赏菊, 重阳糕 to the
   grandparents, and 王维's 《九月九日忆山东兄弟》. It used to sit in the old Healthy Food week, which
   has now moved to late October; the 重阳 material moved with the date, not with the theme.
6. **"10-1 Healthy food" and "10-2 Healthy Life/habits" are merged into ONE week** (Week 10): food on
   Monday and Tuesday, habits on Wednesday and Thursday, both together on Friday. Still exactly one
   song, five words, four trays. The unmerged habits week is kept in the decoded doc's retired
   appendix.
7. **The Halloween week is dropped**, replaced by a single light nod on Friday 30 October — one
   pumpkin lantern in the Magic Box and one BOO at the close. The full retired week is kept in the
   appendix in case it is ever wanted back.
8. **"Community Helpers-2" is replaced by "Tools & Transportation"** — which is what her cell for
   7–11 Dec actually says. The old Helpers-2 week (cook, farmer, postman, builder) is retired to the
   appendix; it contained no transport material, so Week 16 is written from scratch.
9. **"People around me" is split.** Its family half became Week 11 *Family Members*, following her own
   cells (family tree, dolls, family photo sharing, dramatic play, *The Family Book* by Todd Parr).
   The *friends* half is retired to the appendix. Her cell's "Finger Family"-type song is replaced by
   an original ukulele song, per the house rule that every week's song is written for it.
10. **"My House" (11.10–11.14) has no detail in her sheet** — the whole week is written out in the
    formula, and placed deliberately after Family Members: last week the people, this week the place.
11. **Chinese New Year moved to BEFORE the holiday** (1–5 Feb). 春节 2027 is Saturday 6 February, so
    Friday 5 February is 除夕 itself and the week is a countdown, not a retrospective. The break then
    runs 8–26 Feb.
12. **"Spring/Life cycle of animals" is one week** (Week 27), built on the old cycle-of-animals plan
    with the spring hook added — 《春晓》孟浩然 and 春分立蛋.
13. **Green Energy is dropped**; retired to the appendix.
14. **Summer (7–11 Jun) is a new week**, written from scratch, carrying 端午节 on the Wednesday.
15. **Two weeks change day count and their built plans must be adjusted, not squeezed:** Week 28
    Animal Habitats becomes 4 days (清明 Mon 5 Apr) and Week 32 Big Bang becomes **2** days (Labour
    Day). Week 30 Landforms *gains* a day, 4 → 5.
16. **Dark Phonics is re-threaded strictly in lessons.ts order** from Week 3 = `n:7`. Consequence:
    the five built May pages (30–34) all carry the wrong sound now, and the two built pages that get
    renumbered to Weeks 7 and 8 do too. All seven are listed in the status column.
17. **Graduation gets `sh`, not "grand review".** The sequence is the sequence; the grand review is
    kept as a graduation *ritual* in the wrap-up (sing the alphabet, the five short vowels and the
    double endings once more), which is what it always really was.

## What the integrator has to do next

**Nothing — this calendar is fully applied.** All 36 weeks are built, wired and live, and the
2026-09-15 renumbering brought every teacher-visible surface onto the `Wk` numbers above:
routes `/teachers-w3`…`/teachers-w38`, books `circle-guide-week3.pdf`…`week38.pdf` (covers,
footers and PDF titles all say "Week <Wk>"), page `<title>`s, the tab strip, the week manifest
and `public/newsletter.html`. The historical steps this section used to list (renumbering the
two built pages, writing the two Autumn weeks, re-dating the May pages, rebuilding the
manifest) were all completed on 2026-09-03/04.

The build procedure for any future week is `docs/circle-time/WEEK_BUILD_SPEC.md`.
