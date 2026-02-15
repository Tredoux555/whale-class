# Montree Home — Phase 2 Handoff: Dashboard Role-Based Trimming

**Date:** February 15, 2026
**Commit:** `fc1521ef`
**Status:** ✅ COMPLETE

## What Was Done

Phase 2 adds role-based UI trimming so homeschool parents see a clean, parent-appropriate interface. The existing dashboard works identically — we just swap labels and hide school-specific features.

### Changes Made (6 files)

#### 1. `lib/montree/auth.ts` — New helper
- Added `isHomeschoolParent(session?)` — checks `teacher.role === 'homeschool_parent'`
- Accepts optional session param or reads from localStorage

#### 2. `app/montree/dashboard/page.tsx` — Main dashboard
- "N students" → "N children" for homeschool parents
- Empty state: "Tap to add your first child" vs "first student"

#### 3. `app/montree/dashboard/[childId]/page.tsx` — Child week view
- **Invite Parent button + modal HIDDEN** for homeschool parents (they ARE the parent)
- Wrapped in `{!isHomeschoolParent(session) && (<>...</>)}`

#### 4. `app/montree/dashboard/students/page.tsx` — Student management
- Header: "Children" vs "Students"
- **Labels button HIDDEN** for homeschool parents (classroom-specific feature)
- "+ Add Child" vs "+ Add Student"
- Empty state: "No children added yet" vs "No students in this classroom yet"
- Form header: "Add New Child" / "Edit Child" vs Student
- "Time in Program" vs "Time at School" label

#### 5. `app/montree/onboarding/page.tsx` — Onboarding flow
- Step 0: "Enter My Home →" vs "Enter My Classroom →"
- Step 0: "Add your children" vs "Add students"
- Step 1: "Add Your Children" vs "Add Your Students"
- Form: "Child's name" placeholder, "New Child" header
- Buttons: "+ Add Child", "✓ Update Child"
- List header: "Children Added" vs "Students Added"
- Save button: "Save N Children" vs "Save N Students"
- Success messages: "frees you to focus on your child" / "beautiful record of your homeschool journey"

#### 6. `app/api/montree/auth/teacher/route.ts` — CRITICAL FIX
- Teacher auth response now includes `role` in the teacher object
- Without this, returning homeschool parents logging in would have no role in their session
- All role-based UI trimming would silently fail

## What Was NOT Changed (intentionally)

These features work identically for both roles — no changes needed:

- **DashboardHeader** — Logo, inbox, curriculum, guru, print, logout (all role-agnostic)
- **Tab bar** — Week, Progress, Gallery, Reports (all relevant for parents)
- **Curriculum page** — 5 areas, teaching tools, drag-reorder (parents manage curriculum too)
- **Settings page** — Profile, quick access, sign out (generic enough)
- **Guru advisor** — AI help (will be paywalled in Phase 3)
- **Photo capture** — Parents take photos of their children's work
- **All work management** — Focus works, extras, wheel picker, status cycling

## Architecture Principle

Same as Phase 1: **NO separate components, NO separate routes, NO separate pages.** Just `isHomeschoolParent()` checks on specific UI elements. The dashboard IS the same dashboard — we just swap a few labels.

## Phase 3 Preview — Guru & Freemium

Next phase adds:
1. Onboarding flow (age/space/budget → curriculum recommendations)
2. Guru chat with 3 free prompts for new signups
3. Freemium gate — hard paywall after 3 prompts
4. Stripe billing ($5/child/month)
