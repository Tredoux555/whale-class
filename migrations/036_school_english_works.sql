-- migrations/036_school_english_works.sql
-- School-specific English works progression
-- Each school can customize their English sequence

-- ============================================
-- MASTER ENGLISH WORKS (Platform-wide defaults)
-- These are the gold standard works
-- ============================================
CREATE TABLE IF NOT EXISTS master_english_works (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,           -- e.g., "WBW/a/", "BS"
  name TEXT NOT NULL,                   -- e.g., "Word Building: Short A"
  description TEXT,
  sequence INTEGER NOT NULL,            -- Default order
  category TEXT NOT NULL,               -- sound_games, word_building, reading, blends, phonograms
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHOOL ENGLISH WORKS (Per-school customization)
-- Each school can reorder, add, or hide works
-- ============================================
CREATE TABLE IF NOT EXISTS school_english_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Work identification
  work_code TEXT NOT NULL,              -- e.g., "WBW/a/", "BS"
  work_name TEXT NOT NULL,              -- e.g., "Word Building: Short A"
  description TEXT,
  
  -- Sequence & status
  sequence INTEGER NOT NULL,            -- Order in this school's progression
  category TEXT NOT NULL DEFAULT 'other',
  is_active BOOLEAN DEFAULT true,       -- Hidden if false
  
  -- Notes
  notes TEXT,
  
  -- Link to master (optional - null for custom school-specific works)
  master_work_id TEXT REFERENCES master_english_works(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique: one sequence per school, one code per school
  UNIQUE(school_id, sequence),
  UNIQUE(school_id, work_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_english_works_school ON school_english_works(school_id);
CREATE INDEX IF NOT EXISTS idx_school_english_works_sequence ON school_english_works(school_id, sequence);
CREATE INDEX IF NOT EXISTS idx_school_english_works_active ON school_english_works(school_id, is_active);

-- ============================================
-- CHILD ENGLISH PROGRESS (Tracking per child)
-- Which English work is each child on?
-- ============================================
CREATE TABLE IF NOT EXISTS child_english_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Current position
  current_work_code TEXT NOT NULL,      -- Which work they're currently on
  current_work_sequence INTEGER,        -- Sequence number in school's progression
  
  -- Status for current work
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'mastered')),
  started_date DATE,
  mastered_date DATE,
  
  -- Notes from teacher
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One progress record per child
  UNIQUE(child_id)
);

CREATE INDEX IF NOT EXISTS idx_child_english_progress_child ON child_english_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_child_english_progress_school ON child_english_progress(school_id);

-- ============================================
-- WEEKLY ENGLISH LOG (For report generation)
-- What did each child do this week?
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_english_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  -- Week identification
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  
  -- What was done
  work_code TEXT NOT NULL,              -- Which work they did
  work_name TEXT,                       -- Work name at time of logging
  
  -- Performance notes
  performance TEXT CHECK (performance IN ('excellent', 'good', 'needs_practice', 'introduced')),
  teacher_notes TEXT,
  
  -- Next work (for report)
  next_work_code TEXT,
  next_work_name TEXT,
  
  -- Auto-generated report text
  report_text TEXT,
  
  -- Timestamps
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  logged_by UUID REFERENCES users(id),
  
  -- One log per child per week
  UNIQUE(child_id, week_number, year)
);

CREATE INDEX IF NOT EXISTS idx_weekly_english_log_child ON weekly_english_log(child_id);
CREATE INDEX IF NOT EXISTS idx_weekly_english_log_week ON weekly_english_log(week_number, year);
CREATE INDEX IF NOT EXISTS idx_weekly_english_log_school ON weekly_english_log(school_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE master_english_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_english_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_english_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_english_log ENABLE ROW LEVEL SECURITY;

-- Everyone can read master works
CREATE POLICY "Anyone can read master English works" ON master_english_works
  FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role full access on school_english_works" 
  ON school_english_works FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on child_english_progress" 
  ON child_english_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on weekly_english_log" 
  ON weekly_english_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on master_english_works" 
  ON master_english_works FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED MASTER ENGLISH WORKS
-- ============================================
INSERT INTO master_english_works (id, code, name, description, sequence, category) VALUES
-- Sound Games
('bs', 'BS', 'Beginning Sounds', 'I Spy with beginning sounds', 1, 'sound_games'),
('es', 'ES', 'Ending Sounds', 'I Spy with ending sounds', 2, 'sound_games'),
('ms', 'MS', 'Middle Sounds', 'Identifying middle vowel sounds', 3, 'sound_games'),

-- Word Building by Vowel
('wbw_a', 'WBW/a/', 'Word Building: Short A', 'CVC words with short A (cat, hat, bat)', 4, 'word_building'),
('wbw_e', 'WBW/e/', 'Word Building: Short E', 'CVC words with short E (pen, bed, red)', 5, 'word_building'),
('wbw_i', 'WBW/i/', 'Word Building: Short I', 'CVC words with short I (pin, sit, bit)', 6, 'word_building'),
('wbw_o', 'WBW/o/', 'Word Building: Short O', 'CVC words with short O (hot, pot, dog)', 7, 'word_building'),
('wbw_u', 'WBW/u/', 'Word Building: Short U', 'CVC words with short U (cup, bus, sun)', 8, 'word_building'),

-- Pink Reading
('pr_a', 'PR/a/', 'Pink Reading: Short A', 'Reading CVC words with short A', 9, 'reading'),
('pr_e', 'PR/e/', 'Pink Reading: Short E', 'Reading CVC words with short E', 10, 'reading'),
('pr_i', 'PR/i/', 'Pink Reading: Short I', 'Reading CVC words with short I', 11, 'reading'),
('pr_o', 'PR/o/', 'Pink Reading: Short O', 'Reading CVC words with short O', 12, 'reading'),
('pr_u', 'PR/u/', 'Pink Reading: Short U', 'Reading CVC words with short U', 13, 'reading'),

-- Blends (Blue Series prep)
('bl_init', 'BL/init/', 'Initial Blends', 'bl, cl, fl, gl, pl, sl, br, cr, dr, fr, gr, pr, tr', 14, 'blends'),
('bl_final', 'BL/final/', 'Final Blends', 'nd, nt, nk, mp, ft, lt, lk, sk', 15, 'blends')

ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sequence = EXCLUDED.sequence,
  category = EXCLUDED.category;

-- ============================================
-- SEED BEIJING INTERNATIONAL SCHOOL'S ENGLISH WORKS
-- Clone from master as starting point
-- ============================================
INSERT INTO school_english_works (school_id, work_code, work_name, description, sequence, category, master_work_id)
SELECT 
  '00000000-0000-0000-0000-000000000001',  -- Beijing International School
  code,
  name,
  description,
  sequence,
  category,
  id
FROM master_english_works
ON CONFLICT (school_id, work_code) DO NOTHING;

-- ============================================
-- DONE
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ School English Works tables created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables:';
  RAISE NOTICE '  - master_english_works (platform defaults)';
  RAISE NOTICE '  - school_english_works (per-school customization)';
  RAISE NOTICE '  - child_english_progress (tracking)';
  RAISE NOTICE '  - weekly_english_log (for reports)';
  RAISE NOTICE '';
  RAISE NOTICE 'Beijing International School seeded with default works.';
END $$;
