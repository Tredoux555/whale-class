-- Migration 136: Voice Notes + Weekly Admin Generator
-- Smart teacher voice notes with AI extraction + weekly admin generation

-- Voice notes table: stores each quick voice note per child
CREATE TABLE IF NOT EXISTS montree_voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  child_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL,
  voice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  voice_week_start DATE NOT NULL,

  -- Raw transcription
  audio_duration_seconds INT,
  transcript TEXT NOT NULL,
  transcript_language TEXT DEFAULT 'en',

  -- Extracted data (from Haiku)
  child_name_spoken TEXT,
  work_name TEXT,
  work_key TEXT,
  area TEXT CHECK (area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'cultural')),
  work_match_confidence DECIMAL(3,2) DEFAULT 0,
  proposed_status TEXT CHECK (proposed_status IN ('presented', 'practicing', 'mastered')),
  status_confidence DECIMAL(3,2) DEFAULT 0,
  behavioral_notes TEXT,
  next_steps TEXT,

  -- Whether extraction auto-applied to progress
  auto_applied BOOLEAN DEFAULT FALSE,
  extraction_status TEXT DEFAULT 'success' CHECK (extraction_status IN ('success', 'pending', 'failed', 'no_extraction')),
  extraction_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for voice notes
CREATE INDEX IF NOT EXISTS idx_voice_notes_classroom_week
  ON montree_voice_notes(classroom_id, voice_week_start);
CREATE INDEX IF NOT EXISTS idx_voice_notes_child_week
  ON montree_voice_notes(child_id, voice_week_start);
CREATE INDEX IF NOT EXISTS idx_voice_notes_school
  ON montree_voice_notes(school_id);

-- Weekly admin output table: generated narratives + plan tables
CREATE TABLE IF NOT EXISTS montree_weekly_admin_output (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,

  -- Generated outputs
  locale TEXT DEFAULT 'en',
  narrative_summaries JSONB,
  weekly_plan_tables JSONB,

  -- Copy-paste ready text
  narratives_text TEXT,
  plans_text TEXT,

  -- Stats
  children_count INT DEFAULT 0,
  total_notes_count INT DEFAULT 0,

  -- Timestamps
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for weekly admin output
CREATE INDEX IF NOT EXISTS idx_weekly_admin_classroom_week
  ON montree_weekly_admin_output(classroom_id, week_start);

-- Updated_at trigger for voice notes
CREATE OR REPLACE FUNCTION update_voice_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_voice_notes_updated_at ON montree_voice_notes;
CREATE TRIGGER trigger_voice_notes_updated_at
  BEFORE UPDATE ON montree_voice_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_notes_updated_at();

-- RLS policies (service role bypass)
ALTER TABLE montree_voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_weekly_admin_output ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON montree_voice_notes FOR ALL
  USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON montree_weekly_admin_output FOR ALL
  USING (true) WITH CHECK (true);
