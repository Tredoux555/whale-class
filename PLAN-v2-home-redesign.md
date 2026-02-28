# Montree Home System Redesign — Implementation Plan v2

## Audit of Plan v1 — Issues Found

1. **Try flow doesn't create a child** — The `/api/montree/try/instant` route creates school + classroom + teacher but NO child record. Plan v1 glossed over this — we absolutely need the minimal setup step.

2. **GuruChatThread modification risk** — Plan v1 says to modify GuruChatThread, but it's used in the current dashboard's `guruFirstView` mode. Safer to create a new `PortalChat.tsx` component purpose-built for the new experience.

3. **Greeting API is unnecessary** — We don't need a separate `/api/montree/guru/greet` endpoint. The existing `/api/montree/guru` POST endpoint already supports conversational mode with intake/checkin/normal detection. We can send a special greeting trigger (`question: "__greeting__"`) that the backend handles. This avoids API proliferation.

4. **Multi-child support missing** — Plan v1 mentions `[childId]` in the route but doesn't detail how parents switch between children. Need a child selector in the header.

5. **Existing parent portal conflict** — `/montree/parent/dashboard` is a separate code-based parent portal (for school parents, not homeschool). Plan v1 doesn't address whether this conflicts. It doesn't — that route uses a different auth flow (parent codes, not teacher JWT).

6. **i18n missing** — All existing components use `useI18n()`. New components must too.

7. **GuruOnboardingPicker (concern selection) orphaned** — The current chat flow has a concern-picking step before chat begins. In the new design, we remove this. But concerns are still referenced in the conversational prompt. Solution: the Guru can naturally discover concerns through conversation instead of a form.

8. **Cost concern: AI greeting on every visit** — Every app open triggers an AI call for greeting. Solution: cache the greeting in localStorage with a 4-hour TTL. Only call AI if cache is expired.

9. **Empty shelf state unclear** — What does the Shelf tab show before intake is complete? Need a clear empty state.

10. **Transition for existing users** — Parents who already went through old onboarding already have children + focus_works. They should seamlessly enter the new experience.

---

## Vision Statement (Unchanged)
Two interfaces only:
1. **The Portal** — Conversational AI where the Guru drives everything
2. **The Shelf** — Visual representation of the child's 5-area Montessori shelf

---

## Architecture

### Route Structure
```
/montree/home/setup          → Minimal child creation (name + age only)
/montree/home/[childId]      → Main 2-tab experience (Portal + Shelf)
/montree/dashboard            → Existing (redirects home parents to /montree/home)
```

### Data Flow
```
Parent opens app → getSession() → isHomeschoolParent?
  YES → children exist?
    YES → redirect to /montree/home/[firstChildId]
    NO  → redirect to /montree/home/setup
  NO → existing teacher dashboard (unchanged)
```

---

## Phase 1: API Layer (No UI changes)

### 1.1 Shelf API: `/app/api/montree/shelf/route.ts`

```typescript
// GET /api/montree/shelf?child_id=X
// Returns focus works joined with progress status
// Response:
{
  success: true,
  shelf: [
    {
      area: "practical_life",
      work_name: "Pouring (dry)",
      status: "practicing",     // from montree_child_progress
      set_at: "2026-02-20T...",
      set_by: "guru"
    },
    // ... up to 5 items (one per area)
  ],
  empty_areas: ["cultural"]  // areas with no focus work set
}
```

**Implementation:** Single query joining `montree_child_focus_works` LEFT JOIN `montree_child_progress` ON (child_id, work_name).

### 1.2 Greeting Trigger in Existing Guru API

**File: `/app/api/montree/guru/route.ts`**

Add handling for special greeting messages. When `question` starts with `__greeting__`:
- Skip the 5-char minimum length check
- Use `buildGreetingPrompt()` (already exists in conversational-prompt.ts) for returning users
- Use INTAKE_MODE greeting for new users (no profile)
- Use CHECKIN_MODE greeting when check-in is due
- Response is cached client-side for 4 hours

**Changes to route.ts:**
```typescript
// Before the question length check:
const isGreetingTrigger = question.startsWith('__greeting__');
if (isGreetingTrigger) {
  // Override question validation
  // Build appropriate greeting based on child state
  // Use buildGreetingPrompt / buildFollowUpPrompt from conversational-prompt.ts
}
```

### 1.3 Bioluminescent Theme: `/lib/montree/bioluminescent-theme.ts`

```typescript
export const BIO_THEME = {
  // Backgrounds — living darkness
  deepBg: '#0A1F1C',
  surfaceBg: '#0D2B27',
  cardBg: 'rgba(18, 46, 42, 0.8)',

  // Bioluminescent accents
  mintGlow: '#4ADE80',
  jadePulse: '#10B981',
  amberDust: '#F59E0B',

  // Text
  primary: 'rgba(255, 255, 255, 0.9)',
  secondary: 'rgba(255, 255, 255, 0.6)',
  muted: 'rgba(255, 255, 255, 0.3)',

  // Glow effects
  softGlow: '0 0 20px rgba(74, 222, 128, 0.15)',
  strongGlow: '0 0 30px rgba(74, 222, 128, 0.3)',
  amberGlow: '0 0 15px rgba(245, 158, 11, 0.2)',

  // Tailwind classes
  classes: {
    deepBg: 'bg-[#0A1F1C]',
    surfaceBg: 'bg-[#0D2B27]',
    cardBg: 'bg-[#122E2A]/80',
    mintText: 'text-[#4ADE80]',
    primaryText: 'text-white/90',
    secondaryText: 'text-white/60',
    mutedText: 'text-white/30',
    glowBorder: 'border-[#4ADE80]/20',
    subtleBorder: 'border-white/5',
    mintBtn: 'bg-[#4ADE80] hover:bg-[#22C55E] text-[#0A1F1C] font-semibold',
    ghostBtn: 'bg-white/10 hover:bg-white/15 text-white/80',
  }
} as const;
```

---

## Phase 2: The Portal

### 2.1 Main Home Page: `/app/montree/home/[childId]/page.tsx`

**This is the heart of the redesign.**

```typescript
'use client';

// State
const [activeTab, setActiveTab] = useState<'portal' | 'shelf'>('portal');
const [session, setSession] = useState<MontreeSession | null>(null);
const [children, setChildren] = useState<Child[]>([]);
const [selectedChildId, setSelectedChildId] = useState<string>(params.childId);

// Layout: full screen, no scroll on container
// Header: minimal — child avatar + name + child switcher (if multiple)
// Content: either PortalChat or ShelfView (no scroll wrapper — each manages its own scroll)
// Footer: BottomTabs (Portal | Shelf)
```

**Header Design (Bioluminescent):**
- Height: 56px
- Background: deep dark with subtle gradient
- Left: Child avatar (small, 32px round) + child name in mint text
- Right: Settings gear icon (white/60)
- If multiple children: tapping child name opens a horizontal pill selector

**Content Area:**
- Full remaining height between header and bottom tabs
- `activeTab === 'portal'` → `<PortalChat />`
- `activeTab === 'shelf'` → `<ShelfView />`

**Bottom Tabs:**
- Height: 64px + safe area
- Two tabs only
- Active tab: mint glow icon + label
- Inactive: white/40

### 2.2 New Component: `PortalChat.tsx`

**Location:** `/components/montree/home/PortalChat.tsx`

Purpose-built chat for the home experience. Inspired by GuruChatThread but designed for the Bioluminescent aesthetic and auto-greeting flow.

**Key differences from GuruChatThread:**
1. **No concern-pills header** — removed
2. **No onboarding picker state** — the Guru handles onboarding through conversation
3. **Auto-greeting on mount** — calls greeting trigger on first render
4. **Greeting cache** — stores last greeting in localStorage with 4-hour TTL to avoid repeated AI calls
5. **Bioluminescent styling** — dark background, glowing bubbles
6. **Proactive banners** — "Time for your weekly check-in!" when due
7. **Shelf update notifications** — after Guru uses tools, show subtle toast: "Shelf updated"

**Chat Bubble Styling (Bioluminescent):**
- Guru bubbles: dark surface with faint mint border glow, mint avatar icon
- User bubbles: darker background, right-aligned, subtle amber border
- Typing indicator: three pulsing mint dots
- Input area: dark with mint send button

**State Machine:**
```
LOADING → (check child settings) →
  if !intake_complete → INTAKE (Guru asks about the child)
  if checkin_due → CHECKIN (Guru runs weekly check-in)
  else → NORMAL (greeting + open chat)
```

**Auto-Greeting Flow:**
```
Mount → check localStorage for cached greeting
  if fresh cache exists → show cached greeting, enter chat state
  if no cache / expired →
    POST /api/montree/guru { child_id, question: "__greeting__", conversational: true }
    → show greeting message
    → cache in localStorage with 4hr TTL
    → enter chat state
```

**Voice Note Integration:** Keep the existing VoiceNoteButton component as-is.

### 2.3 Setup Page: `/app/montree/home/setup/page.tsx`

Ultra-minimal pre-chat step. Two fields only.

**Design:**
```
┌─────────────────────────┐
│                          │
│         🌿              │
│                          │
│   Let's begin your       │
│   Montessori journey     │
│                          │
│   ┌──────────────────┐  │
│   │ Child's name      │  │
│   └──────────────────┘  │
│                          │
│   How old?               │
│   [2] [2.5] [3] [3.5]   │
│   [4] [4.5] [5] [5.5]   │
│   [6+]                   │
│                          │
│   ┌──────────────────┐  │
│   │    Meet Your      │  │
│   │     Guide →       │  │
│   └──────────────────┘  │
│                          │
└─────────────────────────┘
```

**On submit:**
1. POST `/api/montree/onboarding/students` with single child (name, age, no progress)
2. On success → `router.push(`/montree/home/${newChildId}`)`
3. Portal opens → Guru detects `!intake_complete` → begins INTAKE conversation

**Styling:** Bioluminescent theme — dark background, mint accents, minimal text.

---

## Phase 3: The Shelf

### 3.1 ShelfView Component: `/components/montree/home/ShelfView.tsx`

**Data loading:**
```
Mount → GET /api/montree/shelf?child_id=X
  → Render 5 area slots (always show all 5, even if empty)
```

**Layout — 2×2 + 1 Grid (portrait):**

Row 1: Practical Life | Sensorial
Row 2: Mathematics | Language
Row 3: Cultural (centered)

**Each Slot — Card Design:**
```
┌───────────────────┐
│  ╭───╮            │
│  │   │  Progress  │  ← Circular progress ring
│  ╰───╯  ring      │
│                    │
│  Work Name         │  ← Clean geometric bold
│  Area Label        │  ← Subtle mint, smaller
│                    │
│  ◉ Practicing      │  ← Status badge with glow
└───────────────────┘
```

**Progress Ring Colors:**
- Not started: dim white/10 ring
- Presented: amber ring (halfway)
- Practicing: jade ring (3/4)
- Mastered: full mint ring with pulse glow animation

**Empty Slot:**
```
┌───────────────────┐
│                    │
│    ╭ ─ ─ ╮       │
│    │  ?  │       │  ← Dashed circle, dim
│    ╰ ─ ─ ╯       │
│                    │
│  Not assigned      │
│  Area Label        │
│                    │
│  "Ask your guide"  │  ← Subtle CTA
└───────────────────┘
```

Tapping empty slot → switches to Portal tab with pre-filled message: "Can you suggest a {area_label} work for {childName}?"

**Background:** Same Bioluminescent deep background with ambient particles.

### 3.2 WorkDetailSheet: `/components/montree/home/WorkDetailSheet.tsx`

Slides up from bottom when a populated shelf slot is tapped.

**Height:** 85% of viewport (draggable handle to dismiss)

**Sections (collapsible accordion):**
1. **Header** — Work name (large), area badge, progress status
2. **What is this?** — `parent_description`
3. **Why it matters** — `why_it_matters`
4. **What you need** — `materials` (bullet list)
5. **How to present** — `presentation_steps` (numbered steps with tips)
6. **What to watch for** — `control_of_error`
7. **Quick Reference** — `quick_guide`

**Footer button:** "💬 Ask the Guru about this" → closes sheet, switches to Portal, pre-fills "Tell me more about {work_name}"

**Data source:** GET `/api/montree/works/guide?name={work_name}&classroom_id={classroom_id}`

### 3.3 AmbientParticles: `/components/montree/home/AmbientParticles.tsx`

CSS-only floating particles for the Bioluminescent background.

```typescript
// 20 particles with randomized:
// - size: 2-6px
// - color: mintGlow (70%) or amberDust (30%)
// - opacity: 0.1-0.4
// - animation-duration: 15-40s
// - starting position: random
// - movement: gentle float upward with slight horizontal drift
// pointer-events: none, position: fixed, z-index: 0
```

**Performance:** Pure CSS keyframes, no JavaScript animation loops. Uses `will-change: transform` for GPU acceleration. Total DOM: 20 divs.

---

## Phase 4: Integration & Routing

### 4.1 Dashboard Redirect
**File: `/app/montree/dashboard/page.tsx`**

Add at the top of the component, after session and children are loaded:

```typescript
// Redirect home parents to new experience
if (isParent && children.length > 0) {
  router.replace(`/montree/home/${children[0].id}`);
  return null; // Show nothing while redirecting
}
if (isParent && children.length === 0) {
  router.replace('/montree/home/setup');
  return null;
}
```

This is the **only change** to the existing dashboard — a redirect. The rest of the dashboard code stays intact for teachers.

### 4.2 Onboarding Redirect
**File: `/app/montree/onboarding/page.tsx`**

Add at the top, after session check:

```typescript
if (isParent) {
  // Home parents skip form-based onboarding
  // Check if they already have children
  const childrenRes = await fetch(`/api/montree/children?classroom_id=${session.classroom.id}`);
  const childrenData = await childrenRes.json();
  if (childrenData.children?.length > 0) {
    router.replace(`/montree/home/${childrenData.children[0].id}`);
  } else {
    router.replace('/montree/home/setup');
  }
  return null;
}
```

### 4.3 Try Flow Update
**File: `/app/api/montree/try/instant/route.ts`**

No changes needed. The try endpoint returns a redirect URL in the response body. The client-side try page handles the redirect. We only need to update the try page's redirect logic:

**File: `/app/montree/try/page.tsx`** — Change the success redirect for home parents:
```typescript
// After successful account creation:
if (role === 'homeschool_parent') {
  router.push('/montree/home/setup');
} else {
  router.push('/montree/onboarding');
}
```

---

## Phase 5: Edge Cases & Polish

### 5.1 Loading States
- **Portal loading:** Bioluminescent shimmer with pulsing 🌿 and "Your guide is preparing..."
- **Shelf loading:** 5 skeleton cards with gentle glow pulse
- **Work detail loading:** Skeleton accordion sections

### 5.2 Error States
- **AI unavailable:** "Your guide is resting. Try again in a moment." with retry button
- **Network error:** "Check your connection" with offline indicator
- **No session:** Redirect to login

### 5.3 Transition for Existing Users
Parents who already used the old system:
- They have children → redirected to `/montree/home/[childId]`
- They may have focus_works already set → shelf populates
- They may have chat history → PortalChat loads it
- They may have concerns saved → still included in system prompt as context
- They may not have `guru_child_profile` → Guru doesn't trigger INTAKE (it checks `guru_intake_complete`)

**Problem:** Existing parents who never did intake won't have a profile. Two options:
- **Option A:** Force intake for existing parents (disruptive)
- **Option B (Chosen):** If no profile exists but they have children + history, treat as NORMAL mode but the Guru can naturally ask for profile info over time

### 5.4 Adding Additional Children
From the Portal, parent can say "I want to add another child" → Guru explains they need to use the setup page → provide link/button. Or:
- Add a "+" icon in the child selector header
- Opens `/montree/home/setup` which creates another child
- Returns to `/montree/home/[newChildId]`

### 5.5 i18n
All new components use `useI18n()` with the `t()` function. New translation keys:
```
home.portal = "Portal"
home.shelf = "Shelf"
home.meetYourGuide = "Meet Your Guide"
home.guidePreparingGreeting = "Your guide is preparing..."
home.checkinDue = "Time for your weekly check-in!"
home.shelfUpdated = "Shelf updated"
home.notAssigned = "Not assigned"
home.askYourGuide = "Ask your guide"
home.tellMeMore = "Tell me more about {workName}"
home.suggestWork = "Can you suggest a {area} work for {childName}?"
home.addChild = "Add a child"
home.setup.title = "Let's begin your Montessori journey"
home.setup.childName = "Child's name"
home.setup.howOld = "How old?"
home.setup.meetGuide = "Meet Your Guide"
```

---

## File Changes — Final Summary

### New Files (9)
| # | File | Lines (est.) | Purpose |
|---|------|-------------|---------|
| 1 | `/lib/montree/bioluminescent-theme.ts` | ~60 | Theme constants |
| 2 | `/app/api/montree/shelf/route.ts` | ~80 | Shelf data endpoint |
| 3 | `/app/montree/home/[childId]/page.tsx` | ~200 | Main 2-tab home page |
| 4 | `/app/montree/home/setup/page.tsx` | ~150 | Minimal child creation |
| 5 | `/components/montree/home/PortalChat.tsx` | ~300 | AI chat interface |
| 6 | `/components/montree/home/ShelfView.tsx` | ~250 | Visual shelf |
| 7 | `/components/montree/home/WorkDetailSheet.tsx` | ~200 | Work detail bottom sheet |
| 8 | `/components/montree/home/BottomTabs.tsx` | ~60 | Tab bar |
| 9 | `/components/montree/home/AmbientParticles.tsx` | ~80 | Background particles |

### Modified Files (3)
| # | File | Change |
|---|------|--------|
| 1 | `/app/montree/dashboard/page.tsx` | Add 6-line redirect block for home parents |
| 2 | `/app/montree/onboarding/page.tsx` | Add 10-line redirect block for home parents |
| 3 | `/app/api/montree/guru/route.ts` | Add ~20 lines for `__greeting__` trigger handling |

### Unchanged Files
- All teacher components, routes, and APIs
- GuruChatThread.tsx (kept as-is, not modified)
- All existing Guru backend (prompt-builder, tool-definitions, tool-executor, etc.)
- Auth system, database schema, curriculum data
- Try/login flows (only minor redirect change in try page)

---

## Implementation Order (Dependency-Aware)

### Layer 1: Foundation (no UI)
1. `bioluminescent-theme.ts` — no dependencies
2. `/api/montree/shelf/route.ts` — depends on existing DB tables only
3. Modify `/api/montree/guru/route.ts` — add greeting trigger

### Layer 2: Components (no routing)
4. `AmbientParticles.tsx` — no dependencies
5. `BottomTabs.tsx` — depends on theme
6. `PortalChat.tsx` — depends on theme + guru API
7. `ShelfView.tsx` — depends on theme + shelf API
8. `WorkDetailSheet.tsx` — depends on theme + works/guide API

### Layer 3: Pages (full integration)
9. `/montree/home/[childId]/page.tsx` — assembles all components
10. `/montree/home/setup/page.tsx` — depends on children API

### Layer 4: Routing redirects (activate the new experience)
11. Modify `dashboard/page.tsx` — redirect home parents
12. Modify `onboarding/page.tsx` — redirect home parents

### Layer 5: Polish
13. Loading states, error states, animations
14. i18n keys
15. Edge case testing

---

## Risk Assessment (Updated)

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI greeting latency (2-5s) | Medium | localStorage cache with 4hr TTL, show ambient particles during load |
| Guru hallucinating work names | Low | Already validated in tool-executor.ts |
| Existing parent data incompatible | Low | Focus_works + progress tables already in use; no migration needed |
| Portal overwhelms Shelf discovery | Medium | Show "Check your shelf!" toast after Guru sets up works; animate tab badge |
| Dark theme accessibility | Medium | All text passes WCAG AA; mint on dark = 7:1 contrast ratio |
| Greeting cache stale after progress | Low | Cache only greeting text; all subsequent messages are real-time |
| Multiple children: wrong child context | Medium | childId in URL + API calls keyed to childId; child selector in header |
| Setup page feels like friction | Low | Only 2 fields + 1 button; takes <5 seconds; leads to magical AI experience |
