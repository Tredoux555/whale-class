# Handoff: Classroom Onboarding Redesign — 3 Sprints

**Date:** Mar 26, 2026
**Commit:** `8c32102b`
**Deploy:** ✅ Pushed + Railway deployed. Migration 148 run.
**Audit:** Triple audited — 4 cycles, 4 fixes applied, 3 consecutive CLEAN passes.

---

## Overview

Three-sprint classroom onboarding redesign making it faster for teachers to set up classrooms and collaborate.

## Sprint 1: Bulk Paste Student Import

**Problem:** Adding students one-by-one was tedious. Teachers coming from Excel wanted to paste lists.

**Solution:** `BulkPasteImport.tsx` — two side-by-side textareas (names + birthdays). Supports:
- Tab-separated paste from Excel/Sheets
- Date format selector (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)
- Smart parser handles mixed formats, blank lines, extra whitespace
- Duplicate detection (case-insensitive against existing + within paste)
- Age validation (0-18 years) with per-row error display
- Preview table before confirmation
- Wired into dashboard empty state + "Import Students" modal button

**API change:** `children/bulk/route.ts` now accepts `date_of_birth` field, derives `age` from DOB automatically.

## Sprint 2: Multi-Teacher Management

**Problem:** Only one teacher per classroom, no way to add colleagues.

**Solution:** Teacher selector dropdown in `DashboardHeader.tsx`:
- Dropdown shows all active teachers in current classroom
- "Add Teacher" inline form (name input → auto-generates 6-char login code)
- Login code uses charset excluding O/0/I/1 for readability
- SHA256 hash for password, collision retry on 23505 duplicate
- Toast feedback on success/failure
- New API: `GET/POST /api/montree/classroom/teachers`

## Sprint 3: Teacher Notes with Voice Recording

**Problem:** No way for teachers to leave notes for each other about the classroom.

**Solution:** `TeacherNotes.tsx` — classroom-level notes section:
- Text notes with teacher name + relative timestamps
- Voice recording via MediaRecorder API → Whisper transcription
- Transcription fills textarea for teacher editing before save
- Delete own notes only (teacher_id ownership check)
- Paginated fetch (20 notes at a time)
- New API: `GET/POST/DELETE /api/montree/teacher-notes`

## Migration 148

```sql
ALTER TABLE montree_children
  ADD COLUMN IF NOT EXISTS date_of_birth DATE DEFAULT NULL;

CREATE TABLE IF NOT EXISTS montree_teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES montree_teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  content TEXT,
  audio_storage_path TEXT,
  transcription TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_notes_classroom_created
  ON montree_teacher_notes (classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher
  ON montree_teacher_notes (teacher_id);
```

## Files Created (5)

1. `migrations/148_classroom_onboarding.sql` — date_of_birth column + teacher_notes table
2. `app/api/montree/classroom/teachers/route.ts` (~158 lines) — GET/POST teachers per classroom
3. `app/api/montree/teacher-notes/route.ts` (~165 lines) — GET/POST/DELETE classroom notes
4. `components/montree/TeacherNotes.tsx` (~250 lines) — Notes UI with voice recording
5. `components/montree/BulkPasteImport.tsx` (~355 lines) — Paste-based bulk student import

## Files Modified (5)

1. `app/api/montree/children/bulk/route.ts` — date_of_birth support + age derivation
2. `components/montree/DashboardHeader.tsx` — Teacher selector dropdown + add teacher inline
3. `app/montree/dashboard/page.tsx` — Dynamic imports for BulkPasteImport + TeacherNotes wiring
4. `lib/montree/i18n/en.ts` — 44 new keys (bulkImport.*, teachers.*, teacherNotes.*)
5. `lib/montree/i18n/zh.ts` — 44 matching Chinese keys (perfect EN/ZH parity)

## Triple Audit Results

| Cycle | Result | Issues |
|-------|--------|--------|
| 1 | 3 issues found + fixed | formatTime i18n, toast import, toast feedback |
| 2 | 1 issue found + fixed | `t` missing from useCallback deps |
| 3 | CLEAN | 4 false positives triaged |
| 4 | CLEAN | All 3 agents verified |

3 consecutive CLEAN passes achieved (Cycles 2-fix → 3 → 4).

## i18n Keys Added (44)

- `bulkImport.*` — 25 keys (paste names, birthdays, format selector, preview, errors)
- `teachers.*` — 6 keys (add teacher, login code, added, addFailed)
- `teacherNotes.*` — 13 keys (notes, record, transcribing, delete, empty state)
