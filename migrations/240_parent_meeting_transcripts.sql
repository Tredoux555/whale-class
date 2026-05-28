-- migrations/240_parent_meeting_transcripts.sql
-- Ultimate Tracy Phase B (May 28, 2026).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into Supabase SQL Editor.
--
-- PURPOSE
--   Encrypted-at-rest transcripts for parent meetings. Audio is NEVER
--   persisted — it flows request → Whisper → text → buffer destroyed.
--   This table only stores the DECRYPTED-LATER-VIA-KEY text. Encryption
--   uses lib/montree/messaging-crypto.ts (AES-256-GCM via
--   MONTREE_ENCRYPTION_KEY env var). Format: 'gcm:<iv>:<tag>:<ct>'.
--
-- PRIVACY POSTURE (load-bearing — see Section 4 of the marathon handoff)
--   1. audio_destroyed_at is the audit-trail timestamp proving the audio
--      blob was discarded after transcription.
--   2. transcript_text_encrypted MUST start with 'gcm:' — application
--      code refuses to write plaintext.
--   3. The encryption key is global (MONTREE_ENCRYPTION_KEY); per-record
--      decrypt is fine within a school's auth context.
--   4. DELETE on this row + DELETE on the parent_meeting row above
--      both cascade from parent deletion — no orphans remain.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_parent_meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  meeting_id UUID NOT NULL REFERENCES montree_parent_meetings(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Encrypted transcript text. AES-256-GCM via messaging-crypto.ts.
  -- Format: 'gcm:<iv-hex>:<tag-hex>:<ct-hex>'. NEVER plaintext.
  transcript_text_encrypted TEXT NOT NULL,
  encryption_version INTEGER NOT NULL DEFAULT 1,

  -- Whisper metadata.
  locale_detected TEXT,
  whisper_model_used TEXT,
  -- How many audio chunks Whisper processed (1 for short meetings,
  -- up to 3 for 60-minute meetings that chunked at ~20-min boundaries).
  chunk_count INTEGER NOT NULL DEFAULT 1,

  -- Cost telemetry.
  cost_usd NUMERIC(10, 4),
  generation_ms INTEGER,

  -- Audit trail: proof we destroyed the audio.
  audio_destroyed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_meeting_transcripts_meeting
  ON montree_parent_meeting_transcripts (meeting_id);

CREATE INDEX IF NOT EXISTS idx_parent_meeting_transcripts_school
  ON montree_parent_meeting_transcripts (school_id);

COMMIT;

-- After running:
--   SELECT count(*) FROM montree_parent_meeting_transcripts; -- 0
