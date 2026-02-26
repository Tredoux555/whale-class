-- Migration 133: Fix FK references on observations + guru_interactions
-- Both tables reference children(id) instead of montree_children(id)

-- Fix montree_behavioral_observations FK
ALTER TABLE montree_behavioral_observations
  DROP CONSTRAINT IF EXISTS montree_behavioral_observations_child_id_fkey;
ALTER TABLE montree_behavioral_observations
  ADD CONSTRAINT montree_behavioral_observations_child_id_fkey
  FOREIGN KEY (child_id) REFERENCES montree_children(id) ON DELETE CASCADE;

-- Fix montree_guru_interactions FK
ALTER TABLE montree_guru_interactions
  DROP CONSTRAINT IF EXISTS montree_guru_interactions_child_id_fkey;
ALTER TABLE montree_guru_interactions
  ADD CONSTRAINT montree_guru_interactions_child_id_fkey
  FOREIGN KEY (child_id) REFERENCES montree_children(id) ON DELETE CASCADE;
