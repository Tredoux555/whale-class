# Montree Progress Data Flow

## Overview
This document explains the complete data flow for student progress tracking in Montree.

---

## Database Schema

### Key Tables
1. **montree_children** - Student records
   - `id` (UUID) - Primary key
   - `classroom_id` (UUID) - Foreign key to classroom
   - `name`, `age`

2. **montree_child_progress** - Progress records
   - `id` (UUID) - Primary key
   - `child_id` (UUID) - Foreign key to child
   - `work_name` (TEXT) - Name of the work (e.g., "Carrying a Mat")
   - `area` (TEXT) - Area key string (e.g., "practical_life", NOT a UUID)
   - `status` (TEXT) - One of: 'not_started', 'presented', 'practicing', 'mastered'

3. **montree_classroom_curriculum_areas** - Curriculum areas per classroom
   - `id` (UUID) - Primary key
   - `classroom_id` (UUID)
   - `area_key` (TEXT) - e.g., "practical_life", "sensorial"

4. **montree_classroom_curriculum_works** - Works per classroom
   - `id` (UUID) - Primary key
   - `classroom_id` (UUID)
   - `area_id` (UUID) - Foreign key to curriculum_areas
   - `name` (TEXT) - Work name
   - `sequence` (INT) - Order within area

---

## Data Flow

### 1. Teacher Onboarding (creates students with progress)

**Frontend** (`/app/montree/onboarding/page.tsx`)
```
User fills in: name, age, progress per area
Progress format: { "practical_life": "work-uuid", "sensorial": "work-uuid" }
```

**API** (`/api/montree/onboarding/students`)
```
1. Receives: classroomId, students array with progress
2. Looks up area_key -> area_id mapping
3. For each student:
   - Creates child in montree_children
   - For each area with selected work:
     - Finds all works in that area up to selected work
     - Creates progress records for ALL prior works (status: 'presented')
4. Returns: created students list
```

**CRITICAL**: Progress records store `area` as the STRING key ("practical_life"), not UUID.

---

### 2. Week View (displays active works)

**Frontend** (`/app/montree/dashboard/[childId]/page.tsx`)
```
1. Calls: /api/montree/progress?child_id=UUID
2. Filters to: status !== 'completed' && status !== 'mastered'
3. Displays: active works the student is working on
```

**API** (`/api/montree/progress`)
```
1. Verifies child exists
2. Fetches all progress records for child
3. Returns: progress array, stats, byArea grouping
```

---

### 3. Progress Tab (displays completion bars)

**API** (`/api/montree/progress/bars`)
```
1. Gets child's classroom_id
2. Gets curriculum areas (id -> area_key mapping)
3. Gets curriculum works with sequences
4. Gets child's progress records
5. For each area:
   - Finds the highest-sequence work the child has touched
   - Counts all works BEFORE that as "completed"
   - If highest work is mastered, counts it too
6. Returns: areas with percentComplete, totalWorks, currentPosition
```

---

### 4. Updating Progress (Week view status tap)

**API** (`/api/montree/progress/update`)
```
1. Receives: child_id, work_name, status, area
2. Verifies child exists
3. Looks for existing progress record by work_name (case-insensitive)
4. If exists: updates status
5. If not: creates new progress record
```

---

## Key Conventions

1. **Area identification**:
   - In curriculum tables: `area_id` is UUID
   - In progress table: `area` is STRING key (e.g., "practical_life")

2. **Status values**:
   - 'not_started' → 'presented' → 'practicing' → 'mastered'
   - 'completed' is alias for 'mastered' in some places

3. **Work identification**:
   - Progress uses `work_name` (string), not work_id
   - Matching is case-insensitive

4. **Progress calculation**:
   - All works BEFORE current position count as completed
   - This reflects Montessori sequential curriculum

---

## Files Reference

| Purpose | File |
|---------|------|
| Onboarding UI | `/app/montree/onboarding/page.tsx` |
| Onboarding API | `/app/api/montree/onboarding/students/route.ts` |
| Week View UI | `/app/montree/dashboard/[childId]/page.tsx` |
| Progress Fetch | `/app/api/montree/progress/route.ts` |
| Progress Update | `/app/api/montree/progress/update/route.ts` |
| Progress Bars | `/app/api/montree/progress/bars/route.ts` |
| Works Search | `/app/api/montree/works/search/route.ts` |

---

## Session 130 Fixes

1. **Fixed area_key vs area_id bug** in onboarding - was comparing string to UUID
2. **Made APIs defensive** - return empty data on errors instead of 500
3. **Fixed progress bars** - now counts all works before current position
4. **Auto-save students** - onboarding saves current form on submit
5. **Removed Chinese text display** - kept in data, removed from UI
