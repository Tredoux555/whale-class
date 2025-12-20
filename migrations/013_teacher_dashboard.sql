-- Migration: Teacher Dashboard Support
-- Purpose: Add assigned_by column and RLS policies for teacher access
-- Date: January 2025

-- ============================================================================
-- 1. ADD ASSIGNED_BY COLUMN TO CHILD_WORK_COMPLETION
-- ============================================================================

ALTER TABLE child_work_completion
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_work_completion_assigned_by 
ON child_work_completion(assigned_by);

-- ============================================================================
-- 2. RLS POLICIES FOR TEACHER ACCESS
-- ============================================================================

-- Policy: Teachers can view students assigned to them
DROP POLICY IF EXISTS "Teachers can view assigned students" ON children;
CREATE POLICY "Teachers can view assigned students" ON children
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_students 
      WHERE teacher_students.student_id = children.id 
      AND teacher_students.teacher_id = auth.uid()
      AND teacher_students.is_active = true
    )
  );

-- Policy: Teachers can view work completion for their students
DROP POLICY IF EXISTS "Teachers can view student work completion" ON child_work_completion;
CREATE POLICY "Teachers can view student work completion" ON child_work_completion
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_students 
      WHERE teacher_students.student_id = child_work_completion.child_id 
      AND teacher_students.teacher_id = auth.uid()
      AND teacher_students.is_active = true
    )
  );

-- Policy: Teachers can insert work completion for their students
DROP POLICY IF EXISTS "Teachers can assign work to students" ON child_work_completion;
CREATE POLICY "Teachers can assign work to students" ON child_work_completion
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teacher_students 
      WHERE teacher_students.student_id = child_work_completion.child_id 
      AND teacher_students.teacher_id = auth.uid()
      AND teacher_students.is_active = true
    )
  );

-- Policy: Teachers can update work completion for their students
DROP POLICY IF EXISTS "Teachers can update student work completion" ON child_work_completion;
CREATE POLICY "Teachers can update student work completion" ON child_work_completion
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teacher_students 
      WHERE teacher_students.student_id = child_work_completion.child_id 
      AND teacher_students.teacher_id = auth.uid()
      AND teacher_students.is_active = true
    )
  );

-- Policy: Teachers can view their own teacher_students records
DROP POLICY IF EXISTS "Teachers can view own student assignments" ON teacher_students;
CREATE POLICY "Teachers can view own student assignments" ON teacher_students
  FOR SELECT USING (teacher_id = auth.uid());


