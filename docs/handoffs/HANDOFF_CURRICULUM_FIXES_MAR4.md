# Handoff: Curriculum Fixes + Voice Obs Feature Toggle — Mar 4, 2026 (Late Session)

## Summary

Fixed 4 issues: voice obs nav link gating, curriculum area filtering bug, missing curriculum works, and WorkWheelPicker sequence ordering.

## Changes

### 1. Voice Obs Nav Link — Feature Toggle Gating (commits `70a60756`, `272e3879`)

**Problem:** 🎙️ nav link in DashboardHeader was gated behind `!isHomeschoolParent(session)`, which excluded the user's own homeschool account from seeing it even though the feature was enabled.

**Fix:** Changed to feature-toggle-based gating. DashboardHeader now fetches `/api/montree/features?school_id=...` and checks if `voice_observations` feature is enabled.

**File:** `components/montree/DashboardHeader.tsx`
- Added `montreeApi` import, `voiceObsEnabled` state
- useEffect fetches feature toggles when `sess.school?.id` is available
- Gate changed from `!isHomeschoolParent(session)` to `voiceObsEnabled`

### 2. Curriculum Area Filtering Bug — CRITICAL (commits `d5d436da`, `272e3879`)

**Problem:** WorkWheelPicker showed works from ALL areas when selecting "Math". Root cause: `montree_classroom_curriculum_areas` table had old keys (`math`, `science_culture`) instead of canonical keys (`mathematics`, `cultural`). The search API normalized to `mathematics` but DB had `math` → no match → `areaId = null` → no WHERE clause → ALL works returned.

**Fix (3-pronged):**
1. **DB fix:** Updated area_keys in `montree_classroom_curriculum_areas` via Supabase SQL editor (math→mathematics, science_culture→cultural)
2. **API hardening:** Added `normalizeAreaKey()` function with alias map (`math→mathematics`, `science_culture→cultural`, etc.) + CRITICAL safety: returns empty results with warning instead of all works when area filter matches nothing
3. **Verified:** `setup-stream` route already uses correct canonical keys — old keys were from a legacy seed

**File:** `app/api/montree/works/search/route.ts`
- Added `AREA_KEY_ALIASES` map and `CANONICAL_AREA_KEYS` constant
- Added `normalizeAreaKey()` function
- Added empty-result safety net when `areaId` is null after lookup

### 3. Missing Curriculum Works — Reseeded

**Problem:** Whale Class classroom only had 63/329 works (partial legacy seed).

**Fix:** Triggered existing `/api/montree/admin/reseed-curriculum?classroom_id=51e7adb6-cd18-4e03-b707-eceb0a1d2e69` endpoint in browser. Response: `{"success":true,"classroom":"Whale Class","areasCreated":5,"worksCreated":329}`.

### 4. WorkWheelPicker Sequence Ordering (commit `b998e868`)

**Problem:** `mergeWorksWithCurriculum()` in `lib/montree/work-matching.ts` was overwriting every work's `sequence` with `idx + 1` (array position). This meant after any merge, curriculum sequence numbers were lost and works displayed as #1, #2, #3... based on position rather than their real curriculum order.

**Fix:** Preserved original DB sequences. Only imported/custom works (which have no real sequence) get a derived sequence number based on their insertion neighbours.

**File:** `lib/montree/work-matching.ts`
- Removed `sequence: idx + 1` renumbering
- Added conditional: standard works keep `w.sequence`, imported works get `Math.round((prev + next) / 2)`

## Commits (4)

| Commit | Description |
|--------|-------------|
| `70a60756` | Voice obs nav link uses feature toggle instead of role gate |
| `d5d436da` | Harden curriculum area filtering + voice obs nav link |
| `272e3879` | Harden curriculum area filtering + voice obs feature toggle (final) |
| `b998e868` | Preserve curriculum sequence order in WorkWheelPicker |

## Files Modified (3)

- `components/montree/DashboardHeader.tsx` — Feature toggle gating for voice obs
- `app/api/montree/works/search/route.ts` — Area key normalization + empty-result safety
- `lib/montree/work-matching.ts` — Preserve DB sequences instead of renumbering

## Important Patterns

**Area key normalization:** Any new code dealing with area keys should use the canonical set: `practical_life`, `sensorial`, `mathematics`, `language`, `cultural`. The search API now handles aliases automatically.

**Empty-result safety:** When an area filter doesn't match any DB rows, the search API now returns `{ works: [], total: 0, warning: "..." }` instead of silently returning ALL works. This prevents cross-area data leaks.
