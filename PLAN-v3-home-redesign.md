# Montree Home System Redesign — Implementation Plan v3 (FINAL)

## Audit of Plan v2 — Final Issues Addressed

1. **Try page redirect needs nuance** — Line 157 of try/page.tsx redirects home parents to `/montree/dashboard`. We change this to `/montree/home/setup`. But we must also handle the case where `onboarded` is already true (returning user re-creating) — they go to `/montree/dashboard` which then redirects to `/montree/home/[childId]`.

2. **Dashboard layout.tsx wraps dashboard routes** — The dashboard layout adds DashboardHeader and FeedbackButton. The new `/montree/home/` routes need their own minimal layout WITHOUT the teacher-style header. This is fine since they're in a separate route segment.

3. **Shelf-to-Portal communication** — When the Guru uses tools (set_focus_work, update_progress), the ShelfView needs to know to refetch. Solution: use a shared state via React context or a simple event bus. Recommended: `useCallback` refetch function passed from parent page, triggered when PortalChat receives tool actions in the response.

4. **The `__greeting__` trigger needs i18n awareness** — The greeting trigger passes through the existing API. The conversational prompt already handles language through the child context. No special handling needed.

5. **Missing: Layout for /montree/home/ routes** — Need a minimal `layout.tsx` that does NOT include DashboardHeader. Just a clean wrapper.

6. **Onboarding redirect timing** — The onboarding page checks for children on mount. For home parents with no children, it should redirect to `/montree/home/setup`. For parents with children, redirect to `/montree/home/[childId]`. But the check is async — need a loading state.

7. **Setup page API endpoint** — The existing `/api/montree/onboarding/students` endpoint expects `classroomId` + `students[]` array with optional progress. We can reuse this by passing an empty progress object. No new API needed.

---

## Vision
Two interfaces only for home parents:
1. **The Portal** — Full-screen AI chat where the Guru greets, guides, and manages everything
2. **The Shelf** — Visual 5-area Montessori shelf with expandable work details

---

## Complete File Manifest

### New Files (10)

| # | Path | Est. Lines | Purpose |
|---|------|-----------|---------|
| 1 | `/lib/montree/bioluminescent-theme.ts` | 65 | Bioluminescent Depth theme constants |
| 2 | `/app/api/montree/shelf/route.ts` | 85 | GET shelf data (focus works + progress) |
| 3 | `/app/montree/home/layout.tsx` | 15 | Minimal layout (no DashboardHeader) |
| 4 | `/app/montree/home/setup/page.tsx` | 160 | Minimal child creation (name + age) |
| 5 | `/app/montree/home/[childId]/page.tsx` | 220 | Main 2-tab page (Portal + Shelf) |
| 6 | `/components/montree/home/PortalChat.tsx` | 320 | AI conversational interface |
| 7 | `/components/montree/home/ShelfView.tsx` | 280 | Visual 5-area shelf |
| 8 | `/components/montree/home/WorkDetailSheet.tsx` | 220 | Expandable work detail bottom sheet |
| 9 | `/components/montree/home/BottomTabs.tsx` | 65 | Portal / Shelf tab bar |
| 10 | `/components/montree/home/AmbientParticles.tsx` | 85 | CSS-only floating particles |

### Modified Files (4)

| # | Path | Change Summary |
|---|------|---------------|
| 1 | `/app/montree/dashboard/page.tsx` | +8 lines: redirect home parents after children load |
| 2 | `/app/montree/onboarding/page.tsx` | +12 lines: redirect home parents to setup/home |
| 3 | `/app/montree/try/page.tsx` | +1 line: change redirect target for home parents |
| 4 | `/app/api/montree/guru/route.ts` | +25 lines: handle `__greeting__` trigger |

---

## Implementation — Step by Step

### STEP 1: Bioluminescent Theme
**File:** `/lib/montree/bioluminescent-theme.ts`

```typescript
// Bioluminescent Depth design system
// Dark living backgrounds with self-luminous mint/jade accents
export const BIO = {
  // Hex values
  deep: '#0A1F1C',
  surface: '#0D2B27',
  card: '#122E2A',
  mint: '#4ADE80',
  jade: '#10B981',
  amber: '#F59E0B',

  // Tailwind utility classes
  bg: {
    deep: 'bg-[#0A1F1C]',
    surface: 'bg-[#0D2B27]',
    card: 'bg-[#122E2A]/80',
    gradient: 'bg-gradient-to-b from-[#0A1F1C] via-[#0D2B27] to-[#0A1F1C]',
  },
  text: {
    primary: 'text-white/90',
    secondary: 'text-white/60',
    muted: 'text-white/30',
    mint: 'text-[#4ADE80]',
    amber: 'text-[#F59E0B]',
  },
  border: {
    glow: 'border-[#4ADE80]/20',
    subtle: 'border-white/5',
    dim: 'border-white/10',
  },
  btn: {
    mint: 'bg-[#4ADE80] hover:bg-[#22C55E] text-[#0A1F1C] font-semibold',
    ghost: 'bg-white/10 hover:bg-white/15 text-white/80',
    dark: 'bg-[#0D2B27] hover:bg-[#164340] text-white',
  },
  glow: {
    soft: '0 0 20px rgba(74,222,128,0.15)',
    strong: '0 0 30px rgba(74,222,128,0.3)',
    amber: '0 0 15px rgba(245,158,11,0.2)',
  },
} as const;
```

**Dependencies:** None
**Tests needed:** None (pure constants)

---

### STEP 2: Shelf API
**File:** `/app/api/montree/shelf/route.ts`

```typescript
// GET /api/montree/shelf?child_id=X
// Returns child's focus works + current progress status for each
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

const ALL_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const childId = new URL(request.url).searchParams.get('child_id');
  if (!childId) return NextResponse.json({ error: 'child_id required' }, { status: 400 });

  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const supabase = getSupabase();

  // Fetch focus works
  const { data: focusWorks } = await supabase
    .from('montree_child_focus_works')
    .select('area, work_name, set_at, set_by')
    .eq('child_id', childId);

  // Fetch progress for those specific works
  const workNames = (focusWorks || []).map(fw => fw.work_name);
  let progressMap: Record<string, string> = {};

  if (workNames.length > 0) {
    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('work_name, status')
      .eq('child_id', childId)
      .in('work_name', workNames);

    progressMap = (progress || []).reduce((acc, p) => {
      acc[p.work_name] = p.status;
      return acc;
    }, {} as Record<string, string>);
  }

  // Build shelf response
  const shelf = (focusWorks || []).map(fw => ({
    area: fw.area,
    work_name: fw.work_name,
    status: progressMap[fw.work_name] || 'not_started',
    set_at: fw.set_at,
    set_by: fw.set_by,
  }));

  const occupiedAreas = shelf.map(s => s.area);
  const emptyAreas = ALL_AREAS.filter(a => !occupiedAreas.includes(a));

  return NextResponse.json({ success: true, shelf, empty_areas: emptyAreas });
}
```

**Dependencies:** Existing auth + Supabase helpers
**Tests needed:** Verify correct join, empty shelf, full shelf

---

### STEP 3: Greeting Trigger in Guru API
**File:** `/app/api/montree/guru/route.ts`

Add this block after `const { child_id, question, ... } = body;` and before the question length check:

```typescript
// Handle greeting trigger — special case, no length check
const isGreetingTrigger = question === '__greeting__';
if (isGreetingTrigger) {
  // Override the question for the AI but save it as greeting type
  // The conversational prompt builder already detects intake/checkin/normal
  // We just need to provide a suitable user prompt

  // Check child settings to determine mode
  const { data: childSettings } = await supabase
    .from('montree_children')
    .select('settings')
    .eq('id', child_id)
    .single();
  const settings = (childSettings?.settings as Record<string, unknown>) || {};
  const intakeComplete = settings.guru_intake_complete as boolean ?? false;

  let greetingQuestion: string;
  if (!intakeComplete) {
    greetingQuestion = 'This is our first conversation. Please greet me warmly and ask about my child.';
  } else {
    greetingQuestion = 'I just opened the app. Give me a warm, brief greeting.';
  }

  // Replace the question for downstream processing
  body.question = greetingQuestion;
  // Continue to normal flow — the conversational prompt builder handles mode detection
}
```

Also: modify the `question.length < 5` check to skip when `isGreetingTrigger`:
```typescript
if (!isGreetingTrigger && question.length < 5) { ... }
```

**Dependencies:** None (modifies existing file)
**Risk:** Low — only changes behavior for `__greeting__` question, existing flow untouched

---

### STEP 4: Ambient Particles
**File:** `/components/montree/home/AmbientParticles.tsx`

Pure CSS floating particles. No JavaScript animation.

```typescript
'use client';

import { useMemo } from 'react';
import { BIO } from '@/lib/montree/bioluminescent-theme';

export default function AmbientParticles() {
  // Generate 20 particles with deterministic randomness (seeded by index)
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      size: 2 + (i % 5),                          // 2-6px
      color: i % 3 === 0 ? BIO.amber : BIO.mint,  // 30% amber, 70% mint
      opacity: 0.1 + (i % 4) * 0.1,               // 0.1-0.4
      left: `${(i * 17 + 5) % 100}%`,             // distributed across width
      delay: `${i * 1.5}s`,
      duration: `${15 + (i % 6) * 5}s`,           // 15-40s
    })),
  []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float-up"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.opacity,
            left: p.left,
            bottom: '-10px',
            animationDelay: p.delay,
            animationDuration: p.duration,
            willChange: 'transform',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float-up {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(30px); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up linear infinite;
        }
      `}</style>
    </div>
  );
}
```

---

### STEP 5: Bottom Tabs
**File:** `/components/montree/home/BottomTabs.tsx`

```typescript
'use client';

import { BIO } from '@/lib/montree/bioluminescent-theme';
import { useI18n } from '@/lib/montree/i18n';

interface BottomTabsProps {
  activeTab: 'portal' | 'shelf';
  onTabChange: (tab: 'portal' | 'shelf') => void;
  shelfBadge?: boolean; // Pulse when shelf was just updated
}

export default function BottomTabs({ activeTab, onTabChange, shelfBadge }: BottomTabsProps) {
  const { t } = useI18n();

  const tabs = [
    { id: 'portal' as const, label: t('home.portal') || 'Portal', icon: '💬' },
    { id: 'shelf' as const, label: t('home.shelf') || 'Shelf', icon: '📚' },
  ];

  return (
    <div className={`${BIO.bg.surface} border-t ${BIO.border.subtle} flex safe-area-bottom`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex flex-col items-center py-3 transition-all ${
            activeTab === tab.id
              ? BIO.text.mint
              : BIO.text.muted + ' hover:text-white/50'
          }`}
        >
          <span className="text-xl relative">
            {tab.icon}
            {tab.id === 'shelf' && shelfBadge && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#4ADE80] animate-ping" />
            )}
          </span>
          <span className="text-xs mt-1 font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
```

---

### STEP 6: PortalChat
**File:** `/components/montree/home/PortalChat.tsx`

The core conversational interface. Key behaviors:

**On mount:**
1. Fetch chat history: GET `/api/montree/guru?child_id=X&limit=20`
2. If history exists → display messages + fresh greeting from cache/API
3. If no history → trigger `__greeting__` API call
4. Detect mode from child settings (intake/checkin/normal) for banner display

**Message sending:**
- Same as GuruChatThread: POST to `/api/montree/guru` with `conversational: true`
- On response with `actions` array → call `onShelfUpdated()` callback to trigger shelf refetch
- Show inline action confirmations: "✅ Shelf updated" below guru bubble

**UI structure:**
```
┌───────────────────────┐
│ [Checkin banner?]     │  ← Only when check-in due
├───────────────────────┤
│                       │
│ Chat messages         │  ← Scrollable, dark bg
│ (guru + user bubbles) │
│                       │
│ [Typing indicator]    │
│                       │
├───────────────────────┤
│ 🎤 [Input field] [→] │  ← Fixed bottom input
└───────────────────────┘
```

**Styling:**
- Background: `BIO.bg.gradient`
- Guru bubbles: `BIO.bg.card` with `BIO.border.glow`, left-aligned, 🌿 avatar
- User bubbles: slightly lighter surface, right-aligned
- Input: dark with mint send button
- Typing: three pulsing mint dots

**Props:**
```typescript
interface PortalChatProps {
  childId: string;
  childName: string;
  classroomId?: string;
  onShelfUpdated?: () => void;    // Trigger shelf refetch
  onGuruLimitReached?: () => void;
}
```

**Greeting cache:**
```typescript
const GREETING_CACHE_KEY = `montree_greeting_${childId}`;
const GREETING_TTL = 4 * 60 * 60 * 1000; // 4 hours

function getCachedGreeting(): string | null {
  const cached = localStorage.getItem(GREETING_CACHE_KEY);
  if (!cached) return null;
  const { text, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > GREETING_TTL) return null;
  return text;
}

function cacheGreeting(text: string) {
  localStorage.setItem(GREETING_CACHE_KEY, JSON.stringify({
    text,
    timestamp: Date.now(),
  }));
}
```

---

### STEP 7: ShelfView
**File:** `/components/montree/home/ShelfView.tsx`

**Data loading:**
```typescript
const [shelf, setShelf] = useState<ShelfWork[]>([]);
const [emptyAreas, setEmptyAreas] = useState<string[]>([]);
const [loading, setLoading] = useState(true);
const [selectedWork, setSelectedWork] = useState<string | null>(null);

async function fetchShelf() {
  const res = await fetch(`/api/montree/shelf?child_id=${childId}`);
  const data = await res.json();
  setShelf(data.shelf || []);
  setEmptyAreas(data.empty_areas || []);
  setLoading(false);
}

useEffect(() => { fetchShelf(); }, [childId]);
```

**Layout:**
- 2×2 grid + centered bottom card
- All 5 areas always rendered (occupied or empty)
- Dark background with ambient particles (shared)
- Each card has circular progress ring + work name + area label + status

**Area rendering order:** practical_life, sensorial, mathematics, language, cultural

**Progress ring:** SVG circle with stroke-dasharray based on status:
- not_started: 0% filled, dim
- presented: 33% filled, amber stroke
- practicing: 66% filled, jade stroke
- mastered: 100% filled, mint stroke with glow animation

**Tap behavior:**
- Occupied slot → `setSelectedWork(work_name)` → opens WorkDetailSheet
- Empty slot → calls `onAskGuide(area)` which switches to Portal with pre-filled message

**Props:**
```typescript
interface ShelfViewProps {
  childId: string;
  classroomId?: string;
  onAskGuide: (prefilledMessage: string) => void;
  refreshTrigger?: number; // Increment to trigger refetch
}
```

The `refreshTrigger` prop is incremented by the parent page when PortalChat reports `onShelfUpdated`.

---

### STEP 8: WorkDetailSheet
**File:** `/components/montree/home/WorkDetailSheet.tsx`

Bottom sheet that slides up when a shelf work is tapped.

**Data source:** GET `/api/montree/works/guide?name={workName}&classroom_id={classroomId}`

**Sections (accordion-style, all collapsed by default except first):**
1. **What is this?** — parent_description
2. **Why it matters** — why_it_matters
3. **What you need** — materials (bullet list)
4. **How to present** — presentation_steps (numbered, with tips)
5. **What to watch for** — control_of_error
6. **Quick reference** — quick_guide

**Footer:** "Ask the Guru about this" → dismisses sheet, calls `onAskGuide("Tell me more about {work_name}")`

**Animation:** Transform translateY from 100% to 15% (85vh height). Backdrop blur/darken. Drag handle at top for dismiss gesture (simplified: just a close button + backdrop click).

**Styling:** Dark card bg, mint section headers, white/80 body text.

---

### STEP 9: Main Home Page
**File:** `/app/montree/home/[childId]/page.tsx`

The assembler. Combines all components.

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import { useI18n } from '@/lib/montree/i18n';
import PortalChat from '@/components/montree/home/PortalChat';
import ShelfView from '@/components/montree/home/ShelfView';
import BottomTabs from '@/components/montree/home/BottomTabs';
import AmbientParticles from '@/components/montree/home/AmbientParticles';

export default function HomePage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;
  const { t } = useI18n();

  const [session, setSession] = useState(null);
  const [children, setChildren] = useState([]);
  const [activeTab, setActiveTab] = useState<'portal' | 'shelf'>('portal');
  const [shelfBadge, setShelfBadge] = useState(false);
  const [shelfRefreshTrigger, setShelfRefreshTrigger] = useState(0);
  const [portalPrefill, setPortalPrefill] = useState('');

  // Auth check
  useEffect(() => {
    const sess = getSession();
    if (!sess || !isHomeschoolParent(sess)) {
      router.replace('/montree/dashboard');
      return;
    }
    setSession(sess);
    // Fetch children for selector
    fetch(`/api/montree/children?classroom_id=${sess.classroom.id}`)
      .then(r => r.json())
      .then(data => setChildren(data.children || []));
  }, []);

  // When Guru updates shelf via tools
  const handleShelfUpdated = useCallback(() => {
    setShelfRefreshTrigger(prev => prev + 1);
    setShelfBadge(true);
    setTimeout(() => setShelfBadge(false), 3000);
  }, []);

  // When user taps empty shelf slot or "Ask Guru" in work detail
  const handleAskGuide = useCallback((message: string) => {
    setPortalPrefill(message);
    setActiveTab('portal');
  }, []);

  const selectedChild = children.find(c => c.id === childId) || children[0];

  return (
    <div className={`h-screen flex flex-col ${BIO.bg.deep}`}>
      <AmbientParticles />

      {/* Minimal header */}
      <header className={`relative z-10 ${BIO.bg.surface} border-b ${BIO.border.subtle} px-4 py-3 flex items-center`}>
        {/* Child avatar + name */}
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 rounded-full bg-[#4ADE80]/20 flex items-center justify-center">
            <span className={`text-sm font-bold ${BIO.text.mint}`}>
              {selectedChild?.name?.charAt(0) || '?'}
            </span>
          </div>
          <h1 className={`font-semibold ${BIO.text.primary}`}>
            {selectedChild?.name?.split(' ')[0] || 'Loading...'}
          </h1>
          {/* Child selector for multiple children */}
          {children.length > 1 && (
            <select
              value={childId}
              onChange={(e) => router.push(`/montree/home/${e.target.value}`)}
              className={`ml-2 ${BIO.bg.card} ${BIO.text.secondary} border ${BIO.border.dim} rounded-lg px-2 py-1 text-xs`}
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.name.split(' ')[0]}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 overflow-hidden">
        {activeTab === 'portal' ? (
          <PortalChat
            childId={childId}
            childName={selectedChild?.name || ''}
            classroomId={session?.classroom?.id}
            onShelfUpdated={handleShelfUpdated}
            prefillMessage={portalPrefill}
            onPrefillConsumed={() => setPortalPrefill('')}
          />
        ) : (
          <ShelfView
            childId={childId}
            classroomId={session?.classroom?.id}
            onAskGuide={handleAskGuide}
            refreshTrigger={shelfRefreshTrigger}
          />
        )}
      </main>

      {/* Bottom tabs */}
      <div className="relative z-10">
        <BottomTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          shelfBadge={shelfBadge}
        />
      </div>
    </div>
  );
}
```

---

### STEP 10: Home Layout
**File:** `/app/montree/home/layout.tsx`

Minimal — no DashboardHeader, no FeedbackButton. Just passes children through.

```typescript
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

---

### STEP 11: Setup Page
**File:** `/app/montree/home/setup/page.tsx`

Minimal child creation: name + age only.

**On submit:** POST to `/api/montree/onboarding/students` with:
```json
{
  "classroomId": "...",
  "students": [{ "name": "Emma", "age": 3.5, "progress": {} }]
}
```

On success: the API returns the created children. Extract the child ID and redirect to `/montree/home/[childId]`.

**Note:** Need to check if the onboarding students API returns the child IDs. If not, fetch children after creation.

**Design:** Bioluminescent theme. Dark background, centered card, mint accents.

**Age picker:** Simple grid of pill buttons: 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6+

---

### STEP 12: Dashboard Redirect
**File:** `/app/montree/dashboard/page.tsx`

Add after children are loaded (inside the `useEffect` that fetches children):

```typescript
// Inside the .then() after setChildren(kids):
if (isHomeschoolParent(sess) && kids.length > 0) {
  router.replace(`/montree/home/${kids[0].id}`);
  return;
}
if (isHomeschoolParent(sess) && kids.length === 0) {
  router.replace('/montree/home/setup');
  return;
}
```

---

### STEP 13: Onboarding Redirect
**File:** `/app/montree/onboarding/page.tsx`

Add early in the component, after session check:

```typescript
// Early redirect for home parents
useEffect(() => {
  if (!session) return;
  if (session.teacher.role !== 'homeschool_parent') return;

  // Home parents use the new conversational setup
  if (session.classroom?.id) {
    fetch(`/api/montree/children?classroom_id=${session.classroom.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.children?.length > 0) {
          router.replace(`/montree/home/${data.children[0].id}`);
        } else {
          router.replace('/montree/home/setup');
        }
      });
  } else {
    router.replace('/montree/home/setup');
  }
}, [session]);
```

---

### STEP 14: Try Page Redirect
**File:** `/app/montree/try/page.tsx`

Change line 157:
```typescript
// Before: router.push('/montree/dashboard');
// After:
router.push('/montree/home/setup');
```

---

### STEP 15: Polish & Edge Cases

1. **Loading states** — Bioluminescent shimmer: pulsing 🌿 on dark bg with "Your guide is preparing..."
2. **Error states** — "Your guide is resting" with retry button
3. **Empty shelf** — All 5 slots shown as empty with dashed rings and "Ask your guide" CTAs
4. **No session** — Redirect to login
5. **AI timeout** — Show error in chat, don't break the interface
6. **Shelf update toast** — When Guru uses tools, show "✅ Shelf updated" in chat + badge on Shelf tab
7. **Add another child** — "+" button in header → navigates to `/montree/home/setup`
8. **i18n keys** — Add all new keys to translation files

---

## Implementation Order Summary

```
LAYER 1 — Foundation (no UI)
  1. bioluminescent-theme.ts
  2. /api/montree/shelf/route.ts
  3. Modify /api/montree/guru/route.ts (greeting trigger)

LAYER 2 — Leaf Components (no routing)
  4. AmbientParticles.tsx
  5. BottomTabs.tsx
  6. PortalChat.tsx
  7. ShelfView.tsx
  8. WorkDetailSheet.tsx

LAYER 3 — Pages (integration)
  9.  /montree/home/layout.tsx
  10. /montree/home/[childId]/page.tsx
  11. /montree/home/setup/page.tsx

LAYER 4 — Activate (redirects)
  12. Modify dashboard/page.tsx
  13. Modify onboarding/page.tsx
  14. Modify try/page.tsx

LAYER 5 — Polish
  15. Loading states, error states, animations, i18n, edge cases
```

---

## What This Does NOT Touch

- Teacher dashboard, routes, or components (completely separate)
- Principal routes or admin panel
- Parent portal (/montree/parent/) — code-based auth, different audience
- Database schema — no migrations, no new tables
- Guru AI backend — prompts, tools, knowledge retriever all stay as-is
- Auth flow — JWT, sessions, cookies unchanged
- Curriculum data — JSON files and loading logic unchanged
- Existing APIs — shelf API is new; guru API gets a minor addition; all others untouched

---

## Estimated Build Time
- Layer 1: 20 minutes
- Layer 2: 90 minutes
- Layer 3: 45 minutes
- Layer 4: 15 minutes
- Layer 5: 30 minutes
- **Total: ~3.5 hours of focused building**
