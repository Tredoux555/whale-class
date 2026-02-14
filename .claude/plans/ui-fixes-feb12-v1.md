# UI Fixes Plan — Feb 12, 2026

## Task 1: WorkWheelPicker — Status Preservation Fix
**Effort:** 1 line | **Risk:** None

### Problem
`handleSelectWork()` (line 102 in WorkWheelPicker.tsx) hardcodes `'not_started'` when changing focus. If a child is already "practicing" a work and you change focus to it, their progress resets.

### Fix
```tsx
// Before (line 102):
onSelectWork(works[selectedIndex], 'not_started');

// After:
onSelectWork(works[selectedIndex], works[selectedIndex].status || 'not_started');
```

### Existing behavior (already correct, no changes):
- Click highlighted/centered work in wheel → changes focus work (via handleSelectWork → onSelectWork)
- Green "Add Work" button at bottom → adds as extra work (via onAddExtra)

### File
- `components/montree/WorkWheelPicker.tsx` — 1 line change at line 102

---

## Task 2: Remove Demo Button
**Effort:** Small | **Risk:** None

### Changes

**`components/montree/child/FocusWorksSection.tsx`:**
- Delete Demo button (lines 129-134)
- Remove `onOpenDemo` from props interface (line 26) and function params (line 52)
- Change Quick Guide from just `📖` to `📖 Quick Guide` (now has room with only 2 buttons)
- Set both buttons to `flex-1` (equal width)

**`app/montree/dashboard/[childId]/page.tsx`:**
- Remove `onOpenDemo={openDemo}` prop from FocusWorksSection (line 527)
- Delete `openDemo` function (lines 105-119)

### Result
Expanded work row shows: `[📖 Quick Guide] [📸 Capture]` — two equal buttons, clean layout.

---

## Task 3: Wheel-Style Position Picker in AddWorkModal
**Effort:** Main task | **Risk:** Low (UI-only, no API changes)

### What's changing
Replace the flat scrollable list position picker (lines 302-367) with a wheel picker matching the main WorkWheelPicker's visual language — full dynamic scale/opacity, gradient fades, snap scrolling.

### Code to copy (adapted from WorkWheelPicker)
Copying the MAIN wheel visual pattern (lines 218-291) — not the simpler position picker (335-395) — because the main wheel has the dynamic scale/opacity effect that makes it "beautiful."

Key visual elements being copied:
- Full-screen overlay: `fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm`
- Header: area icon + "Insert after..."
- Gradient fades: `h-32 bg-gradient-to-b from-black/70 to-transparent` (top) + reverse (bottom)
- Center highlight: `h-[70px] bg-white/15 rounded-2xl border-2 border-white/40`
- Snap scrolling: `scroll-snap-type: y mandatory` + `snap-center` on items
- Top/bottom spacers: `calc(50% - 35px)` to center first/last items
- Dynamic item styling: `distance = Math.abs(index - centerIdx)` → opacity (1.0/0.6/0.3) and scale (1.0/0.9/0.8)

### Items in the wheel
Built as a `positionOptions` array:
1. `⬆ Beginning of list` → sets `insertAfterIndex = -1` (after_sequence = 0)
2. `#1 First Work Name` → sets `insertAfterIndex = 0`
3. `#2 Second Work Name` → sets `insertAfterIndex = 1`
4. ... all works in sequence ...
5. `⬇ End of list` → sets `insertAfterIndex = null` (no after_sequence, append)

### New state/refs needed
- `positionWheelRef` — useRef<HTMLDivElement> for scroll container
- `positionCenterIdx` — useState<number> tracks which item is visually centered
- `handlePositionScroll` — useCallback, calculates center from `Math.round(scrollTop / 70)`
- `useEffect` — auto-scrolls to current selection when picker opens

### Interaction flow
1. User taps "Position in Sequence" trigger button (existing, no change)
2. Wheel overlay opens, auto-scrolls to current selection
3. User scrolls — items smoothly scale/fade based on distance from center
4. User taps desired position → `setInsertAfterIndex(value)` + `setShowPositionPicker(false)`
5. Trigger button text updates to show new selection (existing logic, no change)

### Z-index
AddWorkModal = z-50. Position wheel overlay = z-[60] (higher, already used by current code).

### File
- `components/montree/AddWorkModal.tsx` — replace lines 302-367 + add ~15 lines of state/handlers

---

## Task 4: Create 20 Generic Students
**Effort:** Script | **Risk:** None (data only)

### Method
Script using Supabase service role key (from .env.local) to insert directly into `montree_children`. Bypasses API auth.

### Steps
1. Read .env.local for Supabase credentials
2. Query `montree_schools` / `montree_classrooms` to find target classroom
3. If no suitable demo classroom exists, create a new demo school + classroom
4. Insert 20 children with mixed ages (3-5) and genders

### Student names (generic, NOT from real class)
Emma, Liam, Sophia, Noah, Olivia, James, Ava, William, Isabella, Benjamin, Mia, Lucas, Charlotte, Henry, Amelia, Alexander, Harper, Daniel, Evelyn, Matthew

### Script location
`scripts/seed-demo-students.ts` (not committed to production)

---

## Execution Order
1. Task 2 — Remove Demo (quickest, clears the decks)
2. Task 1 — Status fix (1 line)
3. Task 3 — Wheel position picker (main effort)
4. Task 4 — Seed 20 students (independent, runs last)

## Files Touched
| File | Task | Type |
|------|------|------|
| `components/montree/WorkWheelPicker.tsx` | 1 | 1 line edit |
| `components/montree/child/FocusWorksSection.tsx` | 2 | Delete button + clean props |
| `app/montree/dashboard/[childId]/page.tsx` | 2 | Remove function + prop |
| `components/montree/AddWorkModal.tsx` | 3 | Replace position picker |
| `scripts/seed-demo-students.ts` | 4 | New script (not production) |

## What's NOT changing
- No API routes modified
- No database schema changes
- No auth changes
- No middleware changes
- WorkWheelPicker main wheel behavior untouched (Task 1 only fixes status in handleSelectWork)
