-- migrations/223_appointment_recordings.sql
--
-- The killer-feature migration. Three things land here:
--   1. montree_appointment_recordings — recordings + transcripts + AI summaries
--      per appointment. Persistent meeting memory across the school year.
--   2. montree_appointments.provider + recording_enabled — per-appointment
--      provider + recording stamping. Lets schools mix Jitsi (legacy / free)
--      and Agora (premium native + recording) without migrating data.
--   3. Two feature flags:
--        agora_video_calls — flip schools onto Agora as their video provider.
--          When ON, new bookings use provider='agora' by default; existing
--          appointments keep whatever was stamped at book-time.
--        video_recording — enable Cloud Recording + Whisper transcription +
--          Sonnet summarisation pipeline. Off by default — schools opt in.
--          Each appointment can also opt out individually.
--
-- WHY SEPARATE FLAGS:
--   - You can have agora_video_calls=ON without recording (clean migration
--     from Jitsi, no privacy / storage / cost decisions yet).
--   - You can have video_recording=ON only with Agora (Jitsi recording is
--     a different beast we don't support).
--   - The route logic checks BOTH flags before starting a recording.
--
-- COST MODEL (Agora + Whisper + Sonnet, per 30-min meeting):
--   - Agora video: ~$0.030
--   - Agora cloud recording (audio): ~$0.018
--   - Whisper transcription: ~$0.180
--   - Sonnet summarisation: ~$0.010
--   - Supabase storage: negligible (~$0.002 per recording)
--   ── TOTAL: ~$0.24 per 30-min recorded meeting
--   At 50 meetings/school/month = $12/mo per active school. Absorbable.
--
-- PRIVACY POSTURE (locked in code, not migration):
--   - Recording requires the school to flip video_recording=ON.
--   - Recording requires the parent to NOT opt out at booking (UI checkbox).
--   - In-call banner says "🔴 Recording for school records" visibly.
--   - Recording icon in the corner during the call.
--   - Parent can leave any time; that ends their participation in the
--     recording on their side.
--   - Recordings live in a private Supabase Storage bucket; signed URLs only.
--   - Transcripts + summaries are visible to: the staff host(s), the
--     school principal, and the recording_visible_to_parent flag controls
--     whether the parent sees them too (defaults FALSE).
--
-- Idempotent. Every clause uses IF NOT EXISTS / ON CONFLICT DO NOTHING.

BEGIN;

-- ── 1. Extend montree_appointments ──────────────────────────────────
ALTER TABLE montree_appointments
  ADD COLUMN IF NOT EXISTS provider TEXT
    DEFAULT 'jitsi'
    CHECK (provider IN ('jitsi', 'agora'));

-- Per-appointment recording opt-in. Parent ticks the checkbox at booking
-- AND the school has video_recording flag enabled = recording_enabled true.
ALTER TABLE montree_appointments
  ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN
    DEFAULT FALSE
    NOT NULL;

-- Backfill: every existing appointment was booked under Jitsi (the only
-- provider before this migration). Set explicitly for query-plan clarity.
UPDATE montree_appointments
  SET provider = 'jitsi'
  WHERE provider IS NULL;

-- ── 2. The recordings table ────────────────────────────────────────
-- One row per recorded appointment. Recording is OPTIONAL — most appointments
-- won't have a row here. Use LEFT JOIN from montree_appointments.
CREATE TABLE IF NOT EXISTS montree_appointment_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  appointment_id UUID NOT NULL REFERENCES montree_appointments(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Provider that captured the recording. Currently only 'agora' produces
  -- recordings; column is present so a future provider swap doesn't break
  -- queries that filter by provider.
  recording_provider TEXT NOT NULL
    CHECK (recording_provider IN ('agora')),

  -- Agora-specific identifiers. resource_id + sid are the handles we use
  -- to interact with Agora's Cloud Recording REST API (query / stop).
  agora_channel_name TEXT,
  agora_resource_id TEXT,
  agora_sid TEXT,
  agora_uid TEXT,

  -- Where the recording lives once Agora has uploaded it. Path in our
  -- Supabase Storage bucket (private). Streamed via signed URLs only.
  recording_storage_path TEXT,
  recording_duration_seconds INTEGER,
  recording_file_size_bytes BIGINT,

  -- Transcript pipeline output. transcript_locale is the user-perceived
  -- language of the audio (whatever Whisper detected or we explicitly told
  -- it). transcript itself capped 100k chars by the route handler.
  transcript TEXT,
  transcript_locale TEXT,

  -- Sonnet summary — the killer-feature output. Structured "what was
  -- discussed, key concerns, follow-ups" briefing in the principal /
  -- teacher's voice. Capped 8k chars.
  summary TEXT,
  summary_locale TEXT,

  -- Visibility controls.
  --   - Staff hosts + the school principal can always see transcript +
  --     summary (no flag).
  --   - Parents see ONLY when recording_visible_to_parent is true. Default
  --     OFF — staff explicitly opt in to share the summary with the parent
  --     (e.g. "here's what we agreed last meeting" → useful in parent
  --     thread).
  recording_visible_to_parent BOOLEAN NOT NULL DEFAULT FALSE,

  -- State machine. Goes pending → recording → processing → ready (or failed).
  recording_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (recording_status IN ('pending', 'recording', 'processing', 'ready', 'failed')),

  -- Reason for status='failed' — populated by whichever stage hit the error.
  -- Capped 500 chars by writer.
  failure_reason TEXT,

  -- Timestamps for each stage transition. Used for ops triage + cost audit.
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  transcribed_at TIMESTAMPTZ,
  summarized_at TIMESTAMPTZ,

  -- Consent posture captured at recording-start time. Set when the route
  -- accepts the "I've informed the other party" parent flag. We keep this
  -- on the recording row so a later legal review can verify consent without
  -- inferring from secondary signals.
  consent_acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot paths:
--   - "Show me the recording for THIS appointment" — by appointment_id.
--   - "Show me recent recordings for prior-conversation context" — by
--     parent_id (via appointment join) + ready status, ordered by ended_at.
--   - "Show me recordings that need transcription / summarisation" — by
--     status, used by background workers.
CREATE INDEX IF NOT EXISTS idx_appt_recordings_appointment
  ON montree_appointment_recordings(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appt_recordings_school_ended
  ON montree_appointment_recordings(school_id, ended_at DESC NULLS LAST)
  WHERE recording_status = 'ready';

CREATE INDEX IF NOT EXISTS idx_appt_recordings_status_pending
  ON montree_appointment_recordings(recording_status, created_at)
  WHERE recording_status IN ('recording', 'processing');

-- ── 3. updated_at trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_appt_recording_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appt_recordings_updated_at ON montree_appointment_recordings;
CREATE TRIGGER trg_appt_recordings_updated_at
  BEFORE UPDATE ON montree_appointment_recordings
  FOR EACH ROW EXECUTE FUNCTION update_appt_recording_updated_at();

-- ── 4. Feature flags ───────────────────────────────────────────────
-- agora_video_calls — flip schools onto Agora as their video provider.
INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'agora_video_calls',
  'Native video calls (Agora)',
  'When ON, parents booking an appointment with the video-call checkbox get a native-in-Montree Agora video call instead of a Jitsi external URL. Required for video_recording. China-reachable. Pay-per-minute (~$0.99/1000 min video).',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

-- video_recording — Cloud Recording + transcription + AI summary pipeline.
INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'video_recording',
  'Meeting recording + AI summary',
  'When ON (requires agora_video_calls also ON), Agora-provider video calls are recorded to Supabase Storage. Audio is transcribed via Whisper and summarised by Sonnet into a "prior conversation" briefing the next staff member walks into. Parents see a recording banner; staff + principal see transcripts + summaries.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;

-- ── Verification queries (run after migration) ─────────────────────
-- 1. Column added:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'montree_appointments'
--      AND column_name IN ('provider', 'recording_enabled');
--    Expected: 2 rows.
--
-- 2. Table exists:
--    SELECT count(*) FROM information_schema.tables
--    WHERE table_name = 'montree_appointment_recordings';
--    Expected: 1
--
-- 3. Flags registered:
--    SELECT feature_key, default_enabled FROM montree_feature_definitions
--    WHERE feature_key IN ('agora_video_calls', 'video_recording');
--    Expected: 2 rows, both default_enabled = false
--
-- 4. To enable for Whale Class (one paste, after Agora credentials in Railway):
--    INSERT INTO montree_school_features (school_id, feature_key, enabled) VALUES
--      ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'agora_video_calls', true),
--      ('c6280fae-567c-45ed-ad4d-934eae79aabc', 'video_recording', true)
--    ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
