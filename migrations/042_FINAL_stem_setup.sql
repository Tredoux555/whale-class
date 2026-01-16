-- FIX: Remove bad constraint and set up 18 Whale Class students
-- Run this in Supabase SQL Editor

-- STEP 1: Drop the unique constraint on name (names aren't unique across schools!)
ALTER TABLE children DROP CONSTRAINT IF EXISTS children_name_key;

-- STEP 2: Add columns if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'school_id') THEN
    ALTER TABLE children ADD COLUMN school_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'display_order') THEN
    ALTER TABLE children ADD COLUMN display_order INTEGER;
  END IF;
END $$;

-- STEP 3: Create schools table if missing
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: Create classrooms table if missing
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT DEFAULT '3-6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Create classroom_children if missing
CREATE TABLE IF NOT EXISTS classroom_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, child_id)
);

-- STEP 6: Insert Beijing International School
INSERT INTO schools (name, slug, settings)
VALUES ('Beijing International School', 'beijing-international', '{"owner": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- STEP 7: Get school ID and update/create children
DO $$
DECLARE
  v_school_id UUID;
  v_classroom_id UUID;
BEGIN
  -- Get school ID
  SELECT id INTO v_school_id FROM schools WHERE slug = 'beijing-international';

  -- Delete ALL existing children (clean slate)
  DELETE FROM classroom_children;
  DELETE FROM children;

  -- Insert the 18 Whale Class students
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

  -- Create Whale classroom if not exists
  INSERT INTO classrooms (school_id, name, age_group)
  SELECT v_school_id, '🐋 Whale Class', '3-6'
  WHERE NOT EXISTS (SELECT 1 FROM classrooms WHERE school_id = v_school_id);
  
  -- Get classroom ID
  SELECT id INTO v_classroom_id FROM classrooms WHERE school_id = v_school_id LIMIT 1;

  -- Link all children to classroom
  INSERT INTO classroom_children (classroom_id, child_id, status)
  SELECT v_classroom_id, id, 'active' FROM children WHERE school_id = v_school_id;

  RAISE NOTICE '✅ Done! 18 Whale Class students created';
END $$;

-- VERIFY
SELECT display_order, name, school_id FROM children ORDER BY display_order;
