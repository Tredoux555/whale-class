-- Clear Montree tables for fresh start
-- Run this in Supabase SQL Editor

-- Clear child assignments first (foreign key)
DELETE FROM montree_child_assignments;

-- Clear children
DELETE FROM montree_children;

-- Verify
SELECT 'montree_children' as table_name, COUNT(*) as count FROM montree_children
UNION ALL
SELECT 'montree_child_assignments' as table_name, COUNT(*) as count FROM montree_child_assignments;

-- Note: After running this, Montree will read from the 'children' table
-- which is populated by the weekly planning document upload
