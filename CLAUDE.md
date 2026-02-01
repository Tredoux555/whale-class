# Whale-Class / Montree - Developer Handoff

## Project Overview
Next.js 14 app with two separate systems:
- **Whale Class** (`/admin/*`) - Mock data, not connected to database
- **Montree** (`/montree/*`) - Real SaaS multi-tenant school management system

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

## 🚧 NEXT SESSION TASKS

### Phase 2: Enhanced Parent Experience

1. **Parent Report View** (`/app/montree/parent/report/[reportId]/page.tsx`)
   - Make sure it displays nicely for parents
   - Show photos full-size with tap to expand
   - Include home activity suggestions

2. **Invite Parent Flow**
   - Auto-send invite email when generating invite code
   - Better UI for teachers to see which parents are linked

3. **Photo Capture Integration**
   - Link photos to specific works during capture
   - Show work name on photos in report

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

### Auth Flow
```
Teacher invites parent → Generate code → Parent signs up with code → Parent logs in
```

### Database Tables
```sql
montree_parents (id, email, password_hash, name, phone, notification_prefs)
montree_parent_children (parent_id, child_id, relationship, can_view_reports)
montree_parent_invites (invite_code, child_id, expires_at, used_by)
```

### Key Files
- `/app/montree/parent/login/page.tsx` - Parent login
- `/app/montree/parent/signup/page.tsx` - Parent signup (uses invite code)
- `/app/montree/parent/dashboard/page.tsx` - Parent dashboard
- `/components/montree/InviteParentModal.tsx` - Teacher generates invite codes
- `/lib/montree/email.ts` - Email templates (Resend)
- `/app/api/montree/notify/route.ts` - Send notifications to parents

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

### 1. Works Vanishing on Tab Switch
- Added visibility/focus listeners but may still have issues
- Check if API is returning data correctly

### 2. Reports 404 Error
- `/api/montree/reports/generate` exists but may have issues
- Weekly-review page calls it but gets errors

### 3. RLS Policies Permissive
- Parent tables have "Allow all" RLS - needs security refinement

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
