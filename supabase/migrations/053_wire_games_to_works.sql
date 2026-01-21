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
WHERE w.code = 'la_sandpaper_letters' AND g.slug = 'letter-tracer'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- NUMBER TRACER → Sandpaper Numerals
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.code = 'ma_sandpaper_numerals' AND g.slug = 'number-tracer'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- SOUND SAFARI → I-Spy / Sound Games
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.code = 'la_sound_games' AND g.slug = 'sound-safari'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- WORD BUILDER → Moveable Alphabet
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.code = 'la_moveable_alphabet' AND g.slug = 'word-builder'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- MATCH ATTACK → Pink Series / Object Boxes
-- ============================================
-- Primary: Object Boxes
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.code = 'la_object_boxes' AND g.slug = 'match-attack'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- Reinforcement: Pink Series
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'reinforcement', 2
FROM montessori_works w, montessori_games g
WHERE w.code = 'la_pink_series' AND g.slug = 'match-attack'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- READ & REVEAL → Pink Series Reading
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.code = 'la_pink_series' AND g.slug = 'read-and-reveal'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- Also link to Blue Series as extension
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'extension', 2
FROM montessori_works w, montessori_games g
WHERE w.code = 'la_blue_series' AND g.slug = 'read-and-reveal'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- SENTENCE SCRAMBLE → Grammar/Sentence Building
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.code = 'la_sentence_analysis' AND g.slug = 'sentence-scramble'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- Also link to Command Cards
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'reinforcement', 2
FROM montessori_works w, montessori_games g
WHERE w.code = 'la_command_cards' AND g.slug = 'sentence-scramble'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- QUANTITY MATCH → Cards and Counters
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.code = 'ma_cards_counters' AND g.slug = 'quantity-match'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- BEAD FRAME → Small Bead Frame
-- ============================================
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.code = 'ma_small_bead_frame' AND g.slug = 'bead-frame'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- Also link to Golden Beads as prerequisite
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'extension', 2
FROM montessori_works w, montessori_games g
WHERE w.code = 'ma_golden_beads' AND g.slug = 'bead-frame'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- SENSORIAL SORT → Color Boxes + Pink Tower
-- ============================================
-- Color Box 1
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'primary', 1
FROM montessori_works w, montessori_games g
WHERE w.code = 'se_color_box_1' AND g.slug = 'sensorial-sort'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- Color Box 2
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'reinforcement', 2
FROM montessori_works w, montessori_games g
WHERE w.code = 'se_color_box_2' AND g.slug = 'sensorial-sort'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- Color Box 3
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'extension', 3
FROM montessori_works w, montessori_games g
WHERE w.code = 'se_color_box_3' AND g.slug = 'sensorial-sort'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- Pink Tower
INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
SELECT w.id, g.id, 'reinforcement', 4
FROM montessori_works w, montessori_games g
WHERE w.code = 'se_pink_tower' AND g.slug = 'sensorial-sort'
ON CONFLICT (work_id, game_id) DO NOTHING;

-- ============================================
-- UPDATE related_game_ids ON WORKS (denormalized for quick access)
-- ============================================
UPDATE montessori_works w
SET related_game_ids = (
  SELECT ARRAY_AGG(wg.game_id)
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
--   w.code as work_code,
--   wg.relationship_type
-- FROM work_games wg
-- JOIN montessori_games g ON g.id = wg.game_id
-- JOIN montessori_works w ON w.id = wg.work_id
-- ORDER BY g.name, wg.display_order;
