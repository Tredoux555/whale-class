# Handoff: Weekly Admin Docs — Plan Document Format Fix

**Date:** March 27, 2026
**Status:** ✅ COMPLETE — Ready to push

## What Changed

The Weekly Plan document generator was producing the wrong format. The sample document (`docs/samples/Weekly Plan 2026 - 27.docx`) showed a 7-column table with **English headers** and a specific two-row-per-child layout. The existing code had Chinese headers and per-area Chinese text fields that didn't match.

### Sample Document Format (What Teachers Actually Use)

```
| (name)  | Practical        | Sensorial   | Math           | Language      | Science & Culture   | Notes |
|---------|------------------|-------------|----------------|---------------|---------------------|-------|
| Rachel  | Snap clothing    | Rec Box 2   | Skip counting  | play I spy    | Map of the world    |       |
| 本周重点了解满十进位 |              |             |                |               |                     | 上周因为写数字卷，计划未变 |
```

- **Row 1 (Name row):** Child name + English work name per area + empty Notes column
- **Row 2 (Notes row):** Chinese developmental note in col0 + empty cols 1-5 + additional notes in col6
- **5 children per table**, multiple tables per page across weeks

## Files Modified (6)

### 1. `lib/montree/weekly-admin/doc-generator.ts` — 3 edits
- **ChildNotes interface:** Removed `zh` from `planAreas`, added `chineseNote` (string) and `notesText` (string)
- **PLAN_HEADERS_7:** Changed from Chinese to English: `['', 'Practical', 'Sensorial', 'Math', 'Language', 'Science & Culture', 'Notes']`
- **buildPlanTable notes row:** col0 = `child.chineseNote`, cols 1-5 = empty, col6 = `child.notesText`

### 2. `app/api/montree/weekly-admin-docs/generate/route.ts` — 1 edit
- Plan mode assembly: reads Chinese note from `area=null` notes entry, reads notes text from `area='notes'` entry. Passes as `chineseNote` and `notesText` on ChildNotes.

### 3. `app/montree/dashboard/weekly-admin-docs/page.tsx` — 4 edits
- **Notes parsing (load):** Plan notes with `area=null` → `_chinese` key, `area='notes'` → `_notes` key
- **Save handler:** Chinese note saved as `area: null`, notes text saved as `area: 'notes'`
- **PlanCard UI:** Redesigned from 5×(English+Chinese) side-by-side textareas to:
  - 5 English work name inputs in a horizontal row (one per area)
  - 1 Chinese developmental note textarea (below left)
  - 1 additional notes textarea (below right)

### 4. `app/api/montree/weekly-admin-docs/notes/route.ts` — 1 edit (audit fix)
- Added `'notes'` to `validAreas` whitelist. Without this, saving plan notes with additional notes text would be rejected with 400.

### 5. `lib/montree/i18n/en.ts` + `zh.ts` — 2 new keys each
- `weeklyAdmin.chineseNote`: "Chinese Note" / "中文备注"
- `weeklyAdmin.additionalNotes`: "Notes" / "备注"

## Data Model (DB: `montree_weekly_admin_notes`)

Plan notes per child per week are stored as multiple rows:

| doc_type | area | english_text | chinese_text | Purpose |
|----------|------|-------------|--------------|---------|
| plan | practical_life | "Snap clothing frame" | null | Work name for Practical Life |
| plan | sensorial | "Rec Box 2" | null | Work name for Sensorial |
| plan | mathematics | "Skip counting" | null | Work name for Math |
| plan | language | "play I spy" | null | Work name for Language |
| plan | cultural | "Map of the world" | null | Work name for Cultural |
| plan | null | null | "本周重点了解满十进位" | Overall Chinese developmental note |
| plan | notes | "上周因为写数字卷，计划未变" | null | Additional notes |

Unique index: `(child_id, week_start, doc_type, COALESCE(area, '__summary__'))` — no conflicts because `doc_type` differentiates plan vs summary rows.

## Audit Results

1 CRITICAL bug found and fixed (missing `'notes'` in validAreas). Unique index collision concern investigated and cleared. Full data flow verified end-to-end.

## No Migrations Needed

All changes use existing DB schema. No new columns or tables.
