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
