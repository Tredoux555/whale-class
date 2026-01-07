# WHALE HANDOFF - January 8, 2026

## What We Built This Session

### Per-School Curriculum System

**The Problem:** All schools shared one global curriculum. Teachers couldn't customize what materials they actually have on their shelves.

**The Solution:** Each school now gets its own copy of the curriculum (342 works) that teachers can customize.

---

## Database Changes (Already Applied)

### New Table: `school_curriculum`
```sql
- id, school_id, master_work_id
- area_id, category_id, name, chinese_name, description, sequence
- materials, direct_aims, indirect_aims, control_of_error, levels
- is_active (soft delete)
- materials_on_shelf (teacher toggle)
- custom_notes, is_custom
```

### New Column on `child_work_completion`
```sql
- school_work_id UUID (links progress to school-specific curriculum)
```

### Functions Created
- `clone_curriculum_to_school(school_id)` - Copies master curriculum to a school
- Already cloned 342 works to Beijing International School

### Data Verification
```sql
SELECT area_id, COUNT(*) FROM school_curriculum 
WHERE school_id = '00000000-0000-0000-0000-000000000001'
GROUP BY area_id;

-- Results:
-- cultural: 53
-- language: 66
-- math: 57
-- mathematics: 20 (duplicate area name - cleanup later)
-- practical_life: 101
-- sensorial: 45
```

---

## Files Created

### API Routes
```
app/api/school/[schoolId]/curriculum/route.ts
  - GET: Fetch school's curriculum (filter by area, active status)
  - PATCH: Update work (toggle materials_on_shelf, is_active, notes)

app/api/students/[studentId]/quick-place/route.ts
  - GET: Get student's current position + dropdown options per area
  - POST: Set positions (marks previous works as mastered)
```

### Pages
```
app/teacher/curriculum/page.tsx
  - 5 area tabs (Practical Life, Sensorial, Math, Language, Cultural)
  - Toggle "On Shelf" / "Not Available" per work
  - Show/hide inactive works
  - Search works

app/teacher/students/[studentId]/quick-place/page.tsx
  - 5 dropdowns (one per area)
  - Select current work → all previous = Mastered, selected = Practicing
  - Visual feedback on changes
```

---

## URLs to Test

| URL | Purpose |
|-----|---------|
| `/teacher/curriculum` | Teacher toggles what's on their shelf |
| `/teacher/students/795aa63d-2f73-4843-addb-35457436334a/quick-place` | Quick place Marina Willemse |

---

## Technical Notes

### Build Fix Applied
Supabase client was initialized at module level, causing Railway build to fail. Fixed by using lazy initialization:
```typescript
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

### Commits This Session
1. `9ab64e8` - feat: per-school curriculum system with quick placement
2. `895f63f` - feat: add quick-place page
3. `e847a11` - fix: lazy init supabase client to fix build

---

## How It Works

### Teacher Curriculum Page
1. Teacher visits `/teacher/curriculum`
2. Sees all works for their school grouped by area
3. Can toggle "On Shelf" to indicate they have the material
4. Can hide works they don't use (is_active = false)
5. Changes save instantly to database

### Quick Placement
1. Teacher visits `/teacher/students/[id]/quick-place`
2. Sees 5 area dropdowns with all works in sequence
3. Selects current work for each area
4. Clicks Save
5. All previous works → status: mastered
6. Selected work → status: practicing

---

## Next Steps

1. **Add navigation links:**
   - Link from `/teacher` dashboard to `/teacher/curriculum`
   - Add "Quick Place" button on student cards in `/teacher/progress`

2. **Data cleanup:**
   - Merge "math" and "mathematics" area_ids (77 total works should be under "math")

3. **Update teacher progress page:**
   - Use `school_curriculum` instead of `curriculum_roadmap` for work lookups
   - Filter by `materials_on_shelf = true` to only show available works

---

## Student IDs for Testing

```sql
-- Marina Willemse
795aa63d-2f73-4843-addb-35457436334a

-- Marina
2d55775b-d42e-4751-a3d0-a770a8da3922

-- Rachel
a868b65f-8558-4656-8c0a-ee2b4f66a208
```
