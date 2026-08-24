-- =============================================================================
-- 338_potato_video.sql — Potato Snaps: video lives in tp_photos
-- =============================================================================
-- A teacher can now pick a VIDEO out of her phone's library and save it into
-- the week, alongside the photos. There is no in-app recording: the library
-- pick is the whole feature.
--
-- 🚨 WHY VIDEO ROWS LIVE IN tp_photos AND NOT IN A NEW TABLE
-- Everything a video needs is already true of a photo row: it belongs to a
-- class, it was captured at an instant, it is tagged with children, it may
-- carry a scene, and it is one object in the private `potato-snaps` bucket
-- addressed by `storage_path`. A second table would mean a second week query,
-- a second tag junction, a second delete path and a second proxy grammar —
-- four places to drift out of step for zero new facts. So `media_type` is a
-- discriminator on the row that already exists, defaulted to 'photo' so every
-- one of the rows already in this table stays correct with no backfill.
--
-- 🚨 WHAT THIS MIGRATION DELIBERATELY DOES NOT DO
-- It does not touch the montage pipeline. potato-worker/ renders stills and
-- stays photos-only; lib/potato/db.ts's loadWeekPhotos filters to
-- media_type='photo' by DEFAULT, so the board's counts, the child film and the
-- class film are byte-for-byte what they were before this migration. Only the
-- per-child review screen asks for video as well.
--
-- 🚨 NO storage.buckets STATEMENTS IN HERE — same rule as 319. A write to the
--    storage schema inside this transaction rolls the WHOLE migration back on
--    this project's permissions. Checked on Aug 24, 2026 against production:
--
--      SELECT id, public, file_size_limit, allowed_mime_types
--        FROM storage.buckets WHERE id = 'potato-snaps';
--      -- potato-snaps | false | NULL | NULL
--
--    `file_size_limit` is NULL — the bucket carries NO explicit per-bucket cap,
--    so there is nothing here to raise and nothing to guess at. The ceiling
--    that actually applies is the PROJECT-level storage upload limit in the
--    Supabase dashboard, which is not reachable from SQL. The app's own caps
--    (10MB photo / 200MB video, app/api/potato/photos/upload/route.ts) are the
--    enforced limits either way.
--
-- IDEMPOTENT: safe to run more than once.
--
-- Next free number verified against the Mac on Aug 24, 2026: the repo's
-- highest migration is 337_evaluation_org_rls_lockdown.sql, so this is 338.
-- =============================================================================

BEGIN;

-- ----------------------------------------------------------------- tp_photos

-- 'photo' keeps every existing row correct without a backfill. The CHECK is
-- the wall: a third media kind is a product decision, not a stray string.
ALTER TABLE tp_photos
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'photo';

-- Added separately and guarded, so re-running on a database that already has
-- the constraint does not error out the whole transaction.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tp_photos_media_type_check'
  ) THEN
    ALTER TABLE tp_photos
      ADD CONSTRAINT tp_photos_media_type_check
      CHECK (media_type IN ('photo', 'video'));
  END IF;
END $$;

-- Client-reported, in seconds, and NULL for a photo. NUMERIC rather than INT
-- because a picked file's duration is a float ("12.734") and rounding it at
-- the door loses the only length signal we have — there is no ffprobe in this
-- pipeline, by design.
ALTER TABLE tp_photos
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;

-- The stored object's size, as measured server-side at upload. Never trusted
-- from the client: it is written from the byte count the route actually read.
ALTER TABLE tp_photos
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- The review screen asks "this class, this week, everything" and the board and
-- both films ask "this class, this week, photos only". A partial index on the
-- photo case keeps the film path — the hot one — reading exactly what it did
-- before media_type existed.
CREATE INDEX IF NOT EXISTS idx_tp_photos_class_captured_photo
  ON tp_photos (class_id, captured_at)
  WHERE media_type = 'photo';

COMMIT;

-- =============================================================================
-- Verify (optional — paste separately after the migration):
--   SELECT column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_name = 'tp_photos'
--      AND column_name IN ('media_type', 'duration_seconds', 'file_size_bytes')
--    ORDER BY column_name;
--   -- expect 3 rows: duration_seconds numeric YES,
--   --                file_size_bytes bigint YES,
--   --                media_type text NO 'photo'::text
--
--   SELECT media_type, COUNT(*)::int FROM tp_photos GROUP BY media_type;
--   -- expect every pre-existing row to read 'photo'
-- =============================================================================
