-- Migration 154: Automation Columns (Phase A-F)
-- Adds missing columns required by Sprint implementations
-- Date: 2026-03-28

BEGIN;

-- ==============================================================================
-- Column: parent_questions JSONB on montree_children
-- Used by Sprint 13 for parent intake questions + answers
-- Format: { "question_id": "answer_text" } or { "question_id": { "selected": ["option1", "option2"] } }
-- ==============================================================================
ALTER TABLE montree_children
  ADD COLUMN IF NOT EXISTS parent_questions JSONB DEFAULT '{}';

-- Comment for developers
COMMENT ON COLUMN montree_children.parent_questions IS
  'Stores parent intake questionnaire answers. Format: { "q_id": "text answer" } or { "q_id": { "selected": ["option"] } }';

-- ==============================================================================
-- Column: seen BOOLEAN on montree_behavioral_observations
-- Tracks whether teacher has reviewed this observation for their own insights
-- ==============================================================================
ALTER TABLE montree_behavioral_observations
  ADD COLUMN IF NOT EXISTS seen BOOLEAN DEFAULT FALSE;

-- ==============================================================================
-- Column: seen_at TIMESTAMPTZ on montree_behavioral_observations
-- Timestamp when teacher marked observation as seen
-- ==============================================================================
ALTER TABLE montree_behavioral_observations
  ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ DEFAULT NULL;

-- ==============================================================================
-- Update last_photo_at on existing focus works (sprint 0)
-- Backfill: find most recent photo per focus work
-- ==============================================================================
UPDATE montree_child_focus_works
SET last_photo_at = (
  SELECT MAX(created_at)
  FROM montree_media
  WHERE montree_media.child_id = montree_child_focus_works.child_id
    AND montree_media.work_id = montree_child_focus_works.work_id
)
WHERE last_photo_at IS NULL
  AND work_id IS NOT NULL;

-- ==============================================================================
-- Commit transaction
-- ==============================================================================
COMMIT;
