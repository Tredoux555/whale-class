# Montree Brain

> Say "read the brain" at session start. Say "update brain" at session end.

## Current State (Feb 3, 2026)

**App**: Montree - Montessori classroom management
**Stack**: Next.js 16, React 19, TypeScript, Supabase, Tailwind
**Deployed**: Railway (API) + Vercel (frontend) at teacherpotato.xyz
**Status**: TESTING WEEK - Bug Fixes + Student Tenure Feature 🧪

## Recent Changes

### Session - Feb 3, 2026 (BUGS FIXED + STUDENT TENURE! 🎯)

**🐛 CRITICAL BUGS FIXED:**

**1. Parent Reports 500 Error**
- Root Cause: `send/route.ts` was inserting non-existent columns (`week_number`, `report_year`, `is_published`, `published_at`)
- Fix: Rewrote to use actual schema columns (`week_start`, `week_end`, `status: 'sent'`)

**2. Gallery Not Showing Photos**
- Root Cause: Broken FK join `work:work_id (...)` failed silently
- Fix: Changed to simple query + manual curriculum lookup (same pattern as working preview endpoint)

**🆕 STUDENT TENURE FEATURE:**

Teachers can now specify how long a student has been enrolled when adding them. This gives Guru accurate context.

| File | Change |
|------|--------|
| `migrations/113_student_tenure.sql` | Adds `enrolled_at DATE` column to `montree_children` |
| `app/montree/dashboard/students/page.tsx` | Added tenure dropdown with 6 options |
| `app/api/montree/children/route.ts` | Added `enrolled_at` to POST and GET |
| `app/api/montree/children/[childId]/route.ts` | Added `enrolled_at` to PUT, added PATCH alias |
| `lib/montree/guru/context-builder.ts` | Now uses `enrolled_at` for `time_at_school` calculation |

**Tenure Options:**
- Just started (< 2 weeks)
- A few weeks (2-4 weeks)
- 1-3 months
- 3-6 months
- 6-12 months
- More than a year

**Impact:** Guru now accurately understands student tenure, won't suggest "adjustment period" advice for long-term students.

**Handoff:** `/HANDOFF.md`

---

### Session - Feb 2, 2026 (TESTING WEEK KICKOFF! 🧪)

**🚀 TESTING WEEK PREPARATION COMPLETE!**

**Changes Made:**
| File | Change |
|------|--------|
| `app/montree/dashboard/page.tsx` | Added 🖨️ Print button to header |
| `app/montree/dashboard/print/page.tsx` | Now shows focus works (teacher-assigned) |
| `scripts/clear-test-photos.js` | Photo cleanup script (auto-loads .env.local) |
| `docs/HANDOFF_TESTING_WEEK.md` | Full implementation mission plan |

**Feature Audit Completed:**
| Feature | Status | Notes |
|---------|--------|-------|
| Notes | ✅ Working | Could add toast confirmation |
| Video Capture | ❌ Not built | Only photos |
| Curriculum Edit | ✅ EXISTS | `/montree/dashboard/curriculum` |
| Capture Retake | ⚠️ Bug | State reset issue |
| Photo Management | ⚠️ View only | No edit/delete |
| Parent Portal | ✅ EXISTS | 6 pages at `/montree/parent/` |
| Teacher Summary | ❌ Not built | Plan to use Guru AI |

**Mission Plan Created:** See `## Pending / Next Up` section for 6-phase implementation plan.

**Git Commits:**
- `4cf263f` - Testing prep: Focus work fix, report preview, photo cleanup
- `a8f9488` - Print page now uses focus works
- `c838962` - Fix clear-test-photos script
- `3b999ee` - Add Print button to dashboard header

**Handoff:** `/docs/HANDOFF_TESTING_WEEK.md`

---

### Session - Feb 1, 2026 (Very Late Night - FOCUS WORK PERSISTENCE FIX! 🎯)

**🐛 CRITICAL BUG FIXED: Focus work changes weren't persisting!**

**Root Cause:** When changing focus via wheel picker:
1. Dashboard sent `is_focus: true` to `/api/montree/progress/update`
2. The endpoint **completely ignored** the `is_focus` flag
3. `montree_child_progress` table has NO `is_focus` column
4. Separate `montree_child_focus_works` table existed but was NEVER updated
5. After reload, focus reverted to status-priority-based selection

**Fixes Applied:**

| File | Change |
|------|--------|
| `/api/montree/progress/update/route.ts` | Now saves to `montree_child_focus_works` when `is_focus: true` |
| `/api/montree/progress/route.ts` | Fetches focus works and marks progress items with `is_focus` flag |
| `/components/montree/WorkWheelPicker.tsx` | Removed duplicate "Select" button, simplified to just "Add Work" |

**How Focus Works Now:**
1. Teacher clicks area icon → Wheel picker opens
2. Scroll to select work → Click highlighted work
3. API saves to `montree_child_progress` (progress) AND `montree_child_focus_works` (focus designation)
4. On reload, GET endpoint fetches both tables and marks `is_focus: true/false`
5. Dashboard's `fetchAssignments` uses `is_focus` flag to determine focus work

**WorkWheelPicker UI Simplified:**
- Clicking highlighted work = Change focus work (calls `onSelectWork`)
- "Add Work" button = Add as extra work (calls `onAddExtra`)
- No duplicate "Select" button anymore

**Earlier in Session - Photo-Work Association:**
- Capture button now includes: `?workName=X&area=Y`
- Photos uploaded with work context in `caption` field
- Report preview uses caption as fallback for work matching

**Handoff:** `/docs/HANDOFF_FOCUS_WORK_FIX.md`

---

### Session - Feb 1, 2026 (Very Late Night - REPORT PREVIEW COMPLETE! 👁️)

**🎉 REPORT PREVIEW FEATURE COMPLETE:**

Teachers can now preview exactly what parents will see before publishing reports.

**New Files Created:**
| File | Purpose |
|------|---------|
| `/api/montree/reports/preview/route.ts` | Loads parent descriptions from JSON, matches photos to works |
| `/api/montree/reports/unreported/route.ts` | Fetches all progress since last report |
| `/api/montree/reports/send/route.ts` | Publishes report and marks as reported |

**Reports Page Updated** (`/app/montree/dashboard/[childId]/reports/page.tsx`):
- Shows list of works with progress since last report
- Indicators: 📸 = photo attached, 📝 = description available
- "👁️ Preview Report" button opens modal showing exactly what parents will see
- Preview modal shows: child name, work names with status badges, photos, parent descriptions, "why it matters"
- "Publish Report" button to send to parents

**How Preview Works:**
1. Loads parent descriptions from `/lib/curriculum/comprehensive-guides/parent-*.json`
2. Matches photos by work_name from `montree_child_photos` table
3. Returns structured data with work_name, photo_url, parent_description, why_it_matters
4. Modal displays everything in parent-friendly format

**What Parents See:**
- Work name with status badge (🌱 Introduced / 🔄 Practicing / ⭐ Mastered)
- Photo of child doing the work (if taken)
- Parent-friendly description explaining what the work teaches
- "Why it matters" - developmental significance

**Git Status:** Committed and pushed to origin/main ✅

**Still To Do:**
- Parent-facing report page needs updating to consume new data structure
- Test full flow: mark progress → take photo → preview → publish → parent views

**Handoff:** `/docs/HANDOFF_REPORT_PREVIEW.md`

---

### Session - Feb 1, 2026 (Late Night - STATUS JUMPING + REPORTS OVERHAUL!)

**🐛 STATUS JUMPING BUG - ROOT CAUSE FOUND & FIXED:**

**Root Causes Identified:**
1. **Progress API used `ilike` (pattern match)** - Could create duplicate records or match wrong record
2. **Race condition in Week page** - Window focus triggered refetch while save was in progress
3. **Reports date filtering was brittle** - ISO timestamp string comparisons failed in edge cases

**Fixes Applied:**

| File | Fix |
|------|-----|
| `/api/montree/progress/update/route.ts` | Changed `ilike` to `eq` for exact work_name matching |
| `/app/montree/dashboard/[childId]/page.tsx` | Added `isSaving` state to block refetch during saves |
| `/app/montree/dashboard/[childId]/page.tsx` | All save functions now properly await and handle errors |
| `/app/montree/dashboard/[childId]/reports/page.tsx` | Complete rewrite - "Report to Date" approach |

**Reports System Overhaul - "Report to Date" Approach:**

Old approach: Complex week-based date filtering that was buggy
New approach: Simple - show all unreported progress since last report

| Endpoint | Purpose |
|----------|---------|
| `GET /api/montree/reports/unreported?child_id=X` | Fetch all progress since last report |
| `POST /api/montree/reports/send` | Send report to parents, marks as reported |

How it works now:
1. Teacher marks progress → saved to DB (no date complexity)
2. Reports tab shows ALL progress since last report sent
3. "Send Report" → emails parents + saves report → clears the list
4. Next time only new progress shows

This eliminates all date/timestamp bugs. Photos are still saved for end-of-term compilation.

**Still To Do:**
1. **Report Preview** - Teacher should see what report looks like before/after sending
2. **Parent Report Page** - Data structure mismatch between send endpoint and parent view page
3. **Push to deploy** - Changes committed locally, need `git push origin main`

**Handoff:** `/docs/HANDOFF_SESSION_STATUS_REPORTS.md`

---

### Session - Feb 1, 2026 (Night - DEEP AUDIT & FIXES!)

**🐛 MULTIPLE BUGS FOUND & FIXED:**

**1. Reports showing 0 activities**
- Root Cause: `updated_at` wasn't set on INSERT, only on UPDATE
- Fix: Added `updated_at: now` to insert in `/api/montree/progress/update/route.ts`
- Fix: Reports API now fetches ALL progress, filters in JS with fallback to `presented_at`

**2. Status mismatch: 'completed' vs 'mastered' (CRITICAL)**
- Root Cause: Week UI uses `'completed'` for mastered, but rest of app uses `'mastered'`
- Fix: API now normalizes `'completed'` → `'mastered'` in progress/update route
- Fix: Progress bars API now counts both `'completed'` and `'mastered'` as done
- Fix: Reports API now counts both in stats calculation

**3. Build error - duplicate variable**
- Fixed `allProgress` defined twice in reports route → renamed to `overallProgress`

**Files Modified:**
| File | Change |
|------|--------|
| `/api/montree/progress/update/route.ts` | Added `updated_at` on insert + normalize 'completed' to 'mastered' |
| `/api/montree/progress/bars/route.ts` | Handle both 'completed' and 'mastered' in count |
| `/api/montree/reports/route.ts` | Fixed duplicate var + JS filtering + stats calculation |
| `/app/montree/dashboard/[childId]/layout.tsx` | Removed Guru/Camera buttons |

**UI Cleanup Done:**
- Removed 🔮 Guru and 📷 Camera buttons from child detail header
- Reports page simplified: current week only, no week navigation
- Hidden tabs: Profile, Observations (kept functional but hidden)
- Active tabs: Week, Progress, Reports

**Guru Status:** API routes have issues (404s). Deferred for later.

---

### Session - Feb 1, 2026 (Evening - MONTESSORI GURU ALL PHASES COMPLETE! 🔮✅)

**🔮 MONTESSORI GURU - FULL IMPLEMENTATION COMPLETE!**

Philosophy: "Complexity absorbed, simplicity delivered" - Teacher asks simple question, gets genius-level child-specific advice.

**ALL PHASES COMPLETE:**

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation - Topic index, DB migration, basic API | ✅ |
| Phase 2 | Context Pipeline - Context builder, knowledge retriever, prompts | ✅ |
| Phase 3 | Core UI - Chat interface, response display, follow-up tracking | ✅ |
| Phase 4 | Profile System - Mental profiles, observations, pattern detection | ✅ |
| Phase 5 | Polish - Few-shot examples, streaming responses, final UI | ✅ |

**Complete Feature List:**
- ✅ Topic index auto-generated from 97K lines (34 topics, 1869 line ranges)
- ✅ Database migration 110 with 4 new tables
- ✅ Guru API endpoint with streaming support
- ✅ Guru chat UI with real-time streaming display
- ✅ "Ask Guru" button on all child pages
- ✅ Mental profile editor (temperament, sensitive periods, family context)
- ✅ Observation logging with ABC model (Antecedent-Behavior-Consequence)
- ✅ Automatic pattern detection from observations
- ✅ Follow-up tracking API for outcomes
- ✅ 6 comprehensive few-shot examples
- ✅ Child detail page tabs: Week, Progress, Profile, Observations, Reports

**Files Created:**
| File | Purpose |
|------|---------|
| `/scripts/build_topic_index.py` | Auto-generates topic index from books |
| `/data/guru_knowledge/topic_index.json` | Topic→line mapping for RAG |
| `/data/guru_knowledge/few_shot_examples.json` | 6 high-quality example Q&A pairs |
| `/migrations/110_guru_tables.sql` | Mental profiles, observations, interactions, patterns |
| `/lib/montree/guru/context-builder.ts` | Gathers all child context |
| `/lib/montree/guru/knowledge-retriever.ts` | Queries Montessori books |
| `/lib/montree/guru/prompt-builder.ts` | Constructs AI prompts |
| `/lib/montree/guru/index.ts` | Module exports |
| `/app/api/montree/guru/route.ts` | Main API endpoint |
| `/app/api/montree/guru/stream/route.ts` | Streaming API endpoint |
| `/app/api/montree/guru/followup/route.ts` | Follow-up tracking |
| `/app/api/montree/children/[id]/profile/route.ts` | Mental profile CRUD |
| `/app/api/montree/observations/route.ts` | Behavioral observations |
| `/app/api/montree/patterns/route.ts` | Pattern detection |
| `/app/montree/dashboard/guru/page.tsx` | Teacher chat UI with streaming |
| `/app/montree/dashboard/[childId]/profile/page.tsx` | Mental profile editor |
| `/app/montree/dashboard/[childId]/observations/page.tsx` | Observation logging |

**Database Tables:**
- `montree_child_mental_profiles` - Temperament (9 traits), learning modality, sensitive periods, family context
- `montree_behavioral_observations` - ABC model tracking, time/activity/intervention
- `montree_guru_interactions` - Questions, responses, context snapshots, outcomes
- `montree_child_patterns` - Auto-detected patterns with confidence levels

**Access Points:**
- Direct: `/montree/dashboard/guru`
- From child page: Click 🔮 Guru button in header
- Child profile: `/montree/dashboard/[childId]/profile`
- Observations: `/montree/dashboard/[childId]/observations`
- APIs: `POST /api/montree/guru`, `POST /api/montree/guru/stream`

**How It Works:**
1. Teacher selects child, types question
2. System gathers context (age, progress, mental profile, notes, observations)
3. Topic index identifies relevant Montessori book passages (34 topics from 97K lines)
4. Mega-prompt built with system persona, child context, knowledge, and few-shot examples
5. Claude generates response (streamed in real-time to UI)
6. Response displayed with insight, root cause, action plan, timeline, parent talking point
7. Interaction logged to database for future reference
8. Patterns auto-detected from observations over time

---

### Session - Feb 1, 2026 (Afternoon - MONTESSORI GURU PLANNED!)

**Knowledge Base COMPLETE (96,877 lines from 7 Montessori books)**:
- The Absorbent Mind (16,471 lines)
- The Secret of Childhood (10,306 lines)
- The Montessori Method (13,181 lines)
- Dr. Montessori's Own Handbook (3,364 lines)
- Pedagogical Anthropology (24,261 lines)
- Spontaneous Activity in Education (11,766 lines)
- The Montessori Elementary Material (17,528 lines)

**Location**: `/data/guru_knowledge/sources/*.txt`

**Documentation Created**:
- `/docs/MONTESSORI_GURU_ARCHITECTURE.md` - Full system design
- `/docs/MONTESSORI_GURU_IMPLEMENTATION_PLAN.md` - 10-day build plan
- `/docs/GURU_PLAN_AUDIT.md` - Critical gaps analysis
- `/docs/HANDOFF_MONTESSORI_GURU.md` - Handoff for next session

---

### Session - Feb 1, 2026 (Morning - PARENT DESCRIPTIONS COMPLETE!)

**🎉 100% COMPLETE: Teacher Guides + Parent Descriptions**

All 490 classroom curriculum works now have:
- ✅ `quick_guide` - 10-second teacher reference
- ✅ `presentation_steps` - Full AMI album instructions
- ✅ `parent_description` - Warm, parent-friendly explanations
- ✅ `why_it_matters` - Developmental significance

**Backfill Migrations Created** (all run successfully):
- `migrations/104_backfill_parent_descriptions.sql` - Initial backfill
- `migrations/105_fix_remaining_parent_descriptions.sql` - ILIKE pattern fixes
- `migrations/106_fix_missing_parent_descriptions.sql` - 100 exact matches
- `migrations/107_final_parent_descriptions.sql` - Additional patterns
- `migrations/108_final_19_parent_descriptions.sql` - Final 19 exact matches

**Database Status**:
- 490 total works (245 per classroom × 2 classrooms)
- 490/490 have `parent_description` ✅
- 490/490 have `why_it_matters` ✅

**Classrooms Backfilled**:
- Panda: `3775b195-1c85-4e2a-a688-e284e98e7b7d` ✅
- Whale: `945c846d-fb33-4370-8a95-a29b7767af54` ✅

**Auto-load for new classrooms**: ✅ YES - `curriculum-loader.ts` merges all guide data

---

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
| **MONTESSORI GURU (MVP COMPLETE!)** | |
| `data/guru_knowledge/sources/*.txt` | 7 Montessori books (96,877 lines) |
| `data/guru_knowledge/topic_index.json` | Topic→line ranges for RAG (auto-generated) |
| `data/guru_knowledge/manifest.json` | Knowledge base manifest |
| `lib/montree/guru/context-builder.ts` | Gathers child context for AI |
| `lib/montree/guru/knowledge-retriever.ts` | Queries topic index for passages |
| `lib/montree/guru/prompt-builder.ts` | Constructs mega-prompts with examples |
| `app/api/montree/guru/route.ts` | Main Guru API endpoint |
| `app/montree/dashboard/guru/page.tsx` | Teacher chat UI |
| `migrations/110_guru_tables.sql` | Database tables for profiles/interactions |
| `scripts/build_topic_index.py` | Regenerate topic index from books |
| `docs/MONTESSORI_GURU_ARCHITECTURE.md` | Full system design |
| `docs/MONTESSORI_GURU_IMPLEMENTATION_PLAN.md` | Build plan |
| `docs/HANDOFF_GURU_COMPLETE.md` | Complete Guru handoff (Feb 1 evening) |
| **TEACHER GUIDES + PARENT DESCRIPTIONS** | |
| `lib/curriculum/comprehensive-guides/*.json` | AMI album quality guides for 309 works (100% complete!) |
| `lib/curriculum/comprehensive-guides/AUDIT.json` | Coverage tracking |
| `docs/HANDOFF_CURRICULUM_GUIDES.md` | Master handoff doc |
| `migrations/104-108_*.sql` | Parent description backfill migrations |
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
- `montree_children` - Students (**has `enrolled_at` DATE for tenure tracking!**)
- `children` - Legacy children table (FK target)
- `montree_child_progress` - Progress tracking (status per work) - **NO is_focus column!**
- `montree_child_focus_works` - **Focus work per area per child** (unique: child_id, area)
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

### 🚀 TESTING WEEK MISSION PLAN (Feb 2, 2026)

**Handoff:** `/docs/HANDOFF_TESTING_WEEK.md`

#### Phase 1: Quick Fixes (1-2 hours)
- [ ] **FIX: Capture retake bug** - Camera stream doesn't restart properly
  - File: `components/montree/media/CameraCapture.tsx`
- [ ] **ADD: Note save confirmation** - Add toast when note saved

#### Phase 2: Photo Management System (4-6 hours)
- [ ] **BUILD: Photo Manager Page** - `/montree/dashboard/photos/page.tsx`
  - Grid view, filter by child/date/area
  - Edit caption, delete, bulk actions
- [ ] **BUILD: Photo Editor Modal** - View, edit tags, delete, reassign

#### Phase 3: Video Capture (3-4 hours)
- [ ] **ADD: Video mode** to CameraCapture component
  - Toggle 📷/🎥, MediaRecorder API, 30 sec max
  - Upload to Supabase storage

#### Phase 4: Teacher Summary System (6-8 hours) ⭐ USE GURU!
- [ ] **BUILD: Summary Generator** - `/montree/dashboard/[childId]/summary/page.tsx`
  - Collect: Focus works, progress, areas worked vs ignored
  - AI Summary: "This week {child} focused on... achieved... consider..."
- [ ] **BUILD: Summary Dashboard** - Week selector, area chart, productivity score
  - Neglected areas warning, "Ask Guru" button, Export to PDF

#### Phase 5: Curriculum Sequence Editor (2-3 hours)
- [ ] **ENHANCE: Curriculum page** - `/montree/dashboard/curriculum`
  - Drag-and-drop reordering, add/remove works

#### Phase 6: Parent Portal Enhancements (4-6 hours)
- [ ] **BUILD: Parent communication** - Inbox, announcements
- [ ] **BUILD: Approved photo gallery** for parents
- [ ] **BUILD: Report history** and milestones timeline

#### Quick Access URLs
| Feature | URL |
|---------|-----|
| Curriculum Editor | `/montree/dashboard/curriculum` |
| Photo Gallery | `/montree/dashboard/media` |
| Print Weekly | `/montree/dashboard/print` |
| Parent Portal | `/montree/parent` |

---

### Focus Work System (FIXED! 🎯)
- [x] **FIXED: Focus work not persisting** - Now saves to `montree_child_focus_works` table
- [x] **FIXED: Progress API missing is_focus** - Now fetches and marks focus works
- [x] **FIXED: WorkWheelPicker duplicate buttons** - Simplified to just "Add Work"
- [x] **FIXED: Photo-work association** - Capture passes workName/area params

### MONTESSORI GURU (ALL PHASES COMPLETE! 🔮✅)
- [x] **COMPLETE: Knowledge base** - 7 books, 96,877 lines collected
- [x] **COMPLETE: Architecture** - System design documented
- [x] **COMPLETE: Topic index** - Auto-generated with 34 topics, 1869 line ranges
- [x] **COMPLETE: Database tables** - Migration 110 created and run
- [x] **COMPLETE: Guru API** - `/api/montree/guru/route.ts` + streaming
- [x] **COMPLETE: Guru UI** - `/app/montree/dashboard/guru/page.tsx` with streaming
- [x] **COMPLETE: Ask Guru button** - Added to child detail pages
- [x] **COMPLETE: Mental profile editor** - `/app/montree/dashboard/[childId]/profile/page.tsx`
- [x] **COMPLETE: Observation logging** - `/app/montree/dashboard/[childId]/observations/page.tsx`
- [x] **COMPLETE: Response streaming** - SSE via `/api/montree/guru/stream/route.ts`
- [x] **COMPLETE: Pattern detection** - Auto-detects from observations
- [x] **COMPLETE: Few-shot examples** - 6 comprehensive Q&A pairs
- [x] **COMPLETE: Follow-up tracking** - `/api/montree/guru/followup/route.ts`

### Previous Items
- [x] **FIXED: Students not saving** - age must be INT, no school_id column
- [x] **FIXED: Curriculum sequence** - Now uses static JSON loader
- [x] **FIXED: Chinese removed** - English only curriculum
- [x] **COMPLETE: Curriculum Guides** - 309/309 works (100%)! All have quick_guide + presentation_steps
- [x] **COMPLETE: Parent Descriptions** - 490/490 works (100%)! All have parent_description + why_it_matters
- [x] **BACKFILLED: Panda & Whale classrooms** - Both have full guide data
- [ ] **TEST: Add student from dashboard** - Should work now! Try adding Amy again.
- [ ] **FIX: Subscription status** - New schools show "Inactive" not "trialing"
- [ ] **FIX: Teachers page** - "Failed to load data" error
- [ ] **FIX: Remove hardcoded password** - `870602` in super-admin page
- [ ] Run migration `099_super_admin_security.sql` for audit tables
- [x] **PUSHED**: Git commits including migrations 104-108 (Feb 1, 2026)

## Gotchas
- **`montree_children.age` is INTEGER** - must use `Math.round()` on decimals like 3.5
- **`montree_children` has NO `school_id` column** - only use `classroom_id`
- **Curriculum sequence** - ALWAYS use `/lib/montree/curriculum-loader.ts`, NOT Brain database
- **Focus works stored separately** - `montree_child_focus_works` table, NOT in `montree_child_progress`
- **Area values must match** - Focus table CHECK constraint: 'practical_life', 'sensorial', 'mathematics', 'language', 'cultural' (NOT 'math'!)
- `useSearchParams()` must be wrapped in Suspense boundary (Next.js 16)
- Foreign key: `child_work_completion.child_id` → `children.id` (not montree_children!)
- Progress status mapping in `lib/montree/db.ts` - don't use 'completed'
- Railway rebuilds can take a few minutes
- Next.js can use 6GB+ RAM - kill and restart if machine struggles

## URLs
- **Production**: teacherpotato.xyz
- **Teacher Dashboard**: teacherpotato.xyz/montree
- **Admin**: teacherpotato.xyz/admin

## GitHub
- **Token**: See 1Password or generate new at github.com/settings/tokens (expires May 2, 2026)
- **Repo**: Tredoux555/whale-class
