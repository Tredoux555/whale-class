# Handoff: Curriculum POST 500 Fix — Custom Work Addition

**Date:** March 23, 2026
**Status:** ✅ DEPLOYED (commit `5a62a1a1`)
**Severity:** CRITICAL — blocked teachers from adding custom works in live classroom

---

## Problem

Teacher tried to add custom work "CVC Puzzle" to Language area via AddWorkModal. `POST /api/montree/curriculum` returned 500 Internal Server Error. No custom works could be added at all.

## Root Cause

**Ghost columns in insert data.** The curriculum POST route always included `prompt_used: null` and `reference_photo_url: null` in every insert into `montree_classroom_curriculum_works`. These columns were defined in `migrations/138_work_ingestion.sql`, but that migration was **never run** — `138_visual_memory.sql` ran instead (there are three conflicting migration 138 files).

PostgreSQL rejected the insert with "column does not exist", which the route caught and returned as a generic 500.

**Three conflicting migration 138 files:**
1. `138_visual_memory.sql` — ✅ RUN (visual memory table + RPCs)
2. `138_work_ingestion.sql` — ❌ NEVER RUN (adds `prompt_used`, `reference_photo_url`, `source`)
3. `138_media_parent_visible.sql` — status unknown

The `source` column was independently added by migration 144, so it exists. But `prompt_used` and `reference_photo_url` do not exist in the DB.

## Fix (1 file, 2 changes)

**`app/api/montree/curriculum/route.ts`:**

1. **Removed ghost columns from default insert data.** `prompt_used` and `reference_photo_url` are no longer included in every insert. They're now only added to the insert object if the request body explicitly provides values:
   ```typescript
   // Only include optional columns if they have values (columns may not exist in all deployments)
   if (body.prompt_used) insertData.prompt_used = body.prompt_used;
   if (body.reference_photo_url) insertData.reference_photo_url = body.reference_photo_url;
   ```

2. **Added 23505 duplicate handling.** The partial unique index from migration 144 (`(classroom_id, LOWER(name)) WHERE is_custom = true`) means duplicate custom work names within a classroom cause a constraint violation. Previously returned generic 500, now returns clear 409:
   ```typescript
   if (error.code === '23505') {
     return NextResponse.json({ error: 'A custom work with this name already exists in your classroom' }, { status: 409 });
   }
   ```

## Audit Verification

- Every column in the insert data verified against migration 099 (table creation) + migration 144 (custom work schema)
- Frontend `AddWorkModal.tsx:221` correctly displays the 409 error message via `toast.error(data.error)`
- Enrichment trigger at line 355 unaffected — still fires for custom works without descriptions
- Only the curriculum route was pushed; CLIP schema changes remain held back per plan

## Impact

- Custom work addition now works for all teachers
- Duplicate custom work names show a helpful error instead of crashing
- Zero risk to existing functionality — removed columns were never used (always null)

## Future Cleanup

The three conflicting migration 138 files should be reconciled. Consider:
- Running `138_work_ingestion.sql` to add the missing columns (low priority — no code currently needs them)
- Or deleting `138_work_ingestion.sql` entirely since `prompt_used` and `reference_photo_url` aren't used anywhere except as optional passthrough
