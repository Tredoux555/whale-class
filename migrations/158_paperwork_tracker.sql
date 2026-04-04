-- Migration 158: Paperwork week tracker
-- Tracks which paperwork week each child is currently on (weeks 1-37)

ALTER TABLE montree_children
ADD COLUMN IF NOT EXISTS paperwork_current_week integer NOT NULL DEFAULT 1;

COMMENT ON COLUMN montree_children.paperwork_current_week IS 'Current paperwork week the child is on (1-37). Incremented when teacher marks week complete.';
