-- QUICK GUIDE COLUMNS MIGRATION
-- Adds teacher-friendly quick reference for presentations
-- Run in Supabase SQL Editor
-- Created: January 28, 2026 - Session 110

-- ============================================
-- 1. ADD NEW COLUMNS
-- ============================================
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS quick_guide TEXT,
ADD COLUMN IF NOT EXISTS video_search_term TEXT;

-- Add comment for documentation
COMMENT ON COLUMN montessori_works.quick_guide IS '3-5 bullet points teacher can scan in 10 seconds before presenting. Action-oriented, includes critical gotchas.';
COMMENT ON COLUMN montessori_works.video_search_term IS 'YouTube search term for presentation video refresher. Display as: https://youtube.com/results?search_query={term}';

-- ============================================
-- 2. PRACTICAL LIFE - TRANSFER WORKS
-- ============================================

-- Dry Pouring
UPDATE montessori_works SET 
  quick_guide = '• Two fingers through handle, THUMB ON TOP; support hand under spout
• Pour LEFT-TO-RIGHT, hover 1-1½" above—pitchers NEVER touch
• Tilt slowly, check for LAST GRAINS before straightening
• Spills cleaned with PINCER GRIP—this IS the indirect aim
• Use contrasting tray color so errors are visible',
  video_search_term = 'montessori dry pouring presentation'
WHERE slug = 'dry-pouring';

-- Wet Pouring (one-to-one)
UPDATE montessori_works SET 
  quick_guide = '• Present AFTER dry pouring mastered; sponge on tray signals "spills OK"
• Same grip as dry; WAIT FOR LAST DROP before straightening
• WIPE THE SPOUT with sponge after each pour
• Squeeze sponge over bucket to empty
• Progression: identical pitchers → glasses → marked fill lines',
  video_search_term = 'montessori wet pouring water presentation'
WHERE slug = 'wet-pouring-one';

-- Spooning
UPDATE montessori_works SET 
  quick_guide = '• THREE-FINGER GRIP (thumb on top, index under, middle supports)—EXACT pencil grip
• Scoop TOWARD body, lift ABOVE bowl rim, PAUSE, then transfer
• ROTATE spoon toward body to release grains; return spoon flat
• Non-dominant hand GROUNDS the bowl throughout
• Invite child to continue HALFWAY through return transfer',
  video_search_term = 'montessori spooning presentation practical life'
WHERE slug = 'spooning';

-- Tongs Transfer
UPDATE montessori_works SET 
  quick_guide = '• Progression: Spoon → Tongs → Tweezers (master each before progressing)
• PENCIL GRIP: Index + middle on one side, thumb on opposite
• Say "Open... Close" while demonstrating squeeze motion
• Start with SOFT objects (pompoms) → progress to harder (beads)
• Tongs must be SMALL ENOUGH for child''s hand',
  video_search_term = 'montessori tong transfer presentation'
WHERE slug = 'tongs-transfer';

-- Tweezers Transfer
UPDATE montessori_works SET 
  quick_guide = '• Present AFTER tongs mastered—tweezers require finer control
• TOP of tweezers at PALM; hold ends with thumb + index finger
• Press to CLOSE, release to OPEN (opposite of tongs)
• Compartmentalized containers (ice cube tray) add precision challenge
• This is final fine motor prep before pencil work',
  video_search_term = 'montessori tweezer transfer presentation'
WHERE slug = 'tweezers-transfer';

-- Folding Simple
UPDATE montessori_works SET 
  quick_guide = '• Fold FROM BODY AWAY (bottom to top)—stitched line appears on fold edge
• Match corners EXACTLY—this is the point of interest, don''t rush
• SLIDE fingers along fold to smooth, don''t press hard (no crease)
• Release: lift INDEX first, then THUMB (deliberate sequence)
• Use cloths with contrasting stitched fold lines',
  video_search_term = 'montessori folding cloths presentation'
WHERE slug = 'folding-simple';

-- Folding Complex
UPDATE montessori_works SET 
  quick_guide = '• Progression: single horizontal → double median → single diagonal → double diagonal
• Each new fold follows SAME technique: from body away, match corners
• Rotate cloth after first fold so new fold line is horizontal
• For diagonal: anchor bottom left corner, bring right to top LEFT
• Final result should show stitched lines on all fold edges',
  video_search_term = 'montessori folding cloths diagonal presentation'
WHERE slug = 'folding-complex';

-- ============================================
-- 3. SENSORIAL WORKS
-- ============================================

-- Pink Tower
UPDATE montessori_works SET 
  quick_guide = '• Carry smallest cubes with PINCER GRIP (thumb + index)—prepares writing
• Large cubes: one hand FLAT ON TOP, one hand FLAT UNDERNEATH
• Place cubes RANDOMLY on RIGHT half of mat (chaos → order)
• Build LARGEST → SMALLEST; place each with ONE steady movement
• Model "THE LOOKING"—visually compare before choosing each cube',
  video_search_term = 'montessori pink tower presentation'
WHERE slug = 'pink-tower';

-- Brown Stair
UPDATE montessori_works SET 
  quick_guide = '• TWO dimensions change (height + width); length stays constant at 20cm
• Thin prisms: carry VERTICALLY; thick prisms: HORIZONTALLY with both hands
• Place RANDOMLY on right side of mat, all SAME ORIENTATION
• Build THICKEST → THINNEST, prisms TOUCHING, aligned horizontally
• RUN HAND DOWN LEFT SIDE to check alignment',
  video_search_term = 'montessori brown stair broad stair presentation'
WHERE slug = 'brown-stair';

-- Knobbed Cylinders Block 1
UPDATE montessori_works SET 
  quick_guide = '• THREE-FINGER GRIP on knob (thumb, index, middle)—EXACT pencil prep
• Present BLOCK 1 first (diameter + height vary proportionally)
• Remove in RANDOM order, alternating sides; place UPRIGHT in front
• MIX arrangement, then replace ONE AT A TIME trying different sockets
• Material SELF-CORRECTS—don''t intervene',
  video_search_term = 'montessori knobbed cylinders presentation'
WHERE slug = 'knobbed-cylinders-1';

-- Color Tablets Box 1
UPDATE montessori_works SET 
  quick_guide = '• Contains 3 pairs of PRIMARY colors (red, yellow, blue)—sharpest contrast
• NEVER touch colored surface—hold by WHITE BORDERS only
• Remove one at a time, place VERTICALLY in random order on right
• Match by "THE LOOKING"—emphasize visual search; pair side by side
• No teacher correction—material self-corrects (visual matching)',
  video_search_term = 'montessori color tablets box 1 presentation'
WHERE slug = 'color-tablets-1';

-- Sandpaper Letters
UPDATE montessori_works SET 
  quick_guide = '• Say SOUND not letter name ("/mmm/" not "em")—essential for reading
• Trace with TWO FINGERS together (index + middle), following WRITING STROKE direction
• Present 2-3 CONTRASTING letters per lesson; include vowel in early groups
• THREE-PERIOD LESSON: 1) "This is /m/" 2) "Show me /m/" 3) "What is this?"
• Control of error is TACTILE—child feels if fingers go off sandpaper',
  video_search_term = 'montessori sandpaper letters presentation'
WHERE slug = 'sandpaper-letters';

-- ============================================
-- 4. VERIFY UPDATES
-- ============================================
SELECT name, slug, 
  CASE WHEN quick_guide IS NOT NULL THEN '✓' ELSE '✗' END as has_guide,
  CASE WHEN video_search_term IS NOT NULL THEN '✓' ELSE '✗' END as has_video
FROM montessori_works 
WHERE slug IN (
  'dry-pouring', 'wet-pouring-one', 'spooning', 'tongs-transfer', 'tweezers-transfer', 
  'folding-simple', 'folding-complex',
  'pink-tower', 'brown-stair', 'knobbed-cylinders-1', 'color-tablets-1', 'sandpaper-letters'
)
ORDER BY name;
