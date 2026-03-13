# Handoff: 3x3x3x3 Smart Capture Hardening

**Date:** March 13, 2026
**Status:** COMPLETE — NOT YET DEPLOYED
**Migration:** None required
**Files modified:** 4

## Methodology

Full 3x3x3x3 methodology applied to Smart Capture / Fire-and-Forget system:
- **3x3x3**: (1) Research/Analyze/Audit → (2) Plan + audit plan 3× → (3) Build + audit build 3×
- **3x3x3x3**: Run the entire 3x3x3 cycle 3 separate times from scratch, each starting with FRESH research

## Cycle 1 — montreeApi Timeout Chain Fix (CRITICAL)

**Problem:** `montreeApi` had hardcoded 30s timeout. Server-side Sonnet vision call has 45s timeout. Store set 50s timeout. The 30s montreeApi timeout was killing fetches before the server could respond.

**Fix:**
- `lib/montree/api.ts` — Added optional `timeout` parameter to `montreeApi()`. Callers can override the 30s default.
- `lib/montree/photo-insight-store.ts` — Passes `timeout: CLIENT_TIMEOUT_MS + 5000` (55s) to montreeApi.

**Timeout chain:** Server 45s → Store 50s → montreeApi 55s (each fires 5s after previous for clean handling)
## Cycle 2 — Group Photo Composite Key + AbortController Lifecycle (MEDIUM)

**Problem 1:** Store keyed entries by `mediaId` alone. Group photos caused Child B to see Child A's analysis.

**Fix:** Composite key `${mediaId}:${childId}` — `makeKey()` function, all store ops require both params.

**Problem 2:** Zombie fetches resurrecting deleted entries after `resetEntry`/`clearAll`.

**Fix:** AbortController tracking per entry. `resetEntry`/`clearAll` abort before delete. Entry-existence guards in `.then()`/`.catch()`.

**Problem 3:** Cache locale mismatch (EN/ZH shared cache).

**Fix:** Cache key `photo:${media_id}:${locale}` with backward-compatible fallback. Scenario A cache bust for stale results.

**Problem 4:** 3 sequential context queries before Sonnet call.

**Fix:** `Promise.allSettled` for parallel queries with per-query graceful degradation.

## Cycle 3 — Per-Entry Selector + Duplicate Format Fix (MEDIUM)

**Problem 1:** Full Map snapshot in `useSyncExternalStore` caused O(N) re-renders across all PhotoInsightButtons.

**Fix:** Per-entry selector via `getEntry` + `useCallback`. Only changed entry's component re-renders.

**Problem 2:** Duplicate check `.neq` missed locale-format cache entries.

**Fix:** `.not('question', 'like', 'photo:${media_id}%')` excludes both old and new format entries.
## Files Modified (4)

| File | Cycles | Changes |
|------|--------|---------|
| `lib/montree/api.ts` | 1 | Optional `timeout` parameter |
| `lib/montree/photo-insight-store.ts` | 1, 2 | Timeout chain, composite keys, AbortController lifecycle, entry-existence guards |
| `components/montree/guru/PhotoInsightButton.tsx` | 2, 3 | Composite key usage, per-entry useSyncExternalStore selector |
| `app/api/montree/guru/photo-insight/route.ts` | 2, 3 | Cache locale key, scenario A bust, Promise.allSettled, duplicate check LIKE |

## Audit Results

- **Cycle 1:** 3× plan audits CLEAN, 3× build audits CLEAN
- **Cycle 2:** 3× plan audits (1 issue: handleAnalysisError zombie — fixed), 3× build audits CLEAN
- **Cycle 3:** 3× plan audits (1 issue: Finding 2 dropped — queries dependent not independent), 3× build audits CLEAN
- **Final cross-cycle verification:** CLEAN — all changes compatible across cycles

## Deploy

Include in consolidated push. No new migrations.

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: 3x3x3x3 smart capture hardening + 401 fix + album upload + raz 4th photo + home guru fixes + session recovery + guru parity + home parent rebuild" && git push origin main
```