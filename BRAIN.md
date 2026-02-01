# Montree Brain

> Say "read the brain" at session start. Say "update brain" at session end.

## Current State (Jan 31, 2026 - Evening)

**App**: Montree - Montessori classroom management
**Stack**: Next.js 16, React 19, TypeScript, Supabase, Tailwind
**Deployed**: Railway (API) + Vercel (frontend) at teacherpotato.xyz
**Status**: WORKING - Students can now be added! Curriculum correctly sequenced.

## Recent Changes

### Session - Feb 1, 2026 (Early Morning - Curriculum Guides COMPLETE!)

**📚 AMI ALBUM QUALITY TEACHER GUIDES: 100% COMPLETE!**

All 309 Montessori works now have comprehensive teacher guides.

**Location**: `lib/curriculum/comprehensive-guides/`
| File | Works | Status |
|------|-------|--------|
| `practical-life-guides.json` | 108 | ✅ 100% |
| `sensorial-guides.json` | 35 | ✅ 100% |
| `math-guides.json` | 65 | ✅ 100% |
| `language-guides.json` | 43 | ✅ 100% |
| `cultural-guides.json` | 58 | ✅ 100% |
| **TOTAL** | **309** | **✅ 100%** |

**Each work includes**:
- `quick_guide`: 3-5 bullet points for 10-second teacher scan ✅ 100%
- `presentation_steps`: Full AMI album step-by-step instructions ✅ 100%
- `control_of_error`, `direct_aims`, `indirect_aims`, `materials_needed` ✅ 100%
- `parent_description`: Warm, parent-friendly explanations ✅ 100%
- `why_it_matters`: Developmental significance for parents ✅ 100%

**API**: `GET /api/montree/works/guide?name=Work+Name&classroom_id=xxx`

**Auto-load on classroom creation**: ✅ YES - `curriculum-loader.ts` merges all data
**Backfill existing classrooms**: `GET /api/montree/admin/backfill-guides?classroom_id=xxx`
**SQL Migrations**:
- `migrations/103_backfill_curriculum_guides.sql` - Teacher guides
- `migrations/104_backfill_parent_descriptions.sql` - Parent descriptions

**Handoff Doc**: `docs/HANDOFF_CURRICULUM_GUIDES.md`

---

### Session - Jan 31, 2026 (Evening - CRITICAL FIXES)

**🔴 MAJOR BUGS FIXED:**

1. **Students failing to save** - Multiple root causes found:
   - `montree_children` table has NO `school_id` column (we were trying to insert it)
   - `age` column is INTEGER not DECIMAL (3.5 was failing, now rounds to 4)
   - Fixed in `/api/montree/children/route.ts` and `/api/montree/onboarding/students/route.ts`

2. **Curriculum sequence was garbage** - All works had `sequence: 1`
   - Root cause: Old Brain-based seeding had unreliable order
   - Created `/lib/montree/curriculum-loader.ts` - reads static JSON with CORRECT sequences
   - Sequence formula: `(area * 10000) + (category * 100) + work`
   - Example: Number Rods = 30101, Addition Strip Board = 30503
   - Number Rods now correctly appears BEFORE Addition Strip Board

3. **Chinese language removed** - User didn't want Chinese in the curriculum
   - Removed `name_chinese` from all curriculum routes and loader

**🛠️ NEW ENDPOINTS:**
- `/api/montree/admin/reseed-curriculum?classroom_id=XXX` - Re-seeds curriculum with correct sequence (GET)
- `/api/montree/debug/audit?classroom_id=XXX` - Full data audit for a classroom
- `/api/montree/debug/add-child?name=X&classroom_id=X` - Test child creation
- `/api/montree/debug/classroom?classroom_id=XXX` - Debug classroom data

**🔧 CHANGES:**
- Onboarding simplified: Welcome → straight to Dashboard (removed forced student-adding step)
- Teacher username: Now allows capital letters (teachers want proper names)
- Curriculum areas: English only (no Chinese)

**⚠️ CRITICAL DATABASE FACTS (learned the hard way):**
- `montree_children.age` = INTEGER (not decimal! Must round 3.5 → 4)
- `montree_children` has NO `school_id` column (use `classroom_id` only)
- Curriculum works need proper `sequence` values (Brain DB was unreliable)

**📋 STILL TO DO:**
- Test full flow: Create school → Add teacher → Login → Add student → Track progress
- Reseed the Panda classroom too (also has wrong sequences)
- Consider adding age as decimal in future migration

---

### Session - Jan 31, 2026 (Super Admin Security + School Setup)
- **Two Separate Systems Confirmed**:
  - `/admin/*` = Whale Class (mock data, NOT connected to database)
  - `/montree/*` = Montree SaaS (real database, multi-tenant)
  - User wants these KEPT SEPARATE

- **Super Admin Security** (simple but secure approach):
  - Session timeout: 15 minutes with auto-logout
  - Activity tracking: mousemove/keydown resets timer
  - Audit logging: All actions logged to `montree_super_admin_audit`
  - Data masking: Login codes, emails masked with reveal logging
  - Created `/app/api/montree/super-admin/audit/route.ts`
  - Created `/lib/montree/super-admin-security.ts`
  - Migration: `099_super_admin_security.sql` (may need to run)

- **School Setup Improvements**:
  - Batch inserts (50 at a time) with retry logic (3 attempts)
  - 10-second timeout for Brain DB fetch with Promise.race
  - Static curriculum fallback (268 works)
  - Streaming progress via SSE: `/api/montree/principal/setup-stream/route.ts`
  - Real progress bar in setup UI

- **⚠️ KNOWN BUGS TO FIX**:
  1. **Subscription status**: New schools show "Inactive" instead of "trialing"
  2. **Teachers page**: "Failed to load data" error - API needs school_id
  3. **Hardcoded password**: Remove `870602` from super-admin page, use env var only
  4. **Login code inconsistency**: One teacher code worked, another didn't (mu3rm9 failed, c4lidx worked) - investigate why

- **🐛 BUGS FIXED THIS SESSION**:
  - **CRITICAL: Students not saving (onboarding)** - `school_id` missing in insert
  - **CRITICAL: Students not saving (dashboard)** - `/api/montree/children/route.ts` also missing `school_id`
  - **Cultural mislabeled as "English"** - Fixed in 3 files
  - **CURRICULUM SEQUENCE OVERHAULED** - Brain had garbage order. Now uses static JSON as primary source

- **✨ NEW: Curriculum Loader** (`/lib/montree/curriculum-loader.ts`):
  - Reads static JSON files (5 areas with properly sequenced categories)
  - Global sequence formula: `(area * 10000) + (category * 100) + work`
  - Example: Number Rods (30101) correctly before Addition Strip Board (30503)

- **📋 NICE TO HAVE / FUTURE**:
  - **Extensions as teacher learning tool** - Teachers can skip but having extensions visible could teach them proper Montessori sequence. Curriculum becomes a learning reference.

- **URL Clarification**:
  - `/montree/admin/*` = Principal dashboard (school owner view)
  - `/montree/super-admin/*` = Master admin (support backdoor)
  - `/montree/teacher/*` = Teacher portal
  - `/montree/student/*` = Student portal

- **Scripts Created**:
  - `scripts/clear-schools.js` - Delete all Montree schools for testing
  - `scripts/test-curriculum.js` - Verify static curriculum data

### Session - Jan 31, 2026 (English Curriculum Build)
- **Onboarding Simplified**: Landing page now has "Set Up School" + "Login" dropdown (Teacher/Principal)
- **Curriculum Ordering Fixed**: `/api/montree/curriculum/route.ts` now preserves brain's `sequence_order`
- **Complete English/Phonics Curriculum Created**:
  - 6-shelf layout covering consonants → free reading (age 3-5)
  - Shelf 1: Sound Foundations (sandpaper letters, I-spy)
  - Shelf 2: Pink Series CVC (short a, e, i, o, u word families)
  - Shelf 3: Blue Series (digraphs sh/ch/th + all blends)
  - Shelf 4: Green Series Part 1 (Magic E + core vowel teams)
  - Shelf 5: Green Series Part 2 (diphthongs, R-controlled vowels)
  - Shelf 6: Comprehension (sentences, stories, reading baskets)
- **6 Decodable Stories Created** with comprehension worksheets:
  1. "The Big Red Hat" - CVC focus
  2. "Chip and the Fish" - Digraphs
  3. "Frog on a Log" - Blends
  4. "The Bee in the Tree" - Vowel Teams
  5. "The Cake by the Lake" - Magic E
  6. "Time to Read!" - Mixed patterns
- **Digital Phonics Game**: `/app/montree/games/phonics-challenge/page.tsx` (if created)
- **Materials Created**:
  - `CVC_Curriculum_English.xlsx` - Complete word lists, sentences, stories
  - `English_Corner_Works_Layout.xlsx` - 114 works across 6 shelves × 4 levels
  - `English_Corner_Shelf_Diagram.html` - Visual layout diagram
  - Story PDFs with comprehension + answer key
  - All bundled in `Montessori_Phonics_Curriculum.zip`

### Session - Jan 30, 2026 (Continued)
- **AI Analysis Fix**: Now uses FULL learning journey data (not just 4 weeks)
- AI reads notes from `montree_work_sessions` table (previously missed)
- AI "thinks like a teacher who's known the child for years"
- WorkWheelPicker simplified: single "Select" button, defaults to `not_started`
- **Curriculum Fix**: New classrooms auto-assign full curriculum during onboarding
- Created backfill endpoint: `/api/montree/admin/backfill-curriculum`

### Session - Jan 30, 2026 (Earlier)
- Replaced all whale emojis (🐋) with tree emojis (🌳) across 44 source files + 5 icon SVGs
- Skipped historical docs to preserve project history

### Previous Sessions
- Progress display bug fixed - status values are `not_started`, `presented`, `practicing`, `mastered`
- WorkWheelPicker created (`components/montree/WorkWheelPicker.tsx`) - drum picker triggered by long-press on area icons
- Student grid auto-resize fixed with CSS Grid
- Suspense fix pushed (wrapped `useSearchParams()` in curriculum-import page)

## Key Files

| File | Purpose |
|------|---------|
| **TEACHER GUIDES (NEW)** | |
| `lib/curriculum/comprehensive-guides/*.json` | AMI album quality guides for 268 works (44.4% complete) |
| `lib/curriculum/comprehensive-guides/AUDIT.json` | Coverage tracking |
| `docs/HANDOFF_CURRICULUM_GUIDES.md` | Master handoff doc with all 268 works listed |
| `app/api/montree/works/guide/route.ts` | API endpoint for fetching guides |
| `app/api/montree/admin/backfill-guides/route.ts` | Backfill existing classrooms with guides |
| `migrations/103_backfill_curriculum_guides.sql` | SQL to update all classrooms |
| **CURRICULUM** | |
| `lib/montree/curriculum-loader.ts` | **AUTHORITATIVE** curriculum loader - merges stem + guides, correct sequences |
| `lib/montree/stem/*.json` | Static curriculum JSONs (practical-life, sensorial, math, language, cultural) |
| `app/api/montree/admin/reseed-curriculum/route.ts` | Re-seed classroom with correct curriculum (GET) |
| **STUDENT MANAGEMENT** | |
| `app/api/montree/children/route.ts` | Add/list children - **age must be INT, no school_id** |
| `app/montree/dashboard/students/page.tsx` | Student management UI |
| **DEBUG ENDPOINTS** | |
| `app/api/montree/debug/audit/route.ts` | Full data audit for classroom |
| `app/api/montree/debug/add-child/route.ts` | Test child creation |
| `app/api/montree/debug/classroom/route.ts` | Debug classroom data |
| **CORE** | |
| `components/montree/WorkWheelPicker.tsx` | Drum picker for curriculum navigation |
| `app/montree/dashboard/[childId]/page.tsx` | Student detail with wheel picker |
| `app/montree/dashboard/page.tsx` | Student grid (auto-resizing) |
| `app/montree/principal/register/page.tsx` | School registration |
| `app/montree/principal/setup/page.tsx` | School setup flow |
| `app/api/montree/principal/setup/route.ts` | Setup API - uses curriculum-loader.ts now |
| `app/api/montree/analysis/route.ts` | AI analysis API |
| `lib/montree/db.ts` | Database operations |

## Database

**Supabase Project**: dmfncjjtsoxrnvcdnvjq

### Key Tables
- `schools` - School records
- `classrooms` - Classrooms per school
- `montree_children` - Students
- `children` - Legacy children table (FK target)
- `montree_child_progress` - Progress tracking (status per work)
- `montree_work_sessions` - Teacher notes/observations (detailed session logs)
- `montree_classroom_curriculum_works` - Curriculum assigned to classrooms
- `montree_weekly_analysis` - Cached AI analysis results
- `curriculum_areas` - Area definitions
- `curriculum_works` - Work items

### Status Values
Progress uses: `not_started` → `presented` → `practicing` → `mastered`
(NOT `completed` - that was the old bug)

## Demo Logins
- `butter1` = Butterfly Class
- `rainbo2` = Rainbow Class

## Architecture Notes

### Curriculum Flow
1. Static curriculum in `curriculum-data.ts` (fallback)
2. Schools can customize via `school_curriculum` table
3. Classrooms inherit from school or override via `classroom_curriculum`
4. Progress tracked in `child_work_completion`

### Auth Flow
- Teachers log in with class code
- Principals register schools, create classrooms
- Parents get invite codes from teachers

## Pending / Next Up
- [x] **FIXED: Students not saving** - age must be INT, no school_id column
- [x] **FIXED: Curriculum sequence** - Now uses static JSON loader
- [x] **FIXED: Chinese removed** - English only curriculum
- [x] **COMPLETE: Curriculum Guides** - 309/309 works (100%)! All have quick_guide + presentation_steps
- [ ] **TEST: Add student from dashboard** - Should work now! Try adding Amy again.
- [ ] **Reseed Panda classroom** - Hit `/api/montree/admin/reseed-curriculum?classroom_id=3775b195-1c85-4e2a-a688-e284e98e7b7d`
- [ ] **FIX: Subscription status** - New schools show "Inactive" not "trialing"
- [ ] **FIX: Teachers page** - "Failed to load data" error
- [ ] **FIX: Remove hardcoded password** - `870602` in super-admin page
- [ ] Run migration `099_super_admin_security.sql` for audit tables
- [ ] Push commits to git

## Gotchas
- **`montree_children.age` is INTEGER** - must use `Math.round()` on decimals like 3.5
- **`montree_children` has NO `school_id` column** - only use `classroom_id`
- **Curriculum sequence** - ALWAYS use `/lib/montree/curriculum-loader.ts`, NOT Brain database
- `useSearchParams()` must be wrapped in Suspense boundary (Next.js 16)
- Foreign key: `child_work_completion.child_id` → `children.id` (not montree_children!)
- Progress status mapping in `lib/montree/db.ts` - don't use 'completed'
- Railway rebuilds can take a few minutes
- Next.js can use 6GB+ RAM - kill and restart if machine struggles

## URLs
- **Production**: teacherpotato.xyz
- **Teacher Dashboard**: teacherpotato.xyz/montree
- **Admin**: teacherpotato.xyz/admin
