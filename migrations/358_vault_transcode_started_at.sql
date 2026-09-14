-- 358_vault_transcode_started_at.sql
-- Follow-up to 357. 'processing' is written before a multi-minute ffmpeg pass;
-- a deploy, an OOM kill or a container restart mid-encode stranded the row in
-- 'processing' forever — the grid spun "Converting…" and polled for eternity,
-- and nothing could reclaim it. This stamp lets a claim older than 20 minutes
-- be treated as dead and retried.
--
-- NULL on every existing row; a 'processing' row with a NULL stamp predates
-- this column and is therefore also treated as stale.
--
-- Purely additive. Idempotent.

BEGIN;

ALTER TABLE vault_files ADD COLUMN IF NOT EXISTS transcode_started_at timestamptz;

COMMIT;
