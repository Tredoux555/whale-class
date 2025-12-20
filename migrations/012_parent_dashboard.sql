-- Migration: Parent Dashboard Support
-- Purpose: Add parent_id column and RLS policies for parent access
-- Date: January 2025

-- ============================================================================
-- 1. ADD PARENT_ID COLUMN TO CHILDREN TABLE
-- ============================================================================

ALTER TABLE children 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);

-- ============================================================================
-- 2. LINK EXISTING CHILDREN TO PARENTS BY EMAIL
-- ============================================================================

UPDATE children c
SET parent_id = u.id
FROM auth.users u
WHERE c.parent_email = u.email
AND c.parent_id IS NULL;

-- ============================================================================
-- 3. RLS POLICIES FOR PARENT ACCESS
-- ============================================================================

-- Policy: Parents can view only their own children
DROP POLICY IF EXISTS "Parents can view own children" ON children;
CREATE POLICY "Parents can view own children" ON children
  FOR SELECT USING (parent_id = auth.uid());

-- Policy: Parents can view their children's work completion
DROP POLICY IF EXISTS "Parents can view child work completion" ON child_work_completion;
CREATE POLICY "Parents can view child work completion" ON child_work_completion
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = child_work_completion.child_id 
      AND children.parent_id = auth.uid()
    )
  );

-- Policy: Parents can view their children's video watches
DROP POLICY IF EXISTS "Parents can view child video watches" ON child_video_watches;
CREATE POLICY "Parents can view child video watches" ON child_video_watches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = child_video_watches.child_id 
      AND children.parent_id = auth.uid()
    )
  );

-- Policy: Parents can view their children's curriculum position
DROP POLICY IF EXISTS "Parents can view child curriculum position" ON child_curriculum_position;
CREATE POLICY "Parents can view child curriculum position" ON child_curriculum_position
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = child_curriculum_position.child_id 
      AND children.parent_id = auth.uid()
    )
  );

-- Note: child_curriculum_progress is a VIEW, not a table
-- Views inherit RLS policies from their underlying tables (children, child_work_completion)
-- The policies above on children and child_work_completion will automatically apply to the view

