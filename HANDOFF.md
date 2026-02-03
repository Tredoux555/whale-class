# WHALE HANDOFF - February 3, 2026
## Session 139: Parent Reports + Gallery Fix + Student Tenure Feature

---

## 📍 BUGS FIXED THIS SESSION

### Bug 1: Parent Reports 500 Error ✅

**Root Cause #1:** The `send/route.ts` was trying to insert columns that **DON'T EXIST** in the database!

| Column Code Tried to Insert | Exists in Schema? |
|----------------------------|-------------------|
| `week_number` | ❌ NO |
| `report_year` | ❌ NO |
| `is_published` | ❌ NO |
| `published_at` | ❌ NO |

**Root Cause #2:** If classroom wasn't found, `school_id: null` would violate NOT NULL constraint!

**Fixes Applied:**
1. Rewrote to use actual schema columns (`week_start`, `status: 'sent'`, etc.)
2. Added classroom null check before insert (returns 404 instead of 500)
3. Created `scripts/verify_reports_tables.sql` - run in Supabase SQL Editor to verify/fix table

**Files Changed:**
- `app/api/montree/reports/send/route.ts` - Use actual DB columns + null guard
- `app/api/montree/parent/reports/route.ts` - Fixed query filter
- `scripts/verify_reports_tables.sql` - **NEW** Verification/fix script for DB

---

### Bug 2: Gallery Not Showing Photos ✅

**Symptom:** Austin's Reports tab showed "2 Photos" but Gallery tab showed "0 photos total"

**Root Cause:** The media API used a broken FK join:
```typescript
// BROKEN - FK join fails silently
.select(`*, work:work_id (work_id, name, area)`)
```

There's no defined relationship between `montree_media.work_id` and `montree_classroom_curriculum_works`.

**Fix:** Changed to simple query + manual lookup (same pattern as working preview endpoint):
```typescript
// FIXED - Simple query + separate lookup
.select('*')
// Then map work_id to name/area via separate curriculum query
```

**File Changed:**
- `app/api/montree/media/route.ts` - Removed FK join, added manual curriculum lookup

---

## 🆕 FEATURE IMPLEMENTED: Student Tenure for Guru ✅

**Problem:** Guru treats all students as "new" (like Leo with "only 3 days at school"). Teachers might add students who've been in the program for months.

**Solution Implemented:**

### 1. Database Migration (113_student_tenure.sql) ✅
```sql
ALTER TABLE montree_children
ADD COLUMN IF NOT EXISTS enrolled_at DATE DEFAULT CURRENT_DATE;

-- Backfill existing students with their created_at date
UPDATE montree_children
SET enrolled_at = DATE(created_at)
WHERE enrolled_at IS NULL OR enrolled_at = CURRENT_DATE;
```

### 2. Students Page UI ✅
Added tenure dropdown to student onboarding with options:
- Just started (less than 2 weeks)
- A few weeks (2-4 weeks)
- 1-3 months
- 3-6 months
- 6-12 months
- More than a year

### 3. Children API ✅
- **POST** `/api/montree/children` - Now accepts `enrolled_at` on creation
- **GET** `/api/montree/children` - Returns `enrolled_at` in response
- **PUT/PATCH** `/api/montree/children/[childId]` - Can update `enrolled_at`

### 4. Guru Context Builder ✅
Updated to use `enrolled_at` instead of `created_at` for calculating `time_at_school`:
```typescript
// lib/montree/guru/context-builder.ts
.select('id, name, age, classroom_id, created_at, enrolled_at')
// ...
const timeAtSchool = calculateTimeAtSchool(child.enrolled_at || child.created_at);
```

**Impact:** Guru now accurately understands how long a student has been in the program, so it won't suggest "adjustment period" strategies for long-term students.

---

## 🚀 DEPLOY INSTRUCTIONS

```bash
cd ~/Desktop/ACTIVE/whale && git add . && git commit -m "Fix: Parent reports + Gallery + Student tenure for Guru" && git push origin main
```

**⚠️ Run migration after deploy:**
```bash
# Run migration 113 in Supabase
```

**Test after deploy:**
1. **Parent Reports:** Log in as parent → Should see reports
2. **Gallery:** Go to Austin → Gallery tab → Should see 2 photos
3. **Send Report:** Teacher sends new report → Should work
4. **Student Tenure:** Add new student → Tenure dropdown works
5. **Guru:** Ask Guru about a student → Should show correct time at school

---

## 📁 FILES CHANGED THIS SESSION

| File | Change |
|------|--------|
| `app/api/montree/reports/send/route.ts` | Fixed DB columns + added classroom null guard |
| `app/api/montree/parent/reports/route.ts` | Fixed query to find reports |
| `app/api/montree/media/route.ts` | Fixed broken FK join → simple query + lookup |
| `migrations/113_student_tenure.sql` | **NEW** - Adds enrolled_at column |
| `scripts/verify_reports_tables.sql` | **NEW** - DB verification/fix script |
| `app/montree/dashboard/students/page.tsx` | Added tenure dropdown to onboarding UI |
| `app/api/montree/children/route.ts` | Added enrolled_at to POST and GET |
| `app/api/montree/children/[childId]/route.ts` | Added enrolled_at to PUT, added PATCH alias |
| `lib/montree/guru/context-builder.ts` | Uses enrolled_at for time_at_school calculation |

---

## 🎉 CONFIRMED WORKING

- **Guru** - Working great! Now with accurate student tenure info.
- **Parent Reports** - Fixed 500 error
- **Gallery** - Photos now showing correctly

---

## 🔗 URLS

| System | URL |
|--------|-----|
| Whale Production | https://www.teacherpotato.xyz/montree |
| Teacher Dashboard | https://www.teacherpotato.xyz/montree/dashboard |
| Parent Portal | https://www.teacherpotato.xyz/montree/parent |

---

*Updated: February 3, 2026*
*Session: 139*
