# Onboarding System — Full Implementation Handoff

**Date:** February 17, 2026
**Priority:** #1 next session
**Status:** Foundation audited & fixed ✅ → Integration ready (Phase 3-5)
**Estimated Time:** 3-4 hours for full integration + testing

---

## TL;DR — What to Do

1. Run migration 131 against Supabase
2. Add onboarding state initialization to `dashboard/layout.tsx`
3. Add `data-tutorial` attributes to ~15 pages
4. Wrap key pages with `<FeatureWrapper>`
5. Test all 4 user flows
6. Push to main

---

## What Already Exists (Phase 1-2 — DONE + AUDITED)

### Database (migration NOT yet run)

**File:** `migrations/131_onboarding_system.sql`

3 tables:
- `montree_onboarding_progress` — One row per completed step (UNIQUE on user_id + user_type + feature_module + step_key). CHECK constraint includes all 4 roles: teacher, principal, parent, homeschool_parent.
- `montree_onboarding_settings` — Singleton row (fixed UUID `00000000-...0001`). 4 boolean toggles: `enabled_for_teachers`, `enabled_for_principals`, `enabled_for_parents`, `enabled_for_homeschool_parents`.
- `montree_onboarding_events` — Insert-only analytics log (step_started, step_completed, step_skipped, tour_dismissed).

**Run with:** `psql $DATABASE_URL -f migrations/131_onboarding_system.sql`

### API Routes (3 endpoints)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/montree/onboarding/settings` | GET | None | Fetch toggle state |
| `/api/montree/onboarding/settings` | PATCH | `x-super-admin-password` header (timing-safe) | Update toggles |
| `/api/montree/onboarding/progress` | GET | `montree-auth` cookie (JWT) | Fetch user's completed steps |
| `/api/montree/onboarding/progress` | POST | `montree-auth` cookie (JWT) | Mark step complete |
| `/api/montree/onboarding/skip` | POST | `montree-auth` cookie (JWT) | Skip entire module |

All routes follow existing patterns:
- `verifySchoolRequest()` with `instanceof NextResponse` check
- `verifySuperAdminPassword()` timing-safe compare (Phase 9 pattern)
- Upsert with explicit `onConflict` constraint
- No raw `error.message` in responses (Phase 9 pattern)
- Analytics events are fire-and-forget (don't block response)

### React Components (2)

**`components/montree/onboarding/OnboardingOverlay.tsx`**
- SVG mask spotlight cutout over target element
- Positioned highlight ring (emerald glow) around target
- Modal with step title, description, progress badge, Skip/Next buttons
- ESC key to dismiss, click backdrop to dismiss
- Scroll/resize listeners to re-measure target position
- Viewport clamping (modal stays on-screen)
- `dangerouslySetInnerHTML` for animation keyframe (works in App Router)

**`components/montree/onboarding/FeatureWrapper.tsx`**
- Wraps any page, auto-starts tour if module not completed/skipped
- `dismissedRef` prevents re-triggering after dismiss in same session
- Derives `isActive` from Zustand store's `currentModule`
- Props: `featureModule` (string), `autoStart` (boolean), `children`

### State Management

**`hooks/useOnboarding.ts`** — Zustand store with localStorage persistence

Key methods:
- `initialize(role, enabled)` — Set user role + toggle state
- `loadProgressFromDB(progress)` — Hydrate completed steps from server
- `startModule(moduleId)` — Start tour (finds first incomplete step, skips if already completed/skipped)
- `advanceStep()` — Mark current step done (DB + local), advance or complete module
- `skipTour()` — Mark module skipped (DB + local), `__module_skipped__` sentinel
- `dismissTour()` — Close without marking (tour reappears on next visit)
- `getModuleProgress(moduleId)` — Returns `{ completed, skipped, stepsCompleted, totalSteps }`

Convenience hook `useOnboarding()` adds computed `currentStep` with step details.

### Config Definitions

**`lib/montree/onboarding/configs.ts`** — Type-safe step definitions for all roles

| Role | Modules | Steps |
|------|---------|-------|
| Teacher | 5 (student_management, week_view, curriculum, photo_capture, guru) | ~8 steps |
| Principal | 3 (classroom_setup, teacher_management, school_overview) | ~3 steps |
| Homeschool Parent | Auto-derived from Teacher (Student→Child, Classroom→Home) | ~8 steps |
| Parent | 2 (dashboard_overview, reports_photos) | ~2 steps |

`getOnboardingConfig(role)` returns config by role. Safe fallback for unknown roles (empty config, console warning).

### Super-Admin Toggle UI

Added to `app/montree/super-admin/page.tsx`:
- 4 checkboxes (Teachers, Principals, Homeschool Parents, Parents)
- PATCH to `/api/montree/onboarding/settings` with `x-super-admin-password` header
- Immediate feedback via toast

---

## Audit Fixes Applied (Feb 17 — Opus)

7 issues found and fixed by Opus audit of Sonnet's work:

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | CRITICAL | Settings PATCH used plaintext `!==` (regressed Phase 9 timing-safe) | → `verifySuperAdminPassword()` |
| 2 | CRITICAL | `verifySchoolRequest()` return type wrong (`.isValid` doesn't exist) | → `instanceof NextResponse` check |
| 3 | HIGH | Migration CHECK missing `homeschool_parent` role | → Added to CHECK constraint |
| 4 | HIGH | Settings PATCH mass-assignment (`...updates` spread entire body) | → Whitelisted 4 boolean fields only |
| 5 | MEDIUM | Upsert missing `onConflict` (created dupes instead of upserting) | → Added `onConflict: 'user_id,user_type,feature_module,step_key'` |
| 6 | MEDIUM | `style jsx global` doesn't work in App Router | → `dangerouslySetInnerHTML`, removed broken Arrow SVG, added ESC/scroll/resize/viewport-clamping |
| 7 | LOW | `getOnboardingConfig()` threw on unknown role (crashes render) | → Safe fallback with empty config |

Additional improvements: `loadProgressFromDB()` method, `startModule()` resumes at first incomplete step, `skipTour()` marks skipped in local state too, `dismissedRef` in FeatureWrapper, fire-and-forget analytics, input validation on POST routes, proper TypeScript typing on persist merge.

---

## Phase 3-5 Implementation Guide

### Step 1: Run Migration

```bash
psql $DATABASE_URL -f migrations/131_onboarding_system.sql
```

Verify:
```sql
SELECT * FROM montree_onboarding_settings;
-- Should return 1 row with all enabled flags = true
```

### Step 2: Add Onboarding Init to Dashboard Layout

**File:** `app/montree/dashboard/layout.tsx`

This is where the Zustand store gets hydrated with the user's role, toggle state, and DB progress. Currently only renders header + children + feedback button (18 lines).

```tsx
'use client';

import { useEffect } from 'react';
import DashboardHeader from '@/components/montree/DashboardHeader';
import FeedbackButton from '@/components/montree/FeedbackButton';
import { useOnboardingStore } from '@/hooks/useOnboarding';
import { getSession } from '@/lib/montree/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { initialize, loadProgressFromDB } = useOnboardingStore();

  useEffect(() => {
    const sess = getSession();
    if (!sess?.teacher?.id) return;

    const role = sess.teacher.role || 'teacher';

    // Fetch settings + progress in parallel
    Promise.all([
      fetch('/api/montree/onboarding/settings').then(r => r.json()),
      fetch('/api/montree/onboarding/progress').then(r => r.json()),
    ]).then(([settings, progressData]) => {
      const enabledField = role === 'homeschool_parent'
        ? 'enabled_for_homeschool_parents'
        : `enabled_for_${role}s`;
      const enabled = settings?.[enabledField] ?? false;

      initialize(role, enabled);

      if (progressData?.progress) {
        loadProgressFromDB(progressData.progress);
      }
    }).catch(() => {
      // Silently fail — onboarding just won't start
    });
  }, [initialize, loadProgressFromDB]);

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      {children}
      <div className="print:hidden">
        <FeedbackButton />
      </div>
    </div>
  );
}
```

### Step 3: Add `data-tutorial` Attributes to Pages

These are the CSS selectors that `OnboardingOverlay` uses to find and highlight target elements. Each attribute matches a `targetSelector` in the configs.

#### Dashboard (`app/montree/dashboard/page.tsx`)

| Attribute | Element |
|-----------|---------|
| `data-tutorial="student-grid"` | The `<main>` grid container |
| `data-tutorial="add-student-button"` | The "Tap to add your first student" Link (empty state) |
| `data-tutorial="student-card"` | Each child card Link |

Example:
```tsx
// Before
<main className="max-w-6xl mx-auto px-4 py-8">
// After
<main className="max-w-6xl mx-auto px-4 py-8" data-tutorial="student-grid">
```

#### Child Week View (`app/montree/dashboard/[childId]/page.tsx`)

| Attribute | Element |
|-----------|---------|
| `data-tutorial="focus-section"` | Focus Works section container |
| `data-tutorial="add-work-button"` | The "+ Add Work" button |

#### DashboardHeader (`components/montree/DashboardHeader.tsx`)

| Attribute | Element |
|-----------|---------|
| `data-tutorial="curriculum-link"` | 📚 Curriculum Link |
| `data-tutorial="guru-link"` | 🧠 Guru Link |

These are persistent across all dashboard pages — perfect for pointing users to features from any page.

#### Curriculum (`app/montree/dashboard/curriculum/page.tsx`)

| Attribute | Element |
|-----------|---------|
| `data-tutorial="area-cards"` | The 5 area card grid container |

#### Capture (`app/montree/dashboard/capture/page.tsx`)

| Attribute | Element |
|-----------|---------|
| `data-tutorial="capture-link"` | Camera/capture section container |

#### Guru (`app/montree/dashboard/guru/page.tsx`)

| Attribute | Element |
|-----------|---------|
| `data-tutorial="guru-link"` | Question input area or main container |

#### Students (`app/montree/dashboard/students/page.tsx`)

| Attribute | Element |
|-----------|---------|
| `data-tutorial="student-form"` | The add student form area |

#### Principal Setup (`app/montree/principal/setup/page.tsx`)

| Attribute | Element |
|-----------|---------|
| `data-tutorial="create-classroom-button"` | Add Classroom button |
| `data-tutorial="add-teacher-button"` | Add Teacher button |
| `data-tutorial="overview-section"` | Success screen / overview |

#### Parent Dashboard (`app/montree/parent/dashboard/page.tsx`)

| Attribute | Element |
|-----------|---------|
| `data-tutorial="parent-dashboard"` | Main content area |
| `data-tutorial="photos-link"` | Photos gallery link/section |

### Step 4: Wrap Pages with FeatureWrapper

Wrap each page's return JSX with `<FeatureWrapper>`. Only add `autoStart` where it makes sense.

**Dashboard (student_management):**
```tsx
import FeatureWrapper from '@/components/montree/onboarding/FeatureWrapper';

// In the return:
<FeatureWrapper featureModule="student_management" autoStart={children.length === 0}>
  <div className="min-h-screen ...">
    {/* existing JSX */}
  </div>
</FeatureWrapper>
```

**Week View (week_view):**
```tsx
<FeatureWrapper featureModule="week_view" autoStart>
```

**Curriculum (curriculum):**
```tsx
<FeatureWrapper featureModule="curriculum" autoStart>
```

**Capture (photo_capture):**
```tsx
<FeatureWrapper featureModule="photo_capture" autoStart>
```

**Guru (guru):**
```tsx
<FeatureWrapper featureModule="guru" autoStart>
```

### Step 5: Enrich Configs During Integration

The current configs have basic steps. As you add `data-tutorial` attributes, enrich the configs with more detailed steps:

- Add more steps per module (e.g. week_view could have 4-5 steps explaining focus works, mastery, notes)
- Verify `targetSelector` values match actual DOM in DevTools
- Tune `position` (top/bottom/left/right) so modals don't overlap the target
- Consider `prerequisite` field (week_view needs student_management done first)

### Step 6: Test All 4 Flows

**Teacher Flow:**
1. Create fresh teacher via `/montree/try`
2. Dashboard → student_management tour starts (0 children)
3. Click through steps → verify spotlight highlights correct elements
4. Add student → week view → week_view tour starts
5. Skip a tour → verify it doesn't reappear
6. Refresh → verify progress persisted
7. Super-admin toggle OFF → verify tours stop

**Principal Flow:**
1. Create fresh principal → setup page → classroom_setup tour
2. Verify principal-specific steps

**Homeschool Parent Flow:**
1. Create fresh parent → verify "Child" not "Student" labels

**Parent Flow:**
1. Enter invite code → parent dashboard → tour starts

### Step 7: Mobile Safari Testing

- Spotlight SVG mask renders correctly
- Modal doesn't hide behind header (z-index 9999 vs z-50)
- Touch events work for backdrop dismiss
- Smooth scroll during target re-measure

---

## File Manifest

### Phase 1-2 Files (8 — all audited + fixed)

| File | Lines | Purpose |
|------|-------|---------|
| `migrations/131_onboarding_system.sql` | 60 | 3 tables + 5 indexes + singleton seed |
| `app/api/montree/onboarding/settings/route.ts` | 83 | Settings GET/PATCH (timing-safe auth, whitelisted fields) |
| `app/api/montree/onboarding/progress/route.ts` | 79 | Progress GET/POST (JWT auth, explicit onConflict) |
| `app/api/montree/onboarding/skip/route.ts` | 55 | Skip POST (JWT auth, __module_skipped__ marker) |
| `lib/montree/onboarding/configs.ts` | 270 | Type interfaces + 4 role configs + getOnboardingConfig() |
| `components/montree/onboarding/OnboardingOverlay.tsx` | 211 | Spotlight + modal + highlight ring + ESC/scroll/resize |
| `components/montree/onboarding/FeatureWrapper.tsx` | 73 | Page wrapper with autoStart + dismissRef |
| `hooks/useOnboarding.ts` | 204 | Zustand store + persistence + useOnboarding() helper |

### Phase 3-5 Files to Modify (~12)

| File | What to Add |
|------|-------------|
| `app/montree/dashboard/layout.tsx` | Onboarding state init (fetch settings + progress) |
| `app/montree/dashboard/page.tsx` | `data-tutorial` attrs + `<FeatureWrapper>` wrap |
| `app/montree/dashboard/[childId]/page.tsx` | `data-tutorial` attrs + `<FeatureWrapper>` wrap |
| `app/montree/dashboard/curriculum/page.tsx` | `data-tutorial` attrs + `<FeatureWrapper>` wrap |
| `app/montree/dashboard/capture/page.tsx` | `data-tutorial` attrs + `<FeatureWrapper>` wrap |
| `app/montree/dashboard/guru/page.tsx` | `data-tutorial` attrs + `<FeatureWrapper>` wrap |
| `app/montree/dashboard/students/page.tsx` | `data-tutorial` attrs (student form elements) |
| `components/montree/DashboardHeader.tsx` | `data-tutorial` on nav links (curriculum, guru) |
| `app/montree/principal/setup/page.tsx` | `data-tutorial` attrs + separate onboarding init |
| `app/montree/parent/dashboard/page.tsx` | `data-tutorial` attrs + separate onboarding init |

---

## Key Gotchas

1. **Principal pages DON'T share `dashboard/layout.tsx`** — they're under `/montree/principal/`. Need separate onboarding init (fetch settings + progress) in principal pages directly, or create a principal layout.

2. **Parent portal uses different auth** — invite code cookies, not JWT. The progress/skip API routes use `verifySchoolRequest()` (JWT). For parents, either: (a) create separate parent-auth endpoints, or (b) do parent onboarding client-side only (localStorage, no DB sync). Option (b) is simpler and probably fine.

3. **`WelcomeModal` already shows on first login** — `has_completed_tutorial` check in dashboard page. Decide: replace WelcomeModal with onboarding tour (better UX), or keep both? Probably replace.

4. **Initial onboarding page exists** (`/montree/onboarding/page.tsx`) — this is the add-students-with-progress flow during first signup. NOT the tutorial system. Don't confuse them.

5. **DashboardHeader nav links** are the best place for curriculum/guru tutorial attributes — they're persistent across all dashboard pages, so tours pointing at header links work from any page.

6. **Overlay z-index (9998-9999)** vs header (z-50) — no conflict. But check if any modals (AddWorkModal, WorkPickerModal, etc.) render above 9999.

7. **Mobile `position: fixed`** can behave oddly in scrollable containers on iOS Safari. Test thoroughly.

---

## Rollback Plan

**Option A: Super-admin UI** — Toggle all roles OFF at `/montree/super-admin`

**Option B: API call:**
```bash
curl -X PATCH https://montree.xyz/api/montree/onboarding/settings \
  -H "x-super-admin-password: YOUR_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"enabled_for_teachers":false,"enabled_for_principals":false,"enabled_for_parents":false,"enabled_for_homeschool_parents":false}'
```

**Option C: Drop tables (nuclear):**
```sql
DROP TABLE IF EXISTS montree_onboarding_events;
DROP TABLE IF EXISTS montree_onboarding_progress;
DROP TABLE IF EXISTS montree_onboarding_settings;
```

Phase 1-2 deployment has ZERO user-facing impact (no UI changes yet), so rollback is unlikely needed until Phase 3-5 is integrated.
