# HANDOFF: Teacher OS Sprint 3 — Wire PhotoInsightPopup into Pages

**Date:** March 28, 2026
**Status:** ✅ COMPLETE — 3 Audit Cycles, Cycle 3 ALL CLEAN

---

## Summary

Sprint 3 wires the `PhotoInsightPopup` component (built in Sprint 2) into 3 pages: Capture, Gallery, and Photo-Audit. The popup shows non-blocking toast notifications when CLIP identifies a work in a photo, with status buttons (Presented / Practicing / Mastered / Save) and correction flow.

---

## Files Modified (2)

### 1. `app/montree/dashboard/[childId]/gallery/page.tsx`

**Import additions (lines 14-17):**
- `PhotoInsightPopup` component
- `updateEntryAfterCorrection` function from photo-insight-store
- `TeacherStatusChoice` type

**3 callback handlers added (~lines 635-670):**
- `handlePopupStatusPicked` — refreshes gallery photos after teacher picks a status
- `handlePopupCorrect` — opens WorkWheelPicker for corrections (sets pickerArea, pickerPhotoId, pickerCurrentWork, loads curriculum with error handling, opens picker)
- `handlePopupTagManually` — opens AreaPickerWithSearch for no-match photos (loads curriculum before showing picker)

**2 existing handlers enhanced:**
- `handleWorkSelected` (~line 525) — added `updateEntryAfterCorrection()` call after successful PATCH so the popup store reflects the corrected work
- `handleSpecialEventTag` (~line 498) — added `updateEntryAfterCorrection()` call after successful special events PATCH

**JSX render (near end of file):**
```tsx
<PhotoInsightPopup
  childId={childId}
  classroomId={session?.classroom?.id}
  onStatusPicked={handlePopupStatusPicked}
  onCorrect={handlePopupCorrect}
  onTagManually={handlePopupTagManually}
/>
```

### 2. `app/montree/dashboard/capture/page.tsx`

**Import addition (line 14):**
- `PhotoInsightPopup` component

**Conditional render (~line 488):**
```tsx
{selectedChildIds.length === 1 && (
  <PhotoInsightPopup
    childId={selectedChildIds[0]}
    classroomId={classroomId || undefined}
  />
)}
```
- No callbacks — teacher navigates away immediately after capture
- Popup works standalone: status buttons update store + POST to API internally

### 3. `app/montree/dashboard/photo-audit/page.tsx` (comment only)

**Explanatory comment (lines 2-4):**
```
// NOTE (Sprint 3): PhotoInsightPopup NOT wired here — audit page already has its own
// per-photo correction UI (confirm/fix/teach/delete). The popup is per-child and this
// page is classroom-wide. If needed later, could render one popup per visible child.
```

---

## Audit Summary (3 cycles, 9 parallel agents per cycle)

### Cycle 1: 3 real bugs found
1. **CRITICAL: Missing `updateEntryAfterCorrection` in `handleWorkSelected`** — After teacher corrected via WorkWheelPicker, popup store entry wasn't updated. Popup would re-show old wrong work. **FIXED:** Added call after successful PATCH.
2. **HIGH: No `.catch()` on `loadCurriculum().then()` in `handlePopupCorrect`** — If curriculum loading failed, picker silently didn't open. **FIXED:** Added .catch with console.error + error toast.
3. **MEDIUM: `handlePopupTagManually` opened area picker before curriculum loaded** — Fire-and-forget `loadCurriculum()` meant picker could show empty state. **FIXED:** Now awaits `loadCurriculum().then()` before `setShowAreaPicker(true)`.

### Cycle 2: 1 real bug found
4. **CRITICAL: Missing `updateEntryAfterCorrection` in `handleSpecialEventTag`** — Special events tagging path updated the database but not the popup store, causing stale popup entries. **FIXED:** Added call after successful special events PATCH.

### Cycle 3: ALL 3 AGENTS CLEAN ✅
- Gallery agent: 1 false positive (stable `t` ref omitted from deps — project-wide pattern)
- Capture agent: CLEAN
- E2E flow agent: CLEAN — all 4 flows verified solid

**Total fixes applied:** 4 across 2 cycles, then ALL CLEAN on Cycle 3.

---

## Verified End-to-End Flows

| Flow | Description | Status |
|------|-------------|--------|
| A: Status Pick | Popup → teacher picks status → store updated → gallery refreshes | ✅ |
| B: Correction | Popup → "Fix" → WorkWheelPicker → pick work → updateEntryAfterCorrection → re-popup for status | ✅ |
| C: Manual Tag | Popup → "Pick Work" → AreaPicker → WorkWheelPicker → updateEntryAfterCorrection | ✅ |
| D: Special Events | Popup → "Pick Work" → special_events → create/pick event → updateEntryAfterCorrection | ✅ |

---

## Next Sprint

Sprint 4 — Wire popup into capture page's photo flow (trigger `startAnalysis` from sync-manager after upload completes), or other Teacher OS features TBD.
