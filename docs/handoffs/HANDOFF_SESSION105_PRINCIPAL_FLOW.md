# Session 105 Handoff: Principal Flow

**Date:** 2026-01-27
**Focus:** Principal registration, login, and school setup with beautiful green theme

---

## Summary

Built complete principal authentication and onboarding flow. Principals are the paying customers - they register, create their school, add classrooms, and generate teacher login codes. All pages use the beautiful emerald/teal gradient theme from `/montree`.

---

## What Was Built

### Pages (all with green theme)

| Route | Purpose |
|-------|---------|
| `/montree/principal/register` | 2-step registration: school info → credentials |
| `/montree/principal/login` | Email + password login |
| `/montree/principal/setup` | Add classrooms + teachers, shows login codes |
| `/montree/super-admin` | View all registered schools (password: 870602) |

### APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/montree/principal/register` | POST | Creates school + principal account |
| `/api/montree/principal/login` | POST | Validates credentials, returns needsSetup flag |
| `/api/montree/principal/setup` | POST | Creates classrooms + teachers with codes |
| `/api/montree/super-admin/schools` | GET | Lists all schools with stats |
| `/api/montree/onboarding` | POST | Legacy onboarding (now saves to DB) |

---

## Database Tables Used

```
montree_schools
├── id, name, slug
├── owner_email, owner_name (principal info)
├── subscription_status, subscription_tier, plan_type
├── trial_ends_at, is_active
└── created_at, updated_at

montree_school_admins (principals)
├── id, school_id (FK)
├── email, password_hash, name
├── role (default: 'principal')
├── is_active, last_login
└── created_at, updated_at

montree_classrooms
├── id, school_id (FK)
├── name, icon, color
├── is_active
└── created_at, updated_at

montree_teachers
├── id, school_id (FK), classroom_id (FK)
├── name, email, password_hash (hashed 6-char code)
├── role (default: 'teacher')
├── is_active, last_login_at
└── created_at, updated_at
```

---

## User Flows

### New School Registration
```
/montree → "Set Up School"
    ↓
/montree/principal/register (Step 1: School name + Principal name)
    ↓
/montree/principal/register (Step 2: Email + Password)
    ↓
/montree/principal/setup (Add classrooms)
    ↓
/montree/principal/setup (Add teachers per classroom)
    ↓
Success screen with login codes (SAVE THESE!)
    ↓
/montree/admin (School dashboard)
```

### Principal Login (returning)
```
/montree → "Principal Login"
    ↓
/montree/principal/login (Email + Password)
    ↓
If no classrooms → /montree/principal/setup
Else → /montree/admin
```

### Teacher Login
```
/montree → "Teacher Login"
    ↓
/montree/login (6-character code)
    ↓
/montree/dashboard
```

---

## File Locations

```
app/montree/principal/
├── login/page.tsx      # Principal login
├── register/page.tsx   # Principal registration (2-step)
└── setup/page.tsx      # Classroom + teacher setup

app/montree/super-admin/
└── page.tsx            # Super admin dashboard

app/api/montree/principal/
├── register/route.ts   # POST - create school + principal
├── login/route.ts      # POST - authenticate principal
└── setup/route.ts      # POST - create classrooms + teachers

app/api/montree/super-admin/
└── schools/route.ts    # GET - list all schools
```

---

## Authentication

**Principals:** Email + password (SHA256 hashed)
- Stored in `montree_school_admins`
- Session stored in localStorage: `montree_principal`, `montree_school`

**Teachers:** 6-character login code (SHA256 hashed)
- Stored in `montree_teachers.password_hash`
- Code only shown once at creation - principal must save it!

---

## What's Working

- ✅ Principal registration creates school + admin account
- ✅ Principal login with email/password
- ✅ Classroom creation with icons/colors
- ✅ Teacher creation with auto-generated 6-char codes
- ✅ Super admin can view all registered schools
- ✅ Beautiful green theme throughout principal flow
- ✅ Landing page updated with principal login link

---

## What's Next

1. **Principal dashboard protection** - `/montree/admin` should verify principal session
2. **Password reset flow** - Forgot password for principals
3. **Teacher code regeneration** - If principal loses codes
4. **Billing integration** - Connect Stripe for subscriptions
5. **Email notifications** - Welcome email, code delivery to teachers

---

## Quick Test

```bash
# Server should be running
cd ~/Desktop/ACTIVE/whale && npm run dev

# Test URLs
http://localhost:3000/montree                    # Landing
http://localhost:3000/montree/principal/register # Register
http://localhost:3000/montree/principal/login    # Login
http://localhost:3000/montree/super-admin        # All schools (pass: 870602)
```

---

## Memory Update Needed

Add to brain.json:
```
PRINCIPAL FLOW COMPLETE: /montree/principal/register → /principal/login → /principal/setup. 
Principals use email+password, teachers use 6-char codes. 
Super admin at /montree/super-admin (pass: 870602).
```
