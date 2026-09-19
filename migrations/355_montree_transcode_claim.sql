-- 355_montree_transcode_claim.sql
-- Makes the video transcode queue SELF-DRIVING and crash-safe.
--
-- Why: the transcode was fire-and-forget from the upload route. Railway
-- redeploys many times a day, and a redeploy kills the in-flight ffmpeg —
-- leaving the row stuck on 'pending'/'processing' forever, because nothing
-- was scheduled to come back for it. An in-process sweep now runs every 5
-- minutes (instrumentation.ts -> lib/montree/media/transcode-sweep.ts) and
-- needs three things this migration adds:
--
--   transcode_started_at  when the current attempt CLAIMED the row. A row in
--                         'processing' older than 15 minutes is a casualty of
--                         a redeploy and goes back to 'pending'.
--   transcode_attempts    so a genuinely undecodable file is retried a bounded
--                         number of times (3) instead of burning CPU forever.
--   transcode_error       the last failure message, so a stuck clip can be
--                         diagnosed from SQL instead of from Railway logs that
--                         have already rolled over.
--
-- Purely additive and idempotent. Every code path is 42703-safe, so the app
-- runs correctly before this is applied — it just cannot reclaim stale rows.

BEGIN;

ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS transcode_started_at timestamptz;
ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS transcode_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS transcode_error text;

-- The sweep's claim scan: un-finished videos, oldest first.
CREATE INDEX IF NOT EXISTS idx_montree_media_transcode_queue
  ON montree_media (transcode_status, created_at)
  WHERE media_type = 'video' AND transcode_status IS DISTINCT FROM 'done';

COMMENT ON COLUMN montree_media.transcode_started_at IS 'When the current transcode attempt claimed this row (stale > 15 min = reclaim)';
COMMENT ON COLUMN montree_media.transcode_attempts IS 'Number of transcode attempts; the sweep stops retrying failures at 3';
COMMENT ON COLUMN montree_media.transcode_error IS 'Last transcode failure message (NULL once it succeeds)';

INSERT INTO montree_migrations (filename) VALUES ('355_montree_transcode_claim.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
