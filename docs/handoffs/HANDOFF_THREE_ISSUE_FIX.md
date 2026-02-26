# Three-Issue Fix — Handoff (Feb 12, 2026)

## What This Is

Three related fixes to the child Week view (`/montree/dashboard/[childId]`):

1. **Extras Leak Bug** — Historical progress records were leaking into the extras section. Fixed with a dedicated `montree_child_extras` table so only explicitly-added extras appear.
2. **Auto-Mastery** — When a teacher sets focus at work #N, works 1 through N-1 are now automatically marked as mastered via a new batch API endpoint.
3. **Area Icon Uniformity** — All 11+ pages that display area icons/colors now use a single shared `AreaBadge` component and canonical `AREA_CONFIG` from `types.ts`, replacing ~15 local color/emoji/icon definitions.

## Status: ✅ CODE COMPLETE — Needs migration + push

**Before deploying:**
1. Run `migrations/124_child_extras_table.sql` against Supabase
2. `git add . && git commit && git push origin main`

---

## Issue 1: Extras Leak Fix

### Problem
The extras section showed every non-focus, non-mastered progress record — meaning old historical records appeared as sub-items under focus works even if the teacher never explicitly added them.

### Solution
Created a new `montree_child_extras` table that explicitly tracks which works were added as extras. The frontend now filters on `is_extra === true` instead of the old "everything that's not focus and not mastered" heuristic.

### Files Changed

**New file:**
- `migrations/124_child_extras_table.sql` — Creates table with `UNIQUE(child_id, work_name)` + index

**API changes:**
- `app/api/montree/progress/update/route.ts` — 3 new code paths:
  - `remove_extra: true` → early return, deletes from extras table only (no progress change)
  - `is_extra: true` → after progress upsert, inserts into extras table (ON CONFLICT ignore)
  - `is_focus: true` → added cleanup to delete from extras table (prevents stale extras after promotion)
- `app/api/montree/progress/route.ts` (GET) — Fetches `montree_child_extras` alongside focus works, builds `extrasSet`, adds `is_extra: true` flag to matching progress records

**Frontend changes:**
- `app/montree/dashboard/[childId]/page.tsx` — Extras filter changed from `status !== mastered && !isFocus` to `p.is_extra === true`
- `hooks/useWorkOperations.ts` — 3 function updates:
  - `removeExtra()` — uses `remove_extra: true` instead of old mastered hack
  - `handleWheelPickerAddExtra()` — sends `is_extra: true` to API
  - `addWork()` — sends `is_extra: true, is_focus: false` to API

**Interface updates (added `is_extra?: boolean`):**
- `app/montree/dashboard/[childId]/page.tsx`
- `hooks/useWorkOperations.ts`
- `components/montree/child/WorkPickerModal.tsx`
- `components/montree/child/FocusWorksSection.tsx` (done in previous session)
- `lib/montree/work-matching.ts`

---

## Issue 2: Auto-Mastery

### Problem
When a teacher picks work #15 as the focus, it implies the child has mastered works #1–14. Previously, teachers had to manually mark each one.

### Solution
New `/api/montree/progress/batch-master` endpoint. When `handleWheelPickerSelect` fires, it finds all works before the selected one in the wheel picker sequence and sends them to the batch endpoint (fire-and-forget, non-blocking).

### Files Changed

**New file:**
- `app/api/montree/progress/batch-master/route.ts` — Accepts `{child_id, works[{work_name, area}]}`, batch upserts as mastered. 2-query efficiency: fetches existing progress first (to skip already-mastered and preserve `mastered_at` dates), then upserts remaining. Caps at 100 works per call.

**Modified:**
- `hooks/useWorkOperations.ts` — Added `wheelPickerWorks` param. `handleWheelPickerSelect` now fires batch-master call after successful focus set. Fire-and-forget (`.catch(() => {})`) since it's best-effort.
- `app/montree/dashboard/[childId]/page.tsx` — Passes `wheelPickerWorks` to `useWorkOperations` hook

---

## Issue 3: Area Icon Uniformity

### Problem
~15 different local definitions of area colors/icons/emojis scattered across 11+ pages. Some had swapped colors (students page had Practical Life=green, Language=pink — wrong). Inconsistent visual experience.

### Solution
Extended the existing `AREA_CONFIG` in `lib/montree/types.ts` with decorative fields (`gradient`, `bg`, `text`, `border`, `prefix`). Created a shared `AreaBadge` component that renders a colored circle in 4 sizes. Replaced all local area config constants across 11 pages.

### Files Changed

**New files (previous session):**
- `components/montree/shared/AreaBadge.tsx` — Shared component with `normalizeArea()` export. Handles shorthand keys (`math`→`mathematics`), display names (`Practical Life`→`practical_life`), and canonical keys.

**Extended (previous session):**
- `lib/montree/types.ts` — `AREA_CONFIG` now includes `gradient`, `bg`, `text`, `border`, `prefix` fields per area

**11 pages refactored (deleted local configs, added AreaBadge):**

| Page | Local constants deleted |
|------|----------------------|
| `progress/page.tsx` | `AREAS`, `AREA_COLORS` |
| `progress/detail/page.tsx` | `getAreaConfig()` rewritten |
| `gallery/page.tsx` | `getAreaConfig()` rewritten |
| `summary/page.tsx` | `getAreaEmoji()`, `getAreaColor()` rewritten |
| `weekly-review/page.tsx` | (none — just added AreaBadge) |
| `reports/[reportId]/page.tsx` | Local `AREA_CONFIG` (display-name keyed) |
| `print/page.tsx` | `AREA_ORDER`, `AREA_CONFIG`, `normalizeArea()` |
| `parent/milestones/page.tsx` | `AREA_COLORS`, `AREA_ICONS` |
| `AreaProgressGrid.tsx` | (none — replaced emoji span) |
| `students/page.tsx` | `CURRICULUM_AREAS` (had SWAPPED colors!) |
| `curriculum/page.tsx` | Removed `AREA_ICONS`, `AREA_COLORS` imports |
| `FocusWorksSection.tsx` | (done in previous session) |

---

## Database Migration Required

```sql
-- migrations/124_child_extras_table.sql
CREATE TABLE IF NOT EXISTS montree_child_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  area TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, work_name)
);
CREATE INDEX IF NOT EXISTS idx_child_extras_child_id ON montree_child_extras(child_id);
```

**Note:** The table starts empty. Existing extras won't appear until teachers re-add them via the UI. This is intentional — it cleans up the phantom extras that were the whole problem.

---

## TypeScript Verification

`npx tsc --noEmit` — 0 new errors introduced. All errors in output are pre-existing in unrelated files (`app/admin/*`, `.next/types/validator.ts`).

---

## Key Decisions

1. **Extras table vs. flag column** — Chose a separate table (mirrors `montree_child_focus_works` pattern) over adding an `is_extra` column to `montree_child_progress`. Cleaner separation, easier cleanup, no migration of existing rows needed.
2. **Auto-mastery is fire-and-forget** — The batch-master call doesn't block the UI. If it fails, the teacher can still manually update. Prevents the focus-set experience from feeling slow.
3. **AreaBadge uses colored circles only** — No emojis. Consistent across all pages. The `normalizeArea()` helper handles the 3 key formats (canonical, shorthand, display name).
4. **Existing extras disappear** — By design. The old heuristic was the bug. Teachers will re-add the ones they actually want.
