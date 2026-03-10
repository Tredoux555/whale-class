-- Migration 137: Guru Self-Learning — Corrections tracking + per-work accuracy
-- Enables Smart Capture to learn from teacher corrections

-- Table 1: Track every time a teacher corrects a Guru misidentification
CREATE TABLE IF NOT EXISTS montree_guru_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  media_id UUID,
  child_id UUID,
  -- What Guru originally guessed
  original_work_name TEXT,
  original_work_id UUID,
  original_area TEXT,
  original_confidence NUMERIC,
  -- What teacher corrected it to
  corrected_work_name TEXT,
  corrected_work_id UUID,
  corrected_area TEXT,
  -- Meta
  correction_type TEXT DEFAULT 'work_mismatch', -- work_mismatch, status_override, manual_tag
  teacher_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guru_corrections_classroom ON montree_guru_corrections(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guru_corrections_child ON montree_guru_corrections(child_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guru_corrections_media ON montree_guru_corrections(media_id);

-- Table 2: Per-work accuracy tracking with EMA (Exponential Moving Average)
-- Tracks how accurate Smart Capture is for each specific work in each classroom
CREATE TABLE IF NOT EXISTS montree_work_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,
  work_name TEXT NOT NULL,
  work_id UUID,
  area TEXT,
  -- EMA accuracy (0.0 = always wrong, 1.0 = always right)
  accuracy_ema NUMERIC DEFAULT 0.5,
  -- Raw counts
  correct_count INT DEFAULT 0,
  total_count INT DEFAULT 0,
  -- Derived: should we auto-update for this work?
  auto_update_enabled BOOLEAN DEFAULT true,
  -- Timestamps
  last_correct_at TIMESTAMPTZ,
  last_incorrect_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, work_name)
);

CREATE INDEX IF NOT EXISTS idx_work_accuracy_classroom ON montree_work_accuracy(classroom_id);

-- RLS (service role bypasses, but define for completeness)
ALTER TABLE montree_guru_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_work_accuracy ENABLE ROW LEVEL SECURITY;

-- RPC: Update accuracy EMA (alpha=0.2)
CREATE OR REPLACE FUNCTION update_work_accuracy(
  p_classroom_id UUID,
  p_work_name TEXT,
  p_work_id UUID,
  p_area TEXT,
  p_was_correct BOOLEAN
) RETURNS VOID AS $$
DECLARE
  current_ema NUMERIC;
  outcome NUMERIC;
  new_ema NUMERIC;
BEGIN
  outcome := CASE WHEN p_was_correct THEN 1.0 ELSE 0.0 END;

  INSERT INTO montree_work_accuracy (classroom_id, work_name, work_id, area, accuracy_ema, correct_count, total_count, updated_at)
  VALUES (p_classroom_id, p_work_name, p_work_id, p_area, outcome,
          CASE WHEN p_was_correct THEN 1 ELSE 0 END, 1, NOW())
  ON CONFLICT (classroom_id, work_name) DO UPDATE SET
    accuracy_ema = 0.2 * outcome + 0.8 * montree_work_accuracy.accuracy_ema,
    correct_count = montree_work_accuracy.correct_count + CASE WHEN p_was_correct THEN 1 ELSE 0 END,
    total_count = montree_work_accuracy.total_count + 1,
    auto_update_enabled = CASE
      WHEN (0.2 * outcome + 0.8 * montree_work_accuracy.accuracy_ema) < 0.4 THEN false
      ELSE true
    END,
    last_correct_at = CASE WHEN p_was_correct THEN NOW() ELSE montree_work_accuracy.last_correct_at END,
    last_incorrect_at = CASE WHEN NOT p_was_correct THEN NOW() ELSE montree_work_accuracy.last_incorrect_at END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
