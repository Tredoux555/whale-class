-- 354_montree_video_playback.sql
-- iOS video playback: teacher-recorded clips were VP9/Opus WebM, which
-- Safari/QuickTime cannot decode. We now transcode to H.264/AAC MP4 server-side
-- and remember where the playable copy lives.
--
--   playback_path     storage path of the H.264 MP4 (same dir as the original).
--                     NULL  = no transcoded copy yet, play storage_path directly.
--   transcode_status  NULL | 'pending' | 'processing' | 'done' | 'failed'
--                     NULL on every photo row and on pre-existing videos until
--                     the backfill cron picks them up.
--
-- The poster frame is stored in the EXISTING thumbnail_path column (a JPEG),
-- so no new poster column is needed and every surface that already reads
-- thumbnail_path gets a video poster for free.

BEGIN;

ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS playback_path text;
ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS transcode_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_media_transcode_status_check'
  ) THEN
    ALTER TABLE montree_media
      ADD CONSTRAINT montree_media_transcode_status_check
      CHECK (transcode_status IS NULL OR transcode_status IN ('pending','processing','done','failed'));
  END IF;
END $$;

-- Backfill/cron scan: oldest un-transcoded videos first.
CREATE INDEX IF NOT EXISTS idx_montree_media_transcode_pending
  ON montree_media (created_at)
  WHERE media_type = 'video' AND playback_path IS NULL;

COMMENT ON COLUMN montree_media.playback_path IS 'Storage path of the H.264/AAC MP4 playback copy (NULL = play storage_path directly)';
COMMENT ON COLUMN montree_media.transcode_status IS 'NULL | pending | processing | done | failed';

INSERT INTO montree_migrations (filename) VALUES ('354_montree_video_playback.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
