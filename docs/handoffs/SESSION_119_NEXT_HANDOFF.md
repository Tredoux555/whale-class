# Session 119 Handoff — English tracking on Classroom Overview

**Status:** PLANNED — to be built next session. Tredoux's explicit ask:

> "I want to build an English tracking section. Each child needs to come to English at least once in the week so I want to be able to look at 'class overview' I want a list that updates automatically after every photo commit with the photo confirmation section. So I want to see a list of the students who haven't had any English works captured for that week."

## The product brief

**Where:** `/montree/dashboard/classroom-overview` (existing page — add a new section near the top).

**What it shows:** A list of students who have NOT had any English/Language-area work captured this week. The "captured" trigger is photo confirmation (teacher_confirmed=true), not just photo upload.

**Why:** Whale Class's commitment is "every child gets English at least once a week." Right now the teacher has to mentally cross-reference the roster against this week's photos to spot kids who haven't been pulled in. This automates that visibility — at a glance, the teacher sees who needs to come to English before Friday.

**Update cadence:** Automatic. The list refreshes whenever a photo is confirmed in `/montree/dashboard/photo-audit`. Three possible implementations (pick one in session 119):
- **A. Polling** — Classroom Overview polls the endpoint every 30s while visible. Simplest. Slight lag.
- **B. SWR + revalidate-on-focus** — refreshes when teacher tabs back to Classroom Overview after confirming photos. Free, no polling.
- **C. Supabase realtime subscription** on `montree_media` WHERE `school_id` matches. Most responsive. Adds a websocket cost.

Recommendation: **B (SWR revalidate-on-focus)** plus a manual refresh button. Polling is overkill; realtime is over-engineered for this. SWR plays nicely with the existing data layer.

## The data model

**Source of truth — "did the child have a Language-area photo this week?":**

```sql
SELECT DISTINCT m.child_id
FROM montree_media m
JOIN montree_classroom_curriculum_works w ON w.id = m.work_id
JOIN montree_classroom_curriculum_areas a ON a.id = w.area_id
WHERE m.school_id = $1
  AND m.classroom_id = $2
  AND m.teacher_confirmed = TRUE
  AND m.captured_at >= $3  -- this week's Monday 00:00 in classroom timezone
  AND a.area_key = 'language';
```

Also need to handle group photos (multi-child junction). Per CLAUDE.md Session 113 architectural rule: `montree_media_children` junction links group photos to multiple children. Union with:

```sql
SELECT DISTINCT mc.child_id
FROM montree_media_children mc
JOIN montree_media m ON m.id = mc.media_id
JOIN montree_classroom_curriculum_works w ON w.id = m.work_id
JOIN montree_classroom_curriculum_areas a ON a.id = w.area_id
WHERE m.school_id = $1
  AND m.classroom_id = $2
  AND m.teacher_confirmed = TRUE
  AND m.captured_at >= $3
  AND a.area_key = 'language';
```

**"Missing" list:**

```sql
SELECT id, name, nickname
FROM montree_children
WHERE classroom_id = $2
  AND is_active = TRUE
  AND id NOT IN (<union of the two queries above>);
```

## Implementation steps (Session 119 plan)

### Step 1 — API route
- NEW `app/api/montree/dashboard/english-missing/route.ts` (GET)
- Auth via `verifySchoolRequest()`
- Query: derive week_start in classroom timezone (Asia/Shanghai for Whale Class), run the missing-children query above
- Returns: `{ week_start, week_end, missing: [{ id, name, nickname }], total_in_class }`
- Cache: `Cache-Control: private, max-age=60, stale-while-revalidate=120` — list doesn't need to be perfectly fresh; polling/manual refresh handles the live case
- Performance: should be one round trip with a CTE if we want to avoid 3 queries

### Step 2 — UI section on Classroom Overview
- Top of the page, above the existing grid (or in a dedicated card)
- Title: "Hasn't done English this week" or similar
- Body: pill list of child names (e.g. `Amy · Eric · Jonah · YueZe`) — tappable to jump to that child's gallery
- Empty state: "✓ Every child has done English this week. Good work."
- Counter: "3 of 20 children need English"
- Manual "↻ Refresh" button that re-fetches the endpoint
- Loading skeleton on first paint

### Step 3 — Auto-refresh wiring
- Use SWR's `revalidateOnFocus: true` so when teacher tabs back from photo-audit after confirming, the list refreshes
- ALSO add: after a successful photo confirmation in `/photo-audit/page.tsx`, mutate the `/api/montree/dashboard/english-missing` SWR cache key. That gives instant feedback when the teacher confirms an English photo: the child's name disappears from the missing list immediately.

### Step 4 — Mobile + i18n
- Already-translated UI tokens: "English" → "英语" (zh), AREA labels exist in `area-labels.ts` per locale
- New copy needed: "Hasn't done English this week", "Every child has done English this week", "X of Y children need English"
- Add to `en.ts` + run `npm run i18n:fill-ui` to auto-translate

### Step 5 — Smoke test
- Confirm a Language photo for one child → name disappears from list within 2s
- Confirm a Math photo → list unchanged
- Add a new child to the classroom mid-week → name appears in list
- End-of-week: at Friday 5pm if list is non-empty, the teacher knows who to pull in Monday morning

## Architectural notes

- Filter ONLY by `area_key = 'language'` — don't infer from work names. The area is the source of truth.
- Use `teacher_confirmed = TRUE`, not `identification_status` — confirmed is the only state that counts as "really happened."
- The week boundary should be **classroom-timezone Monday 00:00**, not UTC Monday. Whale Class is Asia/Shanghai (UTC+8). Use the same week-start logic as Weekly Wrap (`lib/montree/reports/week-boundary.ts` or wherever the canonical helper lives — grep for it).
- Group photos via `montree_media_children` MUST be included. A child credited via the junction counts as "did English" even though their `child_id` isn't on the primary `montree_media.child_id`.

## Bonus (optional, after the core ships)

- **Days-since-last counter.** Instead of binary "did/didn't this week," show how many days since each child's last English work. Sorted descending. "Amy — 12 days" is more actionable than "Amy — missing this week."
- **Other-area parity.** Same widget for Math, Sensorial, Practical Life, Cultural — toggleable. Future-proof for schools that want different cadence rules per area.
- **Per-child detail.** Tap a missing child's name → opens their gallery filtered to Language. Or jumps to camera with that child pre-selected.

## Files that will likely be touched

- `app/api/montree/dashboard/english-missing/route.ts` (NEW)
- `app/montree/dashboard/classroom-overview/page.tsx` (EXTEND — new section)
- `app/montree/dashboard/photo-audit/page.tsx` (EXTEND — mutate the SWR cache key after successful confirm)
- `lib/montree/i18n/en.ts` (NEW keys) + `npm run i18n:fill-ui` for all locales
- Possibly `hooks/useEnglishMissing.ts` (NEW SWR hook) for clean separation

## When picked up

Start by:
1. Reading `app/montree/dashboard/classroom-overview/page.tsx` to understand current structure
2. Grep for the canonical week-boundary helper (`week_start`, `Monday`, `getMondayStart` etc.)
3. Verify `montree_classroom_curriculum_areas` has `area_key = 'language'` for Whale Class
4. Implement Step 1 (API) first, smoke-test with curl, then Step 2 (UI)

Estimated effort: **2-3 hours** for core + bonus polish. No migration. No new tables. No new env vars.
