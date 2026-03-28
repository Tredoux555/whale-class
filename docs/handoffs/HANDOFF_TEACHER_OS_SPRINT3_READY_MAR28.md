# Handoff: Teacher OS — Sprint 3 Ready

**Date:** Mar 28, 2026
**Status:** Sprints 0-2 DEPLOYED + MIGRATION RUN. Sprint 3 next.

---

## What's Done (Sprints 0-2)

**Commit:** `8759e3af` — pushed, Railway deploy `25baa5f5` Active+Online.
**Migration 155:** Run via Supabase SQL Editor. Success.

### Sprint 0 — Foundation
- `migrations/155_teacher_os_foundation.sql` (240 lines) — attendance override, attendance view, stale works view, evidence columns, pulse lock, conference notes, stale work dismissals, 4 RPCs
- `lib/montree/photo-insight-store.ts` — Complete v2 rewrite (~720 lines). InsightStatus: `'analyzing' | 'identified' | 'no_match' | 'error'`. TeacherStatusChoice: `'save' | 'presented' | 'practicing' | 'mastered'`. Composite key `mediaId:childId`. Backward compat adapters.
- `package.json` — Added `idb` ^8.0.1

### Sprint 1 — Remove Haiku from CLIP Path
- `app/api/montree/guru/photo-insight/route.ts` — Replaced Haiku verification with CLIP direct return (~130 lines replacing ~300). `classification_method: 'clip_direct'`, `auto_updated: false`, `needs_confirmation: true`. Dead variables cleaned.
- `app/montree/dashboard/photo-audit/page.tsx` — Zone logic updated for Sprint 1

### Sprint 2 — PhotoInsightPopup Component
- `components/montree/guru/PhotoInsightPopup.tsx` (NEW, ~500 lines) — Non-blocking toast popup. Status buttons (Presented/Practicing/Mastered/Save), correction flow, no-match handling, error states, max 3 visible + "+N more" indicator. Mobile-first. `useSyncExternalStore` with `getPendingEntries()`.
- Store enhanced: `cachedPending` Map with version-based invalidation, `teacherStatusChoice` field + setter
- `lib/montree/i18n/en.ts` + `zh.ts` — 18 new `popup.*` keys each (perfect parity)

### Audit Summary
- 9 audit cycles (3 per sprint), all Cycle 3 CLEAN
- 6-agent cross-sprint audit: ALL CLEAN (1 MEDIUM dead code fixed)
- 18 total fixes applied across all sprints
- TypeScript check: 0 errors

---

## Sprint 3 — Wire Popup Into Pages

**Goal:** Connect PhotoInsightPopup to the 3 pages where teachers interact with photos:

### 1. Capture Page (`app/montree/dashboard/capture/page.tsx`)
- Import and render `<PhotoInsightPopup />` at bottom of page
- After photo upload + CLIP analysis starts, the store will auto-populate entries
- Popup appears non-blocking while teacher keeps capturing
- Need to pass `onCorrect` callback (opens correction flow — may defer to Sprint 4)
- Need to wire status choice → API call to save progress

### 2. Gallery Page (`app/montree/dashboard/[childId]/gallery/page.tsx`)
- Import and render `<PhotoInsightPopup />`
- Filter by `childId` prop on `getPendingEntries(childId)`
- Gallery already has photo cards — popup shows for any pending identifications

### 3. Photo-Audit Page (`app/montree/dashboard/photo-audit/page.tsx`)
- Import and render `<PhotoInsightPopup />`
- This page already has its own audit UI — popup is supplementary for new photos arriving

### Key Wiring Tasks
- **Status choice → API:** When teacher taps a status button, need to:
  1. Call `setTeacherStatusChoice(mediaId, childId, choice)` on store
  2. POST to progress update API or new endpoint to save the status
  3. Dismiss the popup card
- **Correction flow:** `onCorrect` callback should open the existing WorkWheelPicker/AreaPickerWithSearch
- **No-match flow:** "Help Tag" / "Pick Work" buttons need to open work picker

### Architecture Notes
- PhotoInsightPopup is self-contained — it reads from the store via `useSyncExternalStore`
- Store entries are populated by `startAnalysis()` which is called from `sync-manager.ts` after photo upload
- The popup component already handles all UI states — pages just need to render it and provide callbacks
- `processingKeyRef` pattern prevents double-taps (already built in Sprint 2)

---

## Files to Read First
1. `components/montree/guru/PhotoInsightPopup.tsx` — The component to wire in
2. `lib/montree/photo-insight-store.ts` — The store driving it
3. `app/montree/dashboard/capture/page.tsx` — Primary wiring target
4. `app/montree/dashboard/[childId]/gallery/page.tsx` — Secondary target
5. `app/montree/dashboard/photo-audit/page.tsx` — Tertiary target

## User's Build Process
- Build sprint by sprint
- 3 audit-fix cycles after every sprint (9 parallel agents per cycle: 3 agents × 3 cycles)
- Update handoff + CLAUDE.md after each sprint's 3 audit cycles complete
- Push + verify build after audit

## Git
- Remote: `git@github.com:Tredoux555/whale-class.git` (SSH)
- Push via Desktop Commander on Mac: `cd ~/Desktop/Master\ Brain/ACTIVE/whale`
- May need `rm -f .git/index.lock .git/HEAD.lock` before git operations
