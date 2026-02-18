# Handoff: Comprehensive Onboarding System — Plan & Implementation Guide

**Date:** Feb 18, 2026
**Status:** Plan complete, ready for implementation
**Priority:** #1

---

## Context

The onboarding system foundation (Phase 1-2) was built on Feb 17. It includes 3 DB tables, 3 API routes, OnboardingOverlay component, FeatureWrapper component, Zustand store, and type-safe configs. On Feb 18, we deployed fixes (commits `e4593f1`, `6a19977`) that resolved:
1. Stale Railway build (Docker export `context canceled`)
2. WelcomeModal + OnboardingOverlay showing simultaneously

The current onboarding has only **3 shallow steps** for teachers. The user wants **every single feature covered in logical sequence**, skippable but comprehensive. This plan redesigns all 4 role configs with full step sequences.

---

## What Works Today

- OnboardingOverlay renders spotlight + modal correctly
- FeatureWrapper triggers tours on first visit
- Zustand store persists completed steps in localStorage
- WelcomeModal defers to onboarding overlay (no overlap)
- Railway deploys successfully from main branch
- 3-step teacher tour works end-to-end (but too shallow)

## What Needs to Change

1. **`lib/montree/onboarding/configs.ts`** — Rewrite with comprehensive step sequences (currently ~7 steps total → targeting ~50-60 steps for teachers)
2. **~20 page files** — Add `data-tutorial` attributes to all interactive elements
3. **`components/montree/onboarding/OnboardingOverlay.tsx`** — May need UI enhancements (skip module button, progress indicator, module grouping)
4. **`components/montree/onboarding/FeatureWrapper.tsx`** — May need cross-page navigation support
5. **`app/montree/dashboard/page.tsx`** — Already has FeatureWrapper, needs more data-tutorial attrs
6. **WelcomeModal** — Should set `has_completed_tutorial` DB flag on dismiss (currently doesn't)

---

## Comprehensive Teacher Onboarding Flow

### Module 1: Getting Started (Dashboard) — 5 steps
**Prerequisites:** None (first module after WelcomeModal dismissed)
**Page:** `/montree/dashboard`

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `dashboard_welcome` | Welcome to Your Classroom | This is your dashboard — the heart of your classroom. Let's set it up! | `[data-tutorial="student-grid"]` | bottom | none |
| 2 | `dashboard_header_curriculum` | Curriculum Browser | This takes you to your curriculum — all 5 Montessori areas. We'll explore it soon. | `[data-tutorial="curriculum-link"]` | bottom | none |
| 3 | `dashboard_header_guru` | AI Teaching Advisor | Got a question about a student? Ask the Guru — your personal AI advisor. | `[data-tutorial="guru-link"]` | bottom | none |
| 4 | `dashboard_header_inbox` | Messages & Reports | Parents can message you here. You'll also find weekly reports. | `[data-tutorial="inbox-button"]` | bottom | none |
| 5 | `dashboard_add_student` | Add Your First Student | Let's add a student! Click this button to get started. | `[data-tutorial="add-student-button"]` | left | click |

### Module 2: Student Setup — 8 steps
**Prerequisites:** `getting_started`
**Page:** `/montree/dashboard/students` (or inline add form on dashboard)

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `student_form_intro` | Student Details | Enter your student's name, age, and gender. Each student gets a personalized curriculum. | `[data-tutorial="student-form"]` | right | none |
| 2 | `student_name_input` | Student Name | Type your student's name here. | `[data-tutorial="student-name-input"]` | bottom | none |
| 3 | `student_age_select` | Age Selection | Select their age — this determines which curriculum works appear. | `[data-tutorial="student-age-select"]` | bottom | none |
| 4 | `student_tenure_select` | Program Tenure | How long has this student been in a Montessori program? This helps us place them accurately. | `[data-tutorial="student-tenure-select"]` | bottom | none |
| 5 | `student_curriculum_picker` | Starting Point | For each area, select the work your student is currently on. Everything before it will be marked as mastered. | `[data-tutorial="curriculum-picker"]` | top | none |
| 6 | `student_curriculum_area_demo` | Pick a Starting Work | Tap an area dropdown and select the last work your student has mastered. All earlier works get auto-mastered. | `[data-tutorial="curriculum-picker-dropdown"]` | bottom | none |
| 7 | `student_save` | Save Student | When you're ready, tap Save to add the student to your classroom. | `[data-tutorial="student-save-button"]` | top | none |
| 8 | `student_done` | Student Added! | Great job! Your student is now in your classroom. Let's go see their week view. | `[data-tutorial="student-card"]:first-child` | bottom | click |

### Module 3: Child Week View — 15 steps
**Prerequisites:** `student_setup`
**Page:** `/montree/dashboard/[childId]`

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `week_overview` | Your Student's Week | This is the weekly view — it shows one focus work per Montessori area. | `[data-tutorial="focus-section"]` | bottom | none |
| 2 | `week_area_badge` | Area Icons | Each colored circle represents a Montessori area. Tap it to browse all works in that area. | `[data-tutorial="area-badge-first"]` | right | none |
| 3 | `week_open_wheel` | The Wheel Picker | Try tapping the area icon now — it opens the Wheel Picker where you can change the focus work. | `[data-tutorial="area-badge-first"]` | right | click |
| 4 | `week_wheel_picker_intro` | Browse & Select | Scroll through works in this area. Tap any work to make it the new focus. | `[data-tutorial="wheel-picker-modal"]` | bottom | none |
| 5 | `week_wheel_close` | Close the Picker | Great! Close the picker when you're done — tap outside or press the X. | `[data-tutorial="wheel-picker-close"]` | bottom | manual |
| 6 | `week_status_badge` | Status Tracking | This badge shows the work's status. Tap it to cycle through: Not Started → Presented → Practicing → Mastered. | `[data-tutorial="status-badge-first"]` | left | none |
| 7 | `week_status_cycle` | Try Changing Status | Go ahead — tap the status badge to advance it! Each tap moves to the next stage. | `[data-tutorial="status-badge-first"]` | left | click |
| 8 | `week_expand_work` | Expand a Work | Tap the work name or the arrow to expand it. You'll see quick actions and notes. | `[data-tutorial="expand-arrow-first"]` | left | click |
| 9 | `week_quick_guide` | Quick Guide | This opens a detailed guide for the work — materials needed, presentation steps, and tips. | `[data-tutorial="quick-guide-button"]` | bottom | none |
| 10 | `week_capture_shortcut` | Quick Capture | Take a photo of this work in action — it links directly to this child and work. | `[data-tutorial="capture-shortcut-button"]` | bottom | none |
| 11 | `week_notes` | Teacher Notes | Add observations about the student's progress. These are saved per work and show up in reports. | `[data-tutorial="notes-textarea"]` | top | none |
| 12 | `week_add_work` | Add Extra Works | Need to track an additional work? Tap "Add Work" to add extras alongside the focus works. | `[data-tutorial="add-work-button"]` | left | none |
| 13 | `week_search_bar` | Search Works | Use the search bar to quickly find any work across all areas. | `[data-tutorial="work-search-bar"]` | bottom | none |
| 14 | `week_invite_parent` | Invite a Parent | Share a parent access code so parents can view their child's progress from home. | `[data-tutorial="invite-parent-button"]` | bottom | none |
| 15 | `week_done` | Week View Complete! | You've mastered the weekly view! This is where you'll spend most of your time. Let's explore the curriculum next. | `[data-tutorial="focus-section"]` | bottom | none |

### Module 4: Curriculum Management — 8 steps
**Prerequisites:** `week_view`
**Page:** `/montree/dashboard/curriculum`

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `curriculum_intro` | Your Curriculum | Here you can see all works organized by Montessori area. Each area has its own tab. | `[data-tutorial="area-tabs"]` | bottom | none |
| 2 | `curriculum_area_select` | Switch Areas | Tap any area tab to see its works. Try it! | `[data-tutorial="area-tab-first"]` | bottom | click |
| 3 | `curriculum_work_list` | Work List | Each work is listed in the recommended sequence. Tap one to see its details. | `[data-tutorial="curriculum-work-list"]` | bottom | none |
| 4 | `curriculum_add_work` | Add a Work | You can add your own custom works to any area. Great for enrichment activities! | `[data-tutorial="curriculum-add-button"]` | left | none |
| 5 | `curriculum_edit_work` | Edit Works | Tap the edit icon to modify a work's name, description, or materials list. | `[data-tutorial="curriculum-edit-button"]` | left | none |
| 6 | `curriculum_reorder` | Drag to Reorder | Hold and drag works to rearrange the sequence. The order determines the learning progression. | `[data-tutorial="curriculum-drag-handle"]` | right | none |
| 7 | `curriculum_teaching_tools` | Teaching Tools | Access card generators, flashcards, and printable materials for your works. | `[data-tutorial="teaching-tools-section"]` | bottom | none |
| 8 | `curriculum_browse_guide` | Full Browse Guide | For a detailed view of every work with materials, aims, and demo videos — tap Browse Guide. | `[data-tutorial="browse-guide-link"]` | bottom | none |

### Module 5: Photo & Video Capture — 5 steps
**Prerequisites:** `week_view`
**Page:** `/montree/dashboard/capture`

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `capture_intro` | Capture Moments | Document your students' work with photos and videos. They show up in reports and portfolios. | `[data-tutorial="capture-page"]` | bottom | none |
| 2 | `capture_child_select` | Select a Child | Choose which child you're capturing. You can also select multiple children for group photos. | `[data-tutorial="capture-child-selector"]` | bottom | none |
| 3 | `capture_group_mode` | Group Photos | Toggle group mode to tag multiple children in one photo — great for collaborative work! | `[data-tutorial="capture-group-toggle"]` | bottom | none |
| 4 | `capture_camera` | Take a Photo | Tap the camera button to take a photo, or switch to video mode for recordings. | `[data-tutorial="capture-camera-button"]` | bottom | none |
| 5 | `capture_done` | You're All Set! | Photos are automatically linked to each child's portfolio and appear in parent reports. | `[data-tutorial="capture-page"]` | bottom | none |

### Module 6: AI Teaching Advisor (Guru) — 5 steps
**Prerequisites:** `student_setup`
**Page:** `/montree/dashboard/guru`

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `guru_intro` | Meet the Guru | Your AI teaching advisor — ask questions about child development, Montessori methods, or specific students. | `[data-tutorial="guru-page"]` | bottom | none |
| 2 | `guru_child_select` | Select a Child | Choose a student to get personalized advice based on their progress and observations. | `[data-tutorial="guru-child-selector"]` | bottom | none |
| 3 | `guru_question` | Ask a Question | Type your question here. Try something like "What should I present next?" or "How do I help with concentration?" | `[data-tutorial="guru-question-input"]` | bottom | none |
| 4 | `guru_response` | AI Response | The Guru analyzes your student's data and gives actionable advice with timelines and next steps. | `[data-tutorial="guru-response-area"]` | top | none |
| 5 | `guru_history` | Past Conversations | Review previous advice anytime. Your conversation history is saved per student. | `[data-tutorial="guru-history-button"]` | bottom | none |

### Module 7: Progress & Reports — 4 steps
**Prerequisites:** `week_view`
**Page:** `/montree/dashboard/[childId]/progress`

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `progress_intro` | Progress Portfolio | See your student's journey — mastery stats, area breakdown, photos, and timeline. | `[data-tutorial="progress-page"]` | bottom | none |
| 2 | `progress_stats` | At a Glance | These numbers show how many works are mastered, practicing, and presented. | `[data-tutorial="progress-hero-stats"]` | bottom | none |
| 3 | `progress_area_bars` | Area Progress | Tap any area bar to filter the timeline below. See exactly where each student stands. | `[data-tutorial="progress-area-bars"]` | bottom | none |
| 4 | `progress_timeline` | Activity Timeline | Every status change, note, and observation is logged here — grouped by month. | `[data-tutorial="progress-timeline"]` | top | none |

**TOTAL: 7 modules, ~50 steps**

---

## Principal Onboarding Flow

### Module 1: School Setup — 4 steps
**Page:** `/montree/principal/setup`

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `principal_welcome` | Welcome, Principal! | Let's set up your school. First, we'll create classrooms, then add teachers. | `[data-tutorial="setup-page"]` | bottom | none |
| 2 | `principal_create_classroom` | Create a Classroom | Name your first classroom — teachers will be assigned to classrooms. | `[data-tutorial="create-classroom-button"]` | bottom | click |
| 3 | `principal_add_teacher` | Add Teachers | Generate login codes for your teachers. They'll use these to sign in and access their classroom. | `[data-tutorial="add-teacher-button"]` | bottom | click |
| 4 | `principal_share_codes` | Share Login Codes | Copy these codes and share them with your teachers. Each code is unique and single-use. | `[data-tutorial="teacher-codes-display"]` | bottom | none |

### Module 2: School Overview — 3 steps
**Page:** `/montree/principal/dashboard` (or overview section)

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `principal_overview` | School Dashboard | See all your classrooms and teachers at a glance. | `[data-tutorial="overview-section"]` | bottom | none |
| 2 | `principal_classroom_cards` | Classroom Cards | Each card shows student count, teacher, and recent activity. Tap to view details. | `[data-tutorial="classroom-card-first"]` | bottom | none |
| 3 | `principal_done` | You're Ready! | Your school is set up. Teachers can now log in and start tracking students. | `[data-tutorial="overview-section"]` | bottom | none |

**TOTAL: 2 modules, ~7 steps**

---

## Homeschool Parent Onboarding Flow

Same as Teacher flow with automatic label swaps:
- "Student" → "Child", "students" → "children"
- "Classroom" → "Home", "classroom" → "home"
- Hide `week_invite_parent` step (no parent invite for homeschool)
- Add Guru freemium awareness step in Module 6

**TOTAL: 7 modules, ~49 steps (teacher steps minus invite parent)**

---

## Parent Onboarding Flow

### Module 1: Dashboard Overview — 4 steps
**Page:** `/montree/parent/dashboard`

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `parent_welcome` | Welcome! | See your child's Montessori journey — focus works, progress, and photos. | `[data-tutorial="parent-dashboard"]` | bottom | none |
| 2 | `parent_current_works` | Current Focus | These are the works your child is practicing this week across 5 Montessori areas. | `[data-tutorial="parent-focus-works"]` | bottom | none |
| 3 | `parent_stats` | Progress at a Glance | Quick stats showing mastered works, current area focus, and recent milestones. | `[data-tutorial="parent-stats"]` | bottom | none |
| 4 | `parent_child_select` | Switch Children | If you have multiple children enrolled, switch between them here. | `[data-tutorial="parent-child-selector"]` | bottom | none |

### Module 2: Photos & Reports — 4 steps
**Page:** `/montree/parent/photos` and `/montree/parent/milestones`

| # | Key | Title | Description | Target Selector | Position | Action |
|---|-----|-------|-------------|-----------------|----------|--------|
| 1 | `parent_photos` | Photo Gallery | Browse photos and videos of your child at work, captured by their teacher. | `[data-tutorial="photos-link"]` | bottom | click |
| 2 | `parent_photo_gallery` | View Photos | Tap any photo to see it full-size. Photos are tagged with the work and date. | `[data-tutorial="photo-gallery"]` | bottom | none |
| 3 | `parent_milestones` | Milestones | A timeline of your child's achievements — every mastered work celebrated here. | `[data-tutorial="milestones-link"]` | bottom | click |
| 4 | `parent_messages` | Messages | Send messages to your child's teacher and receive weekly reports. | `[data-tutorial="parent-messages-link"]` | bottom | none |

**TOTAL: 2 modules, ~8 steps**

---

## Implementation Steps

### Step 1: Update configs.ts (~200 lines → ~500 lines)
Rewrite `lib/montree/onboarding/configs.ts` with all the step sequences above.

### Step 2: Add data-tutorial attributes (~20 files)

**Dashboard page** (`app/montree/dashboard/page.tsx`):
- `data-tutorial="student-grid"` ✅ Already exists
- `data-tutorial="add-student-button"` ✅ Already exists (in students page)

**Dashboard Header** (`components/montree/DashboardHeader.tsx`):
- `data-tutorial="curriculum-link"` ✅ Already exists
- `data-tutorial="guru-link"` ✅ Already exists
- `data-tutorial="inbox-button"` ✅ Already exists

**Child Week View** (`app/montree/dashboard/[childId]/page.tsx`):
- `data-tutorial="focus-section"` ✅ Already exists
- `data-tutorial="add-work-button"` ✅ Already exists
- ADD: `data-tutorial="area-badge-first"` on first AreaBadge button
- ADD: `data-tutorial="status-badge-first"` on first status button
- ADD: `data-tutorial="expand-arrow-first"` on first expand arrow
- ADD: `data-tutorial="work-search-bar"` on WorkSearchBar
- ADD: `data-tutorial="invite-parent-button"` on invite parent button
- ADD: `data-tutorial="wheel-picker-modal"` on WheelPicker container
- ADD: `data-tutorial="wheel-picker-close"` on WheelPicker close button

**FocusWorksSection** (`components/montree/child/FocusWorksSection.tsx`):
- ADD: `data-tutorial="quick-guide-button"` on Quick Guide button
- ADD: `data-tutorial="capture-shortcut-button"` on Capture button
- ADD: `data-tutorial="notes-textarea"` on notes textarea

**Curriculum page** (`app/montree/dashboard/curriculum/page.tsx`):
- ADD: `data-tutorial="area-tabs"` on area tab container
- ADD: `data-tutorial="area-tab-first"` on first area tab
- ADD: `data-tutorial="curriculum-work-list"` on work list container
- ADD: `data-tutorial="curriculum-add-button"` on Add Work button
- ADD: `data-tutorial="curriculum-edit-button"` on first edit button
- ADD: `data-tutorial="curriculum-drag-handle"` on first drag handle
- ADD: `data-tutorial="teaching-tools-section"` on Teaching Tools
- ADD: `data-tutorial="browse-guide-link"` on Browse Guide button

**Capture page** (`app/montree/dashboard/capture/page.tsx`):
- ADD: `data-tutorial="capture-page"` on main container
- ADD: `data-tutorial="capture-child-selector"` on child selector
- ADD: `data-tutorial="capture-group-toggle"` on group mode toggle
- ADD: `data-tutorial="capture-camera-button"` on camera button

**Guru page** (`app/montree/dashboard/guru/page.tsx`):
- ADD: `data-tutorial="guru-page"` on main container
- ADD: `data-tutorial="guru-child-selector"` on child dropdown
- ADD: `data-tutorial="guru-question-input"` on question textarea
- ADD: `data-tutorial="guru-response-area"` on response display
- ADD: `data-tutorial="guru-history-button"` on history toggle

**Students page** (`app/montree/dashboard/students/page.tsx`):
- `data-tutorial="student-form"` ✅ Already exists
- `data-tutorial="add-student-button"` ✅ Already exists
- ADD: `data-tutorial="student-name-input"` on name input
- ADD: `data-tutorial="student-age-select"` on age dropdown
- ADD: `data-tutorial="student-tenure-select"` on tenure dropdown
- ADD: `data-tutorial="curriculum-picker"` on curriculum picker section
- ADD: `data-tutorial="curriculum-picker-dropdown"` on first area dropdown
- ADD: `data-tutorial="student-save-button"` on save button
- ADD: `data-tutorial="student-card"` ✅ Already exists (used in step target)

**Progress page** (`app/montree/dashboard/[childId]/progress/page.tsx`):
- ADD: `data-tutorial="progress-page"` on main container
- ADD: `data-tutorial="progress-hero-stats"` on hero stats section
- ADD: `data-tutorial="progress-area-bars"` on area progress bars
- ADD: `data-tutorial="progress-timeline"` on timeline section

**Principal setup** (`app/montree/principal/setup/page.tsx`):
- `data-tutorial="create-classroom-button"` ✅ Already exists
- `data-tutorial="add-teacher-button"` ✅ Already exists
- ADD: `data-tutorial="setup-page"` on main container
- ADD: `data-tutorial="teacher-codes-display"` on codes display
- ADD: `data-tutorial="overview-section"` ✅ Already exists

**Parent dashboard** (`app/montree/parent/dashboard/page.tsx`):
- `data-tutorial="parent-dashboard"` ✅ Already exists
- ADD: `data-tutorial="parent-focus-works"` on current works section
- ADD: `data-tutorial="parent-stats"` on stats section
- ADD: `data-tutorial="parent-child-selector"` on child selector

**Parent photos** (`app/montree/parent/photos/page.tsx`):
- `data-tutorial="photos-link"` ✅ Already exists (in parent dashboard)
- ADD: `data-tutorial="photo-gallery"` on gallery container

**Parent milestones/messages:**
- ADD: `data-tutorial="milestones-link"` on milestones nav link
- ADD: `data-tutorial="parent-messages-link"` on messages nav link

### Step 3: Add FeatureWrapper to pages that lack it
- Progress page needs FeatureWrapper wrapping
- Parent photos/milestones pages need FeatureWrapper
- Ensure each FeatureWrapper has correct `featureModule` prop matching configs

### Step 4: OnboardingOverlay enhancements
- Add "Skip This Module" button (skips to next module)
- Add "Skip All Tutorials" button (dismisses everything)
- Add module progress indicator (e.g., "Student Setup 3/8")
- Consider adding a module menu (show all modules, completed state)

### Step 5: Fix WelcomeModal DB flag
- After WelcomeModal dismissal, call API to set `has_completed_tutorial = true`
- This prevents WelcomeModal from showing again on page reload

### Step 6: Cross-page navigation
- Some modules span multiple pages (e.g., Module 2 starts on dashboard, continues on students page)
- FeatureWrapper should detect when a module's next step is on a different page and show "Let's go to [page]" instead of trying to spotlight a missing element
- OR: Design modules to be page-scoped (each page has its own module)

### Step 7: Test all 4 flows
- Create fresh accounts for each role
- Walk through every step
- Verify localStorage persistence
- Verify skip functionality
- Verify no duplicate tours on reload

---

## Files to Modify (Summary)

| File | Changes |
|------|---------|
| `lib/montree/onboarding/configs.ts` | Complete rewrite — all 4 role configs |
| `app/montree/dashboard/[childId]/page.tsx` | ~7 new data-tutorial attributes |
| `components/montree/child/FocusWorksSection.tsx` | ~3 new data-tutorial attributes |
| `app/montree/dashboard/curriculum/page.tsx` | ~8 new data-tutorial attributes |
| `app/montree/dashboard/capture/page.tsx` | ~4 new data-tutorial attributes |
| `app/montree/dashboard/guru/page.tsx` | ~5 new data-tutorial attributes |
| `app/montree/dashboard/students/page.tsx` | ~6 new data-tutorial attributes |
| `app/montree/dashboard/[childId]/progress/page.tsx` | ~4 new data-tutorial attributes + FeatureWrapper |
| `app/montree/principal/setup/page.tsx` | ~2 new data-tutorial attributes |
| `app/montree/parent/dashboard/page.tsx` | ~3 new data-tutorial attributes |
| `app/montree/parent/photos/page.tsx` | ~1 new data-tutorial attribute |
| `components/montree/onboarding/OnboardingOverlay.tsx` | Skip buttons, progress indicator |
| `components/montree/onboarding/FeatureWrapper.tsx` | Cross-page navigation support |
| `app/montree/dashboard/page.tsx` | WelcomeModal DB flag fix |

---

## Estimated Effort

| Task | Time |
|------|------|
| Rewrite configs.ts | 1 hour |
| Add data-tutorial attributes (~20 files) | 1.5 hours |
| OnboardingOverlay enhancements | 1 hour |
| FeatureWrapper cross-page support | 30 min |
| WelcomeModal DB fix | 15 min |
| Testing all 4 flows | 1 hour |
| **Total** | **~5 hours** |

---

## Key Decisions Made

1. **Module-per-feature approach** — Each major feature (week view, curriculum, capture, guru) gets its own module that can be skipped independently
2. **Page-scoped modules preferred** — Steps within a module stay on one page where possible, to avoid complex cross-page navigation
3. **~50 steps for teachers** — Comprehensive but each step is brief (1-2 sentences). Skip button always visible.
4. **Homeschool parent derives from teacher** — Same flow with label swaps, minus invite parent step
5. **Parent flow is simple** — Only 8 steps covering view-only features
6. **Principal flow is focused** — Only setup and overview (7 steps)

---

## Previous Session Context

- Railway project: "happy-flow", service: "whale-class"
- GitHub repo: `Tredoux555/whale-class`
- Commits pushed this session: `e4593f1` (rebuild trigger), `6a19977` (WelcomeModal fix)
- Migration 131 needs to be run: `psql $DATABASE_URL -f migrations/131_onboarding_system.sql`
- PAT for pushing: ask user (stored in chat, not in files)
