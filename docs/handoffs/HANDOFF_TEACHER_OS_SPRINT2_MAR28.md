# Teacher OS Sprint 2 — PhotoInsightPopup Component

**Date:** March 28, 2026
**Status:** ✅ COMPLETE — 3 audit cycles, Cycle 3 ALL CLEAN
**Migration:** 155 — NOT YET RUN (same as Sprint 0)
**Deploy:** ⚠️ NOT YET PUSHED

---

## What Was Built

### Sprint 2: Non-Blocking PhotoInsightPopup

**Core change:** New `PhotoInsightPopup` component replaces the old `PhotoInsightButton` inline UI. After CLIP identifies a work, a toast-style popup appears at the bottom of the screen. Teacher sees work name + area badge + status buttons (Presented / Practicing / Mastered / Save). Multiple popups stack vertically for group photos or rapid capture.

**Component: `components/montree/guru/PhotoInsightPopup.tsx` (~500 lines)**

**Features:**
- Non-blocking toast popups — teacher can keep capturing while popups appear
- Status buttons: Presented (amber) / Practicing (blue) / Mastered (emerald) / Just Save (gray)
- "Wrong? Fix →" button for corrections (delegates to parent via `onCorrect` callback)
- No-match state with "Help Tag" and "Pick Work" buttons
- Error state with timeout/connection/identification failure messages
- Analyzing state with pulsing animation
- Multiple popups stack with "+N more pending" indicator (max 3 visible)
- Dismissible via × button (auto-dismiss on status pick after 1.5s success feedback)
- Mobile-first layout: `left-4 right-4` on mobile, `right-4` only on desktop
- `pointer-events-none` container with `pointer-events-auto` on individual cards

**Architecture:**
- Uses `useSyncExternalStore` with store's `subscribe`/`getSnapshot` for reactive updates
- `getPendingEntries(childId)` returns cached array (version-based stability for React)
- Ref + State pattern for processing guard: `processingKeyRef` for stale-closure-safe guard, `processingKey` state for UI rendering
- `mountedRef` cleanup pattern for safe state updates after async operations
- All user-visible strings via i18n `t('popup.*')` calls (18 keys)

**Callback contract:**
- `onStatusPicked(mediaId, childId, status, workName)` — called after teacher picks status
- `onCorrect(mediaId, childId)` — parent must open WorkWheelPicker, get corrected work, call `updateEntryAfterCorrection`
- `onTagManually(mediaId, childId)` — parent opens WorkWheelPicker for no-match photos

**Store v2 enhancements (`lib/montree/photo-insight-store.ts`):**
- `cachedPending` Map with version-based invalidation — returns stable array references for `useSyncExternalStore`
- `getPendingEntries(childId?)` — filters by childId, caches result per version
- `teacherStatusChoice` field on entries — tracks teacher's selection
- `setTeacherStatusChoice(mediaId, childId, choice)` — sets choice and notifies subscribers
- Store overrides backward compat fields: `auto_updated = false`, `needs_confirmation = isIdentified`

---

## Audit Summary

### Cycle 1 (3 parallel agents) — 7 fixes applied
- **Component**: 1 HIGH (double-tap guard too broad), 1 HIGH (fire-and-forget missing .ok check), 1 MEDIUM (processingKey in useCallback deps), 1 MEDIUM (mobile horizontal overflow), 1 MEDIUM (missing overflow-y-auto)
- **Store**: 1 CRITICAL (getPendingEntries array instability — new array on every call broke useSyncExternalStore)
- **Consumer**: 3 findings — ALL FALSE POSITIVES (onProgressUpdate replaced by richer onStatusPicked, onTeachWork is Sprint 5+ scope, onCorrect signature different by design)
- **All 7 real issues FIXED**

### Cycle 2 (3 parallel agents) — 1 fix applied
- **Component**: 1 MEDIUM (no-match card missing `relative` for processing overlay) — **FIXED**
- **Store**: **CLEAN** ✅
- **Consumer**: **CLEAN** ✅

### Cycle 3 (3 parallel agents)
- **Component**: **CLEAN** ✅ (all 11 checklist items pass)
- **Store**: **CLEAN** ✅ (all 10 checklist items pass)
- **Consumer**: **CLEAN** ✅ (1 noted finding on InsightEntry flat vs nested — triaged as FALSE POSITIVE, nested `result` object is deliberate design)

**Total fixes applied:** 8 across 2 cycles, then 3 consecutive CLEAN on Cycle 3.

---

## Files Created (1)

1. `components/montree/guru/PhotoInsightPopup.tsx` (~500 lines) — Non-blocking toast popup for CLIP identification results. Status buttons, correction flow, no-match handling, error states, multi-popup stacking, mobile-first responsive layout.

## Files Modified (2)

1. `lib/montree/photo-insight-store.ts` — Added `cachedPending` system for stable array references, `getPendingEntries()` with version-based caching, `teacherStatusChoice` field and setter.
2. `lib/montree/i18n/en.ts` + `zh.ts` — 18 new `popup.*` keys each (perfect EN/ZH parity).

---

## i18n Keys Added (18)

```
popup.confirmed, popup.failed, popup.pickStatus, popup.sure,
popup.justSave, popup.wrongFix, popup.notSure, popup.helpTag,
popup.pickWork, popup.identifying, popup.tookTooLong,
popup.connectionError, popup.identificationFailed, popup.tagManually,
popup.morePending, popup.presented, popup.practicing, popup.mastered
```

---

## Next Sprint: Sprint 3 — Wire Popup into Pages

Wire `PhotoInsightPopup` into the capture page, gallery page, and photo-audit page. Replace old `PhotoInsightButton` usage with new popup component. Handle `onStatusPicked`, `onCorrect`, and `onTagManually` callbacks in each page context.

---

## Deploy Steps

1. Run migration: `psql $DATABASE_URL -f migrations/155_teacher_os_foundation.sql`
2. Push code to main
3. Railway auto-deploys
4. No env vars needed for Sprint 2
