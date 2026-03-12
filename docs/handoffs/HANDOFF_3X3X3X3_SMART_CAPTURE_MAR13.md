# Handoff: 3x3x3x3 Smart Capture Hardening — Mar 13, 2026

## Summary

Full 3x3x3x3 methodology applied to Smart Capture / Fire-and-Forget system — the most critical feature in the platform. Three complete Research→Plan→Build cycles (each with 3× plan audits and 3× build audits), plus a final cross-cycle verification. 9 build audits total, all CLEAN.

## Methodology: 3x3x3x3

1. **3x3x3**: Research/Analyze/Audit → Plan (audit plan 3×) → Build (audit build 3×)
2. **3x3x3x3**: Run the entire 3x3x3 cycle 3 additional times from start to finish
3. Used for the most important features only

## Changes Per Re-run

### Re-run #1 — montreeApi Timeout Fix (CRITICAL)
**Problem:** `montreeApi` had a hardcoded 30s timeout that killed photo-insight fetches 15 seconds before the server's 45s timeout. The store's 50s client timeout would fire but the underlying fetch was already aborted.

**Fix:** Added optional `timeout` parameter to `montreeApi()`. Store passes `CLIENT_TIMEOUT_MS + 5000` (55s).

**Timeout chain (each fires 5s after previous):**
- Server: 45s (Anthropic API call)
- Store: 50s (`CLIENT_TIMEOUT_MS` — sets error state)
- montreeApi: 55s (AbortController — kills the actual fetch)

**File:** `lib/montree/api.ts` (2 edits)

### Re-run #2 — Group Photo Composite Key (MEDIUM)

**Problem:** Store keyed entries by `mediaId` only, but server cache keyed by `(child_id, media_id)`. For group photos shared across children, Child B would see Child A's analysis result.

**Fix:** Introduced `makeKey(mediaId, childId)` composite key function. All store operations, public API functions, and PhotoInsightButton now use the composite key `${mediaId}:${childId}`.

**Files:**
- `lib/montree/photo-insight-store.ts` (~25 edits — key function, all get/set/delete, all public API signatures)
- `components/montree/guru/PhotoInsightButton.tsx` (~6 edits — storeKey, all store calls pass childId)

### Re-run #3 — Scenario D Staleness + Query Parallelization (MEDIUM)

**Problem 1:** Cached scenario D entries never refreshed. If a work was REMOVED from the classroom after analysis, the cached response still said D (happy path) forever. Fresh scenario checks only ran for B/C.

**Fix 1:** Extended `shouldRefreshScenario` to include scenario D when cache is >5 minutes old. Added `created_at` to cache query select. Fallback: if `created_at` is null, `cacheAgeMs = Infinity` (always refreshes — safe default).

**Problem 2:** Three pre-API context queries (corrections, focus works, duplicate check) ran sequentially, wasting ~100-200ms.

**Fix 2:** Wrapped in `Promise.allSettled` for parallel execution. Each result processed with `status === 'fulfilled'` guard for graceful degradation if individual queries fail.

**Problem 3:** `entry?.result || null` in PhotoInsightButton used `||` instead of `??` (inconsistent with nullish coalescing pattern established across the system).

**Fix 3:** Changed to `entry?.result ?? null`.

**Files:**
- `app/api/montree/guru/photo-insight/route.ts` (3 edits — `created_at` select, scenario D check, `Promise.allSettled`)
- `components/montree/guru/PhotoInsightButton.tsx` (1 edit — `?? null`)

## All Modified Files (Cumulative)

| File | Edits | Re-run(s) |
|------|-------|-----------|
| `lib/montree/api.ts` | 2 | #1 |
| `lib/montree/photo-insight-store.ts` | ~25 | #1, #2 |
| `components/montree/guru/PhotoInsightButton.tsx` | ~7 | #2, #3 |
| `app/api/montree/guru/photo-insight/route.ts` | 3 | #3 |

## Audit Results

| Audit | Result |
|-------|--------|
| Re-run #1 Build Audit 1 (correctness) | CLEAN |
| Re-run #1 Build Audit 2 (edge cases) | CLEAN |
| Re-run #1 Build Audit 3 (regression) | CLEAN |
| Re-run #2 Build Audit 1 (correctness) | CLEAN |
| Re-run #2 Build Audit 2 (edge cases) | CLEAN |
| Re-run #2 Build Audit 3 (regression) | CLEAN |
| Re-run #3 Build Audit 1 (correctness) | CLEAN |
| Re-run #3 Build Audit 2 (edge cases) | CLEAN |
| Re-run #3 Build Audit 3 (regression) | CLEAN |
| Final cross-cycle verification | CLEAN |

## Deploy

No new migrations. Push from Mac:
```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: 3x3x3x3 smart capture hardening — timeout chain, composite keys, scenario staleness, query parallelization" && git push origin main
```
