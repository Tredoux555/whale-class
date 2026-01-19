# HANDOFF: Session 64 - Progress Sync Fix + Next Features

**Date:** 2026-01-19
**Status:** ✅ COMPLETE

---

## 🎯 Bookmarked Next Features

Priority order for future sessions:

### 1. Parent Portal
- Read-only progress dashboard for parents
- View their child's mastered/practicing works
- See weekly assignments
- No edit capabilities

### 2. Weekly Reports
- Auto-generated progress summaries
- AI-written natural language reports
- Export as .docx for WeChat sharing
- "This week Kevin mastered Pink Tower and is practicing Brown Stair..."

### 3. Student Profiles
- Individual child pages with full history
- Timeline of progress over weeks
- Photo/video portfolio gallery
- Notes and observations

### 4. Weekly Planning Enhancements
- Better Chinese document parsing
- Work matching improvements
- Bulk status updates

---

## 🔧 What Was Fixed This Session

### Bug: Progress Demotion on Document Upload
**Problem:** Uploading a new weekly plan would demote mastered works back to practicing.

**Root Cause:** The upsert logic didn't check existing status before overwriting.

**Fix:** Added "never demote" logic to both files:
- `/app/api/weekly-planning/upload/route.ts`
- `/app/api/admin/curriculum/sync-all/route.ts`

```typescript
// Only update if new status is higher (never demote)
if (existingStatus >= progress.status) {
  continue; // Skip - don't demote
}
```

### Bug: Wrong Curriculum Table
**Problem:** Upload used `curriculum_roadmap` (old table) but Progress tab uses `montree_classroom_curriculum_works` (316 works).

**Root Cause:** Two curriculum systems existed - upload wrote to wrong one.

**Fix:** Enhanced `sync-all` to:
1. Match weekly assignments to classroom curriculum
2. Backfill ALL previous works as mastered based on sequence
3. Batch upsert for efficiency

**Result:** 4445 progress records created correctly!

---

## 📁 Key Files Modified

```
/app/api/weekly-planning/upload/route.ts
  - Added never-demote logic to backfill section

/app/api/admin/curriculum/sync-all/route.ts  
  - Complete rewrite with backfill logic
  - Now marks previous works as mastered based on sequence
  - Batch upsert for efficiency
```

---

## 🗄️ Database Tables

### Curriculum (Source of Truth)
```sql
montree_classroom_curriculum_works
  - id, classroom_id, area_id, work_key, name, sequence
  - 316+ works for Whale Class
```

### Progress Tracking
```sql
child_work_progress
  - child_id, work_id, status (0-3), notes, updated_at
  - Links to montree_classroom_curriculum_works.id
```

### Weekly Assignments
```sql
weekly_assignments
  - child_id, work_id, work_name, area, progress_status
  - work_id links to montree_classroom_curriculum_works
```

---

## 🔄 Document Upload Flow (Fixed)

1. **Upload .docx** → Claude AI parses Chinese
2. **Create children** if they don't exist
3. **Create weekly_assignments** with work_name
4. **Auto-sync** runs:
   - Matches work_name to classroom curriculum
   - Creates progress records (status 2 = practicing)
   - **Backfills ALL previous works as mastered (status 3)**
5. **Never demotes** - if already mastered, stays mastered

---

## ✅ Test Results

```
✅ 20 children synced
✅ 81 works matched to curriculum
✅ 4445 progress records backfilled
✅ Lucky shows correct progress in Progress tab
```

---

## 🧹 Reset Commands (If Needed)

```sql
-- Clear progress and re-sync
DELETE FROM child_work_progress;
UPDATE weekly_assignments SET work_id = NULL;

-- Then call sync endpoint:
-- POST http://localhost:3000/api/admin/curriculum/sync-all
```

---

## 📊 Current State

- **Whale Class:** 20 children
- **Curriculum:** 316+ works across 5 areas
- **Progress:** 4445+ records (backfilled from weekly plan)
- **URL:** www.teacherpotato.xyz

---

## 🐋 Quick Test

1. Go to Classroom View
2. Click any child → Progress tab
3. Should see many green (mastered) works
4. Upload new document → progress should only upgrade, never downgrade

---

**Session 64 Complete** ✅
