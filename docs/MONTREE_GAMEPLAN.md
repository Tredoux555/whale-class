# MONTREE GAMEPLAN
## Updated: Session 92 - January 25, 2026

---

## 🎯 THE MISSION

> **Schools buy the app. They own their data. Forever.**

No vendor lock-in. No data hostage. No subscription treadmill.
Pay once. Own forever. Your students' faces never touch our servers.

---

## ✅ PHASE 1: WEB PERFECTION - COMPLETE!

### Sessions 85-92 Summary

| Session | What Was Built |
|---------|----------------|
| 85 | Onboarding wizard, Teacher login codes, Auth APIs |
| 86 | Dashboard auth, Classroom filtering, Logout |
| 87 | Admin panel with classrooms grid, Teacher codes visible |
| 88 | Student management (add/edit/remove/move) |
| 89 | Progress tracking (tap to cycle status) |
| 90 | Weekly reports with classroom filtering |
| 91 | Build verification, Test checklist |
| 92 | Landing page, Polish, Documentation |

### Core URLs

| URL | Purpose | Auth |
|-----|---------|------|
| `/montree` | Landing page | Public |
| `/montree/onboarding` | Principal sets up school | Public |
| `/montree/login` | Teacher login | Public |
| `/montree/dashboard` | Teacher's classroom | Required |
| `/montree/dashboard/progress` | Progress tracking | Required |
| `/montree/dashboard/reports` | Weekly reports | Required |
| `/montree/admin` | Principal dashboard | TBD |
| `/montree/admin/students` | Student management | TBD |

### Database Tables

```
montree_schools
  - id, name, slug, subscription_status

montree_classrooms  
  - id, school_id, name, icon, color, teacher_id

simple_teachers
  - id, name, login_code, password_hash, password_set
  - classroom_id, school_id

children
  - id, name, classroom_id, school_id

child_work_progress
  - child_id, work_id, status (0-3)
  - presented_date, practicing_date, mastered_date
```

---

## 🚀 PHASE 2: NATIVE CONVERSION

### Sessions 93-101 Roadmap

| Session | Goal |
|---------|------|
| 93 | Capacitor project setup |
| 94 | SQLite integration |
| 95 | Data layer swap (Supabase → SQLite) |
| 96 | Photo storage local (Capacitor Filesystem) |
| 97 | Offline-first complete |
| 98 | Optional sync (iCloud/Drive/NAS) |
| 99 | Native polish (iOS/Android) |
| 100 | App Store prep |
| 101 | LAUNCH 🚀 |

### Native Architecture

```
┌─────────────────────────────────────────┐
│         Capacitor Shell (Native)        │
├─────────────────────────────────────────┤
│    Same Next.js UI (static export)      │
├─────────────────────────────────────────┤
│           Data Layer                    │
│  ┌─────────────┐  ┌─────────────┐      │
│  │    Web:     │  │   Native:   │      │
│  │  Supabase   │  │   SQLite    │      │
│  │    API      │  │   Local     │      │
│  └─────────────┘  └─────────────┘      │
├─────────────────────────────────────────┤
│         Device Storage                  │
│    Photos → Device Filesystem           │
│    Data → SQLite Database               │
├─────────────────────────────────────────┤
│      Optional Sync (User Choice)        │
│    iCloud / Google Drive / NAS          │
└─────────────────────────────────────────┘
```

### Pricing Model (Native)

| Option | Price | Features |
|--------|-------|----------|
| Lifetime | $299 one-time | Works forever, all features |
| Monthly | $29/month | Cancel anytime |
| Annual | $199/year | Best value subscription |
| Freemium | Free | 1 classroom, upgrade for more |

---

## 📊 PROGRESS TRACKER

```
PHASE 1: WEB
├── 85 ✅ Onboarding + Login codes
├── 86 ✅ Dashboard connected  
├── 87 ✅ Admin panel
├── 88 ✅ Student management
├── 89 ✅ Progress tracking
├── 90 ✅ Reports
├── 91 ✅ Testing
└── 92 ✅ Polish ← DONE!

PHASE 2: NATIVE
├── 93 ⏳ Capacitor setup
├── 94 ⏳ SQLite
├── 95 ⏳ Data layer
├── 96 ⏳ Local photos
├── 97 ⏳ Offline-first
├── 98 ⏳ Optional sync
├── 99 ⏳ Native polish
├── 100 ⏳ App Store prep
└── 101 ⏳ LAUNCH
```

---

## 🧪 TESTING

Test checklist: `/docs/TEST_CHECKLIST.md`

### Quick Verification

```bash
# Build
npm run build

# Dev server
npm run dev

# Test login code
whaleclass-7a4b
```

---

## 🔑 KEY PRINCIPLES

1. **Local-first**: Data lives on THEIR device
2. **Works offline**: No internet needed for daily use
3. **No lock-in**: Export everything anytime
4. **Privacy**: Student photos never leave their device
5. **Forever**: If Montree dies, their app still works

---

**Next:** Session 93 - Capacitor Setup
