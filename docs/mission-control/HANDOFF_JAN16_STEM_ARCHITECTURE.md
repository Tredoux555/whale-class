# HANDOFF: Jan 16, 2026 - THE STEM Architecture Session

## Summary
We mapped out the Whale platform architecture and found the root cause of data inconsistency.

## What We Discovered

### THREE Disconnected Systems (THE PROBLEM)
| Route | Data Source | Students | Issue |
|-------|-------------|----------|-------|
| `/admin/schools/beijing-international` (THE STEM) | **Hardcoded array** | 18 correct | Not in database! |
| `/admin/classroom` | Database (`weekly_assignments`) | 20 | Wrong data, alphabetical |
| `/teacher/classroom` | Database (`teacher_students`) | 20 | Separate system |

### THE SOLUTION: One Database, One Truth
- All views should read from `children` table with `school_id` filter
- Sort by `display_order` (your order), not alphabetical
- Updates in one place flow everywhere

## What We Fixed

### 1. Created Migration `040_fix_whale_class_18_students.sql`
- Deletes old 20 children for Beijing International
- Inserts correct 18 Whale Class students with `school_id` and `display_order`
- Links them to Whale classroom

**⚠️ YOU MUST RUN THIS IN SUPABASE SQL EDITOR:**
```
/Users/tredouxwillemse/Desktop/whale/migrations/040_fix_whale_class_18_students.sql
```

### 2. Updated API to Sort by `display_order`
- `/api/weekly-planning/by-plan/route.ts` now sorts by `display_order` instead of alphabetically
- Committed and pushed

## What Still Needs To Be Done

### Immediate (Next Session)
1. **Run migration 040** in Supabase SQL Editor
2. **Verify** `/admin/classroom` shows 18 students in YOUR order
3. **Build the LEAF** - Student detail page when you tap a name

### Teacher Portal Decision
- **Recommendation:** Delete `/teacher/dashboard` and `/teacher/classroom` 
- OR: Wire them to THE STEM's data source
- The `/admin/classroom` UI is clean and should be your entry point

## The Flow You Want

```
📱 Open phone
    ↓
🌱 THE STEM (/admin/schools/beijing-international)
    ↓
🐋 Whale Class - 18 students in YOUR order
    ↓
👧 Tap Rachel → Her detail page
    ↓
✅ Quick update: "Done with WFW /e/, move to /i/"
    ↓
📊 Weekly Report automatically has new data
```

## Files Changed
- `migrations/040_fix_whale_class_18_students.sql` (NEW)
- `app/api/weekly-planning/by-plan/route.ts` (UPDATED - display_order sorting)

## Guardian Connect Status
- Invoice system deployed: https://invoice-system-production-5c37.up.railway.app
- Logo added ✅
- History view/edit/regenerate working ✅

## Brain Updated
- invoice_system.pending cleared
- Session logged
