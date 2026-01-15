-- Migration 040: Create Children Table + Whale Class Students
-- Run this in Supabase SQL Editor
-- Creates the table fresh if it doesn't exist

-- ============================================
-- STEP 1: Create children table if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  gender TEXT DEFAULT 'they' CHECK (gender IN ('he', 'she', 'they')),
  display_order INTEGER,
  date_of_birth DATE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: Clear existing and insert 18 Whale Class students
-- ============================================
DELETE FROM children;

INSERT INTO children (name, gender, display_order, date_of_birth, enrollment_date, active_status) VALUES
  ('Rachel', 'she', 1, '2021-06-15', '2024-09-01', true),
  ('Yueze', 'he', 2, '2021-03-20', '2024-09-01', true),
  ('Lucky', 'she', 3, '2020-11-10', '2024-09-01', true),
  ('Austin', 'he', 4, '2021-08-25', '2024-09-01', true),
  ('Minxi', 'she', 5, '2020-07-12', '2024-09-01', true),
  ('Leo', 'he', 6, '2021-01-30', '2024-09-01', true),
  ('Joey', 'he', 7, '2020-05-18', '2024-09-01', true),
  ('Eric', 'he', 8, '2021-04-22', '2024-09-01', true),
  ('Jimmy', 'he', 9, '2020-09-08', '2024-09-01', true),
  ('Kevin', 'he', 10, '2021-02-14', '2024-09-01', true),
  ('Niuniu', 'she', 11, '2021-07-03', '2024-09-01', true),
  ('Amy', 'she', 12, '2020-12-25', '2024-09-01', true),
  ('Henry', 'he', 13, '2022-01-15', '2024-09-01', true),
  ('Segina', 'she', 14, '2021-10-20', '2024-09-01', true),
  ('Hayden', 'he', 15, '2022-02-28', '2024-09-01', true),
  ('KK', 'he', 16, '2020-10-01', '2024-09-01', true),
  ('Kayla', 'she', 17, '2021-05-05', '2024-09-01', true),
  ('Stella', 'she', 18, '2021-09-12', '2024-09-01', true);

-- ============================================
-- STEP 3: Enable RLS
-- ============================================
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on children" ON children;
CREATE POLICY "Allow all on children" ON children FOR ALL USING (true);

-- ============================================
-- VERIFY
-- ============================================
SELECT display_order, name, gender FROM children ORDER BY display_order;
