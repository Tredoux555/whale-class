# Session 112 Handoff: Montree PWA Dashboard Refactor

**Date:** 2025-01-28
**Status:** ⚠️ PARTIAL - Works display broken after refactor

---

## What Was Done

Converted the monolithic 946-line dashboard (`/montree/dashboard/page.tsx`) to URL-based routing:

```
/montree/dashboard/                    → Child picker (all students grid)
/montree/dashboard/[childId]/          → Week view (default tab)
/montree/dashboard/[childId]/progress  → Progress bars
/montree/dashboard/[childId]/reports   → Reports
```

### Files Created/Modified

1. **`/app/montree/dashboard/page.tsx`** - Child picker with responsive grid (133 lines)
2. **`/app/montree/dashboard/[childId]/layout.tsx`** - Shared header + tabs (133 lines)
3. **`/app/montree/dashboard/[childId]/page.tsx`** - Week view (381 lines)
4. **`/app/montree/dashboard/[childId]/progress/page.tsx`** - Progress placeholder
5. **`/app/montree/dashboard/[childId]/reports/page.tsx`** - Reports placeholder
6. **`/api/montree/children/route.ts`** - Returns children for classroom
7. **`/api/montree/children/[id]/route.ts`** - Returns single child
8. **`/api/montree/progress/route.ts`** - Returns child progress

### API Fixes Applied
All three API endpoints had module-level Supabase client creation causing failures in Next.js 15/16. Fixed by inline client creation per request.

---

## 🚨 CRITICAL ISSUE: Works Not Displaying

After refactor, the Week tab shows **no works** for children.

### Root Cause (CONFIRMED)
**WRONG API ENDPOINT!**

Old dashboard fetched from:
```
/api/montree/weekly-assignments?child_id=XXX&week=2&year=2026
```

New Week page fetches from:
```
/api/montree/progress?child_id=XXX
```

### FIX REQUIRED
In `/app/montree/dashboard/[childId]/page.tsx`, change the fetch call from:
```javascript
fetch(`/api/montree/progress?child_id=${childId}`)
```

To:
```javascript
fetch(`/api/montree/weekly-assignments?child_id=${childId}&week=CURRENT_WEEK&year=2025`)
```

Or calculate current week dynamically:
```javascript
const now = new Date();
const startOfYear = new Date(now.getFullYear(), 0, 1);
const weekNumber = Math.ceil((((now - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
fetch(`/api/montree/weekly-assignments?child_id=${childId}&week=${weekNumber}&year=${now.getFullYear()}`)
```

---

## What Works ✅

- Child picker loads instantly with responsive grid
- URL routing works (back/forward navigation)
- Tab switching between Week/Progress/Reports
- Authentication flow preserved
- API endpoints responding (just wrong data source)

---

## Environment

- **Server:** localhost:3001 (NOT 3000 - old server)
- **Login code:** `f9f312`
- **Supabase:** dmfncjjtsoxrnvcdnvjq.supabase.co

---

## Next Steps

1. **Find the correct data source** - Check old dashboard code or git history
2. **Update API** - Point `/api/montree/progress` to correct table
3. **Test** - Verify works display again
4. **Complete Progress/Reports tabs** - Currently placeholders

---

## Git Recovery (if needed)

The old monolith was backed up. To see what it was fetching:
```bash
cd ~/Desktop/ACTIVE/whale
git log --oneline app/montree/dashboard/page.tsx
git show COMMIT_HASH:app/montree/dashboard/page.tsx | grep -A 20 "fetch"
```
