# Handoff: Teacher OS Sprint 4 — Automatic Attendance

**Date:** March 28, 2026
**Status:** ✅ BUILD COMPLETE — 3 Audit Cycles, Cycle 3 ALL CLEAN

## What Was Built

Automatic attendance tracking derived from photo timestamps + manual override. Teachers see a collapsible widget on the dashboard showing who's present (has photos today) and who's absent, with one-tap "Mark Present" buttons.

## Architecture

**Data flow:**
- `montree_attendance_view` (SQL view, migration 155) joins `montree_media.captured_at` + `montree_attendance_override` via FULL OUTER JOIN
- View converts timestamps to school timezone using `montree_schools.settings.timezone`
- GET API queries view for today's date, merges with children roster, sorts absent-first
- POST API upserts into `montree_attendance_override` with school ownership verification

**Key design decisions:**
- Widget is self-contained — no props needed, fetches via `montreeApi` using JWT auth
- School timezone fetched once via shared `getSchoolTimezone()` helper (reused in GET + POST)
- Optimistic update on Mark Present with re-sort
- Cache-Control: `private, max-age=30, stale-while-revalidate=60`

## Files Created (2)

1. `app/api/montree/attendance/route.ts` (~190 lines) — GET (today's attendance) + POST (mark present manually)
2. `components/montree/AttendanceWidget.tsx` (~220 lines) — Collapsible dashboard widget with absent/present lists

## Files Modified (3)

1. `app/montree/dashboard/page.tsx` — Dynamic import + conditional render between search bar and student grid
2. `lib/montree/i18n/en.ts` — 9 new `attendance.*` keys
3. `lib/montree/i18n/zh.ts` — 9 matching Chinese keys (perfect EN/ZH parity)

## Audit Summary (3 cycles)

- **Cycle 1:** 4 issues found — 1 CRITICAL (duplicate school settings fetch in GET), 1 HIGH (unused classroomId prop), 2 MEDIUM (empty catch block, missing schema comment). All fixed.
- **Cycle 2:** 4 issues found — 1 HIGH (empty catch in handleMarkPresent), 3 MEDIUM (missing aria-expanded, generic alt text, timezone edge case triaged as by-design). HIGH + 2 MEDIUM fixed.
- **Cycle 3:** **ALL 3 AGENTS CLEAN** ✅

**Total fixes applied:** 7 across 2 cycles, then 3 consecutive CLEAN.

## No Migration Needed

`montree_attendance_view` and `montree_attendance_override` already exist from migration 155 (Sprint 0).

## Next Sprint

Sprint 5 — Stale Works Panel (works not updated in 7+ days, using `montree_stale_works_view` from migration 155).
