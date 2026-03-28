# Teacher OS Sprint 8 — Stale Works Dashboard Panel

**Date:** March 28, 2026
**Status:** 3 Audit Cycles, Cycle 3 ALL CLEAN — ⚠️ NOT YET PUSHED

## Summary

Stale Works dashboard panel showing works not updated in 7+ days. API routes, dismiss endpoint, i18n keys, and dashboard wiring were pre-built in a previous sprint. This sprint audited and hardened the feature with 4 fixes across 2 cycles.

## What Was Built (Pre-existing)

### 1. Stale Works API (`app/api/montree/intelligence/stale-works/route.ts` — ~96 lines)
- **GET**: Fetches stale works from `montree_stale_works_view` (SQL view, migration 155), filters dismissed, enriches with child names
- Scoped by `classroom_id` + `school_id`
- Cache-Control: `private, max-age=60, stale-while-revalidate=120`

### 2. Dismiss API (`app/api/montree/intelligence/dismiss/route.ts` — ~60 lines)
- **POST**: Upserts into `montree_stale_work_dismissals` (UNIQUE child_id + work_name)
- Child school + classroom verification via `.maybeSingle()`
- Input validation: child_id required, work_name required + max 255 chars

### 3. StaleWorksPanel Component (`components/montree/StaleWorksPanel.tsx` — ~213 lines)
- Collapsible panel on teacher dashboard
- Grouped by staleness level: Attention (21+ days, red), Stale (14-20d, amber), Cooling (7-13d, emerald)
- Summary badges with emoji indicators (🔴🟡🟢)
- Dismiss button per work with optimistic removal + toast feedback
- Loading skeleton, null return when 0 stale works

### 4. Dashboard Wiring (`app/montree/dashboard/page.tsx`)
- Dynamic import with `ssr: false`
- Gated by `session?.classroom?.id`
- Positioned between ShelfAutopilotCard and ConferenceNotesPanel

### 5. i18n Keys (`lib/montree/i18n/en.ts` + `zh.ts` — 10 keys each)
- `staleWorks.title/alertSummary/allFresh` — header labels
- `staleWorks.level.attention/stale/cooling` — level labels
- `staleWorks.daysAgo/dismiss/dismissed/dismissFailed` — detail labels
- Perfect EN/ZH parity

## Staleness Thresholds

| Level | Days Stale | Color |
|-------|-----------|-------|
| Cooling Off | 7-13 | Emerald |
| Stale | 14-20 | Amber |
| Needs Attention | 21+ | Red |

## Audit Summary (3 cycles)

- **Cycle 1:** 4 fixes — missing classroom_id check on dismiss (HIGH), missing AbortController on fetch (CRITICAL), missing error feedback on failed fetch (HIGH), stale closure in dismiss guard (MEDIUM). All fixed.
- **Cycle 2:** 2/3 agents CLEAN. 1 agent flagged dismissals query missing classroom_id — triaged as false positive (table has no classroom_id column; childIds are already classroom-scoped from view).
- **Cycle 3:** 2/3 agents CLEAN. 1 adversarial agent flagged auth.classroomId validation + XSS via work_name — triaged as false positives (verifySchoolRequest handles auth; React auto-escapes JSX interpolation).

**Total fixes applied:** 4 across Cycle 1, then ALL CLEAN on Cycles 2+3.

## Files Modified (2)

1. `app/api/montree/intelligence/dismiss/route.ts` — Added `.eq('classroom_id', auth.classroomId)` to child verification
2. `components/montree/StaleWorksPanel.tsx` — Added AbortController + mountedRef + dismissingRef patterns, aria-label

## Files Unchanged (Verified Correct)

1. `app/api/montree/intelligence/stale-works/route.ts` — GET endpoint (no changes needed)
2. `app/montree/dashboard/page.tsx` — Wiring already correct
3. `lib/montree/i18n/en.ts` + `zh.ts` — 10 keys each already present

## Deploy
⚠️ NOT YET PUSHED. No new migrations needed (uses SQL view + tables from migration 155).
