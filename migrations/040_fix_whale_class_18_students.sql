-- Migration 040: Fix Whale Class - 18 Students in Correct Order
-- Run this in Supabase SQL Editor
-- This connects children to Beijing International School properly

-- Step 1: Get Beijing International School ID
DO $$
DECLARE
  v_school_id UUID;
  v_classroom_id UUID;
BEGIN
  -- Get school ID
  SELECT id INTO v_school_id FROM schools WHERE slug = 'beijing-international';
  
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Beijing International School not found! Run seed-school first.';
  END IF;
  
  -- Get Whale classroom ID
  SELECT id INTO v_classroom_id FROM classrooms WHERE school_id = v_school_id LIMIT 1;

  -- Step 2: Clear old children for this school
  DELETE FROM classroom_children WHERE child_id IN (SELECT id FROM children WHERE school_id = v_school_id);
  DELETE FROM weekly_assignments WHERE child_id IN (SELECT id FROM children WHERE school_id = v_school_id);
  DELETE FROM children WHERE school_id = v_school_id;

  -- Step 3: Insert the correct 18 Whale Class students
  INSERT INTO children (id, name, school_id, date_of_birth, enrollment_date, active_status, display_order)
  VALUES
    (gen_random_uuid(), 'Rachel', v_school_id, '2021-06-15', '2024-09-01', true, 1),
    (gen_random_uuid(), 'Yueze', v_school_id, '2021-03-20', '2024-09-01', true, 2),
    (gen_random_uuid(), 'Lucky', v_school_id, '2020-11-10', '2024-09-01', true, 3),
    (gen_random_uuid(), 'Austin', v_school_id, '2021-08-25', '2024-09-01', true, 4),
    (gen_random_uuid(), 'Minxi', v_school_id, '2020-07-12', '2024-09-01', true, 5),
    (gen_random_uuid(), 'Leo', v_school_id, '2021-01-30', '2024-09-01', true, 6),
    (gen_random_uuid(), 'Joey', v_school_id, '2020-05-18', '2024-09-01', true, 7),
    (gen_random_uuid(), 'Eric', v_school_id, '2021-04-22', '2024-09-01', true, 8),
    (gen_random_uuid(), 'Jimmy', v_school_id, '2020-09-08', '2024-09-01', true, 9),
    (gen_random_uuid(), 'Kevin', v_school_id, '2021-02-14', '2024-09-01', true, 10),
    (gen_random_uuid(), 'Niuniu', v_school_id, '2021-07-03', '2024-09-01', true, 11),
    (gen_random_uuid(), 'Amy', v_school_id, '2020-12-25', '2024-09-01', true, 12),
    (gen_random_uuid(), 'Henry', v_school_id, '2022-01-15', '2024-09-01', true, 13),
    (gen_random_uuid(), 'Segina', v_school_id, '2021-10-20', '2024-09-01', true, 14),
    (gen_random_uuid(), 'Hayden', v_school_id, '2022-02-28', '2024-09-01', true, 15),
    (gen_random_uuid(), 'KK', v_school_id, '2020-10-01', '2024-09-01', true, 16),
    (gen_random_uuid(), 'Kayla', v_school_id, '2021-05-05', '2024-09-01', true, 17),
    (gen_random_uuid(), 'Stella', v_school_id, '2021-09-12', '2024-09-01', true, 18);

  -- Step 4: Link children to Whale classroom
  IF v_classroom_id IS NOT NULL THEN
    INSERT INTO classroom_children (classroom_id, child_id, status)
    SELECT v_classroom_id, id, 'active' FROM children WHERE school_id = v_school_id;
  END IF;

  RAISE NOTICE 'Success! 18 Whale Class students created for school %', v_school_id;
END $$;

-- Verify the result
SELECT display_order, name, school_id FROM children WHERE active_status = true ORDER BY display_order;
