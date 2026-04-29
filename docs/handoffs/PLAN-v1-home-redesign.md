# Montree Home System Redesign — Implementation Plan v1

## Vision Statement
Replace the current multi-panel home parent dashboard with exactly **two interfaces**:
1. **The Portal** — A conversational AI interface where the Guru greets, guides, and manages everything
2. **The Shelf** — A visual representation of the child's current Montessori shelf with expandable work cards

Everything else (progress tracking, curriculum updates, observations, check-ins) happens invisibly behind the scenes through the Guru's tool use.

---

## Architecture Overview

### What We're Replacing
- Current: Dashboard with GuruDashboardCards + ConcernCardsGrid + GuruFAQSection + QuickGuruFAB + "Chat with Guide" button + "View Full Week" link
- Current onboarding: Form-based (name → age slider → curriculum picker per area)

### What We're Building
- New: **Two-panel interface** — Portal (chat) as the default view, Shelf (visual) as a swipeable/tabbable second view
- New onboarding: **Conversational** — Guru greets first, asks about the child, personality, interests, then sets up the shelf automatically

### What We're Keeping (Untouched)
- Teacher experience (completely separate, gated by `isHomeschoolParent()`)
- All existing API routes (we extend, not replace)
- Database schema (we use existing tables + the `montree_child_focus_works` table)
- Auth flow (try → login → session)
- Guru AI backend (conversational-prompt.ts already handles INTAKE, CHECKIN, NORMAL modes)
- Tool executor (already has all 6 tools: set_focus_work, clear_focus_work, update_progress, save_observation, save_checkin, save_child_profile)

---

## Phase 1: The Portal (Conversational Interface)

### 1.1 New Route: `/montree/home/[childId]/page.tsx`
The primary home parent experience. This is the new "dashboard" for parents.

**Layout:**
- Full-screen two-tab layout: **Portal** | **Shelf**
- Bottom tab bar with two icons (chat bubble + shelf icon)
- Minimal header: child name + avatar + settings gear

**Portal Tab (default):**
- Full-height chat interface (reuses GuruChatThread foundation)
- Guru speaks first on every visit (no waiting for user input)
- Three conversation modes already exist in `conversational-prompt.ts`:
  - `INTAKE_MODE` — First visit, no profile yet
  - `CHECKIN_MODE` — When check-in is due
  - `NORMAL_MODE` — Regular conversation
- The existing system already detects mode via `intakeComplete` and `isCheckinDue`

**Key Changes to GuruChatThread:**
- Remove the concern-pills header (concerns become invisible context)
- Add auto-greeting: on mount, if no messages, POST to guru API with a system-generated greeting trigger
- Add proactive nudges: if `isCheckinDue`, show a gentle banner "Time for your weekly check-in!"
- Keep voice note support
- Keep typing indicator
- Style with Bioluminescent Depth aesthetic (dark background, glowing accents)

### 1.2 Auto-Greeting System
**New API: `/api/montree/guru/greet/route.ts`**

When the parent opens the Portal:
1. Check if intake is complete → if not, trigger INTAKE greeting
2. Check if check-in is due → if yes, trigger CHECK-IN greeting
3. Otherwise → trigger WELCOME BACK greeting (already exists as `buildFollowUpPrompt`)

The greeting is a real AI call (not canned text) so it can reference the child's actual data.

**Flow:**
```
Parent opens app
  → Frontend calls GET /api/montree/guru/greet?child_id=X
  → Backend checks child settings (intake_complete, next_checkin)
  → Calls Claude with appropriate prompt (INTAKE/CHECKIN/NORMAL)
  → Returns greeting message
  → Frontend displays it as first bubble
  → Parent responds naturally
  → Regular chat flow continues
```

### 1.3 Conversational Onboarding (Replacing Form-Based)
Instead of the current 3-step form onboarding, the Guru handles everything through conversation:

**Current flow (to be replaced for parents):**
```
Welcome screen → Add Children form (name, age, curriculum picker) → Success screen → Dashboard
```

**New flow:**
```
Try/Login → Redirect to /montree/home/[childId]
  → Guru detects no intake profile
  → Guru greets: "Hi! I'm your Montessori guide. Tell me about your little one..."
  → Parent shares child info naturally
  → Guru asks follow-ups (personality, interests, challenges, experience)
  → Guru calls save_child_profile tool
  → Guru calls set_focus_work × 5 (one per area, age-appropriate)
  → Guru calls save_checkin (schedules first weekly check-in)
  → Guru explains what's on the shelf and how to start
  → Shelf tab now populated
```

**Important:** We still need the child record (name + age) created before the Guru can work. Options:
- **Option A (Recommended):** Keep a minimal pre-chat step: just name + age (2 fields, no curriculum picker). Then redirect to Portal where Guru handles the rest.
- **Option B:** Have the Guru extract name + age from conversation and create the child record via a new tool. More magical but adds complexity.

**Decision: Option A** — A 5-second name+age step before the magic begins. The curriculum picker (the complex part) is eliminated entirely.

### 1.4 Redirect Logic Changes
**File: `/app/montree/dashboard/page.tsx`**

For home parents:
- If `isHomeschoolParent(session)` AND children exist → redirect to `/montree/home/[firstChildId]`
- If `isHomeschoolParent(session)` AND no children → redirect to `/montree/home/setup` (minimal name+age form)
- Teachers continue to see current dashboard (no changes)

---

## Phase 2: The Shelf (Visual Interface)

### 2.1 New Component: `ShelfView.tsx`
**Location:** `/components/montree/home/ShelfView.tsx`

The visual representation of the child's current Montessori shelf — exactly 5 slots (one per area).

**Design Philosophy: Bioluminescent Depth**
- Dark living background (#0D3330 with subtle warm undertones)
- Each work slot glows with a bioluminescent accent (warm mint/jade)
- Empty slots are dim, occupied slots pulse with gentle inner light
- Organic clustering: small spherical particles drift in background
- Typography: clean, geometric, whispered authority

**Layout (Portrait Mobile):**
```
┌─────────────────────────┐
│     [Child Name]'s      │
│        Shelf             │
│                          │
│  ┌─────┐  ┌─────┐      │
│  │ PL  │  │ Sen │      │
│  │     │  │     │      │
│  │ 🧹  │  │ 🔴  │      │
│  │Pour │  │Pink │      │
│  │(dry)│  │Tower│      │
│  └─────┘  └─────┘      │
│                          │
│  ┌─────┐  ┌─────┐      │
│  │Math │  │Lang │      │
│  │     │  │     │      │
│  │ 🔢  │  │ ✏️  │      │
│  │Sand │  │Sand │      │
│  │Paper│  │Paper│      │
│  │Nums │  │Ltrs │      │
│  └─────┘  └─────┘      │
│                          │
│       ┌─────┐           │
│       │Cult │           │
│       │     │           │
│       │ 🌍  │           │
│       │Land │           │
│       │/Watr│           │
│       └─────┘           │
│                          │
│  [Portal]  [●Shelf]     │
└─────────────────────────┘
```

**Each Shelf Slot Shows:**
- Area icon + name (subtle, above the card)
- Work name (prominent)
- Progress indicator (subtle glow ring: gray=not started, amber=presented, green=practicing, bright pulse=mastered)
- Tap to expand

### 2.2 New Component: `WorkDetailSheet.tsx`
**Location:** `/components/montree/home/WorkDetailSheet.tsx`

Bottom-sheet modal that slides up when a shelf work is tapped.

**Data Source:** Calls `/api/montree/works/guide?name=WORK_NAME&classroom_id=X`

**Content Sections:**
1. **What is this?** — `parent_description` field
2. **Why it matters** — `why_it_matters` field
3. **What you need** — `materials` array
4. **How to present** — `presentation_steps` array (step-by-step with tips)
5. **What to look for** — `control_of_error` field
6. **Quick guide** — `quick_guide` condensed reference

**Design:**
- Dark sheet with glowing accent headings
- Collapsible sections (accordion)
- "Ask the Guru about this" button → opens Portal with work context pre-loaded

### 2.3 Shelf Data Source
The shelf reads from `montree_child_focus_works` table:
- Already exists in schema
- Already populated by Guru tools (`set_focus_work`, `clear_focus_work`)
- Already included in context-builder.ts (`focus_works` field)
- Max 5 works (one per area): `practical_life`, `sensorial`, `mathematics`, `language`, `cultural`

**New API: `/api/montree/shelf/route.ts`**
```typescript
GET /api/montree/shelf?child_id=X
Returns: {
  works: [
    { area: "practical_life", work_name: "Pouring (dry)", set_at: "...", progress_status: "practicing" },
    { area: "sensorial", work_name: "Pink Tower", set_at: "...", progress_status: "presented" },
    ...
  ]
}
```
This joins `montree_child_focus_works` with `montree_child_progress` to get the current status for each focus work.

---

## Phase 3: Daily Check-in Nudge System

### 3.1 Check-in Detection
Already exists in `conversational-prompt.ts`:
```typescript
const isCheckinDue = nextCheckin ? new Date(nextCheckin) <= new Date() : false;
```

When check-in is due and parent opens the Portal, the Guru automatically enters CHECK-IN mode and walks through each area on the shelf.

### 3.2 Push Notification (Future)
For now: in-app nudge banner when parent opens the app and check-in is due.
Future: PWA push notification (manifest already configured).

### 3.3 Auto-Progress Updates
Already handled by the Guru's tools:
- `update_progress` — changes work status (not_started → presented → practicing → mastered)
- `set_focus_work` — rotates a new work onto the shelf when one is mastered
- `save_observation` — records notable behaviors
- `save_checkin` — logs the check-in summary and schedules the next one

No new backend logic needed. The AI handles all of this through natural conversation.

---

## Phase 4: Styling & Design System

### 4.1 New Theme: Bioluminescent Depth
**File:** `/lib/montree/bioluminescent-theme.ts`

Complements the existing HOME_THEME but applies the design philosophy:

```typescript
export const BIO_THEME = {
  // Backgrounds
  deepBg: 'bg-[#0A1F1C]',          // Living darkness with emerald undertones
  surfaceBg: 'bg-[#0D2B27]',        // Slightly lighter surface
  cardBg: 'bg-[#122E2A]/80',        // Semi-transparent card

  // Glow accents
  mintGlow: '#4ADE80',               // Primary bioluminescent accent
  jadeGlow: '#10B981',               // Secondary accent
  amberDust: '#F59E0B',              // Warm particulate matter

  // Text
  primaryText: 'text-white/90',
  secondaryText: 'text-white/60',
  accentText: 'text-[#4ADE80]',

  // Borders
  glowBorder: 'border-[#4ADE80]/20',
  subtleBorder: 'border-white/5',

  // Shadows
  glowShadow: 'shadow-[0_0_20px_rgba(74,222,128,0.15)]',
  deepShadow: 'shadow-[0_4px_30px_rgba(0,0,0,0.3)]',
}
```

### 4.2 Ambient Particles Component
**File:** `/components/montree/home/AmbientParticles.tsx`

CSS-only floating particles (no canvas/WebGL for performance):
- 15-20 small circles with CSS animations
- Varying sizes (2px-6px), opacities, and animation speeds
- Mix of mint and amber colors
- Pointer-events: none overlay

---

## Phase 5: File Changes Summary

### New Files to Create
| File | Purpose |
|------|---------|
| `/app/montree/home/[childId]/page.tsx` | Main 2-tab home experience (Portal + Shelf) |
| `/app/montree/home/setup/page.tsx` | Minimal name+age pre-chat step |
| `/app/api/montree/guru/greet/route.ts` | Auto-greeting endpoint |
| `/app/api/montree/shelf/route.ts` | Shelf data endpoint (focus works + progress) |
| `/components/montree/home/ShelfView.tsx` | Visual shelf with 5 area slots |
| `/components/montree/home/WorkDetailSheet.tsx` | Expandable work detail bottom-sheet |
| `/components/montree/home/BottomTabs.tsx` | Portal/Shelf tab bar |
| `/components/montree/home/AmbientParticles.tsx` | Background particle decoration |
| `/lib/montree/bioluminescent-theme.ts` | Bioluminescent Depth theme constants |

### Files to Modify
| File | Change |
|------|--------|
| `/app/montree/dashboard/page.tsx` | Add redirect for home parents to `/montree/home/[childId]` |
| `/components/montree/guru/GuruChatThread.tsx` | Add auto-greeting on mount, remove concern header, add Bioluminescent styling option |
| `/app/montree/onboarding/page.tsx` | For home parents: skip to minimal setup, then redirect to Portal |
| `/app/api/montree/try/instant/route.ts` | After account creation, redirect home parents to `/montree/home/setup` instead of `/montree/onboarding` |

### Files NOT Modified
- All teacher-facing components and routes
- All existing API routes (guru, curriculum, works, children, etc.)
- Database schema (no migrations needed)
- Auth system
- Guru AI backend (prompt-builder, tool-definitions, tool-executor, knowledge-retriever)

---

## Implementation Order

### Step 1: Foundation (No visual changes yet)
1. Create `/lib/montree/bioluminescent-theme.ts`
2. Create `/app/api/montree/shelf/route.ts`
3. Create `/app/api/montree/guru/greet/route.ts`

### Step 2: The Portal
4. Create `/app/montree/home/[childId]/page.tsx` (2-tab layout)
5. Create `/components/montree/home/BottomTabs.tsx`
6. Modify `GuruChatThread.tsx` — add auto-greeting, Bioluminescent mode, remove concern header in bio mode
7. Create `/components/montree/home/AmbientParticles.tsx`

### Step 3: The Shelf
8. Create `/components/montree/home/ShelfView.tsx`
9. Create `/components/montree/home/WorkDetailSheet.tsx`

### Step 4: Onboarding Redirect
10. Create `/app/montree/home/setup/page.tsx` (minimal name+age)
11. Modify `/app/montree/dashboard/page.tsx` — add parent redirect
12. Modify `/app/montree/onboarding/page.tsx` — redirect parents to setup

### Step 5: Polish
13. Animation refinements (shelf transitions, chat entrance)
14. Edge cases (no children, expired session, AI errors)
15. Loading states with Bioluminescent styling

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| AI greeting latency (2-5s cold start) | Show ambient particles + "Your guide is preparing..." shimmer |
| Guru hallucinates work names during intake | `tool-executor.ts` already validates against VALID_WORK_NAMES |
| Parent confusion with 2-tab interface | Default to Portal (familiar chat), Shelf is discoverable |
| Intake conversation goes off-rails | INTAKE_MODE prompt is explicit about what to gather |
| Check-in mode triggers unexpectedly | Already gated by `guru_next_checkin` date in child settings |
| Dark theme accessibility | Ensure WCAG AA contrast ratios on all text |
| Existing home parents lose their data | No data migration needed — focus_works table already in use |

---

## Success Metrics
- Parent opens app → sees Guru greeting within 3 seconds
- Intake conversation → shelf populated in under 5 minutes of chatting
- Weekly check-in → all progress updates happen through conversation
- Parent can find and understand any work on their shelf in 2 taps
- Zero form fields visible during normal use (only name+age during setup)
