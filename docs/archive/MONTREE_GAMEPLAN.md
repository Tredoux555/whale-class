# MONTREE GAMEPLAN
## The Complete Roadmap: Web to Native
## Updated: January 26, 2026

---

# 🎯 THE MISSION

**"Schools buy the app. They own their data. Forever."**

This isn't just an app. It's a tool that gives schools control:
- No vendor lock-in
- No data hostage
- No subscription treadmill
- They pay once. They own it forever.
- Their students' faces never touch your servers
- Their data is their business

If Montree disappears tomorrow, every school still has a working app and all their data.

---

# 📊 PROGRESS OVERVIEW

```
PHASE 1: WEB PERFECTION ████████████████████ 100% ✅ COMPLETE
PHASE 2: NATIVE         ░░░░░░░░░░░░░░░░░░░░   0% ⏳ NEXT
```

---

# ✅ PHASE 1: WEB PERFECTION (Complete)

## Sessions 85-92 Summary

| Session | Date | Focus | Status |
|---------|------|-------|--------|
| 85 | Jan 25 | Onboarding wizard + login codes | ✅ |
| 86 | Jan 25 | Dashboard auth + classroom filter | ✅ |
| 87 | Jan 25 | Admin panel with classrooms grid | ✅ |
| 88 | Jan 25 | Student management CRUD | ✅ |
| 89 | Jan 25 | Progress tracking (tap to cycle) | ✅ |
| 90 | Jan 25 | Reports with classroom filter | ✅ |
| 91 | Jan 25 | Build verification + test checklist | ✅ |
| 92 | Jan 25 | Polish + navigation | ✅ |

## What's Built

### Authentication
- Principal onboarding creates schools, classrooms, teachers
- Generates unique login codes (e.g. "whaleclass-7a4b")
- Teachers set password on first login
- Session stored in localStorage
- Each teacher sees only their classroom

### Core Features
- Dashboard with student grid
- Progress tracking (tap to cycle status)
- Weekly reports
- Media gallery
- 27+ educational games

### Admin
- Classrooms grid with teacher codes
- Student management (add/edit/remove/move)
- Copy login codes

### Handoff Document
See: `/docs/HANDOFF_PHASE1_WEB_COMPLETE.md`

---

# ⏳ PHASE 2: NATIVE CONVERSION (Next)

## Sessions 93-101 Plan

| Session | Focus | Description |
|---------|-------|-------------|
| 93 | Capacitor setup | Verify config, test build |
| 94 | SQLite integration | Add @capacitor-community/sqlite |
| 95 | Data layer swap | Abstract Supabase → SQLite |
| 96 | Photo storage | Capacitor Filesystem API |
| 97 | Offline-first | Complete local operation |
| 98 | Optional sync | iCloud/Google Drive/NAS choice |
| 99 | Native polish | iOS/Android specific tweaks |
| 100 | App Store prep | Icons, screenshots, descriptions |
| 101 | LAUNCH 🚀 | Submit to App Store / Play Store |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPACITOR SHELL                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              NEXT.JS UI (Static Export)             │   │
│   │                                                     │   │
│   │   Same components, same pages, same styling         │   │
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                    ┌───────┴───────┐                        │
│                    │  DATA LAYER   │                        │
│                    │  (Abstracted) │                        │
│                    └───────┬───────┘                        │
│                            │                                │
│              ┌─────────────┴─────────────┐                  │
│              │                           │                  │
│      ┌───────▼───────┐           ┌───────▼───────┐          │
│      │   WEB MODE    │           │  NATIVE MODE  │          │
│      │   Supabase    │           │    SQLite     │          │
│      │    (Cloud)    │           │    (Local)    │          │
│      └───────────────┘           └───────┬───────┘          │
│                                          │                  │
│                                  ┌───────▼───────┐          │
│                                  │ Device Storage │          │
│                                  │  (Their Data)  │          │
│                                  └───────┬───────┘          │
│                                          │                  │
│                                  ┌───────▼───────┐          │
│                                  │ Optional Sync  │          │
│                                  │ iCloud/Drive   │          │
│                                  │ NAS/WebDAV     │          │
│                                  └───────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Layer Abstraction

```typescript
// lib/data/index.ts
import { isNative } from '@/lib/platform';
import * as supabase from './supabase';
import * as sqlite from './sqlite';

export const db = isNative() ? sqlite : supabase;

// Usage in components:
import { db } from '@/lib/data';
const children = await db.getChildren(classroomId);
```

## Local Storage Strategy

```
/Documents/Montree/
├── database.sqlite          # All structured data
├── photos/
│   ├── 2026-01/
│   │   ├── abc123.jpg
│   │   └── def456.jpg
│   └── 2026-02/
└── exports/
    └── reports/
```

## Pricing Model

| Option | Price | Best For |
|--------|-------|----------|
| A | $299 one-time | Schools wanting ownership |
| B | $29/mo or $199/yr | Schools wanting updates |
| C | Free (1 class) / $99 unlimited | Try before buy |

---

# 🗂️ KEY FILES

```
/docs/MONTREE_GAMEPLAN.md                    # This file
/docs/HANDOFF_PHASE1_WEB_COMPLETE.md         # Phase 1 handoff
/docs/SESSION_91_TEST_CHECKLIST.md           # Test checklist
/brain.json                                  # Session tracking
/capacitor.config.json                       # Capacitor config
/app/montree/                                # All pages
/app/api/montree/                            # All APIs
/migrations/067-068_*.sql                    # DB migrations
```

---

# 🔑 TEST CREDENTIALS

```
URL:      http://localhost:3000/montree/login
Code:     whaleclass-7a4b
Teacher:  Tredoux
Students: 18
School:   Beijing International School
```

---

# 📝 NOTES FOR NEXT SESSION

**Session 93: Capacitor Setup**

1. Verify `capacitor.config.json` is correct
2. Run `npx cap init` if needed
3. Add iOS platform: `npx cap add ios`
4. Add Android platform: `npx cap add android`
5. Test build: `npm run build && npx cap sync`
6. Open in Xcode: `npx cap open ios`
7. Verify app loads

**Prerequisites:**
- Xcode installed
- Android Studio installed (optional for first test)
- CocoaPods installed (`sudo gem install cocoapods`)

---

*Last Updated: January 26, 2026*
*Phase 1 Complete: Sessions 85-92*
*Next: Phase 2, Session 93*
