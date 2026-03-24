# Smart Learning System — Comprehensive Plan

**Date:** March 24, 2026
**Status:** PLAN — awaiting review before build
**Goal:** Make photo identification accurate per-classroom, expensive in month 1, near-zero cost at steady state

---

## The Problem

The current CLIP classifier uses 270 generic work descriptions written by us. These descriptions are "what a Montessori work SHOULD look like" — not what it ACTUALLY looks like in Teacher Zhang's classroom. Every classroom is different: different material variants, different trays, different arrangements, different lighting. Generic descriptions don't cut it. Result: everything shows as Amber, teachers drown in confirmations, and the system can't scale to 100+ schools.

## The Vision

**Month 1 (Setup):** Teachers photograph each work in their classroom once. Sonnet writes a rich visual description from that reference photo. This is expensive (~$0.03-0.06 per work × ~50-100 works = $1.50-$6.00 per classroom setup). But it only happens once.

**Month 2+ (Steady State):** CLIP matches new photos against PER-CLASSROOM descriptions instead of generic ones. Hit rate jumps from ~30% to ~80-90%. Haiku handles the remaining 10-20%. Sonnet is only called if both CLIP and Haiku fail (<5%). Cost drops to near-zero.

**The beautiful part:** Teachers don't even know they're training the system. They're just "setting up their classroom" — photographing their materials, confirming names. The AI learns silently in the background.

---

## What Already Exists (We Have a LOT)

| System | Status | What It Does |
|--------|--------|-------------|
| **CLIP/SigLIP classifier** | ✅ Live | Two-stage classification (area → work), 270 generic descriptions, cosine similarity |
| **`montree_visual_memory` table** | ✅ Live (migration 138) | Per-classroom visual descriptions with confidence, times_used, times_correct |
| **Visual memory injection** | ✅ Live | Photo-insight route queries visual memories, injects into Haiku prompts |
| **Visual memory learning from corrections** | ✅ Live | Teacher corrects → Haiku generates description → upserts into visual memory |
| **Visual memory learning from first capture** | ✅ Live | First confident photo of custom work → Haiku generates description (confidence 0.7) |
| **Auto-propose custom work** | ✅ Live | Scenario A (RED zone) → Haiku proposes custom work with structured tool_use |
| **Add custom work endpoint** | ✅ Live | Atomic 3-step: create work → re-tag photo → fire-and-forget visual memory |
| **Photo Audit page** | ✅ Built (this session) | Zone-based photo review with batch operations |
| **Parent descriptions (Chinese)** | ✅ Live | Static map of 106 work descriptions for parent reports |
| **Confidence zones** | ✅ Live | GREEN (≥0.95 auto), AMBER (0.50-0.95 confirm), RED (<0.50 propose) |
| **Negative embeddings** | ✅ Live | Margin-based penalty for confusable works |
| **Confusion pairs** | ✅ Live | Structured differentiation hints for Haiku |

**Key insight:** The infrastructure is 80% built. What's missing is the **intentional classroom setup flow** and **CLIP re-embedding from per-classroom descriptions**.

---

## What Needs to Be Built

### Phase 1: Classroom Setup Flow ("Teach the AI Your Classroom")

**New page: `/montree/dashboard/classroom-setup`**

Teacher sees their curriculum works listed by area. Each work shows one of three states:
- 📷 **Needs Photo** — no reference photo yet
- ✅ **Learned** — has reference photo + Sonnet description
- ✏️ **Edit** — teacher can retake photo or edit description

**Flow per work:**
1. Teacher taps a work → camera opens
2. Teacher takes ONE clear photo of the material on the shelf (or laid out on a mat)
3. Photo uploads to Supabase storage, linked to the work
4. **Sonnet vision call** generates a rich visual description (~200-300 words):
   - Material composition (wood, metal, plastic, fabric, beads)
   - Colors, dimensions, arrangement
   - What makes THIS version unique vs generic curriculum description
   - "NOT X" negative descriptions for confusable works
   - Key distinguishing features in CAPS
5. Description shown to teacher for confirmation ("Does this look right?")
6. On confirm: saved to `montree_visual_memory` with `source: 'teacher_setup'`, `description_confidence: 1.0`
7. **CLIP embedding regenerated** for this work using the new per-classroom description

**What this replaces:** The current system where CLIP uses generic descriptions and hopes for the best. After setup, CLIP uses descriptions written FROM the actual materials in the teacher's classroom.

**Existing system we reuse:** The `PROPOSE_CUSTOM_WORK_TOOL` schema and `proposeCustomWork()` helper in photo-insight/route.ts already does Haiku vision → structured output. We upgrade this pattern to use Sonnet for richer descriptions during classroom setup (Haiku is too terse for this).

**Cost per classroom:**
- ~50-100 works per classroom
- ~$0.03-0.06 per Sonnet vision call
- Total: **$1.50-$6.00 one-time setup cost per classroom**
- This is month 1 cost. After setup, these works are "learned" forever.

---

### Phase 2: CLIP Re-Embedding Engine

**The critical missing piece.** Currently, CLIP text embeddings are computed at server startup from the static `WORK_SIGNATURES` array. Per-classroom descriptions in `montree_visual_memory` are only used by Haiku (injected into prompts), NOT by CLIP.

**What needs to happen:**
1. New function: `getClassroomEmbeddings(classroomId)`
   - Queries `montree_visual_memory` for all works in this classroom
   - For each work with a visual description: compute SigLIP text embedding
   - Cache embeddings per classroom (in-memory Map, invalidated on visual memory update)

2. Modified `classifyImageInternal()`:
   - Accept optional `classroomId` parameter
   - If classroom embeddings exist → use those INSTEAD OF generic embeddings for Stage 2
   - Stage 1 (area classification) stays generic (areas don't change per classroom)
   - Fall back to generic embeddings for works without classroom-specific descriptions

3. Cache invalidation:
   - When `montree_visual_memory` is updated (correction, setup, etc.) → clear that classroom's cached embeddings
   - Lazy re-computation on next classification request

**Why this matters:** This is the difference between "CLIP matches against what Montessori materials SHOULD look like" and "CLIP matches against what the materials in THIS classroom ACTUALLY look like." It's the core of the Smart Learning System.

**Implementation note:** SigLIP text embedding is CPU-only, ~50ms per description. For 100 works, that's ~5 seconds to rebuild a classroom's embeddings — acceptable as a background task, not acceptable per-request. Hence the caching.

---

### Phase 3: Photo Audit Integration ("Review & Train")

**The Photo Audit page we just built becomes the training interface.** Teachers use it to:

1. **Review Amber photos** — confirm or correct identifications
2. **Fix untagged photos** — assign works (this trains CLIP for next time)
3. **Spot systematic errors** — "it keeps confusing Sandpaper Letters with Metal Insets"

**What changes in Photo Audit:**

**Fix the "Fix" button (currently broken):**
- The "Fix" button opens an area picker → WorkWheelPicker, but curriculum API returns 400
- Root cause: curriculum fetch uses wrong endpoint or missing params
- Fix: Load curriculum from static JSON files (same as classroom-setup) instead of API call
- When teacher selects the correct work:
  1. Call corrections API (already exists) → updates `montree_media.work_id`
  2. Trigger visual memory learning (already exists) → Haiku generates description from photo
  3. **NEW: Trigger CLIP re-embedding** for this work in this classroom

**Add "Teach" flow to Photo Audit:**
- For any photo, teacher can tap "Use as Reference" → makes this photo the reference photo for that work
- Triggers Sonnet description generation (same as classroom setup flow)
- Updates visual memory with higher confidence (0.95, because teacher explicitly chose this photo)

**Batch operations (already built):**
- "Confirm All GREEN" — batch confirms, each confirmation feeds visual memory
- "Fix Selected" — batch correction with single work assignment

---

### Phase 4: Parent Report Description Integration

**The user mentioned "that really nice polished system" for writing descriptions.** This refers to TWO existing systems:

1. **`parent-descriptions-zh.ts`** — Static Chinese descriptions for 106 works (used in parent reports)
2. **`findBestDescription()` in reports/preview/route.ts** — 5-step fallback chain for English descriptions

**How Smart Learning feeds into reports:**

When Sonnet writes a visual description during classroom setup, it should ALSO generate:
- `parent_description` — "Your child is working with the Pink Tower, which develops visual discrimination of size..."
- `why_it_matters` — "This work builds concentration and helps your child understand mathematical concepts of volume and dimension."

These get saved alongside the visual description and used by the report system. Currently, reports fall back to generic curriculum descriptions. With per-classroom Sonnet descriptions, reports become more specific and accurate.

**Implementation:** Add `parent_description` and `why_it_matters` fields to the Sonnet vision prompt during classroom setup. Save to `montree_visual_memory` or a new `montree_classroom_work_descriptions` table. Report routes check per-classroom descriptions before falling back to generic ones.

---

### Phase 5: Continuous Learning Loop (Already Mostly Built)

The self-improving loop that runs forever after setup:

```
New Photo Taken
    ↓
CLIP checks per-classroom embeddings (Phase 2)
    ↓
If confidence ≥ 0.85 → GREEN → auto-tag, auto-update progress
If confidence 0.50-0.84 → AMBER → show to teacher for confirmation
    ├─ Teacher confirms → increment times_correct (visual memory gets stronger)
    └─ Teacher corrects → Haiku generates new description → CLIP re-embeds
If confidence < 0.50 → RED → Haiku proposes work OR teacher assigns manually
    ↓
Every correction makes the system smarter for next time
```

**What's already working:** The entire correction → visual memory → prompt injection loop is live. Teacher corrections already generate Haiku descriptions and save to `montree_visual_memory`.

**What needs to change:** Add the CLIP re-embedding trigger (Phase 2) to the correction flow. Currently, corrections only improve Haiku's prompts. After Phase 2, corrections also improve CLIP's embeddings.

---

## Data Flow Diagram

```
CLASSROOM SETUP (Month 1)
═══════════════════════════════════════════════════════

Teacher photographs work
         ↓
    Sonnet Vision ($0.03-0.06)
         ↓
    Rich Description Generated
    ├── visual_description (for CLIP)
    ├── parent_description (for reports)
    ├── why_it_matters (for reports)
    ├── key_materials[]
    └── negative_descriptions[] (for disambiguation)
         ↓
    Saved to montree_visual_memory
    (source: 'teacher_setup', confidence: 1.0)
         ↓
    CLIP Re-Embedding Triggered
    (SigLIP text → embedding cached per classroom)


DAILY OPERATION (Month 2+)
═══════════════════════════════════════════════════════

Student photo taken by teacher
         ↓
    CLIP classifies against CLASSROOM embeddings
         ↓
    ┌─ GREEN (≥0.85): Auto-tag → Done ($0.00)
    │
    ├─ AMBER (0.50-0.84): Slim Haiku verify ($0.0004)
    │   ├─ Haiku confirms → tag + increment times_correct
    │   └─ Haiku disagrees → show teacher → correction loop
    │
    └─ RED (<0.50): Full Haiku + Sonnet fallback ($0.006-0.06)
        └─ Teacher corrects → visual memory learns → CLIP re-embeds


COST PROJECTION
═══════════════════════════════════════════════════════

Setup (Month 1):    $1.50-6.00 per classroom (one-time)
Steady State:       ~$0.001 avg per photo (80-90% CLIP, 10-15% Haiku, <5% Sonnet)
At Scale (100 schools, 50 photos/day each):
  - Without Smart Learning: $150-300/day (mostly Sonnet)
  - With Smart Learning:    $5-15/day (mostly CLIP + tiny Haiku)
  - Monthly savings:        $4,000-8,500/month
```

---

## Migration Plan (What Tables/Columns Need to Change)

### Existing table modifications:

**`montree_visual_memory`** — Add columns:
```sql
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS parent_description TEXT;
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS why_it_matters TEXT;
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS reference_photo_url TEXT;
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS key_materials TEXT[];
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS negative_descriptions TEXT[];
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;
```

No new tables needed. Everything fits into the existing `montree_visual_memory` table which already has classroom_id, work_name, work_key, area, visual_description, source, confidence, etc.

---

## Build Order (What to Do First)

### Sprint 1: Fix Broken Things + Foundation (2-3 hours)

1. **Fix Photo Audit "Fix" button** — curriculum loading failure (400 error)
   - Load curriculum from static JSON files instead of failing API call
   - Wire WorkWheelPicker properly

2. **Fix Photo Audit API 500 error** — audit/photos endpoint fails on offset >100
   - Debug and fix the offset/pagination issue

3. **Run migration** — Add new columns to `montree_visual_memory`

### Sprint 2: Classroom Setup Page (3-4 hours)

4. **Build `/montree/dashboard/classroom-setup`** — the "Teach the AI" page
   - List all works by area with photo status
   - Camera flow for capturing reference photos
   - Sonnet vision call for description generation
   - Teacher confirmation UI
   - Save to `montree_visual_memory` with confidence 1.0

5. **Sonnet description prompt** — write the prompt that generates:
   - Visual description (material-first, photo-specific)
   - Parent description (warm, educational)
   - Why it matters (developmental significance)
   - Key materials list
   - Negative descriptions (disambiguation)

### Sprint 3: CLIP Re-Embedding (2-3 hours)

6. **`getClassroomEmbeddings()`** — per-classroom embedding cache
   - Query visual memory → compute SigLIP text embeddings
   - In-memory cache with classroom-scoped invalidation

7. **Modify `classifyImageInternal()`** — use classroom embeddings when available
   - Accept classroomId parameter
   - Prioritize classroom embeddings over generic
   - Fall back to generic for unlearned works

8. **Wire cache invalidation** — clear classroom embeddings when visual memory updates

### Sprint 4: Integration (2-3 hours)

9. **Wire corrections to CLIP re-embedding** — every teacher correction also updates CLIP
10. **Wire Photo Audit "Use as Reference"** — promote any photo to reference photo
11. **Wire report descriptions** — per-classroom parent_description/why_it_matters into report routes
12. **Update DashboardHeader** — add nav link to classroom setup page

### Sprint 5: Polish + Testing (1-2 hours)

13. **End-to-end test** — photograph a work, confirm description, verify CLIP improves
14. **i18n** — all new strings in EN + ZH
15. **Performance check** — embedding cache memory usage, rebuild timing

---

## Files That Need to Change

### New Files (3-4):
1. `app/montree/dashboard/classroom-setup/page.tsx` — Classroom setup page (~500-600 lines)
2. `app/api/montree/classroom-setup/route.ts` — API for setup flow (GET works status, POST description)
3. `app/api/montree/classroom-setup/describe/route.ts` — Sonnet vision description endpoint
4. `migrations/147_smart_learning_columns.sql` — Add columns to visual_memory

### Modified Files (5-7):
1. `lib/montree/classifier/clip-classifier.ts` — Per-classroom embedding support
2. `lib/montree/classifier/classify-orchestrator.ts` — Pass classroomId through pipeline
3. `app/api/montree/guru/photo-insight/route.ts` — Trigger CLIP re-embedding on learn events
4. `app/api/montree/guru/corrections/route.ts` — Trigger CLIP re-embedding on corrections
5. `app/montree/dashboard/photo-audit/page.tsx` — Fix "Fix" button + add "Use as Reference"
6. `app/api/montree/audit/photos/route.ts` — Fix 500 error on pagination
7. `components/montree/DashboardHeader.tsx` — Add classroom-setup nav link

### Existing Files Reused As-Is:
- `montree_visual_memory` table (just adding columns)
- Visual memory injection in photo-insight route
- Correction → visual memory learning loop
- Auto-propose custom work flow
- WorkWheelPicker component
- All CLIP infrastructure (SigLIP model, embeddings, similarity)

---

## Cost Model

| Scenario | Per Photo | Monthly (50 photos/day) | Monthly (100 schools) |
|----------|-----------|------------------------|----------------------|
| **Current (generic CLIP, everything Amber)** | ~$0.006-0.06 | $9-90 | $900-9,000 |
| **After Smart Learning (80% CLIP hit)** | ~$0.001 | $1.50 | $150 |
| **Classroom setup cost (one-time)** | N/A | N/A | $150-600 total |

**Break-even:** Smart Learning pays for itself within the first week of operation.

---

## What We're NOT Doing

- ❌ Multiple photos per work (one reference photo is enough — Sonnet is that good)
- ❌ New database tables (everything fits in existing `montree_visual_memory`)
- ❌ Rewriting the CLIP model (SigLIP stays, we just change what descriptions it matches against)
- ❌ Removing generic descriptions (they remain as fallback for works without classroom photos)
- ❌ Making this mandatory (classrooms without setup still work — just with lower accuracy)
- ❌ Real-time Sonnet calls during daily operation (Sonnet only during setup + rare fallbacks)

---

## Summary

The Smart Learning System turns a one-size-fits-all classifier into a per-classroom learning engine:

1. **Teacher photographs each work once** → Sonnet writes rich description (~$0.04/work)
2. **CLIP learns per-classroom** → matches against actual materials, not generic descriptions
3. **Photo Audit becomes the review tool** → teachers confirm/correct, system learns
4. **Reports get better** → per-classroom descriptions feed into parent reports
5. **Cost curve inverts** → expensive month 1 ($2-6/classroom), near-zero month 2+ ($0.001/photo)

Total build time: **10-15 hours across 5 sprints.**

The 80% of infrastructure already exists. We're building the 20% that connects per-classroom learning to CLIP embeddings and gives teachers a clean setup interface.
