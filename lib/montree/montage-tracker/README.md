# Montage Manager (extractable module)

> Renamed from **Montage Tracker** on 2026-07-28. The rename is **labels only** —
> the route slug (`/montree/dashboard/montage-tracker`), the i18n key namespace
> (`montageTracker.*`), this folder and the API paths are all unchanged.

Photo-coverage boards + confirmation-free montage creation with a photo picker.
**Zero AI** — a photo counts the moment it is tagged; the AI identification /
confirmation pipeline runs untouched in parallel and is never imported from here.

Designed to be lifted into a standalone app later. Its ONLY touchpoints:

1. **Read** `montree_media` + `montree_media_children` (+ `montree_children`,
   `montree_classrooms`) — `coverage.ts` (the boards) and `media.ts` (the picker
   list, the per-child totals, and the create-path id re-verification).
2. **Media list API** `GET /api/montree/montage-tracker/media`
   — `?scope=child|classroom|event` (+ optional `start`/`end`) for the picker
   grid, `?mode=totals` for the child-tile badges.
3. **Coverage API** `GET /api/montree/montage-tracker/coverage` — the boards.
4. **Montage jobs API** `POST/GET /api/montree/montage` with
   `bypass_confirmation` (backed by `montree_montage_jobs.require_confirmed`,
   migration 305) and optional `media_ids` (backed by
   `montree_montage_jobs.media_ids`, **migration 306**).
5. **Worker** `montage-worker/src/{db,media,pipeline}.ts` — when a job carries a
   non-empty `media_ids`, `getExplicitEligiblePhotos()` renders exactly those
   photos instead of re-querying the scope.
6. **Nav entries** — `components/montree/DashboardHeader.tsx` + the tools page card.

`weekRange.ts` is dependency-free; `coverage.ts` and `media.ts` take a Supabase
client as an argument.

## 🚨 The WYSIWYG rule (do not "align" these two)

| Surface | `parent_visible` filter? | Why |
|---|---|---|
| **Coverage boards** (`coverage.ts`) | **NO** | Answers *"did anyone photograph this child today?"* — a hidden photo still means the child was photographed. |
| **Picker grid + child totals** (`media.ts`) | **YES, always** | Answers *"what can go in a film?"* The grid, the badge and the rendered montage must agree, and a montage may never contain a photo the teacher hid from parents. |

`parent_visible = true` is enforced **four** times on the explicit-selection
path: the media list, the API's `verifyMediaIds()` re-check at create time, the
worker's `getExplicitEligiblePhotos()` SQL, and the worker's unconditional
`assertAllParentVisible()`. Never relax any of them.

## 🚨 Junction pagination

Every paged read of `montree_media_children` must `.order()` on the composite
`(media_id, child_id)` or `(child_id, media_id)` — the table's UNIQUE pair
(migration 092). Without a stable sort, `.range()` page boundaries are undefined
and rows are silently skipped or duplicated. `MAX_PAGES = 20` caps every loop.

## 🚨 Timezone

Calendar dates are the **browser's local** dates throughout (`weekRange.ts`,
`formatLocalDate`), never `toISOString()` — that shifts the day backwards in
Asia/Shanghai. This includes the date range derived from the kept photos when
the child path's **All** range is used.

## Scope semantics (must mirror the worker)

`media.ts::listScopePhotos` replicates `montage-worker/src/db.ts::getScopedEligiblePhotos`:

- **child** — `montree_media.child_id` UNION the `montree_media_children`
  junction, deduped by media id (the bypass path's union).
- **classroom** — `montree_media.classroom_id` equality (NOT the roster).
- **event** — `montree_media.event_id` equality, **no date range** (the event is
  its own boundary; the create route nulls the range for this scope).

If the worker's scope SQL ever changes, change this in lockstep or the grid and
the film will disagree.

## Migration state

`media_ids` (306) has **not** been run yet as of 2026-07-28. Until it is, every
new code path degrades to a clean **503** (`42703` / `42P01` caught at the
media route, the create route's verification, the duplicate lookup's tiered
column fallback, and the enqueue insert). With no `media_ids` in the request the
insert object and the worker's photo query are **byte-identical** to pre-306.
