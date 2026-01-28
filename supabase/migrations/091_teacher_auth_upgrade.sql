-- Migration: 091_teacher_auth_upgrade.sql
-- Purpose: Add login_code and password_set_at to teachers table
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: ADD COLUMNS TO TEACHERS TABLE
-- ============================================

ALTER TABLE montree_teachers 
ADD COLUMN IF NOT EXISTS login_code VARCHAR(6) UNIQUE,
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ;

-- ============================================
-- PART 2: GENERATE CODES FOR EXISTING TEACHERS
-- ============================================

-- Function to generate random 6-char code
CREATE OR REPLACE FUNCTION generate_login_code() RETURNS VARCHAR(6) AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  code VARCHAR(6) := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Update existing teachers without login codes
UPDATE montree_teachers 
SET login_code = generate_login_code()
WHERE login_code IS NULL;

-- ============================================
-- PART 3: ADD YOUR LOGIN CODE (Tredoux)
-- ============================================

-- First, find or create your teacher record
-- You're at Beijing International School, Whale Class

-- Check if you exist as a teacher
DO $$
DECLARE
  teacher_exists BOOLEAN;
  school_id_val UUID;
  classroom_id_val UUID;
BEGIN
  -- Get the whale classroom and school (if exists)
  SELECT id INTO classroom_id_val FROM montree_classrooms WHERE name ILIKE '%whale%' LIMIT 1;
  SELECT id INTO school_id_val FROM montree_schools LIMIT 1;
  
  -- Check if Tredoux exists
  SELECT EXISTS(SELECT 1 FROM montree_teachers WHERE name ILIKE '%tredoux%') INTO teacher_exists;
  
  IF NOT teacher_exists AND school_id_val IS NOT NULL THEN
    -- Create Tredoux teacher record
    INSERT INTO montree_teachers (
      school_id, 
      classroom_id, 
      name, 
      email,
      login_code, 
      password_hash,
      role, 
      is_active
    ) VALUES (
      school_id_val,
      classroom_id_val,
      'Tredoux',
      NULL,
      'whale1',  -- Easy to remember code
      NULL,      -- No password yet, will set via app
      'admin',
      true
    );
    RAISE NOTICE 'Created Tredoux teacher with code: whale1';
  ELSE
    -- Update existing with easy code
    UPDATE montree_teachers 
    SET login_code = 'whale1'
    WHERE name ILIKE '%tredoux%';
    RAISE NOTICE 'Updated Tredoux login code to: whale1';
  END IF;
END $$;

-- ============================================
-- PART 4: CREATE INDEX FOR FAST LOOKUPS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_montree_teachers_login_code ON montree_teachers(login_code);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check your teacher record:
SELECT id, name, login_code, password_set_at, is_active 
FROM montree_teachers 
WHERE name ILIKE '%tredoux%' OR login_code = 'whale1';

-- See all teachers with codes:
SELECT name, login_code, email, password_set_at IS NOT NULL as has_password
FROM montree_teachers 
WHERE is_active = true;
