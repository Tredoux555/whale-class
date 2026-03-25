# Sprint 3: CLIP Per-Classroom Re-Embedding Engine — Plan v2

## Revised after Plan Audit #1 (3 agents, critical findings incorporated)

---

## Goal

Replace generic 270-work text embeddings with **per-classroom embeddings** derived from teacher-photographed reference materials in `montree_visual_memory`. When a classroom has a visual memory entry with a rich `visual_description`, CLIP uses THAT description for the embedding instead of the generic work-signatures description. This makes CLIP "see" what each material actually looks like in THAT specific classroom.

## Architecture (Revised)

### Core Principle: Layered Override

```
Generic embeddings (textEmbeddings Map, 270 works)     ← populated during initClassifier()
  ↓ overridden by
Per-classroom embeddings (classroomEmbeddingCache)      ← populated lazily per classroomId
  ↓ used during
classifyImageInternal() Stage 2 + cross-area fallback   ← looks up per-classroom FIRST, falls back to generic
```

### Critical Constraint: ONNX Thread Safety

SigLIP's ONNX Runtime is **NOT thread-safe**. All `pipeline()` calls (image inference AND text embedding) MUST serialize through the existing `pipelineQueue` mutex. This means:

1. `buildClassroomEmbeddings()` chains onto `pipelineQueue`
2. `pipelineQueue` type widened from `Promise<ClassifyResult | null>` to `Promise<unknown>`
3. A concurrent photo classification will wait until embedding build completes (and vice versa)

### Data Flow: No Supabase in Classifier

The classifier module (`clip-classifier.ts`) has **zero supabase imports** today. We keep it that way. Visual memory descriptions are:

1. Pre-fetched by the **caller** (photo-insight route already fetches them at line 664)
2. Passed to `classifyImageWithMemory()` which already receives `VisualMemory[]`
3. `classifyImageWithMemory()` calls new `ensureClassroomEmbeddings(classroomId, visualMemories)` before running classification

---

## Changes (4 files)

### File 1: `lib/montree/classifier/clip-classifier.ts` (~8 edits)

**Edit 1: Widen pipelineQueue type (line 65)**
```typescript
// BEFORE:
let pipelineQueue: Promise<ClassifyResult | null> = Promise.resolve(null);
// AFTER:
let pipelineQueue: Promise<unknown> = Promise.resolve(null);
```

**Edit 2: Add per-classroom embedding cache (after line 59)**
```typescript
// Per-classroom embedding overrides: classroomId -> (work_key -> Float32Array)
// When a classroom has visual memories with descriptions, we re-embed using THOSE
// descriptions instead of the generic work-signatures. LRU eviction at 50 classrooms.
const classroomEmbeddingCache = new Map<string, {
  embeddings: Map<string, Float32Array>;
  createdAt: number;
  workCount: number;
}>();
const CLASSROOM_CACHE_MAX = 50;
const CLASSROOM_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
```

**Edit 3: Add `ensureClassroomEmbeddings()` function (new function, after cache declaration)**

This function:
- Checks if classroomId already has cached embeddings (within TTL)
- If not, chains a text-embedding job onto `pipelineQueue` to serialize with ONNX
- Only re-embeds works that have a `visual_description` in the visual memories
- Generic embeddings remain for works WITHOUT visual memory entries

```typescript
async function ensureClassroomEmbeddings(
  classroomId: string,
  visualMemories: VisualMemory[],
): Promise<Map<string, Float32Array>> {
  // Return cached if fresh
  const cached = classroomEmbeddingCache.get(classroomId);
  if (cached && (Date.now() - cached.createdAt) < CLASSROOM_CACHE_TTL_MS) {
    return cached.embeddings;
  }

  // Filter to memories with actual descriptions (not empty)
  const memoriesWithDescriptions = visualMemories.filter(
    vm => vm.visual_description && vm.visual_description.length >= 20 && vm.work_key
  );

  if (memoriesWithDescriptions.length === 0) {
    return new Map(); // No overrides needed
  }

  // Build embeddings through the pipelineQueue mutex (ONNX thread safety)
  const classroomMap = await new Promise<Map<string, Float32Array>>((resolve) => {
    pipelineQueue = pipelineQueue.then(async () => {
      // Double-check cache after acquiring mutex (another request may have built it)
      const recheck = classroomEmbeddingCache.get(classroomId);
      if (recheck && (Date.now() - recheck.createdAt) < CLASSROOM_CACHE_TTL_MS) {
        resolve(recheck.embeddings);
        return;
      }

      if (!pipeline) {
        resolve(new Map());
        return;
      }

      console.log(`[CLIP] Building per-classroom embeddings for ${classroomId} (${memoriesWithDescriptions.length} works)`);
      const startMs = Date.now();
      const embMap = new Map<string, Float32Array>();

      for (const vm of memoriesWithDescriptions) {
        try {
          const prompt = `${vm.work_name}. ${vm.visual_description}`.slice(0, 512);
          const embedding = await pipeline(prompt, { pooling: 'mean', normalize: true });
          if (embedding?.data) {
            embMap.set(vm.work_key, new Float32Array(embedding.data));
          }
        } catch (err) {
          console.warn(`[CLIP] Failed to embed visual memory for ${vm.work_key}:`, err);
        }
      }

      // LRU eviction: remove oldest if over limit
      if (classroomEmbeddingCache.size >= CLASSROOM_CACHE_MAX) {
        let oldestKey = '';
        let oldestTime = Infinity;
        for (const [key, entry] of classroomEmbeddingCache) {
          if (entry.createdAt < oldestTime) {
            oldestTime = entry.createdAt;
            oldestKey = key;
          }
        }
        if (oldestKey) classroomEmbeddingCache.delete(oldestKey);
      }

      classroomEmbeddingCache.set(classroomId, {
        embeddings: embMap,
        createdAt: Date.now(),
        workCount: embMap.size,
      });

      console.log(`[CLIP] Built ${embMap.size} per-classroom embeddings in ${Date.now() - startMs}ms`);
      resolve(embMap);
      return; // Return void to pipelineQueue (type is Promise<unknown> now)
    }).catch((err) => {
      console.error('[CLIP] Classroom embedding build error:', err);
      resolve(new Map());
    });
  });

  return classroomMap;
}
```

**Edit 4: Add `invalidateClassroomEmbeddings()` export (new function)**
```typescript
/** Invalidate cached per-classroom embeddings when visual memory changes */
export function invalidateClassroomEmbeddings(classroomId: string): void {
  if (classroomEmbeddingCache.delete(classroomId)) {
    console.log(`[CLIP] Invalidated classroom embedding cache for ${classroomId}`);
  }
}
```

**Edit 5: Modify `classifyImageInternal()` to accept + use classroom embeddings**

Add optional parameter:
```typescript
async function classifyImageInternal(
  imageUrl: string,
  startTime: number,
  classroomOverrides?: Map<string, Float32Array>, // Per-classroom embedding overrides
): Promise<ClassifyResult | null> {
```

In Stage 2 work comparison loop (line 390), change embedding lookup:
```typescript
// BEFORE:
const workVec = textEmbeddings.get(work.work_key);
// AFTER:
const workVec = classroomOverrides?.get(work.work_key) || textEmbeddings.get(work.work_key);
```

Same change in cross-area fallback loop (line 423):
```typescript
// BEFORE:
const workVec = textEmbeddings.get(work.work_key);
// AFTER:
const workVec = classroomOverrides?.get(work.work_key) || textEmbeddings.get(work.work_key);
```

**Edit 6: Modify `classifyImage()` to accept + pass classroom overrides**

```typescript
export async function classifyImage(
  imageUrl: string,
  classroomOverrides?: Map<string, Float32Array>,
): Promise<ClassifyResult | null> {
  // ... existing guards ...
  // In the pipelineQueue chain:
  const classificationResult = await Promise.race([
    classifyImageInternal(imageUrl, startTime, classroomOverrides),
    timeoutPromise,
  ]);
```

**Edit 7: Modify `classifyImageWithMemory()` to build + pass classroom embeddings**

```typescript
export async function classifyImageWithMemory(
  imageUrl: string,
  classroomId: string,
  visualMemories?: VisualMemory[]
): Promise<ClassifyResult | null> {
  // Build per-classroom embeddings if visual memories provided
  let classroomOverrides: Map<string, Float32Array> | undefined;
  if (classroomId && visualMemories && visualMemories.length > 0) {
    classroomOverrides = await ensureClassroomEmbeddings(classroomId, visualMemories);
    if (classroomOverrides.size === 0) classroomOverrides = undefined;
  }

  const result = await classifyImage(imageUrl, classroomOverrides);
  if (!result) return result;

  // ... existing visual memory confidence boost logic unchanged ...
```

**Edit 8: Add `getClassroomEmbeddingStats()` to diagnostics**

In `getClassifierStats()`:
```typescript
classroom_caches: classroomEmbeddingCache.size,
```

### File 2: `lib/montree/classifier/index.ts` (~1 edit)

**Edit 1: Add new export**
```typescript
export {
  // ... existing exports ...
  invalidateClassroomEmbeddings,
} from './clip-classifier';
```

### File 3: `app/api/montree/classroom-setup/route.ts` (~1 edit)

**Edit 1: Add invalidation after upsert (after line 176 upsert block)**
```typescript
import { invalidateClassroomEmbeddings } from '@/lib/montree/classifier';

// After successful upsert:
invalidateClassroomEmbeddings(auth.classroomId);
```

### File 4: `app/api/montree/guru/corrections/route.ts` (~1 edit)

**Edit 1: Add invalidation after visual memory upsert**
```typescript
import { invalidateClassroomEmbeddings } from '@/lib/montree/classifier';

// Inside generateAndStoreVisualMemory(), after successful upsert:
invalidateClassroomEmbeddings(classroomId);
```

### NOT modified: `app/api/montree/guru/photo-insight/route.ts`

The photo-insight route's first-capture learning (line 1977 upsert) is fire-and-forget with confidence 0.7. The invalidation isn't critical here since:
- The classroom setup (confidence 1.0) and corrections (confidence 0.9) are the primary learning paths
- First-capture descriptions are lower confidence and will be overridden
- Adding invalidation here could cause unnecessary re-embedding on every photo
- Can add in Sprint 4 if needed

---

## Memory Budget

- Each Float32Array = 768 dims × 4 bytes = 3,072 bytes (~3KB)
- Per classroom: ~50 works × 3KB = 150KB
- Cache max 50 classrooms: 50 × 150KB = 7.5MB
- Acceptable for a server process (Railway containers have 512MB+)

## Timing Impact

- Building embeddings for 50 works: ~50 × 50ms = ~2.5s (one-time per 30min TTL)
- While building, classification requests queue behind the mutex — adds 2.5s latency to first photo
- Subsequent photos within 30min: zero overhead (cache hit)
- Worst case: if build happens mid-classification, both complete sequentially (~5s total)

## Risk Mitigations

1. **ONNX crash**: If embedding build fails mid-way, catch block resolves with empty Map → falls back to generic embeddings
2. **Memory pressure**: LRU eviction at 50 classrooms, 30-min TTL auto-expires stale entries
3. **Empty descriptions**: Filter requires `visual_description.length >= 20` — short/empty descriptions skip
4. **Stale cache**: Invalidation on classroom-setup and corrections; TTL auto-expires after 30 minutes
5. **Production safety**: All changes confined to classifier module + 2 invalidation calls. Zero API route logic changes. Graceful fallback at every level.
