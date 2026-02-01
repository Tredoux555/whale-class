-- Migration 110: Montessori Guru Tables
-- Creates tables for AI-powered teacher assistant
-- Date: 2026-02-01

BEGIN;

-- ==============================================================================
-- Child Mental/Developmental Profile
-- Stores temperament, learning style, sensitive periods, and family context
-- ==============================================================================
CREATE TABLE IF NOT EXISTS montree_child_mental_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE UNIQUE,

  -- Temperament (1-5 scale, NULL if not assessed)
  -- Based on Thomas & Chess temperament dimensions
  temperament_activity_level INT CHECK (temperament_activity_level BETWEEN 1 AND 5),
  temperament_regularity INT CHECK (temperament_regularity BETWEEN 1 AND 5),
  temperament_initial_reaction INT CHECK (temperament_initial_reaction BETWEEN 1 AND 5),
  temperament_adaptability INT CHECK (temperament_adaptability BETWEEN 1 AND 5),
  temperament_intensity INT CHECK (temperament_intensity BETWEEN 1 AND 5),
  temperament_mood_quality INT CHECK (temperament_mood_quality BETWEEN 1 AND 5),
  temperament_distractibility INT CHECK (temperament_distractibility BETWEEN 1 AND 5),
  temperament_persistence INT CHECK (temperament_persistence BETWEEN 1 AND 5),
  temperament_sensory_threshold INT CHECK (temperament_sensory_threshold BETWEEN 1 AND 5),

  -- Learning modality preferences (1-5 scale)
  learning_modality_visual INT CHECK (learning_modality_visual BETWEEN 1 AND 5),
  learning_modality_auditory INT CHECK (learning_modality_auditory BETWEEN 1 AND 5),
  learning_modality_kinesthetic INT CHECK (learning_modality_kinesthetic BETWEEN 1 AND 5),

  -- Focus baseline
  baseline_focus_minutes INT,
  optimal_time_of_day TEXT CHECK (optimal_time_of_day IN ('morning', 'midday', 'afternoon')),

  -- Sensitive periods (status tracking)
  -- Values: 'active', 'waning', 'complete', 'not_started'
  sensitive_period_order TEXT DEFAULT 'active' CHECK (sensitive_period_order IN ('active', 'waning', 'complete', 'not_started')),
  sensitive_period_language TEXT DEFAULT 'active' CHECK (sensitive_period_language IN ('active', 'waning', 'complete', 'not_started')),
  sensitive_period_movement TEXT DEFAULT 'active' CHECK (sensitive_period_movement IN ('active', 'waning', 'complete', 'not_started')),
  sensitive_period_sensory TEXT DEFAULT 'active' CHECK (sensitive_period_sensory IN ('active', 'waning', 'complete', 'not_started')),
  sensitive_period_small_objects TEXT DEFAULT 'active' CHECK (sensitive_period_small_objects IN ('active', 'waning', 'complete', 'not_started')),
  sensitive_period_grace_courtesy TEXT DEFAULT 'not_started' CHECK (sensitive_period_grace_courtesy IN ('active', 'waning', 'complete', 'not_started')),

  -- Environmental/family context (free text for now)
  family_notes TEXT,
  sleep_status TEXT DEFAULT 'normal' CHECK (sleep_status IN ('normal', 'disrupted', 'concerning')),
  special_considerations TEXT,

  -- What works for this child
  successful_strategies TEXT[],
  challenging_triggers TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

-- ==============================================================================
-- Behavioral Observations with Functional Behavior Analysis
-- Stores ABC (Antecedent-Behavior-Consequence) data for pattern detection
-- ==============================================================================
CREATE TABLE IF NOT EXISTS montree_behavioral_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  classroom_id UUID,
  observed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  observed_by UUID,

  -- ABC Model
  behavior_description TEXT NOT NULL,
  antecedent TEXT, -- What happened before
  behavior_function TEXT CHECK (behavior_function IN ('attention', 'escape', 'sensory', 'tangible', 'unknown')),
  consequence TEXT, -- What happened after

  -- Context
  time_of_day TEXT CHECK (time_of_day IN ('arrival', 'morning_work', 'snack', 'outdoor', 'afternoon_work', 'dismissal')),
  activity_during TEXT,
  environmental_notes TEXT,

  -- Intervention tracking
  intervention_used TEXT,
  effectiveness TEXT CHECK (effectiveness IN ('effective', 'partially', 'ineffective', 'not_applicable'))
);

-- ==============================================================================
-- Guru Conversation History
-- Stores teacher questions, AI responses, and outcomes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS montree_guru_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  teacher_id UUID,
  classroom_id UUID,
  asked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- The question
  question TEXT NOT NULL,
  question_type TEXT, -- 'behavior', 'focus', 'social', 'academic', 'family', 'general'

  -- Context snapshot at time of question (for debugging/analysis)
  context_snapshot JSONB,

  -- The response
  response_insight TEXT NOT NULL,
  response_root_cause TEXT,
  response_action_plan JSONB, -- Array of action items
  response_timeline TEXT,
  response_parent_talking_point TEXT,
  sources_used TEXT[], -- Which books/passages were referenced

  -- Follow-up tracking
  follow_up_date DATE,
  follow_up_notes TEXT,
  outcome TEXT CHECK (outcome IN ('improved', 'no_change', 'worsened', 'ongoing', 'not_tracked')),

  -- Metadata
  processing_time_ms INT,
  model_used TEXT
);

-- ==============================================================================
-- Detected Patterns (learned over time)
-- Stores patterns the system has identified in child behavior
-- ==============================================================================
CREATE TABLE IF NOT EXISTS montree_child_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  pattern_type TEXT CHECK (pattern_type IN ('focus', 'social', 'emotional', 'learning', 'behavioral', 'developmental')),
  pattern_description TEXT NOT NULL,
  evidence TEXT, -- What observations support this pattern
  confidence TEXT CHECK (confidence IN ('high', 'medium', 'low')),

  first_observed DATE,
  still_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- ==============================================================================
-- Indexes for performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_mental_profiles_child ON montree_child_mental_profiles(child_id);
CREATE INDEX IF NOT EXISTS idx_observations_child ON montree_behavioral_observations(child_id);
CREATE INDEX IF NOT EXISTS idx_observations_classroom ON montree_behavioral_observations(classroom_id);
CREATE INDEX IF NOT EXISTS idx_observations_date ON montree_behavioral_observations(observed_at);
CREATE INDEX IF NOT EXISTS idx_guru_child ON montree_guru_interactions(child_id);
CREATE INDEX IF NOT EXISTS idx_guru_classroom ON montree_guru_interactions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_guru_date ON montree_guru_interactions(asked_at);
CREATE INDEX IF NOT EXISTS idx_patterns_child ON montree_child_patterns(child_id);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON montree_child_patterns(pattern_type);

-- ==============================================================================
-- Update trigger for mental profiles
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_mental_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mental_profile ON montree_child_mental_profiles;
CREATE TRIGGER trigger_update_mental_profile
  BEFORE UPDATE ON montree_child_mental_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_mental_profile_timestamp();

COMMIT;
