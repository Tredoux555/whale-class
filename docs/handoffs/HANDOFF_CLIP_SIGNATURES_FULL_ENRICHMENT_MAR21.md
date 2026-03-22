# Handoff: CLIP Signature Full Enrichment — ALL 270 Works

**Date:** March 21, 2026 (Sessions 1 + 2)
**Status:** COMPLETE — 270/270 works covered (100%)
**Deploy:** ✅ PUSHED (Mar 21 — two pushes: initial push had unescaped apostrophe build failure, second push fixed).

---

## What Was Done

### CLIP Signature Full Enrichment (Task 1 — COMPLETE)

Rewrote ALL Montessori work CLIP/SigLIP visual descriptions across 5 area-specific signature files. Each work was web-researched for physical material appearance, then described in a CLIP-optimized format (material-first, photo-specific, anti-confusion). This is the absolute cornerstone of the $0.00 CLIP classification tier — description quality determines whether CLIP can distinguish Color Tablets from Fabric Matching, Sandpaper Letters from Sandpaper Numerals, etc.

**Architecture — Modular file structure:**

```
lib/montree/classifier/
├── work-signatures.ts              # Orchestrator — imports 5 area files, re-exports combined array + helpers
├── signatures-practical-life.ts    # 83 works (pl_ prefix)
├── signatures-sensorial.ts         # 35 works (se_ prefix)  ← REWRITTEN Session 2
├── signatures-mathematics.ts       # 57 works (ma_ prefix)  ← REWRITTEN Session 2
├── signatures-language.ts          # 45 works (la_ prefix)
├── signatures-cultural.ts          # 50 works (cu_ prefix)
└── index.ts                        # Barrel exports (unchanged)
```

Replaces the old monolithic `work-signatures.ts` (was 1,781 lines, only 156 entries).

**Coverage:**

| Area | Works | Prefix | Status |
|------|-------|--------|--------|
| Practical Life | 83 | `pl_` | ✅ Written Session 1 |
| Sensorial | 35 | `se_` | ✅ Rewritten Session 2 (was misaligned) |
| Mathematics | 57 | `ma_` | ✅ Rewritten Session 2 (was misaligned) |
| Language | 45 | `la_` | ✅ Written Sessions 1+2 |
| Cultural | 50 | `cu_` | ✅ Written Session 1 |
| **Total** | **270** | | **100%** |

### Critical Fix: Curriculum ID Alignment (Session 2)

Session 1 parallel agents hallucinated work keys instead of using actual curriculum JSON IDs. Session 2 caught and fixed this:

**Sensorial (worst — 13 phantom, 13 missing):** Agent had fabricated entries like `sensorial_metal_insets`, `sensorial_land_water_forms`, `sensorial_sensorial_books`, `sensorial_sensorial_strips` that don't exist in the curriculum. Missing 13 real works: all 5 constructive triangle boxes, binomial cube, trinomial cube, superimposed geometric figures, touch tablets, sorting grains, thermic tablets, bells, sorting objects. **Completely rewritten** with correct `se_` prefix IDs.

**Mathematics (~15 phantom, ~15 missing):** Agent had included sensorial materials (color_boxes, red_rods) and fabricated entries (ten_frame, money_making_change, hierarchical_place_value). Missing real curriculum works like golden_beads operations, teen/ten boards, snake games. **Completely rewritten** with correct `ma_` prefix IDs.

**All work_keys now exactly match curriculum JSON `id` fields**, enabling correct confusion_pair cross-references, work-key lookups in the CLIP classifier, and consistency with `loadAllCurriculumWorks()`.

### 329 vs 270 — RESOLVED

CLAUDE.md references "329 works" throughout. **The actual count is 270.** The 5 curriculum JSON files in `lib/curriculum/data/` define exactly 270 works. This is what `loadAllCurriculumWorks()` loads, what gets seeded to classrooms, and what the community library contains. "329" is stale. CLAUDE.md needs updating.

### Description Quality Standard

Every work description follows this pattern:
- **Material-first:** Leads with exact composition (wood, metal, fabric, beads, sandpaper, glass)
- **Photo-specific:** What a phone camera sees from 1-2 meters away, not what the work teaches
- **Action verbs:** What child's hands are doing (stacking, pouring, tracing, threading, matching)
- **Anti-confusion:** Explicitly states "NOT X which has Y" for similar-looking materials
- **Distinguishing features:** Color, size, shape, texture, arrangement, container type
- **2-3 sentences max** — optimized for CLIP text embedding cosine similarity

### TypeScript Architecture

All 5 area files use `import type` (not `import`) to prevent circular dependencies:
```typescript
import type { WorkSignature } from './work-signatures';
```
TypeScript erases type imports at runtime. The orchestrator `work-signatures.ts` imports the arrays from all 5 files and re-exports the combined `WORK_SIGNATURES` array plus helper functions (`getSignaturesByArea`, `getSignatureByKey`, `getWorkKeysForArea`, `getConfusionPairsForWork`) and dynamic `WORK_SIGNATURES_STATS`.

### Files Changed (7)

| File | Action | ~Lines |
|------|--------|--------|
| `lib/montree/classifier/work-signatures.ts` | Rewritten as orchestrator | 155 |
| `lib/montree/classifier/signatures-practical-life.ts` | Created | 900 |
| `lib/montree/classifier/signatures-sensorial.ts` | Created then rewritten | 450 |
| `lib/montree/classifier/signatures-mathematics.ts` | Created then rewritten | 590 |
| `lib/montree/classifier/signatures-language.ts` | Created | 500 |
| `lib/montree/classifier/signatures-cultural.ts` | Created | 550 |
| `docs/handoffs/HANDOFF_CLIP_SIGNATURES_FULL_ENRICHMENT_MAR21.md` | This file | — |

### Also From Mar 21 Session 1 (Still Unpushed)

**Smart Capture 20x Overhaul — 32 fixes across 5 files** (see `HANDOFF_SMART_CAPTURE_20X_BUILD_MAR21.md`):
- Route-level AbortControllers + timeouts
- Safe `clipResult?.` with `?? null`
- Rate limit map eviction
- Cache keys include child_id
- Case-insensitive work lookup
- NaN confidence check
- Init re-entrance guard + pipeline mutex
- `evictStale()` cleanup retryTimeouts
- 28 independent audit agents, 3 consecutive CLEAN passes

**CLIP Embedding Rewrite for Color Tablets vs Fabric Matching** (see `HANDOFF_CLIP_ENRICHMENT_MAR21.md`):
- Rewrote 4 work descriptions to maximize visual distinction
- Color Box 1/2/3: "rigid, painted, wooden, glossy, hard, LOOKING at colors"
- Fabric Matching: "soft, cloth, textile weave, foldable, FEELING with eyes closed"

**Smart Capture Debiasing Round 2** (visual memory bias removal):
- Standard work visual memories REMOVED from identification prompts
- Only custom work memories injected
- Color Tablets vs Fabric Matching confusion pair added
- Pass 1 prompt: "MATERIAL COMPOSITION" now #1 priority

**Photo Upload Diagnostic:**
- `app/api/montree/debug-upload/route.ts` — temporary endpoint for diagnosing upload failures
- `components/montree/DashboardHeader.tsx` — Albums icon 📸 → 🖼️

---

## Railway Build Fix (Session 3 — Continuation)

### Apostrophe Escaping Crisis

Initial push caused Railway build failure:
```
./lib/montree/classifier/signatures-cultural.ts:314:373
Expected ',', got 'ident'
> 314 | ..., and sometimes THROAT SAC (for males' croaking)...
```

Root cause: unescaped apostrophe in `males'` terminated single-quoted TypeScript string. Turbopack parsed remaining text as unexpected identifier.

### Comprehensive Audit

All 5 signature files audited for unescaped single quotes:
- 85 total apostrophes found across all files — ALL properly escaped with `\'`
- Patterns checked: `\w'\w` (contractions), `\w' ` (plural possessives), `\w'\)`, `\w'.`, `\w',`
- Work counts verified: 83+35+57+45+50 = 270 (matches curriculum JSONs exactly)
- Structure verified: proper imports, exports, array closings in all files
- Cross-reference: all work_keys match curriculum JSON IDs (zero orphans, zero missing)

### Cowork VM Sync Issue

Deep-pass agent writes in Cowork VM did NOT sync to Mac filesystem. `git status` on Mac showed signature files as unmodified (matching broken origin/main). Fix: forced Edit tool writes (added comment lines to each file) to trigger filesystem sync. Files then appeared as modified and pushed successfully.

---

## What Was NOT Done

### Task 2: Streamline Upload System (NEXT SESSION — DO FIRST)

Current upload flow is glitchy and slow. Diagnose and fix:

**Problems:**
- Background sync feels slow (5-15s network upload, zero progress feedback to teacher)
- Sequential uploads (one at a time) — should be parallel (3-4 concurrent)
- No upload progress indicator (just "Photo saved!" toast then silence)
- Gallery shows "1 photo waiting to upload" with no ETA or progress bar
- No compression feedback (teacher doesn't know if photo is being compressed)

**Files to modify:**
- `lib/montree/offline/sync-manager.ts` — Core sync engine. Change sequential `for...of` upload loop to parallel batch (3-4 concurrent with `Promise.allSettled`). Add progress callback.
- `app/montree/dashboard/capture/page.tsx` — Capture page. Add compression progress indicator.
- `components/montree/media/PhotoQueueBanner.tsx` — Queue status UI. Add per-photo progress bar, upload speed estimate, ETA.
- `hooks/usePhotoQueue.ts` — React hook. Expose upload progress state.

**Test the full flow:** capture → compress → enqueue (IndexedDB) → upload → AI analysis → gallery display

**Estimated time:** 2-3 hours

### Task 3: 10x Deep Audit Health Check Fix Cycle (AFTER Task 2)

Full 10-round audit-fix loop on the ENTIRE Smart Capture pipeline end-to-end. This is the final hardening pass before the system is production-ready at scale.

**Methodology:**
- Round 1-10: Fresh parallel audit agents each round examining different angles
- Fix all issues found each round
- Continue until 3 consecutive CLEAN passes
- Each round uses independent agents looking at: timeout chains, cache consistency, error handling, concurrency, data flow, memory leaks, security, performance, edge cases, wiring

**Scope — ALL Smart Capture files:**

| File | What It Does | Key Concerns |
|------|-------------|--------------|
| `app/api/montree/guru/photo-insight/route.ts` | Main photo identification | Timeout chains, CLIP→Haiku→Sonnet fallback, cache keys, debiasing |
| `app/api/montree/guru/photo-enrich/route.ts` | Slim Haiku enrichment | AbortController, progress upsert, STATUS_RANK |
| `app/api/montree/guru/corrections/route.ts` | Teacher corrections | Idempotency, cache invalidation, visual memory learning |
| `lib/montree/classifier/clip-classifier.ts` | CLIP/SigLIP inference | Init guard, pipeline mutex, timeout, resource cleanup |
| `lib/montree/classifier/classify-orchestrator.ts` | Kill switch + canary | Init retry TTL, rollout percentage, error handling |
| `lib/montree/classifier/work-signatures.ts` | 270 work descriptions | Import wiring, helper functions, stats computation |
| `lib/montree/classifier/signatures-*.ts` (5 files) | Area-specific signatures | Work key correctness, confusion pair validity |
| `lib/montree/photo-insight-store.ts` | Client-side state store | Abort tracking, stale eviction, retry timeouts |
| `lib/montree/offline/sync-manager.ts` | Photo upload queue | Atomic saves, blob handling, auth detection, retry logic |
| `app/montree/dashboard/capture/page.tsx` | Camera capture UI | Upload retry, compression, error toasts |
| `app/montree/dashboard/[childId]/gallery/page.tsx` | Photo gallery | Auto-crop rendering, lazy loading, queue banner |
| `components/montree/guru/PhotoInsightButton.tsx` | AI result display | Per-entry selector, confirm/reject, status pills |
| `components/montree/media/PhotoQueueBanner.tsx` | Upload queue status | Progress display, sync triggers |

**Expected outcome:** Production-hardened Smart Capture pipeline with zero known issues, all edge cases handled, 3 consecutive clean audit passes.

**Estimated time:** 3-5 hours

---

## Push Command

Run from Mac terminal:

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale

# Commit 1: CLIP signatures (270 works, all areas)
git add \
  lib/montree/classifier/work-signatures.ts \
  lib/montree/classifier/signatures-practical-life.ts \
  lib/montree/classifier/signatures-sensorial.ts \
  lib/montree/classifier/signatures-mathematics.ts \
  lib/montree/classifier/signatures-language.ts \
  lib/montree/classifier/signatures-cultural.ts \
  docs/handoffs/HANDOFF_CLIP_SIGNATURES_FULL_ENRICHMENT_MAR21.md
git commit -m "feat: CLIP signature enrichment — all 270 works with curriculum-aligned IDs"

# Commit 2: Smart Capture 20x overhaul + debiasing (32 fixes, still unpushed from Session 1)
git add \
  app/api/montree/guru/photo-insight/route.ts \
  app/api/montree/guru/photo-enrich/route.ts \
  app/api/montree/guru/corrections/route.ts \
  lib/montree/classifier/clip-classifier.ts \
  lib/montree/photo-insight-store.ts \
  app/api/montree/debug-upload/route.ts \
  components/montree/DashboardHeader.tsx \
  CLAUDE.md
git commit -m "fix: Smart Capture 20x overhaul — 32 fixes + debiasing round 2"

git push origin main
```

---

## ⚠️ MONDAY LIVE TEST — HOSTILE TESTER SCENARIO

**Context:** System goes live Monday (Mar 23, 2026) with a tester who *wants it to fail*. Every misidentification, every slow upload, every UI glitch will be used as evidence the system doesn't work. The goal is maximum accuracy and bulletproof reliability on the first impression.

**Strategy:** Deploy the lean schema upgrade (structured confusion pairs + negative descriptions) BEFORE Monday. This is the single highest-impact accuracy improvement available. Then collect real misclassification data from Monday's live test to guide future targeted improvements.

---

## NEXT SESSION PLAN — CLIP Schema Upgrade + Monday Hardening

### Phase 0: Push ALL Unpushed Code (5 minutes)

Run the push command above from Mac terminal. Everything from Mar 21 sessions needs to be live.

### Phase 1: Schema Upgrade — Structured Confusion Pairs + Negative Descriptions (2-3 hours)

**This is the #1 accuracy win before Monday.** The current `confusion_pairs` field is just `string[]` — it tells the classifier "these look similar" but gives it zero information about HOW to tell them apart. The classifier doesn't even USE the field yet.

#### Step 1A: Update WorkSignature Interface (~10 min)

In `lib/montree/classifier/work-signatures.ts`, upgrade the interface:

```typescript
export interface ConfusionPair {
  /** work_key of the similar-looking material */
  work_key: string;
  /** Why they look similar (for debugging/documentation) */
  reason: string;
  /** How to visually distinguish them — this gets embedded by CLIP */
  differentiation: string;
}

export interface WorkSignature {
  work_key: string;
  name: string;
  area_key: "practical_life" | "sensorial" | "mathematics" | "language" | "cultural";
  category: string;
  visual_description: string;
  key_materials: string[];
  confusion_pairs: ConfusionPair[];    // UPGRADED from string[]
  negative_descriptions: string[];      // NEW — "NOT X" statements for CLIP negative embeddings
  difficulty: "easy" | "medium" | "hard";
}
```

Also update `getConfusionPairsForWork()` return type and any helper that references the old shape.

**Export the `ConfusionPair` interface** so area files can import it.

#### Step 1B: Update All 5 Area Signature Files (~2 hours)

For each of the 270 works across 5 files, upgrade:

1. **`confusion_pairs`**: Convert from `string[]` to `ConfusionPair[]`. For works that currently have `confusion_pairs: []`, leave as `[]`. For works with entries, add `reason` and `differentiation`:

   **Before:**
   ```typescript
   confusion_pairs: ['se_knobless_cylinders'],
   ```

   **After:**
   ```typescript
   confusion_pairs: [{
     work_key: 'se_knobless_cylinders',
     reason: 'Both are sets of graduated cylinders',
     differentiation: 'Cylinder Blocks have KNOBS on top and sit in a wooden BLOCK with holes. Knobless Cylinders have NO knobs and are loose colored cylinders (red, yellow, green, blue sets).',
   }],
   ```

2. **`negative_descriptions`**: Add 1-3 "NOT X" statements for each work, focusing on the most likely false positives. These will be computed as negative CLIP embeddings and subtracted from the similarity score:

   ```typescript
   negative_descriptions: [
     'NOT loose colored cylinders without knobs',
     'NOT a set of colored wooden blocks or cubes',
   ],
   ```

   **Priority for negative descriptions:**
   - Works with existing confusion_pairs: MUST have negatives (these are known problem pairs)
   - Works with `difficulty: "hard"`: SHOULD have negatives
   - Works with `difficulty: "easy"`: CAN have negatives but lower priority

**Writing guide for differentiation text:**
- Material-first: "X has WOOD, Y has METAL"
- Physical features: "X has KNOBS, Y is SMOOTH"
- Color/size: "X is RED graduated, Y is NATURAL wood"
- Container: "X sits in a BLOCK, Y comes in a BOX"
- Action: "X involves STACKING, Y involves SORTING"
- Use CAPS for the distinguishing word

**Writing guide for negative descriptions:**
- Start with "NOT"
- Describe what the confused work looks like, not what this work looks like
- Be specific about the distinguishing material/feature
- Keep to one sentence, under 20 words (CLIP token budget)

#### Step 1C: Update CLIP Classifier to Use New Fields (~1 hour)

In `lib/montree/classifier/clip-classifier.ts`:

1. **Negative embeddings at init time:** When pre-computing text embeddings for each work, also compute embeddings for each `negative_descriptions` entry. Store alongside the positive embedding.

2. **Scoring adjustment:** During classification, after computing cosine similarity against the positive `visual_description` embedding, SUBTRACT a weighted penalty from any negative embedding matches:

   ```
   final_score = positive_similarity - (max_negative_similarity * NEGATIVE_WEIGHT)
   ```

   Start with `NEGATIVE_WEIGHT = 0.3` (conservative — don't over-penalize). Tune based on Monday data.

3. **Confusion pair differentiation in Haiku pass:** When CLIP returns a top match with a confusion pair, inject the `differentiation` text into the slim Haiku enrichment prompt. This gives Haiku explicit disambiguation instructions:

   ```
   "Note: This work is often confused with [confused_work_name].
   Key difference: [differentiation text]"
   ```

   This happens in `photo-insight/route.ts` where the slim Haiku prompt is built.

**Memory impact:** Each negative description adds ~one embedding (384 floats for SigLIP base). At 270 works × ~2 negatives average = ~540 extra embeddings × 384 × 4 bytes = ~830KB. Negligible.

**Init time impact:** ~540 extra text embeddings to compute at startup. SigLIP processes ~50 embeddings/second on CPU. Adds ~10s to cold start (one-time, cached after).

### Phase 2: Confusion Pair Audit — Identify ALL Problem Pairs (1 hour)

Currently only Mathematics and Sensorial have populated confusion_pairs. The other 3 areas have mostly `[]`. Before Monday, systematically identify confusion pairs for ALL areas:

**Known high-confusion pairs (from production incidents):**
- Color Tablets (se_color_box_1/2/3) ↔ Fabric Matching (se_fabric_matching) — ALREADY FIXED in descriptions
- Sandpaper Letters (la_sandpaper_letters) ↔ Sandpaper Numerals (ma_sandpaper_numerals)
- Metal Insets (la_metal_insets) ↔ Geometric Cabinet (se_geometric_cabinet)
- Red Rods (se_red_rods) ↔ Number Rods (ma_number_rods)
- Cylinder Blocks (se_cylinder_block_1-4) ↔ Knobless Cylinders (se_knobless_cylinders)
- Pink Tower (se_pink_tower) ↔ Brown Stair (se_brown_stair) — both are graduated blocks

**Methodology:**
1. Run 5 parallel agents (one per area) reading the curriculum JSONs + existing descriptions
2. Each agent identifies works that look similar based on materials, colors, shapes
3. Cross-area pairs are the most dangerous (CLIP does area-first, then work-within-area — cross-area confusion means Stage 1 picks wrong area and correct work is NEVER found in Stage 2)
4. Output: updated confusion_pairs + negative_descriptions for every identified pair

### Phase 3: Integration Test — Verify Schema Changes Don't Break Build (30 min)

1. Verify TypeScript compiles cleanly (`npx tsc --noEmit`)
2. Verify all 5 signature files import/export correctly
3. Verify `WORK_SIGNATURES_STATS` computes correctly with new shape
4. Verify `getConfusionPairsForWork()` returns new shape
5. Check for unescaped apostrophes in any new differentiation/negative text (the apostrophe crisis)
6. Push and confirm Railway build succeeds

### Phase 4: Misclassification Data Collection Setup (30 min)

Set up tracking so Monday's live test produces actionable data:

1. **Already tracked in `context_snapshot`:** CLIP confidence, area confidence, runner_up, model_used, haiku_accepted
2. **Add to context_snapshot:** `negative_penalty_applied` (boolean), `confusion_pair_matched` (work_key or null), `differentiation_injected` (boolean)
3. **Teacher corrections already tracked** in `montree_guru_corrections` table
4. **After Monday:** Query corrections table to find:
   - Which works were most often corrected (= CLIP got wrong)
   - Which confusion pairs actually occurred in practice
   - Whether negative embeddings helped (compare confidence with/without penalty)

### Phase 5: Upload Reliability Check (30 min)

The hostile tester will DEFINITELY try to break uploads. Quick checklist:

1. Verify parallel upload pool is working (3 concurrent from Mar 21 session)
2. Verify progress events fire correctly in PhotoQueueBanner
3. Verify re-login fix is deployed (365-day cookie TTL)
4. Test: take 5 photos rapidly, verify all appear in gallery within 30 seconds
5. Test: airplane mode → take photo → reconnect → verify auto-sync

### Phase 6: End-to-End Smoke Test (30 min)

Before Monday, manually test the full pipeline:

1. Open Smart Capture → take photo of a Montessori material
2. Verify CLIP fires (check `[CLIP]` in Railway logs)
3. Verify slim Haiku enrichment fires for confident matches
4. Verify photo appears in gallery with correct tag
5. Verify teacher correction flow works (tap wrong → pick correct → saves)
6. Verify GREEN zone auto-update works (progress updates automatically)
7. Verify AMBER zone shows confirm/reject buttons

---

## AFTER MONDAY: Data-Driven Refinement

Once real classroom data is flowing:

1. **Week 1-2:** Collect misclassification data passively
2. **Week 2:** Pull worst performers — which works get corrected most?
3. **Week 3:** For the 20-30 worst performers ONLY:
   - Write richer view-specific descriptions (shelf/table/in_use)
   - Add structured physical_attributes
   - Add more targeted negative_descriptions
4. **Week 4:** Measure improvement, iterate

This turns description writing from guesswork into data-driven refinement. Don't write 1,080 view descriptions for all 270 works — write 80-120 targeted descriptions for the 20-30 works that actually get confused in practice.

**Schema fields to add LATER (only for worst performers):**

```typescript
// FUTURE — only for the 20-30 hardest works, after real data
interface EnrichedWorkSignature extends WorkSignature {
  view_descriptions?: {
    in_use?: string;     // Child actively using the material
    on_shelf?: string;   // Material sitting on shelf, packed away
    close_up?: string;   // Zoomed in on distinctive feature
  };
  physical_attributes?: {
    material: string;    // "wood", "metal", "fabric", "beads"
    primary_colors: string[];
    approximate_size: string;
    piece_count?: string;
    texture?: string;
  };
}
```

---

## Summary: What the Schema Upgrade Gets You for Monday

| Improvement | How It Helps | Effort |
|-------------|-------------|--------|
| Structured confusion pairs with `differentiation` | CLIP knows HOW to tell similar works apart, not just that they're similar | Medium |
| Negative CLIP embeddings | Actively suppresses false positives ("this is NOT colored pencils") | Low |
| Differentiation injected into Haiku prompt | When CLIP is uncertain, Haiku gets explicit disambiguation instructions | Low |
| Confusion pair audit across all 5 areas | Catches cross-area confusion before Monday (most dangerous failure mode) | Medium |

**Combined estimated accuracy improvement:** 15-25% reduction in misclassifications, concentrated on the hardest works. The hostile tester will still find edge cases, but the system won't make obvious mistakes like "Color Tablets → Fabric Matching" or "Sandpaper Letters → Grammar Boxes."

**Total estimated time: 5-7 hours** (schema + populate + classifier + audit + test)

---

## NEXT SESSION PRIORITIES (in order, for Monday readiness)

### 1. Push ALL Unpushed Code (5 minutes)
Run the push command above from Mac terminal.

### 2. CLIP Schema Upgrade — Phases 1-3 (3-4 hours)
Interface upgrade → populate 270 works → classifier integration → build verification. This is the #1 priority.

### 3. Confusion Pair Audit — Phase 2 (1 hour)
5 parallel agents identifying all cross-area and within-area confusion pairs.

### 4. End-to-End Smoke Test — Phases 5-6 (1 hour)
Upload reliability + full pipeline test. Catch any integration issues before Monday.

### 5. Collect Data Monday — Phase 4 (30 min setup)
Add tracking fields so Monday produces actionable misclassification data for post-Monday refinement.
