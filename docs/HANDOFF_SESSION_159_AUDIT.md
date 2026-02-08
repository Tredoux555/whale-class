# Session 159 Handoff — Montree System Audit & Fixes

## What Happened This Session

Full end-to-end audit of the Montree system (Classroom + Home). Found 17 bugs, fixed 10 (code + SQL), deferred 5.

### Phase 1: Deep Audit
- Audited every frontend page, DB migration, and API route
- Cross-referenced code expectations against live DB schema
- Found `montree_children` table was missing entirely (39+ routes depend on it)
- Found 12 missing columns on `montree_classroom_curriculum_works`
- Found missing RLS on all 5 home tables

### Phase 2: SQL Fixes (MONTREE-AUDIT-FIX.sql)
Script was provided to user in chat. Covers:
- **BUG-1**: `ALTER TABLE home_curriculum ALTER COLUMN name DROP NOT NULL` — seeding was failing
- **BUG-10**: `UNIQUE(family_id, work_name)` constraint on home_curriculum
- **BUG-3**: CREATE TABLE IF NOT EXISTS for 5 missing montree_ tables
- **BUG-2**: ADD COLUMN IF NOT EXISTS for 12 columns on montree_classroom_curriculum_works
- **BUG-7**: ENABLE RLS + service_role policies on all 5 home tables
- `NOTIFY pgrst, 'reload schema'`

**STATUS: User was given the SQL. Needs to be confirmed it was run.**

### Phase 3: Code Fixes (7 API routes)
| File | Fix |
|------|-----|
| `app/api/montree/curriculum/route.ts` | Removed `.single()` on insert, added detailed error logging |
| `app/api/montree/media/route.ts` | Fixed `area` → `area_id` with proper relation join (2 places) |
| `app/api/home/progress/update/route.ts` | Auto-lookups `area` from curriculum when not provided |
| `app/api/home/auth/try/route.ts` | Debug info gated behind NODE_ENV (2 places) |
| `app/api/home/debug/route.ts` | Returns 403 in production |
| `app/api/montree/progress/update/route.ts` | Preserves original `mastered_at` date |
| `app/api/montree/progress/route.ts` | Returns 404 for missing child, 500 for real DB errors |

### Phase 4: Sequence Positioning Fix
After the audit fixes, the "Add Work" feature in Classroom worked (no more 500!) but positioned works wrong — always at #1 instead of the selected position.

**Root Cause**: `mergeWorksWithCurriculum()` in `lib/montree/work-matching.ts` overwrites every work's real DB sequence with `idx + 1` (array index). The wheel picker then sends this fake index to the API instead of the real DB sequence.

**Fix**: Added `dbSequence` field to preserve the real DB sequence through the merge process:

| File | Change |
|------|--------|
| `components/montree/curriculum/types.ts` | Added `dbSequence?: number` to MergedWork interface |
| `lib/montree/work-matching.ts` | `dbSequence: w.sequence` before overwriting `sequence: idx + 1` |
| `components/montree/WorkWheelPicker.tsx` | Uses `afterWork?.dbSequence ?? afterWork?.sequence` for API calls |
| `app/montree/dashboard/[childId]/page.tsx` | Added `dbSequence` in all 3 curriculum loading paths |

**Data flow**: API returns real sequence → page stores as `dbSequence` → merge preserves `dbSequence` → picker reads `dbSequence` → sends real value to API → backend positions correctly.

## Commits
- `963035a` — Fix: Montree system audit — 7 API bug fixes + SQL migration script
- `7e0dd28` — Fix: Work sequence positioning — preserve real DB sequences through merge

## What To Do Next

### Immediate (test the fix)
1. Open classroom → child → wheel picker → "Add custom work" → pick position after #17
2. Verify it lands at #18 (not #1)
3. Confirm MONTREE-AUDIT-FIX.sql was run in Supabase

### Deferred Bugs (lower priority)
- **BUG-5**: Rate-limit `/api/home/auth/try` — 6-char codes are brute-forceable
- **BUG-8**: Rate-limit `/api/home/auth/enter` — same concern
- **BUG-12**: Race condition in curriculum reorder (concurrent drag-drop can corrupt sequences)
- **BUG-13**: Inconsistent error response format across APIs (some return `{error}`, others `{message}`)
- **BUG-17**: Hardcoded status strings like `'mastered'`, `'practicing'` — should be shared constants

### SEO (from Session 158)
- Check Google Search Console for indexing status
- Expand landing pages for better ranking
- Register on Bing Webmaster Tools
