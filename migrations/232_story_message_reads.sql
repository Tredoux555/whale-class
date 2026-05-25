-- 232_story_message_reads.sql
-- Read receipts for the Story system.
--
-- Records which Story user has opened (read) which message. The admin
-- dashboard's Message History uses this to show, per admin message,
-- whether the user has actually opened it — admin-side only.
--
-- A row is written the first time a Story user fetches a message into an
-- open chat. UNIQUE(message_id, username) + ON CONFLICT DO NOTHING means
-- read_at captures the FIRST time they saw it and never moves afterwards.
--
-- No foreign keys — consistent with the rest of the Story schema, which
-- keys loosely by message id (bigint) and username (text).
--
-- Idempotent. Safe to re-run. Run in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS story_message_reads (
  id          BIGSERIAL PRIMARY KEY,
  message_id  BIGINT NOT NULL,
  username    TEXT NOT NULL,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, username)
);

CREATE INDEX IF NOT EXISTS idx_story_message_reads_message
  ON story_message_reads (message_id);
