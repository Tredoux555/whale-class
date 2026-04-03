# Handoff: CLIP No Match + Story Photo Fix + Child Tagger Bug — Apr 3, 2026

## Session Summary

Three issues worked on this session:
1. **CLIP classifier "No match"** — CRITICAL, not yet resolved
2. **Story user photo upload** — FIXED and deployed
3. **Child tagger modal pre-selection** — Bug diagnosed, not yet fixed

---

## Issue 1: CLIP Classifier Returns "No match" (CRITICAL — UNRESOLVED)

### Context
The CLIP/SigLIP classifier was broken because the original `pipeline('feature-extraction')` approach defaulted to the vision encoder and crashed on text input. Commit `e2192214` rewrote it to use separate `SiglipTextModel` + `SiglipVisionModel` from `@xenova/transformers`.

The server deployed successfully and starts without crashing. But when teachers take photos, CLIP shows **"No match" with reason `clip_no_result`** on the photo audit page.

### What "clip_no_result" Means
In `photo-insight/route.ts`, when `tryClassify()` (from classify-orchestrator.ts) returns null, the photo falls through to the two-pass Haiku pipeline. The photo audit page then shows "CLIP result: No match, reason: clip_no_result".

### Root Cause Analysis (Ranked by Likelihood)

**1. MOST LIKELY (70%): Initialization failure cached permanently**
- `initClassifier()` in `clip-classifier.ts` loads ONNX models via `SiglipTextModel.from_pretrained('Xenova/siglip-base-patch16-224')` etc.
- On first call, models must download (~100MB+) from Hugging Face Hub
- Railway containers have limited memory + cold start time
- If init fails (timeout, OOM, network), `initializationError` is set and **permanently cached** — all future calls immediately throw the cached error
- The orchestrator catches this and returns null → clip_no_result
- **Key**: There's no retry mechanism after cached error (lines 325-329 re-throw immediately)

**2. Model Output Structure Mismatch (15%)**
- `embedText()` destructures `{ pooler_output }` from `textModel(inputs)`
- `embedImage()` destructures `{ pooler_output }` from `visionModel(imageInputs)`
- If `@xenova/transformers` version doesn't return `pooler_output` for SigLIP separate models, these return null
- Check: `pooler_output?.data` — the `?.` means it fails silently

**3. RawImage.fromURL() Fails Silently (10%)**
- Image download from Supabase storage URL could fail
- No timeout guard on image download
- Returns null → classification returns null

**4. All Embeddings Below Threshold (5%)**
- Even if everything works, if text embeddings from separate models produce different values than the pipeline approach, cosine similarities might all be below the 0.5 area threshold or 0.75 work threshold

### Diagnostic Steps for Tomorrow

**Step 1: Check Railway logs**
Look for these log lines after a photo is taken:
- `[CLIP] Loading text model: Xenova/siglip-base-patch16-224` — init started
- `[CLIP] Text model loaded successfully` — text model OK
- `[CLIP] Vision model loaded successfully` — vision model OK
- `[CLIP] Initialization complete` — all embeddings pre-computed
- `[CLIP] Initialization failed:` — **THIS IS THE SMOKING GUN**
- `[CLIP] Classification error:` — runtime classification error

**Step 2: If init IS failing, fix the retry mechanism**
Remove the permanent error cache. Change lines 325-329 from:
```typescript
if (initializationError) {
  throw initializationError; // Re-throw cached error
}
```
To a TTL-based retry (e.g., retry after 5 minutes).

**Step 3: If init succeeds but classification fails, add diagnostic logging**
Add temp logging to `classifyImageInternal()`:
- After `embedImage()` — log whether embedding is null
- After `findBestMatch(areaEmbeddings, ...)` — log best area + score
- After work matching — log best work + score

**Step 4: Verify model output structure**
Add a one-time test log in `embedText()`:
```typescript
const result = await textModel(inputs);
console.log('[CLIP DEBUG] textModel output keys:', Object.keys(result));
```
Same for `visionModel`. If `pooler_output` isn't in the keys, that's the bug.

**Step 5: If models are too large for Railway**
- Check Railway memory usage during init
- Consider downgrading to a smaller model or pre-computing embeddings offline

### Key Files
- `lib/montree/classifier/clip-classifier.ts` — Core classifier (init, embedText, embedImage, classify)
- `lib/montree/classifier/classify-orchestrator.ts` — Kill switch, canary, routing
- `app/api/montree/guru/photo-insight/route.ts` — Where CLIP is called from (search "tryClassify")
- `lib/montree/classifier/work-signatures.ts` — 270 work descriptions for text embeddings

### Kill Switch / Canary
- `CLIP_CLASSIFIER_ENABLED` env var — set to 'false' to disable CLIP entirely
- `CLIP_CANARY_PERCENT` env var — default 100 (all photos go through CLIP)
- Both checked in classify-orchestrator.ts

---

## Issue 2: Story User Photo Upload — ✅ FIXED

### Problem
Photos sent from mobile user didn't appear for the other user. Admin-sent photos worked fine.

### Root Cause
`app/api/story/upload-media/route.ts` had two bugs:
1. **DB insert error silently swallowed** — `await supabase.from(...).insert({...})` with NO `const { error } =` destructuring. If insert failed, endpoint returned `{ success: true }` anyway.
2. **Missing `is_expired: false`** — Admin send route includes it explicitly, user upload route didn't.

### Fix
- Added `const { error: insertError } = await supabase...`
- Added `is_expired: false` to insert object
- Added error check: `if (insertError) return 500`

### Deploy
Commit `33929652`, pushed via Desktop Commander, Railway auto-deploying.

---

## Issue 3: Child Tagger Modal Pre-Selection Bug — DIAGNOSED, NOT FIXED

### Problem
Opening "Tag Children" modal on a photo that already has Austin tagged shows Austin's checkbox as unchecked.

### Root Cause
In `photo-audit/page.tsx` line 544:
```typescript
setTaggingSelection(new Set(photo.child_ids || (photo.child_id ? [photo.child_id] : [])));
```

The audit photos API returns `child_ids: []` (empty array) when there are no junction table entries — but the photo's primary `child_id` IS set. An empty array `[]` is **truthy** in JavaScript, so the `||` fallback to `photo.child_id` never triggers.

### Fix (Not Yet Applied)
Change to:
```typescript
setTaggingSelection(new Set(
  photo.child_ids?.length ? photo.child_ids : (photo.child_id ? [photo.child_id] : [])
));
```

Or ensure the API includes the primary `child_id` in `child_ids` array when building `allChildIds`.

---

## Tomorrow's Mission (Priority Order)

1. **CLIP diagnosis** — Check Railway logs for init errors. If init is failing, fix retry mechanism. If init succeeds, add diagnostic logging to trace where classification returns null. This is the #1 priority.

2. **Child tagger pre-selection** — Quick fix, apply the `.length` check described above.

3. **Verify Story photo fix** — Have the user's partner test sending a photo from mobile again.
