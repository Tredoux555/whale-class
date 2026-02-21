# Handoff: Student Form Guided Onboarding — Feb 22, 2026

## Summary

Replaced the broken dashboard FeatureWrapper auto-start onboarding (which showed floating contextless modals targeting elements that don't exist on the dashboard) with a purpose-built field-by-field guided tour on the students page bulk add form.

## What Was Built

### StudentFormGuide Component (NEW)

**File:** `components/montree/onboarding/StudentFormGuide.tsx` (~570 lines)

A portal-based guided tour with cartoon speech bubbles (emerald-green, white text, triangular pointer tails) and green pulsating borders around target form elements.

**13-step sequence:**

| # | Key | Target | Message | Advance |
|---|-----|--------|---------|---------|
| 1 | name | `[data-guide="name"]` | "This is where you add your student's/child's name" | Auto on input (800ms debounce) |
| 2 | age | `[data-guide="age"]` | "This is where you input the child's age" | Auto on change + Next |
| 3 | gender | `[data-guide="gender"]` | "Is it a boy or a girl?" | Auto on change + Next |
| 4 | tenure | `[data-guide="tenure"]` | "How long has the student/child been in the classroom/home for?" | Auto on change + Next |
| 5 | curriculum-section | `[data-guide="curriculum-section"]` | Explains current work + auto-mastery | Got it! |
| 6 | area-practical_life | `[data-guide="area-practical_life"]` | "Which work is the student busy working on in Practical Life?" | Next |
| 7 | area-sensorial | `[data-guide="area-sensorial"]` | "How about Sensorial?" | Next |
| 8 | area-mathematics | `[data-guide="area-mathematics"]` | "And Math?" | Next |
| 9 | area-language | `[data-guide="area-language"]` | "What about Language?" | Next |
| 10 | area-cultural | `[data-guide="area-cultural"]` | "And finally Culture?" | Next |
| 11 | profile-notes | `[data-guide="profile-notes"]` | Dynamic with child's name — introduces Guru profile building, explains notes are read by Guru for reports and advice | Got it! |
| 12 | add-another | `[data-guide="add-another"]` | "If you have other students, add them here and save all at once..." | Next |
| 13 | save-all | `[data-guide="save-all"]` | "Save all and let's go to your classroom!" | None (user clicks Save) |

**Props:**
- `isVisible: boolean`
- `onComplete: () => void`
- `onSkip: () => void`
- `isHomeschoolParent: boolean` — swaps student→child, classroom→home
- `childName?: string` — used in profile-notes step for personalized messaging

**Visual features:**
- Green pulsating border (CSS box-shadow animation) around target element
- Cartoon speech bubble with triangular pointer tail (adapts direction based on viewport space)
- ← Back / Skip tour / Next → navigation on every step
- Step progress indicator dots
- Escape key dismissal
- Scroll-into-view for off-screen targets
- Fallback centered bubble when target not found in DOM

### Dashboard Changes

**File:** `app/montree/dashboard/page.tsx`
- REMOVED: `FeatureWrapper` import and wrapper around student grid
- KEPT: `WelcomeModal` (first-login greeting) + pulsating "Add first student" card

### Students Page Changes

**File:** `app/montree/dashboard/students/page.tsx`
- Added `data-guide` attributes to 9 form elements (name, age, gender, tenure, curriculum-section, area-{id} wrappers, profile-notes, add-another, save-all) — only on first student (index === 0)
- Auto-opens bulk form for first-time users with 0 students
- Renders `StudentFormGuide` when `isFirstTime && !guideSkipped`
- Passes `bulkStudents[0]?.name` as `childName` prop (dynamic — updates as user types)
- Post-first-save redirect to dashboard with 800ms delay

## First-Time User Flow

1. Teacher logs in → Dashboard shows WelcomeModal + pulsating "Add first student" card
2. Clicks card → navigates to `/montree/dashboard/students`
3. Bulk form auto-opens → StudentFormGuide starts at step 1 (name field)
4. Green pulsating border highlights each field, speech bubble explains what to do
5. Steps 1-4 auto-advance on input/change, steps 5-13 are manual (Got it!/Next)
6. Step 11 (profile-notes) uses the child's actual name: "This is the first step to building Joey's profile..."
7. Step 12 explains add-another and saving all at once
8. Step 13 points to Save All — user clicks the actual button
9. Save → students created → tutorial marked complete → redirects to dashboard
10. Dashboard now shows student cards, guide won't reappear

## What Stays Unchanged

- `WelcomeModal` — still shows on dashboard for first login
- `OnboardingOverlay.tsx` + `FeatureWrapper.tsx` — untouched (still used by other pages)
- `useOnboarding.ts` Zustand store — untouched
- `lib/montree/onboarding/configs.ts` — untouched
- FeatureWrappers on other pages (week view, curriculum, capture, guru) — untouched
- `has_completed_tutorial` flag — already managed by existing save logic
- All API routes — untouched

### DashboardGuide Component (NEW)

**File:** `components/montree/onboarding/DashboardGuide.tsx`

After saving students on the students page, user is redirected to `/montree/dashboard?onboarded=1`. The dashboard detects this query param and shows a speech bubble highlighting the first child card with a green pulsating border.

Message uses the actual child's name: *"This is so exciting! This is your classroom! But it gets better... so much better. Let's tap on Joey to kick things off!"*

- `data-guide="first-child"` on first child card
- `?onboarded=1` query param cleaned from URL after detection via `history.replaceState`
- Dismiss button to close the guide
- Same visual style as StudentFormGuide (emerald bubble, triangular pointer, pulsating border)

## Files Modified

| File | Change |
|------|--------|
| `components/montree/onboarding/StudentFormGuide.tsx` | NEW — 570 lines, guided tour component |
| `components/montree/onboarding/DashboardGuide.tsx` | NEW — post-save dashboard welcome bubble |
| `app/montree/dashboard/page.tsx` | Removed FeatureWrapper, added DashboardGuide + data-guide="first-child" + ?onboarded=1 detection |
| `app/montree/dashboard/students/page.tsx` | Added data-guide attrs, auto-open, guide integration, childName prop, ?onboarded=1 redirect |
