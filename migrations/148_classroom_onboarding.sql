-- Migration 148: Classroom Onboarding Improvements
-- 1. Add date_of_birth to montree_children
-- 2. Create montree_teacher_notes table for classroom-level teacher notes

-- ============================================================
-- 1. Date of Birth column on children
-- ============================================================
ALTER TABLE montree_children
  ADD COLUMN IF NOT EXISTS date_of_birth DATE DEFAULT NULL;

-- ============================================================
-- 2. Teacher Notes (classroom-level, not child-specific)
-- ============================================================
CREATE TABLE IF NOT EXISTS montree_teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES montree_teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  content TEXT,
  audio_storage_path TEXT,
  transcription TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fetching notes by classroom (newest first)
CREATE INDEX IF NOT EXISTS idx_teacher_notes_classroom_created
  ON montree_teacher_notes (classroom_id, created_at DESC);

-- Index for filtering by teacher
CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher
  ON montree_teacher_notes (teacher_id);
