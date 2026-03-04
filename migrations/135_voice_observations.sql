-- Migration 135: Voice Observation System
-- 4 new tables + storage bucket for AI-powered hands-free classroom observations
-- Premium feature ($1000/month) with ephemeral audio/transcripts

-- ============================================================
-- 1. Voice Observation Sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_observation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES montree_teachers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'recording'
    CHECK (status IN ('recording', 'paused', 'queued', 'transcribing', 'analyzing', 'ready_for_review', 'committed', 'failed', 'expired', 'abandoned')),
  language TEXT DEFAULT 'auto',
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  audio_chunks_count INT NOT NULL DEFAULT 0,
  total_audio_bytes BIGINT NOT NULL DEFAULT 0,
  full_transcript TEXT,
  transcript_word_count INT,
  transcription_cost_cents INT,
  analysis_cost_cents INT,
  total_cost_cents INT,
  extractions_count INT NOT NULL DEFAULT 0,
  approved_count INT NOT NULL DEFAULT 0,
  rejected_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  committed_at TIMESTAMPTZ,
  transcript_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for retrieval (no unique constraint — multiple sessions per day allowed)
CREATE INDEX IF NOT EXISTS idx_voice_obs_sessions_teacher_date
  ON voice_observation_sessions(teacher_id, session_date, classroom_id);

CREATE INDEX IF NOT EXISTS idx_voice_obs_sessions_school
  ON voice_observation_sessions(school_id);

CREATE INDEX IF NOT EXISTS idx_voice_obs_sessions_status
  ON voice_observation_sessions(status) WHERE status NOT IN ('committed', 'expired', 'abandoned');

-- ============================================================
-- 2. Voice Observation Extractions
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_observation_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_observation_sessions(id) ON DELETE CASCADE,
  child_id UUID REFERENCES montree_children(id) ON DELETE CASCADE,
  child_name_spoken TEXT NOT NULL,
  work_name TEXT,
  work_key TEXT,
  area TEXT CHECK (area IS NULL OR area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'cultural')),
  work_match_confidence DECIMAL(3,2) DEFAULT 0.00,
  observation_text TEXT NOT NULL,
  proposed_status TEXT CHECK (proposed_status IN ('presented', 'practicing', 'mastered')),
  status_confidence DECIMAL(3,2) DEFAULT 0.00,
  event_type TEXT NOT NULL DEFAULT 'practice'
    CHECK (event_type IN ('mastery', 'presentation', 'practice', 'behavioral', 'other')),
  behavioral_notes TEXT,
  transcript_excerpt TEXT,
  timestamp_seconds INT,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'edited')),
  teacher_final_status TEXT CHECK (teacher_final_status IS NULL OR teacher_final_status IN ('presented', 'practicing', 'mastered')),
  teacher_final_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_obs_extractions_session
  ON voice_observation_extractions(session_id);

CREATE INDEX IF NOT EXISTS idx_voice_obs_extractions_child
  ON voice_observation_extractions(child_id, created_at);

-- ============================================================
-- 3. Voice Observation Audio Chunks
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_observation_audio_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_observation_sessions(id) ON DELETE CASCADE,
  chunk_number INT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  duration_seconds INT,
  transcription_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (transcription_status IN ('pending', 'processing', 'done', 'failed')),
  transcription_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, chunk_number)
);

CREATE INDEX IF NOT EXISTS idx_voice_obs_chunks_session
  ON voice_observation_audio_chunks(session_id);

-- ============================================================
-- 4. Voice Observation Student Aliases
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_observation_student_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'teacher_added'
    CHECK (source IN ('teacher_added', 'ai_learned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(classroom_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_voice_obs_aliases_classroom
  ON voice_observation_student_aliases(classroom_id);

CREATE INDEX IF NOT EXISTS idx_voice_obs_aliases_child
  ON voice_observation_student_aliases(child_id);

-- ============================================================
-- 5. Enable RLS with service_role bypass
-- ============================================================
ALTER TABLE voice_observation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_observation_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_observation_audio_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_observation_student_aliases ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (our standard pattern)
CREATE POLICY "service_role_all_voice_sessions" ON voice_observation_sessions
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_voice_extractions" ON voice_observation_extractions
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_voice_chunks" ON voice_observation_audio_chunks
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_voice_aliases" ON voice_observation_student_aliases
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_voice_obs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER voice_obs_sessions_updated_at
  BEFORE UPDATE ON voice_observation_sessions
  FOR EACH ROW EXECUTE FUNCTION update_voice_obs_updated_at();

-- ============================================================
-- 7. Storage bucket (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-obs', 'voice-obs', false)
ON CONFLICT (id) DO NOTHING;
