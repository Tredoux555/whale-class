# WHALE HANDOFF - February 5, 2026
## Session 144: Mobile Access Crisis + Add Work Modal + Report Photos

---

## Summary

**🚨 CRITICAL FIX: Mobile access completely broken!**

Going to `www.teacherpotato.xyz/montree` on mobile was redirecting to `www.teacherpotato.xyz` (dropping the path). Root cause: `/montree` was NOT in the `publicPaths` list in `middleware.ts`, so unauthenticated requests were being redirected to `/`.

Also built AddWorkModal component and fixed photo display in weekly reports.

---

## Fixes Applied This Session

### 1. CRITICAL: Mobile Access Fix (ROOT CAUSE FOUND!)
**Problem:** Typing `www.teacherpotato.xyz/montree` on mobile redirected to `www.teacherpotato.xyz` (no /montree)
**Root Cause:** `middleware.ts` line 174 redirects unauthenticated requests to `/`. Since `/montree` was NOT in `publicPaths`, all /montree requests without a Supabase session got redirected to home.
**Fix:** Added `/montree` to the `publicPaths` array in `middleware.ts` (line 76)

```javascript
// Before - /montree was MISSING!
const publicPaths = [
  '/', '/games', '/debug', '/story', '/auth/login', ...
];

// After - /montree added
const publicPaths = [
  '/', '/games', '/debug', '/story',
  '/montree',    // Montree app - has its own auth system
  '/auth/login', ...
];
```

### 2. Photo Not Showing in Reports (work_id mismatch)
**Problem:** Photos weren't linking to works in weekly reports
**Root Cause:** `/api/montree/works/search/route.ts` was returning `work_key` instead of `id`
**Fix:** Changed `id: w.work_key` to `id: w.id` in the search response

### 3. Show ALL Photos in Reports
**Problem:** User wanted ALL photos from the week shown in reports
**Fix:**
- Updated `/api/montree/parent/report/[reportId]/route.ts` to include `all_photos` array
- Updated report page to display photo gallery section

### 4. AddWorkModal Component (NEW)
**Location:** `components/montree/AddWorkModal.tsx`
**Features:**
- Full details form (name, category, year level, description, materials, instructions)
- Category selection with area icons
- AI description generator button
- Modal dialog style
- Integrated into curriculum page header

### 5. Railway Domain Configuration
**Action:** Added `teacherpotato.xyz` (non-www) as custom domain in Railway
**Status:** "Waiting for DNS update"
**Required DNS:** CNAME @ → `a14obm23.up.railway.app`

### 6. www Redirect Disabled
**File:** `next.config.ts`
**Action:** Commented out the redirects() function (was a red herring, not the actual cause)

---

## Files Changed

| File | Change |
|------|--------|
| `middleware.ts` | **CRITICAL** - Added `/montree` to publicPaths |
| `components/montree/AddWorkModal.tsx` | NEW - Full-featured work creation modal |
| `app/montree/dashboard/curriculum/page.tsx` | Added Add Work button + modal integration + auto-scroll during drag |
| `app/api/montree/works/search/route.ts` | Fixed `id: w.work_key` → `id: w.id` |
| `app/api/montree/parent/report/[reportId]/route.ts` | Added `all_photos` array to response |
| `app/montree/parent/report/[reportId]/page.tsx` | Added photo gallery section |
| `next.config.ts` | Commented out www redirect (debugging) |

---

## Test Checklist

- [ ] Mobile access: Go to `teacherpotato.xyz/montree` on phone - should load app, NOT redirect to home
- [ ] Add Work: Click + button on curriculum page, fill form, save
- [ ] Report photos: Weekly report should show all photos from the week
- [ ] Photo linking: Photos should appear next to correct works in reports

---

## Git Status

**Commits made locally:**
1. `7ad5870` - CRITICAL FIX: Add /montree to public paths
2. Earlier commits for AddWorkModal, photo fixes

**Push status:** User needs to push (git authentication required)

```bash
cd whale-class
rm -f .git/HEAD.lock  # If locked
git push origin main
```

---

## Understanding the Mobile Bug

The middleware was doing this:
1. Request comes in for `/montree/dashboard/xyz`
2. Check if path is in `publicPaths` → NO (montree wasn't listed)
3. Check if user has Supabase session → NO (Montree uses its own auth)
4. Redirect to `/` ← THIS WAS THE BUG

Montree has its own authentication system (teacher login codes, parent access codes). It doesn't use Supabase auth. So it MUST be in `publicPaths` to let requests through to Montree's own auth handling.

---

*Updated: February 5, 2026 ~6:45 AM*
*Session: 144*
*Status: AWAITING PUSH - Critical fix ready*
