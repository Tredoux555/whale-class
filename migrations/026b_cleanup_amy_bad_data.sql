-- ============================================
-- CLEANUP: Delete wrong-prefix entries for Amy
-- Run this in Supabase SQL Editor
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

-- Verify cleanup
SELECT work_id, status FROM child_work_progress 
WHERE child_id = 'afbed794-4eee-4eb5-8262-30ab67638ec7'
ORDER BY work_id;
