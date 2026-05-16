-- Migration 213: montree_outreach_log retention scaffolding + drip-action uniqueness
--
-- Session 113 V2 Outreach audit MED F-7.1 + MED F-7.4 closure.
--
-- Two concerns, one migration:
--
-- 1. F-7.1 — Retention. montree_outreach_log grows unbounded. At ~500 rows/day
--    the table hits the implicit PostgREST 1000-row cap inside ~2 days and
--    becomes a real risk to the idempotency reads at >1 year. The legacy
--    drip-cron pagination patch (F-5.1, already shipped) buys time, but the
--    table itself needs a retention strategy. This migration creates an
--    archive table + a SECURITY DEFINER Postgres function that moves rows
--    older than the cutoff and deletes them in one atomic step. Callers can
--    invoke the function on a daily Railway cron or manually from super-admin.
--
-- 2. F-7.4 — Drip race condition. Two cron triggers firing in the same minute
--    (manual + scheduled, or Railway retry) both read priorSends, both miss
--    the day key, both fire the email, both insert the log row. The fix is
--    a UNIQUE partial index on `(idempotency_key)` for drip actions. The
--    idempotency_key is deterministically derived as
--    `{action}::{subject_id}` (subject_id = contact_id for demo-request drips,
--    school_id for trial drips). The drip routes will switch to INSERT-then-
--    send: insert the claim row first, on 23505 unique_violation skip the
--    send because another runner already claimed it.
--
-- Architectural rules locked in:
--   * Retention archive preserves the per-row audit trail forever — moves,
--     never deletes. Keeps last-N days in the hot table; archive is read-only
--     long-term storage.
--   * Drip idempotency is a UNIQUE-constraint contract, not a "read then
--     check Set" pattern. The DB enforces single-send.
--   * idempotency_key is nullable so non-drip log rows (status changes, demo
--     requests, bulk imports) don't need to compute one. The partial UNIQUE
--     index only covers rows where idempotency_key IS NOT NULL.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- 1. Drip idempotency key column.
--    Drip routes will populate this column with `{action}::{subject_id}` on
--    every drip-row INSERT. Non-drip rows leave it NULL.
ALTER TABLE montree_outreach_log
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Partial UNIQUE index — the DB-level race guard.
--    Filtered to idempotency_key NOT NULL so non-drip rows are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_log_idempotency_key_unique
  ON montree_outreach_log (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Archive table — same schema shape as montree_outreach_log + an
--    archived_at column to track when the row was moved. No FK on
--    contact_id (the source row might be archived or deleted by the time
--    we move it; we keep the historical value verbatim).
CREATE TABLE IF NOT EXISTS montree_outreach_log_archive (
  id UUID PRIMARY KEY,
  action TEXT NOT NULL,
  contact_id UUID,
  details JSONB DEFAULT '{}',
  notes TEXT,
  metadata JSONB,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_log_archive_created
  ON montree_outreach_log_archive (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_log_archive_action
  ON montree_outreach_log_archive (action);
CREATE INDEX IF NOT EXISTS idx_outreach_log_archive_contact
  ON montree_outreach_log_archive (contact_id)
  WHERE contact_id IS NOT NULL;

-- 4. Retention RPC — moves rows older than `p_cutoff_days` from the hot
--    table to the archive in one atomic statement (CTE-based MOVE), then
--    deletes from the source. Returns the count of rows moved.
--
--    Default cutoff 90 days matches the F-7.1 fix sketch in the audit doc.
--    Daily cron can call this with default args; manual super-admin run can
--    pass a different cutoff for one-off cleanup.
CREATE OR REPLACE FUNCTION archive_old_outreach_log(
  p_cutoff_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moved INTEGER;
  v_cutoff TIMESTAMPTZ;
BEGIN
  IF p_cutoff_days IS NULL OR p_cutoff_days < 7 THEN
    RAISE EXCEPTION 'archive_old_outreach_log: cutoff must be >= 7 days (got %)',
      p_cutoff_days;
  END IF;

  v_cutoff := NOW() - (p_cutoff_days::TEXT || ' days')::INTERVAL;

  -- Atomic MOVE: insert into archive + delete from hot, in one CTE.
  WITH moved AS (
    DELETE FROM montree_outreach_log
    WHERE created_at < v_cutoff
    RETURNING id, action, contact_id, details, notes, metadata,
              idempotency_key, created_at
  )
  INSERT INTO montree_outreach_log_archive
    (id, action, contact_id, details, notes, metadata,
     idempotency_key, created_at, archived_at)
  SELECT id, action, contact_id, details, notes, metadata,
         idempotency_key, created_at, NOW()
  FROM moved;

  GET DIAGNOSTICS v_moved = ROW_COUNT;
  RETURN v_moved;
END;
$$;

GRANT EXECUTE ON FUNCTION archive_old_outreach_log(INTEGER) TO service_role;

COMMIT;
