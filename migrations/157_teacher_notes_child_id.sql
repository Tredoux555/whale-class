-- Migration 157: Add optional child_id to teacher notes
-- Allows teachers to tag a note to a specific child for quick observations
-- NULL child_id = classroom-level note (existing behavior preserved)

ALTER TABLE montree_teacher_notes
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL DEFAULT NULL;

-- Index for fetching notes by child
CREATE INDEX IF NOT EXISTS idx_teacher_notes_child
  ON montree_teacher_notes (child_id)
  WHERE child_id IS NOT NULL;
