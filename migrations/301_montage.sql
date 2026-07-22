-- 301_montage.sql
-- Weekly-report photo montage (Phase 3 — main-app integration).
-- =========================================================================
-- On weekly-report publish, a row is queued in montree_montage_jobs. A
-- separate Railway worker renders a beat-synced photo montage MP4, uploads it
-- to the montree-media bucket at
--   <school_id>/<child_id>/montages/<report_id>.mp4
-- sets montree_weekly_reports.montage_path to that bucket-relative path, and
-- calls POST /api/montree/internal/montage-complete to push-notify parents.
--
-- The montage is a pure enhancement: render failure must NEVER block or
-- degrade report delivery. School-level gate is montree_schools.montage_enabled
-- (default FALSE). A job is only enqueued when a report has >= 8 eligible photos.
--
-- RLS ENABLED with NO policies (deny-all for anon/authenticated; the server
-- reads/writes with the service role, which bypasses RLS — house style).
-- Idempotent. Safe to re-run. Run in the Supabase SQL Editor or via the pooler.
-- =========================================================================

BEGIN;

-- School-level opt-in gate + the rendered-file pointer on the report.
ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS montage_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE montree_weekly_reports
  ADD COLUMN IF NOT EXISTS montage_path TEXT;

-- The render queue. One job per report (unique on report_id).
CREATE TABLE IF NOT EXISTS montree_montage_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID NOT NULL REFERENCES montree_weekly_reports(id) ON DELETE CASCADE,
  child_id          UUID NOT NULL,
  school_id         UUID NOT NULL,
  classroom_id      UUID,
  status            TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','rendering','done','failed','skipped_insufficient_photos')),
  attempts          INTEGER NOT NULL DEFAULT 0,
  error             TEXT,
  output_path       TEXT,
  duration_seconds  NUMERIC,
  is_staging        BOOLEAN NOT NULL DEFAULT FALSE,
  next_attempt_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at        TIMESTAMPTZ,
  finished_at       TIMESTAMPTZ
);

-- One job per report — enqueue upserts on this.
CREATE UNIQUE INDEX IF NOT EXISTS idx_montage_jobs_report
  ON montree_montage_jobs (report_id);

-- Worker queue pickup: queued-first, oldest-first.
CREATE INDEX IF NOT EXISTS idx_montage_jobs_queue
  ON montree_montage_jobs (status, created_at)
  WHERE status = 'queued';

-- Deny-all RLS (server uses the service role → bypasses RLS).
ALTER TABLE montree_montage_jobs ENABLE ROW LEVEL SECURITY;

COMMIT;
