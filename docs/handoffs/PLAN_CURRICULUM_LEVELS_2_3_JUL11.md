# PLAN — ENGLISH CURRICULUM LEVELS 2 + 3 (Blue/Green treatment) — Jul 11, 2026

**Status: ROADMAP APPROVED by Tredoux (Jul 11, same session as the overnight production run). This doc is
the binding contract + research payload for the build. Level 1 (26 weeks) is FULLY PRODUCED (specs, images,
packs, songs — see `docs/curriculum/OVERNIGHT_RUN_JUL11.md`). This plan extends the same treatment
(2 dark-trap songs + 1 decodable book + full printable pack per week) to Levels 2–3.**

**Fable directs and authors the critical content. Sonnet researches/audits/produces. Opus builds engine +
drafts content. Sacred flow on all engine work: Fable contract → Opus build → Sonnet fresh-eyes → fix → re-audit.**

---

## 0. PROPOSED RULINGS (Fable defaults — Tredoux vetoes in one line at session start, else they stand)

1. **Shape: keep the existing 16+16 skeletons** (Level 2 = W27–42, Level 3 = W43–58, total program 58 weeks
   ≈ 2 school years). Research-backed: blends are a consolidation SKILL not new sound-symbol knowledge
   (UFLI + Jolly Phonics give them zero dedicated lessons; Letters & Sounds caps them at 4–6 weeks), so they
   get ~5 light weeks inside Level 2; digraphs/phonograms are genuine new content and keep Level 1's
   one-per-week cadence.
2. **Cast: carries over and GROWS.** The 9 named members (Cat, Segina, Sam, Ant, Dog, Rat, Bug, Duck, Fox)
   + potato gag continue; each new level adds 2–3 members as sounds unlock (candidates: Sheep for sh W27,
   Chick for ch W28, Snake for s-blends W33, Owl for ou/ow W52 — final call per week during spine writing).
   Potato rule persists: never printed until decodable — with magic-e the class can nearly spell it; the
   -tion graduation week is potato's apotheosis. Suno lyric name rule persists ("Sejeena" phonetic).
3. **End scope: stop at W58 (-tion + grand graduation).** Advanced morphology (suffixes -ly/-ful/-ness,
   prefixes pre-/dis-, contractions, roots — lesson-map L111–128) is explicitly OUT: possible Level 4 later,
   library territory for now.
4. **Naming: they are "Level 2" and "Level 3"** in all product surfaces — NOT "Blue/Green" — because
   lesson-map.ts's internal pink/blue/green phase boundaries do NOT match the level boundaries (digraphs+blends
   are PINK in lesson-map; magic-e is BLUE; vowel teams are GREEN). Blue/green is design vocabulary only.
   `lesson-map.ts` stays FROZEN (never renumber); interop via extending `weekToLessonMap` for W27–58,
   exactly the Level 1 precedent.

---

## 1. WHERE WE ARE (audit summary, Jul 11)

- **Level 1 complete**: 26 WeekSpecs (`lib/montree/english-curriculum/spec/week-01..26.json`), all images
  (~520), all packs (`pack-v2/`, 10 doc types × 26, verified non-zero), all songs (W1–2 legacy + W3–26 = 48
  Suno mp3s × 2 takes). Production runbook + loops proven: `docs/curriculum/OVERNIGHT_RUN_JUL11.md`.
- **End-of-Level-1 decodable inventory (the baseline Level 2 builds on): 94 words** = 89 taught newWords
  (a, at, mat, am, cat, sat, Sam, an, ant, can, man, pat, nap, map, tap, it, in, sit, pin, hat, hit, ham,
  him, dad, and, sad, did, on, not, top, pot, dog, got, dig, pig, big, bat, bag, bad, pet, ten, hen, bed,
  rat, red, rip, ram, up, sun, run, cup, fun, fan, fat, fin, leg, log, lap, lip, wet, win, wig, web, jam,
  jet, jug, jog, kid, kit, duck, kick, vet, van, yes, yum, yam, yet, fox, box, six, mix, quiz, quit, quack,
  quick, zip, zap, buzz, zigzag) + 5 glue (the, is, I, on, says). All 26 letters + qu.
  ⚠️ `reviewBank[]` in the JSONs is per-week curated, NOT truly cumulative despite its doc-comment — use the
  newWords union as ground truth for cumulative decodability.
- **Skeletons exist**: `spec/level2-skeleton.json` + `level3-skeleton.json` (16 entries each,
  `SkeletonWeek = {week, level, unit, focus, notes}`) — design-only, zero content. This plan supersedes their
  unit groupings where the grids below differ.
- **Word banks already exist** in `lib/montree/phonics/phonics-data.ts` (BLUE_1 initial blends, BLUE_2 final
  blends, BLUE_3 doubles+ck, GREEN_1 digraphs, GREEN_2 vowel teams+silent-e, GREEN_3 r-controlled+advanced)
  — mine these first when authoring. **No word banks exist for**: -tch/-dge, y-as-vowel, -mb silent, -tion,
  -ing/-ed, -s/es — author from scratch.
- **Locked production rules carry forward unchanged** (from `PLAN_CURRICULUM_STUDIO_JUL10.md` §5/§8b):
  Suno style v2 string; WHOLE-WORDS lyric rule (+ initial-sound stutters + uppercase spell-outs allowed;
  phonetic respelling for sung short-vowel stutters); MJ prompt suffixes (photo + coloring variants);
  asset-manifest-first; STRICT vs PICTURE-VOCAB decodability split; cast names decodability-exempt
  ("known by heart"); audit agents never mutate live spec files; new week JSON = 1 WEEK_LOADERS line or
  it's invisible; every durable-output model call temperature:0.

---

## 2. THE ROADMAP (approved grids)

### LEVEL 2 — W27–42 (digraphs → blends → magic-e), 16 weeks
| Wk | Focus | Notes |
|---|---|---|
| 27 | **sh** | biggest early unlock (~35-40 words: fish, wish, shop, ship). Cast debut candidate: Sheep. |
| 28 | **ch** | ~30 words (chin, chop, chick, much). Cast debut candidate: Chick. |
| 29 | **th** (voiced + voiceless) | THE highest-frequency digraph — unlocks that/with/this/then/them → sentence glue explodes. EAL: minimal-pair drill (th vs s/t — Mandarin has no dental fricatives). |
| 30 | **ck + ff/ll/ss/zz** | officially Blue-series (counterintuitive but sourced). back, duck upgrade, bell, miss, buzz formalized. |
| 31 | **ng** | sing, ring, king, long. EAL note: Mandarin HAS final ng but studies show it still reduces — drill explicitly, don't assume free. |
| 32 | **wh** | small family but gates ALL question words (what/when/where/which/why) — classroom-comprehension multiplier. |
| 33 | s-blends (st, sp, sn, sm, sw, sc/sk) | blends = recombination of known sounds; lighter treatment, high picture-vocab (stop, snake, spider, swim). |
| 34 | l-blends (bl, cl, fl, gl, pl, sl) | |
| 35 | r-blends (br, cr, dr, fr, gr, pr, tr) | initial /r/ is NOT hard for Mandarin L1 (unlike Japanese/Korean) — normal pace. |
| 36 | final blends I (-nd, -nt, -mp, -st) | 🚨 EAL HARDEST CATEGORY: Mandarin has zero coda clusters. Double repetition, no-schwa modeling ("st" not "suh-tuh"). |
| 37 | final blends II (-nk, -ft, -lt, -lp + final -l focus) | final /l/ = documented ~97% error trap (ball, milk) — dedicated minimal-pair material. |
| 38 | **magic-e: a_e** | cake, name, gate, late — 2nd-biggest unlock of the whole program. Needs the NEW pattern-card tracing concept (see §3). |
| 39 | magic-e: i_e | bike, time, five, kite |
| 40 | magic-e: o_e | home, bone, nose, rope |
| 41 | magic-e: u_e + e_e | cube, mule, these |
| 42 | soft c/g + -tch/-dge + 🎓 Level 2 review & celebration | ice, cage, catch, bridge. Celebration = Pattern Wall completion (see §3). |

### LEVEL 3 — W43–58 (vowel teams → r-controlled → diphthongs → basic morphology), 16 weeks
| Wk | Focus | Notes |
|---|---|---|
| 43 | **ai/ay** | rain, play, tail, day (~35 combined) |
| 44 | **ee/ea** | see, tree, eat, sea (2nd-highest vowel-team frequency) |
| 45 | **oa/ow** (long o) | boat, snow, coat, grow |
| 46 | **igh/ie** | night, light, pie |
| 47 | **ar** | star, car, park — cleanest r-controlled first |
| 48 | **or/ore** | for, corn, more |
| 49 | **er/ir/ur** (one sound, three spellings) | her, bird, fur — hugely frequent in function words (water, better, under) |
| 50 | 🔁 review + EAL minimal-pair week | tense-lax vowel contrasts (pin/pen, hat/hut, ship/sheep) — Mandarin has no tense/lax distinction; this week exists FOR the EAL market. |
| 51 | **oo** (both sounds) | moon/book — two-sound ambiguity placed after the easy teams |
| 52 | **ou/ow** (diphthong) | out, cow, house. Cast debut candidate: Owl. |
| 53 | **oi/oy** | coin, boy — smallest family, correctly last of the true teams |
| 54 | **ew/ue/au/aw** (light bundle) | new, blue, saw, because |
| 55 | **y as vowel** | my, fly, baby, happy |
| 56 | silent letters **kn/wr/mb** | knee, write, lamb — "ghost letters" narrative gift |
| 57 | **-ing/-ed + -s/es** | reading real connected sentences; the cast DOES things at last (running! jumped!) |
| 58 | **-tion + 🎓 GRAND GRADUATION** | action, celebration(!). Whole-cast finale; potato's apotheosis. End of the 58-week program. |

**Decodability law continues**: each week's STRICT fields decode via taught letters + taught patterns +
cumulative glue. The validator must treat a taught PATTERN (sh, a_e, ai) as a decodable unit (see §3).
Author cumulative word-bank math into MASTER_SPINE exactly as Level 1 did, starting from the 94-word baseline.

---

## 3. ENGINE GENERALIZATION (build BEFORE any content authoring — sacred flow, Opus builds)

Precise, audited gap list (file paths verified Jul 11):
1. `spec/types.ts` — `soundType` enum currently `'vowel'|'consonant'|'digraph'`: add
   `'blend'|'vowel-team'|'magic-e'|'r-controlled'|'diphthong'|'morphology'|'silent-letters'`. Extend
   WeekSpec with `level: 1|2|3` (currently `level:1`) and optional `patternDisplay` (e.g. "a_e") where
   `sound` alone is ambiguous.
2. **Tracing** (`render/builders/tracing.ts` + `letter-strokes.ts`): works as-is for contiguous a-z patterns
   (sh, ch, bl, st — per-char glyphs concatenate fine). BREAKS conceptually for magic-e (`a_e` — the `_`
   silently filters out) and suffix weeks. Build a **pattern-card tracing variant**: color-coded
   Montessori-style (pattern letters in red, frame word in black, silent-e greyed/haloed), driven by a new
   `materials.tracing.mode: 'letters'|'pattern'` field. ONE tracing impl with a mode switch — do not fork.
3. **Vowel wall → Pattern Wall** (`render/builders/vowel-wall.ts`): regex cap `/^[a-z]{1,2}$/` rejects
   3+ char sounds (igh, tch). Generalize to a per-level Pattern Wall (Level 2 = 16 pattern leaves, Level 3 =
   16) — the celebration mechanic analogue to Level 1's vowel lights: the wall/tree fills as weeks complete.
   Keep Level 1's vowel-wall output byte-identical (regression-gate it).
4. **Book cover kicker** (`render/builders/book.ts` ~line 76): hardcoded `"WEEK N · THE LETTER {sound}"` →
   level-aware: Level 2/3 use `"WEEK N · THE SOUND {patternDisplay}"`.
5. **Validator** (`scripts/curriculum/validate-specs.mjs`): decodability gate must decompose STRICT words
   via taught multi-char patterns (longest-match against the cumulative pattern set), not letter-sums;
   accept new soundTypes; enforce cumulative pattern registry across W27–58.
6. `spec/index.ts` — WEEK_LOADERS entries for week-27..58.json (the invisible-week trap) + extend
   `weekToLessonMap` W27–58 (lesson-map equivalences: digraphs→L42-46, blends→L47-53, magic-e→L54-57,
   soft c/g→L58-59, -tch/-dge→L60-61, y-vowel→L62-64, -ing/-ed/-s→L65-67, r-controlled→L71-75, vowel
   teams→L84-89, igh/diphthongs→L90-94, oo/au/aw/ew→L95-99, silent→L104-106, -tion→L109).
7. `render/builders/assets.ts`, bingo, 3-part cards, sentence strips, matching, dictionary journal, coloring,
   qr-cards, geometry: **no changes needed** (audited generic).

Also carry the overnight-run engine lesson: `htmlToPdf` 0-byte guard is already in `build-week.mjs`
(commit `4b28562e`) — keep it.

---

## 4. RESEARCH PAYLOAD (condensed — full agent briefs in session transcript, sources listed at bottom)

- **Blue series canon**: initial blends bl/cl/fl/gl/pl/sl · br/cr/dr/fr/gr/pr/tr · sc-sk/sm/sn/sp/st/sw · tw;
  final blends -ct/-ft/-lt/-nt/-pt/-st · -ld/-lf/-lk/-lp · -mp/-nd/-nk/-sk/-sp; PLUS ff/ll/ss/zz and -ck
  (Blue by tradition). No canonical internal order exists — cluster-by-onset is our ruling.
- **Green series canon (Nienhuis 16)**: ch sh th ai ee ie oa ar er or oy ue ou au oo qu. Modern practice adds
  wh/ph/ng, ay/ea/ow/ew/ui, oi, ir/ur, magic-e, igh, kn/wr/mb, soft c/g, tch/dge, y-vowel — our Level 2/3
  folds these in deliberately (intentional scope expansion beyond the strict 16, matching every modern program).
- **Sequencing consensus** (UFLI + Letters&Sounds + Jolly): sh/ch/th/ck/ng early; magic-e immediately after
  digraphs (UFLI placement — we follow it); r-controlled before vowel teams (UFLI); oi/oy last. wh is the
  one disagreement (UFLI early, L&S/Jolly late) — we go early for the question-word EAL payoff.
- **EAL (Mandarin L1) adjustments**: final blends hardest (zero Mandarin coda clusters — 2× repetition,
  W36–37 split); final /l/ ~97% error rate (dedicated material W37); th minimal pairs (W29); tense-lax vowel
  contrast week (W50); ng not free despite existing in Mandarin (W31 explicit); initial /r/ NOT a problem;
  no-schwa consonant modeling everywhere (aligns with existing sandpaper-letter guidance). Evidence: explicit
  phonological-awareness instruction beats incidental for Chinese ESL kids (Yeung & Siegel 2013 RCT).
- **Pacing evidence**: L&S Phase 4 (blends) = 4–6 weeks vs ~42 weeks of phonogram phases; Montessori
  practitioner accounts: Blue goes fast, Green takes as long as Pink+Blue combined. Hence 16+16 with blends
  as 5 light weeks inside Level 2.
- Key sources: UFLI Foundations scope & sequence; Letters and Sounds phase docs; Jolly Phonics groups;
  Montessori Album Pink/Blue/Green; Nienhuis double sandpaper letters; NAMC; Xu & Demuth 2014; Kirk & Demuth
  2005; Yeung & Siegel 2013; Masterson et al. 2003 (digraph frequency in HF words); Fry top-100.

---

## 5. THE GAME PLAN (execution phases, next sessions)

- **Phase A — Spine lock (Fable, first session after reset):** apply/confirm §0 rulings → rewrite
  MASTER_SPINE.md with the §2 grids + full per-week word banks (mine phonics-data.ts first) + cumulative
  decodability math from the 94-word baseline + cast debut schedule + celebration mechanics. Update the two
  skeleton JSONs to match.
- **Phase B — Engine generalization (same or next session, sacred flow):** Fable contract from §3 → Opus
  build → Sonnet fresh-eyes FIX FIRST → re-audit SHIP. Regression-gate: Level 1 re-render byte-stable
  (spot: W4, W19, W26).
- **Phase C — Content authoring:** Fable authors exemplars W27 (sh — first digraph week) + W38 (a_e — first
  pattern-card week); 3 parallel Opus drafters take the rest in level-sized chunks against the exemplars;
  validator exit-0 gate on all 32; **Fable personally reads all 32 weeks' lyrics + book texts** (Level 1
  precedent — 7 fixes came out of that pass).
- **Phase D — Production:** proven overnight loops (`OVERNIGHT_RUN_JUL11.md` = the runbook; canvas-draw
  download technique; one-at-a-time MJ submits; both Suno takes). Estimate: ~640 MJ images + 128 Suno files.
  🚨 PRE-REQ: disk cleanup — Mac ended Jul 11 at 1.7 GiB free; this run needs 10+ GB (Trash 1.2 GB,
  vm_bundles 16 GB, Downloads footage ~10 GB are Tredoux's reclaim candidates).
- **Phase E — Montree wiring:** Phase-2 seeding (montree_classroom_curriculum_works 20000-band, feature
  flag, This Week view) for ALL THREE levels together — stays queued per PLAN_CURRICULUM_STUDIO_JUL10 §8.

**Also owed from Level 1 morning review (fold into Phase A session):** pick Suno takes (96 files);
W9 "A Hat for the Ant" audio≠JSON reconciliation; coloring-page shading rerolls (W2 tiger, W17 fox, W18 lion,
W23 yam/yak); hero-word coloring-page manifest gaps (W5 sat, W6 ant, W7 pat, W9 hat, W13 big); fox W24 vs
W17 side-by-side; zigzag-buzz beetle consistency.

---

## 6. RESUME PROMPT (paste into a fresh session)

"Read CLAUDE.md's top session block + docs/handoffs/PLAN_CURRICULUM_LEVELS_2_3_JUL11.md (the binding contract).
Execute Phase A: confirm the §0 rulings with me in one message, then lock the Level 2/3 spine — rewrite
docs/curriculum/spec/MASTER_SPINE.md with the §2 week grids, full per-week word banks (mine
lib/montree/phonics/phonics-data.ts first; author missing banks for -tch/-dge, y-vowel, kn/wr/mb, -tion,
-ing/-ed, -s/es from scratch), cumulative decodability math from the 94-word Level-1 baseline, cast debut
schedule, and Pattern Wall celebration mechanics. Then Phase B: write the engine-generalization contract
from §3 and run the sacred flow (Opus builds, Sonnet audits, Level 1 render regression-gated). Fable directs
and authors exemplars; Sonnet/Opus do the grunt work. Do not start Phase C content drafting until A+B are
locked and I've seen the spine."

---

*Written by Fable, Jul 11 2026, directly after the Level 1 overnight production run completed. Level 1 is
the proof the machine works; this plan is the map for the rest of the mountain.*
