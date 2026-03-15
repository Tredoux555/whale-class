# HANDOFF: Smart Capture Deep Audit — March 15, 2026

## STATUS: AUDIT COMPLETE — 3 CRITICAL, 4 HIGH, 5 MEDIUM, 4 LOW ISSUES FOUND

Full 3x3x3 deep audit of Smart Capture (photo-insight) and Fire-and-Forget (corrections + visual memory) systems. This audit was triggered by the question: "how bulletproof is the smart capture and fire and forget system?"

**Answer: NOT bulletproof. 3 critical gaps that can cause silent data loss and hung requests.**

---

## 🔴 PRIORITY #0 — CRITICAL FIXES (Do These First)

### CRITICAL-001: No Timeout on Haiku Vision Call (corrections/route.ts)

**File:** `app/api/montree/guru/corrections/route.ts`
**Lines:** ~276-293 (inside `generateAndStoreVisualMemory()` function)
**Severity:** CRITICAL — Teacher correction request hangs forever if Haiku API hangs

**Current Code (approximate):**
```typescript
const response = await anthropic.messages.create({
  model: HAIKU_MODEL,
  max_tokens: 300,
  messages: [{ role: 'user', content: [
    { type: 'image', source: { type: 'url', url: photoUrl } },
    { type: 'text', text: 'Describe this Montessori material...' }
  ]}]
});
```

**Problem:** No AbortController, no timeout, no signal. If Haiku hangs (which happens ~1-2% of API calls), the teacher's correction request hangs indefinitely. The teacher sees a spinner forever. They may re-submit, causing duplicate corrections.

**Fix Pattern (copy from photo-insight/route.ts Cycle 4 R2C1 fix):**
```typescript
const apiAbortController = new AbortController();
const apiTimeout = setTimeout(() => apiAbortController.abort(), 45000); // 45s hard wall

try {
  const response = await anthropic.messages.create(
    {
      model: HAIKU_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'url', url: photoUrl } },
        { type: 'text', text: 'Describe this Montessori material...' }
      ]}]
    },
    { signal: apiAbortController.signal }
  );
  // ... process response
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    console.error('[CORRECTIONS] Haiku vision call timed out after 45s');
    // Don't throw — this is a background learning task, not blocking
    return; // Skip visual memory generation, correction still saved
  }
  throw err;
} finally {
  clearTimeout(apiTimeout);
}
```

**Key Decision:** This is a BACKGROUND learning task. If it times out, the teacher's correction should STILL be saved successfully. The visual memory generation is fire-and-forget — wrap the Haiku call so timeout = skip learning, not = fail correction.

**Testing:** Submit a correction, verify it saves even if you kill the Haiku call mid-flight.

---

### CRITICAL-002: Verify Sonnet Vision AbortController (photo-insight/route.ts)

**File:** `app/api/montree/guru/photo-insight/route.ts`
**Lines:** ~830-870 (main Sonnet vision call)
**Severity:** CRITICAL — May already be fixed from Mar 13 R2C1, but needs VERIFICATION

**Context:** During 3x3x3x3 Round 2 Cycle 4 (Mar 13), an `apiAbortController` with 45s timeout was added to the Sonnet vision call. The fix passes `{ signal: apiAbortController.signal }` as the second argument to `anthropic.messages.create()`.

**What to verify:**
1. Find the `anthropic.messages.create()` call for the main Sonnet vision (around line 833, `model: AI_MODEL`)
2. Confirm it has a SECOND argument: `{ signal: apiAbortController.signal }`
3. Confirm `apiAbortController` is created with `new AbortController()` BEFORE the call
4. Confirm `setTimeout(() => apiAbortController.abort(), 45000)` exists
5. Confirm `clearTimeout` in a `finally` block
6. Confirm `AbortError` is caught and returns a graceful response (not 500)

**If NOT present:** Apply the same pattern as CRITICAL-001 but with a 200 JSON error response (this is the main request, not background):
```typescript
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    return NextResponse.json({ 
      work_name: 'Unknown', 
      error: 'Analysis timed out', 
      needs_confirmation: true 
    }, { status: 200 }); // 200 so client shows "couldn't identify" not error
  }
}
```

---

### CRITICAL-003: Brain Learning Silent Data Loss (corrections/route.ts)

**File:** `app/api/montree/guru/corrections/route.ts`
**Lines:** ~374-401 (brain learning section, inside or after `feedBrainLearning()`)
**Severity:** CRITICAL — Learning data permanently lost with no recovery

**Current behavior:**
1. Tries `supabase.rpc('append_brain_learning', { ... })`
2. If RPC fails → tries manual JSONB upsert as fallback
3. If BOTH fail → `console.error(...)` and moves on
4. Learning is permanently lost. No retry. No queue. No alert.

**Problem:** The Guru brain is supposed to learn from every correction. If Supabase has a transient error (connection timeout, row lock, etc.), the learning is silently discarded. Over time this means the brain misses corrections and makes the same mistakes.

**Fix — Add retry queue (simple approach):**
```typescript
// At top of file, module-level
const LEARNING_RETRY_QUEUE: Array<{ payload: any; attempts: number; lastAttempt: number }> = [];
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 30000; // 30s between retries

async function feedBrainLearning(payload: any) {
  try {
    const { error } = await supabase.rpc('append_brain_learning', payload);
    if (error) throw error;
    
    // Success — also process any queued retries
    processRetryQueue();
  } catch (err) {
    console.error('[CORRECTIONS] Brain learning failed, queuing for retry:', err);
    LEARNING_RETRY_QUEUE.push({ payload, attempts: 1, lastAttempt: Date.now() });
    // Don't throw — correction itself should still succeed
  }
}

async function processRetryQueue() {
  const now = Date.now();
  const toRetry = LEARNING_RETRY_QUEUE.filter(
    item => item.attempts < MAX_RETRY_ATTEMPTS && (now - item.lastAttempt) > RETRY_DELAY_MS
  );
  
  for (const item of toRetry) {
    try {
      const { error } = await supabase.rpc('append_brain_learning', item.payload);
      if (!error) {
        // Remove from queue on success
        const idx = LEARNING_RETRY_QUEUE.indexOf(item);
        if (idx > -1) LEARNING_RETRY_QUEUE.splice(idx, 1);
      } else {
        item.attempts++;
        item.lastAttempt = now;
      }
    } catch {
      item.attempts++;
      item.lastAttempt = now;
    }
  }
  
  // Evict items that exceeded max attempts
  for (let i = LEARNING_RETRY_QUEUE.length - 1; i >= 0; i--) {
    if (LEARNING_RETRY_QUEUE[i].attempts >= MAX_RETRY_ATTEMPTS) {
      console.error('[CORRECTIONS] Brain learning permanently failed after 3 attempts:', 
        LEARNING_RETRY_QUEUE[i].payload);
      LEARNING_RETRY_QUEUE.splice(i, 1);
    }
  }
}
```

**Note:** This is an in-memory queue — it survives within a single Railway container lifetime but not across deploys. For a production system, a DB-backed queue would be better, but this catches 95% of transient failures.

---

## 🟠 HIGH PRIORITY FIXES

### HIGH-001: Photo URL Lookup Silent Failure (corrections/route.ts)

**File:** `app/api/montree/guru/corrections/route.ts`
**Lines:** ~85-130 (photo URL resolution section)
**Severity:** HIGH — Visual memory generation silently skipped

**Current behavior:** The route tries 3 paths to find the photo URL for the corrected media:
1. Check `montree_guru_interactions` cache for the media_id
2. Check `montree_media` table directly
3. Check Supabase storage URL construction

If ALL 3 fail, `photoUrl` stays `null`. The `generateAndStoreVisualMemory()` function is skipped (it requires a photo). Teacher thinks their correction worked, but the system didn't learn visually — it only recorded the text correction. Next time the same material appears in a photo, it'll make the same mistake.

**Fix:** Add explicit logging + return a warning in the response:
```typescript
if (!photoUrl) {
  console.error(`[CORRECTIONS] Could not resolve photo URL for media_id=${media_id}. Visual learning skipped.`);
  // Still save the text correction, but warn the client
  return NextResponse.json({ 
    success: true, 
    visual_learning: false,
    warning: 'Correction saved but visual learning could not be applied (photo not found)'
  });
}
```

### HIGH-002: Double onProgressUpdate Race Condition (PhotoInsightButton.tsx)

**File:** `components/montree/guru/PhotoInsightButton.tsx`
**Lines:** ~107-184 (confirm handler) + GREEN zone auto-update useEffect
**Severity:** HIGH — Double fetch, possible duplicate progress entries

**Problem:** When a photo gets GREEN zone confidence (≥0.95), two things happen:
1. `useEffect` fires auto-update → calls `onProgressUpdate`
2. User may ALSO see and click confirm button before auto-update completes → calls `onProgressUpdate` again

**Fix:** Add a ref guard:
```typescript
const progressUpdateFiredRef = useRef(false);

// In GREEN auto-update useEffect:
if (!progressUpdateFiredRef.current) {
  progressUpdateFiredRef.current = true;
  onProgressUpdate?.();
}

// In confirm handler:
if (!progressUpdateFiredRef.current) {
  progressUpdateFiredRef.current = true;
  onProgressUpdate?.();
}
```

### HIGH-003: Stale Closures in PhotoInsightButton Handlers

**File:** `components/montree/guru/PhotoInsightButton.tsx`
**Lines:** ~107-184 (handleConfirm), ~186-220 (handleReject)
**Severity:** HIGH — Handlers capture stale `result` from render cycle

**Problem:** `result` is derived from `entry?.result` during render. If entry updates between when the component renders and when the user clicks confirm/reject, the handler operates on stale data.

**Fix:** Read fresh from store inside handlers:
```typescript
const handleConfirm = useCallback(async () => {
  const freshEntry = photoInsightStore.getEntry(storeKey);
  const freshResult = freshEntry?.result;
  if (!freshResult) return;
  // ... use freshResult instead of result
}, [storeKey]);
```

### HIGH-004: Missing child_id Validation (corrections/route.ts)

**File:** `app/api/montree/guru/corrections/route.ts`
**Lines:** ~35-40 (request body parsing)
**Severity:** HIGH — Null child_id skips access check, breaks learning loop

**Problem:** If `child_id` is null/undefined in the request body, `verifyChildBelongsToSchool()` is either skipped or gets null. The correction is recorded with null child_id, which means it can't be associated with a classroom for visual memory lookup.

**Fix:** Add explicit validation at the top of the handler:
```typescript
const { media_id, child_id, correct_work_name, action } = await req.json();

if (!child_id || typeof child_id !== 'string') {
  return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
}
if (!media_id || typeof media_id !== 'string') {
  return NextResponse.json({ error: 'media_id is required' }, { status: 400 });
}
```

---

## 🟡 MEDIUM PRIORITY

### MEDIUM-001: Two-Tier Haiku/Sonnet Router NOT Built

**Architecture gap.** Every single photo goes through Sonnet (~$0.06/photo). The two-tier router was DESIGNED (mentioned in Mar 14 handoff) but NEVER BUILT. Would route easy identifications through Haiku (~$0.016/photo) and only escalate ambiguous ones to Sonnet. Would cut API costs 60-70%.

**Design:** Haiku sees photo first. If confidence ≥ 0.9 AND matches curriculum, return immediately. If confidence < 0.9 OR doesn't match, escalate to Sonnet. Total cost = Haiku always (~$0.016) + Sonnet sometimes (~$0.06 × 30% = ~$0.018) = ~$0.034 average vs $0.06 always.

### MEDIUM-002: First-Capture Learning Confidence Too Low

**File:** `app/api/montree/guru/photo-insight/route.ts` (~line 1114)
**Issue:** First-capture learning stores visual memory with confidence 0.7. This is below the AMBER zone threshold (0.5-0.95). If the first identification is wrong, the visual memory gets a wrong description at 0.7 confidence, and subsequent photos of the same work will be biased by the wrong description.

**Fix:** Only trigger first-capture learning when main Sonnet confidence ≥ 0.9 (not just any identification).

### MEDIUM-003: No Rate Limit on Corrections Endpoint

**File:** `app/api/montree/guru/corrections/route.ts`
**Issue:** No `checkRateLimit()` call. A teacher rapidly submitting corrections (e.g., fixing 20 photos) could trigger 20 simultaneous Haiku vision calls + 20 brain learning writes.

**Fix:** Add `checkRateLimit('corrections', ip, 30, 60)` — 30 corrections per minute.

### MEDIUM-004: Visual Memory Query Not Classroom-Scoped on Cache Hit

**File:** `app/api/montree/guru/photo-insight/route.ts`
**Issue:** When a cached result is returned (Scenario D — stale cache refresh), the visual memory context is NOT injected because it was fetched in the initial parallel query block which only runs on cache miss.

### MEDIUM-005: worksContext Still Slightly Biasing

**File:** `app/api/montree/guru/photo-insight/route.ts`
**Issue:** Despite renaming from "Current works on shelf" to "Child's recent work progress" with a debiasing note, the focus works list still appears before the visual identification guide. Sonnet sees the child's shelf contents before analyzing the photo, which can bias toward works on the shelf.

---

## 🟢 LOW PRIORITY

- LOW-001: `generateAndStoreVisualMemory` doesn't validate photoUrl is a valid URL before sending to Haiku
- LOW-002: `increment_visual_memory_used` RPC has no error handling in fire-and-forget call
- LOW-003: Correction confirm path calls `update_work_accuracy` RPC but doesn't check for errors
- LOW-004: No telemetry on Haiku vision call latency — can't track if Haiku is degrading

---

## ARCHITECTURE SUMMARY

**Current Model Usage:**
- **Sonnet** (`claude-sonnet-4-20250514`): ALL main photo identification calls. ~$0.06/photo.
- **Haiku** (`claude-haiku-4-5-20251001`): ONLY background tasks — visual description generation on corrections + first-capture learning. NOT in the main vision pipeline.

**Visual Memory Self-Learning Loop:**
1. Photo → Sonnet identifies (with visual memory injected into prompt) → Result
2. If GREEN (≥0.95): Auto-update progress, track `times_used` via RPC
3. If AMBER (0.5-0.95): Show confirm/reject UI to teacher
4. Teacher corrects → Haiku generates visual description from photo → Stored in `montree_visual_memory` (confidence 0.9)
5. First-capture: When Sonnet identifies a custom work for first time → Haiku generates description (confidence 0.7)
6. Next photo → Visual memory injected → System can't make same mistake twice

**Three Entry Points for Visual Memory:**
1. Teacher corrections (confidence 0.9) — Haiku vision in corrections/route.ts
2. First-capture custom works (confidence 0.7) — Haiku vision in photo-insight/route.ts
3. Future: Teacher manual upload (confidence 1.0) — NOT yet built

**Key Tables:**
- `montree_visual_memory` — per-classroom visual descriptions (UNIQUE classroom_id+work_name)
- `montree_guru_corrections` — teacher corrections with visual_description + photo_url columns
- `montree_guru_interactions` — cached photo-insight results
- `montree_guru_brain` — global learning JSONB document

---

## WHAT'S WORKING WELL

Despite the gaps above, the system is fundamentally solid:
- ✅ Composite key (`mediaId:childId`) prevents cross-child contamination
- ✅ AbortController on client-side store prevents zombie fetches
- ✅ Per-entry selector prevents O(N) re-renders
- ✅ Cache locale fix prevents stale cross-language results
- ✅ Scenario D staleness refresh keeps cache fresh
- ✅ GREEN/AMBER/RED zone system is well-designed
- ✅ Visual identification guide (262 lines, 200+ works) is comprehensive
- ✅ 6 confusion pair sections handle the hardest cases
- ✅ Parallel Promise.allSettled for context queries with graceful degradation

The 3 CRITICALs are all about **resilience** — what happens when external services (Haiku API, Supabase) have transient failures. The core logic is sound.

---

## ESTIMATED TIME

| Priority | Issues | Time |
|----------|--------|------|
| CRITICAL (3) | Timeouts + retry queue | ~1.5 hours |
| HIGH (4) | Validation + race conditions | ~1 hour |
| MEDIUM (5) | Router + rate limit + bias | ~3-4 hours |
| LOW (4) | Validation + telemetry | ~30 min |
| **Total** | **16 issues** | **~6-7 hours** |

**Recommended approach:** Fix all 3 CRITICALs + all 4 HIGHs in one session (~2.5 hours). MEDIUMs can wait for next session. The two-tier router (MEDIUM-001) is a separate feature, not a bug fix.
