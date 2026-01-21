-- WIRE GAMES TO WORKS MIGRATION
-- Run AFTER 052_gamification_architecture.sql
-- Created: January 21, 2026
-- Purpose: Populate work_games junction table linking games to Montessori works

-- ============================================
-- CLEAR EXISTING MAPPINGS (if re-running)
-- ============================================
DELETE FROM work_games;

-- ============================================
-- LETTER TRACER → Sandpaper Letters
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug = 'sandpaper-letters' AND g.slug = 'letter-tracer'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- NUMBER TRACER → Sandpaper Numerals
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug = 'sandpaper-numerals' AND g.slug = 'number-tracer'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- SOUND SAFARI → I-Spy / Sound Games
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%sound-game%' AND g.slug = 'sound-safari'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- WORD BUILDER → Moveable Alphabet
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%moveable-alphabet%' AND g.slug = 'word-builder'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- MATCH ATTACK → Pink Series / Object Boxes
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%object-box%' AND g.slug = 'match-attack'
ON CONFLICT (work_id, game_id) DO NOTHING;

INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'reinforcement', 2
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%pink-series%' AND g.slug = 'match-attack'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- READ & REVEAL → Pink Series Reading
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%pink-series%' AND g.slug = 'read-and-reveal'
ON CONFLICT (work_id, game_id) DO NOTHING;

INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'extension', 2
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%blue-series%' AND g.slug = 'read-and-reveal'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- SENTENCE SCRAMBLE → Sentence Analysis / Commands
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%sentence%' AND g.slug = 'sentence-scramble'
ON CONFLICT (work_id, game_id) DO NOTHING;

INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'reinforcement', 2
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%command-card%' AND g.slug = 'sentence-scramble'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- QUANTITY MATCH → Cards and Counters
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%cards-counters%' AND g.slug = 'quantity-match'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- Also try alternate naming
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%cards-and-counters%' AND g.slug = 'quantity-match'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- BEAD FRAME → Small Bead Frame / Golden Beads
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%bead-frame%' AND g.slug = 'bead-frame'
ON CONFLICT (work_id, game_id) DO NOTHING;

INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'extension', 2
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%golden-bead%' AND g.slug = 'bead-frame'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- SENSORIAL SORT → Color Boxes + Pink Tower
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%color-box%' AND g.slug = 'sensorial-sort'
ON CONFLICT (work_id, game_id) DO NOTHING;

INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'reinforcement', 2
FROM montessori_works w, montessori_games g
WHERE w.slug ILIKE '%pink-tower%' AND g.slug = 'sensorial-sort'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- UPDATE related_game_ids ON WORKS (denormalized for quick access)
-- ============================================
UPDATE montessori_works w
SET related_game_ids = (
  SELECT COALESCE(ARRAY_AGG(wg.game_id), '{}')
  FROM work_games wg
  WHERE wg.work_id = w.id
)
WHERE EXISTS (
  SELECT 1 FROM work_games wg WHERE wg.work_id = w.id
);

-- ============================================
-- VERIFICATION QUERY (Run after migration)
-- ============================================
-- SELECT 
--   g.name as game_name,
--   g.slug as game_slug,
--   w.name as work_name,
--   w.slug as work_slug,
--   wg.relationship_type
-- FROM work_games wg
-- JOIN montessori_games g ON g.id = wg.game_id
-- JOIN montessori_works w ON w.id = wg.work_id
-- ORDER BY g.name, wg.display_order;
