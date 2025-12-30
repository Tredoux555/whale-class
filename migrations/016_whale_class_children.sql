-- Migration 012: Add Whale Class Children
-- Run in Supabase SQL Editor
-- Date: December 30, 2025

-- ============================================
-- Add 20 Whale Class students (age range 2.5-5)
-- ============================================

INSERT INTO children (name, date_of_birth, enrollment_date, active_status)
VALUES
  ('Rachel', '2021-06-15', '2024-09-01', true),
  ('YueZe', '2021-03-20', '2024-09-01', true),
  ('Lucky', '2020-11-10', '2024-09-01', true),
  ('Austin', '2021-08-25', '2024-09-01', true),
  ('MingXi', '2020-07-12', '2024-09-01', true),
  ('Leo', '2021-01-30', '2024-09-01', true),
  ('Joey', '2020-05-18', '2024-09-01', true),
  ('Eric', '2021-04-22', '2024-09-01', true),
  ('Jimmy', '2020-09-08', '2024-09-01', true),
  ('Kevin', '2021-02-14', '2024-09-01', true),
  ('NiuNiu', '2021-07-03', '2024-09-01', true),
  ('Amy', '2020-12-25', '2024-09-01', true),
  ('MaoMao', '2022-03-10', '2024-09-01', true),
  ('Henry', '2022-01-15', '2024-09-01', true),
  ('Segina', '2021-10-20', '2024-09-01', true),
  ('Gengerlyn', '2020-08-30', '2024-09-01', true),
  ('Hayden', '2022-02-28', '2024-09-01', true),
  ('Kayla', '2021-05-05', '2024-09-01', true),
  ('Stella', '2021-09-12', '2024-09-01', true),
  ('KK', '2020-10-01', '2024-09-01', true)
ON CONFLICT (name) DO UPDATE SET
  active_status = true,
  enrollment_date = EXCLUDED.enrollment_date;

-- Verify
SELECT name, date_of_birth, 
       EXTRACT(YEAR FROM AGE(date_of_birth)) as age_years,
       active_status 
FROM children 
WHERE active_status = true
ORDER BY name;
