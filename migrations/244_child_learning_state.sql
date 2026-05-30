-- migrations/244_child_learning_state.sql
-- Astra/Mira voice + home-learning arc (May 30, 2026).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into Supabase SQL Editor.
-- Until then the learner-state loader returns degraded:true / null and the
-- tutor + reports fall back to just the child's current_lesson.
--
-- PURPOSE
--   A durable, evolving learner model per child — the memory that makes the
--   home-learning tutor (and Astra's reports) personal instead of amnesiac.
--   Captures what a child has mastered, which sounds they repeatedly miss
--   (miscues), reading confidence, and tutoring preferences. Feeds the
--   oral-reading micro-intervention loop and progress narratives.
--
-- SCOPE
--   One row per (child, school) pair. School-scoped like every Montree
--   relational table — never bleeds across schools. The child's
--   current_lesson / mastered_lessons stay on montree_children (the
--   curriculum position); THIS table is the qualitative learning memory.
--
-- AUDIO/PRIVACY
--   No audio, no raw transcript is ever stored here. miscue_history holds
--   only abstracted word/sound events, not recordings.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_child_learning_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cross-pollination scope (load-bearing — every query filters by school_id).
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Sounds/graphemes the child reads reliably. Free-text like 'sh', 'a_e'.
  mastered_sounds TEXT[] NOT NULL DEFAULT '{}',

  -- Sounds/graphemes the child repeatedly misses — the tutor's focus list.
  struggling_sounds TEXT[] NOT NULL DEFAULT '{}',

  -- Recent abstracted miscues (NO audio). Loose JSONB so we can evolve the
  -- shape without a migration. Example element:
  --   { "target": "ship", "read_as": "sip", "type": "substitution",
  --     "sound": "sh", "lesson": 18, "at": "2026-05-30T10:00:00Z" }
  miscue_history JSONB NOT NULL DEFAULT '[]',

  -- Overall reading confidence — hard-CHECKed because the tutor prompt and
  -- the dashboard badge branch on these three values.
  reading_confidence TEXT NOT NULL DEFAULT 'building'
    CHECK (reading_confidence IN ('emerging', 'building', 'fluent')),

  -- Tutoring preferences — pace, encouragement style, language, etc.
  -- Loose JSONB. Example: { "pace": "slow", "encouragement": "high",
  --   "language": "en" }.
  preferences JSONB NOT NULL DEFAULT '{}',

  -- The lesson number (1-128, LESSON_MAP) most recently practised at home.
  last_lesson_practiced INTEGER,

  -- Lightweight stats.
  sessions_count INTEGER NOT NULL DEFAULT 0,
  last_session_at TIMESTAMPTZ,

  -- Free-text long-memory field for tutor/teacher notes that don't fit a slot.
  notes TEXT NOT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One learner-state row per (child, school) pair.
  UNIQUE (child_id, school_id)
);

-- School-scope index: dashboard list-by-school queries hit this.
CREATE INDEX IF NOT EXISTS idx_child_learning_state_school
  ON montree_child_learning_state (school_id);

-- Per-child lookup index.
CREATE INDEX IF NOT EXISTS idx_child_learning_state_child
  ON montree_child_learning_state (child_id);

-- Auto-bump updated_at trigger.
CREATE OR REPLACE FUNCTION montree_child_learning_state_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_child_learning_state_touch ON montree_child_learning_state;
CREATE TRIGGER trg_child_learning_state_touch
  BEFORE UPDATE ON montree_child_learning_state
  FOR EACH ROW EXECUTE FUNCTION montree_child_learning_state_touch_updated_at();

COMMIT;

-- After running:
--   SELECT count(*) FROM montree_child_learning_state; -- should return 0
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'montree_child_learning_state' ORDER BY ordinal_position;
