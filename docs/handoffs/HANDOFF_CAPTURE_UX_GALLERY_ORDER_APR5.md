# Handoff: Capture UX + Gallery Ordering + Classification Fixes — Apr 5, 2026 (Session 2)

## What Was Done

### 1. Haiku Classification — Corrections Map Override (commit `e7277f24`)
**Problem:** Teacher "Teach the AI" descriptions were being overridden by stale corrections. E.g., Haiku says "Chalkboard Writing" → old correction redirects to "Name Writing" → but it should be "Chalk Board Writing - No lines" (the classroom-specific variant the teacher taught).

**3 fixes in `app/api/montree/guru/photo-insight/route.ts`:**

**Fix 1 — Visual memory → corrections map override (lines ~916-957):**
After loading both corrections and visual memory, iterates teacher-validated visual memory entries (source=teacher_setup/correction, confidence>=0.9). For each, finds standard curriculum works with similar names (fuzzyScore >= 0.5) and OVERRIDES the corrections map to point standard name → visual memory name. This means "Chalkboard Writing" → "Chalk Board Writing - No lines" instead of → "Name Writing".

Imported `fuzzyScore` from `@/lib/montree/work-matching` (line 14).

**Fix 2 — Pass 2 prompt strengthened (lines ~1630-1637):**
Added "CLASSROOM-VERIFIED PRIORITY" as rule #2 in CRITICAL RULES. Explicitly instructs Haiku to check classroom-verified works FIRST and use their exact name even when a similar standard curriculum name exists. Includes concrete example.

**Fix 3 — Scenario A threshold (line ~2074):**
Changed from `matchScore < 0.75 || input.confidence < 0.75` to:
```
matchScore < 0.75 || (input.confidence < 0.75 && matchScore < 0.90) || input.confidence < 0.50
```
This prevents Scenario A (custom work proposal) from overriding correct visual-memory-backed matches where V2 matchScore is high (>=0.90) but Haiku confidence is moderate (0.50-0.74).

**Status:** ✅ PUSHED. Partially working — photos where Haiku says "Chalkboard Writing" now correctly redirect to "Chalk Board Writing - No lines". However, photos where Haiku says "Metal Insets" directly (not going through corrections map) are still misclassified. Teacher needs to "Teach the AI" about Metal Insets to create negative descriptions distinguishing metal frames from chalkboard shapes.

### 2. Smart Capture Popup UX (commit `4c736971`)
**Problem:** "Wrong? Fix →" button on capture page was dead (never wired up). Too small. "Just Save" confusing.

**Changes in `components/montree/guru/PhotoInsightPopup.tsx`:**
- Work name row is now a tappable `<button>` with pencil icon (✏️ SVG)
- Tapping work name calls `onCorrect` — triggers correction flow
- "Wrong? Fix →" removed from bottom row
- "Just Save" centered in bottom row
- Works in both capture page AND gallery page (gallery already had onCorrect wired)

**Changes in `app/montree/dashboard/capture/page.tsx`:**
- Added imports: `WorkWheelPicker`, `AreaBadge`, `AREA_CONFIG`, `AREA_ORDER`, `updateEntryAfterCorrection`
- Added state: `curriculum`, `pickerOpen`, `pickerArea`, `pickerMediaId`, `pickerChildId`, `pickerCurrentWork`, `showAreaPicker`, `areaPickerMediaId`, `areaPickerChildId`
- Added `loadCurriculum()` — lazy loader, only fetches when picker first opens
- Added `handlePopupCorrect()` — if area known → opens WorkWheelPicker directly; if unknown → shows area picker first
- Added `handleAreaSelected()` — transitions from area picker to work picker
- Added `handleWorkSelected()` — PATCH media, update store, popup reappears with corrected work
- `handlePopupTagManually` now opens area picker inline instead of navigating to gallery
- `onCorrect={handlePopupCorrect}` passed to PhotoInsightPopup
- Area picker modal + WorkWheelPicker rendered in JSX

**Flow:** Take photo → popup says "Geometric Cabinet 92%" → tap work name → picker opens → pick correct work → popup reappears → pick P/Pr/M → done. All without leaving capture screen.

### 3. Gallery Chronological Order (commit `9f9bff3e`)
**Problem:** Gallery "All Photos" view grouped by area (Practical Life, Sensorial, etc.) — not chronological. Timeline tab was redundant.

**Changes in `app/montree/dashboard/[childId]/gallery/page.tsx`:**
- Removed "Timeline" tab button
- Removed "Tag Event" tab button
- "All Photos" now renders chronologically with date headers (using existing `timelineGroups` computation)
- Area-grouped view code removed entirely
- Area filter chips still work (filter by P/S/M/L/C)
- `viewMode` state still exists but is effectively always 'grid' (no breaking changes to other code that references it)

**Changes in `app/api/montree/audit/photos/route.ts`:**
- Sort changed from `.order('created_at', ...)` to `.order('captured_at', ...)`
- Date range filters also changed from `created_at` to `captured_at`
- Ensures Photo Audit matches gallery's chronological ordering

## Database State (Relevant)

### Visual Memory for Chalkboard Works
```
"Chalk Board Writing - No lines" — teacher_setup, confidence=1.0, has key_materials + negative_descriptions
"Chalkboard Writing" — teacher_setup, confidence=1.0, has key_materials + negative_descriptions
"Chalk Board Writing - Lined" — onboarding, confidence=0.8, no key_materials (NOT injected into prompts)
```

### Corrections Map Entries (Classroom 51e7adb6)
```
"Chalkboard Writing" → "Name Writing" (Mar 26) — OVERRIDDEN at runtime by Fix 1
"Name Writing" → "Chalk Board Writing - No lines" (multiple, Apr 2-4)
"Handwriting on Paper" → "Name Writing" (Mar 26)
```

### No Visual Memory for Metal Insets
Metal Insets has NO entry in `montree_visual_memory` for this classroom. This is why Haiku misclassifies chalkboard photos as Metal Insets — there's no negative description saying "Metal Insets MUST have actual metal geometric frames."

## Known Issues / Remaining Work

1. **Metal Insets misclassification:** Teacher needs to "Teach the AI" about Metal Insets (using a real Metal Insets photo) so the system can distinguish metal frames from chalkboard shapes. This will create negative_descriptions for Metal Insets.

2. **teacher_confirmed exclusion:** Photos confirmed in Photo Audit (P/Pr/M or "Just Save") set `teacher_confirmed=true` and are permanently excluded from audit. There's no mechanism to re-audit them. This is by design but surprised the teacher.

3. **Diagnostic logging still in route.ts:** Lines ~893, ~1615-1617, ~1631 have console.log statements for visual memory and Pass 2 debugging. Should be removed once classification is stable.

4. **`viewMode` state in gallery:** Still exists as 'grid' | 'timeline' type even though timeline tab is removed. Low priority cleanup — no functional impact.

5. **Onboarding mode (10% coverage):** Classroom is still in onboarding mode (<30% visual memory coverage). This routes normal pipeline to Sonnet direct path (more expensive). As more works get "Teach the AI" descriptions, coverage will increase past 30% and the system will use the cheaper Haiku two-pass exclusively.

## Files Changed

| File | Changes |
|------|---------|
| `app/api/montree/guru/photo-insight/route.ts` | Import fuzzyScore, visual memory corrections override, Pass 2 prompt, Scenario A threshold |
| `components/montree/guru/PhotoInsightPopup.tsx` | Tappable work name, remove Wrong? Fix, center Just Save |
| `app/montree/dashboard/capture/page.tsx` | onCorrect handler, WorkWheelPicker inline, area picker, curriculum loader |
| `app/montree/dashboard/[childId]/gallery/page.tsx` | Remove Timeline/Tag Event tabs, chronological All Photos view |
| `app/api/montree/audit/photos/route.ts` | Sort by captured_at instead of created_at |
| `CLAUDE.md` | Updated with session progress |

## Commits (in order)
1. `e7277f24` — Corrections map override + Scenario A threshold
2. `4c736971` — Tappable work name + inline corrections on capture page
3. `9f9bff3e` — Gallery chronological order + Photo Audit captured_at sort
