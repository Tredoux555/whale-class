-- COMBINED MIGRATION: Set up THE STEM with 18 Whale Class Students
-- Run this ONCE in Supabase SQL Editor
-- Creates: schools, classrooms, 18 correct students

-- =====================================================
-- STEP 1: SCHOOLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);

-- =====================================================
-- STEP 2: CLASSROOMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT DEFAULT '3-6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classrooms_school ON classrooms(school_id);

-- =====================================================
-- STEP 3: CLASSROOM_CHILDREN (Link table)
-- =====================================================
CREATE TABLE IF NOT EXISTS classroom_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, child_id)
);

-- =====================================================
-- STEP 4: ADD COLUMNS TO CHILDREN TABLE IF MISSING
-- =====================================================
DO $$ 
BEGIN
  -- Add school_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'school_id') THEN
    ALTER TABLE children ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
  
  -- Add display_order column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'display_order') THEN
    ALTER TABLE children ADD COLUMN display_order INTEGER;
  END IF;
END $$;

-- =====================================================
-- STEP 5: CREATE BEIJING INTERNATIONAL SCHOOL
-- =====================================================
INSERT INTO schools (name, slug, settings)
VALUES ('Beijing International School', 'beijing-international', '{"owner": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- STEP 6: CREATE WHALE CLASSROOM
-- =====================================================
INSERT INTO classrooms (school_id, name, age_group)
SELECT id, '🐋 Whale Class', '3-6' 
FROM schools 
WHERE slug = 'beijing-international'
ON CONFLICT DO NOTHING;

-- =====================================================
-- STEP 7: CLEAR OLD CHILDREN FOR THIS SCHOOL & INSERT 18 CORRECT ONES
-- =====================================================
DO $$
DECLARE
  v_school_id UUID;
  v_classroom_id UUID;
BEGIN
  -- Get school ID
  SELECT id INTO v_school_id FROM schools WHERE slug = 'beijing-international';
  
  -- Get classroom ID
  SELECT id INTO v_classroom_id FROM classrooms WHERE school_id = v_school_id LIMIT 1;

  -- Clear old links and children
  DELETE FROM classroom_children WHERE child_id IN (SELECT id FROM children WHERE school_id = v_school_id);
  DELETE FROM children WHERE school_id = v_school_id;

  -- Insert the 18 Whale Class students in YOUR order
  INSERT INTO children (name, school_id, date_of_birth, enrollment_date, active_status, display_order)
  VALUES
    ('Rachel', v_school_id, '2021-06-15', '2024-09-01', true, 1),
    ('Yueze', v_school_id, '2021-03-20', '2024-09-01', true, 2),
    ('Lucky', v_school_id, '2020-11-10', '2024-09-01', true, 3),
    ('Austin', v_school_id, '2021-08-25', '2024-09-01', true, 4),
    ('Minxi', v_school_id, '2020-07-12', '2024-09-01', true, 5),
    ('Leo', v_school_id, '2021-01-30', '2024-09-01', true, 6),
    ('Joey', v_school_id, '2020-05-18', '2024-09-01', true, 7),
    ('Eric', v_school_id, '2021-04-22', '2024-09-01', true, 8),
    ('Jimmy', v_school_id, '2020-09-08', '2024-09-01', true, 9),
    ('Kevin', v_school_id, '2021-02-14', '2024-09-01', true, 10),
    ('Niuniu', v_school_id, '2021-07-03', '2024-09-01', true, 11),
    ('Amy', v_school_id, '2020-12-25', '2024-09-01', true, 12),
    ('Henry', v_school_id, '2022-01-15', '2024-09-01', true, 13),
    ('Segina', v_school_id, '2021-10-20', '2024-09-01', true, 14),
    ('Hayden', v_school_id, '2022-02-28', '2024-09-01', true, 15),
    ('KK', v_school_id, '2020-10-01', '2024-09-01', true, 16),
    ('Kayla', v_school_id, '2021-05-05', '2024-09-01', true, 17),
    ('Stella', v_school_id, '2021-09-12', '2024-09-01', true, 18);

  -- Link children to Whale classroom
  INSERT INTO classroom_children (classroom_id, child_id, status)
  SELECT v_classroom_id, id, 'active' FROM children WHERE school_id = v_school_id;

  RAISE NOTICE '✅ Success! Created 18 Whale Class students for Beijing International School';
END $$;

-- =====================================================
-- VERIFY: Should show 18 students in correct order
-- =====================================================
SELECT display_order, name FROM children WHERE active_status = true ORDER BY display_order;
