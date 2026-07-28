-- 306_montage_manager.sql — explicit photo selection for Montage Manager jobs
-- Adds an optional list of teacher-curated media ids. NULL = legacy behavior (worker re-queries by scope).
BEGIN;
ALTER TABLE montree_montage_jobs
  ADD COLUMN IF NOT EXISTS media_ids UUID[];
COMMIT;
-- Rollback: ALTER TABLE montree_montage_jobs DROP COLUMN IF EXISTS media_ids;
