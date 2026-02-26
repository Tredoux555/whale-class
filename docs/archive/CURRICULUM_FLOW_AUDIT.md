# Curriculum System Audit - Jan 31, 2026

## Executive Summary

**CRITICAL FINDING**: The curriculum system had fragmented into multiple overlapping systems with missing database migrations. **FIXED** - Now each classroom gets a FULL copy of the curriculum from the Brain.

## Architecture (AFTER FIX)

```
┌─────────────────────────────────────────────────────────────────────┐
│  MASTER: montessori_works (the "Brain")                             │
│  Contains: ALL rich data including parent descriptions,             │
│            teacher guides, aims, prerequisites, etc.                │
└───────────────────────┬─────────────────────────────────────────────┘
                        │ COPIED when classroom created
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CLASSROOM COPY: montree_classroom_curriculum_works                 │
│  Contains: FULL copy of all data including:                         │
│    - name, name_chinese, description                                │
│    - direct_aims, indirect_aims, control_of_error, prerequisites    │
│    - quick_guide (for teachers)                                     │
│    - parent_description, why_it_matters (for parent reports)        │
│    - video_search_terms                                             │
│  Teachers can ADD custom works to their classroom's copy            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Tables

### Tables USED in code:
| Table | Purpose | Migration |
|-------|---------|-----------|
| `montree_classroom_curriculum_areas` | 5 curriculum areas per classroom | **MISSING** - Created migration 099 |
| `montree_classroom_curriculum_works` | Works/activities per classroom | **MISSING** - Created migration 099 |
| `montessori_works` | Master "Brain" curriculum | Exists |
| `curriculum_roadmap` | Legacy master curriculum | Migration 003 |
| `classroom_curriculum` | Legacy classroom curriculum | Migration 022 |

### The Problem
Code references `montree_classroom_curriculum_*` tables, but no migration creates them. They were created directly in Supabase.

---

## Curriculum Seeding Flow

### ✅ WORKS: Principal Setup (`/api/montree/principal/setup`)
```
1. Creates school → Creates classrooms
2. Calls seedCurriculumForClassroom() IMMEDIATELY
3. Creates areas (practical_life, sensorial, mathematics, language, cultural)
4. Creates works from montessori_works table
```

### ⚠️ PARTIAL: Teacher Onboarding (`/montree/onboarding`)
```
1. Loads curriculum from DB
2. If empty, calls seed endpoint
3. BUT: Uses fallback to global curriculum if DB fails
```

### ❌ BROKEN: Admin Classroom Creation (`/api/montree/admin/classrooms`)
```
1. Creates classroom
2. NO CURRICULUM SEEDING ← BUG!
```

### ✅ FIXED: Add Work from Wheel Picker
```
1. Teacher tries to add work
2. API checks for areas
3. If no areas → AUTO-SEEDS all 5 areas (NEW!)
4. Creates the work
```

---

## Fetch Flow

### Wheel Picker → `/api/montree/works/search`

```
┌─────────────────────────────────────────────────────────────┐
│  Client: WorkWheelPicker / WorkNavigator                    │
│    ↓                                                        │
│  GET /api/montree/works/search?area=X&classroom_id=Y        │
│    ↓                                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ If classroom_id provided:                            │   │
│  │   → Query montree_classroom_curriculum_works         │   │
│  │   → If data found: return with source='classroom'    │   │
│  │   → If no data: FALL THROUGH                         │   │
│  │                                                      │   │
│  │ Fallback (no classroom_id OR no data):               │   │
│  │   → Use static CURRICULUM from curriculum-data.ts    │   │
│  │   → Return with source='global'                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Problem**: Client doesn't check `source` field — doesn't know if using real or fallback data.

---

## Add Work Flow (NEW)

```
┌─────────────────────────────────────────────────────────────┐
│  WorkWheelPicker: User taps "+ Add work"                    │
│    ↓                                                        │
│  POST /api/montree/curriculum                               │
│    body: { classroom_id, name, area_key, after_sequence }   │
│    ↓                                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Normalize area_key (language → language)          │   │
│  │ 2. Look up area in montree_classroom_curriculum_areas│   │
│  │ 3. If area NOT FOUND:                                │   │
│  │    → AUTO-SEED all 5 areas for classroom (NEW!)      │   │
│  │ 4. Shift sequences if inserting in middle            │   │
│  │ 5. Insert work into montree_classroom_curriculum_works│  │
│  │ 6. Return { success: true, work: {...} }             │   │
│  └──────────────────────────────────────────────────────┘   │
│    ↓                                                        │
│  WorkWheelPicker: Calls onWorkAdded() → Refreshes list      │
└─────────────────────────────────────────────────────────────┘
```

---

## Known Issues

### 1. Missing Migrations
- **Fix**: Run migration 099 in Supabase (creates tables if not exist)

### 2. Admin Classroom Creation Missing Seed
- **Fix**: Add curriculum seeding to `/api/montree/admin/classrooms`

### 3. Silent Fallback to Global Curriculum
- **Symptom**: Teacher sees works but can't add custom ones
- **Fix**: Auto-seed now handles this when adding works

### 4. Multiple Curriculum Sources
- `montessori_works` (Brain)
- `curriculum_roadmap` (Legacy)
- `classroom_curriculum` (Legacy classroom)
- `CURRICULUM` in curriculum-data.ts (Static fallback)
- **Recommendation**: Consolidate to single source

### 5. Inconsistent Status Values
- Some tables use INTEGER (0-3)
- Some use TEXT ('not_started', 'presented', 'practicing', 'mastered')
- **Recommendation**: Standardize to TEXT values

---

## Quick Fixes Applied Today

1. **Auto-seed areas when adding work** - If classroom has no curriculum areas, create them automatically before adding the work.

2. **Area key normalization** - Handle "Language" vs "language" vs "math" vs "mathematics".

3. **Created migration 099** - Proper migration for the curriculum tables.

---

## To Verify in Supabase

Run this query to find classrooms missing curriculum:

```sql
SELECT c.id, c.name,
  (SELECT COUNT(*) FROM montree_classroom_curriculum_areas WHERE classroom_id = c.id) as areas,
  (SELECT COUNT(*) FROM montree_classroom_curriculum_works WHERE classroom_id = c.id) as works
FROM montree_classrooms c
ORDER BY areas, works;
```

If `areas = 0`, the classroom needs curriculum seeding.

---

## Files Modified

- `components/montree/WorkWheelPicker.tsx` - Added "Add Work" form
- `app/montree/dashboard/[childId]/page.tsx` - Added refresh callback
- `app/api/montree/curriculum/route.ts` - Auto-seed areas, better error handling
- `app/api/montree/works/search/route.ts` - Fixed area filtering
- `migrations/099_montree_classroom_curriculum_tables.sql` - NEW migration
