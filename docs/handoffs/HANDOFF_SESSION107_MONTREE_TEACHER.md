# HANDOFF: Montree Teacher Dashboard - Session 107

**Date:** Jan 27, 2026  
**Status:** Teacher login working, dashboard shows students, BUT works not displaying  
**Priority:** Fix API endpoints to use correct Montree tables

---

## 🔴 CRITICAL ISSUE: Wrong Database Tables

The teacher dashboard was built using OLD Whale table names. The Import feature saves to the CORRECT `montree_child_progress` table, but the dashboard queries WRONG tables.

### Table Mismatch Summary

| Feature | Currently Queries | Should Query |
|---------|------------------|--------------|
| Weekly assignments | `weekly_assignments` | `montree_child_progress` |
| Progress updates | `child_work_progress` | `montree_child_progress` |
| Work sessions | `work_sessions` | `montree_work_sessions` |

### Files That Need Fixing

```
app/api/montree/weekly-assignments/route.ts   → Change to montree_child_progress
app/api/montree/progress/update/route.ts      → Change to montree_child_progress
app/api/montree/sessions/route.ts             → Change to montree_work_sessions
```

---

## 📋 AUDITED GAME PLAN

### Phase 1: Make Works Show (IMMEDIATE)

**Problem:** 91 works were imported but show "No assignments for this week" because API queries wrong table.

**Fix `/api/montree/weekly-assignments/route.ts`:**
```typescript
// CHANGE FROM:
const { data, error } = await supabase
  .from('weekly_assignments')  // ❌ WRONG
  
// CHANGE TO:
const { data, error } = await supabase
  .from('montree_child_progress')  // ✅ CORRECT
  .select('*')
  .eq('child_id', childId)
  .order('area');
```

**Fix `/api/montree/progress/update/route.ts`:**
```typescript
// CHANGE FROM:
.from('child_work_progress')  // ❌ WRONG

// CHANGE TO:
.from('montree_child_progress')  // ✅ CORRECT
```

**Test:** After fix, teacher should see the 91 imported works for students.

---

### Phase 2: Curriculum Per Classroom

**Context:** Each classroom needs its own work list that teachers can customize.

**Tables Already Exist:**
- `montree_classroom_curriculum_works` (25 columns, currently empty)
- `montree_school_curriculum_works` (for school-wide defaults)

**Tasks:**
1. Create API: `/api/montree/curriculum/route.ts` - GET/POST classroom curriculum
2. Add "Curriculum" tab to teacher dashboard
3. Seed default Montessori curriculum on classroom creation
4. When assigning work, pick from classroom's curriculum

**Schema (already exists):**
```sql
montree_classroom_curriculum_works:
- id, classroom_id, area_id, work_key, name, name_chinese
- description, age_range, materials, direct_aims, indirect_aims
- control_of_error, prerequisites, video_search_terms
- levels, category_key, category_name, sequence, is_active
- teacher_notes, parent_description, why_it_matters, home_connection
```

---

### Phase 3: Teacher Password Setup

**Current Flow:**
1. Principal creates teacher → system generates 6-char code
2. Teacher logs in with code
3. Dashboard loads

**Enhanced Flow:**
1. Principal creates teacher → system generates 6-char code ✅
2. Teacher logs in with code first time
3. **NEW:** Prompt to set password + optional email
4. Future logins: code OR email+password
5. Principal can regenerate codes, cannot see passwords

**Database Change:**
```sql
-- login_code column already added this session
-- Add password support:
ALTER TABLE montree_teachers 
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;
```

**Files to Create:**
- `/montree/set-password/page.tsx` - First-time password setup
- Update `/api/montree/auth/teacher/route.ts` - Support code OR email+password

---

### Phase 4: WeChat Share for Codes

**Purpose:** Easy way for principal to share teacher codes via WeChat.

**Implementation:**
- "Share via WeChat" button on setup page
- Generates link: `montree.app/join?code=abc123`
- Mobile-optimized landing page with instructions

---

## 🗂️ Current Database State

**Montree Tables (22 total):**
```
montree_schools              - 1 school (Whale)
montree_school_admins        - 1 principal (Tredoux)
montree_classrooms           - 7 classrooms
montree_teachers             - 7 teachers with login_code
montree_children             - 20 students (in Whale classroom)
montree_child_progress       - 91 work records (from import)
montree_classroom_curriculum_works - EMPTY (needs seeding)
```

**Teacher Login Codes:**
```
Tredoux (Whale)    → f9f312
Liza (Panda)       → bc7a36
John (Butterfly)   → b32108
Richard (Bunny)    → 0bf32c
Jasmine (Starfish) → 284da6
Ivan (Seagull)     → 0b4fc2
Scott (Catapillar) → 477d86
```

---

## ✅ What's Working

1. Principal registration + login at `/montree/principal/register` & `/login`
2. School setup with classrooms + teachers at `/montree/principal/setup`
3. Principal admin dashboard at `/montree/admin`
4. Teacher login with 6-char code at `/montree/login`
5. Teacher dashboard shows students at `/montree/dashboard`
6. Student import from .docx at `/montree/admin/import`
7. Import button on Students page

---

## 🔧 Key Files

```
# Teacher Auth
app/montree/login/page.tsx              - 6-char code login
app/api/montree/auth/teacher/route.ts   - Code authentication

# Teacher Dashboard  
app/montree/dashboard/page.tsx          - Main teacher view (700 lines)

# APIs to FIX (use wrong tables)
app/api/montree/weekly-assignments/route.ts   ❌ uses weekly_assignments
app/api/montree/progress/update/route.ts      ❌ uses child_work_progress
app/api/montree/sessions/route.ts             ❌ uses work_sessions

# APIs that work correctly
app/api/montree/children/route.ts             ✅ uses montree_children
app/api/montree/admin/import/route.ts         ✅ uses montree_child_progress
app/api/montree/works/search/route.ts         ✅ uses lib/montree/curriculum-data
```

---

## 🧪 Test Flow

1. Go to `localhost:3000/montree/login`
2. Enter code `f9f312`
3. Should see Whale classroom with 20 students
4. Click on Amy
5. **CURRENT BUG:** Shows "No assignments for this week"
6. **AFTER FIX:** Should show the 5 works imported for Amy

---

## 📝 SQL to Verify Data

```sql
-- Check imported progress
SELECT c.name as child, cp.work_name, cp.area, cp.status 
FROM montree_child_progress cp
JOIN montree_children c ON c.id = cp.child_id
ORDER BY c.name, cp.area
LIMIT 20;

-- Check teacher codes
SELECT name, login_code FROM montree_teachers;

-- Check classroom curriculum (should be empty)
SELECT COUNT(*) FROM montree_classroom_curriculum_works;
```

---

## 🚀 Start Here

**First Action:** Fix the API to show works:

1. Open `/app/api/montree/weekly-assignments/route.ts`
2. Change `weekly_assignments` → `montree_child_progress`
3. Test by logging in as teacher and clicking a student
4. Works should appear!

Then proceed with Phase 2 (curriculum) and Phase 3 (passwords).
