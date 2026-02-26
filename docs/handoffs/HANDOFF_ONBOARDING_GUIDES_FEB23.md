# Handoff: Onboarding Guides — Build, Fix & Deploy (Feb 23, 2026)

## ⚠️ PRIORITY #0: DEPLOY ALL CHANGES

None of the work from this session is live. Everything below is local-only and needs to be pushed to `main` for Railway to pick it up.

**Files created this session (3 new):**
- `components/montree/onboarding/PrincipalSetupGuide.tsx` — 8-step speech-bubble guide for principal school setup wizard
- `components/montree/onboarding/PrincipalAdminGuide.tsx` — 4-step multi-page guide for principal admin dashboard walkthrough
- `docs/HANDOFF_ONBOARDING_GUIDES_FEB23.md` — this file

**Files modified this session (9):**
- `components/montree/onboarding/WeekViewGuide.tsx` — copy rewrite (all 19 steps), removed wheel picker open, added `onCloseWheelPicker` + `onNavigateHome` props, removed `nav-labels` step, final step navigates to dashboard
- `components/montree/onboarding/StudentFormGuide.tsx` — copy rewrite (all 13 steps)
- `components/montree/DashboardHeader.tsx` — removed 🏷️ label icon from header entirely
- `app/montree/dashboard/page.tsx` — **CRITICAL**: fixed WelcomeModal showing every visit (added localStorage gate), fixed DashboardGuide TEMP force flag (was showing every time, now localStorage-gated)
- `app/montree/dashboard/[childId]/page.tsx` — replaced temp `showWeekViewGuide = true` flag with localStorage check, wired `onCloseWheelPicker` + `onNavigateHome` props
- `app/montree/dashboard/students/page.tsx` — localStorage persistence for StudentFormGuide skip/complete, auto-open bulk form now checks localStorage
- `app/montree/principal/setup/page.tsx` — removed FeatureWrapper/useOnboardingStore, wired PrincipalSetupGuide, simplified step 3 page (removed "What's Next?" section), welcome overlay sessionStorage→localStorage
- `app/montree/admin/page.tsx` — added `data-guide="first-classroom"` + `data-href` on first classroom tile
- `app/montree/admin/classrooms/[classroomId]/page.tsx` — added `data-guide="first-student"` on first student tile
- `app/montree/admin/layout.tsx` — wired PrincipalAdminGuide, reads principal name from localStorage, added `data-guide="nav-guru"` on Guru nav link

---

## What Was Built

### 1. PrincipalSetupGuide (`components/montree/onboarding/PrincipalSetupGuide.tsx`)

8-step speech-bubble guided tour spanning all 3 wizard steps. Same draggable-bubble + GPB pattern as other guides.

| Step | Key | Wizard Phase | What |
|------|-----|-------------|------|
| 0 | welcome-setup | Classrooms | Centered: "Let's set up your school!" |
| 1 | add-classroom | Classrooms | Highlights "+ Add Classroom" button |
| 2 | continue-teachers | Classrooms | Highlights "Continue to Teachers" button |
| 3 | teachers-intro | Teachers | Centered: "Now assign a teacher to each classroom." |
| 4 | teacher-name | Teachers | Highlights first teacher name input |
| 5 | complete-setup | Teachers | Highlights "Complete Setup" button |
| 6 | setup-complete | Success | Highlights success overview — "You're live! Copy these codes..." |
| 7 | go-dashboard | Success | Highlights "Go to Dashboard" — "Let's head to your dashboard — I'll show you around." |

**Key design:**
- `wizardStep` prop syncs guide to wizard state — auto-jumps on phase change
- Step dots scoped per wizard phase
- Back button restricted to current phase
- Removed separate `teacher-codes` step (page handles codes display already)

**Setup page (step 3) simplified:**
- Removed entire "What's Next?" section (was duplicating speech bubble content)
- Success banner trimmed: "N Classrooms Ready!" + "Share these login codes with your teachers"

### 2. PrincipalAdminGuide (`components/montree/onboarding/PrincipalAdminGuide.tsx`) — NEW

Multi-page guide that lives in the admin layout, persists step in localStorage so it survives page navigations. Takes the principal through their dashboard after setup.

| Step | Page | Target | What |
|------|------|--------|------|
| 0 | Admin overview | First classroom tile | "This is an overview of your school. Tap on a classroom to look inside." → Got it navigates to first classroom |
| 1 | Classroom detail | First student tile | "Tap on a student to see their overview and generate a report for the parent." → Got it navigates back to overview |
| 2 | Admin overview | Guru nav tab | "Ask the Guru anything a parent might ask you. It looks through the child's history, progress, and teacher notes..." |
| 3 | Any admin page | Centered | Farewell: "That's it, Principal ___! I left all the technical stuff to the teachers and gave you just what you need..." |

**Key design:**
- Renders via `createPortal` to `document.body` — floats above all page content
- Uses `usePathname()` to detect which admin page is active
- `page` field on each step restricts visibility to correct page (overview/classroom/any)
- Step persisted in `localStorage` key `montree_guide_admin_step` (survives navigation)
- Completion flag: `montree_guide_admin_done`
- `data-href` attribute on first classroom tile provides the navigation URL
- Draggable speech bubbles (same pattern as all other guides)

### 3. Copywriting Rewrite (WeekViewGuide + StudentFormGuide)

Full audit and rewrite of all guide copy across both components.

**WeekViewGuide (19 steps):**
- Removed passive voice, sentence fragments
- "Click" → "Tap" throughout (mobile-first)
- Varied button text: "Let's go!", "Show me!", "Got it!", "Done!"
- Shortened verbose messages

**StudentFormGuide (13 steps):**
- Tightened all messages
- Dynamic `${name}` references preserved

### 4. Bug Fixes

**Wheel picker staying open (WeekViewGuide):**
- Area-badge step had `onAdvance: onOpenWheelPicker` — picker stayed open behind subsequent steps
- Fix: Removed the callback. Added `onCloseWheelPicker` prop.

**Label icon removed from header:**
- Removed 🏷️ Link from `DashboardHeader.tsx`
- Labels still accessible on students page

**Final steps reworked (WeekViewGuide):**
- 20 → 19 steps (removed `nav-labels`)
- `nav-home` is final step with "Done!" button
- Fires `onNavigateHome` → `router.push('/montree/dashboard')`

**WelcomeModal showing every visit:**
- Added `!localStorage.getItem('montree_welcome_done')` check
- Persists on close

**DashboardGuide TEMP force flag:**
- Replaced `if (kids.length > 0)` (was always showing) with proper localStorage + onboarding condition

**Principal welcome using sessionStorage:**
- Changed to localStorage (`montree_principal_welcome_done`)

**Auto-open bulk form on students page:**
- Added localStorage check so it doesn't reopen for returning users

### 5. localStorage Persistence (All Guides)

All guides show once per device. Complete reference:

| Key | Purpose | Component |
|-----|---------|-----------|
| `montree_welcome_done` | WelcomeModal on dashboard | `dashboard/page.tsx` |
| `montree_guide_dashboard_done` | DashboardGuide on dashboard | `dashboard/page.tsx` |
| `montree_guide_weekview_done` | WeekViewGuide on child week view | `[childId]/page.tsx` |
| `montree_guide_studentform_done` | StudentFormGuide + auto-open bulk form | `students/page.tsx` |
| `montree_guide_principal_done` | PrincipalSetupGuide | `principal/setup/page.tsx` |
| `montree_principal_welcome_done` | Principal setup welcome overlay | `principal/setup/page.tsx` |
| `montree_guide_admin_step` | PrincipalAdminGuide current step | `admin/layout.tsx` |
| `montree_guide_admin_done` | PrincipalAdminGuide completed | `admin/layout.tsx` |

---

## data-guide Attributes (Complete Reference)

### Child Week View (`[childId]/page.tsx` + components)
- `focus-section`, `first-work-name`, `quick-guide-btn`, `quick-guide-content`
- `watch-video-btn`, `capture-btn`, `area-badge-first`, `notes-area`, `status-badge-first`

### Child Tabs (`[childId]/layout.tsx`)
- `tab-week`, `tab-progress`, `tab-gallery`, `tab-reports`

### Dashboard Header (`DashboardHeader.tsx`)
- `nav-curriculum`, `nav-guru`, `nav-home`

### Other Components
- `nav-inbox` (InboxButton), `feedback-btn` (FeedbackButton)

### Students Page (`students/page.tsx`)
- `name`, `age`, `gender`, `tenure`, `curriculum-section`, `profile-notes`, `add-another`, `save-all`

### Principal Setup (`principal/setup/page.tsx`)
- `add-classroom-btn`, `continue-teachers-btn`, `teacher-name-first`, `complete-setup-btn`, `setup-overview`, `teacher-codes`, `go-dashboard-btn`

### Principal Admin (`admin/page.tsx`, `admin/layout.tsx`, classroom detail)
- `first-classroom` + `data-href` (first classroom tile on overview)
- `first-student` (first student tile on classroom detail)
- `nav-guru` (Guru tab in admin nav)

---

## Still Pending

- **Run migrations 126, 127, 131** — still not run, blocks homeschool system + Guru billing + onboarding DB tables
- **Cross-pollination security fix** — needs deploy (see `HANDOFF_WEEKVIEW_GUIDE_SECURITY_FEB22.md`)
- **Remaining `verifyChildBelongsToSchool`** routes: `media/upload`, `reports/generate`, `reports/pdf`, `reports/send`, `weekly-planning/*`, `focus-works`
- **Test all guides end-to-end on mobile** after deploy
- **PrincipalAdminGuide classroom detail step** — currently assumes students exist on the page. If classroom has 0 students, step 1 target won't be found and guide will appear stuck. Consider adding a fallback message or auto-advancing.
