# Teacher OS Sprint 14 — Dashboard Layout Optimization + Clickable Action Items

**Date:** Mar 28, 2026
**Status:** ✅ BUILD COMPLETE + AUDITED + PUSHED

## What Changed

Moved 5 detail panels (AttendanceWidget, StaleWorksPanel, ConferenceNotesPanel, EvidencePanel, PulsePanel) from ABOVE the student grid to BELOW it. Made Daily Brief action items into clickable buttons that scroll to the corresponding panel.

## Problem

With all 5 panels + Daily Brief rendered above the student grid, teachers had to scroll past ~600px of panels before seeing their students on mobile. The student grid is the most-used element on the dashboard.

## Solution

- **Daily Brief stays above** — compact summary widget, teacher's first glance
- **Student grid stays in the middle** — most important, always visible
- **5 detail panels moved below** — teachers scroll down when they want detail
- **Action items are clickable** — each action in the Daily Brief scrolls to the relevant panel below via `document.getElementById('panel-{type}').scrollIntoView({ behavior: 'smooth', block: 'center' })`

## Files Modified (2)

1. `app/montree/dashboard/page.tsx` — Moved 5 panel renders from above grid to below grid, added `id="panel-{type}"` wrapper divs
2. `components/montree/DailyBriefPanel.tsx` — Changed action item `<div>` to `<button>` with onClick scroll handler + `↓` arrow indicator

## Panel IDs (match ActionItem.type from API)

- `panel-attendance` → AttendanceWidget
- `panel-stale_works` → StaleWorksPanel
- `panel-conference_notes` → ConferenceNotesPanel
- `panel-evidence` → EvidencePanel
- `panel-pulse` → PulsePanel

## Audit Summary (2 cycles, 5 agents)

- Cycle 1: 3 agents — ALL CLEAN (UI/UX, data flow, layout)
- Cycle 2: 2 agents — ALL CLEAN (edge cases, accessibility)
- Null guard on getElementById prevents errors when panels haven't mounted

## Deploy

✅ PUSHED — commit `c3770217` (combined with Sprints 4-13)
