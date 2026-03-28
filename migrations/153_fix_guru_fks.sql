-- Migration 153: Fix Guru Tables Foreign Keys (CRITICAL-001)
-- Corrects invalid FK references in migration 110
-- Changes: children → montree_children (3 tables)
-- Date: 2026-03-28

BEGIN;

-- ==============================================================================
-- Fix montree_child_mental_profiles FK reference
-- ==============================================================================
ALTER TABLE montree_child_mental_profiles
  DROP CONSTRAINT IF EXISTS montree_child_mental_profiles_child_id_fkey;

ALTER TABLE montree_child_mental_profiles
  ADD CONSTRAINT montree_child_mental_profiles_child_id_fkey
    FOREIGN KEY (child_id) REFERENCES montree_children(id) ON DELETE CASCADE;

-- ==============================================================================
-- Fix montree_behavioral_observations FK references
-- ==============================================================================
ALTER TABLE montree_behavioral_observations
  DROP CONSTRAINT IF EXISTS montree_behavioral_observations_child_id_fkey;

ALTER TABLE montree_behavioral_observations
  ADD CONSTRAINT montree_behavioral_observations_child_id_fkey
    FOREIGN KEY (child_id) REFERENCES montree_children(id) ON DELETE CASCADE;

-- ==============================================================================
-- Fix montree_guru_interactions FK references
-- ==============================================================================
ALTER TABLE montree_guru_interactions
  DROP CONSTRAINT IF EXISTS montree_guru_interactions_child_id_fkey;

ALTER TABLE montree_guru_interactions
  ADD CONSTRAINT montree_guru_interactions_child_id_fkey
    FOREIGN KEY (child_id) REFERENCES montree_children(id) ON DELETE CASCADE;

-- ==============================================================================
-- Fix montree_child_patterns FK reference
-- ==============================================================================
ALTER TABLE montree_child_patterns
  DROP CONSTRAINT IF EXISTS montree_child_patterns_child_id_fkey;

ALTER TABLE montree_child_patterns
  ADD CONSTRAINT montree_child_patterns_child_id_fkey
    FOREIGN KEY (child_id) REFERENCES montree_children(id) ON DELETE CASCADE;

-- ==============================================================================
-- Commit transaction
-- ==============================================================================
COMMIT;
