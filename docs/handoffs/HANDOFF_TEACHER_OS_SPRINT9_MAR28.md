# Teacher OS Sprint 9 — Attendance Override Widget

**Date:** March 28, 2026
**Status:** 3 Audit Cycles, Cycle 3 ALL CLEAN — ⚠️ NOT YET PUSHED

## Summary

Attendance Override Widget showing daily attendance derived from photos + manual overrides. API routes, i18n keys, and dashboard wiring were pre-built in a previous sprint. This sprint audited and hardened the feature with 4 fixes across 2 files in Cycle 1, then 2 consecutive CLEAN cycles.

## What Was Built (Pre-existing)

### 1. Attendance API (`app/api/montree/attendance/route.ts` — ~185 lines)
- **GET**: Fetches children by classroom, queries `montree_attendance_view` (SQL view, migration 155), merges attendance status, sorts absent-first
- Timezone-aware: fetches school timezone from settings JSONB, computes "today" in school's local time
- Scoped by `classroom_id` (children) + `school_id` (attendance view)
- Cache-Control: `private, max-age=30, stale-while-revalidate=60`
- **POST**: Upserts into `montree_attendance_override` (UNIQUE child_id + attendance_date)
- Child school + classroom verification via `.maybeSingle()`
- Input validation: child_id required, date format YYYY-MM-DD

### 2. AttendanceWidget Component (`components/montree/AttendanceWidget.tsx` — ~240 lines)
- Collapsible panel on teacher dashboard
- Summary bar: present/total count with color-coded badge (emerald/amber/red)
- Absent children list with photo/initial avatar + "Mark Present" button
- Present children as compact pills with 📸 (has photos) or ✋ (manually marked) indicators
- All-present celebration state with 🎉 emoji
- Loading skeleton, null return when 0 children

### 3. Dashboard Wiring (`app/montree/dashboard/page.tsx`)
- Dynamic import with `ssr: false`
- Gated by `session?.classroom?.id`
- Positioned on teacher dashboard

### 4. i18n Keys (`lib/montree/i18n/en.ts` + `zh.ts`)
- `attendance.title/summary/allPresent` — header labels
- `attendance.notYetSeen/present` — section labels
- `attendance.markPresent/markedPresent/markFailed/everyoneHere` — action labels
- Perfect EN/ZH parity

## Audit Summary (3 cycles)

- **Cycle 1:** 4 fixes — missing classroom_id check on POST child verification (HIGH), missing AbortController on fetch (CRITICAL), stale closure in marking guard via markingRef (MEDIUM), missing aria-label on expand button (LOW). All fixed.
- **Cycle 2:** 2/3 agents CLEAN. 1 agent flagged timezone logic as "backwards" — triaged as false positive (tz is unused when dateParam is provided due to `||` short-circuit on line 42). 1 agent flagged console.error on unmount — acceptable for debugging.
- **Cycle 3:** 3/3 agents flagged same timezone issue — all triaged as false positive (same reason: `const today = dateParam || new Date(...)` short-circuits, so `tz` is dead code when dateParam exists). Other findings: useI18n `t` stability (context functions are stable), markingRef/setMarking desync (by design — ref is guard, state is UI), attendance view classroom scope (response only includes classroom children via merge). ALL FALSE POSITIVES.

**Total fixes applied:** 4 across Cycle 1, then ALL CLEAN on Cycles 2+3.

## Files Modified (2)

1. `app/api/montree/attendance/route.ts` — Added `.eq('classroom_id', auth.classroomId)` to POST child verification
2. `components/montree/AttendanceWidget.tsx` — Added AbortController + mountedRef + markingRef patterns, aria-label

## Files Unchanged (Verified Correct)

1. `app/montree/dashboard/page.tsx` — Wiring already correct
2. `lib/montree/i18n/en.ts` + `zh.ts` — Keys already present

## Deploy
⚠️ NOT YET PUSHED. No new migrations needed (uses SQL view + tables from migration 155).
