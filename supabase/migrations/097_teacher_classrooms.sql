-- Migration: 097_teacher_classrooms.sql
-- Purpose: Junction table for teacher-classroom assignments
-- Run this in Supabase SQL Editor

-- Create teacher-classroom assignments table
CREATE TABLE IF NOT EXISTS montree_teacher_classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES montree_teachers(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, classroom_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_teacher_classrooms_teacher ON montree_teacher_classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classrooms_classroom ON montree_teacher_classrooms(classroom_id);

-- Enable RLS
ALTER TABLE montree_teacher_classrooms ENABLE ROW LEVEL SECURITY;

-- Service role policy
CREATE POLICY "teacher_classrooms_service_role" ON montree_teacher_classrooms
  FOR ALL USING (true) WITH CHECK (true);

SELECT 'Teacher-classroom assignments table created' as status;
