# HANDOFF: Smart Learning System Build

**Date:** March 24, 2026
**Status:** PLAN APPROVED — Ready for build
**Priority:** 🔴 CRITICAL — System is LIVE, teachers drowning in Amber confirmations
**Estimated Build Time:** 10-15 hours across 5 sprints
**Methodology:** 3x3x3x3 recommended for CLIP re-embedding (Sprint 3)

---

## EXECUTIVE SUMMARY

Build a per-classroom visual learning system that replaces generic CLIP descriptions with Sonnet-generated descriptions from actual classroom reference photos. Teachers photograph each work once during setup → Sonnet writes a rich description → CLIP learns per-classroom → accuracy jumps from ~30% to ~80-90% → cost drops from $0.006-0.06/photo to ~$0.001/photo at steady state.

**The 80% of infrastructure already exists.** We're building the 20% that connects per-classroom learning to CLIP embeddings and gives teachers a clean setup interface.

---

## THE PROBLEM

The current CLIP classifier uses 270 generic work descriptions written by us (in `lib/montree/classifier/signatures-*.ts`). These describe what Montessori materials SHOULD look like generically. But every classroom is different — different material variants, trays, arrangements, lighting. Result: everything classifies as Amber (0.50-0.84 confidence), teachers must manually confirm every photo, and the system can't scale to 100+ schools.

**Current confidence zones (from `app/api/montree/audit/photos/route.ts` line 111-117):**
```
GREEN: confidence >= 0.85 → auto-tag (rarely hit with generic descriptions)
AMBER: 0.50 <= confidence < 0.85 → needs teacher confirmation (EVERYTHING lands here)
RED:   confidence < 0.50 → unknown work
UNTAGGED: no work_id at all
```

---

## WHAT ALREADY EXISTS (REUSE ALL OF THIS)

### 1. CLIP/SigLIP Classifier (`lib/montree/classifier/`)
- **Model:** `Xenova/siglip-base-patch16-224` (ViT-B/16, CPU inference via ONNX)
- **Two-stage pipeline:** Area classification (5 classes) → Work classification (50-80 per area)
- **Pre-computed text embeddings** at server startup from `WORK_SIGNATURES` array (270 works)
- **Key constants:** `CLIP_CONFIDENCE_THRESHOLD = 0.75`, `VISUAL_MEMORY_BOOST = +0.15`, `NEGATIVE_EMBEDDING_MARGIN = 0.12`
- **File:** `clip-classifier.ts` — `initClassifier()` pre-computes embeddings, `classifyImageInternal()` runs inference

### 2. Visual Memory Table (`migrations/138_visual_memory.sql`)
Already live in production. Schema:
```sql
montree_visual_memory (
  id UUID PK,
  classroom_id UUID NOT NULL,
  work_name TEXT NOT NULL,
  work_key TEXT,
  area TEXT,
  is_custom BOOLEAN DEFAULT false,
  visual_description TEXT NOT NULL,
  source TEXT DEFAULT 'correction',  -- 'correction' | 'first_capture' | 'teacher_manual'
  source_media_id UUID,
  photo_url TEXT,
  description_confidence NUMERIC DEFAULT 0.8,
  times_used INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(classroom_id, work_name)
)
```
**RPCs:** `increment_visual_memory_used(classroom_id, work_names[])`, `increment_visual_memory_correct(classroom_id, work_name)`

### 3. Visual Memory Injection (photo-insight/route.ts)
The photo identification route already:
- Queries `montree_visual_memory` for the child's classroom
- Injects descriptions into Haiku/Sonnet prompts
- Tracks `times_used` via fire-and-forget RPC

### 4. Visual Memory Learning from Corrections (corrections/route.ts)
When a teacher corrects a misidentification:
- Looks up photo URL from cached interaction (3-step: cache → old format → media table)
- Haiku generates visual description from the photo
- Upserts into `montree_visual_memory` with `source: 'correction'`, confidence 0.9

### 5. Auto-Propose Custom Work (photo-insight/route.ts)
When CLIP/Haiku can't identify a work (Scenario A / RED zone):
- `proposeCustomWork()` calls Haiku vision with `PROPOSE_CUSTOM_WORK_TOOL` schema
- Structured output: name, area, description, materials, why_it_matters, is_educational, confidence
- Teacher sees amber card with "Add as New Work" button
- `add-custom-work/route.ts` does atomic 3-step: create work → re-tag photo → visual memory

### 6. Photo Audit Page (built this session)
- **Page:** `app/montree/dashboard/photo-audit/page.tsx` (~555 lines)
- **API:** `app/api/montree/audit/photos/route.ts` (~202 lines)
- Zone tabs (All/Green/Amber/Red/Untagged), photo grid, single/batch operations
- **Nav:** 🔍 link in DashboardHeader
- **i18n:** 27 audit.* keys in both en.ts and zh.ts

### 7. Classify Orchestrator (`classify-orchestrator.ts`)
- Kill switch: `CLIP_CLASSIFIER_ENABLED` env var
- Canary rollout: `CLIP_CANARY_PERCENT` env var
- Thresholds: `CLIP_CONFIDENT = 0.75`, `CLIP_VERY_CONFIDENT = 0.90`
- `tryClassify(imageUrl, classroomId, visualMemories?)` → returns `ClassifyDecision`

---

## WHAT NEEDS TO BE BUILT

### Sprint 1: Fix Broken Things (2-3 hours)

#### Task 1.1: Fix Photo Audit "Fix" Button

**Problem:** Clicking "Fix" on a photo opens the area picker, then WorkWheelPicker shows "No works available in this area yet." Console shows 400 on `/api/montree/curriculum`.

**Root cause:** The page loads curriculum on mount via `fetch('/api/montree/curriculum')` (line 62-78 of photo-audit/page.tsx). This endpoint is failing with 400 — likely missing required params or auth issue.

**Current code (photo-audit/page.tsx lines 62-78):**
```typescript
useEffect(() => {
  let cancelled = false;
  fetch('/api/montree/curriculum')
    .then(r => r.json())
    .then(data => {
      if (cancelled) return;
      const byArea: Record<string, any[]> = {};
      for (const w of data.works || []) {
        if (!byArea[w.area_key]) byArea[w.area_key] = [];
        byArea[w.area_key].push(w);
      }
      setCurriculum(byArea);
    })
    .catch(() => {}); // Silent fail — this is the problem
}, []);
```

**Fix options (pick one):**
1. **Load from static JSON files** (preferred — no API dependency):
   ```typescript
   import { loadAllCurriculumWorks } from '@/lib/curriculum/curriculum-loader';
   // Then in useEffect: const works = loadAllCurriculumWorks();
   ```
2. **Fix the API call** — add required query params (classroom_id? area? check what `/api/montree/curriculum` GET requires)

**After curriculum loads, the WorkWheelPicker needs:**
- `area: string` — the area key
- `works: Work[]` — array with `id` field (this is critical — the Work type needs `id`)
- `onSelectWork: (work, status) => void`

Check how the week view page (`app/montree/dashboard/[childId]/page.tsx`) loads curriculum for its WorkWheelPicker — match that pattern.

#### Task 1.2: Fix Photo Audit API 500 on Pagination

**Problem:** Console shows 500 on `/api/montree/audit/photos?limit=100&offset=100` and `offset=200`.

**Investigation needed:** The pagination logic in `audit/photos/route.ts` uses Supabase `.range(offset, offset + limit - 1)` which should be safe. The 500 may come from:
- The confidence data fetch (`fetchConfidenceData`) failing on the second page
- The `.in()` query on media IDs exceeding Supabase's array size limit
- The parallel `Promise.allSettled` having an unhandled edge case

**Debug approach:** Add try-catch with specific error logging around each of the 4 parallel queries to identify which one fails.

#### Task 1.3: Run Migration for New Columns

```sql
-- Migration 147: Smart Learning System columns
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS parent_description TEXT;
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS why_it_matters TEXT;
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS reference_photo_url TEXT;
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS key_materials TEXT[];
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS negative_descriptions TEXT[];
ALTER TABLE montree_visual_memory ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;
```

Run via Supabase SQL Editor.

---

### Sprint 2: Classroom Setup Page (3-4 hours)

#### Task 2.1: Build the "Teach the AI" Page

**New page:** `app/montree/dashboard/classroom-setup/page.tsx`

**UX flow:**
1. Teacher sees their curriculum works listed by area (5 area tabs)
2. Each work shows status: 📷 Needs Photo | ✅ Learned | ✏️ Edit
3. Teacher taps a work → camera opens (or album picker)
4. Teacher takes ONE clear photo of the material
5. Photo uploads to Supabase storage
6. Sonnet vision call generates rich description (shown to teacher)
7. Teacher confirms → saved to `montree_visual_memory` with `source: 'teacher_setup'`, confidence 1.0

**Data source for work list:** Query `montree_classroom_curriculum_works` for this classroom (gets all works assigned to the classroom). LEFT JOIN with `montree_visual_memory` to get photo status per work.

**New API:** `app/api/montree/classroom-setup/route.ts`
- **GET:** Returns all works for classroom + their visual memory status (has photo, has description, confidence)
- **POST:** Accepts reference photo + work metadata → triggers Sonnet description generation

#### Task 2.2: Sonnet Description Generation

**New API:** `app/api/montree/classroom-setup/describe/route.ts`

Takes a photo URL + work name + area → calls Sonnet vision → returns structured description.

**Sonnet prompt should generate ALL of these in one call:**
```typescript
{
  visual_description: string,     // Material-first, photo-specific, CAPS on distinguishing features
  parent_description: string,     // Warm parent-friendly description for reports
  why_it_matters: string,         // Developmental significance
  key_materials: string[],        // Primary visual identifiers
  negative_descriptions: string[] // "NOT X" disambiguation statements
}
```

**Use `tool_choice: { type: 'tool' }` pattern** (same as PROPOSE_CUSTOM_WORK_TOOL) for structured output.

**Cost:** ~$0.03-0.06 per Sonnet vision call. For 50-100 works per classroom: $1.50-$6.00 one-time.

**Reference for prompt style:** Look at the existing `proposeCustomWork()` function in `photo-insight/route.ts` (lines 133-200) for the pattern. Upgrade from Haiku to Sonnet, expand the output schema.

#### Task 2.3: Save to Visual Memory

On teacher confirmation, upsert into `montree_visual_memory`:
```typescript
{
  classroom_id,
  work_name,
  work_key,
  area,
  is_custom: false, // or true for custom works
  visual_description,
  source: 'teacher_setup',
  source_media_id: mediaId,
  photo_url,
  description_confidence: 1.0,  // Teacher explicitly confirmed
  parent_description,            // NEW column
  why_it_matters,                // NEW column
  reference_photo_url: photoUrl, // NEW column
  key_materials,                 // NEW column
  negative_descriptions,         // NEW column
}
```

#### Task 2.4: Nav Link

Add 🎓 or 📸 link in DashboardHeader pointing to `/montree/dashboard/classroom-setup`. Teachers only.

---

### Sprint 3: CLIP Re-Embedding Engine (2-3 hours) ⚠️ USE 3x3x3x3

**This is the core innovation. Get this right.**

#### Task 3.1: Per-Classroom Embedding Cache

**New function in `clip-classifier.ts`:**

```typescript
// Module-level cache
const classroomEmbeddingCache = new Map<string, {
  embeddings: Map<string, Float32Array>, // work_key → embedding
  generatedAt: number,
}>();

async function getClassroomEmbeddings(
  classroomId: string,
  supabase: SupabaseClient,
): Promise<Map<string, Float32Array> | null> {
  // 1. Check cache (TTL: 5 minutes)
  const cached = classroomEmbeddingCache.get(classroomId);
  if (cached && Date.now() - cached.generatedAt < 300_000) {
    return cached.embeddings;
  }

  // 2. Query montree_visual_memory for this classroom
  const { data } = await supabase
    .from('montree_visual_memory')
    .select('work_key, visual_description')
    .eq('classroom_id', classroomId)
    .not('visual_description', 'is', null);

  if (!data || data.length === 0) return null;

  // 3. Compute SigLIP text embeddings for each description
  const embeddings = new Map<string, Float32Array>();
  for (const row of data) {
    if (!row.work_key || !row.visual_description) continue;
    // Truncate to 512 chars (matching existing pattern)
    const desc = row.visual_description.slice(0, 512);
    const embedding = await pipeline(desc, { pooling: 'mean', normalize: true });
    if (embedding?.data) {
      embeddings.set(row.work_key, new Float32Array(embedding.data));
    }
  }

  // 4. Cache
  classroomEmbeddingCache.set(classroomId, {
    embeddings,
    generatedAt: Date.now(),
  });

  return embeddings;
}

// Export for cache invalidation
export function invalidateClassroomEmbeddings(classroomId: string): void {
  classroomEmbeddingCache.delete(classroomId);
}
```

**Performance note:** SigLIP text embedding is ~50ms per description. For 100 works = ~5 seconds. This is fine as a background rebuild but NOT per-request. Hence the 5-minute TTL cache.

#### Task 3.2: Modify `classifyImageInternal()`

Current flow:
```
Image → Stage 1 (area, generic embeddings) → Stage 2 (work, generic embeddings)
```

New flow:
```
Image → Stage 1 (area, generic embeddings — areas don't change per classroom)
      → Stage 2 (work, CLASSROOM embeddings if available, else generic)
```

**Changes:**
1. Accept optional `classroomId` and `supabase` parameters
2. After Stage 1 (area classification), check if classroom embeddings exist for that area's works
3. If yes: compare image embedding against classroom embeddings for works in that area
4. If no classroom embedding for a specific work: fall back to generic embedding
5. Return results with `embedding_source: 'classroom' | 'generic'` in ClassifyResult

**Critical:** Stage 1 (area classification) stays generic. Only Stage 2 (work within area) uses per-classroom embeddings.

#### Task 3.3: Pass classroomId Through the Pipeline

**Modify `classify-orchestrator.ts`:**
- `tryClassify()` already accepts `classroomId` — pass it through to `classifyImageInternal()`
- Also pass a Supabase client (for the visual memory query in getClassroomEmbeddings)

**Modify `photo-insight/route.ts`:**
- Already has `classroomId` available — make sure it's passed to `tryClassify()`
- Currently: `tryClassify(photoUrl, classroomId, visualMemories)` — classroomId is already there

#### Task 3.4: Cache Invalidation Triggers

Call `invalidateClassroomEmbeddings(classroomId)` when:
1. Teacher completes classroom setup for a work (Sprint 2)
2. Teacher corrects a misidentification (corrections/route.ts)
3. Visual memory is updated for any reason

Add the import and call to:
- `app/api/montree/classroom-setup/route.ts` (POST handler)
- `app/api/montree/guru/corrections/route.ts` (after visual memory upsert)
- `app/api/montree/guru/photo-insight/route.ts` (after first-capture learning)

---

### Sprint 4: Integration (2-3 hours)

#### Task 4.1: Wire Photo Audit "Use as Reference"

Add a button to each photo in Photo Audit: "📸 Use as Reference" (or similar). When tapped:
1. Takes the photo's existing work assignment (must have a work_id)
2. Sends photo to Sonnet description endpoint (same as classroom setup)
3. Saves to visual memory with `source: 'photo_audit'`, confidence 0.95
4. Triggers CLIP re-embedding for this classroom

This lets teachers promote any good photo to become the reference photo for that work, without leaving the audit page.

#### Task 4.2: Wire Report Descriptions

The report system uses `findBestDescription()` with a 5-step fallback chain. Add a new step at the TOP:
1. **NEW: Check `montree_visual_memory` for `parent_description`** → if exists, use it
2. Existing step 1: Check staticDescriptions map
3. Existing step 2: Check dbDescriptions from classroom curriculum
4. ... etc.

**Files to modify:**
- `app/api/montree/reports/preview/route.ts` — add visual memory query
- `app/api/montree/reports/send/route.ts` — same pattern

For Chinese locale: check if `parent_description` exists in visual memory first. If the description was generated in English, you could auto-translate with Haiku (cheap) or have the Sonnet prompt generate both languages during classroom setup.

#### Task 4.3: Wire Corrections to CLIP Re-Embedding

Currently, teacher corrections update visual memory (Haiku description) but don't trigger CLIP re-embedding.

**In `corrections/route.ts`**, after the visual memory upsert:
```typescript
import { invalidateClassroomEmbeddings } from '@/lib/montree/classifier/clip-classifier';
// After visual memory upsert succeeds:
invalidateClassroomEmbeddings(classroomId);
```

This ensures corrections improve both Haiku prompts AND CLIP embeddings.

---

### Sprint 5: Polish + Testing (1-2 hours)

#### Task 5.1: End-to-End Test
1. Go to classroom setup → photograph a work → confirm Sonnet description
2. Take a new photo of the same work from a different angle
3. Check Photo Audit → should now show as GREEN (not Amber)
4. Check Railway logs for `[CLIP]` entries showing classroom embedding used

#### Task 5.2: i18n
All new strings in EN + ZH. Estimate ~20-30 new keys for classroom setup page.

#### Task 5.3: Performance Check
- Embedding cache memory usage (100 works × 768 floats × 4 bytes = ~300KB per classroom — negligible)
- Rebuild timing (100 works × 50ms = ~5s — acceptable for background task)
- Verify cache invalidation works (modify visual memory → next classification uses new embedding)

#### Task 5.4: Dead Code Cleanup in Photo Audit
- Remove unused `pickerOpen` and `showAreaPicker` state variables
- Fix `t` in useCallback dependency array (already has eslint-disable, but verify)

---

## FILES REFERENCE

### New Files to Create (4-5):
| File | Purpose | Lines (est.) |
|------|---------|-------------|
| `app/montree/dashboard/classroom-setup/page.tsx` | Classroom setup page | ~500-600 |
| `app/api/montree/classroom-setup/route.ts` | GET works status, POST trigger description | ~150 |
| `app/api/montree/classroom-setup/describe/route.ts` | Sonnet vision description endpoint | ~200 |
| `migrations/147_smart_learning_columns.sql` | Add columns to visual_memory | ~10 |

### Files to Modify (7-9):
| File | What Changes | Risk |
|------|-------------|------|
| `lib/montree/classifier/clip-classifier.ts` | Add getClassroomEmbeddings(), modify classifyImageInternal() | HIGH — core classifier |
| `lib/montree/classifier/classify-orchestrator.ts` | Pass classroomId + supabase through | LOW |
| `app/api/montree/guru/photo-insight/route.ts` | Trigger CLIP invalidation on learn | LOW |
| `app/api/montree/guru/corrections/route.ts` | Trigger CLIP invalidation on correct | LOW |
| `app/montree/dashboard/photo-audit/page.tsx` | Fix curriculum loading, add "Use as Reference" | MEDIUM |
| `app/api/montree/audit/photos/route.ts` | Fix 500 on pagination | LOW |
| `app/api/montree/reports/preview/route.ts` | Add visual memory description lookup | LOW |
| `app/api/montree/reports/send/route.ts` | Same as preview | LOW |
| `components/montree/DashboardHeader.tsx` | Add classroom-setup nav link | LOW |

### Existing Files to Reuse As-Is:
- `montree_visual_memory` table (just adding columns)
- All CLIP infrastructure (SigLIP model, embeddings pipeline, cosine similarity)
- Visual memory injection in photo-insight route
- Correction → visual memory learning loop
- Auto-propose custom work flow (PROPOSE_CUSTOM_WORK_TOOL)
- WorkWheelPicker component
- CameraCapture component

---

## EXISTING CODE PATTERNS TO FOLLOW

### Sonnet Vision Call Pattern (from proposeCustomWork in photo-insight/route.ts):
```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514', // Use Sonnet, not Haiku
  max_tokens: 800,
  system: systemPrompt,
  tools: [DESCRIBE_WORK_TOOL],
  tool_choice: { type: 'tool', name: 'describe_work' },
  messages: [{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'url', url: photoUrl } },
      { type: 'text', text: 'Describe this Montessori work material...' },
    ],
  }],
});
```

### Visual Memory Upsert Pattern (from corrections/route.ts):
```typescript
await supabase
  .from('montree_visual_memory')
  .upsert({
    classroom_id: classroomId,
    work_name: workName,
    work_key: workKey,
    area: area,
    is_custom: false,
    visual_description: description,
    source: 'teacher_setup',
    source_media_id: mediaId,
    photo_url: photoUrl,
    description_confidence: 1.0,
  }, { onConflict: 'classroom_id,work_name' });
```

### CLIP Embedding Computation Pattern (from clip-classifier.ts initClassifier):
```typescript
const embedding = await pipeline(description, {
  pooling: 'mean',
  normalize: true,
});
const float32 = new Float32Array(embedding.data);
```

### Photo Upload Pattern (from capture/page.tsx):
```typescript
const formData = new FormData();
formData.append('file', blob, `work_reference_${Date.now()}.jpg`);
formData.append('child_id', childId); // or skip for reference photos
const res = await fetch('/api/montree/media/upload', {
  method: 'POST',
  body: formData,
});
```

---

## COST MODEL

| Phase | Per Event | One-Time per Classroom | Monthly at Scale (100 schools) |
|-------|-----------|----------------------|-------------------------------|
| **Classroom Setup (Sonnet)** | $0.03-0.06/work | $1.50-6.00 | $150-600 total (one-time) |
| **Daily Operation (CLIP hit ~80%)** | $0.00/photo | — | $0 |
| **Daily Operation (Haiku verify ~15%)** | $0.0004/photo | — | ~$30/month |
| **Daily Operation (Sonnet fallback ~5%)** | $0.06/photo | — | ~$150/month |
| **Total Steady State** | ~$0.001 avg | — | **~$180/month** |
| **Current (no Smart Learning)** | ~$0.01-0.06 avg | — | **$900-9,000/month** |

**Break-even: First week of operation.**

---

## BUILD ORDER SUMMARY

1. **Sprint 1** — Fix broken "Fix" button + audit API pagination + run migration 147
2. **Sprint 2** — Build classroom setup page + Sonnet description endpoint
3. **Sprint 3** — CLIP re-embedding engine (per-classroom embeddings) ⚠️ 3x3x3x3
4. **Sprint 4** — Wire everything together (corrections → CLIP, audit → reference, reports → descriptions)
5. **Sprint 5** — Polish, test, i18n

---

## WHAT WE'RE NOT DOING

- ❌ Multiple photos per work (one reference photo is enough — Sonnet is that good)
- ❌ New database tables (everything fits in existing `montree_visual_memory`)
- ❌ Rewriting the CLIP model (SigLIP stays, we just change input descriptions)
- ❌ Removing generic descriptions (they remain as fallback)
- ❌ Making setup mandatory (classrooms without setup still work with lower accuracy)
- ❌ Real-time Sonnet during daily operation (only during setup + rare fallbacks)

---

## CONTEXT FOR FRESH CHAT

**Production URL:** `https://montree.xyz`
**Git remote:** `git@github.com:Tredoux555/whale-class.git`
**Deploy:** Railway auto-deploys on push to `main`
**Cowork VM:** Disk is full (ENOSPC) — use Desktop Commander MCP to write to Mac at `/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/whale/`
**SSH key:** "Cowork VM Feb 15" — push via Mac terminal or Desktop Commander

**Key env vars:**
- `ANTHROPIC_API_KEY` — for Sonnet/Haiku calls
- `CLIP_CLASSIFIER_ENABLED` — kill switch for CLIP
- `CLIP_CANARY_PERCENT` — rollout percentage

**Test classroom:** Code V8F8V9 or X4RAT5 (the two active schools — don't delete these)

**CLAUDE.md:** Contains full project history. The fresh chat should read CLAUDE.md first for full context.
