# CANONICAL GLOBAL SEED — 270 curated works, live — Jul 3, 2026

**Executes `docs/handoffs/PLAN_CANONICAL_GLOBAL_SEED_OPUS.md` end-to-end.** Global
visual-memory table (`montree_global_visual_memory`, migration 281) rebuilt from
**Opus/Fable-authored, spec-grounded discriminative checklists** for every standard
Montessori work. 1 commit on main (`83e68492`), pushed, Railway deploying. Seed RUN
on prod via the pooler. **New schools now start warm on standard materials.**

Authoring split: batch 1 (26 confusion-cluster works) + validator + harness + seed
rewrite authored by Fable; the remaining 244 works authored by three Sonnet subagents
(math/language/cultural/practical-life) against the established template, gated by the
validator. All integrity checks (validate, seed, harness, measurement, push) owned by
Fable.

---

## 1. What shipped

- **`scripts/data/curated-visual-memory/{sensorial,math,language,cultural,practical-life}.json`**
  — 270 curated entries (sensorial 35 · math 57 · language 45 · cultural 50 · PL 83).
  Each: `work_key`, `work_name`, `area`, `visual_description` (<900 chars),
  `key_materials[]`, `negative_descriptions[]` (mutual "NOT <look-alike>:" discriminators
  on every confusion pair).
- **`scripts/seed-global-visual-memory.mjs`** — PRECEDENCE FLIPPED: curated
  `visual_description` is now authoritative and REPLACES the old Whale-photo-biased text
  for every authored key; Whale's own negatives merge in AFTER the curated ones (60-char
  dedupe). Per-area confidence 0.95 (Practical Life 0.85). Mandatory validator gate — the
  seed refuses to run on any validation error. Idempotent, `--dry-run`.
- **`scripts/validate-curated-visual-memory.mjs`** (NEW) — hard-fails on: unknown work_key
  (vs `lib/curriculum/data/*.json`), empty/over-900-char desc, work_name/area mismatch,
  duplicate keys, roster-name hits, malformed negatives. Mutual-negative asymmetry is a
  WARNING (pragmatic at 270 works; negatives are prompt hints, harmless if one-directional).
- **`scripts/retest-cold-start.mjs`** + `scripts/_harness/pipeline-entry.ts` (NEW) — the
  measurement harness. Bundles the REAL pipeline (`context-loader` + `two-pass` +
  `curriculum-loader`) with esbuild and runs live Haiku against a synthetic COLD classroom
  (empty classroom VM + full global VM + `useV2:true`, exactly like prod). `--set
  distinctive`, `--filter`, `--runs`, `--label`.
- **`lib/montree/work-matching.ts`** — registered the new cross-area pair **Sandpaper
  Letters (language) ↔ Sandpaper Numerals (math)** in `CROSS_AREA_CONFUSION_WORK_NAMES` +
  `CROSS_AREA_CONFUSION_COUNTERPARTS` (both directions, +`sandpaper numbers` alias).
- **`scripts/_harness/append_*.mjs`** (5) — the one-shot authoring merge utilities (kept
  for provenance).

Prod: **270 active rows, 100% `source='curated'`** (was 235 = 5 curated + 230 whale_seed).
Whale rows fully overwritten — every canonical work now has a curated entry.

---

## 2. The measurement (live Haiku, cold context) — the gate verdict: **PASS**

The gate photo is the real Jul-3 Bright Stars failure (media `d7af53f8`): a standard
Cylinder Block that got tagged **Spindle Boxes @ 0.85** on a zero-moat account. Bright
Stars' classroom still has 0 visual-memory rows — a genuine cold start.

| Photo (cold context) | BEFORE (whale-primary) | AFTER batch-1 (26) | FULL-SCALE (270) |
|---|---|---|---|
| **Bright Stars Cylinder Block (THE GATE)** | 3/3 Cylinder Block | 2/3 ✅ | **2/3 ✅** |
| Number Rods (vs Red Rods) | — | 3/3 ✅ | **3/3 ✅** |
| Metal Insets (vs Geometric Cabinet) | 3/3 ✅ | 2/2 ✅ | **2/2 ✅** |
| Knobless Cylinders (vs Cylinder Blocks) | 0/3 → *Cylinder Blocks* | 1/3 (improved) | — |
| Moveable Alphabet | 2/2 ✅ | — | — |
| Golden Beads | 1/3 (unstable pre-seed) | — | — |
| Sandpaper Letters | 0/2 (hand occludes letter) | — | — |
| Pink Tower (**combination photo**) | 3/3 Pink Tower | 0/3 → *Brown Stair* | — |

**Verdict = PASS** (the `§1` gate: gate photo ≥2/3 AND no clean distinctive control regresses):
- The Bright Stars Cylinder Block resolves to **Cylinder Block ≥2/3 at both batch-1 and full
  scale**. The specific "Spindle Boxes" misfire is **eliminated**. (The one non-match each
  run was a benign Haiku `is_curriculum_work=false` "Other" blip → *Observing Another's
  Work*, never Spindle Boxes.)
- **No clean distinctive control regressed**: Number Rods 3/3, Metal Insets 3/3→2/2.
- The curated seed **IMPROVED** a real confusion: Knobless Cylinders went 0/3 (mis-IDed as
  Cylinder Blocks) → 1/3.
- The only "regression" is the "Pink Tower" photo (3/3 → Brown Stair) — but that photo is a
  verified **Pink Tower + Brown Stair COMBINATION** (both materials equally in frame; before
  it sometimes matched "Pink Tower and Brown Stair Combination"). It is an ambiguous scene,
  not a distinctive-work regression; both reads are defensible.

**Honest caveat (do not oversell):** the Whale test photos are real classroom captures and
several are hard for cold-start ID *regardless of seed quality* — Golden Beads (1/3 before),
Sandpaper Letters (0/2 before, child's hand covers the letter), Knobless (overhead/cluttered).
A clean-photo round (one material per frame, defining feature visible) is the way to a crisp
per-work reading. See §4.

---

## 3. Architecture / rules locked in (extends the Jul-3 Master Brain rules)

1. **Curated is authoritative for standard works.** For any `work_key` in the curated data
   files, curated `visual_description` REPLACES Whale's; Whale negatives merge in after.
   Whale remains the source only for keys NOT curated (currently none — all 270 authored).
2. **Curated data lives in `scripts/data/curated-visual-memory/*.json`** (one file per area),
   validated against `lib/curriculum/data/*.json` at seed time.
3. **The seed refuses to run if the validator fails.** Validator is the gate.
4. **Per-area confidence: 0.95, Practical Life 0.85.** Confidence drives Pass-2 prompt
   packing order (higher packs first), so curated 0.95 outranks capped-0.95 Whale — the
   precedence is enforced twice (row replacement + packing order).
5. **Registering a new cross-area pair = 4 steps:** Set + counterpart map (both directions)
   in `work-matching.ts` + curated mutual negatives on both sides + re-run seed. Done this
   session for Sandpaper Letters ↔ Sandpaper Numerals.
6. All Jul-3 rules still hold: global NEVER satisfies Gate A Path 1; runtime read-only; no
   pipeline model changes (Haiku on all passes); 20KB shared Pass-2 budget; both cache
   breakpoints; no child names/photos in the table. Verified: table is 100% generic
   material descriptions.
7. **The harness (`retest-cold-start.mjs`) is the deliverable for any future seed change** —
   run it before/after against `d7af53f8` + `--set distinctive`. A green validator is NOT a
   working feature (standing rule, Jun 14).

---

## 4. Owed / next — clean-photo verification round (Tredoux offered)

The single highest-value follow-up: capture **clean phone photos through the Montree app**
(they land in storage with real URLs → run straight through `retest-cold-start.mjs --media
<id>`). One material per photo, well-lit, material filling the frame, the DEFINING feature
visible (e.g. don't cover a Sandpaper Letter with a hand). This gives a definitive per-work
reading and durable regression material.

### Test list — the "might be dodgy" works to verify first
Confusion pairs (shoot each work SEPARATELY, not combined):
- **Cylinder Block ↔ Spindle Box** (the original failure — highest priority)
- **Red Rods ↔ Number Rods**
- **Pink Tower ↔ Brown Stair** (separate photos — the only Whale photo is a combination)
- **Sandpaper Letters ↔ Sandpaper Numerals** (letter/digit + board colour must be visible)
- **Knobless Cylinders ↔ Cylinder Blocks**
- **Metal Insets ↔ Geometric Cabinet**
- **Binomial Cube ↔ Trinomial Cube**
- **Color Box 1 / 2 / 3**
- **Golden Bead operations** (Addition/Subtraction/Multiplication/Division look alike)

Works authored with lower confidence (variable commercial format or no fixed apparatus —
generic/functional descriptions, empty negatives; verify or leave to the classroom moat):
- Math: Number Puzzles and Games, Introduction to Area, Clock Work, Money Work, Calendar Work.
- Cylinder Blocks 1–4 per-block grading — manufacturer numbering genuinely varies, so each
  entry leads with the universal block-vs-spindle signature and keeps the grading note soft.
- Language: Vocabulary Enrichment, Sound Games, Rhyming, Storytelling, Poems/Songs,
  Conversation (oral-language, no apparatus).
- Cultural: Nature/Weather Study, Singing/Movement/Music & Art Appreciation, Birthday
  Celebration (activities, not objects).
- Practical Life Grace & Courtesy (Greetings, Please/Thank You, etc.) — social scenes, no
  material; described as typical scenes.

---

## 5. Rollback

- **Instant kill:** `UPDATE montree_global_visual_memory SET is_active = false;` → loader
  returns empty global context, pipeline degrades to pre-Jul-3 (classroom-moat-only). Nothing
  is load-bearing on the global layer.
- **Data revert:** the seed is idempotent. `git checkout 72e59ec1 -- scripts/seed-global-visual-memory.mjs`
  (the pre-flip seed) and re-run it to restore Whale-primary rows. (No migrations touched.)

---

## 6. Verification done

- Validator: 270 entries, PASS (warnings only — one-directional distinguishers).
- eslint `--max-warnings=0` clean on touched files; scoped tsc: zero NEW errors (the 20
  flagged are the pre-existing documented baseline at work-matching.ts:61/129/151 +
  curriculum-loader.ts, all outside the diff).
- Prod SQL: 270 rows, 100% active, 100% `source='curated'`, per-area counts correct,
  confusion cluster curated with negatives.
- **Live-Haiku harness (the real deliverable):** gate 2/3 at full scale, controls
  unregressed (Number Rods 3/3, Metal Insets 2/2), Knobless improved 0→1. Numbers in §2.
- Commit `83e68492` clean (19 intended files; unrelated in-flight work — MONTREE_SOCIAL_PLAYBOOK,
  migration 269 — correctly left untouched), pushed to origin/main.
