# WHALE HANDOFF - February 3, 2026 (Late Night)
## Session 139: Report Data Consistency Fix (UNTESTED - DEPLOY BLOCKED)

---

## ⚠️ CRITICAL: START HERE TOMORROW

**Railway is NOT auto-deploying from GitHub pushes.** The code changes are committed and pushed but NOT live.

### First Thing Tomorrow:
1. **Fix Railway deployment** - Check Settings → Source → verify GitHub webhook is connected
2. **Manually trigger deploy** or push empty commit: `git commit --allow-empty -m "trigger" && git push`
3. **Test the Publish Report button** - this is the main fix that needs verification

---

## 🔴 MAIN ISSUE: Report Preview vs Parent View Mismatch

**Problem:** Teacher preview showed 7 works + photos, but parent view only showed 2 works + no photos.

**Root Causes Found:**

| Issue | Root Cause |
|-------|------------|
| Preview showed ALL photos | Preview ignored `montree_report_media` junction table selections |
| Parent missing works | Used ISO week dates instead of `lastReportDate` |
| Parent missing descriptions | Send route didn't save `parent_description` in content |
| Parent missing photos | Different photo matching logic than preview |

### Fixes Applied (code committed, NOT deployed):

**1. `app/api/montree/reports/preview/route.ts`**
- Now checks `montree_report_media` junction table for selected photos
- Shows selected vs available photos separately
- Respects teacher's photo selections

**2. `app/api/montree/reports/send/route.ts`**
- Now saves FULL content including `parent_description`, `why_it_matters`, `photo_url` per work
- Added `caption` field to photo queries (was missing - caused matching to fail)
- Uses caption as fallback when `work_id` is null

**3. `app/api/montree/parent/report/[reportId]/route.ts`**
- Now uses saved `content.works` from report instead of regenerating
- Falls back to old behavior only for legacy reports without content

### Data Flow (After Fix):
```
Preview → shows SELECTED photos from junction table
    ↓
Send → saves works WITH descriptions & photo URLs in content
    ↓
Parent → reads saved content directly (no regeneration)
```

---

## 🐛 OTHER BUGS FIXED

### 500 Error on POST /api/montree/reports/send ✅

**Root Cause:** Code was inserting to columns that don't exist in the actual DB schema:
- `week_number` (NOT NULL) - was missing
- `report_year` (NOT NULL) - was missing

**Fix:** Added both columns + calculated them from week start date.

### Classroom null causing 500 ✅

**Root Cause:** If classroom not found, `school_id: null` violated NOT NULL constraint.

**Fix:** Added null check with proper 404 error.

---

## 🆕 FEATURE: Student Tenure for Guru ✅

Teachers can now specify how long a student has been enrolled. Guru uses this for accurate advice.

**Migration:** `migrations/113_student_tenure.sql` - adds `enrolled_at` column
**UI:** Tenure dropdown on Students page with 6 options
**API:** Children routes now accept/return `enrolled_at`

---

## 📁 FILES CHANGED (committed to GitHub, NOT deployed)

| File | Change |
|------|--------|
| `app/api/montree/reports/preview/route.ts` | Respect photo selections from junction table |
| `app/api/montree/reports/send/route.ts` | Save full descriptions + fix caption matching |
| `app/api/montree/parent/report/[reportId]/route.ts` | Use saved content instead of regenerating |
| `app/api/montree/children/route.ts` | Added enrolled_at |
| `app/api/montree/children/[childId]/route.ts` | Added enrolled_at to PUT/PATCH |
| `app/montree/dashboard/students/page.tsx` | Added tenure dropdown |
| `lib/montree/guru/context-builder.ts` | Uses enrolled_at for time_at_school |
| `migrations/113_student_tenure.sql` | **NEW** - Student tenure column |
| `scripts/verify_reports_tables.sql` | **NEW** - DB verification script |

---

## 🧪 TEST CHECKLIST (for tomorrow)

After deployment is working:

- [ ] **Publish Report button** - Should not 500
- [ ] **Preview modal** - Should show same works/photos that parent will see
- [ ] **Parent report page** - Should show all works with descriptions and photos
- [ ] **Photo count match** - Preview photos count should match parent view
- [ ] **Student tenure** - Add student with tenure dropdown, check Guru context

---

## 🔗 URLS

| System | URL |
|--------|-----|
| Production | https://www.teacherpotato.xyz/montree |
| Railway | https://railway.app/project/bb3e138f-8ce5-4c9d-ba89-efce14d08e36 |

---

## 💾 Git Status

**Latest commit:** `8fd6678` - "Fix reports: preview/send/parent data consistency"
**Pushed to:** GitHub ✅
**Deployed to:** Railway ❌ (webhook not triggering)

---

*Updated: February 3, 2026 ~11pm*
*Session: 139*
*Status: BLOCKED ON DEPLOYMENT*
