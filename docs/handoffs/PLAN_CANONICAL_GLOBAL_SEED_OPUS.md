# MASTER PLAN — Canonical Global Seed, End-to-End in One Opus Session

**Date:** 3 July 2026
**Written by:** Fable (planning) — for **Opus to execute start-to-finish in one session**
**Design record:** `docs/handoffs/CANONICAL_GLOBAL_SEED_HANDOFF.md` (the Opus↔Tredoux design conversation)
**Format sample:** `docs/handoffs/curated-visual-memory-SAMPLE.json` (5 authored entries — the approved shape)
**Prerequisite reading:** `docs/handoffs/SESSION_MASTER_BRAIN_BUILD_JUL3.md` (the Jul 3 build this sits on)

---

## 0. Mission in one paragraph

Replace the Whale-classroom-biased rows in `montree_global_visual_memory` with **Opus-authored, spec-grounded, discriminative checklists** for every standard Montessori work — positives ("LOOKS LIKE") plus mutual negatives ("NOT its look-alike") — so a brand-new school identifies standard materials correctly on day one. Author a hard-case batch first, wire it, seed it, **measure it against the real Bright Stars failure**, and only scale to all ~270 works if the measurement says the lever works. Web images are used **only as verification while authoring** — the stored artifact is text; the runtime app never touches the internet; no photos are stored anywhere.

**Runtime invariant (do not violate):** zero changes to the live photo pipeline's models or logic beyond what this plan specifies. Classroom photos remain **Haiku** (Pass 1 / Pass 2 / Pass 2b) at ~$0.006/photo. This project changes seed DATA and the seed script, plus a small candidate-precedence tweak — not the runtime cost profile.

---

## 1. The success gate (decide before you build)

The single measured checkpoint: **the Bright Stars cold-start failure.** On Jul 3 a standard Cylinder Block photo on a zero-moat classroom was tagged **Spindle Boxes** at ~0.85 confidence.

- **PASS** = with the new seed, the same photo on a cold classroom context resolves to Cylinder Block (any of blocks 1–4 acceptable; the family is correct) in ≥2 of 3 harness runs, AND no previously-correct control works regress.
- **FAIL** = it still says Spindle Boxes (or another wrong work) in ≥2 of 3 runs.

**On PASS → proceed to Phase 5 (scale to ~270).**
**On FAIL → STOP. Do not author the remaining works.** Write up findings (the bottleneck is Pass 2b arbitration quality/firing, not description quality) and hand back. Nothing is lost: batch 1 stays seeded (it's still strictly better data), and we redirect effort.

---

## 2. Ground truth — verified file map (read these in Phase 0)

| Thing | Where | Notes |
|---|---|---|
| Global table | `migrations/281_global_visual_memory.sql` | Already RUN on prod. `work_key` UNIQUE, ~235 rows seeded from Whale. RLS deny-all, runtime read-only. |
| Seed script | `scripts/seed-global-visual-memory.mjs` | Idempotent `ON CONFLICT (work_key) DO UPDATE`, has `--dry-run`. Contains inline `CURATED_ENTRIES` (~8) + `CURATED_NEGATIVES` map + `DESC_CAP = 900` + canonical work_key guard + roster-name scrub. |
| Curriculum source of truth | `lib/curriculum/data/{practical-life,sensorial,math,language,cultural}.json` | Works are **nested inside category sections** — `work.id` is the canonical `work_key` (e.g. `se_cylinder_block_1`). Use `lib/montree/curriculum-loader.ts` → `loadAllCurriculumWorks()` or walk the JSON the same way the seed script already does. ~270 standard works total. |
| Pipeline | `lib/montree/photo-identification/two-pass.ts` + `context-loader.ts` | Pass 2 prompt renders global rows as `LIBRARY-VERIFIED WORKS` block (LOOKS LIKE / KEY MATERIALS / DISTINGUISH FROM). Pass 2b candidates via `buildPass2bCandidates()`. Shared 20KB budget, discriminator-carrying entries packed first, classroom-present works deduped out of global block. **Keep both prompt-cache breakpoints intact.** |
| Confusion registry | `lib/montree/work-matching.ts` | `CROSS_AREA_CONFUSION_WORK_NAMES` + `CROSS_AREA_CONFUSION_COUNTERPARTS`. Cross-area pairs ONLY. |
| Telemetry | `montree_pipeline_telemetry` | Columns `has_global_vm_for_match`, `global_vm_injected_count` (from 281) + `pass2bFired`/`pass2bImproved` in GateA logs. |
| Prod DB access | Pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`, user `postgres.dmfncjjtsoxrnvcdnvjq`, password from `.env.local`, via repo `node_modules/pg`. Direct db host is dead; Supabase REST also works with service key. |
| Push | Desktop Commander: `cd ~/Desktop/Master\ Brain/ACTIVE/whale && git push origin main` (rm `.git/index.lock` first if sandbox lock errors). |

---

## 3. Locked rules (non-negotiable — from the Jul 3 privacy contract + design conversation)

1. **Text-only artifact.** No photos stored in any table, any repo folder, anywhere. Web images are looked at during authoring and discarded.
2. **Global VM NEVER satisfies Gate A Path 1.** `hasVisualMemoryForMatch` stays classroom-only. Global is a Pass 2 hint + Pass 2b candidate source, never an auto-file authority.
3. **Runtime read-only global table.** No school writes to it. The seed script remains the only writer.
4. **No pipeline model changes.** Haiku stays the runtime model on all three passes.
5. **The 20KB Pass 2 budget is SHARED** (classroom first, global fills remainder). Never additive. Keep both cache breakpoints.
6. **No child names, classroom names, or photo URLs** in any authored or seeded text (the existing roster-name scrub stays in the script).
7. **Registering a new cross-area confusion pair = the full 4-step rule:** Set + counterpart map (both directions) + curated negatives on both sides + re-run seed.

---

## 4. Resolved design decisions (Fable's calls — do not re-litigate, just build)

1. **Precedence flip:** for any work_key present in the curated data files, curated **fully replaces** the Whale `visual_description` (do NOT append Whale via ` || ` — that re-imports the bias being removed). Whale-sourced `negative_descriptions` ARE merged in (existing 60-char-prefix dedupe, cap 50). Whale rows remain the source for work_keys NOT yet curated. `source` column: `'curated'` for authored rows.
2. **Data home:** `scripts/data/curated-visual-memory/{practical-life,sensorial,math,language,cultural}.json` — one file per area, same entry shape as the sample. The seed script imports all five, validates every `work_key` against the canonical curriculum map, and hard-fails on any unknown key. Migrate the existing inline `CURATED_ENTRIES` (~8 works) and `CURATED_NEGATIVES` into these files, then delete the inline arrays.
3. **Confusion registry stays cross-area-only.** Same-area look-alikes (Color Boxes, Knobbed vs Knobless Cylinders, Pink Tower vs Brown Stair, Binomial vs Trinomial Cube) are handled by authored mutual negatives + the existing same-area Pass 2b candidate fill. Adding same-area pairs to the registry would fire Pass 2b on confident matches → cost regression. **One new cross-area pair to register** (full 4-step rule): **Sandpaper Letters (language) ↔ Sandpaper Numerals (math).**
4. **Confidence:** curated rows = `0.95`, EXCEPT Practical Life = `0.85` (PL works aren't manufactured to spec — a pouring tray varies per classroom; author PL checklists around *functional signature*, not exact materials). Confidence drives prompt-packing order, so 0.95 naturally outranks Whale rows — precedence is enforced twice.
5. **Scope:** all ~270 standard works, in this order: batch 1 (below) → sensorial + math → language → cultural → practical life last.
6. **Whale is not deleted.** Its rows are overwritten per-key by the upsert where curated exists; where curated doesn't exist they stand. Provenance survives in `source`.

---

## 5. Phase plan (run in order; audit between phases)

### Phase 0 — Verify environment (~15 min)
- Read every file in §2. Confirm the seed script's current source precedence, `DESC_CAP`, canonical guard, and negatives-merge behaviour match this plan's description. If anything diverges, adapt the plan to reality — the CODE is ground truth.
- Confirm prod DB reachable via pooler. Confirm `montree_global_visual_memory` row count (~235) and that `is_active=true`.
- Locate the Bright Stars mis-tagged media row: classroom = Bright Stars (Sarah's school, seeded Jul 3), the Cylinder Block photo whose `sonnet_draft` said Spindle Boxes at ~0.85. Grab its `id`, storage path, and `sonnet_draft` JSON. **If the photo can't be found, flag it and use any teacher-confirmed Whale Cylinder Block photo as the test image instead (note the substitution in the report).**

### Phase 1 — Author batch 1 (~20 works)
Author curated entries in the sample's exact field shape (`work_key`, `work_name`, `area`, `visual_description` <900 chars, `key_materials[]`, `negative_descriptions[]`). Resolve exact `work_key`s from the curriculum JSON — names below are indicative:

**Confusion clusters (the point of batch 1):**
- Cylinder Blocks 1, 2, 3, 4 (sensorial — author all four with their distinct grading dimensions) ↔ Spindle Boxes (math)
- Red Rods (sensorial) ↔ Number Rods (math)
- Pink Tower ↔ Brown Stair (sensorial, same-area pair — mutual negatives)
- Knobless Cylinders (sensorial — vs Cylinder Blocks AND vs Pink Tower)
- Color Box 1, 2, 3 (sensorial — mutual negatives across the three)
- Sandpaper Letters (language) ↔ Sandpaper Numerals (math) — also register as cross-area pair per §4.3
- Moveable Alphabet (language — vs Sandpaper Letters)
- Metal Insets (language) ↔ Geometric Cabinet (sensorial)
- Binomial Cube ↔ Trinomial Cube (sensorial, mutual)

**Distinctive anchors (controls — should already work; must not regress):**
- Golden Beads / Introduction to Golden Beads (math)

The 5 sample entries (`docs/handoffs/curated-visual-memory-SAMPLE.json`) are pre-approved — refine if needed, reuse otherwise.

**Authoring method:** write from the manufactured spec you know (these are standardized materials). Where a work is genuinely ambiguous or has manufacturer variants worth capturing, verify against web reference images (search, look, close the tab — store nothing). Flag any work where you genuinely can't author confidently rather than guessing; flagged works get skipped, not invented.

**Authoring rules:**
- Every negative is **mutual**: if A says "NOT B: …", B must say "NOT A: …". The validator (Phase 2) enforces this.
- Negatives lead with the literal string `NOT <Work Name>:` so the validator can parse them.
- Describe what a **photo** shows — mid-work states included (cylinders lined up beside the block, spindles bundled), not just the catalog pose.
- No numerals/colour/count claims that vary by manufacturer unless truly universal.

### Phase 2 — Wiring (code, ~1-2 h)
1. Create `scripts/data/curated-visual-memory/*.json` (five files); move the inline `CURATED_ENTRIES` + `CURATED_NEGATIVES` content into them; add batch 1.
2. Modify `scripts/seed-global-visual-memory.mjs`: import the data files; **flip precedence** per §4.1; set per-area confidence per §4.4; keep idempotency, `--dry-run`, canonical guard, scrub, and negatives dedupe exactly as they are.
3. **New validator** `scripts/validate-curated-visual-memory.mjs`: checks (a) every work_key resolves against the canonical curriculum map, (b) `visual_description` ≤900 chars and non-empty, (c) every `NOT <Name>:` negative is mutual — the named counterpart exists in the curated set (or is explicitly whitelisted as one-directional with a comment), (d) no duplicate work_keys across files, (e) no roster-name hits. Exit non-zero on any failure. Wire it as a mandatory step inside the seed script (refuse to seed if validation fails).
4. Register Sandpaper Letters ↔ Sandpaper Numerals in `lib/montree/work-matching.ts` (Set + counterpart map both directions).
5. **New re-test harness** `scripts/retest-cold-start.mjs`: takes a media id (or image path) + a synthetic COLD classroom context (empty classroom visual memory, full global VM, standard curriculum), runs the real two-pass pipeline functions directly (import from `lib/montree/photo-identification/`), prints work name / confidence / pass2bFired / pass2bImproved / gvmInjected per run. Model calls are live Haiku — cost is cents. Pattern-match the Jul 3 logic harness for how to drive `two-pass.ts` outside a request.
6. Lint (`--max-warnings=0`) + scoped tsc on everything touched.

### Phase 3 — Seed
1. `node scripts/validate-curated-visual-memory.mjs` → must pass.
2. `node scripts/seed-global-visual-memory.mjs --dry-run` → review the upsert report: batch-1 keys show `source='curated'`, non-authored keys untouched, no rejected keys.
3. Seed prod. Verify via SQL: row count, `SELECT work_key, source, description_confidence FROM montree_global_visual_memory WHERE source='curated'` matches batch 1 + migrated inline entries.

### Phase 4 — MEASURE (the gate)
1. **Before-state:** you can't easily un-seed, so capture the before-state FIRST — run the harness 3× against the Bright Stars photo BEFORE Phase 3's prod seed (global VM as-is = whale rows). Record results.
2. After seeding: run the harness 3× on the same photo. Record.
3. **Regression sniff:** run the harness on 2-3 distinctive-work photos from Whale's confirmed media (e.g. a Pink Tower, a Golden Beads) — before and after. They must stay correct.
4. Apply the §1 gate. **PASS → Phase 5. FAIL → STOP and report.**
5. Optional human check: Tredoux does a fresh capture on the Bright Stars account from his phone.

### Phase 5 — Scale (only on PASS)
1. Author the remaining ~250 works, area by area (§4.5 order), same rules. Batch the authoring (25-40 works per pass) and run the validator after each batch — mutual-negative symmetry gets harder as the set grows; the validator is what keeps 270 entries coherent.
2. For every same-area look-alike family encountered, write mutual negatives across the whole family.
3. PL entries: functional-signature descriptions, confidence 0.85, and skip-with-flag anything that's genuinely too classroom-variable to describe (better absent than wrong).
4. Validate → dry-run → seed prod → re-run the Phase 4 harness suite one final time (Bright Stars + controls) to confirm no regression at full scale.
5. Verify prompt-budget behaviour: with 270 curated rows the context loader's 20KB/40-entry cap does the selection — confirm confusion-pair entries still pack first (they carry negatives, which the loader prioritises).

### Phase 6 — Close out
- Commit(s) with clear messages; push via Desktop Commander.
- Update `CLAUDE.md` session block + write `docs/handoffs/SESSION_CANONICAL_SEED_<date>.md` with: before/after harness numbers, gate verdict, row counts, any flagged/skipped works, and the rollback state.
- Report back to Tredoux in chat: the measurement table, plain-language verdict, anything owed (e.g. phone verification).

---

## 6. Rollback

- Instant kill: `UPDATE montree_global_visual_memory SET is_active = false;` → pipeline degrades gracefully to pre-Jul-3 behaviour (classroom-moat only).
- Data revert: the seed script is idempotent — check out the pre-change script from git and re-run it to restore Whale-primary rows.
- No migrations in this plan; schema untouched.

---

## 7. Audit requirements (Opus, hold yourself to this)

- Audit after Phase 2 (wiring) and after Phase 5 (full data): re-read diffs, run validator + lint + scoped tsc, verify the seed script's precedence logic against §4.1 by tracing one authored key and one non-authored key through it.
- The harness numbers are the deliverable. Do not declare success from lint. **A green lint is not a working feature** (standing rule, Jun 14).
- If ANY step reveals the plan diverges from code reality, adapt and note the divergence in the handoff — don't force the plan onto the code.

---

## 8. What "done" looks like

~270 `source='curated'` rows live in `montree_global_visual_memory`, validator green, Bright Stars cold-start harness flipped to Cylinder Block, controls unregressed, Whale unaffected (`gvmInjected:0` there — its own moat fills the budget), everything committed + pushed + documented. New schools start warm.
