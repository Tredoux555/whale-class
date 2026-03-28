# Handoff: Teacher OS Sprint 5 — Stale Works Panel

**Date:** March 28, 2026
**Status:** ✅ BUILD COMPLETE — 3 Audit Cycles, Cycle 3 ALL CLEAN

## What Was Built

Stale works detection panel for the teacher dashboard. Shows works in 'presented' or 'practicing' status that haven't been updated in 7+ days. Three staleness levels: cooling (7-13 days, green), stale (14-20 days, amber), attention (21+ days, red). Teachers can dismiss alerts individually.

## Architecture

**Data flow:**
- `montree_stale_works_view` (SQL view, migration 155) on `montree_child_progress` — returns works not updated in 7+ days with `days_stale` computed column
- `montree_stale_work_dismissals` — Teacher dismissals (UNIQUE child_id + work_name)
- GET API queries view for classroom, filters out dismissed, enriches with child names from `montree_children`
- POST API upserts dismissal with child ownership verification

**Key design decisions:**
- Widget is self-contained — no props needed, fetches via `montreeApi` using JWT auth
- 3 staleness levels classified by `getStalenessLevel()`: cooling (<14d), stale (14-20d), attention (21+d)
- Collapsible panel with summary bar showing count badges per level
- Expanded view groups works by staleness level (attention first)
- Optimistic update on dismiss with toast feedback
- Cache-Control: `private, max-age=60, stale-while-revalidate=120`

## Files Created (2)

1. `app/api/montree/intelligence/stale-works/route.ts` (~95 lines) — GET (stale works for classroom, school-scoped)
2. `app/api/montree/intelligence/dismiss/route.ts` (~60 lines) — POST (dismiss stale work alert)

## Files Modified (4)

1. `components/montree/StaleWorksPanel.tsx` (~200 lines) — NEW collapsible dashboard widget
2. `app/montree/dashboard/page.tsx` — Dynamic import + conditional render after AttendanceWidget
3. `lib/montree/i18n/en.ts` — 10 new `staleWorks.*` keys
4. `lib/montree/i18n/zh.ts` — 10 matching Chinese keys (perfect EN/ZH parity)

## Audit Summary (3 cycles)

- **Cycle 1:** 3 issues found — 1 CRITICAL (missing school_id filter on GET query), 1 HIGH (dismissals query error not checked), 1 MEDIUM (work_name length not validated on POST). All fixed.
- **Cycle 2:** 2 issues found — both classroom_id scope on dismiss, triaged as by-design (GET already scopes to classroom, same pattern as attendance). All 3 Cycle 1 fixes verified.
- **Cycle 3:** **ALL 3 AGENTS CLEAN** ✅

**Total fixes applied:** 3 across 1 cycle, then 3 consecutive CLEAN.

## No Migration Needed

`montree_stale_works_view` and `montree_stale_work_dismissals` already exist from migration 155 (Sprint 0).

## Next Sprint

Sprint 6 — TBD (conference notes, pulse generation, or other Teacher OS features from migration 155 foundation).
