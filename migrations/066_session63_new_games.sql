-- ============================================
-- MIGRATION 066: Add New Sensorial and Math Games
-- Created: January 24, 2026 - Session 63
-- Purpose: Add Color Match, Color Grade, Hundred Board, Odd/Even to game_curriculum_mapping
-- ============================================

-- Clear existing entries for these games (safe to re-run)
DELETE FROM game_curriculum_mapping WHERE game_id IN ('color-match', 'color-grade', 'hundred-board', 'odd-even');

-- ============================================
-- COLOR MATCHING GAME (Sensorial - Color Tablets Box I/II)
-- ============================================
INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'color-match',
  'Color Matching',
  '/games/color-match',
  '🎨',
  'Match pairs of identical colors - Color Tablets Box I & II',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%color tablet%' THEN 10
    WHEN cr.name ILIKE '%color box%' THEN 10
    WHEN cr.name ILIKE '%colour%' THEN 9
    WHEN cr.name ILIKE '%visual%' AND cr.area = 'sensorial' THEN 7
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'sensorial' 
  AND (
    cr.name ILIKE '%color tablet%' OR
    cr.name ILIKE '%color box%' OR
    cr.name ILIKE '%colour%' OR
    cr.name ILIKE '%visual discrimination%'
  );

-- ============================================
-- COLOR GRADING GAME (Sensorial - Color Tablets Box III)
-- ============================================
INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'color-grade',
  'Color Grading',
  '/games/color-grade',
  '🌈',
  'Arrange color shades from light to dark - Color Tablets Box III',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%color tablet%' AND cr.name ILIKE '%III%' THEN 10
    WHEN cr.name ILIKE '%color tablet%' AND cr.name ILIKE '%3%' THEN 10
    WHEN cr.name ILIKE '%grading%' THEN 10
    WHEN cr.name ILIKE '%color tablet%' THEN 9
    WHEN cr.name ILIKE '%visual%' AND cr.area = 'sensorial' THEN 7
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'sensorial' 
  AND (
    cr.name ILIKE '%color tablet%' OR
    cr.name ILIKE '%grading%' OR
    cr.name ILIKE '%visual discrimination%'
  );

-- ============================================
-- HUNDRED BOARD GAME (Mathematics)
-- ============================================
INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'hundred-board',
  'Hundred Board',
  '/games/hundred-board',
  '💯',
  'Place numbers 1-100 on the grid - discover number patterns',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%hundred board%' THEN 10
    WHEN cr.name ILIKE '%hundred chart%' THEN 10
    WHEN cr.name ILIKE '%100 board%' THEN 10
    WHEN cr.name ILIKE '%number sequence%' THEN 9
    WHEN cr.name ILIKE '%counting%' AND cr.name ILIKE '%100%' THEN 8
    WHEN cr.name ILIKE '%linear counting%' THEN 8
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'mathematics' 
  AND (
    cr.name ILIKE '%hundred board%' OR
    cr.name ILIKE '%hundred chart%' OR
    cr.name ILIKE '%100%' OR
    cr.name ILIKE '%number sequence%' OR
    cr.name ILIKE '%linear counting%' OR
    cr.name ILIKE '%counting 1%'
  );

-- ============================================
-- ODD/EVEN COUNTERS GAME (Mathematics - Cards and Counters)
-- ============================================
INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'odd-even',
  'Odd & Even',
  '/games/odd-even',
  '🔴',
  'Discover odd and even numbers with counters - Cards and Counters',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%cards and counters%' THEN 10
    WHEN cr.name ILIKE '%odd%even%' THEN 10
    WHEN cr.name ILIKE '%counter%' AND cr.area = 'mathematics' THEN 9
    WHEN cr.name ILIKE '%number concept%' THEN 7
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'mathematics' 
  AND (
    cr.name ILIKE '%cards and counters%' OR
    cr.name ILIKE '%odd%' OR
    cr.name ILIKE '%even%' OR
    cr.name ILIKE '%counter%'
  );

-- ============================================
-- FALLBACK: If no curriculum matches, create generic mappings
-- ============================================

-- Color Match fallback
INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'color-match', 'Color Matching', '/games/color-match', '🎨', 
  'Match pairs of identical colors', 
  cr.id::uuid, cr.name, 5
FROM curriculum_roadmap cr
WHERE cr.area = 'sensorial'
LIMIT 1
ON CONFLICT (game_id, work_id) DO NOTHING;

-- Color Grade fallback
INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'color-grade', 'Color Grading', '/games/color-grade', '🌈', 
  'Arrange color shades light to dark', 
  cr.id::uuid, cr.name, 5
FROM curriculum_roadmap cr
WHERE cr.area = 'sensorial'
LIMIT 1
ON CONFLICT (game_id, work_id) DO NOTHING;

-- Hundred Board fallback
INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'hundred-board', 'Hundred Board', '/games/hundred-board', '💯', 
  'Place numbers 1-100 on the grid', 
  cr.id::uuid, cr.name, 5
FROM curriculum_roadmap cr
WHERE cr.area = 'mathematics'
LIMIT 1
ON CONFLICT (game_id, work_id) DO NOTHING;

-- Odd/Even fallback
INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'odd-even', 'Odd & Even', '/games/odd-even', '🔴', 
  'Discover odd and even numbers with counters', 
  cr.id::uuid, cr.name, 5
FROM curriculum_roadmap cr
WHERE cr.area = 'mathematics'
LIMIT 1
ON CONFLICT (game_id, work_id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Session 63 games added to game_curriculum_mapping!';
  RAISE NOTICE '';
  RAISE NOTICE 'New games:';
  RAISE NOTICE '  🎨 Color Matching - /games/color-match';
  RAISE NOTICE '  🌈 Color Grading - /games/color-grade';
  RAISE NOTICE '  💯 Hundred Board - /games/hundred-board';
  RAISE NOTICE '  🔴 Odd & Even - /games/odd-even';
END $$;

-- Show what was created
SELECT game_id, game_name, work_name, relevance 
FROM game_curriculum_mapping 
WHERE game_id IN ('color-match', 'color-grade', 'hundred-board', 'odd-even')
ORDER BY game_id, relevance DESC;
