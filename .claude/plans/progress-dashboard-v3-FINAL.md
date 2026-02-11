# Plan v3 FINAL — Child Progress Dashboard

## Audit of v2 — Final Issues

### Issue 1: The summary API returns area data but needs the child's classroom_id
The existing `/api/montree/progress/summary` endpoint already handles this internally — it looks up the child's classroom_id itself. ✅ No issue.

### Issue 2: Progress summary uses work counts from curriculum, not just progress records
The summary API counts total works from `montree_classroom_curriculum_works` and cross-references with `montree_child_progress`. This means the area bars show "12 out of 43 total works" — which is exactly right. ✅ Already perfect.

### Issue 3: Need to handle "new classroom" with zero progress
If a classroom is new and has no progress records, the page should still show the 5 area bars at 0% and an encouraging empty state, not an error.

### Issue 4: Photo thumbnails need URL resolution
The media API returns `storage_path` and `thumbnail_path`. The page needs to construct full Supabase public URLs. Pattern from existing code: `${SUPABASE_URL}/storage/v1/object/public/whale-media/${storage_path}`.

### Issue 5: Timeline API — keep it dead simple
Don't over-engineer. The timeline just needs:
- All rows from `montree_child_progress` where status != 'not_started', sorted by updated_at DESC
- Each row already has: work_name, area, status, notes, mastered_at, presented_at, updated_at
- That IS the timeline. No need for a separate events table.
- Behavioral observations: query if table exists, append to timeline, sort together.

**Decision: Skip the separate timeline API entirely.** Enhance the existing `/api/montree/progress` route instead — it already returns all progress records. Add a `include_observations=true` param to also fetch behavioral observations. This avoids creating yet another API route.

### Issue 6: Navigation — where to put the button
The child week view (`[childId]/page.tsx`) needs a clear "📊 Progress" button. Best spot: in the top header area next to the child's name. Use a Link to `/montree/dashboard/${childId}/progress`.

### Issue 7: Mobile-first
The page needs to look great on phone (teachers use tablets/phones in the classroom). The Loom demo is desktop, but real usage is mobile. Design mobile-first with the area bars stacked vertically.

## FINAL Architecture

### Files to CREATE:
1. **`app/montree/dashboard/[childId]/progress/page.tsx`** — ~250 lines, single 'use client' page

### Files to MODIFY:
2. **`app/api/montree/progress/route.ts`** — Add `include_observations=true` query param support (~20 lines added)
3. **`app/montree/dashboard/[childId]/page.tsx`** — Add "📊 Progress Overview" navigation link (~5 lines)

### Data flow:
```
Page loads → 2 parallel fetches:
  1. GET /api/montree/progress/summary?child_id=X → area bars + overall stats
  2. GET /api/montree/media?child_id=X&limit=10 → recent photos

Scroll down → lazy load:
  3. GET /api/montree/progress?child_id=X&include_observations=true → full timeline data
```

## FINAL Page Design

```
┌─────────────────────────────────────┐
│ ← Back    Amy's Progress    📸 📊  │  ← Header with back + title
├─────────────────────────────────────┤
│                                     │
│   ⭐ 34        🔄 8       📋 3     │  ← Hero stats (big numbers)
│   Mastered    Practicing  Presented │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 🧹 Practical Life                   │
│ ████████████░░░░░░░░  12/43  (28%) │  ← Area bars
│                                     │
│ 👁 Sensorial                        │
│ ██████████░░░░░░░░░░   8/30  (27%) │
│                                     │
│ 🔢 Mathematics                      │
│ ████████░░░░░░░░░░░░   6/35  (17%) │
│                                     │
│ 📚 Language                         │
│ ██████████████░░░░░░  15/43  (35%) │
│                                     │
│ 🌍 Cultural                         │
│ ██████░░░░░░░░░░░░░░   3/20  (15%) │
│                                     │
├─────────────────────────────────────┤
│ Recent Photos                       │
│ [📸][📸][📸][📸][📸][📸] →        │  ← Horizontal scroll strip
│                                     │
├─────────────────────────────────────┤
│ Timeline                            │
│                                     │
│ February 2026                       │
│ ⭐ Mastered "Pink Tower"    Feb 10  │
│ 🔄 Practicing "Pouring"    Feb 8   │
│ 📝 Note: "Great focus..."  Feb 7   │
│                                     │
│ January 2026                        │
│ ⭐ Mastered "Sound Boxes"  Jan 28  │
│ ⭐ Mastered "Color Tab 1"  Jan 22  │
│ 📋 Presented "Binomial"    Jan 15  │
│                                     │
│ [Load more...]                      │
└─────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Modify progress API (~20 lines)
In `app/api/montree/progress/route.ts`:
- Check for `include_observations=true` query param
- If present, also query `montree_behavioral_observations` for this child_id
- Return as `observations: [...]` alongside existing `progress` array

### Step 2: Create progress page (~250 lines)
`app/montree/dashboard/[childId]/progress/page.tsx`:

```
Structure:
- Auth check (getSession)
- State: summary, media, progress, loading, selectedArea (filter)
- useEffect: fetch summary + media in parallel on mount
- useEffect: fetch progress/timeline on mount (slightly lower priority)
- Render:
  - Header with back link to /montree/dashboard/{childId}
  - Hero stats row (3 big numbers from summary.overall)
  - 5 area bars (from summary.areas) — tappable to set selectedArea filter
  - Photo strip (from media, first 10, horizontal scroll)
  - Timeline (from progress, grouped by month, filtered by selectedArea if set)
```

Color scheme for area bars matches existing constants:
- practical_life: green (emerald-500)
- sensorial: orange (amber-500)
- mathematics: blue (indigo-500)
- language: pink (rose-500)
- cultural: purple (violet-500)

### Step 3: Add navigation to child view (~5 lines)
In `app/montree/dashboard/[childId]/page.tsx`:
- Add a Link component: "📊 Progress Overview" pointing to `./progress`
- Place it in the header area near the child's name

## Edge cases handled:
- Zero progress records → show all bars at 0%, encouraging empty state
- Zero photos → hide photo strip, show subtle "Add photos" link
- Classroom with no curriculum loaded → summary API handles this gracefully
- Behavioral observations table empty → empty array, no crash
- Photo URL construction → use env var for Supabase URL

## What this does NOT include (future work):
- Guru interaction history in timeline (complex, low priority)
- Child mental profile display (separate feature)
- Pattern detection display (requires more data first)
- PDF export of progress report (future)
- Date range filtering (can add later with from/to params)
