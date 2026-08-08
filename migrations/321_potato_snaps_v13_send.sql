-- =============================================================================
-- 321_potato_snaps_v13_send.sql — Review before send
-- =============================================================================
-- NEW PRODUCT LAW (founder, Aug 8 2026, after a film reached parents unseen):
-- MAKE and SEND are two separate teacher actions, with a preview in between.
-- Nothing reaches a parent unseen.
--
-- One nullable column carries the whole rule: a job is *rendered* when
-- status='done', and *published* only when sent_at IS NOT NULL. The parent feed
-- requires both; the teacher sees everything.
--
-- This is the same shape migration 307 gave montree_montage_jobs for the same
-- reason — a proven pattern, not a new invention.
--
-- 🚨 BACKFILL IS LOAD-BEARING. Every film that already exists was, under v1.2,
-- visible to parents the moment it rendered. Families have seen them. Adding a
-- gate without backfilling would silently RETRACT films from feeds overnight —
-- a worse failure than the one this migration fixes. So everything already done
-- is marked sent, at the time it completed.
--
-- 🚨 NO storage statements (Aug 7: a storage-schema write rolls the whole
-- transaction back on this project's permissions).
--
-- IDEMPOTENT: safe to run more than once. The backfill is guarded on
-- `sent_at IS NULL`, so a second run cannot re-stamp a film the teacher has
-- since deliberately left unsent... with one honest caveat: a film rendered
-- BETWEEN the first and second run would also be treated as legacy and
-- auto-sent. Run it once; the guard is for accidents, not for a schedule.
--
-- Next free number verified against the Mac on Aug 8, 2026: the repo's highest
-- migration is 320_potato_snaps_v12_dedup.sql, so this is 321.
-- =============================================================================

BEGIN;

ALTER TABLE tp_montage_jobs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Existing films were already parent-visible. Keep them that way.
-- completed_at is the honest timestamp (when it became visible); fall back to
-- created_at for any legacy row that finished without one.
UPDATE tp_montage_jobs
   SET sent_at = COALESCE(completed_at, created_at)
 WHERE status = 'done'
   AND sent_at IS NULL;

-- The parent feed's query is (class_id, status, sent_at) — index the shape it
-- actually asks for.
CREATE INDEX IF NOT EXISTS idx_tp_montage_jobs_published
  ON tp_montage_jobs (class_id, status, sent_at);

COMMIT;

-- =============================================================================
-- Verify (paste separately after the migration):
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'tp_montage_jobs' AND column_name = 'sent_at';
--   -- expect: sent_at | timestamp with time zone | YES
--
--   SELECT status,
--          COUNT(*)                                   AS jobs,
--          COUNT(*) FILTER (WHERE sent_at IS NOT NULL) AS sent
--     FROM tp_montage_jobs
--    GROUP BY status ORDER BY status;
--   -- expect: every 'done' row has sent = jobs (the backfill).
--   --         queued / processing / failed rows must all have sent = 0.
-- =============================================================================
