# Handoff: Special Events Photo Audit Fix (Mar 26, 2026)

## Summary

Fixed three issues preventing teachers from tagging photos to Special Events works via the photo-audit page's "Fix" flow.

## Issues Fixed (3)

### Fix 1: WorkWheelPicker Empty State Add Form Not Rendering (CRITICAL)
**Root cause:** When `works.length === 0`, the component returned early at line 176 with a simple "No works available" message. The `showAddForm` state variable existed but the JSX that rendered the add form was only in the main body (after line 237), which was never reached during the early return.

**Fix:** Embedded the add form directly inside the early-return block (lines 176-236). When `showAddForm` is true, renders input + add button + cancel. When false, renders "No works available" + "Add first work" button. The add form correctly POSTs to `/api/montree/curriculum` with `area_key: area` and `is_custom: true`.

### Fix 2: Photo-Audit Missing `onWorkAdded` Callback (HIGH)
**Root cause:** The photo-audit page's WorkWheelPicker component didn't pass `onWorkAdded` prop. After creating a custom work via the empty state add form, `onWorkAdded?.()` fired but was undefined — so the curriculum was never refreshed and the newly-created work didn't appear in the picker.

**Fix:** Extracted the inline curriculum fetch into a reusable `fetchCurriculum` useCallback, then passed it as `onWorkAdded={fetchCurriculum}` to the WorkWheelPicker.

### Fix 3: 409 Duplicate Work Not Refreshing Curriculum (MEDIUM)
**Root cause:** When a teacher tried to add a work that already existed (409 response from curriculum POST), the error branch showed a toast but never called `onWorkAdded?.()`. So the existing work remained invisible in the picker even though it existed in the DB.

**Fix:** Added a specific `response.status === 409` handler in WorkWheelPicker's `handleAddWork` that calls `onWorkAdded?.()` to refresh the curriculum, hides the add form, and shows an info toast "This work already exists — you can select it below".

### Additional: Cache-Buster on Curriculum Fetch
Added `&_t=${Date.now()}` to the works/search fetch URL in `fetchCurriculum` to bypass browser HTTP cache (`Cache-Control: private, max-age=300`). Ensures fresh data on every curriculum load, especially important when special_events works are created mid-session.

### Additional: Diagnostic Logging
Added `console.log('[Photo Audit] Curriculum loaded:', ...)` showing area keys and special_events work count. Confirmed working: `special_events: 2 works` visible in console after deploy.

## Verification

Console log confirms: `[Photo Audit] Curriculum loaded: special_events, language, practical_life, sensorial, mathematics, cultural | special_events: 2 works`

The two existing special_events works ("Cultural Day" and "Cultural Day - Beading") now appear correctly in the WorkWheelPicker when the teacher selects Special Events during the Fix flow.

## Files Modified (2)

1. **`components/montree/WorkWheelPicker.tsx`** — Empty state add form in early-return block (previous session, commit `bd1ea26b`) + 409 curriculum refresh (commit `b9f4a565`)
2. **`app/montree/dashboard/photo-audit/page.tsx`** — `fetchCurriculum` useCallback + `onWorkAdded={fetchCurriculum}` + cache-buster `&_t=${Date.now()}` + diagnostic logging (commits `c455db3a`, `f762f70a`)

## Commits

- `bd1ea26b` — WorkWheelPicker empty state add form fix (previous session)
- `c455db3a` — Cache-buster on curriculum fetch
- `f762f70a` — Diagnostic logging
- `b9f4a565` — 409 duplicate work curriculum refresh

## Deploy

✅ All commits pushed to `main`. Railway auto-deploying. Verified working in production.

## Also Noted: 500 Errors on Other Routes

Console shows 500 errors on `/api/montree/classroom-setup/describe` and `/api/montree/guru/corrections` (3 calls). These are pre-existing issues unrelated to this fix — likely Smart Learning system bugs the user mentioned need attention next session.

## Next Priority

Smart Learning system bug fixes — user reports it's "a little buggy" but functional. The 500 errors on `classroom-setup/describe` and `guru/corrections` visible in the console are likely related.
