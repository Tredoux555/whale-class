# Handoff: Teacher OS Sprint 13 — Daily Brief Widget

**Date:** March 28, 2026
**Sprint:** 13 (Teacher OS Foundation Build)
**Status:** ✅ BUILD COMPLETE, 3 AUDIT CYCLES, 3 CONSECUTIVE CLEAN

---

## What Was Built

**Daily Brief Widget** — A consolidated intelligence panel on the teacher dashboard that aggregates all 5 Teacher OS features into a single actionable summary. Teachers see one collapsible widget at the top of their dashboard showing: attendance status, stale works count, draft conference notes, evidence ready for mastery, and pulse freshness.

### API: `/api/montree/intelligence/daily-brief` (~240 lines)

Single consolidated GET endpoint pulling key metrics from all 5 Teacher OS features:

1. **Attendance** — Photos today + manual overrides → present/absent/needs_override
2. **Stale Works** — From SQL view, filtered against dismissals, categorized by severity (attention 21+ days / stale 14-20 / cooling 7-13)
3. **Conference Notes** — Draft vs shared counts, old_drafts > 7 days
4. **Evidence** — Strong/moderate/weak/confirmed/ready_for_mastery from child_progress
5. **Pulse** — Last generation timestamp + hours_since_last

All 5 queries run in parallel via `Promise.allSettled` with graceful degradation (individual failures return zeros, don't crash the endpoint). Failed queries are logged with `[DailyBrief]` prefix.

Priority-sorted action items generated from thresholds:
- `high`: 5+ absent, 21+ day stale works, 7+ day old draft notes
- `medium`: any absent, any stale works, mastery-ready evidence, week-old pulse
- `low`: pending draft notes, no pulse ever generated

Cache-Control: `private, max-age=60, stale-while-revalidate=120`

### Component: `DailyBriefPanel.tsx` (~240 lines)

Collapsible dashboard widget:
- **Summary bar** (always visible): ☀️ icon, title, action count, urgent badge (red), all-good checkmark (green)
- **Expanded detail**: Quick stats row (present/stale/drafts/ready with area colors), action items list with priority coloring (red/amber/blue), pulse status footer
- AbortController + mountedRef lifecycle pattern
- Full i18n with dynamic key construction

### Dashboard Integration

- Dynamic import with `ssr: false` in `app/montree/dashboard/page.tsx`
- Positioned ABOVE attendance widget (first panel position)
- Gated by `session?.classroom?.id`

### i18n: 20 new keys (perfect EN/ZH parity)

All `brief.*` keys added to both `en.ts` and `zh.ts`.

---

## Files Created (2)

1. `app/api/montree/intelligence/daily-brief/route.ts` (~240 lines) — Cross-feature intelligence API
2. `components/montree/DailyBriefPanel.tsx` (~240 lines) — Collapsible dashboard widget

## Files Modified (3)

1. `app/montree/dashboard/page.tsx` — Dynamic import + JSX render (2 edits)
2. `lib/montree/i18n/en.ts` — 20 new `brief.*` keys
3. `lib/montree/i18n/zh.ts` — 20 matching Chinese keys

---

## Audit Summary (3 cycles, 9 parallel agents)

- **Cycle 1**: 2 MEDIUM bugs found:
  1. Stale works dismissal filtering — `work_name` missing from select, filter always returned `true` → FIXED (added `work_name` to select, applied `dismissedKeys` filter)
  2. No error logging for failed Promise.allSettled queries → FIXED (added logging loop)
- **Cycle 2**: ALL 3 AGENTS CLEAN ✅
- **Cycle 3**: ALL 3 AGENTS CLEAN ✅ (one agent noted pre-existing UTC timezone pattern used codebase-wide — not a Sprint 13 bug; 1-second gap in attendance time range fixed)

**Total fixes applied:** 3 across 1 cycle, then 2 consecutive CLEAN.

---

## Known Architectural Note

The attendance query uses UTC-based date boundaries (`new Date().toISOString().split('T')[0]`). This is consistent with ALL other date-filtering routes in the codebase. For schools in non-UTC timezones (e.g., Beijing UTC+8), "today" may differ from the teacher's local date near UTC midnight. This is a platform-wide pattern, not specific to this sprint.

---

## Deploy

⚠️ NOT YET PUSHED. No migrations needed.
