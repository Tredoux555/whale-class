-- Migration 039: Update Whale Class Children (Correct Order & Names)
-- Run in Supabase SQL Editor
-- Matches the exact order from Tredoux's reports

-- First, deactivate all current children
UPDATE children SET active_status = false WHERE active_status = true;

-- Delete and recreate with correct names and order
DELETE FROM children;

-- Insert the 18 Whale Class children in EXACT order
INSERT INTO children (id, name, date_of_birth, enrollment_date, active_status, display_order)
VALUES
  (gen_random_uuid(), 'Rachel', '2021-06-15', '2024-09-01', true, 1),
  (gen_random_uuid(), 'Yueze', '2021-03-20', '2024-09-01', true, 2),
  (gen_random_uuid(), 'Lucky', '2020-11-10', '2024-09-01', true, 3),
  (gen_random_uuid(), 'Austin', '2021-08-25', '2024-09-01', true, 4),
  (gen_random_uuid(), 'Minxi', '2020-07-12', '2024-09-01', true, 5),
  (gen_random_uuid(), 'Leo', '2021-01-30', '2024-09-01', true, 6),
  (gen_random_uuid(), 'Joey', '2020-05-18', '2024-09-01', true, 7),
  (gen_random_uuid(), 'Eric', '2021-04-22', '2024-09-01', true, 8),
  (gen_random_uuid(), 'Jimmy', '2020-09-08', '2024-09-01', true, 9),
  (gen_random_uuid(), 'Kevin', '2021-02-14', '2024-09-01', true, 10),
  (gen_random_uuid(), 'Niuniu', '2021-07-03', '2024-09-01', true, 11),
  (gen_random_uuid(), 'Amy', '2020-12-25', '2024-09-01', true, 12),
  (gen_random_uuid(), 'Henry', '2022-01-15', '2024-09-01', true, 13),
  (gen_random_uuid(), 'Segina', '2021-10-20', '2024-09-01', true, 14),
  (gen_random_uuid(), 'Hayden', '2022-02-28', '2024-09-01', true, 15),
  (gen_random_uuid(), 'KK', '2020-10-01', '2024-09-01', true, 16),
  (gen_random_uuid(), 'Kayla', '2021-05-05', '2024-09-01', true, 17),
  (gen_random_uuid(), 'Stella', '2021-09-12', '2024-09-01', true, 18);

-- Add display_order column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'display_order') THEN
    ALTER TABLE children ADD COLUMN display_order INTEGER;
  END IF;
END $$;

-- Verify
SELECT display_order, name FROM children WHERE active_status = true ORDER BY display_order;
