# Handoff: 6 Glitches + Overarching Fix — Mar 19, 2026

## Summary

6 issues + 1 overarching issue fixed. Each issue went through 3x plan-audit + 3x build-audit cycles.

---

## Issue 1: Guru Exposing Raw JSON Tool Results to Users

**Problem:** When Kevin asked the Guru about his shelf, the response showed raw JSON arrays of work names, statuses, and is_focus flags instead of human-readable text.

**Root Cause:** `ToolResult.message` field served dual purpose — both as user-facing summary AND as detailed data for Claude to reason about. The fast-path optimization sent `a.message` directly to users, exposing JSON.

**Fix:** Split into `message` (user-facing, clean) and `detail` (Claude-facing, full JSON data). Fixed 6 read-only tools: `browse_curriculum`, `get_child_curriculum_status`, `search_curriculum`, `get_classroom_overview`, `group_students`, `get_weekly_area_summary`.

**Files Modified (1):**
- `lib/montree/guru/tool-executor.ts` — Added `detail?: string` to ToolResult interface, moved JSON data from `message` to `detail` on all 6 read-only tools

---

## Issue 2+7: Custom Works Not Appearing in Curriculum Search

**Problem:** Teacher added "CVC Puzzle" for Kayla, but when searching for Segina, it wasn't in the curriculum. Custom works were invisible across children.

**Root Cause:** Gallery's `loadCurriculum()` fetched `/api/montree/works/search` WITHOUT `classroom_id`, causing fallback to static 329-work JSON (no custom works).

**Fix:** Added `classroom_id` parameter to the curriculum fetch URL in gallery page.

**Files Modified (1):**
- `app/montree/dashboard/[childId]/gallery/page.tsx` — Added `classroom_id` to `/api/montree/works/search` URL in `loadCurriculum()`

---

## Issue 3: No Way to Change Area of Tagged Photos

**Problem:** Guru mis-tagged a work to Math when it should be Language. No UI to change the area.

**Fix:** Split the area badge and work name into separate tappable elements. Tapping the area badge opens the area picker to change area. Tapping the work name opens the work picker within the current area.

**Files Modified (3):**
- `app/montree/dashboard/[childId]/gallery/page.tsx` — Split area badge (tappable → area picker) and work name (tappable → work picker) into separate interactive elements
- `lib/montree/i18n/en.ts` — Added `'gallery.changeArea': 'Change area'`
- `lib/montree/i18n/zh.ts` — Added `'gallery.changeArea': '更改领域'`

---

## Issue 4: Class-Wide Rematch for Painting/Collage → Multicultural Day

**Problem:** Multiple photos tagged as "Painting" and "Collage" need to be reclassified as "Multicultural Day" under Special Events.

**Fix:** Created batch retag API endpoint with two modes: explicit media IDs, or filter by source work name + classroom.

**Files Created (1):**
- `app/api/montree/media/batch-retag/route.ts` — POST endpoint, auth-protected, school-scoped, max 200 photos per batch

**Usage:** First create "Multicultural Day" as a Special Events work, then call batch-retag with `source_work_name: "Painting"` and `new_work_id: <multicultural_day_id>`.

---

## Issue 5: Guru 504/503 Timeout Errors

**Problem:** Browser console showing 504 Gateway Timeout and 503 Service Unavailable from Guru.

**Root Cause:** Per-call timeout was 30s (too aggressive for complex tool-use), and total request timeout was 60s (exactly at Railway's proxy limit, causing race condition).

**Fix:** Per-call 30s → 45s, total 60s → 55s (safely under Railway's 60s proxy timeout). Verified streaming path handles masterAbort correctly with proper 504 error response.

**Files Modified (1):**
- `app/api/montree/guru/route.ts` — `API_TIMEOUT_MS: 30_000 → 45_000`, `TOTAL_REQUEST_TIMEOUT_MS: 60_000 → 55_000`

---

## Issue 6: Auto-Generate Sonnet Descriptions for Custom Works

**Problem:** Custom works added from WorkWheelPicker had no description, quick_guide, parent_description, or other enrichment fields. Only the curriculum page's "Generate Description" button produced these.

**Fix:** Fire-and-forget Sonnet enrichment call after every custom work creation. POST response returns instantly; enrichment runs in background (1-3s) and updates the DB asynchronously.

**Files Created (1):**
- `lib/montree/guru/work-enrichment.ts` — `generateWorkEnrichment()` (Sonnet, 3 retries, 30s timeout) + `enrichCustomWorkInBackground()` (fire-and-forget wrapper)

**Files Modified (2):**
- `app/api/montree/curriculum/route.ts` — Import + fire-and-forget call after custom work insert
- `app/api/montree/works/search/route.ts` — Added enrichment fields to response map (quick_guide, parent_description, why_it_matters, direct_aims, indirect_aims, is_custom)

---

## 3x3 Audit Results

All 6 issues audited with 3x plan-audit + 3x build-audit cycles:

| Issue | Plan Audits | Build Audits | Issues Found | Issues Fixed |
|-------|-------------|--------------|--------------|--------------|
| 1 | 3 | 3 | 1 (missed `group_students` tool) | 1 |
| 2+7 | 3 | 3 | 0 | 0 |
| 3 | 3 | 3 | 0 | 0 |
| 4 | 3 | 3 | 0 | 0 |
| 5 | 3 | 3 | 0 | 0 |
| 6 | 3 | 3 | 3 (source enum, input validation, search fields) | 3 |

Final cross-issue verification: 9 files, ALL PASS.

---

## Files Summary

**Created (2):**
1. `lib/montree/guru/work-enrichment.ts` (~175 lines)
2. `app/api/montree/media/batch-retag/route.ts` (~133 lines)

**Modified (7):**
1. `lib/montree/guru/tool-executor.ts` — ToolResult.detail field + 6 tools fixed
2. `app/montree/dashboard/[childId]/gallery/page.tsx` — classroom_id in fetch + area/work split UI
3. `app/api/montree/guru/route.ts` — Timeout constants
4. `app/api/montree/curriculum/route.ts` — Auto-enrichment import + call
5. `app/api/montree/works/search/route.ts` — Enrichment fields in response
6. `lib/montree/i18n/en.ts` — 1 new key
7. `lib/montree/i18n/zh.ts` — 1 new key

**No migrations required. No env vars changed.**

---

## Deploy

Push all changes to main. Railway auto-deploys.

To execute the Painting/Collage → Multicultural Day batch retag (Issue 4):
1. Create "Multicultural Day" work in Special Events area via curriculum page
2. Note its work ID
3. Call: `POST /api/montree/media/batch-retag` with `{ source_work_name: "Painting", new_work_id: "<id>", classroom_id: "<id>" }`
4. Repeat for "Collage"
