# Session 165 Handoff — Feb 9, 2026: Schema Audit + Rollback + Plan

## What happened

Session 164 rebuilt Montree Home from scratch (16 API routes, 15 pages, migration). When tested on the live site, **13 of 16 routes were broken** — 500 errors across curriculum, children, progress.

Root cause: the code was written against migration files (`120_home_tables.sql`, `101_home_rebuild.sql`) that **do not match the real live database**. The live tables were set up earlier (likely via Supabase UI) and have completely different column names, types, and table names.

This is the **third time** the Home system has been rebuilt from scratch and failed for the exact same reason.

## What was done

1. **Diagnosed** seed failure: `seedHomeCurriculum()` tried to insert 19 columns into a 7-column table
2. **Diagnosed** children creation failure: `birth_date` is NOT NULL but code only sent `age`
3. **Audited** all 16 API routes — found 13 broken (5 referenced non-existent tables)
4. **Rolled back** all Session 164 commits (4 total: `0cc245f`, `b451269`, `a649f5c`, `3d758c9`)
5. **Revert commit**: `d2f6c0c` — 45 files changed, restored to identical state as `bfe1774`
6. **Queried the actual live database** via `information_schema.columns`
7. **Saved real schema** to `docs/HOME_LIVE_SCHEMA.md` — this is the source of truth
8. **Wrote implementation plan** at `.claude/plans/vivid-pondering-cascade.md`

## The real database (summary of mismatches)

| Code assumed | Reality |
|---|---|
| Table `home_progress` | Table `home_child_progress` |
| `status` is TEXT ('not_started') | `status` is INTEGER (0,1,2,3) |
| Progress FK is `work_name` (text) | Progress FK is `curriculum_work_id` (uuid) |
| `presented_at` (timestamptz) | `presented_date` (date) |
| `mastered_at` (timestamptz) | `mastered_date` (date) |
| Children needs only `age` | `birth_date` is NOT NULL |
| `home_curriculum` has 7 columns | `home_curriculum` has 23 columns |
| Seed from JSON file | Should seed from `home_curriculum_master` table |
| Tables: home_observations, home_media, home_weekly_reports, home_guru_interactions | None of these exist |

## Current state of the code

Everything is rolled back to `bfe1774`. The code has:
- `lib/home/curriculum-helpers.ts` — seeds from JSON, only 5 columns
- `app/api/home/children/route.ts` — no birth_date, references wrong progress table
- `app/api/home/curriculum/route.ts` — selects 6 of 23 columns, enriches from JSON
- `app/api/home/progress/*` — all reference `home_progress` (doesn't exist)

## Pre-flight queries (run before next session)

```sql
-- 1. Does home_curriculum_master have data?
SELECT count(*) FROM home_curriculum_master;

-- 2. What constraints exist on home_child_progress?
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'home_child_progress'::regclass;

-- 3. Any existing curriculum data for families?
SELECT family_id, count(*) FROM home_curriculum GROUP BY family_id;
```

## Next session: implementation plan

Full plan is at `.claude/plans/vivid-pondering-cascade.md`. Six phases:

1. Fix `curriculum-helpers.ts` — seed from `home_curriculum_master` table, remove JSON
2. Fix `children/route.ts` — compute `birth_date` from age, use `home_child_progress` with uuid FK
3. Fix `curriculum/route.ts` — select all 23 columns, no JSON enrichment
4. Fix progress routes (3 files) — correct table name, integer status, uuid FK, date columns
5. Update frontend pages for new response shapes
6. Cleanup — delete JSON file, drop duplicate table

## Critical rule for all future Home work

**NEVER code against migration files. ALWAYS code against `docs/HOME_LIVE_SCHEMA.md`.**

The live database was set up before the migrations were written. The migrations describe a fantasy schema. The `HOME_LIVE_SCHEMA.md` file was queried directly from `information_schema.columns` on the live Supabase instance and is the only source of truth.
