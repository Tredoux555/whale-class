-- ============================================
-- MIGRATION 026: FIX AMY'S DEMO DATA
-- Created: January 11, 2026
-- Purpose: Fix work_id prefixes to match curriculum_roadmap
-- ============================================
-- 
-- THE PROBLEM:
-- Demo data was seeded with wrong prefixes:
--   lang_* should be la_*
--   sen_*  should be se_*
--   math_* should be ma_*
--
-- This breaks the parent API because work_ids don't match curriculum_roadmap
-- ============================================

-- Amy's child_id
-- afbed794-4eee-4eb5-8262-30ab67638ec7

BEGIN;

-- ============================================
-- STEP 1: Delete incorrect entries
-- ============================================

DELETE FROM child_work_progress 
WHERE child_id = 'afbed794-4eee-4eb5-8262-30ab67638ec7'
  AND work_id IN (
    'lang_sound_games',
    'lang_sandpaper_letters', 
    'lang_moveable_alphabet',
    'sen_cylinder_block_1',
    'sen_pink_tower',
    'sen_brown_stair',
    'math_number_rods',
    'math_sandpaper_numbers'
  );

-- ============================================
-- STEP 2: Insert correct Language works (for game recommendations!)
-- ============================================

-- Sound Games - MASTERED (triggers game recommendations)
INSERT INTO child_work_progress (child_id, work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes)
VALUES (
  'afbed794-4eee-4eb5-8262-30ab67638ec7',
  'la_sound_games',
  3, -- Mastered
  '2025-12-01',
  '2025-12-15',
  '2026-01-05',
  NOW(),
  'teacher',
  'Amy has mastered identifying beginning, middle, and ending sounds!'
)
ON CONFLICT (child_id, work_id) DO UPDATE SET
  status = EXCLUDED.status,
  mastered_date = EXCLUDED.mastered_date,
  updated_at = EXCLUDED.updated_at,
  notes = EXCLUDED.notes;

-- Sandpaper Letters - PRACTICING
INSERT INTO child_work_progress (child_id, work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes)
VALUES (
  'afbed794-4eee-4eb5-8262-30ab67638ec7',
  'la_sandpaper_letters',
  2, -- Practicing
  '2025-12-10',
  '2026-01-08',
  NULL,
  NOW(),
  'teacher',
  'Working on letters m, s, t, a - great progress!'
)
ON CONFLICT (child_id, work_id) DO UPDATE SET
  status = EXCLUDED.status,
  practicing_date = EXCLUDED.practicing_date,
  updated_at = EXCLUDED.updated_at,
  notes = EXCLUDED.notes;

-- Moveable Alphabet - PRESENTED
INSERT INTO child_work_progress (child_id, work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes)
VALUES (
  'afbed794-4eee-4eb5-8262-30ab67638ec7',
  'la_moveable_alphabet',
  1, -- Presented
  '2026-01-10',
  NULL,
  NULL,
  NOW(),
  'teacher',
  'First introduction to the moveable alphabet today'
)
ON CONFLICT (child_id, work_id) DO UPDATE SET
  status = EXCLUDED.status,
  presented_date = EXCLUDED.presented_date,
  updated_at = EXCLUDED.updated_at,
  notes = EXCLUDED.notes;

-- Pink Series (CVC Words) - PRACTICING
INSERT INTO child_work_progress (child_id, work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes)
VALUES (
  'afbed794-4eee-4eb5-8262-30ab67638ec7',
  'la_pink_series',
  2, -- Practicing
  '2025-12-20',
  '2026-01-05',
  NULL,
  NOW(),
  'teacher',
  'Reading CVC words like cat, hat, mat'
)
ON CONFLICT (child_id, work_id) DO UPDATE SET
  status = EXCLUDED.status,
  practicing_date = EXCLUDED.practicing_date,
  updated_at = EXCLUDED.updated_at,
  notes = EXCLUDED.notes;

-- ============================================
-- STEP 3: Insert correct Sensorial works
-- ============================================

-- Cylinder Block 1 - MASTERED
INSERT INTO child_work_progress (child_id, work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes)
VALUES (
  'afbed794-4eee-4eb5-8262-30ab67638ec7',
  'se_cylinder_block_1',
  3, -- Mastered
  '2025-11-01',
  '2025-11-15',
  '2025-12-01',
  NOW(),
  'teacher',
  NULL
)
ON CONFLICT (child_id, work_id) DO UPDATE SET
  status = EXCLUDED.status,
  mastered_date = EXCLUDED.mastered_date,
  updated_at = EXCLUDED.updated_at;

-- Pink Tower - PRACTICING
INSERT INTO child_work_progress (child_id, work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes)
VALUES (
  'afbed794-4eee-4eb5-8262-30ab67638ec7',
  'se_pink_tower',
  2, -- Practicing
  '2025-11-15',
  '2026-01-03',
  NULL,
  NOW(),
  'teacher',
  NULL
)
ON CONFLICT (child_id, work_id) DO UPDATE SET
  status = EXCLUDED.status,
  practicing_date = EXCLUDED.practicing_date,
  updated_at = EXCLUDED.updated_at;

-- Brown Stair - PRESENTED
INSERT INTO child_work_progress (child_id, work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes)
VALUES (
  'afbed794-4eee-4eb5-8262-30ab67638ec7',
  'se_brown_stair',
  1, -- Presented
  '2026-01-08',
  NULL,
  NULL,
  NOW(),
  'teacher',
  NULL
)
ON CONFLICT (child_id, work_id) DO UPDATE SET
  status = EXCLUDED.status,
  presented_date = EXCLUDED.presented_date,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- STEP 4: Insert correct Math works
-- ============================================

-- Number Rods - PRACTICING
INSERT INTO child_work_progress (child_id, work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes)
VALUES (
  'afbed794-4eee-4eb5-8262-30ab67638ec7',
  'ma_number_rods',
  2, -- Practicing
  '2025-12-05',
  '2026-01-02',
  NULL,
  NOW(),
  'teacher',
  NULL
)
ON CONFLICT (child_id, work_id) DO UPDATE SET
  status = EXCLUDED.status,
  practicing_date = EXCLUDED.practicing_date,
  updated_at = EXCLUDED.updated_at;

-- Sandpaper Numerals - PRESENTED
INSERT INTO child_work_progress (child_id, work_id, status, presented_date, practicing_date, mastered_date, updated_at, updated_by, notes)
VALUES (
  'afbed794-4eee-4eb5-8262-30ab67638ec7',
  'ma_sandpaper_numerals',
  1, -- Presented
  '2026-01-10',
  NULL,
  NULL,
  NOW(),
  'teacher',
  NULL
)
ON CONFLICT (child_id, work_id) DO UPDATE SET
  status = EXCLUDED.status,
  presented_date = EXCLUDED.presented_date,
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  amy_count INTEGER;
  language_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO amy_count 
  FROM child_work_progress 
  WHERE child_id = 'afbed794-4eee-4eb5-8262-30ab67638ec7';
  
  SELECT COUNT(*) INTO language_count 
  FROM child_work_progress cwp
  JOIN curriculum_roadmap cr ON cwp.work_id = cr.id
  WHERE cwp.child_id = 'afbed794-4eee-4eb5-8262-30ab67638ec7'
    AND cr.area = 'language';

  RAISE NOTICE '';
  RAISE NOTICE '✅ Amy demo data fixed!';
  RAISE NOTICE '   Total progress entries: %', amy_count;
  RAISE NOTICE '   Language works (for game recs): %', language_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Test with: curl www.teacherpotato.xyz/api/unified/today?child_id=afbed794-4eee-4eb5-8262-30ab67638ec7';
END $$;
