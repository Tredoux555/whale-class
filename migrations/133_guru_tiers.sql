-- Migration 133: Guru tier system
-- Adds guru_tier column to montree_teachers for model-based pricing
-- Tiers: haiku ($5/mo, 30 prompts), sonnet ($20/mo, 30 prompts)
-- Free trial: 10 prompts on sonnet (no tier needed)

ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS guru_tier TEXT DEFAULT 'sonnet';

-- Add check constraint (allow null for teachers who don't use guru)
-- Note: Using a DO block to avoid error if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_teachers_guru_tier_check'
  ) THEN
    ALTER TABLE montree_teachers
      ADD CONSTRAINT montree_teachers_guru_tier_check
      CHECK (guru_tier IS NULL OR guru_tier IN ('haiku', 'sonnet'));
  END IF;
END $$;

-- Add monthly prompt reset tracking
ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS guru_prompts_reset_at TIMESTAMPTZ;

COMMENT ON COLUMN montree_teachers.guru_tier IS 'AI model tier: haiku ($5/mo) or sonnet ($20/mo). Default sonnet for trial users.';
COMMENT ON COLUMN montree_teachers.guru_prompts_reset_at IS 'When monthly prompt counter was last reset. NULL = never reset (trial user).';

-- Atomic prompt increment function (prevents race conditions with parallel requests)
CREATE OR REPLACE FUNCTION increment_guru_prompts(teacher_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE montree_teachers
  SET guru_prompts_used = COALESCE(guru_prompts_used, 0) + 1
  WHERE id = teacher_id_param;
END;
$$ LANGUAGE plpgsql;

-- Index for self-learning pattern queries (filter by active + confidence)
CREATE INDEX IF NOT EXISTS idx_patterns_active_confidence
  ON montree_child_patterns(still_active, confidence)
  WHERE still_active = true;

-- Issue HC#6: Index for daily message count queries (used by rate limiter)
CREATE INDEX IF NOT EXISTS idx_guru_interactions_teacher_date
  ON montree_guru_interactions(teacher_id, asked_at DESC);

-- Self-improving Guru brain table
-- Single row (id='global') stores the accumulated wisdom + raw learning buffer
CREATE TABLE IF NOT EXISTS montree_guru_brain (
  id TEXT PRIMARY KEY DEFAULT 'global',
  brain_data JSONB DEFAULT '{}'::jsonb,     -- BrainState: version, sections, metadata
  raw_learnings JSONB DEFAULT '[]'::jsonb,  -- Buffer of unprocessed learnings
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: Single-row design (id='global') is intentional. Brain is global, not per-school.
-- If multi-tenancy is needed in future, split to montree_guru_brain(school_id, brain_data, raw_learnings).
COMMENT ON TABLE montree_guru_brain IS 'Self-improving Guru brain. Single global row stores accumulated wisdom and raw learning buffer.';
COMMENT ON COLUMN montree_guru_brain.brain_data IS 'BrainState JSONB: version, sections (wisdom entries), total_conversations, last_consolidated';
COMMENT ON COLUMN montree_guru_brain.raw_learnings IS 'Buffer of raw learnings awaiting consolidation (max 200, FIFO)';

-- Atomic append for brain learnings (prevents race conditions with concurrent writes)
CREATE OR REPLACE FUNCTION append_guru_learning(learning_json TEXT, max_learnings INT DEFAULT 200)
RETURNS VOID AS $$
DECLARE
  current_learnings JSONB;
  new_learning JSONB;
BEGIN
  new_learning := learning_json::jsonb;

  -- Ensure brain row exists (Issue #23: touch updated_at on conflict to confirm row exists)
  INSERT INTO montree_guru_brain (id, brain_data, raw_learnings, updated_at)
  VALUES ('global', '{}'::jsonb, '[]'::jsonb, now())
  ON CONFLICT (id) DO UPDATE SET updated_at = now();

  -- Atomic append + trim in a single UPDATE
  UPDATE montree_guru_brain
  SET
    raw_learnings = (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(COALESCE(raw_learnings, '[]'::jsonb) || jsonb_build_array(new_learning)) AS elem
        ORDER BY elem->>'recorded_at' ASC
        OFFSET GREATEST(0, jsonb_array_length(COALESCE(raw_learnings, '[]'::jsonb)) + 1 - max_learnings)
      ) sub
    ),
    updated_at = now()
  WHERE id = 'global';
END;
$$ LANGUAGE plpgsql;
