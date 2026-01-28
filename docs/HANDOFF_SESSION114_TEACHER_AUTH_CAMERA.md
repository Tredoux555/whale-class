# HANDOFF: Session 114 - Teacher Auth, Camera Upload, Next Work Feature

**Date:** January 28, 2026
**Focus:** Teacher login system, photo uploads, UX improvements

---

## ✅ COMPLETED THIS SESSION

### 1. Teacher Username/Password Login
- Added `login_code` and `password_set_at` columns to `montree_teachers`
- Migration: `091_teacher_auth_upgrade.sql`
- Login page now accepts username OR email (changed input type from email to text)
- Tredoux's credentials: `tredoux` / `admin123` / code: `whale1`

### 2. "Next Work" Suggestion Feature
- **API:** `/api/montree/works/next/route.ts`
- When teacher marks a work as **Mastered (M)**, modal pops up suggesting the next work in sequence
- Finds next work via: `work_unlocks` table → `sequence_order` → `prerequisites`
- One-tap to add suggested work to child's focus

### 3. Camera/Photo Upload System
- **API:** `/api/montree/media/upload/route.ts`
- **Migration:** `092_montree_media.sql` (tables + storage bucket)
- Photos upload to Supabase Storage bucket `montree-media`
- Fixed redirect after upload (was `/student/` now correct `/${childId}`)

### 4. iOS Safe Area Fixes
- Dashboard header: `pt-[max(0.5rem,env(safe-area-inset-top))]`
- Dashboard footer: `pb-[max(0.25rem,env(safe-area-inset-bottom))]`
- Child detail header: `pt-[env(safe-area-inset-top)]`
- Logout button no longer conflicts with iOS status bar

### 5. Student Grid Layout
- Changed from tall rectangles to **square tiles**
- 4 columns for 20 students (4x5 grid)
- Scrollable instead of squishing to fit
- Better avatar sizing and spacing

### 6. PWA Setup for Montree
- Created `/public/montree-manifest.json`
- Created `/app/montree/layout.tsx` with manifest link
- App can be saved to home screen as "Montree"

---

## 🗄️ DATABASE CHANGES (Run in Supabase)

**Already run by Tredoux:**
- `091_teacher_auth_upgrade.sql` - teacher auth columns
- `092_montree_media.sql` - media tables + storage bucket
- `ALTER TABLE montree_media ALTER COLUMN captured_by DROP NOT NULL`
- Teacher linked to school: `school_id = '46586648-3e15-4143-a9e0-b51a228bbf21'`
- Teacher linked to classroom: `classroom_id = '62e10e02-fb0f-4e03-a4da-d1823444e8c3'`

---

## 📁 KEY FILES CHANGED

```
app/montree/
├── layout.tsx                          # NEW - PWA manifest
├── login/page.tsx                      # Username/email login
├── set-password/page.tsx               # First-time password setup
├── dashboard/
│   ├── page.tsx                        # Square grid, safe areas
│   ├── [childId]/
│   │   ├── layout.tsx                  # Safe area fix
│   │   └── page.tsx                    # Next work suggestion modal
│   └── capture/page.tsx                # Fixed school_id + redirect

app/api/montree/
├── auth/teacher/route.ts               # Code OR username+password login
├── auth/set-password/route.ts          # Set password API
├── works/next/route.ts                 # NEW - Get next work in sequence
└── media/upload/route.ts               # NEW - Photo upload API

public/
└── montree-manifest.json               # NEW - PWA manifest

supabase/migrations/
├── 091_teacher_auth_upgrade.sql        # NEW - login_code, password_set_at
└── 092_montree_media.sql               # NEW - media tables + storage
```

---

## 🔐 TREDOUX'S LOGIN

| Method | Value |
|--------|-------|
| Username | `tredoux` |
| Password | `admin123` |
| Login Code | `whale1` |
| School ID | `46586648-3e15-4143-a9e0-b51a228bbf21` |
| Classroom ID | `62e10e02-fb0f-4e03-a4da-d1823444e8c3` |

---

## 🐛 KNOWN ISSUES / TODO

1. **Parent communication** - Box left closed for now, Phase 2 feature
2. **Principal teacher management** - Principal should control teacher passwords (not self-service)
3. **Photo gallery view** - Photos upload but no gallery to view them yet
4. **Next work data** - Needs more `work_unlocks` / `sequence_order` data populated for suggestions to work well

---

## 🧪 TESTING CHECKLIST

- [x] Login with username `tredoux` / password `admin123`
- [x] Login with code `whale1`
- [x] Students display (20 in Whale class)
- [x] Square tiles on dashboard
- [x] Safe area - logout button accessible
- [x] Camera takes photo
- [x] Photo uploads successfully
- [x] Redirect after photo works
- [x] Mark work as Mastered → Next work suggestion appears

---

## 🚀 DEPLOYMENT

All changes pushed to `main` and deployed via Railway.
Production: https://www.teacherpotato.xyz/montree/login

---

## 📝 NEXT SESSION PRIORITIES

1. **Photo gallery** - View uploaded photos per child
2. **Principal dashboard** - Manage teachers (add/edit/deactivate/reset password)
3. **More sequence data** - Populate `work_unlocks` for better "next work" suggestions
