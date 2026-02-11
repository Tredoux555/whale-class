# Plan v2 — Child Progress Dashboard (Audit of v1 + Improvements)

## Audit of v1 — Issues Found

### Issue 1: Route structure wrong
`/montree/dashboard/[childId]/progress` won't work as a nested folder in Next.js because `[childId]` is already a dynamic segment at the page level (`app/montree/dashboard/[childId]/page.tsx`). BUT — there's no `progress` subfolder yet, so this actually IS valid in Next.js App Router. A nested `progress/page.tsx` inside `[childId]/` is fine. ✅ No change needed.

### Issue 2: Behavioral observations may not have data
The `montree_behavioral_observations` table exists but we don't know if any rows exist. The timeline API should gracefully handle empty tables. Include them in the query but don't crash if 0 results.

### Issue 3: New API is overkill for v1
A combined timeline API querying 4 tables is nice but complex. Simpler approach: use the EXISTING `/api/montree/progress/summary` for the area bars (it already returns exactly what we need), and use `/api/montree/media?child_id=X` for photos. Only need ONE new thing: the timeline events that merge progress changes with dates.

**Revised approach:** Use existing APIs where possible, only create a lightweight timeline endpoint for the chronological event stream.

### Issue 4: montree_child_progress columns
From the update route, the actual columns are: `child_id, work_name, area, status, notes, mastered_at, presented_at, updated_at`. Note: it's `work_name` (string), NOT `work_id` (UUID). The progress table matches by work_name, not by FK.

### Issue 5: Photo URLs need Supabase public URL construction
`montree_media.storage_path` is a relative path. Need to construct full URL via `getPublicUrl()` from supabase-client.ts, or build it as `{SUPABASE_URL}/storage/v1/object/public/whale-media/{storage_path}`.

### Issue 6: Missing navigation
How do teachers get to this page? Need to add a "Progress" button/tab on the child week view page (`[childId]/page.tsx`). Should be prominent — this is the "at a glance" view for the Loom demo.

### Issue 7: Loom demo context
This page needs to be visually impressive on first load with NO scrolling. The "hero" section (header + area bars) should tell the whole story above the fold. The timeline is secondary — it's the detail view for digging deeper.

## Revised Architecture

### Files to create:
1. **`app/montree/dashboard/[childId]/progress/page.tsx`** — The dashboard page
2. **`app/api/montree/progress/timeline/route.ts`** — Lightweight timeline endpoint

### Files to modify:
3. **`app/montree/dashboard/[childId]/page.tsx`** — Add "Progress Overview" navigation button

### API calls from the page:
1. `GET /api/montree/progress/summary?child_id=X` — EXISTING, returns area bars data
2. `GET /api/montree/media?child_id=X&limit=20` — EXISTING, returns photos
3. `GET /api/montree/progress/timeline?child_id=X` — NEW, returns chronological events

### Timeline API (simplified):
Only queries `montree_child_progress` for status changes with dates, and optionally `montree_behavioral_observations` if the table has data. Photos come from the existing media API.

```json
{
  "events": [
    { "type": "mastery", "date": "2026-02-10T...", "work_name": "Pink Tower", "area": "sensorial" },
    { "type": "presented", "date": "2026-02-08T...", "work_name": "Pouring", "area": "practical_life" },
    { "type": "observation", "date": "2026-02-07T...", "description": "Showed sustained concentration..." }
  ],
  "total": 45
}
```

## Revised Page Design

### Above the fold (what shows in Loom with NO scrolling):

**Top bar:** Back button + "Amy's Progress" + child name
**Hero stats row:** Three big numbers in a row:
- "34 Mastered" (with ⭐)
- "8 Practicing" (with 🔄)
- "3 Presented" (with 📋)

**5 Area Progress Bars** (stacked, full width):
Each bar shows: [Area icon] [Area name] [colored progress bar] [X/Y]
- 🧹 Practical Life ████████░░░░ 12/43
- 👁 Sensorial ██████░░░░░░ 8/30
- 🔢 Mathematics ████░░░░░░░░ 6/35
- 📚 Language ██████████░░ 15/43
- 🌍 Cultural ███░░░░░░░░░ 3/20

**Recent photos strip** (horizontal scroll): Last 6 photos as thumbnails

### Below the fold (scrollable):

**Timeline section** with month headers:
- February 2026
  - ⭐ Mastered "Pink Tower" · Feb 10
  - 🔄 Started practicing "Pouring Water" · Feb 8
  - 📸 [photo thumbnail] · Feb 7
- January 2026
  - ⭐ Mastered "Sound Cylinders" · Jan 28
  - etc.

## Implementation Steps (revised)

1. Create timeline API route (lightweight — just progress events + observations)
2. Create progress page with:
   a. Auth check + child name fetch
   b. Three parallel API calls (summary, media, timeline)
   c. Hero stats section
   d. Area progress bars (tappable to filter)
   e. Photo strip
   f. Timeline with month grouping
3. Add navigation button on child week view page

## Remaining concerns:
- (will be identified in final audit)
