# Whale-Class / Montree - Developer Handoff

## Project Overview
Next.js 14 app with two separate systems:
- **Whale Class** (`/admin/*`) - Mock data, not connected to database
- **Montree** (`/montree/*`) - Real SaaS multi-tenant school management system

---

## 🚨🚨🚨 START HERE: Parent Auth Bug (Feb 2, 2026) 🚨🚨🚨

**STATUS: BLOCKED - Debug this first before any other work**

### The Bug
Parent enters invite code → Gets error "Could not find child record"

### Quick Debug Steps

**1. Push pending changes first:**
```bash
cd ~/whale
rm -f .git/HEAD.lock .git/index.lock
git add -A && git commit -m "Add debug endpoint" && git push origin main
```

**2. Check Supabase SQL Editor directly:**
```sql
-- See what invites exist
SELECT invite_code, child_id, is_active FROM montree_parent_invites ORDER BY created_at DESC LIMIT 5;

-- See what children exist
SELECT id, name FROM montree_children LIMIT 10;

-- Check if invite's child_id actually exists (replace UUID)
SELECT * FROM montree_children WHERE id = 'child-id-from-invite';
```

**3. Test locally with npm run dev:**
- Generate new invite for Austin
- Enter code at `/montree/parent`
- Check browser Network tab for API response
- Check terminal for server logs

**4. If still stuck, add logging:**
In `app/api/montree/parent/auth/access-code/route.ts` after line 47:
```typescript
console.log('INVITE FOUND:', invite);
console.log('LOOKING FOR CHILD:', invite.child_id);
```

### Root Cause Theories
1. **Invite has wrong child_id** - check if UUID matches any child
2. **Child was deleted** - invite orphaned
3. **Different databases** - local vs production mismatch

### Key Files
- `app/api/montree/invites/route.ts` - Creates invites (line 68)
- `app/api/montree/parent/auth/access-code/route.ts` - Validates codes (line 76)
- `app/api/montree/debug/parent-link/route.ts` - Debug endpoint (NOT DEPLOYED)

---

## ✅ COMPLETED: Phase 1 - Weekly Reports with One-Click Send

**Goal**: Teachers can generate weekly reports and send to all parents with one click.

### What Was Built (Session Jan 31, 2026)

1. **Reports Page** (`/app/montree/dashboard/[childId]/reports/page.tsx`) ✅
   - Week navigation (prev/next week arrows)
   - Summary stats: This Week, Mastered, Practicing, Presented
   - Works grouped by area (Practical Life, Sensorial, Math, Language, Cultural)
   - Photos grid showing captured photos from the week
   - "📧 Send to Parents" button - one click to notify all linked parents

2. **Report API** (`/app/api/montree/reports/route.ts`) ✅
   - POST generates report with works grouped by area
   - Includes photos from `montree_child_photos` table
   - Returns parent-friendly work descriptions from brain data

3. **Notification System** ✅
   - Email service: `/lib/montree/email.ts` (Resend integration)
   - API: `/app/api/montree/notify/route.ts`
   - Sends beautiful HTML emails with "View Report" button

4. **Parent Infrastructure** (already existed) ✅
   - Parent login/signup with invite codes
   - Parent dashboard at `/montree/parent/dashboard`
   - Email templates (welcome, report ready, invite)

---

## 🚨 CURRENT ISSUE: Parent Invite Codes Not Linking (Feb 2, 2026)

### Symptom
- Teacher generates invite code → Parent enters code → **"Could not find child record"**

### Debug
The error means invite code WAS found, but `child_id` doesn't exist in `montree_children`.

```
Debug endpoint: /api/montree/debug/parent-link?code=XXXXXX
```

### Likely Causes
1. **Railway env vars** don't match local - check `NEXT_PUBLIC_SUPABASE_URL`
2. **Stale invite** pointing to deleted child
3. **Data sync issue** between local and production

### Auth Flow (Unified System - Fixed Feb 2, 2026)
```
Teacher: /api/montree/invites POST → montree_parent_invites (child_id, invite_code)
Parent:  /api/montree/parent/auth/access-code POST → lookup invite → get child → set cookie
```

---

## 🚧 NEXT SESSION TASKS

1. **Fix parent link issue** - Debug why child_id not found
2. **Deploy PWA icons** - Files ready in `/public/montree-parent/`
3. **Test full parent flow** end-to-end

---

## Recent Session Work (Jan 31, 2026)

### Bug Fixes
1. **Route conflicts fixed** - Renamed `/reports/[id]` to `/reports/[reportId]`
2. **Removed redundant toast notifications** - Status cycling now just shows visual change
3. **Removed duplicate purple Reports/Invite buttons** - Tab bar already has Reports

### Features Added
1. **Works grouped by area** in Week view - Language with Language, etc.
2. **Fuzzy matching for imported works** - Bulk imported works placed intelligently in curriculum
3. **Re-fetch on tab navigation** - Added visibility/focus listeners

### Files Modified This Session
- `/app/montree/dashboard/[childId]/page.tsx` - Week view with grouped works, fuzzy matching
- `/app/montree/dashboard/[childId]/reports/page.tsx` - Simplified to "Coming Soon" placeholder
- `/components/montree/WorkWheelPicker.tsx` - Scroll-to-current-work fix

### Database State
- **Whale Class** classroom ID: `945c846d-fb33-4370-8a95-a29b7767af54`
- **20 students imported**: Amy, Austin, Eric, Gengerlyn, Hayden, Henry, Jimmy, Joey, Kayla, Kevin, KK, Leo, Lucky, MaoMao, MingXi, NiuNiu, Rachel, Segina, Stella, YueZe
- **98 progress records** with works from Week 19 PDF

---

## Parent System Architecture

### Auth Flow (SIMPLIFIED - Feb 2, 2026)
```
Teacher: Click "Invite Parent" → Generate 6-char code (e.g., D7ENJN)
Parent: Go to /montree/parent → Enter code → Logged in (no signup required)
```

### Database Tables (Migrations 095-096)
```sql
montree_parents (id, email, password_hash, name, school_id)
montree_parent_children (parent_id, child_id, relationship)
montree_parent_invites (id, child_id, invite_code, expires_at, is_active, is_reusable)
montree_weekly_reports (id, child_id, week_number, report_year, parent_summary)
```

### Key API Endpoints
```
POST /api/montree/invites             - Generate invite code (teacher)
POST /api/montree/parent/auth/access-code - Validate code (parent)
GET  /api/montree/debug/parent-link   - Debug code linkage
```

### Key Files
- `/app/montree/parent/page.tsx` - Parent landing/login (code entry)
- `/app/montree/parent/dashboard/page.tsx` - Parent dashboard
- `/app/api/montree/parent/auth/access-code/route.ts` - Code validation
- `/app/api/montree/invites/route.ts` - Code generation

### Email Templates Ready
- `sendWelcomeEmail()` - On parent signup
- `sendReportReadyEmail()` - When weekly report is ready
- `sendParentInviteEmail()` - Invite email (not auto-triggered yet)
- `notifyParentsOfReport()` - Batch notify all linked parents

---

## Photo/Capture System

### Architecture
- **Offline-first**: IndexedDB for local storage
- **Sync**: Background upload to Supabase storage
- **Compression**: ~500KB JPEG 85% quality

### Key Files
- `/lib/media/capture.ts` - Main capture functions
- `/lib/media/sync.ts` - Background sync
- `/app/montree/dashboard/capture/page.tsx` - Capture UI

### MediaRecord Schema
```typescript
{
  id, childId, mediaType: 'photo',
  dataUrl, localPath, remotePath, remoteUrl,
  workId?, workName?, caption?, tags?,
  syncStatus: 'pending' | 'uploading' | 'synced' | 'failed'
}
```

---

## Known Issues

### 1. Parent Invite Codes Not Linking (**ACTIVE - Feb 2, 2026**)
- Invite code is found but child lookup fails
- Debug: `/api/montree/debug/parent-link?code=XXXXXX`
- Check Railway env vars match local Supabase URL

### 2. Works Vanishing on Tab Switch
- Added visibility/focus listeners but may still have issues
- Check if API is returning data correctly

### 3. RLS Policies Permissive
- Parent tables have "Allow all" RLS - needs security refinement

### 4. PWA Icons Not Linked
- Icons created in `/public/montree-parent/`
- Need to add manifest link to parent layout

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY (for emails)
RESEND_FROM_EMAIL (optional, defaults to onboarding@resend.dev)
ADMIN_PASSWORD
```

## Running Locally
```bash
npm run dev
```
Access at http://localhost:3000

## Key Routes
- `/montree/dashboard` - Teacher dashboard (class list)
- `/montree/dashboard/[childId]` - Child week view
- `/montree/dashboard/[childId]/progress` - All works progress
- `/montree/dashboard/[childId]/reports` - Reports (needs work)
- `/montree/parent/dashboard` - Parent dashboard
- `/montree/admin` - Principal dashboard
- `/montree/super-admin` - Master admin
