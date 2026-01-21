-- ENGLISH AREA HANDBOOK DATA SEED
-- Run AFTER 050_digital_handbook.sql
-- Created: January 21, 2025
-- Populates handbook fields for language/English area works

-- ============================================
-- I-SPY / SOUND GAMES
-- ============================================
UPDATE montessori_works SET
  presentation_steps = '[
    {"step": 1, "title": "Gather Objects", "description": "Collect 3-5 miniature objects with distinct beginning sounds (e.g., bat, cat, dog)", "tip": "Choose objects the child knows well"},
    {"step": 2, "title": "Introduce the Game", "description": "Sit beside child. Say: I spy with my little eye something that begins with /b/", "tip": "Use the SOUND, not letter name"},
    {"step": 3, "title": "Model the Answer", "description": "If child is unsure, pick up bat and say: Bat! /b/-/b/-bat begins with /b/", "tip": "Emphasize the initial sound"},
    {"step": 4, "title": "Child''s Turn", "description": "Let child try: I spy something that begins with /c/", "tip": "Celebrate correct answers warmly"},
    {"step": 5, "title": "Extend", "description": "Add more objects or try ending sounds when ready", "tip": "Keep sessions under 5 minutes"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'The excitement of finding the right object',
    'The satisfaction of hearing the matching sound',
    'The game-like quality - it feels like play'
  ],
  control_of_error = 'The child checks by saying the word aloud and listening for the sound',
  variations = ARRAY[
    'I-Spy with ending sounds (something that ends with /t/)',
    'I-Spy with middle sounds (advanced)',
    'I-Spy around the classroom (not just objects on tray)',
    'I-Spy with pictures instead of objects'
  ],
  common_challenges = ARRAY[
    'Child says letter NAME instead of SOUND - gently correct',
    'Child guesses randomly - reduce to 2-3 objects',
    'Confusion between similar sounds (/b/ and /p/) - exaggerate sounds'
  ],
  mastery_indicators = ARRAY[
    'Identifies beginning sounds consistently',
    'Can play I-Spy as the "spy" (giving clues)',
    'Spontaneously notices sounds in daily life'
  ],
  repres_triggers = ARRAY[
    'Child confuses similar sounds',
    'Child reverts to guessing',
    'Long gap since last presentation'
  ],
  video_url = 'https://www.youtube.com/watch?v=r2J-NCxMr4s'
WHERE slug = 'sound-games-i-spy' OR name ILIKE '%i-spy%' OR name ILIKE '%sound game%';

-- ============================================
-- SANDPAPER LETTERS
-- ============================================
UPDATE montessori_works SET
  presentation_steps = '[
    {"step": 1, "title": "Select Letters", "description": "Choose 2-3 contrasting letters the child knows the sounds for (from I-Spy)", "tip": "Start with s, m, a, t - common and distinct"},
    {"step": 2, "title": "Introduce First Letter", "description": "Trace the letter with two fingers while saying the sound: /s/... /s/... /s/", "tip": "Trace slowly, say sound each time"},
    {"step": 3, "title": "Child Traces", "description": "Guide child''s fingers on the sandpaper. Say: Now you try. /s/", "tip": "Hand-over-hand if needed initially"},
    {"step": 4, "title": "Three-Period Lesson", "description": "1) This is /s/. 2) Show me /s/. 3) What is this?", "tip": "Only move to period 3 when period 2 is solid"},
    {"step": 5, "title": "Connect to Writing", "description": "After tracing, child can try writing in sand tray or air writing", "tip": "This connects tactile to kinesthetic memory"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'The rough texture of the sandpaper',
    'The smooth feel of the board around the letter',
    'The satisfying connection between touch and sound'
  ],
  control_of_error = 'The texture guides the finger - child feels when they go off the letter',
  variations = ARRAY[
    'Eyes closed tracing (advanced)',
    'Tracing in sand tray after sandpaper',
    'Air writing the letter',
    'Finding the letter in environmental print'
  ],
  common_challenges = ARRAY[
    'Child uses one finger - gently guide to use two',
    'Child traces too fast - model slow, deliberate tracing',
    'Child says letter name - always redirect to sound'
  ],
  mastery_indicators = ARRAY[
    'Traces correctly without guidance',
    'Says sound automatically while tracing',
    'Can identify letter by touch with eyes closed',
    'Recognizes letter in books/environment'
  ],
  repres_triggers = ARRAY[
    'Incorrect formation becoming habit',
    'Confusion between similar letters (b/d, p/q)',
    'Sound-symbol connection weakening'
  ],
  video_url = 'https://www.youtube.com/watch?v=zKl2PjyzQzE'
WHERE slug = 'sandpaper-letters' OR name ILIKE '%sandpaper letter%';

-- ============================================
-- MOVEABLE ALPHABET
-- ============================================
UPDATE montessori_works SET
  presentation_steps = '[
    {"step": 1, "title": "Set Up", "description": "Place mat on floor. Moveable alphabet box nearby. Have an object ready (e.g., cat figurine)", "tip": "Start with simple CVC words"},
    {"step": 2, "title": "Sound Out", "description": "Hold object, say: cat. What sounds do you hear? /c/... /a/... /t/", "tip": "Stretch the sounds clearly"},
    {"step": 3, "title": "Find Letters", "description": "Help child find each letter: Which letter makes /c/? Place it on mat", "tip": "Guide without doing it for them"},
    {"step": 4, "title": "Build the Word", "description": "Arrange letters left to right. Read back: /c/-/a/-/t/... cat!", "tip": "Always read left to right"},
    {"step": 5, "title": "Child Builds", "description": "Offer another object. Child builds independently", "tip": "Don''t correct spelling - this is encoding, not reading"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'The physical manipulation of letters',
    'The magical moment when sounds become a visible word',
    'The independence of writing without pencil control'
  ],
  control_of_error = 'Child can sound out their word and check if it matches the object',
  variations = ARRAY[
    'Building words from picture cards',
    'Building names of classmates',
    'Building labels for classroom items',
    'Building simple sentences (later)'
  ],
  common_challenges = ARRAY[
    'Child forgets sounds - review sandpaper letters first',
    'Reversals (b/d) - this is normal, don''t overcorrect',
    'Inventive spelling - accept it! This is phonetic writing'
  ],
  mastery_indicators = ARRAY[
    'Builds 3-letter words independently',
    'Sounds out words while building',
    'Shows pride in built words',
    'Begins building spontaneously'
  ],
  repres_triggers = ARRAY[
    'Frustration with letter finding',
    'Loss of interest in word building',
    'Significant gap in sound knowledge'
  ],
  video_url = 'https://www.youtube.com/watch?v=KHYw5s6HdXw'
WHERE slug = 'moveable-alphabet' OR name ILIKE '%moveable alphabet%' OR name ILIKE '%movable alphabet%';

-- ============================================
-- PINK SERIES OBJECT BOX
-- ============================================
UPDATE montessori_works SET
  presentation_steps = '[
    {"step": 1, "title": "Present the Box", "description": "Bring box to mat. Remove objects one by one, naming each", "tip": "Use 5-6 CVC objects with same vowel sound"},
    {"step": 2, "title": "Show Word Cards", "description": "Spread word cards face up. Read each one slowly", "tip": "Point under each letter as you blend"},
    {"step": 3, "title": "Model Matching", "description": "Pick up first card, read it, match to object. That says cat - here is the cat", "tip": "This is READING, not building"},
    {"step": 4, "title": "Child Matches", "description": "Child reads remaining cards and matches to objects", "tip": "Help with blending if needed"},
    {"step": 5, "title": "Verification", "description": "Turn cards over to reveal picture (if control cards) or sound out to check", "tip": "Self-correction builds confidence"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'The satisfaction of matching object to word',
    'The realization that marks on paper have meaning',
    'The tangible connection between reading and real things'
  ],
  control_of_error = 'Control cards with pictures on back, or sounding out to verify',
  variations = ARRAY[
    'Object to word matching (give word, find object)',
    'Word to object matching (give object, find word)',
    'Memory game with cards face down',
    'Sorting objects by beginning/ending sound'
  ],
  common_challenges = ARRAY[
    'Guessing from first letter only - cover letter, reveal one at a time',
    'Difficulty blending - practice oral blending first',
    'Fatigue - use fewer objects per session'
  ],
  mastery_indicators = ARRAY[
    'Reads CVC words without sounding out',
    'Self-corrects reading errors',
    'Asks for more challenging words',
    'Reads CVC words in simple books'
  ],
  repres_triggers = ARRAY[
    'Guessing instead of decoding',
    'Loss of confidence',
    'Plateau in reading progress'
  ],
  video_url = 'https://www.youtube.com/watch?v=H_C7i4O5oyA'
WHERE slug = 'pink-object-box' OR name ILIKE '%pink%object%' OR name ILIKE '%pink series%object%';

-- ============================================
-- METAL INSETS
-- ============================================
UPDATE montessori_works SET
  presentation_steps = '[
    {"step": 1, "title": "Select Inset", "description": "Choose one metal inset (start with circle or square)", "tip": "Simpler shapes first"},
    {"step": 2, "title": "Set Up Materials", "description": "Place frame on paper, colored pencils ready", "tip": "Use paper same size as inset"},
    {"step": 3, "title": "Trace Frame", "description": "Hold frame firmly, trace inside edge with pencil", "tip": "Show proper pencil grip"},
    {"step": 4, "title": "Trace Inset", "description": "Place metal piece inside traced shape, trace around it", "tip": "Different color for contrast"},
    {"step": 5, "title": "Fill In", "description": "Fill shape with parallel lines, left to right, top to bottom", "tip": "This is the real practice - pencil control"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'The satisfying click of inset in frame',
    'The emerging colorful design',
    'The visual progress of filling in'
  ],
  control_of_error = 'Lines going outside the traced shape are visible',
  variations = ARRAY[
    'Two overlapping shapes for complex designs',
    'Filling with different patterns (diagonal, curved)',
    'Creating pictures using multiple insets',
    'Filling with increasingly close lines'
  ],
  common_challenges = ARRAY[
    'Poor pencil grip - gently correct',
    'Lines too far apart - model closer lines',
    'Rushing - emphasize slow, careful work'
  ],
  mastery_indicators = ARRAY[
    'Maintains proper pencil grip throughout',
    'Lines are parallel and evenly spaced',
    'Stays within traced boundaries',
    'Works independently with concentration'
  ],
  repres_triggers = ARRAY[
    'Pencil grip deteriorating',
    'Loss of interest - introduce new shape',
    'Rushing through without care'
  ],
  video_url = 'https://www.youtube.com/watch?v=TYdRgmqZ2Fg'
WHERE slug = 'metal-insets' OR name ILIKE '%metal inset%';

-- ============================================
-- 3-PART CARDS (LANGUAGE)
-- ============================================
UPDATE montessori_works SET
  presentation_steps = '[
    {"step": 1, "title": "Introduce Control Cards", "description": "Lay out control cards (picture + label) in a row", "tip": "Start with 3-5 cards maximum"},
    {"step": 2, "title": "Name Each", "description": "Point to each control card, name it clearly", "tip": "Pause for child to repeat if interested"},
    {"step": 3, "title": "Match Pictures", "description": "Give child picture cards to match below control cards", "tip": "Visual matching only at first"},
    {"step": 4, "title": "Match Labels", "description": "Give child label cards to place under pictures", "tip": "This requires reading"},
    {"step": 5, "title": "Verify", "description": "Check against control cards. Correct any mistakes", "tip": "Self-correction is the goal"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'The puzzle-like matching activity',
    'The satisfaction of correct placement',
    'The independence of self-checking'
  ],
  control_of_error = 'Control cards allow child to self-check their work',
  variations = ARRAY[
    'Working with control cards hidden (memory)',
    'Sorting cards by category',
    'Making own 3-part cards',
    'Playing memory matching game'
  ],
  common_challenges = ARRAY[
    'Child relies on control cards instead of reading - remove them',
    'Too many cards overwhelm - use fewer',
    'Words too difficult - ensure phonetic, known vocabulary'
  ],
  mastery_indicators = ARRAY[
    'Matches labels without looking at controls',
    'Reads labels confidently',
    'Self-corrects independently',
    'Requests new card sets'
  ],
  repres_triggers = ARRAY[
    'Matching by picture position only',
    'Not reading labels',
    'Loss of interest in current set'
  ],
  video_url = 'https://www.youtube.com/watch?v=3VsLsL9Rvko'
WHERE name ILIKE '%3-part card%' OR name ILIKE '%three-part card%' OR name ILIKE '%three part card%' OR slug ILIKE '%3-part%';

-- ============================================
-- VERIFY UPDATES
-- ============================================
-- Run this to check handbook data was added:
-- SELECT name, 
--   presentation_steps IS NOT NULL as has_steps,
--   array_length(points_of_interest, 1) as poi_count,
--   video_url IS NOT NULL as has_video
-- FROM montessori_works 
-- WHERE curriculum_area = 'language'
-- ORDER BY name;
