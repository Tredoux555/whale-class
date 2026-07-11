# SESSION — Jul 12, 2026 (overnight, Cowork/Fable directing) — LEVELS 2–3: SPINE LOCKED + ENGINE GENERALIZED + ALL 32 WEEKSPECS AUTHORED

**Canonical result of executing `PLAN_CURRICULUM_LEVELS_2_3_JUL11.md` Phases A–C in one overnight run.
The 58-week program is now FULLY SPECIFIED: every week from "a" to the potato's coronation has a complete,
validator-green WeekSpec. Phase D (production: ~640 MJ images + 128 Suno tracks) is the next big lift —
gated on Tredoux's disk cleanup (10+ GB needed).**

## §0 rulings — CONFIRMED by Tredoux (Jul 12, all four, no vetoes)
16+16 shape (58 weeks total) · cast carries+grows · stop at W58 · "Level 2/3" naming (never Blue/Green).

## Phase A — Spine locked
- `docs/curriculum/spec/MASTER_SPINE.md` REWRITTEN (Fable): now the full 58-week map. Level 1 section
  unchanged; new Level 2 (W27–42) + Level 3 (W43–58) grids with full per-week word banks (provenance-tagged:
  [pd] = mined from phonics-data.ts, [new] = Fable-authored for -tch/-dge, ie, ore, -lp/-lk, e_e, mb,
  y-vowel, -ing/-ed/-s/es, -tion), cumulative decodability math (94 → 603 at W42 → 1,192 at W58; word
  #1,000 lands W53), heart-word ledger (9 faith words total; on + why both EARN their letters), cast debut
  schedule (Sheep W27 · Chick W28 · Snake W33 · Bee W44 · Star W47 · Owl W52; name-days: Snake W38,
  Sheep W44), Pattern Tree celebration mechanics (32 leaves + Mirror Leaf W50 + potato crown W58),
  song map W27–58, weekToLessonMap equivalences.
- Both skeleton JSONs updated to the locked grids.
- 94-word Level-1 baseline VERIFIED against all 26 week JSONs (exact match, zero discrepancies).

## Phase B — Engine generalized (sacred flow honored)
Contract: `docs/handoffs/PLAN_ENGINE_GENERALIZATION_JUL12.md` (Fable) → Opus build → Sonnet fresh-eyes
(0 CRIT, 1 WARN — OR-masking in the schedule check, FIXED by Fable) → ship.
- `spec/types.ts`: soundType +7 values, `level: 1|2|3`, `patternDisplay?`, `tracing.mode?: letters|pattern`.
- `render/builders/tracing.ts`: pattern-card mode (pattern RED, frame BLACK, silent letters GREY+halo) —
  one impl, mode switch. `vowel-wall.ts`: Level 1 wall untouched; L2/3 = the Pattern Tree (32-leaf data
  table). `book.ts`: level-aware kicker (THE SOUND / THE ENDING).
- `scripts/curriculum/validate-specs.mjs`: PATTERN-AWARE decodability — cumulative pattern registry W27–58,
  split-vce (magic-e), suffix stripping (doubling-collapse + e-restore), y-final, forbidden-before gates
  (soft c/g, tch/dge, igh, kn/wr/mb, tion), CAST-NAME exemption (capitalized only, decode-first ordering),
  POTATO GRADUATION DECREE (force-fail W27–57, exempt W58+, Level 1 grandfathered), 27 self-test fixtures
  (`--self-test`). Violations exit 1.
- `spec/index.ts`: weekToLessonMap extended W27–58; WEEK_LOADERS 27–58 wired (all 32 files exist).
- **Regression gate PASSED**: Level 1 HTML byte-identical (W4/W19/W26 × 10 materials, diffed pre/post),
  validator exit 0 on all of Level 1 unchanged, tsc + eslint clean.
- 🚨 Known validator limits (by design): it letter-sums what it can't know — it is necessary-not-sufficient;
  Fable's director read remains the semantic gate. GATE_EXEMPT (hard-g/heart list) needs upkeep — a missed
  hard-g word fails LOUD, never silent.

## Phase C — All 32 weeks authored, validator exit 0 on all 58
- Fable exemplars: **week-27.json (sh — The Fish on the Ship, Sheep debuts)** + **week-38.json (a_e —
  The Snake and the Cake, Snake's name-day, magic-e wand, pattern-card tracing debuts)**.
- 3 parallel Opus drafters: W28–37, W39–48, W49–58. All spine working titles kept; Suno style v2 +
  whole-words rule + potato bridge + 9-spread books + MJ house prompts throughout.
- **Fable director read of ALL 32 weeks' lyrics + book texts → 9 fixes applied** (the Level-1 precedent
  paid off again): W30+W31+W58 sound songs syllable-split words (Be-ll/Ki-ng/Cel-e-bra-tion — WHOLE-WORDS
  rule violations, now whole words) + W31 Ha-ng→HUNG stutter mismatch · W40 fake wand base "Pok→POKE" →
  "Glob→GLOBE" · W42 "(juh!)" schwa → "(like gem!)", and untaught "come" excised from book+song+backCover
  ("Cross, Snake! Cross, Chick!") · W33 "In the path?!" → "On the path?!" · W43 book "all day" removed
  ('all' = untaught /ɔːl/ family; sung-only is fine) · W49 "She put the bird…" → "The bird is under her
  shirt." (she/put untaught) · W52 contradictory spread → "The cow is in the house!"
- **Final gate: `validate-specs.mjs` exit 0 across ALL 58 weeks + 27/27 self-test fixtures.**

## 🚨 Rules learned/reaffirmed this session
- The WHOLE-WORDS rule is where Opus drafters slip most — 3 of 30 weeks syllable-split sung words.
  Director read is non-negotiable before production.
- Validator false-passes are real: "come"(o_e-shaped), "she"(letter-sum), "all"(a+ll) all passed the gate
  while being untaught heart words. STRICT text review must check PRONUNCIATION, not just patterns.
- W11's Level-1 book PRINTS "potato" (spread 9) — inconsistent with the potato ruling but produced/shipped;
  grandfathered in the validator. Tredoux's call whether to ever blank it (would need a W11 book re-render).
- Cast canonical looks now locked in specs: Sheep "fluffy round white sheep, kind dark eyes" · Chick "tiny
  fluffy yellow chick, stubby orange beak" · Snake "friendly emerald-green garden snake, large gentle amber
  eyes" · Bee "plump little honeybee, fuzzy gold-and-black stripes, round shiny wings" · Star "warm golden
  five-point star, serene sleepy face" · Owl "small round tawny owl, huge amber eyes".
- Drafter display convention: multi-pattern weeks carry the machine token in `sound` (registry-matched) and
  the human label in `patternDisplay` (e.g. W42 sound "ce", patternDisplay "soft c/g · tch/dge"; W49 "er" /
  "er / ir / ur"). W50 = sound "review", soundType "vowel" (no review enum value — accepted).

## Commits (pushed via Desktop Commander)
- `106bc694` — pre-director-read checkpoint (spine + engine + all 32 specs + loaders).
- (this session's final commit) — director-read fixes ×9 + handoff + CLAUDE.md.

## ⏳ Owed / next session
1. **Phase D production** — the proven overnight loops (`OVERNIGHT_RUN_JUL11.md` runbook): ~640 MJ images
   (`build-week.mjs --gap-only` prompts), 128 Suno tracks (2 takes each; 1,590 credits may not cover all —
   check), packs render. **GATED on disk cleanup: Mac had 1.7 GiB free Jul 11; needs 10+ GB.**
2. Level 1 morning-review items still open (Suno take picks, W9 lyric reconciliation, coloring rerolls,
   hero-word coloring gaps — see OVERNIGHT_RUN_JUL11.md checklist).
3. Phase E Montree wiring (all 3 levels together) — queued per PLAN_CURRICULUM_STUDIO_JUL10 §8.
4. Tredoux eyeball: Pattern Tree wall render + pattern-card tracing with a real W38 pack (engine tested
   with synthetic specs only — visual design unproven against real content).
5. Housekeeping via Desktop Commander (sandbox can't unlink): delete `tsconfig.scope-l23.tmp.json` +
   `_tmp_emit_html.mjs`, `_tmp_l23.mjs`, `_tmp_inspect.mjs` (0-byte truncated) at repo root.
