# WHALE HANDOFF - January 8, 2026

## What We Built This Session

### Per-Classroom Curriculum System

**The Problem:** All classrooms shared one global curriculum. Teachers couldn't customize what's actually on their shelves.

**The Solution:** Each classroom now gets its own copy of the curriculum that teachers can customize.

---

## Files Created

### 1. Database Migration
```
migrations/022_classroom_curriculum.sql
```
- Creates `classroom_curriculum` table
- Auto-clones curriculum when new classroom is created
- `quick_place_student()` function for bulk progress updates
- Clones curriculum to any existing classrooms

### 2. API Routes
```
app/api/classroom/[classroomId]/curriculum/route.ts
  - GET: Fetch classroom's curriculum
  - PATCH: Update work (toggle on_shelf, add notes)
  - POST: Add custom work

app/api/students/[studentId]/quick-place/route.ts
  - GET: Get student's current positions + curriculum options
  - POST: Set positions (marks previous works as mastered)
```

### 3. Page Components
```
app/teacher/curriculum/page.tsx
  - Teacher can see all works grouped by area
  - Toggle "On Shelf" / "Not Available" per work
  - Hide works they don't use
  - Search works

app/teacher/students/[studentId]/quick-place/page.tsx
  - 5 dropdowns (one per area)
  - Select current work for each area
  - Saves → all previous works marked MASTERED
  - Selected work marked PRACTICING
```

---

## How It Works

### On Classroom Creation:
1. Trigger fires `clone_curriculum_to_classroom()`
2. Copies all ~268 works from `curriculum_roadmap` to `classroom_curriculum`
3. Each classroom = independent, editable curriculum

### Teacher Customization:
- Toggle `materials_on_shelf` (what's actually available)
- Add notes per work
- Hide works with `is_active = false`
- Add custom works

### Quick Placement:
1. Teacher selects current work per area
2. API marks all PREVIOUS works as mastered (status=3)
3. Selected work set to practicing (status=2)
4. One action = student fully placed

---

## NEXT STEP: Run Migration

### In Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard → Your Project → SQL Editor
2. Copy contents of `migrations/022_classroom_curriculum.sql`
3. Click "Run"
4. Should see: "Success. No rows returned"

### Verify It Worked:
```sql
-- Check table exists
SELECT COUNT(*) FROM classroom_curriculum;

-- Should show your classroom with ~268 works
SELECT classroom_id, COUNT(*) 
FROM classroom_curriculum 
GROUP BY classroom_id;
```

---

## New URLs

| URL | Purpose |
|-----|---------|
| `/teacher/curriculum` | Teacher edits what's on their shelf |
| `/teacher/students/[id]/quick-place` | Quick placement UI |

---

## Testing After Migration

1. **Teacher Curriculum:**
   - Go to `/teacher/curriculum`
   - Should see 5 area tabs
   - Toggle "On Shelf" for various works
   - Search for a work

2. **Quick Placement:**
   - Go to a student in teacher progress view
   - Navigate to `/teacher/students/[student-id]/quick-place`
   - Select current work for each area
   - Save
   - Check progress updated

---

## Database Summary

**New table: `classroom_curriculum`**
| Column | Purpose |
|--------|---------|
| `classroom_id` | Which classroom owns this |
| `master_work_id` | Links to original curriculum_roadmap |
| `name`, `area_id`, etc | Copied from master, editable |
| `is_active` | Hide works (soft delete) |
| `materials_on_shelf` | Teacher has this material |
| `custom_notes` | Teacher's notes |
| `is_custom` | True if teacher added this |

**Updated: `child_work_progress`**
- New column: `classroom_work_id` (links to classroom curriculum)

**Functions:**
- `clone_curriculum_to_classroom(classroom_id)` - copies master
- `quick_place_student(child_id, placements)` - bulk sets progress

---

## After This Works

Next priorities:
1. Add link to `/teacher/curriculum` from teacher dashboard
2. Add "Quick Place" button on student cards
3. Update teacher progress to use `classroom_curriculum` instead of `curriculum_roadmap`
