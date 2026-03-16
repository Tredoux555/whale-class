# Handoff: Reports + Gallery 3x3x3 Audit & Fix — Mar 17, 2026

## Summary

Full 3x3x3 audit-plan-fix cycle on the Reports and Gallery core features. Found and fixed 10 bugs (2 CRITICAL, 3 HIGH, 4 MEDIUM, 1 LOW). Triple-audited all changes + 5 health check cycles + final zero-error verification.

## Bugs Fixed

### CRITICAL

**CRIT-1: checkRateLimit wrong signature in corrections/route.ts**
- **File:** `app/api/montree/guru/corrections/route.ts`
- **Problem:** Called as `checkRateLimit('corrections', ip, 30, 60)` (4 args, string first) but function requires `checkRateLimit(supabase, ip, endpoint, maxAttempts, windowMinutes)` (5 args, SupabaseClient first). Would TypeError at runtime on every teacher correction.
- **Fix:** Added `const supabase = getSupabase()` before rate limit check, passed correct 5 args. Removed duplicate `const supabase = getSupabase()` further down.

**CRIT-3: React error #310 — useMemo hook ordering violation in reports/page.tsx**
- **File:** `app/montree/dashboard/[childId]/reports/page.tsx`
- **Problem:** `groupedByArea` useMemo was placed AFTER `if (loading) return` early exit. When `loading=true`, React saw fewer hooks than when `loading=false` → crash with "Rendered more hooks than during the previous render".
- **Fix:** Moved useMemo above the early return.

### HIGH

**HIGH-3: O(N²) sort in reports preview API**
- **File:** `app/api/montree/reports/preview/route.ts`
- **Problem:** `reportItems.sort()` called `allPhotos.find()` for EVERY item in the comparator → O(N²).
- **Fix:** Built `photoDateMap` (Map<string, string>) for O(1) date lookups during sort.

**Reports page missing AbortController on main fetch**
- **File:** `app/montree/dashboard/[childId]/reports/page.tsx`
- **Problem:** useEffect fetching preview data had no AbortController — if childId changed, stale fetch would still update state.
- **Fix:** Added AbortController with signal passed to both fetches, cleanup function aborts on unmount/re-run.

**Reports handlePhotoSelectionSave silent error**
- **File:** `app/montree/dashboard/[childId]/reports/page.tsx`
- **Problem:** Photo update errors logged to console but never shown to user.
- **Fix:** Added `toast.error(t('reports.photoUpdateFailed'))`.

### MEDIUM

**MED-3: .single() crash in reports preview (draft report query)**
- **File:** `app/api/montree/reports/preview/route.ts`
- **Problem:** `.single()` on draft report lookup would throw if no draft exists for this week.
- **Fix:** Changed to `.maybeSingle()`.

**MED-3b: .single() crash in reports preview (last report query)**
- **File:** `app/api/montree/reports/preview/route.ts`
- **Problem:** `.single()` on last report query would throw if child has never had a report sent.
- **Fix:** Changed to `.maybeSingle()`.

**MED-4: Missing verifyChildBelongsToSchool in reports preview**
- **File:** `app/api/montree/reports/preview/route.ts`
- **Problem:** Security gap — any authenticated teacher could preview ANY child's report by passing a different child_id.
- **Fix:** Added `verifyChildBelongsToSchool(childId, auth.schoolId)` check returning 403 on denial. Also changed child fetch `.single()` to `.maybeSingle()`.

**MED-5: PhotoInsightButton shows "Try again" for auth errors**
- **File:** `components/montree/guru/PhotoInsightButton.tsx`
- **Problem:** When photo-insight returns 403 (child access denied), UI showed retryable "Try again" button. Auth errors never succeed on retry — misleading UX.
- **Fix:** Added `auth_error` branch that renders non-clickable `<span>` with lock icon and "Session expired — please refresh" message.

### LOW

**LOW-1: Gallery GuruContextBubble wrong pageKey**
- **File:** `app/montree/dashboard/[childId]/gallery/page.tsx`
- **Problem:** `pageKey="progress"` on the gallery page — would show progress tips instead of gallery tips.
- **Fix:** Changed to `pageKey="gallery"`.

## Files Modified (7)

1. `app/montree/dashboard/[childId]/reports/page.tsx` — 3 edits (useMemo ordering, AbortController, error toast)
2. `app/api/montree/reports/preview/route.ts` — 5 edits (import, access check, 2× .maybeSingle(), photoDateMap)
3. `components/montree/guru/PhotoInsightButton.tsx` — 1 edit (auth_error branch)
4. `app/api/montree/guru/corrections/route.ts` — 2 edits (rate limiter fix, duplicate removal)
5. `app/montree/dashboard/[childId]/gallery/page.tsx` — 1 edit (pageKey)
6. `lib/montree/i18n/en.ts` — 2 new keys (photoInsight.sessionExpired, reports.photoUpdateFailed)
7. `lib/montree/i18n/zh.ts` — 2 new keys (matching Chinese translations)

## i18n Keys Added (perfect EN/ZH parity)

- `photoInsight.sessionExpired`: "Session expired — please refresh" / "会话已过期 — 请刷新页面"
- `reports.photoUpdateFailed`: "Failed to update photos" / "更新照片失败"

## Audit Summary

- **3x3x3 rounds:** 3 complete (Research → Plan → Fix each)
- **Triple audit:** 3 independent agents, all PASS
- **Health check cycles:** 5 (security, performance, data integrity, data flow, API error handling)
- **Final zero-error audit:** ALL CLEAR across all 7 files
- **No new migrations required**

## Known Pre-Existing Issues (Not Fixed — Tech Debt)

These were identified during health checks but are pre-existing, not regressions:

- Gallery `allProgress` state declared but never populated (dead code)
- Gallery `renderPhotoCard` not memoized with useCallback (pre-existing perf)
- Gallery `formatDate`/`formatDateTime` recreated every render (pre-existing perf)
- Reports `sendReport` missing AbortController (pre-existing)
- Reports `fetchLastReport` missing AbortController (pre-existing)
- Reports inline "Show All Works" button async handler has no abort/debounce (pre-existing)

## Deploy

⚠️ NOT YET PUSHED. No new migrations. Include in consolidated push.
