# UI Fixes Plan — Feb 12, 2026 (FINAL v2 — Airtight)

## Task 1: WorkWheelPicker — Status Preservation Fix
**Effort:** 1 line | **Risk:** None

### Problem
`handleSelectWork()` (line 102) hardcodes `'not_started'`. Changing focus to a work the child is already practicing resets their progress.

### Fix
```tsx
// Line 102 — before:
onSelectWork(works[selectedIndex], 'not_started');

// Line 102 — after:
onSelectWork(works[selectedIndex], works[selectedIndex].status || 'not_started');
```

### Why it's safe
- `works[selectedIndex].status` is typed as `'not_started' | 'presented' | 'practicing' | 'mastered' | 'completed' | undefined` (Work interface, line 13)
- The API endpoint `/api/montree/progress/update` has `normalizeStatus()` (lines 10-23) which validates all inputs and falls back to `'not_started'` for anything unexpected
- `mastered_at` timestamp is only set on FIRST transition to mastered (lines 74-87) — never overwritten
- If `status` is `undefined`: `|| 'not_started'` handles it

### Existing behavior (already correct, NOT changing):
- Click highlighted/centered work in wheel → changes focus (handleSelectWork → onSelectWork)
- Green "Add Work" button at bottom → adds as extra (onAddExtra)

### File
- `components/montree/WorkWheelPicker.tsx` — line 102

---

## Task 2: Remove Demo Button
**Effort:** Small | **Risk:** None

### References to remove (5 total, 2 files only — verified via codebase search)

**`components/montree/child/FocusWorksSection.tsx` (3 refs):**
1. Line 26: `onOpenDemo: (workName: string) => void;` — delete from interface
2. Line 52: `onOpenDemo,` — delete from destructured params
3. Lines 129-134: Delete the entire Demo button:
```tsx
<button
  onClick={() => onOpenDemo(work.work_name)}
  className="flex-[2] py-2.5 bg-red-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1 hover:bg-red-600 active:scale-95"
>
  ▶️ Demo
</button>
```

4. Change Quick Guide button: `📖` → `📖 Quick Guide`, `flex-[1]` → `flex-1`
5. Change Capture button: `flex-[2]` → `flex-1`

**`app/montree/dashboard/[childId]/page.tsx` (2 refs):**
1. Lines 105-119: Delete `openDemo` function (15 lines)
2. Line 527: Delete `onOpenDemo={openDemo}` prop

### Zero other references anywhere in codebase (confirmed via grep)

---

## Task 3: Wheel-Style Position Picker in AddWorkModal
**Effort:** Main task | **Risk:** Low (UI-only)

### What's deleted
Lines 302-367 (the flat list position picker overlay — 66 lines)

### What's also deleted/modified
- Line 44: `positionListRef` → renamed to `positionWheelRef` (same purpose, new name)
- Lines 67-72: useEffect for scroll-into-view → rewritten for wheel scroll pattern

### New state/refs

```tsx
// Renamed from positionListRef:
const positionWheelRef = useRef<HTMLDivElement>(null);

// NEW — tracks which item is visually centered during scroll:
const [positionCenterIdx, setPositionCenterIdx] = useState(0);
```

### The positionOptions array (KEY DESIGN DECISION)

The wheel has N+2 items (Beginning + N works + End), but `insertAfterIndex` uses different semantics (-1/null/0..N-1). A mapping array bridges this:

```tsx
const positionOptions = [
  { key: 'beginning', label: 'Beginning of list', icon: '⬆', value: -1 as number | null },
  ...currentAreaWorks.map((w, idx) => ({
    key: w.id,
    label: w.name,
    icon: `#${w.sequence || idx + 1}`,
    value: idx as number | null,
  })),
  { key: 'end', label: 'End of list', icon: '⬇', value: null as number | null },
];
```

**Mapping from insertAfterIndex → wheel index (for initial scroll):**
- `insertAfterIndex === -1` → wheel index 0 (Beginning)
- `insertAfterIndex === null` → wheel index `positionOptions.length - 1` (End)
- `insertAfterIndex >= 0` → wheel index `insertAfterIndex + 1` (offset for Beginning)

**Mapping from wheel tap → insertAfterIndex (on selection):**
- Tap any item → `setInsertAfterIndex(positionOptions[tappedIdx].value)`

### New scroll handler

```tsx
const handlePositionScroll = useCallback(() => {
  if (positionWheelRef.current) {
    const itemHeight = 70;
    const scrollTop = positionWheelRef.current.scrollTop;
    const newIndex = Math.round(scrollTop / itemHeight);
    const clamped = Math.max(0, Math.min(newIndex, positionOptions.length - 1));
    if (clamped !== positionCenterIdx) {
      setPositionCenterIdx(clamped);
      if (navigator.vibrate) navigator.vibrate(10); // haptic feedback
    }
  }
}, [positionCenterIdx, positionOptions.length]);
```

### New scroll-to helper

```tsx
const scrollPositionTo = useCallback((index: number, smooth = true) => {
  if (positionWheelRef.current) {
    positionWheelRef.current.scrollTo({
      top: index * 70,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }
}, []);
```

### Adapted useEffect (replaces lines 67-72)

```tsx
useEffect(() => {
  if (showPositionPicker && positionWheelRef.current) {
    // Map current insertAfterIndex to wheel index
    let initialIdx = positionOptions.length - 1; // default: End
    if (insertAfterIndex === -1) initialIdx = 0;
    else if (insertAfterIndex !== null) initialIdx = insertAfterIndex + 1;

    setPositionCenterIdx(initialIdx);
    // Double-attempt scroll for reliability (same pattern as WorkWheelPicker lines 62-66)
    requestAnimationFrame(() => {
      scrollPositionTo(initialIdx, false);
      setTimeout(() => scrollPositionTo(initialIdx, false), 100);
    });
  }
}, [showPositionPicker]);
```

### Wheel overlay JSX (replaces lines 302-367)

Visual elements copied from WorkWheelPicker main wheel (lines 218-291):

```
Fixed overlay:     z-[60] bg-black/80 backdrop-blur-sm
Header:            area icon + "Insert after..." + close ✕ button
Gradient top:      h-32 bg-gradient-to-b from-black/70 to-transparent
Gradient bottom:   h-32 bg-gradient-to-t from-black/70 to-transparent
Center highlight:  h-[70px] bg-white/15 rounded-2xl border-2 border-white/40
Top spacer:        calc(50% - 35px)
Bottom spacer:     calc(50% - 35px)
Item height:       h-[70px] snap-center
Item scale:        distance 0→1.0, 1→0.9, 2+→0.8
Item opacity:      distance 0→100%, 1→70%, 2+→40%
Scroll container:  scroll-snap-type: y mandatory, scrollbar-hide
```

Each item renders:
- **Beginning item:** `⬆` icon + "Beginning of list" + checkmark if selected
- **Work items:** `#sequence` + work name + checkmark if selected
- **End item:** `⬇` icon + "End of list" + checkmark if selected

Tap behavior: `setInsertAfterIndex(positionOptions[idx].value); setShowPositionPicker(false);`

### What's NOT changing
- Trigger button (lines 279-297) — stays exactly the same
- `insertAfterIndex` semantics — same -1/null/0+ values
- `handleSubmit()` logic (lines 141-149) — untouched
- `showPositionPicker` state — same boolean toggle
- `resetForm()` cleanup — already clears both states

### File
- `components/montree/AddWorkModal.tsx`

---

## Task 4: Create 20 Generic Students in "Demo 1" School
**Effort:** Script | **Risk:** None (data only)

### Target
- School: **Demo 1** (ID: `64d7156e-3e1f-478a-89b4-26f519833d16`)
- Login code: **2ECXN3**
- Classroom ID: to be queried by script (school → classroom FK)

### Table name caveat
Migration 040 created table `children`, but all API code references `montree_children`. Script will verify the actual table name before inserting.

### Minimum viable insert (per student)
```sql
INSERT INTO montree_children (classroom_id, name, age, enrolled_at)
VALUES ('CLASSROOM_UUID', 'Emma', 3, CURRENT_DATE);
```

No progress records needed — they're created on-demand when teachers mark work. No curriculum seeding needed — try/instant already seeded it.

### Method
Write `scripts/seed-demo-students.ts` for user to run locally:
```bash
npx tsx scripts/seed-demo-students.ts
```
(VM can't reach Supabase — confirmed via timeout tests)

Script will:
1. Load env from `.env.local` (SUPABASE_URL + SERVICE_ROLE_KEY)
2. Query `montree_classrooms` WHERE `school_id = '64d7156e...'` → get classroom_id
3. Verify table exists (`montree_children` or `children`)
4. Insert 20 students in a single batch

### Student data
| # | Name | Age | Gender |
|---|------|-----|--------|
| 1 | Emma | 3 | girl |
| 2 | Liam | 4 | boy |
| 3 | Sophia | 3.5 | girl |
| 4 | Noah | 5 | boy |
| 5 | Olivia | 4 | girl |
| 6 | James | 3 | boy |
| 7 | Ava | 4.5 | girl |
| 8 | William | 5 | boy |
| 9 | Isabella | 3 | girl |
| 10 | Benjamin | 4 | boy |
| 11 | Mia | 3.5 | girl |
| 12 | Lucas | 5 | boy |
| 13 | Charlotte | 4 | girl |
| 14 | Henry | 3 | boy |
| 15 | Amelia | 4.5 | girl |
| 16 | Alexander | 5 | boy |
| 17 | Harper | 3 | girl |
| 18 | Daniel | 4 | boy |
| 19 | Evelyn | 3.5 | girl |
| 20 | Matthew | 5 | boy |

Tenure: all "new". Gender stored in `settings` JSONB as `{ gender: 'he' | 'she' }`.

---

## Execution Order
1. **Task 2** — Remove Demo button (2 files, 5 references)
2. **Task 1** — Status preservation fix (1 line)
3. **Task 3** — Wheel position picker (1 file, main effort)
4. **Task 4** — Seed script for 20 students (new file, run locally)
5. **Verify** — TypeScript check, git diff review

## Files Touched
| File | Task | Change |
|------|------|--------|
| `components/montree/WorkWheelPicker.tsx` | 1 | 1 line: status preservation |
| `components/montree/child/FocusWorksSection.tsx` | 2 | Delete Demo button (6 lines) + clean 2 prop refs |
| `app/montree/dashboard/[childId]/page.tsx` | 2 | Delete openDemo function (15 lines) + 1 prop |
| `components/montree/AddWorkModal.tsx` | 3 | Replace 66 lines + adapt 6 lines + add ~40 lines |
| `scripts/seed-demo-students.ts` | 4 | New script (not production code) |

## What's NOT changing
- Zero API routes modified
- Zero database schema changes
- Zero auth/middleware changes
- WorkWheelPicker main wheel + "Add Work" button behavior untouched
- AddWorkModal form fields, submission logic (handleSubmit), and API calls untouched
- insertAfterIndex semantics (-1/null/0+) untouched
