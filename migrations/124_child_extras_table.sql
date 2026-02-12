-- Migration 124: Create montree_child_extras table
-- Tracks explicitly-added extra works (teacher-selected extras)
-- Mirrors the montree_child_focus_works pattern

CREATE TABLE IF NOT EXISTS montree_child_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  area TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(child_id, work_name)
);

-- Index for fast lookup by child
CREATE INDEX IF NOT EXISTS idx_child_extras_child_id ON montree_child_extras(child_id);
