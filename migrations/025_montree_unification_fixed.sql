-- ============================================
-- MIGRATION 025 FIXED: MONTREE UNIFICATION
-- Created: January 12, 2026
-- Fixed: January 13, 2026 - home_families compatibility
-- ============================================

-- ============================================
-- PART 1: FAMILIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  materials_owned JSONB DEFAULT '[]'::jsonb,
  weekly_plans JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_families_email ON families(email);

-- ============================================
-- PART 2: EXTEND CHILDREN TABLE
-- ============================================

ALTER TABLE children ADD COLUMN IF NOT EXISTS family_id UUID;
ALTER TABLE children ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4F46E5';
ALTER TABLE children ADD COLUMN IF NOT EXISTS journal_entries JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_children_family ON children(family_id);

-- ============================================
-- PART 3: EXTEND CHILD_WORK_PROGRESS TABLE
-- ============================================

ALTER TABLE child_work_progress ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT 'teacher';
ALTER TABLE child_work_progress ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE child_work_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_cwp_updated_by ON child_work_progress(updated_by);

-- ============================================
-- PART 4: GAME CURRICULUM MAPPING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS game_curriculum_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  game_name TEXT NOT NULL,
  game_url TEXT NOT NULL,
  game_icon TEXT,
  game_description TEXT,
  work_id UUID NOT NULL,
  work_name TEXT,
  relevance INTEGER DEFAULT 5 CHECK (relevance >= 1 AND relevance <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, work_id)
);

CREATE INDEX IF NOT EXISTS idx_gcm_work ON game_curriculum_mapping(work_id);
CREATE INDEX IF NOT EXISTS idx_gcm_game ON game_curriculum_mapping(game_id);

-- ============================================
-- PART 5: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_curriculum_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read families" ON families;
DROP POLICY IF EXISTS "Anyone can insert families" ON families;
DROP POLICY IF EXISTS "Anyone can update families" ON families;
DROP POLICY IF EXISTS "Anyone can read game mappings" ON game_curriculum_mapping;

CREATE POLICY "Anyone can read families" ON families FOR SELECT USING (true);
CREATE POLICY "Anyone can insert families" ON families FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update families" ON families FOR UPDATE USING (true);
CREATE POLICY "Anyone can read game mappings" ON game_curriculum_mapping FOR SELECT USING (true);

-- ============================================
-- PART 6: MIGRATE DATA FROM HOME_FAMILIES (FIXED)
-- Only migrate columns that exist
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'home_families') THEN
    -- Only select columns that exist in home_families
    INSERT INTO families (id, name, email, materials_owned, weekly_plans, created_at)
    SELECT 
      id, 
      name, 
      email,
      COALESCE(materials_owned, '[]'::jsonb),
      COALESCE(weekly_plans, '{}'::jsonb),
      COALESCE(created_at, NOW())
    FROM home_families
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      materials_owned = EXCLUDED.materials_owned,
      weekly_plans = EXCLUDED.weekly_plans;
    
    RAISE NOTICE 'Migrated data from home_families to families table';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 025 complete: Montree Unification';
  RAISE NOTICE '  - families table created';
  RAISE NOTICE '  - children extended with family_id, color, journal_entries';
  RAISE NOTICE '  - child_work_progress extended with updated_by, notes';
  RAISE NOTICE '  - game_curriculum_mapping table created';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run 025b_seed_game_mappings.sql';
END $$;
