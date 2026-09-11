-- 355_montage_media_edits.sql — per-item edits for a hand-curated montage
--
-- Montage Studio lets a teacher preview every photo/clip she picked and edit
-- it BEFORE the film is rendered: trim a video's in/out point, crop a video
-- into the 9:16 montage frame. Those decisions ride along with the job.
--
--   media_edits  jsonb array, one entry per EDITED item (unedited items are
--                simply absent — an empty array is the historical behaviour):
--
--     [
--       { "media_id": "uuid",
--         "in_sec":  0,        -- optional, seconds from the start of the clip
--         "out_sec": 6.5,      -- optional, 0 <= in < out <= 30, out-in >= 1
--         "crop": { "x": 0, "y": 0, "width": 1080, "height": 1920 }
--       }
--     ]
--
-- 🚨 `crop` is in SOURCE PIXEL coordinates and is VIDEO ONLY. A photo is
--    cropped up-front through POST /api/montree/media/crop (sharp, server
--    side, replace_original), which repoints montree_media.storage_path — so
--    the worker never needs to know a photo was cropped.
--
-- 🚨 media_edits is meaningless without media_ids (migration 306): an edit
--    entry whose media_id is not in the job's media_ids is rejected by the
--    API and ignored by the worker.
--
-- 🚨 DEPENDS ON migrations/306_montage_manager.sql (media_ids) and
--    migrations/353_montage_video_clips.sql (include_videos / max_clip_seconds
--    — the per-clip cap the worker raises to honour the teacher's own trim).

BEGIN;

ALTER TABLE montree_montage_jobs
  ADD COLUMN IF NOT EXISTS media_edits jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN montree_montage_jobs.media_edits IS
  'Montage Studio per-item edits: [{media_id, in_sec?, out_sec?, crop?:{x,y,width,height}}]. crop is in SOURCE PIXEL coords and applies to VIDEO rows only (photos are pre-cropped via /api/montree/media/crop). Empty array = no edits = pre-355 behaviour.';

INSERT INTO montree_migrations (filename) VALUES ('355_montage_media_edits.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- Both the API (insert retried without the column on 42703) and the worker
-- (missing column => no edits) treat an absent column as "no edits", so code
-- and database can be rolled back in either order.
--
--   ALTER TABLE montree_montage_jobs DROP COLUMN IF EXISTS media_edits;
