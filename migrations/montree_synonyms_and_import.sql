-- ============================================
-- MONTREE BULLETPROOF IMPORT SYSTEM
-- Based on enterprise document AI best practices
-- ============================================

-- 1. WORK SYNONYMS TABLE
CREATE TABLE IF NOT EXISTS montree_work_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text TEXT NOT NULL,
  work_id TEXT NOT NULL,
  school_id UUID DEFAULT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  confidence INT DEFAULT 100,
  usage_count INT DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint (handling NULL school_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_montree_synonyms_unique 
ON montree_work_synonyms(raw_text, COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE INDEX IF NOT EXISTS idx_montree_synonyms_raw_text ON montree_work_synonyms(raw_text);
CREATE INDEX IF NOT EXISTS idx_montree_synonyms_status ON montree_work_synonyms(status);

-- 2. IMPORT AUDIT LOG
CREATE TABLE IF NOT EXISTS montree_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID DEFAULT NULL,
  classroom_id UUID DEFAULT NULL,
  teacher_id TEXT,
  filename TEXT,
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_children INT DEFAULT 0,
  children_imported INT DEFAULT 0,
  total_works INT DEFAULT 0,
  works_auto_matched INT DEFAULT 0,
  works_suggested INT DEFAULT 0,
  works_manual INT DEFAULT 0,
  works_skipped INT DEFAULT 0,
  raw_extraction JSONB,
  validation_result JSONB,
  final_data JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_logs_status ON montree_import_logs(status);

-- 3. SEED COMMON SYNONYMS
INSERT INTO montree_work_synonyms (raw_text, work_id, source, confidence, status) VALUES
  -- Practical Life
  ('eye dropper', 'pl_dropper', 'manual', 100, 'active'),
  ('dropper', 'pl_dropper', 'manual', 100, 'active'),
  ('small dropper', 'pl_dropper', 'manual', 100, 'active'),
  ('eyedropper', 'pl_dropper', 'manual', 100, 'active'),
  ('suction', 'pl_suction', 'manual', 90, 'active'),
  ('suction cup', 'pl_suction', 'manual', 100, 'active'),
  ('pouring', 'pl_pouring', 'manual', 100, 'active'),
  ('dry pouring', 'pl_dry_pouring', 'manual', 100, 'active'),
  ('wet pouring', 'pl_wet_pouring', 'manual', 100, 'active'),
  ('spooning', 'pl_spooning', 'manual', 100, 'active'),
  ('tonging', 'pl_tonging', 'manual', 100, 'active'),
  ('tweezing', 'pl_tweezing', 'manual', 100, 'active'),
  ('dressing frames', 'pl_dressing_frames', 'manual', 100, 'active'),
  
  -- Sensorial
  ('color box 1', 'se_color_box_1', 'manual', 100, 'active'),
  ('colour box 1', 'se_color_box_1', 'manual', 100, 'active'),
  ('color box 2', 'se_color_box_2', 'manual', 100, 'active'),
  ('colour box 2', 'se_color_box_2', 'manual', 100, 'active'),
  ('color boxes 2', 'se_color_box_2', 'manual', 100, 'active'),
  ('colour boxes 2la', 'se_color_box_2', 'manual', 100, 'active'),
  ('color boxes 2la', 'se_color_box_2', 'manual', 100, 'active'),
  ('cb2', 'se_color_box_2', 'manual', 95, 'active'),
  ('color box 3', 'se_color_box_3', 'manual', 100, 'active'),
  ('colour box 3', 'se_color_box_3', 'manual', 100, 'active'),
  ('pink tower', 'se_pink_tower', 'manual', 100, 'active'),
  ('brown stair', 'se_brown_stair', 'manual', 100, 'active'),
  ('brown stairs', 'se_brown_stair', 'manual', 100, 'active'),
  ('broad stair', 'se_brown_stair', 'manual', 100, 'active'),
  ('red rods', 'se_red_rods', 'manual', 100, 'active'),
  ('cylinder blocks', 'se_cylinder_blocks', 'manual', 100, 'active'),
  ('knobbed cylinders', 'se_cylinder_blocks', 'manual', 100, 'active'),
  ('knobless cylinders', 'se_knobless_cylinders', 'manual', 100, 'active'),
  ('sound boxes', 'se_sound_boxes', 'manual', 100, 'active'),
  ('binomial cube', 'se_binomial_cube', 'manual', 100, 'active'),
  ('trinomial cube', 'se_trinomial_cube', 'manual', 100, 'active'),
  ('geometric solids', 'se_geometric_solids', 'manual', 100, 'active'),
  
  -- Mathematics
  ('number rods', 'ma_number_rods', 'manual', 100, 'active'),
  ('sandpaper numbers', 'ma_sandpaper_numbers', 'manual', 100, 'active'),
  ('spindle box', 'ma_spindle_box', 'manual', 100, 'active'),
  ('spindle boxes', 'ma_spindle_box', 'manual', 100, 'active'),
  ('spindles', 'ma_spindle_box', 'manual', 90, 'active'),
  ('cards and counters', 'ma_cards_counters', 'manual', 100, 'active'),
  ('teen board', 'ma_teen_board_1', 'manual', 100, 'active'),
  ('teen board 1', 'ma_teen_board_1', 'manual', 100, 'active'),
  ('teen boards', 'ma_teen_board_1', 'manual', 95, 'active'),
  ('ten board', 'ma_ten_board', 'manual', 100, 'active'),
  ('tens board', 'ma_ten_board', 'manual', 100, 'active'),
  ('bead stair', 'ma_short_bead_stair', 'manual', 90, 'active'),
  ('short bead stair', 'ma_short_bead_stair', 'manual', 100, 'active'),
  ('golden beads', 'ma_golden_beads', 'manual', 100, 'active'),
  ('hundred board', 'ma_hundred_board', 'manual', 100, 'active'),
  ('stamp game', 'ma_stamp_game', 'manual', 100, 'active'),
  
  -- Language
  ('sandpaper letters', 'la_sandpaper_letters', 'manual', 100, 'active'),
  ('moveable alphabet', 'la_moveable_alphabet', 'manual', 100, 'active'),
  ('movable alphabet', 'la_moveable_alphabet', 'manual', 100, 'active'),
  ('lma', 'la_moveable_alphabet', 'manual', 95, 'active'),
  ('pink series', 'la_pink_series', 'manual', 100, 'active'),
  ('blue series', 'la_blue_series', 'manual', 100, 'active'),
  ('green series', 'la_green_series', 'manual', 100, 'active'),
  ('metal insets', 'la_metal_insets', 'manual', 100, 'active'),
  ('object box', 'la_object_box', 'manual', 100, 'active'),
  ('phonogram', 'la_phonogram', 'manual', 100, 'active'),
  ('phonograms', 'la_phonogram', 'manual', 100, 'active'),
  
  -- Cultural
  ('globe', 'cu_globe_land_water', 'manual', 90, 'active'),
  ('land water globe', 'cu_globe_land_water', 'manual', 100, 'active'),
  ('continent globe', 'cu_globe_continents', 'manual', 100, 'active'),
  ('puzzle map', 'cu_puzzle_map_world', 'manual', 90, 'active'),
  ('world map', 'cu_puzzle_map_world', 'manual', 100, 'active'),
  ('continent map', 'cu_puzzle_map_continents', 'manual', 100, 'active'),
  ('botany cabinet', 'cu_botany_cabinet', 'manual', 100, 'active'),
  ('leaf cabinet', 'cu_botany_cabinet', 'manual', 95, 'active')
  
ON CONFLICT DO NOTHING;

-- 4. Function to increment synonym usage
CREATE OR REPLACE FUNCTION increment_synonym_usage(synonym_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE montree_work_synonyms 
  SET usage_count = usage_count + 1,
      last_used_at = NOW(),
      updated_at = NOW()
  WHERE id = synonym_id;
END;
$$ LANGUAGE plpgsql;
