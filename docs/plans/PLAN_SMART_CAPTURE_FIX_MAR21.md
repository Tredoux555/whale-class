# Smart Capture Fix Plan — Based on 20x Audit

**Date:** March 21, 2026
**Methodology:** Fix the 17 CRITICAL + 19 HIGH issues from the 20x audit
**Constraint:** VM disk full — Edit/Write only, no bash. Push from Mac.

---

## PHASE 1: Stop the Bleeding (Highest Impact, Lowest Risk)

### Fix 1.1 — Route-Level Timeouts (C-09, C-10, H-07)

**File: `app/api/montree/guru/photo-insight/route.ts`**
- Wrap entire POST handler in AbortController + 45s setTimeout
- Add separate 35s timeout for Sonnet vision call (C-10)
- clearTimeout in finally block

**File: `app/api/montree/guru/photo-enrich/route.ts`**
- Wrap entire POST handler in AbortController + 40s setTimeout
- clearTimeout in finally block

### Fix 1.2 — Null Guards on clipDecision (C-01, C-02)

**File: `app/api/montree/guru/photo-insight/route.ts`**
- Replace all `clipDecision.clipResult!` with `clipDecision.clipResult?.`
- Add null defaults for context_snapshot fields:
  ```
  clip_area_confidence: clipDecision.clipResult?.area_confidence ?? null,
  clip_runner_up: clipDecision.clipResult?.runner_up ?? null,
  clip_classification_ms: clipDecision.clipResult?.classification_ms ?? null,
  ```

### Fix 1.3 — State Variables After Await (C-03, C-04)

**File: `app/api/montree/guru/photo-insight/route.ts`**
- Move `autoUpdated = true` AFTER the progress upsert `await` succeeds (inside try, after await)
- Move `inChildShelf = true` AFTER the shelf upsert `await` succeeds
- Pattern:
  ```
  try {
    const { error } = await supabase.from('montree_child_progress').upsert({...});
    if (!error) autoUpdated = true; // ONLY on success
  } catch (err) { console.error(...); }
  ```

### Fix 1.4 — Photo-Enrich Try-Catch (C-07)

**File: `app/api/montree/guru/photo-enrich/route.ts`**
- Wrap progress upsert in try-catch
- On failure: log error, continue (don't crash the route)
- Set `auto_updated` flag only on success

---

## PHASE 2: Data Integrity

### Fix 2.1 — Shelf Depends on Progress (C-06)

**File: `app/api/montree/guru/photo-insight/route.ts`**
- Add guard: only auto-add to shelf IF progress update succeeded
- Pattern:
  ```
  if (autoUpdated && inClassroom && !inChildShelf) {
    // Only add to shelf if progress was actually updated
    try { ... shelf upsert ... if (!error) inChildShelf = true; }
  }
  ```

### Fix 2.2 — Media Tag Reliability (C-05, H-01, H-02)

**Both photo-insight and photo-enrich:**
- Change media tag from fire-and-forget to awaited with try-catch
- On failure: log but continue (media tag is non-critical)
- Pattern: `try { await supabase.from('montree_media').update({...}).eq('id', media_id); } catch { log }`

### Fix 2.3 — Correction Idempotency (C-08)

**File: `app/api/montree/guru/corrections/route.ts`**
- Add unique constraint check: query for existing correction with same media_id + corrected_work_name
- If exists: return 200 with existing correction (don't insert duplicate)
- Or use Supabase upsert with onConflict on media_id

### Fix 2.4 — Visual Memory Retry (C-17, H-18)

**Both photo-insight and corrections:**
- Change visual memory upsert from fire-and-forget to awaited with retry
- On first failure: retry once after 1s delay
- On second failure: log error and continue
- Don't block response — but DO await before returning

---

## PHASE 3: Contract Fixes

### Fix 3.1 — Candidates Area Field (C-16)

**File: `app/api/montree/guru/photo-insight/route.ts`**
- Line ~630: Change `area: clipDecision.clipResult!.runner_up.work_key` to
  `area: clipDecision.clipResult?.runner_up?.area ?? 'unknown'`

### Fix 3.2 — Skip-If-Tagged Response Shape (M-13)

**File: `app/api/montree/guru/photo-insight/route.ts`**
- Add missing fields to skip-if-tagged response:
  ```
  scenario: 'D',
  in_classroom: true,
  in_child_shelf: false,
  classroom_work_id: media.work_id,
  confidence: 1.0,
  match_score: 1.0,
  needs_confirmation: false,
  candidates: [],
  mastery_evidence: null,
  insight: work_name ? `${work_name} (pre-tagged)` : 'Photo saved',
  ```

### Fix 3.3 — STATUS_RANK Missing 'unclear' (M-15)

**File: `app/api/montree/guru/photo-enrich/route.ts`**
- Add `'unclear': 0` to STATUS_RANK object (same rank as unset)

### Fix 3.4 — Photo-Enrich Field Name (M-14)

**File: `app/api/montree/guru/photo-enrich/route.ts`**
- Change `confidence_final` to `confidence` in response object

---

## PHASE 4: Group Photos (DEFERRED — Separate Session)

Group photo support requires significant architecture changes. The current system processes one child per API call. Supporting multiple children requires:
1. Client-side loop calling startAnalysis for each child
2. API accepting child_id as required (no change needed — called per child)
3. Cache key including child_id
4. Per-child progress updates

**DECISION: Defer to separate session.** Current priority is fixing the single-child path to be bulletproof. Group photos are rare in practice (most teachers photograph individual children).

**Minimum fix for this session:**
- Add child_id to cache key (H-09): Change `photo:${media_id}:${locale}` to `photo:${media_id}:${child_id}:${locale}`
- This prevents cache poisoning across children

---

## PHASE 5: CLIP Hardening

### Fix 5.1 — Pipeline Mutex (C-12)

**File: `lib/montree/classifier/clip-classifier.ts`**
- Add module-level semaphore:
  ```
  let pipelineBusy: Promise<void> = Promise.resolve();
  ```
- Wrap classifyImage in serialization:
  ```
  export async function classifyImage(url: string) {
    return new Promise((resolve) => {
      pipelineBusy = pipelineBusy.then(async () => {
        resolve(await classifyImageInternal(url));
      }).catch(() => resolve(null));
    });
  }
  ```

### Fix 5.2 — Init Re-Entrance Guard (C-11)

**File: `lib/montree/classifier/clip-classifier.ts`**
- Add `let initInProgress = false;` module-level flag
- Guard initClassifier():
  ```
  if (initialized) return;
  if (initInProgress) { while (initInProgress) await sleep(50); return; }
  initInProgress = true;
  try { ... } finally { initInProgress = false; }
  ```

### Fix 5.3 — Init Timeout (M-09)

**File: `lib/montree/classifier/clip-classifier.ts`**
- Wrap model loading in 60s timeout
- On timeout: throw, let orchestrator handle retry

---

## PHASE 6: Cleanup

### Fix 6.1 — montreeApi Timeout (M-08)

**File: `lib/montree/photo-insight-store.ts`**
- Change `timeout: CLIENT_TIMEOUT_MS + 5000` to `timeout: CLIENT_TIMEOUT_MS`

### Fix 6.2 — Rate Limit Map Eviction (H-13)

**File: `app/api/montree/guru/photo-insight/route.ts`**
- Add timestamp-based eviction: delete entries older than 60 minutes
- Run eviction on every 100th request (not every request)

### Fix 6.3 — Custom Work Case Sensitivity (H-16)

**File: `app/api/montree/guru/photo-insight/route.ts`**
- Change `.eq('name', finalWorkName)` to `.ilike('name', finalWorkName)` for classroom lookup

### Fix 6.4 — Dead Code Cleanup (M-10)

**File: `lib/montree/classifier/clip-classifier.ts`**
- Remove unused `CLIP_HIGH_CONFIDENCE` constant

---

## IMPLEMENTATION ORDER

1. Phase 1 (Fixes 1.1-1.4) — Edit photo-insight + photo-enrich
2. Phase 2 (Fixes 2.1-2.4) — Edit photo-insight + photo-enrich + corrections
3. Phase 3 (Fixes 3.1-3.4) — Edit photo-insight + photo-enrich
4. Phase 4 (minimal: cache key fix only) — Edit photo-insight
5. Phase 5 (Fixes 5.1-5.3) — Edit clip-classifier
6. Phase 6 (Fixes 6.1-6.4) — Edit photo-insight-store + photo-insight + clip-classifier

Each phase gets 5x parallel audit agents after implementation.

---

## FILES MODIFIED

1. `app/api/montree/guru/photo-insight/route.ts` — Phases 1,2,3,4,6
2. `app/api/montree/guru/photo-enrich/route.ts` — Phases 1,2,3
3. `app/api/montree/guru/corrections/route.ts` — Phase 2
4. `lib/montree/classifier/clip-classifier.ts` — Phases 5,6
5. `lib/montree/photo-insight-store.ts` — Phase 6

**No new files. No migrations. No new dependencies.**
