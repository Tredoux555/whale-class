-- Migration: 061_seed_work_translations.sql
-- Purpose: Seed montree_work_translations with top 50 Montessori works
-- Session 49: Record-Keeping System
-- Created: 2026-01-22

-- First check the table structure
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'montree_work_translations';

-- Practical Life (10 works)
INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('pouring-water', 'Pouring Water', 'practical_life', 
 'Develops hand-eye coordination, concentration, and independence. This foundational skill builds confidence and prepares for self-care.',
 'Let your child pour their own water at meals using a small pitcher.',
 '{name} practiced pouring water with careful concentration.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  area = EXCLUDED.area,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('spooning', 'Spooning', 'practical_life',
 'Strengthens the pencil grip muscles and develops concentration. The transfer motion prepares for writing and self-feeding.',
 'Let your child help transfer ingredients while cooking together.',
 '{name} worked on transferring with a spoon.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('dressing-frames', 'Dressing Frames', 'practical_life',
 'Builds independence in self-care. Mastering buttons, zippers, and snaps develops fine motor control and self-confidence.',
 'Encourage your child to dress themselves, even if it takes longer.',
 '{name} practiced fastening with the dressing frame.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('polishing', 'Polishing', 'practical_life',
 'Develops care for the environment and attention to detail. The circular motion strengthens hand muscles for writing.',
 'Let your child help polish shoes or shine mirrors at home.',
 '{name} polished with careful circular motions.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('food-preparation', 'Food Preparation', 'practical_life',
 'Builds independence, sequencing skills, and practical math concepts. Following steps develops executive function.',
 'Involve your child in simple food prep like spreading, cutting soft foods, or mixing.',
 '{name} prepared food independently today.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('table-washing', 'Table Washing', 'practical_life',
 'Teaches care for the environment and introduces sequencing. The full cycle of work builds concentration and completion.',
 'Let your child wipe down their table or help wash surfaces at home.',
 '{name} washed the table following all the steps.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('flower-arranging', 'Flower Arranging', 'practical_life',
 'Develops aesthetic sense and care for living things. Requires planning, fine motor control, and spatial awareness.',
 'Let your child arrange flowers or plants at home.',
 '{name} arranged flowers beautifully.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('threading', 'Threading/Lacing', 'practical_life',
 'Strengthens fine motor skills and hand-eye coordination. Direct preparation for sewing and writing.',
 'Provide large beads or pasta for threading at home.',
 '{name} practiced threading with concentration.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('cutting', 'Cutting with Scissors', 'practical_life',
 'Develops bilateral coordination and fine motor strength. The controlled motion prepares for precise hand movements.',
 'Provide safety scissors and paper strips for cutting practice.',
 '{name} practiced cutting with careful control.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('grace-courtesy', 'Grace and Courtesy', 'practical_life',
 'Teaches social skills and cultural norms. Role-playing greetings and manners builds confidence in social situations.',
 'Practice polite phrases and greetings together.',
 '{name} practiced grace and courtesy today.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;
-- Migration: 061_seed_work_translations.sql (continued)
-- Sensorial Works (10 works)

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('pink-tower', 'Pink Tower', 'sensorial',
 'Develops visual discrimination of size and builds the foundation for mathematical concepts like base-10. Concentration and precision are key.',
 'Stack blocks or containers from largest to smallest.',
 '{name} built the Pink Tower with careful precision.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('brown-stair', 'Brown Stair', 'sensorial',
 'Refines visual perception of thickness while maintaining constant length. Prepares for understanding dimension and measurement.',
 'Compare thick and thin objects at home.',
 '{name} explored the Brown Stair.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('red-rods', 'Red Rods', 'sensorial',
 'Develops perception of length differences and prepares for measurement. The progressive series builds mathematical understanding.',
 'Compare long and short objects around the house.',
 '{name} worked with the Red Rods.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('cylinder-blocks', 'Cylinder Blocks', 'sensorial',
 'Refines visual perception of dimension and prepares the hand for writing. Matching requires concentration and discrimination.',
 'Play matching games with different sized containers.',
 '{name} matched cylinders with careful attention.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('color-tablets', 'Color Tablets', 'sensorial',
 'Develops chromatic sense and vocabulary for colors. Matching and grading strengthen visual discrimination.',
 'Play color matching games or sort objects by color.',
 '{name} explored colors with the color tablets.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('sound-cylinders', 'Sound Cylinders', 'sensorial',
 'Develops auditory discrimination and listening skills. Matching sounds requires focused attention.',
 'Make shakers with different items inside to match sounds.',
 '{name} matched sounds with focused listening.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('geometric-solids', 'Geometric Solids', 'sensorial',
 'Introduces 3D shapes through touch. Develops geometric vocabulary and spatial awareness.',
 'Find 3D shapes in everyday objects (balls, boxes, cones).',
 '{name} explored geometric solids.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('binomial-cube', 'Binomial Cube', 'sensorial',
 'A 3D puzzle that indirectly prepares for algebra. Develops spatial reasoning and problem-solving.',
 'Work on 3D puzzles together.',
 '{name} completed the Binomial Cube.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('mystery-bag', 'Mystery Bag', 'sensorial',
 'Develops stereognostic sense (recognition through touch). Sharpens tactile perception and vocabulary.',
 'Play guessing games with objects in a bag.',
 '{name} identified objects by touch in the mystery bag.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('constructive-triangles', 'Constructive Triangles', 'sensorial',
 'Explores how triangles form other shapes. Builds geometric reasoning and spatial awareness.',
 'Cut paper triangles and create new shapes.',
 '{name} explored shape relationships with triangles.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

-- Language Works (10 works)

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('sandpaper-letters', 'Sandpaper Letters', 'language',
 'Introduces letter shapes through touch while learning sounds. Multi-sensory approach builds strong phonemic awareness.',
 'Trace letters in sand, flour, or shaving cream.',
 '{name} traced sandpaper letters while saying the sounds.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('moveable-alphabet', 'Moveable Alphabet', 'language',
 'Allows writing before the hand is ready. Children encode sounds into words, developing early literacy.',
 'Make words with letter magnets or tiles.',
 '{name} built words with the moveable alphabet.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('metal-insets', 'Metal Insets', 'language',
 'Prepares the hand for writing through tracing curves and straight lines. Develops pencil control.',
 'Practice drawing shapes and patterns.',
 '{name} traced patterns with the metal insets.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('object-boxes', 'Object Sound Boxes', 'language',
 'Matches objects to initial sounds, building phonemic awareness. Direct preparation for reading.',
 'Play "I spy" games focusing on beginning sounds.',
 '{name} matched objects to their beginning sounds.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('classified-cards', 'Classified Cards', 'language',
 'Builds vocabulary through categorization. Matching and naming develops language and classification skills.',
 'Sort pictures by category and name them together.',
 '{name} worked with classified picture cards.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('three-part-cards', 'Three Part Cards', 'language',
 'Develops reading, vocabulary, and matching skills. A complete literacy activity combining picture and word.',
 'Make simple word-picture matching cards at home.',
 '{name} matched three-part cards.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('reading-books', 'Reading Books', 'language',
 'Independent reading builds fluency and comprehension. Phonetic readers reinforce decoding skills.',
 'Read together daily - let your child "read" familiar parts.',
 '{name} read independently today.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('story-sequencing', 'Story Sequencing', 'language',
 'Develops narrative skills and logical thinking. Understanding sequence is essential for comprehension.',
 'Retell stories together, discussing what happened first, next, last.',
 '{name} sequenced story pictures.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('rhyming-work', 'Rhyming Activities', 'language',
 'Develops phonological awareness through sound patterns. Rhyming is foundational for reading success.',
 'Sing rhyming songs and play rhyming games.',
 '{name} explored rhyming words.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('handwriting', 'Handwriting Practice', 'language',
 'Develops fine motor control and letter formation. Practice builds automaticity for written expression.',
 'Provide paper and pencils for free drawing and writing.',
 '{name} practiced handwriting.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;
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
