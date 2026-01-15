-- migrations/038_english_reports_complete.sql
-- Complete setup for English weekly reports with real children
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create schools table if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Beijing International School
INSERT INTO schools (id, name, slug, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Beijing International School', 'beijing-international', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- STEP 2: Create English works table
-- ============================================
DROP TABLE IF EXISTS english_works CASCADE;
CREATE TABLE english_works (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: Seed all 30 English works
-- ============================================
INSERT INTO english_works (id, code, name, description, sequence, category) VALUES
-- Sound Games (1-3)
('bs', 'BS', 'Beginning Sounds', 'I Spy with beginning sounds', 1, 'sound_games'),
('es', 'ES', 'Ending Sounds', 'I Spy with ending sounds', 2, 'sound_games'),
('ms', 'MS', 'Middle Sounds', 'Identifying middle vowel sounds', 3, 'sound_games'),

-- Word Building WBW (4-8)
('wbw_a', 'WBW/a/', 'Word Building: Short A', 'cat, hat, bat, mat', 4, 'word_building'),
('wbw_e', 'WBW/e/', 'Word Building: Short E', 'pen, bed, red, hen', 5, 'word_building'),
('wbw_i', 'WBW/i/', 'Word Building: Short I', 'pin, sit, bit, pig', 6, 'word_building'),
('wbw_o', 'WBW/o/', 'Word Building: Short O', 'hot, pot, dog, log', 7, 'word_building'),
('wbw_u', 'WBW/u/', 'Word Building: Short U', 'cup, bus, sun, fun', 8, 'word_building'),

-- Word Family WFW (9-13)
('wfw_a', 'WFW/a/', 'Word Family: Short A', '-at, -an, -ap, -ad families', 9, 'word_family'),
('wfw_e', 'WFW/e/', 'Word Family: Short E', '-en, -et, -ed, -eg families', 10, 'word_family'),
('wfw_i', 'WFW/i/', 'Word Family: Short I', '-in, -it, -ip, -ig families', 11, 'word_family'),
('wfw_o', 'WFW/o/', 'Word Family: Short O', '-ot, -op, -og, -ob families', 12, 'word_family'),
('wfw_u', 'WFW/u/', 'Word Family: Short U', '-un, -ut, -ug, -ub families', 13, 'word_family'),

-- Pink Reading PR (14-18)
('pr_a', 'PR/a/', 'Pink Reading: Short A', 'Reading CVC with short A', 14, 'reading'),
('pr_e', 'PR/e/', 'Pink Reading: Short E', 'Reading CVC with short E', 15, 'reading'),
('pr_i', 'PR/i/', 'Pink Reading: Short I', 'Reading CVC with short I', 16, 'reading'),
('pr_o', 'PR/o/', 'Pink Reading: Short O', 'Reading CVC with short O', 17, 'reading'),
('pr_u', 'PR/u/', 'Pink Reading: Short U', 'Reading CVC with short U', 18, 'reading'),

-- Primary Phonics Red Series (19-28)
('prph_red_1', 'PrPh Red 1', 'Primary Phonics: Red 1', 'Sam, Mac, Nat stories', 19, 'primary_phonics'),
('prph_red_2', 'PrPh Red 2', 'Primary Phonics: Red 2', 'Continuing short A', 20, 'primary_phonics'),
('prph_red_3', 'PrPh Red 3', 'Primary Phonics: Red 3', 'Short I introduction', 21, 'primary_phonics'),
('prph_red_4', 'PrPh Red 4', 'Primary Phonics: Red 4', 'Short A & I mixed', 22, 'primary_phonics'),
('prph_red_5', 'PrPh Red 5', 'Primary Phonics: Red 5', 'Short O introduction', 23, 'primary_phonics'),
('prph_red_6', 'PrPh Red 6', 'Primary Phonics: Red 6', 'Short A, I, O mixed', 24, 'primary_phonics'),
('prph_red_7', 'PrPh Red 7', 'Primary Phonics: Red 7', 'Short U introduction', 25, 'primary_phonics'),
('prph_red_8', 'PrPh Red 8', 'Primary Phonics: Red 8', 'All short vowels', 26, 'primary_phonics'),
('prph_red_9', 'PrPh Red 9', 'Primary Phonics: Red 9', 'Short E introduction', 27, 'primary_phonics'),
('prph_red_10', 'PrPh Red 10', 'Primary Phonics: Red 10', 'All five short vowels mastery', 28, 'primary_phonics'),

-- Blends (29-30)
('bl_init', 'BL/init/', 'Initial Blends', 'bl, cl, fl, gl, br, cr, dr', 29, 'blends'),
('bl_final', 'BL/final/', 'Final Blends', 'nd, nt, nk, mp, ft, lt', 30, 'blends');

-- ============================================
-- STEP 4: Child English position tracking
-- ============================================
DROP TABLE IF EXISTS child_english_position CASCADE;
CREATE TABLE child_english_position (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  current_work_id TEXT REFERENCES english_works(id),
  status TEXT DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id)
);

-- ============================================
-- STEP 5: Weekly English log for reports
-- ============================================
DROP TABLE IF EXISTS english_weekly_log CASCADE;
CREATE TABLE english_weekly_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  work_done_id TEXT REFERENCES english_works(id),
  performance TEXT CHECK (performance IN ('excellent', 'good', 'needs_practice', 'introduced')),
  notes TEXT,
  next_work_id TEXT REFERENCES english_works(id),
  report_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, week_start)
);

-- ============================================
-- STEP 6: Seed children's starting positions
-- (Place them at appropriate starting points)
-- ============================================
INSERT INTO child_english_position (child_id, current_work_id, status)
SELECT 
  id as child_id,
  'wbw_a' as current_work_id,  -- Most kids start at WBW/a/
  'in_progress' as status
FROM children
WHERE active_status = true
ON CONFLICT (child_id) DO NOTHING;

-- ============================================
-- STEP 7: Enable RLS
-- ============================================
ALTER TABLE english_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_english_position ENABLE ROW LEVEL SECURITY;
ALTER TABLE english_weekly_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on english_works" ON english_works FOR ALL USING (true);
CREATE POLICY "Allow all on child_english_position" ON child_english_position FOR ALL USING (true);
CREATE POLICY "Allow all on english_weekly_log" ON english_weekly_log FOR ALL USING (true);

-- ============================================
-- VERIFY
-- ============================================
SELECT '✅ English works seeded: ' || COUNT(*) as result FROM english_works;
SELECT '✅ Children with positions: ' || COUNT(*) as result FROM child_english_position;
SELECT '✅ Active children: ' || name FROM children WHERE active_status = true ORDER BY name;
