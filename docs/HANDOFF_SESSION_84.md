# SESSION 84 HANDOFF - Demo System Complete

## Date: January 25, 2026

---

## ✅ COMPLETED THIS SESSION

### Demo Tutorial System
- **Query param approach**: `?demo=true` on real dashboard (not separate pages)
- **Visual icons**: Every tutorial step shows WHAT to click
- **Back button**: Users can go back through steps
- **Generic mode**: Works for any viewer, not just Zohan

### Performance Optimization
- **Database indexes added**: 7 indexes on frequently queried columns
- **Tables indexed**: child_work_progress, weekly_assignments, montree_weekly_reports, child_work_media, classroom_children, children

### UI Cleanup
- **Removed Portfolio tab**: Dashboard simplified to 3 tabs (This Week, Progress, Reports)
- **Fixed report URL**: Now uses correct port via window.location.origin
- **Demo banner on admin**: Orange banner with "Try Demo" + "Copy Link" buttons

---

## 🔗 KEY URLS

| URL | Purpose |
|-----|---------|
| `/montree/dashboard?demo=true` | Generic demo with tutorial |
| `/montree/admin` | Admin dashboard with demo banner |
| `https://www.teacherpotato.xyz/montree/dashboard?demo=true` | Production demo link |

---

## 📋 NEXT SESSION: School Onboarding System

### The Vision (from past conversations)

```
SCHOOL SIGNS UP (landing page)
      ↓
PRINCIPAL DASHBOARD
├── School: Beijing International School
├── Add Classrooms (Whale, Panda, etc.)
└── Assign Teachers to each classroom
      ↓
TEACHER RECEIVES INVITE
├── Creates account via invite link
├── Sees assigned classroom
└── Adds students with:
    - Name, DOB, Photo
    - Starting progress levels (P/S/M/L/C)
      ↓
TEACHER USES DAILY
├── Track progress
├── Capture photos
└── Generate reports
```

### Database Tables Needed

```sql
-- Schools (exists but needs upgrade)
schools
  - id, name, slug, logo_url
  - subscription_tier (free/basic/premium)
  - max_teachers, max_children

-- Link users to schools
school_users
  - school_id, user_id, role (admin/teacher)
  - invited_at, accepted_at

-- Teacher invites (before account creation)
school_invites
  - school_id, email, token, expires_at
  - role (teacher/assistant)
```

### Pages to Build

**Public:**
- `/montree` - Landing page with signup form (exists)
- `/montree/signup` - School registration wizard

**Principal/Admin:**
- `/montree/admin/onboarding` - First-time setup wizard
- `/montree/admin/classrooms` - Add/manage classrooms
- `/montree/admin/teachers` - Invite teachers

**Teacher:**
- `/montree/setup` - First-time class setup (add students)
- `/montree/dashboard` - Daily use (exists)

### Signup Flow

1. **School fills form** → name, admin email, password
2. **System creates** → school record, admin user, links them
3. **Admin sees dashboard** → "Add Classroom" + "Invite Teacher"
4. **Admin invites teacher** → email with signup link
5. **Teacher clicks link** → creates account, auto-linked to school
6. **Teacher adds students** → wizard with name/DOB/progress

---

## 💰 REVENUE MODEL (from Session 16)

- **School**: $29/month (unlimited teachers/students)
- **District**: $199/month (10 schools)
- **Target**: 100 schools + 10 districts = $58,680/year

### Stripe Status
- Infrastructure built
- Needs: Stripe account, API keys in Railway, Migration 028

---

## 🗂️ FILES MODIFIED THIS SESSION

```
components/montree/DemoTutorial.tsx    - Visual icons + back button
app/montree/dashboard/page.tsx         - Generic demo param
app/montree/dashboard/student/[id]/page.tsx - Removed Portfolio tab
app/montree/admin/page.tsx             - Demo banner added
lib/montree/reports/token-service.ts   - Fixed share URL
supabase/migrations/063_performance_indexes.sql - NEW
```

---

## 🚀 QUICK START NEXT SESSION

```bash
cd ~/Desktop/whale && npm run dev
```

**Priority**: School onboarding wizard - the funnel from signup to first student added.

---

*Handoff complete. Demo system polished and ready to share.*
