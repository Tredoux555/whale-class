-- 353_montage_video_clips.sql — video clips in montages
--
-- A montage used to be photos only: every selection path hard-filtered
-- media_type='photo'. It is now a MIXED timeline — Ken Burns photo segments
-- plus short video clips, still rendered into ONE mp4 by the Railway worker.
--
--   include_videos     FALSE renders the pre-353 photo-only film.
--   max_clip_seconds   per-clip cap; the worker takes the first N seconds,
--                      or N from the MIDDLE when the clip is > 2N long.
--
-- 🚨 DEPENDS ON migrations/354_montree_video_playback.sql
--    (montree_media.playback_path / transcode_status). Only a video with a
--    transcoded H.264/AAC playback_path is eligible; an untranscoded WebM is
--    skipped by the worker with a logged reason.
--
-- Clips count against the film's existing duration budget: the photo region
-- is shortened by exactly the seconds of clip that get spliced in, so the
-- montage still lands in its usual length window.

BEGIN;

ALTER TABLE montree_montage_jobs
  ADD COLUMN IF NOT EXISTS include_videos   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS max_clip_seconds INTEGER NOT NULL DEFAULT 8;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_montage_jobs_max_clip_seconds_check'
  ) THEN
    ALTER TABLE montree_montage_jobs
      ADD CONSTRAINT montree_montage_jobs_max_clip_seconds_check
      CHECK (max_clip_seconds BETWEEN 1 AND 30);
  END IF;
END $$;

COMMENT ON COLUMN montree_montage_jobs.include_videos IS
  'Admit media_type=video rows (transcoded playback_path only) into this montage';
COMMENT ON COLUMN montree_montage_jobs.max_clip_seconds IS
  'Per-clip cap in seconds; longer clips are trimmed (middle if > 2x the cap)';

INSERT INTO montree_migrations (filename) VALUES ('353_montage_video_clips.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- The worker treats a missing column as its legacy default (photos only,
-- 8-second cap), so code and database can be rolled back in either order.
--
--   ALTER TABLE montree_montage_jobs DROP COLUMN IF EXISTS include_videos;
--   ALTER TABLE montree_montage_jobs DROP COLUMN IF EXISTS max_clip_seconds;
