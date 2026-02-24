# WeekViewGuide — Full Step-by-Step Onboarding Plan

## Overview
Replace the old FeatureWrapper/OnboardingOverlay onboarding on the child week view and capture pages with a new purpose-built `WeekViewGuide` component that walks users through each feature one at a time.

## Step Sequence (10 steps)

### Step 1 — Focus Works Block
- **Target:** `[data-tutorial="focus-section"]` (the entire white "This Week's Focus" block)
- **GPB** around the whole block
- **Speech bubble:** "This is your student/child dashboard, here you record everything! Let me show you how amazing this is"
- **Button:** "Got it!"
- **On click:** Programmatically expand the first work (set expandedIndex to first work's work_name) → advance to step 2

### Step 2 — Work Name (tap to expand)
- **Target:** `[data-guide="first-work-name"]` (the work name text in the first row)
- **GPB** around the work name
- **Speech bubble:** "Tap on the work name to open your work dashboard"
- **Auto-advance:** When work is expanded (already triggered by step 1's Got it), move to step 3

### Step 3 — Quick Guide button
- **Target:** `[data-guide="quick-guide-btn"]` (the 📖 Quick Guide button in expanded view)
- **GPB** around Quick Guide button
- **Speech bubble:** "This is your Quick Guide"
- **Button:** "Got it!"
- **On click:** Programmatically open the QuickGuideModal → advance to step 4

### Step 4 — Quick Guide content (inside modal)
- **Target:** The QuickGuideModal itself (or its content area)
- **No GPB** (modal is already prominent)
- **Speech bubble:** "Your Quick Guide is a 10-second review of the work"
- **Button:** "Got it!"
- **On click:** Advance to step 5 (modal stays open)

### Step 5 — Watch Video button
- **Target:** `[data-guide="watch-video-btn"]` (the 🎬 Watch Video button in QuickGuideModal)
- **GPB** around Watch Video button
- **Speech bubble:** "Click here to open YouTube with the work presentation already searched"
- **Button:** "Got it!"
- **On click:** Advance to step 6

### Step 6 — Full Details button
- **Target:** `[data-guide="full-details-btn"]` (the 📚 Full Details button in QuickGuideModal)
- **GPB** around Full Details button
- **Speech bubble:** "Click here to see the full detailed presentation steps of each work"
- **Button:** "Next"
- **On click:** Close the QuickGuideModal → advance to step 7

### Step 7 — Capture button
- **Target:** `[data-guide="capture-btn"]` (the 📸 Capture button in expanded view)
- **GPB** around Capture button
- **Speech bubble:** "Take a photo of your students doing their work — for your records and for parent reports"
- **Button:** "Got it!"
- **On click:** Advance to step 8

### Step 8 — Transition
- **No target** — just a centered speech bubble
- **Speech bubble:** "Let's get back to it!"
- **Button:** "Next"
- **On click:** Advance to step 9

### Step 9 — Notes textarea
- **Target:** `[data-guide="notes-area"]` (the textarea + save button in expanded view)
- **GPB** around notes area
- **Speech bubble:** "This is where you record your notes and observations. Every note gets saved in the student profile and builds their psychological profile — Guru uses this when you need help or advice."
- **Button:** "Got it!"
- **On click:** Advance to step 10

### Step 10 — Status badge (cycle P → Pr → M)
- **Target:** `[data-tutorial="status-badge-first"]` (the status badge on the first work row)
- **GPB** around status badge
- **Speech bubble:** "Finally, mark works as Presented, Practicing, or Mastered by tapping here"
- **Button:** "Done!"
- **On click:** Complete onboarding

## Files to Modify

### 1. `components/montree/onboarding/WeekViewGuide.tsx` — REWRITE
- Expand from 2 steps to 10 steps
- Add callbacks for programmatic actions (expand work, open quick guide, close modal)
- Handle steps that target elements inside modals (QuickGuideModal)
- "Let's get back to it" centered bubble (no target)

### 2. `components/montree/child/FocusWorksSection.tsx` — ADD data-guide attributes
- `data-guide="first-work-name"` on work name button (index 0)
- `data-guide="quick-guide-btn"` on Quick Guide button (first work only)
- `data-guide="capture-btn"` on Capture button (first work only)
- `data-guide="notes-area"` on notes div (first work only)

### 3. `components/montree/child/QuickGuideModal.tsx` — ADD data-guide attributes
- `data-guide="watch-video-btn"` on Watch Video button
- `data-guide="full-details-btn"` on Full Details button

### 4. `app/montree/dashboard/[childId]/page.tsx` — Wire up callbacks
- Pass callbacks to WeekViewGuide: `onExpandWork`, `onOpenQuickGuide`, `onCloseQuickGuide`
- WeekViewGuide triggers these at the right steps

### 5. `app/montree/dashboard/capture/page.tsx` — Remove old onboarding
- Remove FeatureWrapper import and wrapping (lines 16, 478, 482)

## Key Design Decisions
- Guide uses `createPortal` (same pattern as StudentFormGuide/DashboardGuide)
- Steps that need programmatic actions (expand, open modal) pass callbacks from the page
- Modal steps target elements INSIDE the modal (they exist in DOM when modal is open)
- "Let's get back to it" step has no target — renders centered on screen
- All `data-guide` attributes only on first work (index === 0), same pattern as StudentFormGuide
