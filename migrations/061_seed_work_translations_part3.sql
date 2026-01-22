-- Migration: 061_seed_work_translations.sql (part 3)
-- Mathematics Works (10 works)

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('number-rods', 'Number Rods', 'mathematics',
 'Introduces quantity 1-10 through length. Children physically experience quantity before symbols.',
 'Compare lengths of objects and count with them.',
 '{name} worked with the Number Rods.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('sandpaper-numerals', 'Sandpaper Numerals', 'mathematics',
 'Introduces number symbols through touch. Multi-sensory learning connects symbol to quantity.',
 'Trace numbers in sand or on rough surfaces.',
 '{name} traced sandpaper numerals.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('spindle-box', 'Spindle Boxes', 'mathematics',
 'Associates quantity with symbol and introduces the concept of zero. Counting and placing builds number sense.',
 'Count and sort small objects into containers.',
 '{name} counted spindles into the spindle box.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('cards-counters', 'Cards and Counters', 'mathematics',
 'Reinforces 1-10 and introduces odd/even. Laying out counters builds number sense and pattern recognition.',
 'Count and arrange objects in rows to explore odd and even.',
 '{name} worked with cards and counters.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('golden-beads', 'Golden Beads', 'mathematics',
 'Introduces the decimal system through concrete materials. Children physically experience ones, tens, hundreds, thousands.',
 'Group objects into tens and ones.',
 '{name} explored the decimal system with golden beads.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('teen-boards', 'Teen Boards', 'mathematics',
 'Introduces teen numbers by physically showing ten-and-some-more. Builds understanding of place value.',
 'Count objects from 10-19, emphasizing "ten and..."',
 '{name} worked with the Teen Boards.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('tens-boards', 'Tens Boards', 'mathematics',
 'Introduces counting by tens through 90. Builds understanding of the base-10 system.',
 'Count objects by tens (10, 20, 30...).',
 '{name} worked with the Tens Boards.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('addition-work', 'Addition', 'mathematics',
 'Introduces addition through concrete manipulation. Children discover that combining quantities creates larger numbers.',
 'Practice adding with small objects or fingers.',
 '{name} practiced addition.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('subtraction-work', 'Subtraction', 'mathematics',
 'Introduces subtraction through concrete manipulation. Children experience taking away as a concept.',
 'Practice subtraction with snacks or toys.',
 '{name} practiced subtraction.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('bead-chains', 'Bead Chains', 'mathematics',
 'Introduces skip counting and prepares for multiplication. Counting patterns build mathematical reasoning.',
 'Practice skip counting (2, 4, 6, 8... or 5, 10, 15...).',
 '{name} counted along the bead chain.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

-- Cultural Works (10 works)

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('puzzle-maps', 'Puzzle Maps', 'cultural',
 'Introduces geography through hands-on exploration. Develops spatial awareness and cultural knowledge.',
 'Look at maps together and find places you know.',
 '{name} explored the puzzle map.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('land-water-forms', 'Land and Water Forms', 'cultural',
 'Teaches geographic features through 3D models. Vocabulary for landforms builds geographic literacy.',
 'Point out landforms like islands, lakes, and peninsulas in pictures.',
 '{name} explored land and water forms.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('botany-puzzles', 'Botany Puzzles', 'cultural',
 'Introduces plant parts and scientific vocabulary. Hands-on exploration builds understanding of nature.',
 'Examine real plants together and name the parts.',
 '{name} learned about plant parts.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('zoology-puzzles', 'Zoology Puzzles', 'cultural',
 'Introduces animal body parts and classification. Builds scientific vocabulary and understanding.',
 'Look at animals together and discuss their body parts.',
 '{name} learned about animal parts.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('science-experiments', 'Science Experiments', 'cultural',
 'Develops scientific thinking through observation and prediction. Hands-on exploration builds curiosity.',
 'Do simple experiments together - mixing colors, sink/float tests.',
 '{name} conducted a science experiment.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('art-work', 'Art Work', 'cultural',
 'Develops creative expression and fine motor skills. Art builds self-expression and aesthetic awareness.',
 'Provide various art materials for free creation.',
 '{name} created art today.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('music-bells', 'Music Bells', 'cultural',
 'Develops ear training and musical awareness. Matching tones builds auditory discrimination.',
 'Listen to and identify different musical sounds together.',
 '{name} explored music with the bells.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('culture-studies', 'Culture Studies', 'cultural',
 'Builds awareness of world cultures and appreciation for diversity. Stories and artifacts connect children to global community.',
 'Share stories and pictures from different cultures.',
 '{name} learned about different cultures.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('calendar-work', 'Calendar Work', 'cultural',
 'Introduces concepts of time, days, months, and seasons. Understanding time supports daily routines and planning.',
 'Use a calendar together to track days and events.',
 '{name} worked with the calendar.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('nature-exploration', 'Nature Exploration', 'cultural',
 'Builds connection with the natural world. Observation and care for nature develops environmental awareness.',
 'Take nature walks and observe plants, animals, and seasons.',
 '{name} explored nature today.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

-- Done! 50 works seeded.
