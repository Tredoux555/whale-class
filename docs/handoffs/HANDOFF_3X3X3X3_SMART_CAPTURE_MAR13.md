# Handoff: 3x3x3x3 Smart Capture Hardening (2 Rounds)

**Date:** March 13, 2026
**Status:** COMPLETE — NOT YET DEPLOYED
**Migration:** None required
**Files modified:** 4 (route.ts modified in both rounds; api.ts, store, component in Round 1 only)

## Methodology

Full 3x3x3x3 methodology applied to Smart Capture / Fire-and-Forget system — **run TWICE** (2 full rounds):
- **3x3x3**: (1) Research/Analyze/Audit → (2) Plan + audit plan 3× → (3) Build + audit build 3×
- **3x3x3x3**: Run the entire 3x3x3 cycle 3 separate times from scratch, each starting with FRESH research
- **2 rounds**: After completing all 3 cycles (Round 1), the entire 3x3x3x3 process was repeated from scratch (Round 2)

---

## ROUND 1

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
## Round 1 Files Modified (4)

| File | Cycles | Changes |
|------|--------|---------|
| `lib/montree/api.ts` | 1 | Optional `timeout` parameter |
| `lib/montree/photo-insight-store.ts` | 1, 2 | Timeout chain, composite keys, AbortController lifecycle, entry-existence guards |
| `components/montree/guru/PhotoInsightButton.tsx` | 2, 3 | Composite key usage, per-entry useSyncExternalStore selector |
| `app/api/montree/guru/photo-insight/route.ts` | 2, 3 | Cache locale key, scenario A bust, Promise.allSettled, duplicate check LIKE |

## Round 1 Audit Results

- **Cycle 1:** 3× plan audits CLEAN, 3× build audits CLEAN
- **Cycle 2:** 3× plan audits (1 issue: handleAnalysisError zombie — fixed), 3× build audits CLEAN
- **Cycle 3:** 3× plan audits (1 issue: Finding 2 dropped — queries dependent not independent), 3× build audits CLEAN
- **Final cross-cycle verification:** CLEAN — all changes compatible across cycles

---

## ROUND 2

## Cycle 4 (R2C1) — Anthropic AbortController + GREEN Zone inClassroom Gate + getSupabase Consolidation (CRITICAL + MEDIUM)

**Problem 1:** Anthropic API call continued consuming resources after the 45s server timeout. `Promise.race` rejected on timeout but the SDK kept the HTTP connection open.

**Fix:** `apiAbortController` with `signal` passed to `anthropic.messages.create()` as second argument (SDK v0.71.2 supports this). `setTimeout` aborts the controller at 45s. `Promise.race` + `.finally(clearTimeout)`.

**Problem 2:** GREEN zone auto-update (`shouldAutoUpdate`) didn't check whether the work was actually in the classroom curriculum. Scenario B works (standard but not added to this classroom) could create rogue progress entries.

**Fix:** Added `&& inClassroom` gate to line 668: `if (shouldAutoUpdate && inClassroom && finalWorkName && finalArea)`.

**Problem 3:** Two separate `getSupabase()` calls creating two references to the same singleton.

**Fix:** Consolidated to single `const supabase = getSupabase()` at line 67, used throughout.

## Cycle 5 (R2C2) — Cache Fallback Resilience + worksContext Debiasing (MEDIUM + LOW)

**Problem 1:** Backward-compatible cache fallback (old-format `photo:${media_id}` entries) ran as an async IIFE without try-catch. If Supabase timed out during this secondary query, the whole request returned 500 instead of falling through to fresh Sonnet analysis.

**Fix:** Wrapped fallback IIFE body in try-catch, returns `null` on failure.

**Problem 2:** `worksContext` was misleadingly labeled "Current works on shelf:" (actually queries `montree_child_progress`, not shelf). Lacked debiasing note, unlike `focusWorksContext` which explicitly says "do NOT bias your identification".

**Fix:** Renamed to "Child's recent work progress" with inline debiasing note: "for background only — identify based on what you SEE, not this list".

## Cycle 6 (R2C3) — CLEAN

Exhaustive review of all 4 files after 5 prior cycles. Examined: cache round-trip consistency, scenario edge cases with shelf auto-add failures, AbortController lifecycle during clearAll, retry setTimeout orphaning, custom works FK join safety, per-entry selector correctness, CTA button state management. **No new issues found.**

## Round 2 Files Modified (1)

| File | Cycles | Changes |
|------|--------|---------|
| `app/api/montree/guru/photo-insight/route.ts` | 4, 5 | Anthropic AbortController, GREEN inClassroom gate, getSupabase consolidation, cache fallback try-catch, worksContext debiasing |

## Round 2 Audit Results

- **Cycle 4:** 3× plan audits CLEAN, 3× build audits CLEAN
- **Cycle 5:** 3× plan audits CLEAN, 3× build audits CLEAN
- **Cycle 6:** 3× plan audits CLEAN (no changes), 3× build audits CLEAN (no changes)
- **Final cross-cycle verification:** CLEAN — all 5 R2 edits compatible with each other and all R1 changes

## Combined Statistics (2 Rounds)

- **Total cycles:** 6 (3 per round)
- **Total plan audits:** 18 (3 per cycle × 6 cycles)
- **Total build audits:** 18 (3 per cycle × 6 cycles)
- **Total cross-cycle verifications:** 2 (1 per round)
- **Issues found and fixed:** Round 1: 2 plan audit issues. Round 2: 0 plan audit issues.
- **Files modified:** 4 (api.ts, store, component, route.ts)
- **Total edits:** 8 (Round 1: 3 files, ~12 surgical edits. Round 2: 1 file, 5 surgical edits)

## Deploy

Include in consolidated push. No new migrations.

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale && git add -A && git commit -m "feat: 3x3x3x3 smart capture hardening (2 rounds) + 401 fix + album upload + raz 4th photo + home guru fixes + session recovery + guru parity + home parent rebuild" && git push origin main
```