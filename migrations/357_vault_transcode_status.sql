-- 357_vault_transcode_status.sql
-- Story vault: iPhone .MOV uploads are usually HEVC (hvc1). Safari plays them;
-- Chrome / Firefox / Android do not — the viewer shows a black screen. The
-- server now transcodes every non-H.264 vault video to H.264/AAC MP4 after
-- upload and rewrites vault_files.file_url to the playable copy.
--
--   transcode_status  NULL | 'pending' | 'processing' | 'done' | 'failed' | 'skipped'
--                     NULL  = never looked at (every pre-existing row, and
--                             every image — images are never queued).
--                     'skipped' = probed, already H.264 in an MP4 container,
--                                 nothing to do.
--                     'failed'  = ffmpeg could not convert it; the ORIGINAL is
--                                 untouched and still plays in Safari.
--
-- Purely additive. Idempotent. No existing column is altered or dropped.

BEGIN;

ALTER TABLE vault_files ADD COLUMN IF NOT EXISTS transcode_status text;

-- The backlog/retry scan: unfinished video conversions only. Partial index so
-- it stays tiny (the steady state is zero rows).
CREATE INDEX IF NOT EXISTS idx_vault_files_transcode_pending
  ON vault_files (id)
  WHERE deleted_at IS NULL
    AND transcode_status IN ('pending', 'processing', 'failed');

COMMIT;
