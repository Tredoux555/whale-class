-- =============================================================================
-- 259  STORY COACH LOG — the archive of every Coach conversation
-- Run in the Supabase SQL Editor (graceful until run — logging is fire-and-forget).
-- =============================================================================
--
-- "It needs a brain." Beyond the distilled semantic memory (story_coach_memory),
-- this keeps the full archive of every exchange with the Coach — encrypted at
-- rest — so the record is referable (by Tredoux, or by desktop Claude working in
-- tandem). The Coach itself learns via memory; this is the durable transcript.
-- =============================================================================

CREATE TABLE IF NOT EXISTS story_coach_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text,
  question_enc    text NOT NULL,            -- AES-256-GCM 'gcm:iv:tag:ct'
  answer_enc      text,                     -- AES-256-GCM
  tools_used      text[],                   -- tool names called this turn (non-sensitive)
  cipher_version  int  NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_coach_log_recent ON story_coach_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_coach_log_convo ON story_coach_log (conversation_id, created_at);

ALTER TABLE story_coach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_coach_log FORCE ROW LEVEL SECURITY;
