# Handoff: Cross-Area Correction Flow Fix (Mar 26, 2026)

## Summary

When AI misclassified a photo into the wrong Montessori area (e.g., classified a Language work as Practical Life), teachers had no way to switch areas during the correction flow. The "Fix" button opened a WorkWheelPicker locked to the incorrectly-classified area.

## Root Cause

In `handleCorrect()` (photo-audit/page.tsx line 680), when a photo had a valid area, `setPickerArea(photo.area)` was called immediately — skipping the `AreaPickerWithSearch` modal and going directly to WorkWheelPicker for that (wrong) area. The WorkWheelPicker had no way to navigate back to the area picker.

## Fix

Added a floating "← Change Area" button (`z-[60]`, positioned top-left) that appears alongside the WorkWheelPicker during corrections. Clicking it clears `pickerArea` to empty string, which:
1. Hides the WorkWheelPicker (condition: `correctingPhoto && pickerArea`)
2. Shows the AreaPickerWithSearch (condition: `correctingPhoto && !pickerArea`)
3. Teacher picks the correct area → WorkWheelPicker re-mounts with correct area's works

The `AreaPickerWithSearch` already had cross-area work search built in, so teachers can also search by work name across ALL areas without picking an area first.

## Files Modified (3)

1. **`app/montree/dashboard/photo-audit/page.tsx`** — Added floating "← Change Area" button in Fragment wrapper around WorkWheelPicker
2. **`lib/montree/i18n/en.ts`** — Added `audit.changeArea: 'Change Area'`
3. **`lib/montree/i18n/zh.ts`** — Added `audit.changeArea: '切换区域'` (perfect EN/ZH parity)

## Audit

3x3x3 methodology: 3 parallel audit agents (UI/UX flow, data flow/state transitions, i18n parity). All 3 returned CLEAN. Zero issues found.

## Deploy

- **Commit:** `d9831a33`
- **Push:** ✅ Pushed to main. Railway auto-deploying.
- **Migrations:** None needed.
