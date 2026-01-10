-- ============================================
-- MIGRATION 025b: SEED GAME-CURRICULUM MAPPINGS
-- Created: January 12, 2026
-- Fixed: January 13, 2026 - UUID casting
-- Purpose: Populate game_curriculum_mapping with Language work mappings
-- ============================================

-- Note: This uses work_name matching since UUIDs vary by environment
-- Run this AFTER 025_montree_unification.sql

-- Clear existing mappings (safe to re-run)
TRUNCATE game_curriculum_mapping;

-- ============================================
-- LETTER SOUNDS GAME
-- Maps to: Sound Games, Sandpaper Letters
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'letter-sounds',
  'Letter Sounds',
  '/games/letter-sounds',
  '🔤',
  'Match letters to their sounds',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%sandpaper letters%' THEN 10
    WHEN cr.name ILIKE '%sound games%' OR cr.name ILIKE '%phonological%' THEN 9
    WHEN cr.name ILIKE '%object sound%' THEN 8
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%sandpaper letters%' OR
    cr.name ILIKE '%sound games%' OR
    cr.name ILIKE '%phonological%' OR
    cr.name ILIKE '%object sound%' OR
    cr.name ILIKE '%letter%'
  );

-- ============================================
-- BEGINNING SOUNDS GAME  
-- Maps to: Sound Games, I Spy
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'beginning-sounds',
  'Beginning Sounds',
  '/games/sound-games/beginning',
  '👂',
  'I spy something that begins with...',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%sound games%' THEN 10
    WHEN cr.name ILIKE '%phonological%' THEN 9
    WHEN cr.name ILIKE '%i spy%' THEN 10
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%sound games%' OR
    cr.name ILIKE '%phonological%' OR
    cr.name ILIKE '%i spy%' OR
    cr.name ILIKE '%beginning sound%'
  );

-- ============================================
-- MIDDLE SOUNDS GAME
-- Maps to: Short Vowels, Sound Games
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'middle-sounds',
  'Middle Sounds',
  '/games/sound-games/middle',
  '🎯',
  'Find the middle sound',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%short vowel%' THEN 10
    WHEN cr.name ILIKE '%vowel%' THEN 9
    WHEN cr.name ILIKE '%sound games%' THEN 9
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%short vowel%' OR
    cr.name ILIKE '%vowel%' OR
    cr.name ILIKE '%sound games%' OR
    cr.name ILIKE '%middle sound%'
  );

-- ============================================
-- ENDING SOUNDS GAME
-- Maps to: Sound Games, Object Boxes
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'ending-sounds',
  'Ending Sounds',
  '/games/sound-games/ending',
  '📚',
  'I spy something that ends with...',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%sound games%' THEN 10
    WHEN cr.name ILIKE '%object%box%' THEN 8
    WHEN cr.name ILIKE '%ending sound%' THEN 10
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%sound games%' OR
    cr.name ILIKE '%object%box%' OR
    cr.name ILIKE '%ending sound%'
  );

-- ============================================
-- COMBINED I-SPY GAME
-- Maps to: Phonograms, Sound Games Mastery
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'combined-i-spy',
  'Combined I Spy',
  '/games/combined-i-spy',
  '🔍',
  'Find by beginning AND ending sounds',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%phonogram%' THEN 10
    WHEN cr.name ILIKE '%blending%' THEN 9
    WHEN cr.name ILIKE '%sound games%' THEN 8
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%phonogram%' OR
    cr.name ILIKE '%blending%' OR
    cr.name ILIKE '%sound games%'
  );

-- ============================================
-- LETTER MATCH GAME
-- Maps to: Sandpaper Letters, Moveable Alphabet
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'letter-match',
  'Letter Match',
  '/games/letter-match',
  '🔡',
  'Match uppercase to lowercase',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%sandpaper letters%' THEN 10
    WHEN cr.name ILIKE '%moveable alphabet%' THEN 7
    WHEN cr.name ILIKE '%letter%' THEN 8
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%sandpaper letters%' OR
    cr.name ILIKE '%moveable alphabet%' OR
    cr.name ILIKE '%letter%'
  );

-- ============================================
-- LETTER TRACER GAME
-- Maps to: Sandpaper Letters, Pencil Grip, Tracing
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'letter-tracer',
  'Letter Tracer',
  '/games/letter-tracer',
  '✏️',
  'Practice writing letters',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%sandpaper letters%' THEN 10
    WHEN cr.name ILIKE '%pencil%' OR cr.name ILIKE '%grip%' THEN 9
    WHEN cr.name ILIKE '%tracing%' THEN 10
    WHEN cr.name ILIKE '%writing%' THEN 8
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%sandpaper letters%' OR
    cr.name ILIKE '%pencil%' OR
    cr.name ILIKE '%grip%' OR
    cr.name ILIKE '%tracing%' OR
    cr.name ILIKE '%writing%'
  );

-- ============================================
-- WORD BUILDER GAME
-- Maps to: Moveable Alphabet, CVC Words
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'word-builder',
  'Word Builder',
  '/games/word-builder',
  '🔤',
  'Build words letter by letter',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%moveable alphabet%' THEN 10
    WHEN cr.name ILIKE '%cvc%' THEN 10
    WHEN cr.name ILIKE '%word building%' THEN 10
    WHEN cr.name ILIKE '%spelling%' THEN 8
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%moveable alphabet%' OR
    cr.name ILIKE '%cvc%' OR
    cr.name ILIKE '%word building%' OR
    cr.name ILIKE '%spelling%' OR
    cr.name ILIKE '%phonetic%'
  );

-- ============================================
-- VOCABULARY BUILDER GAME
-- Maps to: Object Boxes, Oral Language
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'vocabulary-builder',
  'Vocabulary Builder',
  '/games/vocabulary-builder',
  '📚',
  'Learn new words with pictures',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%object box%' THEN 10
    WHEN cr.name ILIKE '%oral language%' THEN 9
    WHEN cr.name ILIKE '%vocabulary%' THEN 10
    WHEN cr.name ILIKE '%classified%' THEN 8
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%object box%' OR
    cr.name ILIKE '%oral language%' OR
    cr.name ILIKE '%vocabulary%' OR
    cr.name ILIKE '%classified%' OR
    cr.name ILIKE '%nomenclature%'
  );

-- ============================================
-- GRAMMAR SYMBOLS GAME
-- Maps to: Grammar Introduction
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'grammar-symbols',
  'Grammar Symbols',
  '/games/grammar-symbols',
  '▲',
  'Learn parts of speech',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%grammar%' THEN 10
    WHEN cr.name ILIKE '%noun%' THEN 9
    WHEN cr.name ILIKE '%verb%' THEN 9
    WHEN cr.name ILIKE '%adjective%' THEN 9
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%grammar%' OR
    cr.name ILIKE '%noun%' OR
    cr.name ILIKE '%verb%' OR
    cr.name ILIKE '%adjective%' OR
    cr.name ILIKE '%article%'
  );

-- ============================================
-- SENTENCE BUILDER GAME
-- Maps to: Sentence Building, Free Writing
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'sentence-builder',
  'Sentence Builder',
  '/games/sentence-builder',
  '📝',
  'Build sentences with word cards',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%sentence%' THEN 10
    WHEN cr.name ILIKE '%free writing%' THEN 7
    WHEN cr.name ILIKE '%composition%' THEN 8
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%sentence%' OR
    cr.name ILIKE '%free writing%' OR
    cr.name ILIKE '%composition%'
  );

-- ============================================
-- SENTENCE MATCH GAME
-- Maps to: Sentence Reading, Comprehension
-- ============================================

INSERT INTO game_curriculum_mapping (game_id, game_name, game_url, game_icon, game_description, work_id, work_name, relevance)
SELECT 
  'sentence-match',
  'Sentence Match',
  '/games/sentence-match',
  '🖼️',
  'Match sentences to pictures',
  cr.id::uuid,
  cr.name,
  CASE 
    WHEN cr.name ILIKE '%sentence%reading%' THEN 10
    WHEN cr.name ILIKE '%comprehension%' THEN 10
    WHEN cr.name ILIKE '%sentence%' THEN 9
    WHEN cr.name ILIKE '%reading%' THEN 7
    ELSE 5
  END
FROM curriculum_roadmap cr
WHERE cr.area = 'language' 
  AND (
    cr.name ILIKE '%sentence%' OR
    cr.name ILIKE '%comprehension%' OR
    cr.name ILIKE '%reading%'
  );

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  mapping_count INTEGER;
  game_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM game_curriculum_mapping;
  SELECT COUNT(DISTINCT game_id) INTO game_count FROM game_curriculum_mapping;
  
  RAISE NOTICE '✅ Game mappings seeded successfully!';
  RAISE NOTICE '  - Total mappings: %', mapping_count;
  RAISE NOTICE '  - Games mapped: %', game_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Verify with: SELECT game_name, COUNT(*) FROM game_curriculum_mapping GROUP BY game_name;';
END $$;
