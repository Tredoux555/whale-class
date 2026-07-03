# MASTER BRAIN v1 BUILT + PHOTO-ID COLD-START FIXED — Jul 3, 2026 (Fable)

**Answers `SESSION_PHOTO_ID_COLDSTART_AUDIT_JUL3.md` (Tasks A + B). Designed AND built
by Fable in one session.** Migration 281 RUN on prod via the pooler. Global moat SEEDED
(235 rows). All code shipped. The Bright Stars Cylinder-Block-as-Spindle-Boxes failure
class is closed at three independent layers.

---

## 1. Design verdicts (Task A review — read these before touching the gates)

- **Gate A is correctly strict — do NOT loosen it.** The Bright Stars photo failed
  Path 2 by 0.05 (conf 0.85 < 0.90) — and Pass 2 was WRONG (Spindle Boxes for a
  Cylinder Block at matchScore 1.0). Had the bar been 0.85, a false observation would
  have been auto-filed into a new customer's records. The audit doc's "one hundredth
  short" framing was backwards: the gate saved them. `EXACT_FIRST_SIGHT_CONFIDENCE=0.90`
  and `HAIKU_TRUST_CONFIDENCE=0.85` stay.
- **The real structural defect was Pass 2b's candidate source.** The one stage that can
  arbitrate look-alikes (it re-examines the IMAGE) built candidates exclusively by
  parsing the CLASSROOM visual-memory prompt text — the fallback discriminator was
  gated on the very asset whose absence it should compensate for. Zero VM → <2
  candidates → Pass 2b never ran. Fixed (see §2).
- **Master brain v1 is a CURATED READ-ONLY seed, not a live cross-school pool.**
  Standard Montessori materials are standardized by design; the global layer only needs
  to cover the static baseline. No runtime writes from any school → the poison/abuse
  vector doesn't exist; privacy collapses to one curated extraction of our own
  classroom's data (roster-scrubbed, zero name hits found, photo URLs NOT copied).
  Consensus gating / reputation math / embeddings are a v2 that may never be needed —
  the per-classroom moat already handles ongoing learning.
- **Global NEVER auto-files (v1).** `hasVisualMemoryForMatch` stays CLASSROOM-only, so
  Gate A Path 1 cannot fire off the global baseline. Global improves Pass 2 drafts and
  powers Pass 2b arbitration. New telemetry (`has_global_vm_for_match`,
  `global_vm_injected_count` — GateA log + `montree_pipeline_telemetry`) accumulates
  the evidence to decide later whether a "global VM + conf ≥ 0.90" Path 1.5 is safe.

## 2. What shipped

### DB (both RUN on prod via pooler)
- **`migrations/281_global_visual_memory.sql`** — `montree_global_visual_memory`
  (UNIQUE work_key, canonical work_name, area, visual_description, key_materials[],
  negative_descriptions[], source whale_seed|curated, source_classroom_id no-FK
  provenance, description_confidence, is_active) + partial index + RLS deny-all +
  2 telemetry columns on `montree_pipeline_telemetry`.
- **`scripts/seed-global-visual-memory.mjs`** — RUN: **235 active rows** = 230 Whale
  Class teacher-validated standard-work entries (conf ≥0.80, `custom_%` keys excluded,
  roster-name scrub, 900-char cap at fingerprint/sentence boundary, canonical names
  re-anchored to the static curriculum JSONs) + 5 hand-authored entries (Knobless
  Cylinders, Sandpaper Numerals, Color Boxes 1+2, Golden Beads intro, Sound Boxes,
  Touch Tablets, Cards & Counters — gap-fill only, Whale wins on conflict) + curated
  `NOT <counterpart>` discriminator negatives merged onto every registered confusion
  pair. Idempotent, chunked batch upserts, `--dry-run` supported.

### Code (6 files)
- **`context-loader.ts`** — loads the global moat (3rd parallel query, soft-fails if
  table missing). Products: `globalVisualMemoryEntries` (FULL structured set → Pass 2b)
  + `globalVisualMemoryContext` (LIBRARY-VERIFIED WORKS prompt block, fills whatever
  CHAR BUDGET the classroom block leaves over, discriminator-carrying entries first).
  **Natural decay:** cold classroom ≈ full 20KB of baseline; mature classroom ≈ 0 extra
  (verified live: Bright Stars 26 entries/20.2KB injected, Whale 0). New
  `hasGlobalVisualMemoryFor()`; `hasVisualMemoryFor()` documented CLASSROOM-only.
- **`two-pass.ts`** — `buildPass2bCandidates` rewritten with global tiers: P1 matched
  work (classroom wins, global fallback) → P2 **cross-area counterparts** → P3/P4
  classroom same/other-area → P5 matcher topCandidates via global → P6 same-area global
  fill. Pass 2 dynamic block appends the global context + gets a **second cache
  breakpoint** (capture bursts read the ~5K-token suffix at ~10% price from photo 2 on).
  `hasGlobalVisualMemoryForMatch` on TwoPassResult. Dead `PASS2B_NO_VM_THRESHOLD`
  removed; pre-existing missing-fields type bug in the no-anthropic early return fixed.
- **`work-matching.ts`** — **Cylinder Blocks ↔ Spindle Boxes registered** in
  `CROSS_AREA_CONFUSION_WORK_NAMES` (+ 'red rods (long rods)' canonical alias). New
  `CROSS_AREA_CONFUSION_COUNTERPARTS` map + `getCrossAreaCounterparts()` so Pass 2b
  injects the OTHER side of a pair as explicit candidates (same-area fill can never
  surface a cross-area counterpart — that was the second structural gap).
- **`visual-id-guide.ts`** — CYLINDER BLOCKS vs SPINDLE BOXES discriminator added to
  the top MOST-COMMON-CONFUSIONS block + a Mathematics cross-reference.
- **`sonnet-draft.ts`** — locale bug fixed (hardcoded zh/es map → `getAILanguageInstruction`,
  9 locales were silently getting English drafts); global context appended; second cache
  breakpoint (Sonnet $3/MTok input — burst savings are large).
- **`process/route.ts`** — GateA log + both telemetry inserts carry
  `global_vm_injected_count` / `has_global_vm_for_match`. **Gate A logic unchanged.**

## 3. How the Bright Stars failure is now closed (3 layers)
1. **Pass 2 prompt**: cold classrooms get ~26 LIBRARY-VERIFIED entries incl. Spindle
   Boxes + Cylinder Blocks with explicit NOT-each-other discriminators → the misID
   likely never happens.
2. **Pass 2b arbitration**: if Pass 2 still says Spindle Boxes, the confusion registry
   forces Pass 2b, which now receives exactly [Spindle Boxes, Cylinder Block 1-4] with
   the image in hand (harness-verified — this precise scenario, 15/15 assertions).
3. **Teacher review**: Gate A still refuses to auto-file (no classroom VM, conf <0.90)
   → worst case is a DRAFT with the right work one tap away, and the correction seeds
   the classroom moat as before.

Cost note: cold classrooms now fire Pass 2b on most photos (+1 Haiku vision call,
~$0.002) — intentional; decays automatically as the classroom moat grows. Partially
offset by the two new cache breakpoints.

## 4. Verification done
- eslint `--max-warnings=0` clean on all 6 code files + seed script.
- Scoped tsc: zero errors in touched files (4 flagged errors are pre-existing at
  work-matching.ts:61/129/151 + sonnet-review:105 — all outside the diff, confirmed
  via `git diff -U0`).
- Logic harness (esbuild-bundled, run on the Mac): 15/15 assertions across cold-start,
  counterpart injection, classroom-wins-over-global, cap/dedupe, empty-context safety,
  same-area fill.
- LIVE loader run against prod: Bright Stars ctx = 0 classroom + 26 global (20,189
  chars, spindle + cylinder both present); Whale = 32 classroom + 0 global.
- DB: 235 active global rows; confusion-cluster rows carry curated negatives.

## 5. Still needs a phone (cannot be done from the sandbox)
1. **Hard-refresh Wrap Up on Bright Stars** → the existing photo's "Spindle Boxes ·
   85%" chip should render (stale-client theory from the audit doc §1) → tap ✏️ Wrong →
   "Cylinder Block 1" (seeds classroom moat). If NO chip after hard refresh → chase the
   `isPhotoInFlight` display bug.
2. **Capture a fresh Cylinder Block photo on Bright Stars** after Railway deploys →
   expect correct ID (grep Railway `[PhotoIdentification] GateA` for
   `hasGlobalVM:true`, `gvmInjected:26`, `pass2bFired`).
3. Whale Class regression sniff: capture any photo, confirm normal behavior
   (`gvmInjected:0`, unchanged outcomes).

## 5b. Privacy posture — plain answers (Tredoux raised this Jul 3; keep these TRUE)

Tredoux's exact fear: *"are schools sharing my data? Is there any chance of cross
contamination from my class? This would kill my app dead in the water."* The answers
below are the contract. Any change that makes one of them false needs an explicit
design review first.

1. **What the global table contains:** 235 descriptions of STANDARD Montessori
   MATERIALS ("ten pink graduated cubes stacked as a tower"). NO photos, NO child
   names, NO teacher notes, NO classroom names, NO observations. Audited pre-seed:
   zero roster-name hits + defensive scrub + photo URLs deliberately not copied.
   Equivalent in kind to the VISUAL_ID_GUIDE that already ships in every school's
   prompt — product content, not customer data.
2. **Whose data:** Whale Class's own (Tredoux's classroom), curated ONCE by the seed
   script. No other school contributed anything and no other school CAN — the table
   is runtime-read-only. There is no code path where any school's activity writes
   into it.
3. **No poison vector:** a school elsewhere confirming photos WRONG affects only its
   own private classroom moat. It can never contaminate the global pool or any other
   school's matching. (This is exactly why v1 rejected the audit doc's live
   cross-school learning pool.)
4. **No contamination INTO Whale Class:** verified live — Whale's own moat fills the
   entire prompt budget, global injects ZERO entries there. Whale behavior unchanged.
5. **Kill switch:** `UPDATE montree_global_visual_memory SET is_active = false;` —
   loader returns empty global context and the whole system degrades gracefully to
   pre-Jul-3 behavior. Nothing is load-bearing on the global layer.

## 6. Future (deliberately NOT built)
- **Path 1.5** (global VM + conf ≥0.90 auto-file) — decide from telemetry after ~2
  weeks of new-school data.
- **v2 cross-school learning** (consensus-gated promotion from teacher-confirmed
  corrections into the global pool) — needs the poison/privacy design the audit doc
  sketched; only worth it if the curated baseline proves insufficient.
- Re-seed cadence: re-run the seed script occasionally as Whale's moat improves
  (idempotent; curated negatives are preserved by the merge).
- Onboarding copy nudge: "Teach the AI" (classroom-setup) remains the active
  complement to the passive global baseline.

## 🚨 Architectural rules locked in
1. `montree_global_visual_memory` is READ-ONLY at runtime — the seed script is the
   only writer. Never wire a runtime write path without a v2 poison/privacy design.
2. Global entries NEVER satisfy Gate A Path 1. `visualMemoryWorkNames` stays
   classroom-only; `globalVisualMemoryWorkNames` is telemetry/candidates only.
3. Standard works only in the global pool (`work_key NOT LIKE 'custom_%'`); canonical
   names re-anchored to the static curriculum JSONs at seed time.
4. Registering a new confusion pair = THREE places: `CROSS_AREA_CONFUSION_WORK_NAMES`
   + `CROSS_AREA_CONFUSION_COUNTERPARTS` (both directions) + curated negatives in the
   seed script (and re-run it). Guide top-block entry recommended.
5. The Pass 2 prompt budget (20KB v2) is SHARED: classroom first, global fills the
   remainder. Never give global its own additive budget — the 20KB ceiling exists
   because bigger contexts drowned Haiku attention (Session 117).
6. Both Pass 2 and Sonnet-draft system prompts now use TWO cache breakpoints (static
   prefix + per-classroom dynamic suffix). Don't collapse them back to one.
