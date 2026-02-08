# Session 149: Curriculum Pipeline Fix, Report Descriptions & Retry Logic

**Date:** February 6, 2026
**Commit:** Session 149: Curriculum pipeline fix, report descriptions, retry logic, trial seeding

## Summary

Deep audit and fix of the entire curriculum-to-report pipeline. Found that parent descriptions (`parent_description`, `why_it_matters`) were being dropped by 3 of 4 seeding routes, causing report previews to show generic or wrong descriptions. Also added Supabase connection retry logic, trial curriculum auto-seeding, and bulk import resilience.

## Critical Discovery: The Curriculum Pipeline

### Architecture
```
stem/*.json (structure) + comprehensive-guides/*.json (descriptions)
    ↓
curriculum-loader.ts (AUTHORITATIVE: 268 works, 100% description coverage)
    ↓
4 seeding routes → montree_classroom_curriculum_works (per-classroom copies)
    ↓
reports/preview/route.ts → parent report with descriptions
```

### The Problem
Only 1 of 4 seeding routes included `parent_description` and `why_it_matters`:

| Route | Source | Had Descriptions? |
|-------|--------|-------------------|
| `principal/setup-stream` | Brain + static | ✅ Already correct |
| `principal/setup` | curriculum-loader | ❌ DROPPED them |
| `admin/reseed-curriculum` | curriculum-loader | ❌ DROPPED them |
| `curriculum/route.ts` seed | montessori_works DB | ⚠️ Partially (brain table incomplete) |

### Fixes Applied
1. **setup/route.ts** — Added `parent_description`, `why_it_matters`, `quick_guide`, `presentation_steps` to INSERT
2. **reseed-curriculum/route.ts** — Same 4 fields added
3. **curriculum/route.ts** — Replaced `montessori_works` DB read with `loadAllCurriculumWorks()` (authoritative source)
4. **backfill-guides/route.ts** — Removed `quick_guide`-only filter, added `work_key` secondary matching

## Report Preview Safety Net

`reports/preview/route.ts` now loads descriptions from `loadAllCurriculumWorks()` as a fallback when the DB has NULL descriptions. Priority chain:
1. DB `parent_description` (if populated)
2. Static curriculum description (from comprehensive-guides JSON)
3. Area-based generic (last resort — should rarely be needed now)

## Supabase Retry Logic

`lib/montree/supabase.ts` now includes `fetchWithRetry`:
- Automatically retries on `UND_ERR_CONNECT_TIMEOUT` errors
- Up to 2 retries with 1s, 2s exponential backoff
- Applied via `global.fetch` option on the shared Supabase client

### Routes Migrated to Shared Client (with retry)
1. `auth/teacher/route.ts`
2. `principal/login/route.ts`
3. `principal/setup/route.ts`
4. `try/instant/route.ts`
5. `curriculum/route.ts`
6. `children/bulk/route.ts`
7. `dm/route.ts`
8. `reports/preview/route.ts`

**Note:** 64 other API routes still use inline `getSupabase()` without retry. These should be migrated over time.

## Trial Route: Auto-Seed Curriculum

`try/instant/route.ts` now seeds the full 268-work curriculum (with descriptions) when creating a trial classroom. Added `seedCurriculumForClassroom()` function that runs as step 3b after classroom creation. Non-blocking: if seeding fails, the trial account is still created.

## Bulk Import Resilience

`children/bulk/route.ts`:
- Curriculum fetch is now non-fatal — if it fails, students are still created (progress records just get skipped)
- Error handling distinguishes validation errors (400) from server errors (500)
- Supabase error objects now properly stringified (was showing `[object Object]`)
- Progress records use `.upsert()` with `onConflict: 'child_id,work_name'` instead of `.insert()`

## Other Fixes
- **Curriculum page confirm dialog** — Fixed "220 works" → "268 works"
- **Student dashboard** — Colored circle badges (P, S, M, L, C) on CurriculumPicker
- **Progress duplicates** — Both `children/route.ts` and `children/bulk/route.ts` changed from `.insert()` to `.upsert()`

## Files Changed (15 files, +1029 -320 lines)

### Modified
- `lib/montree/supabase.ts` — Added fetchWithRetry
- `app/api/montree/principal/setup/route.ts` — Added description fields + shared client
- `app/api/montree/admin/reseed-curriculum/route.ts` — Added description fields
- `app/api/montree/curriculum/route.ts` — Switched to curriculum-loader + shared client
- `app/api/montree/admin/backfill-guides/route.ts` — Removed quick_guide filter, added work_key match
- `app/api/montree/reports/preview/route.ts` — Static curriculum fallback + shared client
- `app/api/montree/try/instant/route.ts` — Auto-seed curriculum + shared client
- `app/api/montree/children/route.ts` — Progress upsert
- `app/api/montree/auth/teacher/route.ts` — Shared client
- `app/api/montree/principal/login/route.ts` — Shared client
- `app/api/montree/teacher/register/route.ts` — Shared client
- `app/api/montree/dm/route.ts` — Shared client
- `app/montree/dashboard/curriculum/page.tsx` — 268 works count
- `app/montree/dashboard/students/page.tsx` — Colored badges + custom work

### New
- `app/api/montree/children/bulk/route.ts` — Bulk student import with resilient error handling

## Known Issues / Future Work

1. **64 API routes still use inline `getSupabase()`** — Should be migrated to shared client for retry logic
2. **Supabase connection intermittently times out** — The retry logic helps but the root cause appears to be network instability between the dev environment and Supabase's Cloudflare edge (172.64.149.246:443)
3. **`montessori_works` brain table** — Still partially populated. No longer used by any seeding path (all use curriculum-loader now), but the table exists and could cause confusion
4. **`seed/parent-descriptions.ts`** — 995 lines of descriptions, only imported by a script with a field mapping bug. Could be removed since comprehensive-guides now provides 100% coverage
5. **Migration 104** — Historical one-time backfill of 309 works. No longer needed for new classrooms but still relevant for any classroom seeded before this session
