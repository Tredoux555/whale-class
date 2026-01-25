-- =====================================================
-- MIGRATION 068: Teacher Login Codes
-- Adds login_code for first-time teacher setup
-- Date: January 25, 2026
-- =====================================================

-- Add login_code column to simple_teachers
ALTER TABLE simple_teachers 
ADD COLUMN IF NOT EXISTS login_code TEXT UNIQUE;

-- Add password_set flag (true after teacher sets their own password)
ALTER TABLE simple_teachers 
ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false;

-- Generate codes for existing teachers without codes
UPDATE simple_teachers 
SET login_code = LOWER(
  COALESCE(
    (SELECT name FROM montree_classrooms WHERE id = classroom_id),
    'teacher'
  ) || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4)
)
WHERE login_code IS NULL;

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_simple_teachers_login_code ON simple_teachers(login_code);

-- Verify
SELECT name, login_code, password_set, classroom_id FROM simple_teachers;
