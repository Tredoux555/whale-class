-- MONTESSORI BRAIN SEED DATA
-- Run AFTER migration 040
-- Created: January 20, 2025

-- ============================================
-- SENSITIVE PERIODS (11 total)
-- ============================================
INSERT INTO sensitive_periods (name, slug, age_start, age_peak_start, age_peak_end, age_end, observable_behaviors, primary_areas, teacher_description, parent_description) VALUES

('Order', 'order', 0.5, 1.0, 3.0, 4.5, 
  ARRAY['Insists on routines and rituals', 'Upset when things are out of place', 'Enjoys sorting and organizing', 'Wants to put things back where they belong', 'Notices small changes in environment'],
  ARRAY['practical_life', 'sensorial'],
  'During the sensitive period for order, the child has an intense need for consistency in their environment. They thrive on routines and become distressed when order is disrupted.',
  'Your child needs things to be consistent and in their place. This isnt being picky - its how they learn to understand their world.'),

('Language', 'language', 0, 0, 3.0, 6.0,
  ARRAY['Babbling and cooing', 'Intense listening to speech', 'Explosion of vocabulary', 'Interest in letters and words', 'Fascination with stories'],
  ARRAY['language'],
  'The sensitive period for language spans from birth through age six, with particular intensity for spoken language in the first three years and written language emerging around age four.',
  'Your child is absorbing language effortlessly. Rich conversation, stories, and songs feed this natural drive.'),

('Movement', 'movement', 0, 1.0, 2.5, 4.5,
  ARRAY['Constant motion', 'Refining walking and running', 'Interest in carrying objects', 'Climbing everything', 'Desire to use hands purposefully'],
  ARRAY['practical_life', 'sensorial'],
  'Children in this period are driven to refine both gross and fine motor movements. They seek purposeful activity that allows them to develop coordination and control.',
  'Your child needs to move! This constant motion is developing coordination and control that will serve them for life.'),

('Refinement of Senses', 'refinement-of-senses', 0, 2.0, 4.0, 5.0,
  ARRAY['Fascinated by tiny details', 'Notices subtle differences', 'Enjoys matching and sorting by sensory qualities', 'Explores textures, sounds, smells', 'Precise about colors and shapes'],
  ARRAY['sensorial'],
  'During this period, children are driven to classify and organize their sensory impressions. They seek activities that allow them to discriminate between subtle differences.',
  'Your child notices details adults often miss. Activities that let them explore differences in size, color, texture, and sound satisfy this drive.'),

('Small Objects', 'small-objects', 1.0, 1.5, 3.0, 4.0,
  ARRAY['Fascinated by tiny things', 'Picks up small objects', 'Notices crumbs and specks', 'Points at small details', 'Interested in miniatures'],
  ARRAY['practical_life', 'sensorial'],
  'Children develop focus and fine motor control through their fascination with small objects. This supports the development of the pincer grip essential for writing.',
  'Your childs fascination with tiny objects is developing the fine motor control needed for writing and detailed work.'),

('Social Aspects', 'social', 2.5, 2.5, 5.0, 6.0,
  ARRAY['Interest in other children', 'Wants to help', 'Learning manners and courtesy', 'Understanding rules', 'Developing empathy'],
  ARRAY['practical_life'],
  'Children become intensely interested in social relationships and conventions. They are receptive to lessons in grace, courtesy, and community participation.',
  'Your child is learning how to be part of a community. Modeling kindness and including them in social situations helps develop these skills.'),

('Music', 'music', 2.0, 2.0, 4.0, 6.0,
  ARRAY['Responds to rhythm', 'Enjoys singing', 'Interested in instruments', 'Moves to music', 'Remembers melodies'],
  ARRAY['sensorial', 'cultural'],
  'Children are particularly receptive to musical experiences during this period. They absorb pitch, rhythm, and melody with remarkable ease.',
  'Your child naturally responds to music. Singing, rhythm activities, and exposure to quality music feed this sensitivity.'),

('Mathematics', 'mathematics', 3.5, 4.0, 5.5, 6.0,
  ARRAY['Counting everything', 'Interest in quantities', 'Fascinated by patterns', 'Wants to know how many', 'Enjoys number games'],
  ARRAY['mathematics'],
  'The mathematical mind awakens during this period. Children become fascinated with quantity, sequence, and numerical relationships.',
  'Your child is ready to explore numbers! Their interest in counting and quantity shows the mathematical mind awakening.'),

('Reading', 'reading', 3.5, 4.5, 5.5, 6.0,
  ARRAY['Interest in letters', 'Wants to know what words say', 'Points to text', 'Attempts to decode words', 'Loves being read to'],
  ARRAY['language'],
  'Following the explosion of writing, children become intensely interested in decoding written text. They are driven to read everything they see.',
  'Your child is ready to crack the code of reading! Their interest in written words shows they are entering the reading sensitive period.'),

('Writing', 'writing', 3.0, 3.5, 4.5, 5.0,
  ARRAY['Interest in making marks', 'Wants to form letters', 'Asks how to write words', 'Fascinated by handwriting', 'Explosion of writing attempts'],
  ARRAY['language'],
  'The sensitive period for writing typically precedes reading. Children are driven to encode their thoughts into written symbols.',
  'Your child wants to write! This urge to put thoughts on paper comes before the ability to read what others have written.'),

('Toileting', 'toileting', 1.0, 1.5, 2.5, 3.0,
  ARRAY['Awareness of bodily functions', 'Interest in toilet', 'Discomfort with wet diapers', 'Can stay dry for periods', 'Wants to use toilet independently'],
  ARRAY['practical_life'],
  'Children become aware of and interested in controlling their bodily functions. Readiness should be followed, not forced.',
  'Your child is showing readiness for toilet learning. Following their lead and keeping it positive supports this natural process.');

-- ============================================
-- KEY GATEWAY WORKS (30 works)
-- ============================================

-- PRACTICAL LIFE (10 works)
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, secondary_skills, materials_needed, parent_explanation_simple, parent_explanation_detailed, parent_why_it_matters, is_gateway, difficulty_level, sequence_order) VALUES

('Carrying a Tray', 'carrying-tray', 'practical_life', 'preliminary', 2.5, 6.0, 2.5,
  ARRAY['Learn to transport materials safely', 'Balance and coordination'],
  ARRAY['Preparation for all tray-based activities', 'Independence in classroom'],
  ARRAY['Can walk steadily', 'Both hands can work together', 'Follows simple directions'],
  ARRAY['gross_motor', 'balance', 'coordination'],
  ARRAY['concentration', 'independence'],
  ARRAY['Small tray', 'Objects to carry'],
  'Your child learns to carry materials carefully, building balance and preparing for all classroom activities.',
  'Carrying a tray develops balance, coordination, and the careful movement needed for all other Montessori work. It is often the first presentation given to a new child.',
  'This foundational skill enables your child to access every other activity in the classroom independently.',
  true, 'introductory', 1),

('Dry Pouring', 'dry-pouring', 'practical_life', 'transfer', 2.5, 4.0, 2.5,
  ARRAY['Hand-eye coordination', 'Pouring control', 'Concentration'],
  ARRAY['Preparation for wet pouring', 'Serving self at meals', 'Mathematical estimation'],
  ARRAY['Can carry a tray', 'Can focus for 5 minutes', 'Interested in pouring'],
  ARRAY['fine_motor', 'concentration', 'hand_eye_coordination'],
  ARRAY['independence', 'estimation'],
  ARRAY['Two small pitchers', 'Dry beans or rice', 'Tray'],
  'Your child pours dry materials between containers, developing the control needed for serving drinks independently.',
  'Pouring activities develop the hand control, concentration, and left-to-right movement patterns that prepare for both practical independence and academic skills like reading.',
  'This seemingly simple activity builds the foundation for self-sufficiency and academic readiness.',
  true, 'introductory', 2),

('Spooning', 'spooning', 'practical_life', 'transfer', 2.5, 4.0, 2.5,
  ARRAY['Three-finger grip', 'Transfer skill', 'Hand control'],
  ARRAY['Pencil grip preparation', 'Self-feeding', 'Fine motor development'],
  ARRAY['Can grasp small objects', 'Interested in scooping', 'Can focus briefly'],
  ARRAY['fine_motor', 'pincer_grip', 'concentration'],
  ARRAY['hand_eye_coordination', 'independence'],
  ARRAY['Two bowls', 'Spoon', 'Dry materials to transfer'],
  'Your child uses a spoon to transfer objects, developing the exact three-finger grip used for holding a pencil.',
  'The spooning activity develops the precise three-finger grip that will later be used for writing. This indirect preparation for handwriting starts years before formal writing instruction.',
  'The grip your child develops here is the same grip they will use to write.',
  true, 'introductory', 3),

('Dressing Frame - Buttons', 'dressing-frame-buttons', 'practical_life', 'care_of_self', 2.5, 5.0, 3.0,
  ARRAY['Button manipulation', 'Self-dressing skill', 'Fine motor control'],
  ARRAY['Independence in dressing', 'Finger strength', 'Concentration'],
  ARRAY['Interest in doing own clothes', 'Can manipulate small objects', 'Velcro frame mastered'],
  ARRAY['fine_motor', 'independence', 'concentration'],
  ARRAY['self_care', 'finger_strength'],
  ARRAY['Button dressing frame'],
  'Your child practices buttoning on a frame, developing the skill to dress independently.',
  'Dressing frames isolate specific fastening skills. Mastering buttons on a frame is easier than on clothing, building confidence before real-world application.',
  'Independence in dressing builds self-confidence and practical life skills.',
  false, 'developing', 5),

('Table Washing', 'table-washing', 'practical_life', 'care_of_environment', 3.0, 6.0, 3.5,
  ARRAY['Multi-step sequence following', 'Cleaning technique', 'Care of environment'],
  ARRAY['Extended concentration', 'Logical sequence', 'Preparation for mathematics'],
  ARRAY['Can complete 5+ step sequences', 'Comfortable with water', 'Extended concentration'],
  ARRAY['concentration', 'sequence_following', 'fine_motor'],
  ARRAY['care_of_environment', 'independence'],
  ARRAY['Small table', 'Basin', 'Soap', 'Sponge', 'Towel', 'Apron'],
  'Your child follows 16+ steps to wash a table, developing extended concentration and logical thinking.',
  'Table washing involves gathering materials, preparing the workspace, washing in a specific pattern, drying, and returning all materials. This 16+ step process develops the concentration and logical sequencing needed for mathematics.',
  'This extended work cycle builds the concentration required for all academic work.',
  true, 'developing', 10),

-- SENSORIAL (8 works)
('Knobbed Cylinders Block 1', 'knobbed-cylinders-1', 'sensorial', 'visual_dimension', 2.5, 4.0, 2.5,
  ARRAY['Visual discrimination of diameter', 'Pincer grip development', 'Seriation'],
  ARRAY['Writing grip preparation', 'Mathematical ordering', 'Concentration'],
  ARRAY['Can carry materials carefully', 'Interested in fitting objects', 'Beginning concentration'],
  ARRAY['visual_discrimination', 'fine_motor', 'seriation'],
  ARRAY['concentration', 'pincer_grip'],
  ARRAY['Cylinder Block 1'],
  'Your child matches cylinders to their holes, developing visual discrimination and the grip used for writing.',
  'The knobbed cylinders are typically the first sensorial material presented. The knobs develop the three-finger grip, while matching cylinders to holes develops visual discrimination and concentration.',
  'This is often the first sensorial work, building skills used throughout the curriculum.',
  true, 'introductory', 1),

('Pink Tower', 'pink-tower', 'sensorial', 'visual_dimension', 2.5, 6.0, 3.0,
  ARRAY['Visual discrimination of size in three dimensions', 'Grading from largest to smallest'],
  ARRAY['Cubing concept (1³ to 10³)', 'Concentration', 'Decimal system preparation'],
  ARRAY['Can carry objects carefully', 'Understands bigger/smaller', 'Can focus for 10 minutes'],
  ARRAY['visual_discrimination', 'concentration', 'fine_motor'],
  ARRAY['vocabulary_comparative', 'mathematical_mind'],
  ARRAY['Pink Tower (10 wooden cubes)'],
  'Your child stacks 10 pink cubes from largest to smallest, unconsciously absorbing the mathematical concept of cubing.',
  'The Pink Tower cubes increase from 1cm³ to 10cm³ - a precise mathematical progression. While children experience this sensorially, they are preparing for the formal study of cubing in elementary mathematics.',
  'This iconic material prepares the mathematical mind while developing concentration and visual discrimination.',
  true, 'introductory', 2),

('Brown Stair', 'brown-stair', 'sensorial', 'visual_dimension', 2.5, 6.0, 3.0,
  ARRAY['Visual discrimination of two dimensions', 'Grading by thickness'],
  ARRAY['Squaring concept', 'Preparation for geometry', 'Spatial reasoning'],
  ARRAY['Pink Tower mastered', 'Can discriminate size', 'Extended concentration'],
  ARRAY['visual_discrimination', 'spatial_reasoning', 'concentration'],
  ARRAY['mathematical_mind', 'vocabulary'],
  ARRAY['Brown Stair (10 prisms)'],
  'Your child arranges 10 brown prisms by thickness, preparing for the mathematical concept of squaring.',
  'The Brown Stair prisms increase according to the sequence of square numbers. Like the Pink Tower, this sensorial experience prepares for formal mathematical study.',
  'Combined with the Pink Tower, this prepares for understanding squared and cubed numbers.',
  true, 'developing', 3),

('Red Rods', 'red-rods', 'sensorial', 'visual_dimension', 2.5, 6.0, 3.0,
  ARRAY['Visual discrimination of length', 'Grading by one dimension'],
  ARRAY['Number Rod preparation', 'Unit concept', 'Linear measurement'],
  ARRAY['Brown Stair mastered', 'Can carry long objects', 'Understands length'],
  ARRAY['visual_discrimination', 'spatial_reasoning', 'gross_motor'],
  ARRAY['mathematical_mind', 'measurement'],
  ARRAY['Red Rods (10 rods)'],
  'Your child arranges 10 red rods by length - the same rods used later for learning numbers.',
  'The Red Rods are physically identical to the Number Rods except for color. Mastering this sensorial material directly prepares for mathematical work.',
  'These ARE the Number Rods without numbers - direct preparation for math.',
  true, 'developing', 4),

('Color Tablets Box 1', 'color-tablets-1', 'sensorial', 'visual_color', 2.5, 4.0, 2.5,
  ARRAY['Match primary colors', 'Visual discrimination'],
  ARRAY['Color vocabulary', 'Matching skill', 'Concentration'],
  ARRAY['Can match identical objects', 'Interested in colors', 'Basic concentration'],
  ARRAY['visual_discrimination', 'matching', 'concentration'],
  ARRAY['vocabulary', 'classification'],
  ARRAY['Color Tablets Box 1 (6 tablets - 3 pairs)'],
  'Your child matches pairs of primary colors, developing visual discrimination and color vocabulary.',
  'The first color box contains pairs of red, yellow, and blue. Matching these develops visual discrimination and introduces color vocabulary through the three-period lesson.',
  'This begins the color work that extends through grading 63 shades in Box 3.',
  true, 'introductory', 5),

('Geometric Cabinet', 'geometric-cabinet', 'sensorial', 'visual_form', 3.0, 6.0, 3.5,
  ARRAY['Shape recognition', 'Visual discrimination of form'],
  ARRAY['Geometry vocabulary', 'Preparation for geometry', 'Writing preparation'],
  ARRAY['Basic sensorial work complete', 'Can trace shapes', 'Interested in shapes'],
  ARRAY['visual_discrimination', 'shape_recognition', 'fine_motor'],
  ARRAY['geometry_vocabulary', 'writing_preparation'],
  ARRAY['Geometric Cabinet with demonstration tray'],
  'Your child explores geometric shapes, developing the vocabulary and discrimination for geometry and writing.',
  'The Geometric Cabinet presents plane shapes (circles, triangles, rectangles, polygons, curvilinear figures) in progressive drawers. Tracing the shapes prepares for letter formation.',
  'Shape discrimination here directly supports letter recognition and geometry.',
  true, 'developing', 6),

('Binomial Cube', 'binomial-cube', 'sensorial', 'visual_form', 3.5, 6.0, 4.0,
  ARRAY['3D pattern matching', 'Color and size discrimination'],
  ARRAY['Algebraic concept (a+b)³', 'Spatial reasoning', 'Concentration'],
  ARRAY['Pink Tower and Brown Stair mastered', 'Strong visual discrimination', 'Extended concentration'],
  ARRAY['visual_discrimination', 'spatial_reasoning', 'concentration'],
  ARRAY['mathematical_mind', 'pattern_recognition'],
  ARRAY['Binomial Cube'],
  'Your child builds a 3D puzzle that represents the algebraic formula (a+b)³ - understood sensorially now, mathematically later.',
  'The Binomial Cube is a concrete representation of (a+b)³. In primary, it is a sensorial puzzle; in elementary, children discover it represents an algebraic formula.',
  'This material bridges sensorial exploration and algebraic thinking.',
  true, 'advanced', 7),

('Sound Cylinders', 'sound-cylinders', 'sensorial', 'auditory', 3.0, 6.0, 3.5,
  ARRAY['Auditory discrimination', 'Sound matching', 'Grading by volume'],
  ARRAY['Phonemic awareness', 'Musical ear development', 'Concentration'],
  ARRAY['Basic visual sensorial complete', 'Can distinguish sounds', 'Interested in sounds'],
  ARRAY['auditory_discrimination', 'matching', 'concentration'],
  ARRAY['phonemic_awareness', 'music_preparation'],
  ARRAY['Two sets of 6 sound cylinders'],
  'Your child matches and grades sounds by volume, developing the auditory discrimination needed for phonics.',
  'Sound cylinders develop the ability to discriminate between subtle differences in sound - a skill essential for distinguishing between similar phonemes in language.',
  'Auditory discrimination here supports phonemic awareness for reading.',
  true, 'developing', 8),

-- MATHEMATICS (6 works)
('Number Rods', 'number-rods', 'mathematics', 'numeration', 3.5, 6.0, 4.0,
  ARRAY['Quantity 1-10 through length', 'Association of quantity with number names'],
  ARRAY['Number vocabulary', 'Counting foundation', 'Unit concept'],
  ARRAY['Red Rods mastered', 'Can count to 3', 'Interest in quantities'],
  ARRAY['counting', 'quantity_recognition', 'number_vocabulary'],
  ARRAY['mathematical_mind', 'concentration'],
  ARRAY['Number Rods (10 rods with red/blue segments)'],
  'Your child explores quantity 1-10 using rods - the same Red Rods they mastered, now with number segments.',
  'The Number Rods are identical to the Red Rods but divided into red and blue segments. Having mastered the sensorial discrimination of length, children now associate quantities with number names.',
  'This bridges sensorial work and mathematical understanding.',
  true, 'introductory', 1),

('Sandpaper Numerals', 'sandpaper-numerals', 'mathematics', 'numeration', 3.5, 5.0, 4.0,
  ARRAY['Symbol recognition 0-9', 'Tactile and visual learning', 'Symbol formation'],
  ARRAY['Number writing preparation', 'Symbol-quantity association'],
  ARRAY['Number Rods started', 'Can trace sandpaper letters', 'Interest in numerals'],
  ARRAY['symbol_recognition', 'fine_motor', 'tactile_learning'],
  ARRAY['writing_preparation', 'mathematical_mind'],
  ARRAY['Sandpaper Numerals 0-9'],
  'Your child traces numerals on sandpaper, learning symbols through touch while preparing to write numbers.',
  'Like Sandpaper Letters, these numerals engage tactile, visual, and kinesthetic learning. Children trace while saying the number name, building multi-sensory memory.',
  'This prepares for writing numerals while reinforcing symbol recognition.',
  true, 'introductory', 2),

('Spindle Box', 'spindle-box', 'mathematics', 'numeration', 3.5, 5.0, 4.0,
  ARRAY['Loose quantity concept', 'Zero as empty set', 'One-to-one correspondence'],
  ARRAY['Quantity-symbol association', 'Counting accuracy'],
  ARRAY['Number Rods + Cards mastered', 'Can count to 9', 'Understands quantity'],
  ARRAY['counting', 'quantity_recognition', 'one_to_one_correspondence'],
  ARRAY['zero_concept', 'mathematical_mind'],
  ARRAY['Spindle Box (45 spindles, compartments 0-9)'],
  'Your child counts spindles into compartments, discovering that zero means "nothing" - a crucial mathematical concept.',
  'The Spindle Box introduces loose quantity (unlike fixed rods) and the concept of zero as an empty set. Children count 45 spindles into compartments 0-9.',
  'Understanding zero as "no quantity" is essential for place value.',
  true, 'developing', 4),

('Golden Beads Introduction', 'golden-beads-intro', 'mathematics', 'decimal_system', 4.0, 6.0, 4.5,
  ARRAY['Understand unit, ten, hundred, thousand', 'Visualize place value'],
  ARRAY['Decimal system foundation', 'Large number understanding'],
  ARRAY['Numeration 0-10 solid', 'Teen boards started', 'Extended concentration'],
  ARRAY['place_value', 'quantity_recognition', 'mathematical_vocabulary'],
  ARRAY['decimal_system', 'operations_preparation'],
  ARRAY['Golden Bead material (units, tens bars, hundred squares, thousand cubes)'],
  'Your child holds the decimal system - a single bead, a bar of 10, a square of 100, and a cube of 1000.',
  'Golden Beads make the decimal system concrete. Children physically experience that 10 units make a ten bar, 10 tens make a hundred square, and 10 hundreds make a thousand cube.',
  'This material makes place value tangible, enabling understanding of large numbers and all four operations.',
  true, 'developing', 6),

('Stamp Game', 'stamp-game', 'mathematics', 'abstraction', 5.0, 6.0, 5.5,
  ARRAY['Abstract operations', 'Place value reinforcement'],
  ARRAY['Transition to paper math', 'Algorithm understanding'],
  ARRAY['Golden Bead operations mastered', 'Understands exchange', 'Ready for abstraction'],
  ARRAY['operations', 'place_value', 'abstract_thinking'],
  ARRAY['algorithm_understanding', 'mathematical_reasoning'],
  ARRAY['Stamp Game (color-coded stamps for units, tens, hundreds, thousands)'],
  'Your child performs math operations with stamps instead of beads - a step toward paper-based arithmetic.',
  'The Stamp Game is more abstract than Golden Beads - stamps represent quantities rather than showing them physically. This bridges concrete and abstract mathematics.',
  'This prepares children for traditional paper-and-pencil arithmetic.',
  true, 'advanced', 10),

-- LANGUAGE (6 works)
('Sound Games', 'sound-games', 'language', 'phonemic_awareness', 2.5, 4.0, 3.0,
  ARRAY['Isolate beginning sounds', 'Phonemic awareness', 'Listening skills'],
  ARRAY['Sandpaper Letter preparation', 'Reading foundation'],
  ARRAY['Speaks clearly', 'Can listen attentively', 'Vocabulary developing'],
  ARRAY['phonemic_awareness', 'listening', 'concentration'],
  ARRAY['language_foundation', 'reading_preparation'],
  ARRAY['Objects with distinct beginning sounds'],
  'Your child plays "I Spy" games focusing on beginning sounds, developing the phonemic awareness essential for reading.',
  'Sound Games (like "I Spy with my little eye something beginning with /m/") develop the ability to isolate sounds in words - a prerequisite for connecting sounds to letters.',
  'Children must hear sounds before they can connect them to letters.',
  true, 'introductory', 1),

('Sandpaper Letters', 'sandpaper-letters', 'language', 'writing_preparation', 3.0, 5.0, 3.5,
  ARRAY['Letter-sound association', 'Letter formation', 'Tactile learning'],
  ARRAY['Writing preparation', 'Reading foundation', 'Multi-sensory learning'],
  ARRAY['Sound Games mastered', 'Metal Insets started', 'Fine motor developing'],
  ARRAY['letter_recognition', 'phonics', 'fine_motor'],
  ARRAY['writing_preparation', 'reading_foundation'],
  ARRAY['Sandpaper Letters (lowercase on colored boards)'],
  'Your child traces letters on sandpaper while saying their sounds, learning through touch, sight, and sound.',
  'Sandpaper Letters engage three senses: children see the letter, feel its shape, and say its sound. This multi-sensory approach creates strong memory pathways.',
  'This approach creates stronger letter-sound memory than visual learning alone.',
  true, 'introductory', 3),

('Moveable Alphabet', 'moveable-alphabet', 'language', 'composition', 3.5, 6.0, 4.0,
  ARRAY['Word building', 'Encoding (spelling)', 'Composition without handwriting'],
  ARRAY['Reading preparation', 'Spelling awareness', 'Creative expression'],
  ARRAY['Knows several sandpaper letters', 'Can segment sounds', 'Interested in words'],
  ARRAY['encoding', 'spelling', 'composition'],
  ARRAY['reading_preparation', 'creative_expression'],
  ARRAY['Large Moveable Alphabet (wooden letters in box)'],
  'Your child builds words with wooden letters, writing before their hands can form letters on paper.',
  'The Moveable Alphabet allows children to compose words and sentences before mastering handwriting. This separates the cognitive task of encoding from the motor task of writing.',
  'Children can express complex thoughts in writing before fine motor skills mature.',
  true, 'developing', 5),

('Pink Series - Objects', 'pink-series-objects', 'language', 'reading', 4.0, 5.0, 4.0,
  ARRAY['Decode CVC words', 'Connect written words to objects'],
  ARRAY['Reading fluency', 'Spelling patterns'],
  ARRAY['Can build CVC words with Moveable Alphabet', 'Knows all letter sounds', 'Interest in reading'],
  ARRAY['decoding', 'reading', 'word_recognition'],
  ARRAY['spelling', 'comprehension'],
  ARRAY['Pink Series object box with CVC word cards'],
  'Your child reads simple three-letter words and matches them to objects, beginning the journey to fluent reading.',
  'Pink Series words are CVC (consonant-vowel-consonant) words with short vowels: cat, bed, lip, hot, bus. Matching words to objects confirms comprehension.',
  'This is the beginning of independent reading.',
  true, 'developing', 7),

('Blue Series - Blends', 'blue-series-blends', 'language', 'reading', 4.5, 6.0, 5.0,
  ARRAY['Decode consonant blends', 'Read 4-6 letter words'],
  ARRAY['Reading fluency', 'Phonics patterns'],
  ARRAY['Pink Series mastered', 'Can read CVC words fluently', 'Interest in longer words'],
  ARRAY['decoding', 'phonics', 'reading_fluency'],
  ARRAY['spelling', 'vocabulary'],
  ARRAY['Blue Series materials with blend words'],
  'Your child reads words with consonant blends (flag, stamp, crisp), expanding reading ability.',
  'Blue Series introduces consonant blends (bl, cl, fl, st, sp, etc.) while maintaining short vowel sounds. This bridges simple CVC words and complex phonograms.',
  'Mastering blends opens access to thousands more words.',
  true, 'developing', 8),

('Green Series - Phonograms', 'green-series-phonograms', 'language', 'reading', 5.0, 6.0, 5.5,
  ARRAY['Decode phonograms', 'Read complex words'],
  ARRAY['Reading fluency', 'Spelling mastery'],
  ARRAY['Blue Series mastered', 'Reads blends fluently', 'Interest in complex words'],
  ARRAY['decoding', 'phonics', 'reading_fluency'],
  ARRAY['spelling', 'comprehension'],
  ARRAY['Green Series materials with phonogram words'],
  'Your child masters complex letter combinations (ai, oa, ee, th, sh), becoming a fluent reader.',
  'Green Series introduces phonograms - letter combinations that create unique sounds (ai in rain, oa in boat, ee in feet). This is the final key to reading fluency.',
  'These 40-50 phonograms unlock virtually all English words.',
  true, 'advanced', 9);

-- ============================================
-- PREREQUISITES
-- ============================================

-- Get IDs for prerequisite relationships
DO $$
DECLARE
  v_carrying_tray UUID;
  v_dry_pouring UUID;
  v_spooning UUID;
  v_cylinders UUID;
  v_pink_tower UUID;
  v_brown_stair UUID;
  v_red_rods UUID;
  v_color_tablets UUID;
  v_geometric_cabinet UUID;
  v_binomial UUID;
  v_sound_cylinders UUID;
  v_number_rods UUID;
  v_sandpaper_numerals UUID;
  v_spindle_box UUID;
  v_golden_beads UUID;
  v_stamp_game UUID;
  v_sound_games UUID;
  v_sandpaper_letters UUID;
  v_moveable_alphabet UUID;
  v_pink_series UUID;
  v_blue_series UUID;
BEGIN
  SELECT id INTO v_carrying_tray FROM montessori_works WHERE slug = 'carrying-tray';
  SELECT id INTO v_dry_pouring FROM montessori_works WHERE slug = 'dry-pouring';
  SELECT id INTO v_spooning FROM montessori_works WHERE slug = 'spooning';
  SELECT id INTO v_cylinders FROM montessori_works WHERE slug = 'knobbed-cylinders-1';
  SELECT id INTO v_pink_tower FROM montessori_works WHERE slug = 'pink-tower';
  SELECT id INTO v_brown_stair FROM montessori_works WHERE slug = 'brown-stair';
  SELECT id INTO v_red_rods FROM montessori_works WHERE slug = 'red-rods';
  SELECT id INTO v_color_tablets FROM montessori_works WHERE slug = 'color-tablets-1';
  SELECT id INTO v_geometric_cabinet FROM montessori_works WHERE slug = 'geometric-cabinet';
  SELECT id INTO v_binomial FROM montessori_works WHERE slug = 'binomial-cube';
  SELECT id INTO v_sound_cylinders FROM montessori_works WHERE slug = 'sound-cylinders';
  SELECT id INTO v_number_rods FROM montessori_works WHERE slug = 'number-rods';
  SELECT id INTO v_sandpaper_numerals FROM montessori_works WHERE slug = 'sandpaper-numerals';
  SELECT id INTO v_spindle_box FROM montessori_works WHERE slug = 'spindle-box';
  SELECT id INTO v_golden_beads FROM montessori_works WHERE slug = 'golden-beads-intro';
  SELECT id INTO v_stamp_game FROM montessori_works WHERE slug = 'stamp-game';
  SELECT id INTO v_sound_games FROM montessori_works WHERE slug = 'sound-games';
  SELECT id INTO v_sandpaper_letters FROM montessori_works WHERE slug = 'sandpaper-letters';
  SELECT id INTO v_moveable_alphabet FROM montessori_works WHERE slug = 'moveable-alphabet';
  SELECT id INTO v_pink_series FROM montessori_works WHERE slug = 'pink-series-objects';
  SELECT id INTO v_blue_series FROM montessori_works WHERE slug = 'blue-series-blends';

  -- Practical Life prerequisites
  INSERT INTO work_prerequisites (work_id, prerequisite_work_id, is_required) VALUES
    (v_dry_pouring, v_carrying_tray, true),
    (v_spooning, v_carrying_tray, true);

  -- Sensorial prerequisites
  INSERT INTO work_prerequisites (work_id, prerequisite_work_id, is_required) VALUES
    (v_pink_tower, v_cylinders, false),
    (v_brown_stair, v_pink_tower, true),
    (v_red_rods, v_brown_stair, true),
    (v_binomial, v_pink_tower, true),
    (v_binomial, v_brown_stair, true);

  -- Mathematics prerequisites
  INSERT INTO work_prerequisites (work_id, prerequisite_work_id, is_required) VALUES
    (v_number_rods, v_red_rods, true),
    (v_spindle_box, v_number_rods, true),
    (v_golden_beads, v_spindle_box, true),
    (v_stamp_game, v_golden_beads, true);

  -- Language prerequisites
  INSERT INTO work_prerequisites (work_id, prerequisite_work_id, is_required) VALUES
    (v_sandpaper_letters, v_sound_games, true),
    (v_moveable_alphabet, v_sandpaper_letters, true),
    (v_pink_series, v_moveable_alphabet, true),
    (v_blue_series, v_pink_series, true);
END $$;

-- ============================================
-- SENSITIVE PERIOD MAPPINGS
-- ============================================

DO $$
DECLARE
  v_order UUID;
  v_movement UUID;
  v_senses UUID;
  v_small_objects UUID;
  v_language UUID;
  v_mathematics UUID;
  v_writing UUID;
  v_reading UUID;
BEGIN
  SELECT id INTO v_order FROM sensitive_periods WHERE slug = 'order';
  SELECT id INTO v_movement FROM sensitive_periods WHERE slug = 'movement';
  SELECT id INTO v_senses FROM sensitive_periods WHERE slug = 'refinement-of-senses';
  SELECT id INTO v_small_objects FROM sensitive_periods WHERE slug = 'small-objects';
  SELECT id INTO v_language FROM sensitive_periods WHERE slug = 'language';
  SELECT id INTO v_mathematics FROM sensitive_periods WHERE slug = 'mathematics';
  SELECT id INTO v_writing FROM sensitive_periods WHERE slug = 'writing';
  SELECT id INTO v_reading FROM sensitive_periods WHERE slug = 'reading';

  -- Practical Life mappings
  INSERT INTO work_sensitive_periods (work_id, sensitive_period_id, relevance_score)
  SELECT id, v_order, 8 FROM montessori_works WHERE curriculum_area = 'practical_life';
  
  INSERT INTO work_sensitive_periods (work_id, sensitive_period_id, relevance_score)
  SELECT id, v_movement, 9 FROM montessori_works WHERE curriculum_area = 'practical_life';

  INSERT INTO work_sensitive_periods (work_id, sensitive_period_id, relevance_score)
  SELECT id, v_small_objects, 7 FROM montessori_works WHERE slug IN ('spooning', 'dry-pouring');

  -- Sensorial mappings
  INSERT INTO work_sensitive_periods (work_id, sensitive_period_id, relevance_score)
  SELECT id, v_senses, 10 FROM montessori_works WHERE curriculum_area = 'sensorial';

  INSERT INTO work_sensitive_periods (work_id, sensitive_period_id, relevance_score)
  SELECT id, v_order, 7 FROM montessori_works WHERE curriculum_area = 'sensorial';

  -- Mathematics mappings
  INSERT INTO work_sensitive_periods (work_id, sensitive_period_id, relevance_score)
  SELECT id, v_mathematics, 10 FROM montessori_works WHERE curriculum_area = 'mathematics';

  -- Language mappings
  INSERT INTO work_sensitive_periods (work_id, sensitive_period_id, relevance_score)
  SELECT id, v_language, 9 FROM montessori_works WHERE curriculum_area = 'language';

  INSERT INTO work_sensitive_periods (work_id, sensitive_period_id, relevance_score)
  SELECT id, v_writing, 8 FROM montessori_works WHERE slug IN ('sandpaper-letters', 'moveable-alphabet');

  INSERT INTO work_sensitive_periods (work_id, sensitive_period_id, relevance_score)
  SELECT id, v_reading, 9 FROM montessori_works WHERE slug IN ('pink-series-objects', 'blue-series-blends', 'green-series-phonograms');
END $$;
