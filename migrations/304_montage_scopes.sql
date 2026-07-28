-- 304_montage_scopes.sql
-- Montage Studio — Daily / Weekly / Custom montages across three scopes.
-- =========================================================================
-- 301 built montree_montage_jobs as a strictly per-weekly-report queue:
-- report_id NOT NULL UNIQUE, child_id NOT NULL. This migration generalises
-- the SAME queue (one worker, one poll loop) to also carry teacher-initiated
-- montages that have no report behind them:
--
--   scope_type   'report'    — the untouched weekly-report montage (default)
--                'classroom' — every confirmed, parent-visible photo in a
--                              classroom over a date range
--                'child'     — one child over a date range
--                'event'     — every photo linked to a montree_events row
--   montage_kind 'report' | 'daily' | 'weekly' | 'custom'
--
-- 🚨 EXISTING BEHAVIOUR IS UNCHANGED. Every column added here is nullable or
-- defaulted, existing rows are backfilled to ('report','report'), and the
-- report enqueue/regenerate paths keep writing exactly the columns they did.
--
-- 🚨 idx_montage_jobs_report is deliberately left as a PLAIN unique index,
-- NOT a partial `WHERE report_id IS NOT NULL` one. Postgres already treats
-- NULLs as distinct in a unique index, so any number of scoped (report_id
-- NULL) jobs coexist under it. Making it partial would break the existing
-- `.upsert(..., { onConflict: 'report_id' })` calls in
-- lib/montree/montage/enqueue.ts and the weekly-wrap/montage route —
-- PostgREST emits `ON CONFLICT (report_id)` with no index predicate, which
-- cannot infer a partial index and errors with 42P10.
--
-- RLS stays deny-all (server uses the service role). Idempotent, re-runnable.
-- =========================================================================

BEGIN;

-- Scoped jobs have no report and (for classroom/event scopes) no child.
ALTER TABLE montree_montage_jobs ALTER COLUMN report_id DROP NOT NULL;
ALTER TABLE montree_montage_jobs ALTER COLUMN child_id  DROP NOT NULL;

ALTER TABLE montree_montage_jobs
  ADD COLUMN IF NOT EXISTS scope_type   TEXT NOT NULL DEFAULT 'report',
  ADD COLUMN IF NOT EXISTS montage_kind TEXT NOT NULL DEFAULT 'report',
  ADD COLUMN IF NOT EXISTS date_start   DATE,
  ADD COLUMN IF NOT EXISTS date_end     DATE,
  ADD COLUMN IF NOT EXISTS event_id     UUID REFERENCES montree_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title        TEXT;

-- Backfill (no-op on a fresh column with a DEFAULT, but explicit + safe on a
-- re-run where an earlier partial apply left NULLs behind).
UPDATE montree_montage_jobs SET scope_type   = 'report' WHERE scope_type   IS NULL;
UPDATE montree_montage_jobs SET montage_kind = 'report' WHERE montage_kind IS NULL;

-- Value constraints, added idempotently (ADD CONSTRAINT has no IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_montage_jobs_scope_type_check'
  ) THEN
    ALTER TABLE montree_montage_jobs
      ADD CONSTRAINT montree_montage_jobs_scope_type_check
      CHECK (scope_type IN ('report','classroom','child','event'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_montage_jobs_montage_kind_check'
  ) THEN
    ALTER TABLE montree_montage_jobs
      ADD CONSTRAINT montree_montage_jobs_montage_kind_check
      CHECK (montage_kind IN ('report','daily','weekly','custom'));
  END IF;

  -- A report job must still carry its report; a scoped job must not pretend
  -- to be one. Cheap invariant that keeps the worker's branch honest.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_montage_jobs_scope_shape_check'
  ) THEN
    ALTER TABLE montree_montage_jobs
      ADD CONSTRAINT montree_montage_jobs_scope_shape_check
      CHECK (
        (scope_type = 'report'    AND report_id IS NOT NULL AND child_id IS NOT NULL)
        OR (scope_type = 'child'  AND child_id  IS NOT NULL)
        OR (scope_type = 'event'  AND event_id  IS NOT NULL)
        OR (scope_type = 'classroom')
      );
  END IF;
END $$;

-- Status CHECK is unchanged — scoped jobs reuse the same lifecycle
-- (queued → rendering → done / failed / skipped_insufficient_photos).

-- Teacher "Recent montages" list: newest-first per classroom.
CREATE INDEX IF NOT EXISTS idx_montage_jobs_classroom_created
  ON montree_montage_jobs (classroom_id, created_at DESC);

-- Duplicate-suppression lookup for POST /api/montree/montage.
CREATE INDEX IF NOT EXISTS idx_montage_jobs_scope_active
  ON montree_montage_jobs (school_id, scope_type, montage_kind, status)
  WHERE scope_type <> 'report';

COMMIT;
