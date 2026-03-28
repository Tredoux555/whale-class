# Teacher OS Sprint 12 — EvidencePanel Dashboard Widget

**Date:** March 28, 2026
**Status:** BUILD COMPLETE, 3 AUDIT CYCLES, 3 CONSECUTIVE CLEAN ✅

## What Was Built

Classroom-level Evidence Tracker dashboard widget. Teachers see at a glance which children have strong photo evidence for their works, which works are ready for mastery confirmation, and overall classroom evidence health.

## Architecture

**API Route:** `GET /api/montree/intelligence/evidence-overview`
- Fetches all children in classroom (with school_id security filter)
- Fetches all active progress records (presented/practicing/mastered) for those children
- Calculates evidence strength per work using existing thresholds:
  - Strong: 3+ photos across 3+ distinct days
  - Moderate: 2+ photos OR 2+ distinct days
  - Weak: 1 photo on 1 day
  - None: 0 photos
- Identifies "ready works" = strong evidence + NOT yet mastery-confirmed
- Returns per-child summaries + classroom totals
- Cache-Control: `private, max-age=30, stale-while-revalidate=60`

**Component:** `EvidencePanel.tsx`
- Collapsible widget with summary bar (📷 icon, ready count, strong/moderate badges)
- Expanded view shows:
  - Stats row: Strong (emerald), Growing (blue), Needs Photos (amber), Confirmed (violet)
  - Ready-for-mastery alert with child name previews
  - Per-child cards with emoji badges (✅ strong, 📸 moderate, ⚠️ weak, ⭐ confirmed)
  - Ready works with "Confirm ⭐" buttons → PATCHes to existing `/api/montree/intelligence/evidence`
- AbortController + mountedRef lifecycle safety
- Double-tap guard on confirm buttons
- Full i18n (18 keys, perfect EN/ZH parity)

**Dashboard Integration:**
- Dynamic import with `ssr: false`
- Renders after PulsePanel, before student grid
- Gated by `session?.classroom?.id`

## Files Created (2)

1. `app/api/montree/intelligence/evidence-overview/route.ts` (~178 lines) — Classroom evidence overview API
2. `components/montree/EvidencePanel.tsx` (~289 lines) — Dashboard widget

## Files Modified (3)

1. `app/montree/dashboard/page.tsx` — Dynamic import + JSX render (2 edits)
2. `lib/montree/i18n/en.ts` — 18 new `evidence.*` keys
3. `lib/montree/i18n/zh.ts` — 18 matching Chinese keys (perfect EN/ZH parity)

## Audit Summary (3 cycles, 9 agents)

- **Cycle 1:** 3 agents → 2 bugs found:
  - CRITICAL: Missing `school_id` filter on children query (cross-school data exposure) → FIXED
  - HIGH: Ready works OR logic included wrong works → FIXED to AND exclusion
- **Cycle 2:** 3 agents (API post-fix, Component, i18n) → ALL CLEAN ✅
- **Cycle 3:** 3 agents (API final, Component final, Integration) → ALL CLEAN ✅

**Total fixes applied:** 2 (Cycle 1), then 2 consecutive CLEAN cycles.

## Data Sources

- `montree_children` — classroom roster
- `montree_child_progress` — evidence columns from migration 155 (`evidence_photo_count`, `evidence_photo_days`, `mastery_confirmed_at`)

## No Migrations Needed

All evidence columns already exist from migration 155 (Sprint 0).
