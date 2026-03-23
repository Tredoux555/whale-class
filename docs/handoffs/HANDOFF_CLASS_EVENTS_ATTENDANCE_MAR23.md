# Handoff: Class Events Attendance Tagging — Mar 23, 2026

## Summary

Teachers can now create custom events (e.g., "Trip to Science Museum", "Cultural Day") and tag children to those events individually or via "Tag All". Events are fully custom — no pre-prescribed event list. Built for Tuesday Mar 24 demo.

## Methodology

- **3 Plan-Audit Cycles** (9 independent agents): Plan v1 → Audit → Plan v2 → Audit → Plan v3 (FINAL) → Audit → CLEAN
- **3 Build-Audit Cycles** (9 independent agents): Build → Audit 1 → fixes → Audit 2 → fixes → Audit 3 → **ALL CLEAN**

## Architecture

### Database

**Migration 145** (`migrations/145_event_attendance.sql`) — ✅ Already run via Supabase SQL Editor:
- Adds `classroom_id UUID REFERENCES montree_classrooms(id)` column to `montree_events`
- Creates `montree_event_attendance` table:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `event_id UUID NOT NULL REFERENCES montree_events(id) ON DELETE CASCADE`
  - `child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE`
  - `tagged_by UUID REFERENCES montree_teachers(id)`
  - `tagged_at TIMESTAMPTZ DEFAULT now()`
  - `UNIQUE(event_id, child_id)` — idempotent upserts via ON CONFLICT

### API

**GET `/api/montree/events/attendance?event_id=X`**
- Returns attendance records for an event with photo counts per child
- Auth: `verifySchoolRequest()` — teacher must belong to the event's school

**POST `/api/montree/events/attendance`**
- Body: `{ event_id, child_ids?, action: 'set' | 'set_all' | 'remove' }`
- `set`: Tag specific children (bulk upsert via ON CONFLICT DO NOTHING)
- `set_all`: Tag all children in a classroom (requires classroom_id on event)
- `remove`: Remove specific children's tags (bulk delete)
- Auth: Teacher classroom permission check — teachers can only tag events in their own classroom

**POST `/api/montree/events`** (existing, modified)
- Now validates `classroom_id` belongs to `auth.schoolId` before inserting
- Fixed `created_by: auth.sub` → `created_by: auth.userId` (VerifiedRequest has userId not sub)

### Frontend

**`EventAttendanceModal.tsx`** (~400 lines):
- Event selector dropdown with inline create (name + date)
- Stacked child list with checkboxes
- "Tag All" / "Clear All" toggle button
- Diff-based save: tracks `initialChecked` (server state) vs `checked` (UI state), computes toAdd/toRemove, sends both in parallel via `Promise.all`
- `hasChanges` disables Save button when no diff exists
- Uses `childrenRef` (useRef) to avoid stale closures in toggleAll
- `newEventDate` resets to today on modal open
- Backdrop click-to-close with `e.stopPropagation()` on inner panel
- All 12+ strings wired to i18n via `t()` calls

### Gallery Integration

- "Tag Event" button (emerald) on gallery page opens EventAttendanceModal
- `onSaved` just closes modal (events don't change photos)

## Files Created (2)

| File | Lines | Purpose |
|------|-------|---------|
| `app/api/montree/events/attendance/route.ts` | ~230 | GET (attendance + photo counts) + POST (bulk set/set_all/remove with classroom auth) |
| `components/montree/events/EventAttendanceModal.tsx` | ~400 | Modal with event selector, inline create, stacked child list, Tag All, diff-based save |

## Files Modified (5)

| File | Changes |
|------|---------|
| `app/api/montree/events/route.ts` | 2 edits: `auth.userId` fix + classroom validation on POST |
| `lib/montree/media/types.ts` | Added `classroom_id: string \| null` to MontreeEvent interface |
| `app/montree/dashboard/[childId]/gallery/page.tsx` | onSaved fix (close modal instead of fetchPhotos) + Tag Event button color (emerald) |
| `lib/montree/i18n/en.ts` | 9 new `events.*` keys |
| `lib/montree/i18n/zh.ts` | 9 matching Chinese keys (perfect EN/ZH parity) |

## i18n Keys Added (9 per language)

```
events.selectAnEvent, events.cancel, events.create, events.creating,
events.newEventPlaceholder, events.tagged, events.saveTagged, events.ofTagged
```
(Plus `events.tagAll` already existed)

## Audit Issues Found and Fixed (10 total)

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | `auth.sub` doesn't exist on VerifiedRequest | CRITICAL | Changed to `auth.userId` |
| 2 | Two sequential save requests → data inconsistency | CRITICAL | Diff-based approach with parallel Promise.all |
| 3 | Missing classroom validation on events POST | HIGH | Validate classroom_id belongs to school before insert |
| 4 | Missing teacher classroom permission on attendance POST | HIGH | Check auth.classroomId matches event.classroom_id |
| 5 | toggleAll stale closure with children array | MEDIUM | childrenRef (useRef) + functional state updater |
| 6 | Missing classroom_id on MontreeEvent type | MEDIUM | Added to interface |
| 7 | onSaved={fetchPhotos} unnecessary refresh | LOW | Changed to close modal |
| 8 | All strings hardcoded English | MEDIUM | Added useI18n() + 9 new keys EN/ZH |
| 9 | newEventDate stale across midnight | LOW | Reset in isOpen useEffect |
| 10 | Inconsistent error format (`success: false`) | LOW | Removed to match codebase pattern |

## Deploy Status

- **Migration 145:** ✅ Already run via Supabase SQL Editor
- **Code:** ⚠️ NOT YET PUSHED

### Push Command

```bash
cd ~/Desktop/Master\ Brain/ACTIVE/whale
git add app/api/montree/events/route.ts app/api/montree/events/attendance/route.ts components/montree/events/EventAttendanceModal.tsx lib/montree/media/types.ts app/montree/dashboard/\[childId\]/gallery/page.tsx lib/montree/i18n/en.ts lib/montree/i18n/zh.ts CLAUDE.md docs/handoffs/HANDOFF_CLASS_EVENTS_ATTENDANCE_MAR23.md
git commit -m "feat: class events attendance tagging — create events + tag children individually or Tag All"
git push origin main
```

## Key Patterns for Future Reference

1. **Diff-based save:** Track server state separately from UI state, compute minimal diff, send add + remove in parallel. Prevents partial saves.
2. **useRef for stale closures:** When a callback needs access to a list that changes, use `childrenRef.current` instead of closing over the state variable.
3. **Classroom permission check:** Teachers should only be able to modify events scoped to their own classroom. Validate `auth.classroomId === event.classroom_id`.
4. **Idempotent upserts:** `ON CONFLICT (event_id, child_id) DO NOTHING` makes bulk tagging safe to retry.
