# Plan v1 — Child Progress Dashboard (Teacher View)

## Goal
Build a page at `/montree/dashboard/[childId]/progress` that gives teachers a complete longitudinal view of a child's journey — works mastered, photos, notes, and timeline — all in one place. This is also the "demo view" that Tredoux can screen-record in his Loom video to show "End of the week — this is what you see."

## What Data Exists (from research)

### Tables with data:
1. **`montree_child_progress`** — work_name, area, status (not_started/presented/practicing/mastered), notes, mastered_at, presented_at, updated_at
2. **`montree_media`** — photos/videos linked to child_id or work_id, storage_path, thumbnail_path, caption, captured_at, tags
3. **`montree_media_children`** — junction for group photos
4. **`montree_behavioral_observations`** — ABC observations (behavior_description, antecedent, consequence, environmental_notes, observed_at)
5. **`montree_guru_interactions`** — AI advisor conversations (question, response_insight, asked_at)
6. **`montree_child_mental_profiles`** — temperament, learning modality, family_notes, special_considerations
7. **`montree_child_patterns`** — auto-detected patterns (pattern_type, pattern_description, confidence)

### Existing API endpoints:
- `GET /api/montree/progress?child_id=X` — returns progress array + stats + byArea
- `GET /api/montree/progress/summary?child_id=X` — returns per-area completion %, current work, overall %
- `GET /api/montree/media?child_id=X` — returns all media for a child (direct + group photos)
- `GET /api/montree/parent/milestones?child_id=X` — returns mastered works grouped by month (parent-only auth)

### Existing patterns:
- Auth: `verifySchoolRequest()` for teacher routes
- Client data fetching: direct fetch() calls from 'use client' pages
- UI: Tailwind, area colors from AREA_CONFIG, toast from sonner

## Architecture

### New Files:
1. **`app/montree/dashboard/[childId]/progress/page.tsx`** — Main progress dashboard page
2. **`app/api/montree/progress/timeline/route.ts`** — NEW API that aggregates ALL child data into a unified timeline

### Why a new API?
The existing endpoints are scattered — progress is one call, media is another, observations don't have an endpoint yet. A single timeline API that merges everything into chronological order is cleaner than making 5 parallel fetches from the frontend.

## API Design: GET /api/montree/progress/timeline

**Query params:** `child_id` (required), `limit` (default 50), `offset` (default 0)

**Returns:**
```json
{
  "child": { "id": "...", "name": "Amy", "date_of_birth": "..." },
  "summary": {
    "areas": [
      { "area": "practical_life", "total": 43, "mastered": 12, "practicing": 5, "presented": 3, "percent": 28 }
    ],
    "overall": { "total": 213, "mastered": 34, "percent": 16 },
    "total_photos": 28,
    "total_observations": 5
  },
  "timeline": [
    { "type": "mastery", "date": "2026-02-10", "work_name": "Pink Tower", "area": "sensorial" },
    { "type": "photo", "date": "2026-02-09", "url": "...", "thumbnail": "...", "caption": "...", "work_name": "..." },
    { "type": "status_change", "date": "2026-02-08", "work_name": "Pouring", "area": "practical_life", "status": "practicing" },
    { "type": "observation", "date": "2026-02-07", "description": "...", "antecedent": "..." },
    { "type": "note", "date": "2026-02-06", "work_name": "Sandpaper Letters", "notes": "..." }
  ]
}
```

## Page Design

### Header Section
- Child name + photo (if available)
- Overall progress ring/donut showing X% complete
- Quick stats: "34 mastered · 8 practicing · 28 photos"

### Area Progress Bars
- 5 horizontal bars (one per Montessori area)
- Color-coded (green/orange/blue/pink/purple matching existing AREA_CONFIG)
- Shows: "Practical Life — 12/43 mastered (28%)"
- Tappable to filter the timeline to that area

### Timeline (main content)
- Reverse chronological (newest first)
- Each entry has an icon, date, and content:
  - ⭐ Mastery: "Mastered Pink Tower" (gold)
  - 📸 Photo: thumbnail + caption (clickable to enlarge)
  - 📝 Note: teacher note on a work
  - 🔄 Status change: "Started practicing Pouring Water"
  - 👁 Observation: behavioral note
- Grouped by month headers ("February 2026", "January 2026")
- Infinite scroll / "Load more" button

### No photos state
- If no photos for this child: subtle prompt "Add photos in the Capture tab"

## Implementation Steps

1. Create `/api/montree/progress/timeline/route.ts`
   - Query montree_child_progress (all statuses, with dates)
   - Query montree_media (child's photos)
   - Query montree_behavioral_observations (if any exist)
   - Merge into unified timeline sorted by date DESC
   - Build area summary from progress data

2. Create `/montree/dashboard/[childId]/progress/page.tsx`
   - Auth check via getSession()
   - Fetch from timeline API
   - Render header + area bars + timeline
   - Area filter (tap bar to show only that area's events)
   - Photo lightbox (click thumbnail to see full)

## Problems with this plan:
- (will be identified in audit)
