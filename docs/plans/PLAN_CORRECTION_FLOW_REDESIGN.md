# Plan v1: Photo Audit Correction Flow Redesign

## Problem Statement

Three UX/data issues with the photo audit correction flow:

### Issue 1: Area Lock-In During Corrections
When a teacher taps "Fix" on a misidentified photo, they enter AreaPickerWithSearch which has cross-area search. BUT — if the teacher picks an area first (e.g., Practical Life), the WorkWheelPicker that opens next is locked to that area. If the work is actually in Language, the teacher has no way to switch areas from within WorkWheelPicker. They must close, re-open, and pick the correct area.

**Current flow:** Fix → AreaPickerWithSearch (cross-area search OR pick area) → WorkWheelPicker (locked to one area)

**Desired flow:** Fix → AreaPickerWithSearch (cross-area search works, auto-switches area) → WorkWheelPicker (with cross-area search that auto-jumps areas)

### Issue 2: No AI Enrichment for Teacher Corrections
When a teacher adds a custom work (e.g., "Blue Series Blends 'st'"), the work gets basic fields (name, area) but no rich descriptions. The existing `enrichCustomWorkInBackground()` function generates descriptions from the work NAME alone — but the teacher knows MORE about the work than the name conveys. Teachers should be able to write a brief description ("Children learn to blend 'st' sound using objects like strawberry, stick, starfish") and have AI enrich it into full Montessori-quality parent_description + why_it_matters.

### Issue 3: Granular Curriculum for Progress Tracking
Teachers want specific work entries (e.g., individual blend works: "Blue Series Blends 'st'", "Blue Series Blends 'bl'") rather than umbrella categories ("Blue Series Blends"). This granularity feeds into:
- Teacher progress tracking (which blends has the child practiced/mastered?)
- Parent report descriptions (specific description for each blend)
- Smart Capture accuracy (AI learns to distinguish 'st' objects from 'bl' objects)

---

## Plan: 3 Sprints

### Sprint 1: Cross-Area Search in WorkWheelPicker (UI Fix)

**Goal:** When teacher types a search query in WorkWheelPicker, search ALL areas — not just the current one. If the match is in a different area, auto-switch.

**Changes to `WorkWheelPicker.tsx`:**
1. Add new prop: `allCurriculum?: Record<string, Work[]>` — all curriculum works grouped by area (optional, backwards-compatible)
2. When `allCurriculum` is provided AND search text is entered:
   - Search across ALL areas (not just `works` prop)
   - Show results with area color dot + area label (same style as AreaPickerWithSearch)
   - When teacher taps a cross-area result, call `onSelectWork(work, status)` with the work from the correct area
3. Add new callback prop: `onAreaSwitch?: (areaKey: string) => void` — fires when cross-area result selected, so parent component can update its area state
4. If no `allCurriculum` provided, behavior unchanged (search within current area only)

**Changes to `photo-audit/page.tsx`:**
1. Pass `allCurriculum={curriculum}` to WorkWheelPicker when used in correction mode
2. Handle `onAreaSwitch` to update `pickerArea` state
3. Wire `handleWorkSelected` to use the area from the cross-area result

**Estimated:** ~60 lines changed across 2 files. No API changes. No migration.

### Sprint 2: AI-Enriched Custom Work Creation (New "Add + Describe" Flow)

**Goal:** When teacher adds a custom work during photo correction, they provide a brief description and AI enriches it into full Montessori descriptions.

**New flow when teacher taps "+ Add custom work" in WorkWheelPicker:**
1. Teacher enters work name (existing)
2. NEW: Teacher enters a brief description (1-2 sentences) — textarea, optional but encouraged
3. Teacher confirms — work is created immediately in curriculum
4. Background: `enrichCustomWorkInBackground()` is called with BOTH the work name AND the teacher's description
5. AI generates: `parent_description`, `why_it_matters`, `quick_guide`, `description`, `direct_aims`, `indirect_aims`, `materials`
6. The teacher's description is used as a "seed" — AI expands it into proper Montessori language

**Changes to `WorkWheelPicker.tsx`:**
1. Add textarea below name input in the add-work form: "Brief description (optional) — e.g., 'Children learn to blend st sound using objects'"
2. Pass `teacher_description` to the POST /api/montree/curriculum body

**Changes to `app/api/montree/curriculum/route.ts` POST handler:**
1. Accept new field `teacher_description` in request body
2. Pass to `enrichCustomWorkInBackground(name, area, schoolId, { teacherDescription })`

**Changes to `lib/montree/guru/work-enrichment.ts`:**
1. Accept optional `teacherDescription` parameter
2. If provided, include in the Sonnet prompt: "The teacher described this work as: '{teacherDescription}'. Use this as context to generate accurate, expanded Montessori descriptions."
3. The teacher description acts as a SEED — AI doesn't just copy it, it enriches it with proper terminology, developmental impact, and materials detail

**Changes to `app/api/montree/curriculum/route.ts` POST handler (additional):**
1. Store `teacher_description` in the `teacher_notes` column (already exists on the table from migration 144)

**Estimated:** ~40 lines across 3 files. No migration needed.

### Sprint 3: Granular Work Templates for Common Subdivisions

**Goal:** Make it trivially easy for teachers to add granular works (individual blends, individual phonograms, etc.) with proper descriptions pre-generated.

**Approach: "Quick Add" templates in WorkWheelPicker add form**

When teacher taps "+ Add custom work" in the Language area, show a section:
"Quick Add Templates" with expandable groups:
- Blue Series Blends (st, bl, cr, fl, gr, pl, sl, sp, tr, br, cl, dr, fr, gl, pr, sk, sm, sn, sw)
- Green Series Phonograms (sh, ch, th, ai, ee, oa, oo, ou, ow, oi, ar, er, ir, or, ur, igh, tion, etc.)
- Pink Series CVC by Vowel (CVC 'a', CVC 'e', CVC 'i', CVC 'o', CVC 'u')

Each template comes with:
- Pre-filled name: "Blue Series Blends 'st'"
- Pre-filled teacher_description: "Children practice blending the 'st' consonant blend using objects whose names start with st- (e.g., star, stick, stamp, stool)"
- Area auto-set to `language`

Teacher taps a template → work is created with pre-filled name + description → AI enrichment fires in background.

**Implementation:**

**New file: `lib/montree/curriculum/work-templates.ts`** (~150 lines)
- Export `WORK_TEMPLATES` grouped by area
- Each template: `{ name, teacherDescription, areaKey, category }`
- Only Language area initially (blends, phonograms, CVC subdivisions)
- Extensible to other areas later (e.g., Sensorial: individual color boxes, individual fabric pairs)

**Changes to `WorkWheelPicker.tsx`:**
1. Import templates
2. When in add-work mode AND area is `language` (or any area with templates):
   - Show "Quick Add" section above the manual name input
   - Collapsible groups (Blue Series Blends, Green Series Phonograms, etc.)
   - Each item: name + one-tap add button
   - Already-existing works grayed out (check against `works` prop)
3. One-tap fires the same add-work POST with pre-filled name + teacher_description

**Estimated:** ~150 lines new file + ~80 lines in WorkWheelPicker. No migration.

---

## Files Summary

### New Files (1):
1. `lib/montree/curriculum/work-templates.ts` — Quick-add templates for granular works

### Modified Files (3):
1. `components/montree/WorkWheelPicker.tsx` — Cross-area search + teacher description input + quick-add templates
2. `app/montree/dashboard/photo-audit/page.tsx` — Pass allCurriculum + handle area switch
3. `lib/montree/guru/work-enrichment.ts` — Accept teacher description as enrichment seed

### Optionally Modified (1):
4. `app/api/montree/curriculum/route.ts` — Accept + store teacher_description

### i18n (2):
5. `lib/montree/i18n/en.ts` — ~10 new keys
6. `lib/montree/i18n/zh.ts` — ~10 matching Chinese keys

### No Migrations Needed
- `teacher_notes` column already exists (migration 144)
- `montree_classroom_curriculum_works` already has all needed columns

---

## Data Flow After All 3 Sprints

```
Teacher sees misidentified photo
  → Taps "Fix"
  → AreaPickerWithSearch opens (can search cross-area)
  → Types "st blend" → finds "Blue Series Blends 'st'" in Language
  → OR enters WorkWheelPicker → types "blend" → cross-area search finds it
  → If work doesn't exist yet:
    → "+ Add custom work"
    → Quick Add Templates show "Blue Series Blends" group
    → One-tap "st" → creates work with pre-filled description
    → AI enriches in background (parent_description, why_it_matters, etc.)
  → Correction saved → Smart Capture learns from it
  → Next parent report shows specific "Blue Series Blends 'st'" description
  → Progress tracking shows individual blend mastery
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| WorkWheelPicker changes break other callers | HIGH | `allCurriculum` prop is optional — all existing callers work unchanged |
| AI enrichment generates bad descriptions | MEDIUM | Teacher description seeds quality; descriptions editable in curriculum page |
| Quick-add templates bloat curriculum | LOW | Teachers choose which to add; templates don't auto-seed |
| Cross-area search confusing in non-correction contexts | LOW | Only enabled when `allCurriculum` prop provided |
