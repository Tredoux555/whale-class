# HANDOFF: Montree Foundation Phase 2

**Date:** 2026-01-18  
**Session:** 44  
**Status:** Phase 1 COMPLETE, Phase 2 READY

---

## WHAT WAS BUILT (Phase 1)

### Database (8 tables in Supabase)
```
montree_schools
├── montree_classrooms
│   ├── montree_classroom_curriculum_areas (5 per classroom)
│   ├── montree_classroom_curriculum_works (268 per classroom)
│   └── montree_children
│       └── montree_child_assignments
├── montree_school_curriculum_areas (5 per school)
└── montree_school_curriculum_works (268 per school)
```

### Master Curriculum (THE STEM)
- **Location:** `lib/montree/stem/*.json`
- **Content:** 5 areas, 39 categories, 268 works
- **Files:** practical-life.json, sensorial.json, math.json, language.json, cultural.json
- **READ-ONLY** - Never modified at runtime

### TypeScript Types
- **Location:** `lib/montree/types/curriculum.ts`
- **Interfaces:** MontreeSchool, MontreeClassroom, SchoolCurriculumArea, ClassroomCurriculumArea, SchoolCurriculumWork, ClassroomCurriculumWork, MontreeChild, ChildAssignment, StemArea, StemCategory, StemWork
- **Constants:** AREA_KEYS, ASSIGNMENT_STATUSES, STATUS_COLORS, AREA_COLORS

### Seeding Functions
- **Location:** `lib/montree/seed/`
- `seed-school.ts` - Seeds school curriculum from stem (268 works)
- `seed-classroom.ts` - Seeds classroom curriculum from school
- Both use upsert with onConflict for idempotency

### API Endpoints
| Method | Endpoint | Action |
|--------|----------|--------|
| GET | `/api/montree/schools` | List all schools |
| POST | `/api/montree/schools` | Create school + auto-seed 268 works |
| GET | `/api/montree/classrooms` | List classrooms |
| POST | `/api/montree/classrooms` | Create classroom + auto-seed from school |

---

## HOW TO TEST

```bash
# 1. Create a school (seeds 268 works automatically)
curl -X POST http://localhost:3000/api/montree/schools \
  -H "Content-Type: application/json" \
  -d '{"name": "Test School", "slug": "test-school", "owner_email": "test@example.com"}'

# 2. Create a classroom (seeds from school)
curl -X POST http://localhost:3000/api/montree/classrooms \
  -H "Content-Type: application/json" \
  -d '{"school_id": "<UUID_FROM_STEP_1>", "name": "Butterfly Class"}'

# 3. Verify in Supabase
# - montree_schools should have 1 row
# - montree_school_curriculum_areas should have 5 rows
# - montree_school_curriculum_works should have 268 rows
# - montree_classrooms should have 1 row
# - montree_classroom_curriculum_areas should have 5 rows
# - montree_classroom_curriculum_works should have 268 rows
```

---

## PHASE 2: WHAT TO BUILD NEXT

### Step 9: School [id] CRUD
Create `app/api/montree/schools/[id]/route.ts`:
- GET - Get single school with stats
- PUT - Update school settings
- DELETE - Delete school (cascades to everything)

### Step 10: Classroom [id] CRUD  
Create `app/api/montree/classrooms/[id]/route.ts`:
- GET - Get classroom with curriculum summary
- PUT - Update classroom settings
- DELETE - Delete classroom

### Step 11: Children CRUD
Update `app/api/montree/children/` to use new schema:
- POST - Add child to classroom
- GET - Get child with assignments
- PUT - Update child
- DELETE - Remove child

### Step 12: Assignment APIs
Create `app/api/montree/assignments/`:
- POST - Assign work to child
- PUT - Update assignment status (not_started → presented → practicing → mastered)
- GET - Get assignments for child

---

## PHASE 3: AI INTEGRATION (THE DIFFERENTIATOR)

### Step 13: Developmental Analysis
`POST /api/montree/ai/analyze`
- Input: child_id
- Output: AI analysis of progress, developmental insights

### Step 14: Weekly Report Generator
`POST /api/montree/ai/weekly-report`
- Input: child_id, week_start
- Output: Parent-friendly report with insights

### Step 15: Next-Work Suggester
`POST /api/montree/ai/suggest-next`
- Input: child_id
- Output: List of recommended works based on prerequisites and mastery

---

## KEY FILES TO KNOW

| File | Purpose |
|------|---------|
| `lib/montree/stem/*.json` | Master curriculum (READ-ONLY) |
| `lib/montree/types/curriculum.ts` | All TypeScript interfaces |
| `lib/montree/seed/seed-school.ts` | Seeds school from stem |
| `lib/montree/seed/seed-classroom.ts` | Seeds classroom from school |
| `lib/montree/constants.ts` | Shared constants and defaults |
| `app/api/montree/schools/route.ts` | Schools API |
| `app/api/montree/classrooms/route.ts` | Classrooms API |
| `supabase/migrations/050_montree_foundation.sql` | Database schema |
| `docs/mission-control/brain.json` | Session state |

---

## ARCHITECTURE PRINCIPLES

1. **STEM is READ-ONLY** - Master curriculum never modified at runtime
2. **Copy-down hierarchy** - Master → School → Classroom (each owns their copy)
3. **Database first** - All data in Supabase, frontend just displays it
4. **Upsert everything** - Use onConflict for idempotent operations
5. **Cascade deletes** - Delete school → deletes all children data
6. **AI is the differentiator** - This is what schools pay for

---

## NOTES

- Beijing International School already exists in `montree_schools` (UUID: 00000000-0000-0000-0000-000000000001)
- Old `/admin/` sandbox is UNTOUCHED - keep it separate
- Whale Class (your teaching) stays in admin sandbox for now
