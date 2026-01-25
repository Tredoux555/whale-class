# MONTREE: THE COMPLETE GAMEPLAN

## From Web to Native - Schools Own Their Data Forever

**Created:** January 25, 2026  
**Author:** Claude + Tredoux  
**Status:** ACTIVE - THIS IS THE ONLY PRIORITY

---

## THE VISION

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   "You deliver the tool. They own everything."                          │
│                                                                         │
│   Schools buy Montree once.                                             │
│   Data lives on THEIR devices.                                          │
│   Photos never leave THEIR control.                                     │
│   Works offline. Works forever.                                         │
│   Even if you disappear, the app still runs.                           │
│                                                                         │
│   You're not building a data empire.                                    │
│   You're building a tool that sets schools free.                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## THE TWO PHASES

### PHASE 1: WEB (Current)
- **Purpose:** Perfect the product, prove it works
- **Data:** Supabase (your server) - temporary
- **Goal:** Flawless UX that any school can use
- **Duration:** Until rock solid

### PHASE 2: NATIVE (After Phase 1)
- **Purpose:** The real product
- **Data:** SQLite on device + optional sync to their cloud
- **Distribution:** App Store + Play Store
- **Pricing:** One-time purchase OR subscription for updates
- **Result:** Schools own everything forever

---

## PHASE 1: WEB PERFECTION

### ✅ COMPLETED
- [x] Database schema (schools, classrooms, teachers, children)
- [x] Onboarding wizard (3 steps + success with codes)
- [x] Teacher login system (code-based first login)
- [x] Auth APIs (validate-code, set-password, login)
- [x] Existing Whale Class migrated

### 🔄 IN PROGRESS (Sessions 86-90)

#### Session 86: Dashboard Connection
- [ ] Read logged-in teacher from localStorage
- [ ] Filter children by teacher's classroom_id
- [ ] Show classroom name + icon in header
- [ ] Empty state for new classrooms
- [ ] Logout functionality

#### Session 87: Admin Panel
- [ ] `/montree/admin/classrooms` - grid view of all classrooms
- [ ] Add/edit/delete classrooms
- [ ] View teacher codes (regenerate if needed)
- [ ] Invite new teachers

#### Session 88: Student Management
- [ ] Add student modal
- [ ] Edit student details
- [ ] Move student between classrooms
- [ ] CSV import for bulk add
- [ ] Photo upload for students

#### Session 89: Progress Tracking
- [ ] Connect curriculum works to classrooms
- [ ] Track work completion per student
- [ ] Visual progress indicators
- [ ] Teacher can mark works as started/practicing/mastered

#### Session 90: Reports
- [ ] Weekly report generation
- [ ] Parent-friendly report view
- [ ] Share via link or PDF
- [ ] Report history

### 🧪 TESTING PHASE (Sessions 91-92)

#### Session 91: End-to-End Testing
- [ ] Create fresh school via onboarding
- [ ] Add 3 classrooms with teachers
- [ ] Each teacher logs in with code
- [ ] Add students to each classroom
- [ ] Track progress for 1 week
- [ ] Generate reports

#### Session 92: Polish & Bugs
- [ ] Fix any bugs found
- [ ] Mobile responsiveness
- [ ] Loading states
- [ ] Error handling
- [ ] Performance optimization

---

## PHASE 2: NATIVE CONVERSION

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NATIVE APP (Capacitor Shell)                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SAME NEXT.JS UI (exported as static)                            │   │
│  │  - All your React components                                     │   │
│  │  - Same beautiful UX                                             │   │
│  │  - Same onboarding, login, dashboard                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  DATA LAYER (swapped)                                            │   │
│  │                                                                   │   │
│  │  WEB:    Supabase API calls                                      │   │
│  │  NATIVE: SQLite local database                                   │   │
│  │                                                                   │   │
│  │  Same schema, different location                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  DEVICE STORAGE                                                  │   │
│  │  - SQLite database file                                          │   │
│  │  - Photos folder (local)                                         │   │
│  │  - All data encrypted at rest                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼ (OPTIONAL - user's choice)               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  SYNC (if they want)                                             │   │
│  │  - iCloud                                                        │   │
│  │  - Google Drive                                                  │   │
│  │  - Their own NAS                                                 │   │
│  │  - Another device                                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Session 93: Capacitor Setup
- [ ] Install Capacitor in project
- [ ] Configure for iOS and Android
- [ ] Export Next.js as static site
- [ ] Test basic shell on simulator
- [ ] Verify UI renders correctly

### Session 94: SQLite Integration
- [ ] Install `@capacitor-community/sqlite`
- [ ] Create database initialization script
- [ ] Mirror Supabase schema in SQLite
- [ ] Create abstraction layer (web = Supabase, native = SQLite)

### Session 95: Data Layer Swap
- [ ] Create `useDatabase` hook that detects environment
- [ ] Implement all CRUD operations for both backends
- [ ] Test create/read/update/delete on native
- [ ] Verify data persists after app restart

### Session 96: Photo Storage
- [ ] Use Capacitor Filesystem API
- [ ] Store photos in app's documents directory
- [ ] Thumbnail generation
- [ ] Photo picker integration (camera + gallery)

### Session 97: Offline First
- [ ] App works with no internet
- [ ] Queue changes when offline
- [ ] Sync when back online (optional feature)
- [ ] Conflict resolution strategy

### Session 98: Optional Sync
- [ ] iCloud integration (iOS)
- [ ] Google Drive integration (Android)
- [ ] Custom server sync (for schools with own infrastructure)
- [ ] Export/import database backup

### Session 99: Native Polish
- [ ] App icons and splash screens
- [ ] Push notifications (optional)
- [ ] Haptic feedback
- [ ] Native navigation gestures
- [ ] Performance optimization

### Session 100: App Store Prep
- [ ] Apple Developer account setup
- [ ] Google Play Developer account setup
- [ ] Privacy policy (emphasize local-first)
- [ ] App Store screenshots
- [ ] App Store description
- [ ] TestFlight beta testing

### Session 101: Launch
- [ ] Submit to App Store
- [ ] Submit to Play Store
- [ ] Landing page for Montree
- [ ] Pricing page
- [ ] Documentation for schools

---

## TECHNICAL STACK

### Web (Phase 1)
```
Frontend:     Next.js 14 + React + Tailwind
Backend:      Supabase (PostgreSQL + Auth + Storage)
Hosting:      Railway
Domain:       teacherpotato.xyz/montree
```

### Native (Phase 2)
```
Shell:        Capacitor 5+
Database:     SQLite (via @capacitor-community/sqlite)
Storage:      Capacitor Filesystem
Camera:       Capacitor Camera
Sync:         PowerSync OR custom (optional)
Distribution: App Store + Google Play
```

### Shared (Both Phases)
```
UI:           Same React components
Schema:       Same database tables
Logic:        Same business logic
```

---

## DATA SCHEMA (Works for Both)

```sql
-- Schools
montree_schools (id, name, slug, settings, created_at)

-- Classrooms
montree_classrooms (id, school_id, name, icon, color, teacher_id)

-- Teachers
simple_teachers (id, name, password, login_code, school_id, classroom_id)

-- Students
children (id, name, classroom_id, school_id, photo_url, date_of_birth)

-- Progress
child_work_progress (id, child_id, work_id, status, updated_at)

-- Reports
montree_weekly_reports (id, classroom_id, week_number, year, content)
```

---

## PRICING MODEL (Native)

### Option A: One-Time Purchase
```
$299 one-time
- App works forever
- All features included
- No recurring fees
- Updates for 1 year included
```

### Option B: Subscription
```
$29/month OR $199/year
- Continuous updates
- Priority support
- Cloud backup included
- Cancel anytime (app still works with last version)
```

### Option C: Freemium
```
Free: 1 classroom, 10 students
Paid: Unlimited ($99 one-time)
```

---

## SUCCESS METRICS

### Phase 1 Complete When:
- [ ] Any school can onboard in < 5 minutes
- [ ] Teachers login without help
- [ ] Progress tracking works smoothly
- [ ] Reports generate correctly
- [ ] Zero critical bugs for 2 weeks

### Phase 2 Complete When:
- [ ] App runs fully offline
- [ ] Data stays on device
- [ ] Photos stored locally
- [ ] Sync works (optional)
- [ ] App Store approved
- [ ] First paying customer

---

## THE MISSION

```
This isn't just an app.

It's a tool that gives schools control.
No vendor lock-in.
No data hostage.
No subscription treadmill.

They pay once. They own it forever.
Their students' faces never touch your servers.
Their data is their business.

If Montree disappears tomorrow,
every school still has a working app
and all their data.

That's the product.
That's the promise.
That's the mission.
```

---

## FILES & LOCATIONS

```
Mission Control:     /docs/mission-control/mission-control.json
This Gameplan:       /docs/MONTREE_GAMEPLAN.md
Session Handoffs:    /docs/HANDOFF_*.md
Migrations:          /migrations/067-068_*.sql
```

---

**LET'S BUILD THIS.**
