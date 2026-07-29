-- 307_montage_send.sql — "Send to parents" for finished montages
-- Stamps the moment a teacher released a montage to the parent feed.
-- NULL = never sent (teacher-only, the historical behaviour for every
-- existing row). Re-sending simply overwrites the timestamp.
BEGIN;
ALTER TABLE montree_montage_jobs
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
COMMIT;
-- Rollback: ALTER TABLE montree_montage_jobs DROP COLUMN IF EXISTS sent_at;
