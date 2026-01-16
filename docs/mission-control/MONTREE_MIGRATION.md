# MONTREE MIGRATION GUIDE
## Clearing Old Data & Establishing Source of Truth

---

## PRINCIPLE

> **Montree (`/schools/`) is THE source of truth.**
> **Admin (`/admin/`) is a pet project - separate, not connected.**

---

## PHASE 1: DATABASE CLEANUP (Run in Supabase SQL Editor)

### Step 1: Add missing columns to children table
```sql
-- Add display_order for proper student ordering
ALTER TABLE children ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add classroom_id for multi-classroom support (future)
ALTER TABLE children ADD COLUMN IF NOT EXISTS classroom_id UUID;

-- Add school_id if not exists (should exist)
ALTER TABLE children ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
```

### Step 2: Set display_order for Whale Class students
```sql
UPDATE children SET display_order = 1 WHERE name = 'Rachel' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 2 WHERE name = 'Yueze' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 3 WHERE name = 'Lucky' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 4 WHERE name = 'Austin' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 5 WHERE name = 'Minxi' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 6 WHERE name = 'Leo' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 7 WHERE name = 'Joey' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 8 WHERE name = 'Eric' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 9 WHERE name = 'Jimmy' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 10 WHERE name = 'Kevin' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 11 WHERE name = 'Niuniu' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 12 WHERE name = 'Amy' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 13 WHERE name = 'Henry' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 14 WHERE name = 'Segina' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 15 WHERE name = 'Hayden' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 16 WHERE name = 'KK' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 17 WHERE name = 'Kayla' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
UPDATE children SET display_order = 18 WHERE name = 'Stella' AND school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
```

### Step 3: Verify children are correctly linked
```sql
-- Should return 18 students for Beijing International
SELECT name, display_order, school_id 
FROM children 
WHERE school_id = '772b08f1-4e56-4ea6-83b5-21aa8f079b35'
ORDER BY display_order;
```

### Step 4: Create classrooms table entry (if not exists)
```sql
INSERT INTO classrooms (id, name, school_id)
VALUES (
  gen_random_uuid(),
  'Whale',
  '772b08f1-4e56-4ea6-83b5-21aa8f079b35'
)
ON CONFLICT DO NOTHING;
```

---

## PHASE 2: CODE SEPARATION

### Montree Routes (THE PRODUCT)
```
/app/schools/                    → Keep, develop
/app/schools/[slug]/             → Keep, develop
/app/schools/[slug]/classrooms/  → Keep, develop
/app/api/schools/                → Keep, develop
```

### Admin Routes (PET PROJECT)
```
/app/admin/                      → Keep separate, don't connect to Montree
/app/admin/hub/                  → Pet project
/app/admin/classroom/            → Pet project (NOT Montree)
/app/admin/schools/              → OLD - will be deprecated
```

### Teacher Routes (TO BE MIGRATED)
```
/app/teacher/                    → Eventually migrate to /schools/[slug]/teacher/
/app/teacher/dashboard/          → Will become school-scoped
/app/teacher/classroom/          → Will use Montree APIs
```

---

## PHASE 3: API CONSOLIDATION

### Montree APIs (Use these)
| API | Purpose |
|-----|---------|
| `GET /api/schools` | List all schools |
| `GET /api/schools/[id]` | School + classrooms |
| `GET /api/schools/[id]/classrooms/[id]` | Classroom + students |

### Legacy APIs (Don't use for Montree)
| API | Status |
|-----|--------|
| `/api/classroom/children` | LEGACY - don't use |
| `/api/teacher/classroom` | MIGRATE - make it call Montree API |
| `/api/children` | LEGACY - use schools API instead |

---

## PHASE 4: DATA FLOW DIAGRAM

```
MONTREE (Source of Truth)
========================

Supabase Database
       │
       ├── schools table
       │       └── beijing-international
       │
       ├── children table (students)
       │       └── 18 students with school_id
       │
       └── classrooms table
               └── Whale (linked to school)

              ↓ API Layer ↓

/api/schools/[schoolId]/classrooms/[id]
              │
              ↓
              
/schools/[slug]/classrooms/[id]/page.tsx
              │
              ↓
              
       USER SEES DATA
```

---

## PHASE 5: DEPRECATION TIMELINE

| Week | Action |
|------|--------|
| Now | Montree structure deployed, brain.json updated |
| Week 1 | Run database migrations, verify Montree works |
| Week 2 | Build student detail page in Montree |
| Week 3 | Port progress tracking from admin to Montree |
| Week 4 | Add teacher auth scoped to schools |
| Week 5+ | Gradually stop using /admin/ for school data |

---

## VERIFICATION CHECKLIST

After running migrations:

- [ ] `/schools/` shows Beijing International School
- [ ] `/schools/beijing-international/` shows Whale classroom
- [ ] `/schools/beijing-international/classrooms/whale` shows 18 students
- [ ] Students appear in correct order (Rachel → Stella)
- [ ] No 500 errors in console
- [ ] Admin routes still work (separate system)

---

## EMERGENCY ROLLBACK

If Montree breaks, admin still works independently. They share the same database but different frontend routes.

To rollback:
1. Users can still access `/admin/schools/beijing-international/classrooms/whale`
2. That route uses hardcoded data (old system)
3. Montree failure doesn't affect admin

---

*Last Updated: Jan 16, 2026 - Session 37*
