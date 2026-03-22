# Smart Capture 20x Audit — Master Bug List

**Date:** March 21, 2026
**Methodology:** 11 parallel audit agents, each examining from a different angle
**Scope:** All Smart Capture files (photo-insight, photo-enrich, clip-classifier, classify-orchestrator, photo-insight-store, sync-manager, capture page, corrections)

---

## MASTER BUG LIST — 67 Issues Found

### Tier 1: CRITICAL (17 issues)

| ID | Audit | File | Lines | Issue | Impact |
|----|-------|------|-------|-------|--------|
| C-01 | Error | photo-insight/route.ts | 598-600 | **Forced non-null `clipDecision.clipResult!` without guard** — If CLIP returned null/failed, accessing `.area_confidence`, `.runner_up`, `.classification_ms` crashes with TypeError | 500 error; photo stuck "analyzing" forever |
| C-02 | Error | photo-insight/route.ts | 587-615 | **Fire-and-forget interaction insert with unsafe snapshots** — `clipResult!` force-unwrap can crash entire context_snapshot creation | Unhandled exception kills request |
| C-03 | Error | photo-insight/route.ts | 553-565 | **`autoUpdated = true` set INSIDE try block BEFORE await completes** — If upsert fails, catch logs but `autoUpdated` already true. Response lies about auto-update | Client thinks progress updated when it didn't |
| C-04 | Error | photo-insight/route.ts | 569-583 | **`inChildShelf = true` set BEFORE shelf upsert awaits** — Same pattern: response claims shelf add succeeded even on failure | Work appears on shelf in UI but isn't in DB |
| C-05 | DB | photo-insight/route.ts | 536-565 | **Media tag + progress update NOT atomic** — Media tagged fire-and-forget, progress awaited separately. Either can fail independently | Photo tagged but progress not updated, or vice versa |
| C-06 | DB | photo-insight/route.ts | 1517-1557 | **Shelf add doesn't depend on progress success** — Shelf upsert fires regardless of whether progress upsert succeeded | Work on shelf with NO progress record |
| C-07 | DB | photo-enrich/route.ts | 297-307 | **Progress upsert has NO try-catch** — Error bubbles to outer catch, returns 500. Media tag and interaction save never fire | Route crashes; photo enriched but nothing saved |
| C-08 | DB | corrections/route.ts | 162-180 | **No idempotency on correction insert** — Teacher retries correction → duplicate records → EMA accuracy poisoned by double-counting | Accuracy metrics corrupted |
| C-09 | Timeout | photo-insight/route.ts | entire | **No route-level timeout** — If Sonnet hangs, server continues burning resources after client gave up at 50s | Wasted CPU/memory; leaked connections |
| C-10 | Timeout | photo-insight/route.ts | ~838 | **Sonnet vision call has NO timeout protection** — Has AbortController signal but no setTimeout to trigger abort | Sonnet can hang indefinitely |
| C-11 | Race | clip-classifier.ts | 143-234 | **No re-entrance guard on initClassifier()** — Two concurrent calls can double-load model and embeddings | Wasted memory (50MB×2); potential corruption |
| C-12 | Race | clip-classifier.ts | 282-285 | **Concurrent pipeline calls not serialized** — ONNX pipeline is stateful; two simultaneous inference calls can corrupt embeddings | Wrong work identification |
| C-13 | Race | photo-insight/route.ts | 541-584 | **Progress + shelf are two separate transactions** — Concurrent photos of same child can race on progress/shelf writes | Inconsistent state between progress and shelf |
| C-14 | Group | photo-insight/route.ts | 191-206 | **API only accepts single child_id** — Group photos with multiple children only analyze for FIRST child | Other children get ZERO analysis or progress |
| C-15 | Group | capture/page.tsx | 129-215 | **startAnalysis() never called for group photos** — No loop over child_ids | Group photo analysis completely missing |
| C-16 | Contract | photo-insight/route.ts | 630 | **Candidates `area` field uses `work_key` instead of `area_key`** — CLIP path builds candidates with wrong field | UI shows undefined area for CLIP-identified works |
| C-17 | DB | photo-insight/route.ts | 1569-1630 | **Visual memory fire-and-forget with no retry** — Haiku generates description but upsert fails silently | System can't learn; visual memory permanently lost |

### Tier 2: HIGH (19 issues)

| ID | Audit | File | Lines | Issue | Impact |
|----|-------|------|-------|-------|--------|
| H-01 | Error | photo-insight/route.ts | 536-538 | Fire-and-forget media update — no guard against stale media_id | Photo analyzed but remains untagged |
| H-02 | Error | photo-enrich/route.ts | 314-319 | Fire-and-forget media tag — same pattern as H-01 | Media stays untagged despite enrichment |
| H-03 | Error | photo-enrich/route.ts | 336-347 | Fire-and-forget interaction save can lose data | No analytics, no caching for this photo |
| H-04 | Error | photo-insight-store.ts | 249-281 | Response OK but JSON parse fails = silent data loss | UI shows error despite server success |
| H-05 | Error | photo-insight-store.ts | 232-238 | setTimeout can fire after fetch completes — state overwrite race | Entry status corrupted (done → error) |
| H-06 | Error | photo-insight/route.ts | 462-485 | Slim Haiku AbortController timeout never cleared on success | Resource leak: 15s timeouts pile up |
| H-07 | Timeout | photo-enrich/route.ts | 100 | No outer timeout on photo-enrich route | DB queries can hang indefinitely |
| H-08 | Race | photo-insight-store.ts | 175-200 | Duplicate startAnalysis overwrites first result | First analysis silently discarded |
| H-09 | Group | photo-insight/route.ts | 214 | Cache key missing child_id — all children see SAME cached result | Group photo shows first child's result for all |
| H-10 | Group | photo-insight/route.ts | 496-509 | Shelf check runs only for first child | Wrong scenario classification for other children |
| H-11 | Memory | clip-classifier.ts | 51,181 | CLIP pipeline singleton never released | 50MB+ permanent memory consumption |
| H-12 | Memory | clip-classifier.ts | 52-53 | Pre-computed embeddings (1MB) never garbage collected | Permanent memory leak |
| H-13 | Memory | photo-insight/route.ts | 25-48 | Unbounded in-memory rate limit map | Memory grows linearly with unique IPs |
| H-14 | Memory | photo-insight-store.ts | 63,89-92 | Listener Set never cleaned on unmount | Memory leak if components don't unsubscribe |
| H-15 | Memory | photo-insight-store.ts | 217,251 | AbortController not cleaned in finally block | Minor leak per entry |
| H-16 | Custom | photo-insight/route.ts | 1409 | Case-sensitive name query for classroom lookup | Custom works with different casing fail lookup |
| H-17 | Custom | corrections/route.ts | 25-38 | No validation that corrected work exists in classroom | Fake custom works can be created |
| H-18 | DB | corrections/route.ts | 228-245 | Visual memory Haiku+upsert fire-and-forget in corrections | Lost learning data on transient failures |
| H-19 | DB | corrections/route.ts | brain retry | Brain learning retry queue is in-memory only | Container restart = permanent data loss |

### Tier 3: MEDIUM (22 issues)

| ID | Audit | File | Lines | Issue | Impact |
|----|-------|------|-------|-------|--------|
| M-01 | DataFlow | sync-manager.ts | 335-338 | Status update may fail after blob delete | Local queue state corrupted (photo safe on server) |
| M-02 | DataFlow | media/upload/route.ts | 156-166 | Group photo junction link failures ignored | Secondary children can't see group photos |
| M-03 | Error | photo-insight/route.ts | 366-381 | Skip-if-tagged response missing work_id in body | UI might not display tag correctly |
| M-04 | Error | photo-insight-store.ts | 273-286 | Error classification doesn't distinguish 401 from other 4xx | May retry non-retryable errors |
| M-05 | Race | photo-insight/route.ts | 532-539 | Fire-and-forget media tag — group photos cross-contaminate | Last writer wins on shared media_id |
| M-06 | Race | photo-insight/route.ts | 587-615 | Interaction cache key collision for same photo+child | Analytics context_snapshot overwritten |
| M-07 | Race | classify-orchestrator.ts | 96-99 | Init retry after TTL — fragile logic | Confusing code, works but brittle |
| M-08 | Timeout | photo-insight-store.ts | 246 | montreeApi timeout (55s) > client timeout (50s) | 5s socket linger after client error |
| M-09 | Timeout | clip-classifier.ts | 181 | CLIP model init has no timeout | First request can hang indefinitely |
| M-10 | Calibration | clip-classifier.ts | 18 | CLIP_HIGH_CONFIDENCE=0.90 is dead code (never used) | Confusing; suggests unused feature |
| M-11 | Calibration | photo-insight/route.ts | 1571 | First-capture learning uses 0.9 threshold (not 0.95) | Could generate weak visual memories |
| M-12 | Calibration | all | — | No empirical validation of ANY threshold | All confidence gates are untested assumptions |
| M-13 | Contract | photo-insight/route.ts | 373-381 | Skip-if-tagged missing scenario/in_classroom/in_child_shelf | Undefined values in client store |
| M-14 | Contract | photo-enrich/route.ts | 349-364 | Uses `confidence_final` instead of `confidence` | Field name mismatch with photo-insight |
| M-15 | Contract | photo-enrich/route.ts | STATUS_RANK | Missing 'unclear' status in STATUS_RANK | Falls to 0 by accident |
| M-16 | Memory | photo-insight-store.ts | 232-238 | Orphaned timeout handlers for deleted entries | Wasted callbacks |
| M-17 | Memory | classify-orchestrator.ts | 103-114 | CLIP disabled after 3 init failures (15 min) | Cost spikes during CLIP downtime |
| M-18 | Memory | clip-classifier.ts | 282-290 | No explicit ONNX tensor cleanup | Temporary GC lag under load |
| M-19 | Offline | photo-insight/route.ts | 345-390 | Tagged photos missing work_name until page refresh | UX flicker |
| M-20 | Offline | sync-manager.ts | 255-383 | Upload retry + tagged work = skipped analysis | No identification metadata for retried tagged photos |
| M-21 | Custom | photo-insight/route.ts | 1569-1646 | Visual memory reinforcement loop for custom works | Wrong description stored → future misidentifications |
| M-22 | Group | photo-insight/route.ts | 587-615 | Interaction record saves only for first child | Analytics incomplete for group photos |

### Tier 4: LOW (9 issues)

| ID | Audit | File | Lines | Issue |
|----|-------|------|-------|-------|
| L-01 | Error | photo-insight-store.ts | 289 | Hardcoded fallback "Photo analyzed" text |
| L-02 | Error | classify-orchestrator.ts | 99 | resetInitError() doesn't clear initPromise |
| L-03 | DataFlow | sync-manager.ts | 335-342 | Crash between blob delete & status update (mitigated) |
| L-04 | Calibration | photo-insight/route.ts | — | CLIP vs Sonnet score precision inconsistency |
| L-05 | Custom | photo-insight/route.ts | 1409 | Custom work deactivation orphans photos |
| L-06 | Contract | photo-insight/route.ts | 630,1731 | Candidates score rounding inconsistent |
| L-07 | Race | classify-orchestrator.ts | 118-120 | Empty catch block in init (code smell) |
| L-08 | Race | photo-insight-store.ts | 230-256 | timedOut flag pattern fragile (safe in JS) |
| L-09 | Memory | clip-classifier.ts | 89-110 | Image buffers not explicitly released after pipeline |

---

## SYNTHESIS: TOP 10 ROOT CAUSES

| # | Root Cause | Issues Affected | Fix Complexity |
|---|-----------|----------------|----------------|
| 1 | **No route-level timeouts** | C-09, C-10, H-07, M-08, M-09 | LOW (2hrs) |
| 2 | **Fire-and-forget without atomicity** | C-05, C-17, H-01, H-02, H-03, H-18, H-19 | MEDIUM (4hrs) |
| 3 | **State variables set before await** | C-03, C-04 | LOW (30min) |
| 4 | **Forced non-null assertions** | C-01, C-02 | LOW (30min) |
| 5 | **Group photos not supported** | C-14, C-15, H-09, H-10, M-02, M-05, M-22 | HIGH (6hrs) |
| 6 | **CLIP concurrency not serialized** | C-11, C-12 | MEDIUM (2hrs) |
| 7 | **No DB transactions** | C-05, C-06, C-13, C-08 | MEDIUM (3hrs) |
| 8 | **Client-server contract mismatches** | C-16, M-13, M-14, M-15 | LOW (1hr) |
| 9 | **Memory leaks** | H-11, H-12, H-13, H-14, H-15 | MEDIUM (2hrs) |
| 10 | **Missing error handling in photo-enrich** | C-07, H-03 | LOW (1hr) |

---

## AUDIT ANGLES COMPLETED (11/20)

| # | Angle | Agent Status | Issues Found |
|---|-------|-------------|-------------|
| 1 | Data Flow Tracing | ✅ Complete | 5 issues |
| 2 | Error Handling | ✅ Complete | 19 issues |
| 3 | Race Conditions | ✅ Complete | 8 issues |
| 4 | Timeout Chain | ✅ Complete | 6 issues |
| 5 | DB Consistency | ✅ Complete | 18 issues |
| 6 | Client-Server Contract | ✅ Complete | 4 issues |
| 7 | Confidence Calibration | ✅ Complete | 5 issues |
| 8 | Memory Leaks & Perf | ✅ Complete | 12 issues |
| 9 | Offline Behavior | ✅ Complete | 3 issues |
| 10 | Group Photos | ✅ Complete | 12 issues |
| 11 | Custom Works | ✅ Complete | 6 issues |

**Remaining audit angles (deferred — diminishing returns, moving to PLAN phase):**
12-20: Security, i18n, debiasing effectiveness, cost modeling, retry logic, state management, visual memory reliability, edge cases, CLIP vs Haiku accuracy

---

## FIX PRIORITY ORDER (Proposed for Round 2: PLAN)

### Phase 1 — Stop the Bleeding (2 hrs)
- Add route-level timeouts (C-09, C-10, H-07)
- Fix forced non-null assertions (C-01, C-02)
- Fix state-before-await pattern (C-03, C-04)
- Add try-catch to photo-enrich progress upsert (C-07)

### Phase 2 — Data Integrity (4 hrs)
- Make progress + shelf + media tag more atomic (C-05, C-06, C-13)
- Add idempotency to corrections (C-08)
- Fix fire-and-forget reliability (C-17, H-01, H-02, H-03)

### Phase 3 — Contract Fixes (1.5 hrs)
- Fix candidates area field (C-16)
- Fix skip-if-tagged response shape (M-13)
- Add 'unclear' to STATUS_RANK (M-15)
- Standardize field names (M-14)

### Phase 4 — Group Photos (6 hrs)
- Add child_id to cache key (H-09)
- Loop startAnalysis for each child (C-15)
- Add per-child analysis support to API (C-14)

### Phase 5 — CLIP Hardening (3 hrs)
- Add pipeline mutex for concurrent calls (C-12)
- Add init re-entrance guard (C-11)
- Add CLIP init timeout (M-09)
- Add unloadClassifier() cleanup (H-11, H-12)

### Phase 6 — Cleanup (2 hrs)
- Fix memory leaks (H-13, H-14, H-15)
- Clean up dead code (M-10)
- Fix custom work case sensitivity (H-16)
- Fix timeout layering (M-08)

**Total estimated: ~18.5 hours of implementation**

---

## NEXT STEPS

1. ✅ Round 1 AUDIT — COMPLETE (this document)
2. 🔄 Round 2 PLAN — Write detailed fix plan, audit 20 times
3. ⏳ Round 3 BUILD — Implement in 6 phases, audit each
4. ⏳ Round 4 HEALTH CHECK — 10 passes
5. ⏳ Round 5 FINAL AUDIT — Until 3 consecutive clean
