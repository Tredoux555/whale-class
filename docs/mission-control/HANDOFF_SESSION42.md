# HANDOFF: Session 42 - Classroom Curriculum Architecture
**Date:** January 18, 2026  
**Status:** ARCHITECTURE COMPLETE ✅

## SUMMARY

Set up independent, editable curriculum per classroom stored in the database. Each classroom gets its own copy that teachers can modify.

## WHAT'S WORKING

### Dashboard (`/montree/dashboard`)
- Clean light theme (educational-friendly)
- Auto-resizing grid that fills the page
- Blue avatars with progress bars
- 22 children displayed properly

### Student Page (`/montree/dashboard/student/[id]`)
- Blue gradient header with stats
- Swipeable work rows
- Status cycling (○ → P → Pr → M)
- Expandable panels for notes/capture/demo

## NEW: CLASSROOM CURRICULUM ARCHITECTURE

### Database Schema
Two new tables (run migration in Supabase):

```sql
-- File: supabase/migrations/20260118_classroom_curriculum.sql

classroom_curriculum_areas
├── id (UUID)
├── classroom_id (UUID) -- Links to classroom
├── area_key (TEXT)     -- practical_life, sensorial, etc
├── name (TEXT)
├── icon (TEXT)
├── color (TEXT)
├── sequence (INT)
├── is_active (BOOL)

classroom_curriculum_works
├── id (UUID)
├── area_id (UUID)      -- FK to areas
├── classroom_id (UUID) -- Denormalized
├── work_key (TEXT)     -- pl_carrying_mat
├── name (TEXT)
├── name_chinese (TEXT)
├── description (TEXT)
├── materials (JSONB)
├── video_search_terms (JSONB)
├── sequence (INT)
├── is_active (BOOL)
├── teacher_notes (TEXT) -- Custom notes
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/montree/curriculum/seed` | POST | Create curriculum for a classroom |
| `/api/montree/curriculum/seed` | GET | Check if curriculum exists |
| `/api/montree/curriculum/seed` | DELETE | Remove curriculum (to re-seed) |
| `/api/montree/curriculum/works` | GET | Fetch works by area (DB or fallback to JSON) |

### How to Seed a Classroom

```javascript
// POST /api/montree/curriculum/seed
fetch('/api/montree/curriculum/seed', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ classroomId: 'uuid-of-classroom' })
})

// Response:
{
  "success": true,
  "areasCreated": 5,
  "worksCreated": 195
}
```

### Data Flow

```
Master JSON Files (lib/curriculum/data/*.json)
         │
         ▼ (on seed)
classroom_curriculum_areas + classroom_curriculum_works
         │
         ▼ (on query)
/api/montree/curriculum/works?area=practical_life&classroomId=xxx
         │
         ▼ (returns)
Works array for swipeable rows
```

### Fallback Behavior

If no classroom curriculum exists in DB, the API falls back to master JSON files. This means the system works immediately without seeding.

## NEXT STEPS FOR TOMORROW

### 1. Run Database Migration
```bash
# In Supabase SQL editor, run:
supabase/migrations/20260118_classroom_curriculum.sql
```

### 2. Seed Whale Class Curriculum
After migration, seed the curriculum:
```bash
curl -X POST http://localhost:3000/api/montree/curriculum/seed \
  -H "Content-Type: application/json" \
  -d '{"classroomId": "whale-class-uuid"}'
```

### 3. Build Curriculum Editor
Create `/montree/admin/curriculum` page to:
- View all works
- Enable/disable works
- Add teacher notes
- Reorder sequence

### 4. Add Work Flow
Build the "Add Work" page to assign works to students from the classroom's curriculum.

## FILES CREATED THIS SESSION

```
app/montree/dashboard/page.tsx                    # Auto-resize grid
app/api/montree/curriculum/seed/route.ts          # Seed API
app/api/montree/curriculum/works/route.ts         # Works fetch API
supabase/migrations/20260118_classroom_curriculum.sql  # DB schema
```

## CURRICULUM STATISTICS

From master JSON:
- **5 areas**: Practical Life, Sensorial, Math, Language, Cultural
- **~195 works** total
- Each work has: name, Chinese name, description, materials, video terms, levels

## KEY DESIGN DECISIONS

1. **Per-classroom curriculum** - Each classroom owns its data
2. **Editable** - Teachers can enable/disable, add notes, reorder
3. **Seeded from master** - Initial copy from JSON, then independent
4. **Fallback** - Works without DB setup (uses JSON directly)

---

**Start next session:** "Run curriculum migration, seed Whale Class, build curriculum editor"
