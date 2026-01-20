-- MONTESSORI BRAIN - ADDITIONAL WORKS SEED
-- Adds remaining works from DIVE_2 research
-- Run AFTER 041_montessori_brain_seed.sql
-- Created: January 20, 2025

-- ============================================
-- PRACTICAL LIFE - PRELIMINARY EXERCISES
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Carrying a Mat', 'carrying-mat', 'practical_life', 'preliminary', 2.5, 6.0, 2.5,
  ARRAY['Transport materials safely', 'Define workspace'],
  ARRAY['Care of environment', 'Spatial awareness'],
  ARRAY['Can walk steadily', 'Follows simple directions'],
  ARRAY['gross_motor', 'coordination'],
  ARRAY['Work mat'],
  'Your child learns to carry and place their mat, creating their own workspace.',
  false, 'introductory', 1),

('Unrolling and Rolling a Mat', 'rolling-mat', 'practical_life', 'preliminary', 2.5, 6.0, 2.5,
  ARRAY['Define workspace', 'Respect others space'],
  ARRAY['Fine motor', 'Sequence following'],
  ARRAY['Can carry mat', 'Understands your space concept'],
  ARRAY['fine_motor', 'sequence'],
  ARRAY['Work mat'],
  'Your child learns to set up and put away their workspace respectfully.',
  false, 'introductory', 2),

('Carrying a Chair', 'carrying-chair', 'practical_life', 'preliminary', 2.5, 6.0, 2.5,
  ARRAY['Move furniture safely', 'Spatial awareness'],
  ARRAY['Strength', 'Environmental awareness'],
  ARRAY['Can lift appropriate weight', 'Steady walking'],
  ARRAY['gross_motor', 'strength'],
  ARRAY['Child-sized chair'],
  'Your child learns to move furniture safely, building strength and awareness.',
  false, 'introductory', 4),

('Sitting and Standing from Chair', 'sitting-standing', 'practical_life', 'preliminary', 2.5, 6.0, 2.5,
  ARRAY['Body control', 'Social awareness'],
  ARRAY['Grace in movement', 'Self-awareness'],
  ARRAY['Interest in sitting properly'],
  ARRAY['gross_motor', 'body_control'],
  ARRAY['Child-sized chair'],
  'Your child learns graceful movements when using a chair.',
  false, 'introductory', 5),

('Pushing in Chair', 'pushing-chair', 'practical_life', 'preliminary', 2.5, 6.0, 2.5,
  ARRAY['Complete action cycle', 'Environmental care'],
  ARRAY['Respect for environment', 'Sequence completion'],
  ARRAY['Understands chairs have home position'],
  ARRAY['gross_motor', 'sequence'],
  ARRAY['Child-sized chair'],
  'Your child completes the cycle of using a chair by returning it to its place.',
  false, 'introductory', 6),

('Walking on the Line', 'walking-line', 'practical_life', 'preliminary', 2.5, 6.0, 3.0,
  ARRAY['Balance', 'Control of movement'],
  ARRAY['Concentration', 'Body awareness'],
  ARRAY['Can walk steadily', 'Interested in challenge'],
  ARRAY['balance', 'concentration', 'gross_motor'],
  ARRAY['Taped line on floor'],
  'Your child practices balance and control by walking carefully on a line.',
  true, 'introductory', 7),

('Silence Game', 'silence-game', 'practical_life', 'preliminary', 3.0, 6.0, 3.5,
  ARRAY['Auditory awareness', 'Self-control'],
  ARRAY['Deep concentration', 'Group awareness'],
  ARRAY['Can sit still briefly', 'Interested in quiet'],
  ARRAY['concentration', 'self_control', 'auditory'],
  ARRAY['Bell or chime'],
  'Your child develops self-control and listening skills through intentional silence.',
  true, 'developing', 8);

-- ============================================
-- PRACTICAL LIFE - TRANSFER ACTIVITIES (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Dry Pouring - Equal Vessels', 'dry-pouring-equal', 'practical_life', 'transfer', 2.5, 4.0, 3.0,
  ARRAY['Estimate quantities', 'Pouring control'],
  ARRAY['Mathematical concepts', 'Visual estimation'],
  ARRAY['Success with first pouring'],
  ARRAY['fine_motor', 'estimation'],
  ARRAY['Two equal pitchers', 'Dry materials'],
  'Your child practices estimating equal amounts while pouring.',
  false, 'introductory', 3),

('Wet Pouring - One to One', 'wet-pouring-one', 'practical_life', 'transfer', 3.0, 4.5, 3.0,
  ARRAY['Control with liquids', 'Careful movement'],
  ARRAY['Independence serving drinks', 'Concentration'],
  ARRAY['No spills with dry materials'],
  ARRAY['fine_motor', 'concentration'],
  ARRAY['Two pitchers', 'Water', 'Sponge'],
  'Your child masters pouring water, preparing for serving drinks independently.',
  true, 'developing', 4),

('Wet Pouring - One to Many', 'wet-pouring-many', 'practical_life', 'transfer', 3.0, 4.5, 3.5,
  ARRAY['Estimate equal portions', 'Division concept'],
  ARRAY['Mathematical division', 'Serving others'],
  ARRAY['Accurate single pour'],
  ARRAY['fine_motor', 'estimation'],
  ARRAY['One pitcher', 'Multiple glasses'],
  'Your child learns to pour equal amounts into multiple containers.',
  false, 'developing', 5),

('Tongs Transfer', 'tongs-transfer', 'practical_life', 'transfer', 3.0, 4.5, 3.0,
  ARRAY['Pincer grip strengthening', 'Transfer skill'],
  ARRAY['Pencil grip preparation', 'Hand strength'],
  ARRAY['Strong spooning skills'],
  ARRAY['fine_motor', 'pincer_grip'],
  ARRAY['Tongs', 'Objects to transfer', 'Two bowls'],
  'Your child strengthens the grip used for writing by using tongs.',
  true, 'developing', 6),

('Tweezers Transfer', 'tweezers-transfer', 'practical_life', 'transfer', 3.5, 5.0, 3.5,
  ARRAY['Refined pincer grip', 'Precision'],
  ARRAY['Direct writing preparation', 'Fine control'],
  ARRAY['Success with tongs'],
  ARRAY['fine_motor', 'precision'],
  ARRAY['Tweezers', 'Small objects', 'Two containers'],
  'Your child develops the precise grip needed for writing with tweezers.',
  false, 'developing', 7),

('Droppers and Pipettes', 'droppers-pipettes', 'practical_life', 'transfer', 3.5, 5.0, 4.0,
  ARRAY['Squeeze control', 'Precision'],
  ARRAY['Science work preparation', 'Fine motor'],
  ARRAY['Fine motor control established'],
  ARRAY['fine_motor', 'precision'],
  ARRAY['Droppers or pipettes', 'Water', 'Containers'],
  'Your child develops precise hand control using droppers.',
  false, 'advanced', 8);

-- ============================================
-- PRACTICAL LIFE - CARE OF SELF (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Dressing Frame - Velcro', 'dressing-frame-velcro', 'practical_life', 'care_of_self', 2.5, 4.0, 2.5,
  ARRAY['Fastening skill', 'Self-dressing'],
  ARRAY['Independence', 'Hand strength'],
  ARRAY['Interest in doing own clothes'],
  ARRAY['fine_motor', 'independence'],
  ARRAY['Velcro dressing frame'],
  'Your child practices the easiest fastening, building confidence for dressing.',
  true, 'introductory', 1),

('Dressing Frame - Small Buttons', 'dressing-frame-small-buttons', 'practical_life', 'care_of_self', 3.0, 5.0, 3.5,
  ARRAY['Refined buttoning', 'Fine motor'],
  ARRAY['Complete dressing independence', 'Patience'],
  ARRAY['Large button success'],
  ARRAY['fine_motor', 'concentration'],
  ARRAY['Small button dressing frame'],
  'Your child masters smaller buttons for complete dressing independence.',
  false, 'developing', 3),

('Dressing Frame - Snaps', 'dressing-frame-snaps', 'practical_life', 'care_of_self', 3.0, 5.0, 3.0,
  ARRAY['Snap manipulation', 'Fastening variety'],
  ARRAY['Jacket independence', 'Hand strength'],
  ARRAY['Button competence'],
  ARRAY['fine_motor', 'hand_strength'],
  ARRAY['Snap dressing frame'],
  'Your child learns to use snaps found on many jackets and clothes.',
  false, 'developing', 4),

('Dressing Frame - Zipper', 'dressing-frame-zipper', 'practical_life', 'care_of_self', 3.0, 5.0, 3.5,
  ARRAY['Zipper operation', 'Two-hand coordination'],
  ARRAY['Coat independence', 'Bag independence'],
  ARRAY['Snap mastery'],
  ARRAY['fine_motor', 'coordination'],
  ARRAY['Zipper dressing frame'],
  'Your child masters zippers for coats and bags.',
  false, 'developing', 5),

('Dressing Frame - Buckles', 'dressing-frame-buckles', 'practical_life', 'care_of_self', 3.5, 5.5, 4.0,
  ARRAY['Buckle manipulation', 'Threading'],
  ARRAY['Belt independence', 'Shoe independence'],
  ARRAY['Zipper competence'],
  ARRAY['fine_motor', 'problem_solving'],
  ARRAY['Buckle dressing frame'],
  'Your child learns buckles for belts and some shoes.',
  false, 'developing', 6),

('Dressing Frame - Lacing', 'dressing-frame-lacing', 'practical_life', 'care_of_self', 3.5, 5.5, 4.0,
  ARRAY['Threading', 'Crossing pattern'],
  ARRAY['Shoe tying preparation', 'Pattern following'],
  ARRAY['Fine motor established'],
  ARRAY['fine_motor', 'pattern'],
  ARRAY['Lacing dressing frame'],
  'Your child learns the lacing pattern that prepares for shoe tying.',
  true, 'developing', 7),

('Dressing Frame - Bow Tying', 'dressing-frame-bow', 'practical_life', 'care_of_self', 4.0, 6.0, 4.5,
  ARRAY['Complete bow', 'Complex sequence'],
  ARRAY['Shoe independence', 'Gift wrapping'],
  ARRAY['Can make loops'],
  ARRAY['fine_motor', 'sequence'],
  ARRAY['Bow tying dressing frame'],
  'Your child masters bow tying for complete shoe independence.',
  true, 'advanced', 8),

('Hand Washing', 'hand-washing', 'practical_life', 'care_of_self', 2.5, 6.0, 2.5,
  ARRAY['Hygiene skill', 'Sequence following'],
  ARRAY['Health awareness', 'Independence'],
  ARRAY['Interested in being clean', 'Can use water'],
  ARRAY['self_care', 'sequence'],
  ARRAY['Basin', 'Soap', 'Towel'],
  'Your child learns proper hand washing for health and independence.',
  true, 'introductory', 9),

('Face Washing', 'face-washing', 'practical_life', 'care_of_self', 3.0, 6.0, 3.0,
  ARRAY['Personal hygiene', 'Self-care'],
  ARRAY['Independence', 'Morning routine'],
  ARRAY['Hand washing mastery'],
  ARRAY['self_care', 'coordination'],
  ARRAY['Washcloth', 'Basin', 'Mirror'],
  'Your child learns to wash their face independently.',
  false, 'developing', 10),

('Tooth Brushing', 'tooth-brushing', 'practical_life', 'care_of_self', 3.0, 6.0, 3.0,
  ARRAY['Dental hygiene', 'Health habit'],
  ARRAY['Lifelong health habits', 'Routine'],
  ARRAY['Follows multi-step sequence'],
  ARRAY['self_care', 'health'],
  ARRAY['Toothbrush', 'Toothpaste', 'Cup'],
  'Your child develops the important habit of brushing teeth.',
  false, 'developing', 11),

('Hair Combing', 'hair-combing', 'practical_life', 'care_of_self', 3.0, 6.0, 3.0,
  ARRAY['Grooming skill', 'Personal care'],
  ARRAY['Personal presentation', 'Arm control'],
  ARRAY['Arm control', 'Interest in appearance'],
  ARRAY['self_care', 'coordination'],
  ARRAY['Comb or brush', 'Mirror'],
  'Your child learns to care for their own hair.',
  false, 'developing', 12),

('Nose Blowing', 'nose-blowing', 'practical_life', 'care_of_self', 2.5, 6.0, 2.5,
  ARRAY['Hygiene skill', 'Health awareness'],
  ARRAY['Social awareness', 'Independence'],
  ARRAY['Understands purpose'],
  ARRAY['self_care', 'health'],
  ARRAY['Tissues', 'Mirror'],
  'Your child learns proper nose blowing for health and social awareness.',
  false, 'introductory', 13),

('Putting on Coat', 'putting-on-coat', 'practical_life', 'care_of_self', 3.0, 6.0, 3.0,
  ARRAY['Dressing skill', 'Independence'],
  ARRAY['Outdoor readiness', 'Self-sufficiency'],
  ARRAY['Interest in dressing', 'Arm coordination'],
  ARRAY['gross_motor', 'independence'],
  ARRAY['Child-sized coat'],
  'Your child learns the flip-over-head method for putting on coats.',
  true, 'developing', 14),

('Shoe Polishing', 'shoe-polishing', 'practical_life', 'care_of_self', 4.0, 6.0, 4.5,
  ARRAY['Care of belongings', 'Multi-step process'],
  ARRAY['Concentration', 'Pride in appearance'],
  ARRAY['Multi-step sequence ability'],
  ARRAY['concentration', 'sequence'],
  ARRAY['Polish', 'Brush', 'Cloth', 'Shoe'],
  'Your child learns to care for their belongings through shoe polishing.',
  false, 'advanced', 15);


-- ============================================
-- PRACTICAL LIFE - CARE OF ENVIRONMENT (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Dusting', 'dusting', 'practical_life', 'care_of_environment', 2.5, 6.0, 2.5,
  ARRAY['Clean surfaces', 'Environmental care'],
  ARRAY['Environmental awareness', 'Concentration'],
  ARRAY['Can hold duster', 'Can follow path'],
  ARRAY['fine_motor', 'concentration'],
  ARRAY['Duster', 'Shelf or surface'],
  'Your child learns to care for the environment by dusting surfaces.',
  true, 'introductory', 1),

('Sweeping', 'sweeping', 'practical_life', 'care_of_environment', 3.0, 6.0, 3.0,
  ARRAY['Floor cleaning', 'Tool use'],
  ARRAY['Coordination', 'Responsibility'],
  ARRAY['Can manage broom size', 'Dusting mastery'],
  ARRAY['gross_motor', 'coordination'],
  ARRAY['Child-sized broom', 'Defined area'],
  'Your child develops coordination while caring for the classroom floor.',
  false, 'developing', 2),

('Using Dustpan', 'using-dustpan', 'practical_life', 'care_of_environment', 3.0, 6.0, 3.0,
  ARRAY['Complete cleaning cycle', 'Tool coordination'],
  ARRAY['Sequence completion', 'Environmental care'],
  ARRAY['Sweeping competence'],
  ARRAY['coordination', 'sequence'],
  ARRAY['Dustpan', 'Small broom'],
  'Your child completes the sweeping cycle by collecting debris.',
  false, 'developing', 3),

('Mopping', 'mopping', 'practical_life', 'care_of_environment', 3.5, 6.0, 4.0,
  ARRAY['Floor care', 'Wet cleaning'],
  ARRAY['Upper body strength', 'Coordination'],
  ARRAY['Wet work mastery', 'Strength developing'],
  ARRAY['gross_motor', 'strength'],
  ARRAY['Child-sized mop', 'Bucket'],
  'Your child builds strength while caring for the floor.',
  false, 'developing', 4),

('Window Washing', 'window-washing', 'practical_life', 'care_of_environment', 3.5, 6.0, 4.0,
  ARRAY['Glass cleaning', 'Streak awareness'],
  ARRAY['Visual discrimination', 'Precision'],
  ARRAY['Table washing mastery'],
  ARRAY['fine_motor', 'visual_discrimination'],
  ARRAY['Spray bottle', 'Squeegee', 'Cloth'],
  'Your child learns precision by cleaning windows without streaks.',
  false, 'developing', 5),

('Mirror Polishing', 'mirror-polishing', 'practical_life', 'care_of_environment', 3.0, 6.0, 3.5,
  ARRAY['Reflective surface care', 'Visual feedback'],
  ARRAY['Precision', 'Self-correction'],
  ARRAY['Can see own reflection', 'Interested'],
  ARRAY['fine_motor', 'concentration'],
  ARRAY['Mirror', 'Polishing cloth'],
  'Your child sees immediate results while polishing mirrors.',
  false, 'developing', 6),

('Metal Polishing', 'metal-polishing', 'practical_life', 'care_of_environment', 4.0, 6.0, 4.5,
  ARRAY['Metal care', 'Transformation observation'],
  ARRAY['Patience', 'Extended concentration'],
  ARRAY['Extended concentration developed'],
  ARRAY['concentration', 'patience'],
  ARRAY['Polish', 'Cloths', 'Metal object'],
  'Your child develops patience watching metal transform from dull to shiny.',
  false, 'advanced', 7),

('Plant Care - Watering', 'plant-watering', 'practical_life', 'care_of_environment', 2.5, 6.0, 2.5,
  ARRAY['Plant needs awareness', 'Careful pouring'],
  ARRAY['Life cycle understanding', 'Responsibility'],
  ARRAY['Can pour carefully'],
  ARRAY['fine_motor', 'responsibility'],
  ARRAY['Watering can', 'Plants'],
  'Your child learns responsibility by caring for living plants.',
  true, 'introductory', 8),

('Plant Care - Dusting Leaves', 'plant-dusting', 'practical_life', 'care_of_environment', 3.0, 6.0, 3.5,
  ARRAY['Gentle touch', 'Plant care'],
  ARRAY['Respect for living things', 'Fine motor'],
  ARRAY['Understands gentle'],
  ARRAY['fine_motor', 'gentleness'],
  ARRAY['Soft cloth', 'Plant with large leaves'],
  'Your child learns gentle care while helping plants breathe.',
  false, 'developing', 9),

('Flower Arranging', 'flower-arranging', 'practical_life', 'care_of_environment', 3.0, 6.0, 3.5,
  ARRAY['Aesthetic arrangement', 'Beauty creation'],
  ARRAY['Beauty appreciation', 'Creativity'],
  ARRAY['Can use scissors', 'Can pour water'],
  ARRAY['creativity', 'fine_motor'],
  ARRAY['Vase', 'Flowers', 'Scissors', 'Water'],
  'Your child creates beauty while learning arrangement skills.',
  false, 'developing', 10),

('Folding - Simple', 'folding-simple', 'practical_life', 'care_of_environment', 3.0, 6.0, 3.0,
  ARRAY['Cloth folding', 'Geometric awareness'],
  ARRAY['Order', 'Precision'],
  ARRAY['Can align edges'],
  ARRAY['fine_motor', 'precision'],
  ARRAY['Napkins or cloths'],
  'Your child learns to fold cloths neatly in half.',
  true, 'developing', 11),

('Folding - Complex', 'folding-complex', 'practical_life', 'care_of_environment', 3.5, 6.0, 4.0,
  ARRAY['Multiple fold patterns', 'Sequence following'],
  ARRAY['Symmetry understanding', 'Pattern following'],
  ARRAY['Simple folding mastery'],
  ARRAY['fine_motor', 'sequence'],
  ARRAY['Paper or cloth', 'Folding patterns'],
  'Your child follows complex folding patterns.',
  false, 'developing', 12);

-- ============================================
-- PRACTICAL LIFE - GRACE AND COURTESY
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Greeting', 'greeting', 'practical_life', 'grace_courtesy', 2.5, 6.0, 2.5,
  ARRAY['Polite greeting', 'Social awareness'],
  ARRAY['Social confidence', 'Communication'],
  ARRAY['Interest in others'],
  ARRAY['social', 'language'],
  ARRAY['None'],
  'Your child learns to greet others warmly and politely.',
  true, 'introductory', 1),

('Introducing Self', 'introducing-self', 'practical_life', 'grace_courtesy', 3.0, 6.0, 3.0,
  ARRAY['Self-presentation', 'Social skill'],
  ARRAY['Communication skills', 'Confidence'],
  ARRAY['Can say own name clearly'],
  ARRAY['social', 'language'],
  ARRAY['None'],
  'Your child learns to introduce themselves to new people.',
  false, 'developing', 2),

('Introducing Others', 'introducing-others', 'practical_life', 'grace_courtesy', 3.5, 6.0, 4.0,
  ARRAY['Social facilitation', 'Memory'],
  ARRAY['Social awareness', 'Helpfulness'],
  ARRAY['Knows others names'],
  ARRAY['social', 'memory'],
  ARRAY['None'],
  'Your child learns to help others meet each other.',
  false, 'developing', 3),

('Saying Please and Thank You', 'please-thank-you', 'practical_life', 'grace_courtesy', 2.5, 6.0, 2.5,
  ARRAY['Basic courtesy', 'Gratitude'],
  ARRAY['Respect', 'Social awareness'],
  ARRAY['Language development'],
  ARRAY['social', 'language'],
  ARRAY['None'],
  'Your child learns essential words of courtesy.',
  true, 'introductory', 4),

('Excusing Self', 'excusing-self', 'practical_life', 'grace_courtesy', 3.0, 6.0, 3.0,
  ARRAY['Polite interruption', 'Social awareness'],
  ARRAY['Respect for others', 'Patience'],
  ARRAY['Understands turn-taking'],
  ARRAY['social', 'self_control'],
  ARRAY['None'],
  'Your child learns to politely get attention when needed.',
  false, 'developing', 5),

('Apologizing', 'apologizing', 'practical_life', 'grace_courtesy', 3.0, 6.0, 3.0,
  ARRAY['Taking responsibility', 'Making amends'],
  ARRAY['Empathy', 'Relationship repair'],
  ARRAY['Can recognize mistakes'],
  ARRAY['social', 'emotional'],
  ARRAY['None'],
  'Your child learns to take responsibility and make things right.',
  false, 'developing', 6),

('Offering Help', 'offering-help', 'practical_life', 'grace_courtesy', 3.0, 6.0, 3.0,
  ARRAY['Service to others', 'Awareness'],
  ARRAY['Community awareness', 'Kindness'],
  ARRAY['Notices others needs'],
  ARRAY['social', 'empathy'],
  ARRAY['None'],
  'Your child learns to notice and offer help to others.',
  false, 'developing', 7),

('Table Manners', 'table-manners', 'practical_life', 'grace_courtesy', 3.0, 6.0, 3.0,
  ARRAY['Meal etiquette', 'Social eating'],
  ARRAY['Social eating skills', 'Self-control'],
  ARRAY['Interest in proper eating'],
  ARRAY['social', 'self_control'],
  ARRAY['Table setting'],
  'Your child learns polite behavior during meals.',
  true, 'developing', 8),

('Waiting Turn', 'waiting-turn', 'practical_life', 'grace_courtesy', 3.0, 6.0, 3.0,
  ARRAY['Patience', 'Turn-taking'],
  ARRAY['Self-regulation', 'Respect'],
  ARRAY['Beginning impulse control'],
  ARRAY['self_control', 'patience'],
  ARRAY['None'],
  'Your child develops patience by learning to wait for their turn.',
  true, 'developing', 9),

('Walking Around Work', 'walking-around-work', 'practical_life', 'grace_courtesy', 2.5, 6.0, 2.5,
  ARRAY['Respect for others space', 'Awareness'],
  ARRAY['Spatial awareness', 'Community'],
  ARRAY['Understands others space'],
  ARRAY['spatial', 'social'],
  ARRAY['Work mats'],
  'Your child learns to respect others workspaces.',
  true, 'introductory', 10),

('Asking to Join', 'asking-to-join', 'practical_life', 'grace_courtesy', 3.0, 6.0, 3.0,
  ARRAY['Collaborative entry', 'Social negotiation'],
  ARRAY['Friendship skills', 'Communication'],
  ARRAY['Interest in others work'],
  ARRAY['social', 'language'],
  ARRAY['None'],
  'Your child learns to politely ask to join others.',
  false, 'developing', 11),

('Conflict Resolution', 'conflict-resolution', 'practical_life', 'grace_courtesy', 4.0, 6.0, 4.5,
  ARRAY['Peaceful problem-solving', 'Communication'],
  ARRAY['Emotional regulation', 'Empathy'],
  ARRAY['Can express feelings verbally'],
  ARRAY['social', 'emotional', 'language'],
  ARRAY['Peace table or corner'],
  'Your child learns to solve conflicts peacefully with words.',
  true, 'advanced', 12);


-- ============================================
-- PRACTICAL LIFE - FOOD PREPARATION
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Spreading', 'spreading', 'practical_life', 'food_preparation', 2.5, 6.0, 2.5,
  ARRAY['Spreading skill', 'Utensil use'],
  ARRAY['Self-feeding', 'Fine motor'],
  ARRAY['Can hold spreader'],
  ARRAY['fine_motor', 'independence'],
  ARRAY['Bread', 'Butter or jam', 'Spreader'],
  'Your child prepares their own snack by spreading.',
  true, 'introductory', 1),

('Cutting Soft Foods', 'cutting-soft', 'practical_life', 'food_preparation', 3.0, 6.0, 3.0,
  ARRAY['Knife safety', 'Cutting skill'],
  ARRAY['Food independence', 'Safety awareness'],
  ARRAY['Understands sharp', 'Spreading mastery'],
  ARRAY['fine_motor', 'safety'],
  ARRAY['Child-safe knife', 'Banana or soft food', 'Cutting board'],
  'Your child learns safe cutting with soft foods like banana.',
  true, 'developing', 2),

('Cutting Harder Foods', 'cutting-hard', 'practical_life', 'food_preparation', 3.5, 6.0, 4.0,
  ARRAY['Advanced cutting', 'Food preparation'],
  ARRAY['Complete food prep', 'Independence'],
  ARRAY['Soft cutting mastery'],
  ARRAY['fine_motor', 'safety'],
  ARRAY['Child knife', 'Vegetables', 'Cutting board'],
  'Your child advances to cutting firmer foods.',
  false, 'developing', 3),

('Peeling', 'peeling', 'practical_life', 'food_preparation', 3.0, 6.0, 3.0,
  ARRAY['Peeling technique', 'Food preparation'],
  ARRAY['Hand strength', 'Patience'],
  ARRAY['Fine motor control developed'],
  ARRAY['fine_motor', 'patience'],
  ARRAY['Hard-boiled eggs or oranges'],
  'Your child learns to peel various foods.',
  false, 'developing', 4),

('Squeezing Juice', 'squeezing-juice', 'practical_life', 'food_preparation', 3.0, 6.0, 3.0,
  ARRAY['Juicing skill', 'Hand strength'],
  ARRAY['Grip strength', 'Cause and effect'],
  ARRAY['Can twist and squeeze'],
  ARRAY['hand_strength', 'fine_motor'],
  ARRAY['Juicer', 'Oranges or lemons'],
  'Your child makes fresh juice while building hand strength.',
  false, 'developing', 5),

('Grating', 'grating', 'practical_life', 'food_preparation', 3.5, 6.0, 4.0,
  ARRAY['Grating technique', 'Safety awareness'],
  ARRAY['Hand control', 'Food preparation'],
  ARRAY['Strong grip', 'Careful with tools'],
  ARRAY['fine_motor', 'safety'],
  ARRAY['Grater', 'Cheese or vegetables'],
  'Your child grates ingredients while learning safety.',
  false, 'developing', 6),

('Whisking and Mixing', 'whisking', 'practical_life', 'food_preparation', 3.0, 6.0, 3.0,
  ARRAY['Mixing skill', 'Circular motion'],
  ARRAY['Arm strength', 'Rhythm'],
  ARRAY['Can stir in circles'],
  ARRAY['gross_motor', 'coordination'],
  ARRAY['Whisk or spoon', 'Bowl', 'Ingredients'],
  'Your child develops arm strength through whisking.',
  false, 'developing', 7),

('Simple Snack Preparation', 'snack-prep', 'practical_life', 'food_preparation', 3.0, 6.0, 3.5,
  ARRAY['Complete snack making', 'Multi-step process'],
  ARRAY['Independence', 'Sequence following'],
  ARRAY['Multiple prep skills'],
  ARRAY['independence', 'sequence'],
  ARRAY['Various snack ingredients'],
  'Your child prepares a complete snack independently.',
  true, 'developing', 8),

('Setting Table', 'setting-table', 'practical_life', 'food_preparation', 3.0, 6.0, 3.0,
  ARRAY['Table arrangement', 'Spatial organization'],
  ARRAY['Left/right awareness', 'Sequence'],
  ARRAY['Understands meal setup'],
  ARRAY['spatial', 'sequence'],
  ARRAY['Placemat', 'Dishes', 'Utensils'],
  'Your child learns to properly set a table.',
  true, 'developing', 9),

('Serving Self', 'serving-self', 'practical_life', 'food_preparation', 3.0, 6.0, 3.0,
  ARRAY['Self-service', 'Portion awareness'],
  ARRAY['Independence', 'Self-regulation'],
  ARRAY['Control with utensils'],
  ARRAY['independence', 'self_control'],
  ARRAY['Serving utensils', 'Food'],
  'Your child serves themselves appropriate portions.',
  false, 'developing', 10),

('Clearing Table', 'clearing-table', 'practical_life', 'food_preparation', 3.0, 6.0, 3.0,
  ARRAY['Post-meal care', 'Responsibility'],
  ARRAY['Completing cycles', 'Order'],
  ARRAY['Can carry dishes safely'],
  ARRAY['responsibility', 'gross_motor'],
  ARRAY['Dishes', 'Designated areas'],
  'Your child completes the meal cycle by clearing.',
  false, 'developing', 11);

-- ============================================
-- SENSORIAL - VISUAL DIMENSION (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Knobbed Cylinders Block 2', 'knobbed-cylinders-2', 'sensorial', 'visual_dimension', 2.5, 4.0, 3.0,
  ARRAY['Discriminate diameter AND height proportionally'],
  ARRAY['Mathematical progression', 'Visual refinement'],
  ARRAY['Block 1 mastery'],
  ARRAY['visual_discrimination', 'fine_motor'],
  ARRAY['Cylinder Block 2'],
  'Your child discriminates cylinders varying in two dimensions at once.',
  false, 'developing', 2),

('Knobbed Cylinders Block 3', 'knobbed-cylinders-3', 'sensorial', 'visual_dimension', 3.0, 4.5, 3.5,
  ARRAY['Discriminate diameter inverse to height'],
  ARRAY['Complex relationship awareness', 'Concentration'],
  ARRAY['Blocks 1, 2 mastery'],
  ARRAY['visual_discrimination', 'fine_motor'],
  ARRAY['Cylinder Block 3'],
  'Your child works with cylinders where diameter and height change inversely.',
  false, 'developing', 3),

('Knobbed Cylinders Block 4', 'knobbed-cylinders-4', 'sensorial', 'visual_dimension', 3.0, 4.5, 3.5,
  ARRAY['Discriminate height only'],
  ARRAY['Seriation concept', 'Height awareness'],
  ARRAY['Blocks 1-3 mastery'],
  ARRAY['visual_discrimination', 'seriation'],
  ARRAY['Cylinder Block 4'],
  'Your child focuses on height discrimination only.',
  false, 'developing', 4),

('Knobbed Cylinders Combined', 'knobbed-cylinders-combined', 'sensorial', 'visual_dimension', 3.5, 5.0, 4.0,
  ARRAY['Complex visual discrimination', 'Problem-solving'],
  ARRAY['Persistence', 'Advanced discrimination'],
  ARRAY['All blocks mastered individually'],
  ARRAY['visual_discrimination', 'problem_solving'],
  ARRAY['All four Cylinder Blocks'],
  'Your child works with all cylinder blocks together for complex discrimination.',
  false, 'advanced', 5),

('Knobless Cylinders', 'knobless-cylinders', 'sensorial', 'visual_dimension', 3.5, 5.0, 4.0,
  ARRAY['Discrimination without built-in control'],
  ARRAY['Self-correction', 'Comparison skills'],
  ARRAY['All knobbed cylinder work complete'],
  ARRAY['visual_discrimination', 'self_correction'],
  ARRAY['Four sets of knobless cylinders'],
  'Your child advances to cylinders without the guiding knobs.',
  true, 'advanced', 6);

-- ============================================
-- SENSORIAL - VISUAL COLOR (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Color Tablets Box 2', 'color-tablets-2', 'sensorial', 'visual_color', 3.0, 5.0, 3.5,
  ARRAY['Match 11 color pairs', 'Extended color vocabulary'],
  ARRAY['Color naming', 'Visual discrimination'],
  ARRAY['Box 1 mastery'],
  ARRAY['visual_discrimination', 'vocabulary'],
  ARRAY['Color Tablets Box 2 (22 tablets - 11 pairs)'],
  'Your child matches 11 different colors, expanding color vocabulary.',
  false, 'developing', 2),

('Color Tablets Box 3', 'color-tablets-3', 'sensorial', 'visual_color', 3.5, 6.0, 4.0,
  ARRAY['Grade 9 colors light to dark', 'Subtle discrimination'],
  ARRAY['Comparison', 'Seriation'],
  ARRAY['Box 2 mastery', 'Understands gradation'],
  ARRAY['visual_discrimination', 'seriation'],
  ARRAY['Color Tablets Box 3 (63 tablets)'],
  'Your child grades shades of colors from lightest to darkest.',
  true, 'advanced', 3);


-- ============================================
-- SENSORIAL - VISUAL FORM (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Geometric Cabinet - Circles Drawer', 'geometric-cabinet-circles', 'sensorial', 'visual_form', 3.0, 5.0, 3.5,
  ARRAY['Size discrimination within circles', 'Shape constancy'],
  ARRAY['Size vocabulary', 'Geometry foundation'],
  ARRAY['Demo tray success'],
  ARRAY['visual_discrimination', 'shape_recognition'],
  ARRAY['Geometric Cabinet circles drawer'],
  'Your child explores circles of different sizes.',
  false, 'developing', 2),

('Geometric Cabinet - Rectangles Drawer', 'geometric-cabinet-rectangles', 'sensorial', 'visual_form', 3.0, 5.0, 3.5,
  ARRAY['Rectangle variations', 'Dimension awareness'],
  ARRAY['Dimension vocabulary', 'Mathematical concepts'],
  ARRAY['Circles mastery'],
  ARRAY['visual_discrimination', 'shape_recognition'],
  ARRAY['Geometric Cabinet rectangles drawer'],
  'Your child explores rectangles of different proportions.',
  false, 'developing', 3),

('Geometric Cabinet - Triangles Drawer', 'geometric-cabinet-triangles', 'sensorial', 'visual_form', 3.5, 5.5, 4.0,
  ARRAY['Triangle types', 'Angle awareness'],
  ARRAY['Geometry preparation', 'Classification'],
  ARRAY['Rectangle mastery'],
  ARRAY['visual_discrimination', 'shape_recognition'],
  ARRAY['Geometric Cabinet triangles drawer'],
  'Your child discovers different types of triangles.',
  false, 'developing', 4),

('Geometric Cabinet - Polygons Drawer', 'geometric-cabinet-polygons', 'sensorial', 'visual_form', 3.5, 5.5, 4.0,
  ARRAY['Multi-sided shapes', 'Counting sides'],
  ARRAY['Geometry preparation', 'Counting integration'],
  ARRAY['Triangle mastery'],
  ARRAY['visual_discrimination', 'shape_recognition'],
  ARRAY['Geometric Cabinet polygons drawer'],
  'Your child explores shapes with many sides.',
  false, 'developing', 5),

('Geometric Cabinet - Curvilinear Drawer', 'geometric-cabinet-curvilinear', 'sensorial', 'visual_form', 4.0, 6.0, 4.5,
  ARRAY['Curved shapes', 'Form discrimination'],
  ARRAY['Advanced geometry', 'Visual refinement'],
  ARRAY['Polygon mastery'],
  ARRAY['visual_discrimination', 'shape_recognition'],
  ARRAY['Geometric Cabinet curvilinear drawer'],
  'Your child explores curved shapes like ovals and ellipses.',
  false, 'advanced', 6),

('Geometric Solids', 'geometric-solids', 'sensorial', 'visual_form', 3.5, 6.0, 4.0,
  ARRAY['3D shape recognition', 'Solid geometry'],
  ARRAY['Geometry vocabulary', 'Spatial reasoning'],
  ARRAY['2D shape familiarity'],
  ARRAY['visual_discrimination', 'spatial_reasoning'],
  ARRAY['Set of geometric solids'],
  'Your child explores three-dimensional shapes.',
  true, 'developing', 7),

('Constructive Triangles - Rectangular Box', 'constructive-triangles-rect', 'sensorial', 'visual_form', 4.0, 6.0, 4.5,
  ARRAY['Build shapes from triangles', 'Geometric relationships'],
  ARRAY['Geometry understanding', 'Creativity'],
  ARRAY['Strong shape recognition'],
  ARRAY['visual_discrimination', 'problem_solving'],
  ARRAY['Rectangular box of triangles'],
  'Your child discovers how triangles form other shapes.',
  true, 'advanced', 8),

('Constructive Triangles - Triangular Box', 'constructive-triangles-tri', 'sensorial', 'visual_form', 4.0, 6.0, 4.5,
  ARRAY['Complex constructions', 'Pattern recognition'],
  ARRAY['Advanced geometry', 'Creativity'],
  ARRAY['Rectangular box mastery'],
  ARRAY['visual_discrimination', 'creativity'],
  ARRAY['Triangular box of triangles'],
  'Your child creates more complex shapes from triangles.',
  false, 'advanced', 9),

('Constructive Triangles - Large Hexagonal Box', 'constructive-triangles-hex', 'sensorial', 'visual_form', 4.5, 6.0, 5.0,
  ARRAY['Hexagon construction', 'Complex patterns'],
  ARRAY['Pattern recognition', 'Geometry mastery'],
  ARRAY['Previous boxes mastery'],
  ARRAY['visual_discrimination', 'pattern'],
  ARRAY['Large hexagonal box of triangles'],
  'Your child builds hexagons and discovers complex relationships.',
  false, 'advanced', 10),

('Trinomial Cube', 'trinomial-cube', 'sensorial', 'visual_form', 4.0, 6.0, 4.5,
  ARRAY['Complex 3D pattern', 'Multiple variables'],
  ARRAY['Algebraic concept (a+b+c)³', 'Advanced reasoning'],
  ARRAY['Binomial mastery'],
  ARRAY['visual_discrimination', 'spatial_reasoning'],
  ARRAY['Trinomial Cube'],
  'Your child works with an advanced 3D puzzle representing (a+b+c)³.',
  false, 'advanced', 11);

-- ============================================
-- SENSORIAL - TACTILE
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Rough and Smooth Boards', 'rough-smooth-boards', 'sensorial', 'tactile', 2.5, 4.5, 3.0,
  ARRAY['Tactile discrimination', 'Texture awareness'],
  ARRAY['Sandpaper letter preparation', 'Vocabulary'],
  ARRAY['Interest in textures'],
  ARRAY['tactile_discrimination', 'vocabulary'],
  ARRAY['Rough and smooth boards'],
  'Your child develops touch discrimination with different textures.',
  true, 'introductory', 1),

('Rough Gradation Tablets', 'rough-gradation', 'sensorial', 'tactile', 3.0, 5.0, 3.5,
  ARRAY['Grade rough textures', 'Fine discrimination'],
  ARRAY['Refined tactile sense', 'Seriation'],
  ARRAY['Rough/smooth mastery'],
  ARRAY['tactile_discrimination', 'seriation'],
  ARRAY['Rough gradation tablets'],
  'Your child grades textures from roughest to smoothest.',
  false, 'developing', 2),

('Fabric Matching', 'fabric-matching', 'sensorial', 'tactile', 3.0, 5.0, 3.5,
  ARRAY['Match fabric textures', 'Memory'],
  ARRAY['Tactile memory', 'Vocabulary'],
  ARRAY['Rough gradation success'],
  ARRAY['tactile_discrimination', 'memory'],
  ARRAY['Pairs of fabric squares'],
  'Your child matches fabrics by touch alone.',
  false, 'developing', 3),

('Thermic Tablets', 'thermic-tablets', 'sensorial', 'tactile', 3.5, 5.5, 4.0,
  ARRAY['Temperature discrimination', 'Material properties'],
  ARRAY['Science preparation', 'Vocabulary'],
  ARRAY['Can describe hot/cold'],
  ARRAY['tactile_discrimination', 'science'],
  ARRAY['Thermic tablets (wood, metal, felt, etc.)'],
  'Your child feels how different materials conduct temperature.',
  true, 'developing', 4),

('Thermic Bottles', 'thermic-bottles', 'sensorial', 'tactile', 4.0, 6.0, 4.5,
  ARRAY['Temperature gradation', 'Heat sense'],
  ARRAY['Scientific observation', 'Seriation'],
  ARRAY['Tablet mastery'],
  ARRAY['tactile_discrimination', 'science'],
  ARRAY['Thermic bottles with water at different temperatures'],
  'Your child grades temperatures from coolest to warmest.',
  false, 'advanced', 5),

('Baric Tablets', 'baric-tablets', 'sensorial', 'tactile', 4.0, 6.0, 4.5,
  ARRAY['Weight discrimination', 'Heavy/light awareness'],
  ARRAY['Mathematical comparison', 'Refined sense'],
  ARRAY['Understands heavy/light'],
  ARRAY['tactile_discrimination', 'comparison'],
  ARRAY['Baric tablets (three weights)'],
  'Your child discriminates objects by weight.',
  true, 'advanced', 6),

('Mystery Bag', 'mystery-bag', 'sensorial', 'tactile', 3.0, 6.0, 3.5,
  ARRAY['Identify objects by touch', 'Mental imaging'],
  ARRAY['Stereognostic sense', 'Vocabulary'],
  ARRAY['Solid geometry familiarity'],
  ARRAY['tactile_discrimination', 'mental_imaging'],
  ARRAY['Cloth bag', 'Various objects or geometric solids'],
  'Your child identifies objects using only touch.',
  true, 'developing', 7);

-- ============================================
-- SENSORIAL - AUDITORY (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Montessori Bells - Matching', 'bells-matching', 'sensorial', 'auditory', 3.5, 6.0, 4.0,
  ARRAY['Pitch discrimination', 'Sound matching'],
  ARRAY['Musical ear development', 'Concentration'],
  ARRAY['Sound cylinder mastery'],
  ARRAY['auditory_discrimination', 'music'],
  ARRAY['Set of Montessori bells'],
  'Your child matches bells by pitch, developing musical awareness.',
  true, 'developing', 2),

('Montessori Bells - Grading', 'bells-grading', 'sensorial', 'auditory', 4.0, 6.0, 4.5,
  ARRAY['Pitch gradation', 'Musical scale'],
  ARRAY['Musical scale understanding', 'Seriation'],
  ARRAY['Bell matching success'],
  ARRAY['auditory_discrimination', 'music'],
  ARRAY['Set of Montessori bells'],
  'Your child grades bells from lowest to highest pitch.',
  false, 'advanced', 3);

-- ============================================
-- SENSORIAL - OLFACTORY AND GUSTATORY
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Smelling Bottles', 'smelling-bottles', 'sensorial', 'olfactory', 3.0, 5.0, 3.5,
  ARRAY['Match scents', 'Olfactory discrimination'],
  ARRAY['Vocabulary', 'Memory'],
  ARRAY['Can follow matching concept'],
  ARRAY['olfactory', 'memory'],
  ARRAY['Pairs of smelling bottles'],
  'Your child matches scents, developing sense of smell.',
  true, 'developing', 1),

('Tasting Bottles', 'tasting-bottles', 'sensorial', 'gustatory', 3.5, 5.5, 4.0,
  ARRAY['Identify taste qualities', 'Vocabulary'],
  ARRAY['Vocabulary (sweet, sour, salty, bitter)', 'Classification'],
  ARRAY['Smelling mastery'],
  ARRAY['gustatory', 'vocabulary'],
  ARRAY['Tasting bottles with basic tastes'],
  'Your child identifies the four basic tastes.',
  false, 'developing', 2);


-- ============================================
-- MATHEMATICS - NUMERATION (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Number Rods and Cards', 'number-rods-cards', 'mathematics', 'numeration', 3.5, 5.0, 4.0,
  ARRAY['Associate quantity with symbol', 'Numeral recognition'],
  ARRAY['Reading numerals', 'Symbol understanding'],
  ARRAY['Number Rods mastery', 'Sandpaper Numerals mastery'],
  ARRAY['quantity_symbol', 'numeral_recognition'],
  ARRAY['Number Rods', 'Number cards 1-10'],
  'Your child connects the quantity they feel to the written numeral.',
  true, 'developing', 3),

('Cards and Counters', 'cards-counters', 'mathematics', 'numeration', 4.0, 5.5, 4.5,
  ARRAY['Quantity confirmation', 'Odd/even introduction'],
  ARRAY['Numeral sequence', 'Pattern recognition'],
  ARRAY['Spindle box mastery'],
  ARRAY['counting', 'odd_even'],
  ARRAY['Number cards 1-10', '55 counters'],
  'Your child confirms counting and discovers odd and even numbers.',
  true, 'developing', 5),

('Memory Game of Numbers', 'memory-game-numbers', 'mathematics', 'numeration', 4.0, 5.5, 4.5,
  ARRAY['Number memory', 'Concentration'],
  ARRAY['Verification', 'Movement integration'],
  ARRAY['Cards/counters mastery'],
  ARRAY['memory', 'concentration'],
  ARRAY['Number cards', 'Objects to collect'],
  'Your child remembers quantities while moving to collect them.',
  false, 'developing', 6),

('Number Rods Addition', 'number-rods-addition', 'mathematics', 'numeration', 4.0, 5.5, 4.5,
  ARRAY['Sums to 10', 'Addition concept'],
  ARRAY['Mental addition preparation', 'Fact families'],
  ARRAY['Solid number rod work'],
  ARRAY['addition', 'mathematical_reasoning'],
  ARRAY['Number Rods'],
  'Your child discovers addition using the familiar number rods.',
  true, 'developing', 7),

('Number Rods Subtraction', 'number-rods-subtraction', 'mathematics', 'numeration', 4.0, 5.5, 4.5,
  ARRAY['Differences within 10', 'Subtraction concept'],
  ARRAY['Mental subtraction', 'Inverse operations'],
  ARRAY['Addition success'],
  ARRAY['subtraction', 'mathematical_reasoning'],
  ARRAY['Number Rods'],
  'Your child discovers subtraction as the inverse of addition.',
  false, 'developing', 8);

-- ============================================
-- MATHEMATICS - DECIMAL SYSTEM (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Golden Bead Quantity', 'golden-bead-quantity', 'mathematics', 'decimal_system', 4.0, 5.5, 4.5,
  ARRAY['Build quantities with beads', 'Place value'],
  ARRAY['Place value hierarchy', 'Large number sense'],
  ARRAY['Can name categories'],
  ARRAY['place_value', 'quantity'],
  ARRAY['Golden Bead material'],
  'Your child builds quantities using units, tens, hundreds, thousands.',
  false, 'developing', 2),

('Large Number Cards', 'large-number-cards', 'mathematics', 'decimal_system', 4.0, 5.5, 4.5,
  ARRAY['Read/build large numerals', 'Numeral formation'],
  ARRAY['Written numerals understanding', 'Place value'],
  ARRAY['Quantity work success'],
  ARRAY['numeral_recognition', 'place_value'],
  ARRAY['Large number cards (1-9000)'],
  'Your child reads and builds four-digit numerals.',
  false, 'developing', 3),

('Golden Bead Association', 'golden-bead-association', 'mathematics', 'decimal_system', 4.0, 5.5, 4.5,
  ARRAY['Connect quantity to symbol', 'Complete place value'],
  ARRAY['Number system understanding', 'Operations preparation'],
  ARRAY['Both quantity and cards work'],
  ARRAY['quantity_symbol', 'place_value'],
  ARRAY['Golden Beads', 'Large number cards'],
  'Your child connects quantities to their written form.',
  true, 'developing', 4),

('Formation of Numbers - Exchange', 'formation-exchange', 'mathematics', 'decimal_system', 4.5, 6.0, 5.0,
  ARRAY['Build specific quantities', 'Exchange concept'],
  ARRAY['Regrouping understanding', 'Operations preparation'],
  ARRAY['Association mastery'],
  ARRAY['exchange', 'place_value'],
  ARRAY['Golden Beads'],
  'Your child learns that 10 of one category equals 1 of the next.',
  true, 'developing', 5),

('45 Layout', 'forty-five-layout', 'mathematics', 'decimal_system', 4.5, 6.0, 5.0,
  ARRAY['Complete decimal layout', 'Visual pattern'],
  ARRAY['Decimal system visualization', 'Operations foundation'],
  ARRAY['Exchange understanding'],
  ARRAY['place_value', 'visual_pattern'],
  ARRAY['Golden Beads', 'Number cards'],
  'Your child sees the complete decimal system laid out.',
  false, 'developing', 6),

('Golden Bead Addition', 'golden-bead-addition', 'mathematics', 'decimal_system', 4.5, 6.0, 5.0,
  ARRAY['Add with carrying', 'Addition algorithm'],
  ARRAY['Algorithm understanding', 'Large number addition'],
  ARRAY['45 Layout success'],
  ARRAY['addition', 'algorithm'],
  ARRAY['Golden Beads', 'Number cards'],
  'Your child adds large numbers, exchanging when needed.',
  true, 'advanced', 7),

('Golden Bead Subtraction', 'golden-bead-subtraction', 'mathematics', 'decimal_system', 5.0, 6.0, 5.5,
  ARRAY['Subtract with borrowing', 'Subtraction algorithm'],
  ARRAY['Algorithm understanding', 'Large number subtraction'],
  ARRAY['Addition mastery'],
  ARRAY['subtraction', 'algorithm'],
  ARRAY['Golden Beads', 'Number cards'],
  'Your child subtracts large numbers, borrowing when needed.',
  false, 'advanced', 8),

('Golden Bead Multiplication', 'golden-bead-multiplication', 'mathematics', 'decimal_system', 5.0, 6.0, 5.5,
  ARRAY['Multiply as repeated addition', 'Multiplication concept'],
  ARRAY['Multiplication understanding', 'Skip counting connection'],
  ARRAY['Strong addition'],
  ARRAY['multiplication', 'algorithm'],
  ARRAY['Golden Beads', 'Number cards'],
  'Your child discovers multiplication as adding equal groups.',
  true, 'advanced', 9),

('Golden Bead Division', 'golden-bead-division', 'mathematics', 'decimal_system', 5.0, 6.0, 5.5,
  ARRAY['Divide as sharing', 'Division concept'],
  ARRAY['Division understanding', 'Fair sharing'],
  ARRAY['Multiplication success'],
  ARRAY['division', 'algorithm'],
  ARRAY['Golden Beads', 'Number cards', 'Skittles'],
  'Your child discovers division as sharing equally.',
  false, 'advanced', 10);

-- ============================================
-- MATHEMATICS - TEENS AND TENS
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Teen Boards - Quantity', 'teen-boards-quantity', 'mathematics', 'teens_tens', 4.5, 5.5, 4.5,
  ARRAY['Quantities 11-19', 'Teen understanding'],
  ARRAY['Teen number composition', 'Place value extension'],
  ARRAY['Place value started'],
  ARRAY['quantity', 'teen_numbers'],
  ARRAY['Teen boards', 'Golden bead bars'],
  'Your child builds teen numbers with ten and units.',
  true, 'developing', 1),

('Teen Boards - Symbols', 'teen-boards-symbols', 'mathematics', 'teens_tens', 4.5, 5.5, 4.5,
  ARRAY['Numerals 11-19', 'Teen numeral reading'],
  ARRAY['Teen number recognition', 'Numeral formation'],
  ARRAY['Teen quantity success'],
  ARRAY['numeral_recognition', 'teen_numbers'],
  ARRAY['Teen boards', 'Number tiles'],
  'Your child reads and forms teen numerals.',
  false, 'developing', 2),

('Teen Boards - Association', 'teen-boards-association', 'mathematics', 'teens_tens', 4.5, 5.5, 5.0,
  ARRAY['Connect teen quantities and symbols', 'Complete understanding'],
  ARRAY['Teen number mastery', 'Linear counting prep'],
  ARRAY['Both individual works'],
  ARRAY['quantity_symbol', 'teen_numbers'],
  ARRAY['Teen boards', 'Beads', 'Number tiles'],
  'Your child connects teen quantities to their numerals.',
  false, 'developing', 3),

('Ten Boards - Quantity', 'ten-boards-quantity', 'mathematics', 'teens_tens', 4.5, 5.5, 5.0,
  ARRAY['Tens quantities 10-90', 'Decade understanding'],
  ARRAY['Skip counting by tens', 'Place value extension'],
  ARRAY['Teen boards complete'],
  ARRAY['quantity', 'decades'],
  ARRAY['Ten boards', 'Golden bead bars'],
  'Your child builds decade numbers: 10, 20, 30...',
  true, 'developing', 4),

('Ten Boards - Symbols', 'ten-boards-symbols', 'mathematics', 'teens_tens', 5.0, 6.0, 5.0,
  ARRAY['Decade numerals', 'Reading large numbers'],
  ARRAY['Number reading fluency', 'Place value'],
  ARRAY['Quantity success'],
  ARRAY['numeral_recognition', 'decades'],
  ARRAY['Ten boards', 'Number tiles'],
  'Your child reads decade numerals.',
  false, 'developing', 5),

('Ten Boards - Association', 'ten-boards-association', 'mathematics', 'teens_tens', 5.0, 6.0, 5.0,
  ARRAY['Connect tens quantity and symbol', 'Complete understanding'],
  ARRAY['Linear counting preparation', 'Number sense'],
  ARRAY['Both individual works'],
  ARRAY['quantity_symbol', 'decades'],
  ARRAY['Ten boards', 'Beads', 'Number tiles'],
  'Your child connects decade quantities to their numerals.',
  false, 'developing', 6),

('Hundred Board', 'hundred-board', 'mathematics', 'teens_tens', 5.0, 6.0, 5.5,
  ARRAY['1-100 sequence', 'Number patterns'],
  ARRAY['Pattern recognition', 'Number sense'],
  ARRAY['Ten board mastery'],
  ARRAY['counting', 'pattern'],
  ARRAY['Hundred board', 'Number tiles 1-100'],
  'Your child explores all numbers from 1 to 100.',
  true, 'advanced', 7);


-- ============================================
-- MATHEMATICS - LINEAR COUNTING
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Short Bead Stair', 'short-bead-stair', 'mathematics', 'linear_counting', 4.0, 5.5, 4.5,
  ARRAY['Quantities 1-10 with color', 'Visual quantity'],
  ARRAY['Skip counting preparation', 'Quantity recognition'],
  ARRAY['Solid counting skills'],
  ARRAY['quantity', 'color_coding'],
  ARRAY['Colored bead bars 1-10'],
  'Your child sees quantities 1-10 represented by colored beads.',
  true, 'developing', 1),

('Colored Bead Bars', 'colored-bead-bars', 'mathematics', 'linear_counting', 4.5, 6.0, 5.0,
  ARRAY['Quantity recognition by color', 'Math fact preparation'],
  ARRAY['Addition/subtraction preparation', 'Visual math'],
  ARRAY['Bead stair familiarity'],
  ARRAY['quantity', 'color_coding'],
  ARRAY['Multiple sets of colored bead bars'],
  'Your child uses colored beads for mathematical operations.',
  false, 'developing', 2),

('Short Bead Chains', 'short-bead-chains', 'mathematics', 'linear_counting', 5.0, 6.0, 5.5,
  ARRAY['Skip counting', 'Square numbers'],
  ARRAY['Multiplication preparation', 'Number patterns'],
  ARRAY['Color bead recognition'],
  ARRAY['skip_counting', 'patterns'],
  ARRAY['Short bead chains', 'Number arrows'],
  'Your child skip counts and discovers square numbers.',
  true, 'advanced', 3),

('Long Bead Chains', 'long-bead-chains', 'mathematics', 'linear_counting', 5.5, 6.0, 5.5,
  ARRAY['Extended skip counting', 'Cube numbers'],
  ARRAY['Large number sense', 'Cubing concept'],
  ARRAY['Short chain success'],
  ARRAY['skip_counting', 'cubes'],
  ARRAY['Long bead chains', 'Number arrows'],
  'Your child discovers cube numbers through counting chains.',
  false, 'advanced', 4),

('Hundred Chain', 'hundred-chain', 'mathematics', 'linear_counting', 5.0, 6.0, 5.5,
  ARRAY['Count to 100', 'Skip count by 10s'],
  ARRAY['Hundred sense', 'Ten relationship'],
  ARRAY['Linear counting started'],
  ARRAY['counting', 'skip_counting'],
  ARRAY['Hundred chain', 'Number arrows'],
  'Your child counts to 100 using a bead chain.',
  true, 'advanced', 5),

('Thousand Chain', 'thousand-chain', 'mathematics', 'linear_counting', 5.5, 6.0, 6.0,
  ARRAY['Count to 1000', 'Large number sense'],
  ARRAY['Thousand understanding', 'Skip counting mastery'],
  ARRAY['Hundred chain success'],
  ARRAY['counting', 'large_numbers'],
  ARRAY['Thousand chain', 'Number arrows'],
  'Your child counts to 1000, developing large number sense.',
  false, 'mastery', 6);

-- ============================================
-- MATHEMATICS - MEMORIZATION
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Addition Strip Board', 'addition-strip-board', 'mathematics', 'memorization', 5.0, 6.0, 5.5,
  ARRAY['Addition facts to 18', 'Mental math preparation'],
  ARRAY['Addition memorization', 'Pattern recognition'],
  ARRAY['Concrete addition solid'],
  ARRAY['addition', 'memorization'],
  ARRAY['Addition strip board', 'Strips'],
  'Your child practices addition facts for memorization.',
  true, 'advanced', 1),

('Addition Charts', 'addition-charts', 'mathematics', 'memorization', 5.0, 6.0, 5.5,
  ARRAY['Memorize addition facts', 'Automatic recall'],
  ARRAY['Mental math', 'Quick recall'],
  ARRAY['Strip board mastery'],
  ARRAY['memorization', 'addition'],
  ARRAY['Addition charts 1-4'],
  'Your child moves toward automatic addition fact recall.',
  false, 'advanced', 2),

('Subtraction Strip Board', 'subtraction-strip-board', 'mathematics', 'memorization', 5.0, 6.0, 5.5,
  ARRAY['Subtraction facts', 'Mental subtraction'],
  ARRAY['Subtraction memorization', 'Inverse operations'],
  ARRAY['Addition facts solid'],
  ARRAY['subtraction', 'memorization'],
  ARRAY['Subtraction strip board', 'Strips'],
  'Your child practices subtraction facts.',
  true, 'advanced', 3),

('Subtraction Charts', 'subtraction-charts', 'mathematics', 'memorization', 5.5, 6.0, 5.5,
  ARRAY['Memorize subtraction facts', 'Automatic recall'],
  ARRAY['Mental subtraction', 'Fact fluency'],
  ARRAY['Strip board success'],
  ARRAY['memorization', 'subtraction'],
  ARRAY['Subtraction charts'],
  'Your child develops automatic subtraction recall.',
  false, 'advanced', 4),

('Multiplication Bead Board', 'multiplication-bead-board', 'mathematics', 'memorization', 5.5, 6.0, 5.5,
  ARRAY['Multiplication facts', 'Visual multiplication'],
  ARRAY['Tables preparation', 'Skip counting connection'],
  ARRAY['Skip counting solid'],
  ARRAY['multiplication', 'visual'],
  ARRAY['Multiplication bead board', 'Beads'],
  'Your child sees multiplication as arrays of beads.',
  true, 'advanced', 5),

('Multiplication Charts', 'multiplication-charts', 'mathematics', 'memorization', 5.5, 6.0, 6.0,
  ARRAY['Memorize multiplication', 'Times tables'],
  ARRAY['Automatic recall', 'Math fluency'],
  ARRAY['Bead board success'],
  ARRAY['memorization', 'multiplication'],
  ARRAY['Multiplication charts'],
  'Your child memorizes multiplication tables.',
  false, 'mastery', 6),

('Division Board', 'division-board', 'mathematics', 'memorization', 5.5, 6.0, 6.0,
  ARRAY['Division facts', 'Visual division'],
  ARRAY['Division fluency', 'Inverse multiplication'],
  ARRAY['Multiplication solid'],
  ARRAY['division', 'memorization'],
  ARRAY['Division board', 'Beads', 'Skittles'],
  'Your child practices division facts.',
  false, 'mastery', 7);

-- ============================================
-- MATHEMATICS - ABSTRACTION (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Dot Game', 'dot-game', 'mathematics', 'abstraction', 5.5, 6.0, 5.5,
  ARRAY['Paper-based operations', 'Written math'],
  ARRAY['Traditional algorithms', 'Paper math transition'],
  ARRAY['Stamp game mastery'],
  ARRAY['operations', 'written_math'],
  ARRAY['Dot game paper', 'Colored pencils'],
  'Your child transitions to paper-based arithmetic.',
  false, 'advanced', 2),

('Small Bead Frame', 'small-bead-frame', 'mathematics', 'abstraction', 5.5, 6.0, 5.5,
  ARRAY['Abacus-style calculation', 'Place value'],
  ARRAY['Mental calculation', 'Quick operations'],
  ARRAY['Stamp game solid'],
  ARRAY['operations', 'place_value'],
  ARRAY['Small bead frame'],
  'Your child uses an abacus for calculations.',
  true, 'advanced', 3),

('Large Bead Frame', 'large-bead-frame', 'mathematics', 'abstraction', 6.0, 6.5, 6.0,
  ARRAY['Larger calculations', 'Extended place value'],
  ARRAY['Advanced algorithms', 'Million understanding'],
  ARRAY['Small frame mastery'],
  ARRAY['operations', 'large_numbers'],
  ARRAY['Large bead frame'],
  'Your child works with larger numbers on the bead frame.',
  false, 'mastery', 4);


-- ============================================
-- LANGUAGE - ORAL AND SOUND AWARENESS
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Classified Cards - Vocabulary', 'classified-cards-vocab', 'language', 'oral_language', 2.5, 6.0, 2.5,
  ARRAY['Vocabulary building', 'Object naming'],
  ARRAY['Language foundation', 'Classification'],
  ARRAY['Interest in names'],
  ARRAY['vocabulary', 'language'],
  ARRAY['Sets of classified pictures'],
  'Your child builds vocabulary through picture cards.',
  true, 'introductory', 1),

('Oral Language Games', 'oral-language-games', 'language', 'oral_language', 2.5, 6.0, 2.5,
  ARRAY['Conversation', 'Expression'],
  ARRAY['Communication skills', 'Confidence'],
  ARRAY['Speaking interest'],
  ARRAY['language', 'communication'],
  ARRAY['None'],
  'Your child develops speaking skills through games.',
  false, 'introductory', 2),

('Stories and Poems', 'stories-poems', 'language', 'oral_language', 2.5, 6.0, 2.5,
  ARRAY['Listening', 'Comprehension'],
  ARRAY['Narrative understanding', 'Attention'],
  ARRAY['Can sit for stories'],
  ARRAY['listening', 'comprehension'],
  ARRAY['Books', 'Poem cards'],
  'Your child develops listening and comprehension through stories.',
  true, 'introductory', 3),

('I Spy - Beginning Sounds', 'i-spy-beginning', 'language', 'phonemic_awareness', 3.0, 4.5, 3.0,
  ARRAY['Isolate beginning sounds', 'Phonemic awareness'],
  ARRAY['Reading preparation', 'Sound awareness'],
  ARRAY['Can say beginning sounds'],
  ARRAY['phonemic_awareness', 'listening'],
  ARRAY['Objects with distinct beginning sounds'],
  'Your child learns to hear the first sound in words.',
  true, 'developing', 4),

('I Spy - Ending Sounds', 'i-spy-ending', 'language', 'phonemic_awareness', 3.0, 4.5, 3.5,
  ARRAY['Isolate ending sounds', 'Complete word awareness'],
  ARRAY['Spelling preparation', 'Sound discrimination'],
  ARRAY['Beginning sounds solid'],
  ARRAY['phonemic_awareness', 'listening'],
  ARRAY['Objects'],
  'Your child learns to hear the last sound in words.',
  false, 'developing', 5),

('I Spy - Middle Sounds', 'i-spy-middle', 'language', 'phonemic_awareness', 3.5, 5.0, 4.0,
  ARRAY['Isolate middle sounds', 'Full phonemic analysis'],
  ARRAY['Complete decoding preparation', 'Vowel awareness'],
  ARRAY['Ending sounds success'],
  ARRAY['phonemic_awareness', 'vowels'],
  ARRAY['Objects'],
  'Your child learns to identify vowel sounds in words.',
  false, 'developing', 6),

('Rhyming Activities', 'rhyming', 'language', 'phonemic_awareness', 3.0, 5.0, 3.5,
  ARRAY['Recognize rhyming patterns', 'Sound patterns'],
  ARRAY['Phonological awareness', 'Reading preparation'],
  ARRAY['Sound isolation success'],
  ARRAY['phonemic_awareness', 'pattern'],
  ARRAY['Rhyming cards or objects'],
  'Your child discovers words that sound alike at the end.',
  false, 'developing', 7);

-- ============================================
-- LANGUAGE - WRITING PREPARATION (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Metal Insets', 'metal-insets', 'language', 'writing_preparation', 3.0, 6.0, 3.0,
  ARRAY['Hand control', 'Pencil grip'],
  ARRAY['Handwriting preparation', 'Design creativity'],
  ARRAY['Can hold pencil', 'Can trace'],
  ARRAY['fine_motor', 'hand_control'],
  ARRAY['Metal insets', 'Colored pencils', 'Paper'],
  'Your child develops hand control through tracing designs.',
  true, 'developing', 1),

('Sand Tray Writing', 'sand-tray-writing', 'language', 'writing_preparation', 3.5, 5.0, 4.0,
  ARRAY['Letter formation practice', 'Tactile writing'],
  ARRAY['Handwriting', 'Muscle memory'],
  ARRAY['Sandpaper letter knowledge'],
  ARRAY['letter_formation', 'tactile'],
  ARRAY['Sand tray'],
  'Your child practices forming letters in sand.',
  false, 'developing', 4),

('Chalkboard Writing', 'chalkboard-writing', 'language', 'writing_preparation', 3.5, 5.5, 4.0,
  ARRAY['Larger letter formation', 'Vertical surface'],
  ARRAY['Muscle memory', 'Letter size'],
  ARRAY['Sand tray success'],
  ARRAY['letter_formation', 'gross_motor'],
  ARRAY['Chalkboard', 'Chalk'],
  'Your child forms letters large on a chalkboard.',
  false, 'developing', 5),

('Paper Writing', 'paper-writing', 'language', 'writing_preparation', 4.0, 6.0, 4.5,
  ARRAY['Pencil and paper writing', 'Formal handwriting'],
  ARRAY['Writing fluency', 'Communication'],
  ARRAY['Chalkboard control'],
  ARRAY['handwriting', 'fine_motor'],
  ARRAY['Lined paper', 'Pencil'],
  'Your child writes letters on paper.',
  true, 'developing', 6);

-- ============================================
-- LANGUAGE - COMPOSITION (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Moveable Alphabet - Introduction', 'moveable-alphabet-intro', 'language', 'composition', 3.5, 5.0, 3.5,
  ARRAY['Letter recognition', 'Letter handling'],
  ARRAY['Word building preparation', 'Sound-symbol'],
  ARRAY['Knows several sandpaper letters'],
  ARRAY['letter_recognition', 'fine_motor'],
  ARRAY['Moveable alphabet'],
  'Your child handles loose letters, preparing for word building.',
  false, 'introductory', 1),

('Moveable Alphabet - CVC Words', 'moveable-alphabet-cvc', 'language', 'composition', 3.5, 5.0, 4.0,
  ARRAY['Build simple words', 'Encoding'],
  ARRAY['Spelling', 'Reading preparation'],
  ARRAY['Can segment sounds'],
  ARRAY['encoding', 'spelling'],
  ARRAY['Moveable alphabet'],
  'Your child builds simple three-letter words.',
  true, 'developing', 2),

('Moveable Alphabet - Objects', 'moveable-alphabet-objects', 'language', 'composition', 4.0, 5.5, 4.5,
  ARRAY['Build words from objects', 'Spelling'],
  ARRAY['Extended encoding', 'Object-word connection'],
  ARRAY['CVC word success'],
  ARRAY['encoding', 'spelling'],
  ARRAY['Moveable alphabet', 'Small objects'],
  'Your child labels objects by building their names.',
  false, 'developing', 3),

('Moveable Alphabet - Pictures', 'moveable-alphabet-pictures', 'language', 'composition', 4.0, 5.5, 4.5,
  ARRAY['Build words from pictures', 'Extended encoding'],
  ARRAY['Spelling patterns', 'Visual encoding'],
  ARRAY['Object work success'],
  ARRAY['encoding', 'spelling'],
  ARRAY['Moveable alphabet', 'Picture cards'],
  'Your child builds words from picture prompts.',
  false, 'developing', 4),

('Moveable Alphabet - Free Writing', 'moveable-alphabet-free', 'language', 'composition', 4.0, 6.0, 4.5,
  ARRAY['Express own ideas', 'Creative composition'],
  ARRAY['Writing confidence', 'Communication'],
  ARRAY['Picture work mastery'],
  ARRAY['composition', 'creativity'],
  ARRAY['Moveable alphabet'],
  'Your child writes their own thoughts and stories.',
  true, 'advanced', 6);

-- ============================================
-- LANGUAGE - READING (Additional)
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Pink Series - Picture Word Match', 'pink-series-pictures', 'language', 'reading', 4.0, 5.0, 4.5,
  ARRAY['Read without objects', 'Visual decoding'],
  ARRAY['Reading independence', 'Comprehension'],
  ARRAY['Object match success'],
  ARRAY['decoding', 'reading'],
  ARRAY['Pink series picture cards', 'Word cards'],
  'Your child reads words and matches them to pictures.',
  false, 'developing', 2),

('Pink Series - Lists', 'pink-series-lists', 'language', 'reading', 4.0, 5.0, 4.5,
  ARRAY['Read word lists', 'Fluency building'],
  ARRAY['Reading speed', 'Confidence'],
  ARRAY['Picture match solid'],
  ARRAY['reading', 'fluency'],
  ARRAY['Pink series word lists'],
  'Your child reads lists of simple words.',
  false, 'developing', 3),

('Pink Series - Phrases', 'pink-series-phrases', 'language', 'reading', 4.0, 5.0, 4.5,
  ARRAY['Read simple phrases', 'Comprehension'],
  ARRAY['Sentence preparation', 'Meaning'],
  ARRAY['List reading success'],
  ARRAY['reading', 'comprehension'],
  ARRAY['Pink series phrase cards'],
  'Your child reads short phrases.',
  false, 'developing', 4),

('Pink Series - Sentences', 'pink-series-sentences', 'language', 'reading', 4.5, 5.5, 5.0,
  ARRAY['Read full sentences', 'Complete thoughts'],
  ARRAY['Reading comprehension', 'Book preparation'],
  ARRAY['Phrase reading solid'],
  ARRAY['reading', 'comprehension'],
  ARRAY['Pink series sentence cards'],
  'Your child reads complete sentences.',
  false, 'developing', 5),

('Pink Series - Books', 'pink-series-books', 'language', 'reading', 4.5, 5.5, 5.0,
  ARRAY['Read simple books', 'Reading enjoyment'],
  ARRAY['Love of reading', 'Independence'],
  ARRAY['Sentence success'],
  ARRAY['reading', 'comprehension'],
  ARRAY['Pink series readers'],
  'Your child reads their first simple books.',
  true, 'developing', 6),

('Blue Series - Digraphs', 'blue-series-digraphs', 'language', 'reading', 5.0, 6.0, 5.0,
  ARRAY['Decode digraphs', 'sh, ch, th sounds'],
  ARRAY['Phonics patterns', 'Reading expansion'],
  ARRAY['Blend success'],
  ARRAY['phonics', 'decoding'],
  ARRAY['Blue series digraph materials'],
  'Your child reads words with sh, ch, th, and other digraphs.',
  false, 'developing', 9),

('Blue Series - Books', 'blue-series-books', 'language', 'reading', 5.0, 6.0, 5.5,
  ARRAY['Read blend/digraph books', 'Fluency'],
  ARRAY['Reading confidence', 'Comprehension'],
  ARRAY['Digraph success'],
  ARRAY['reading', 'fluency'],
  ARRAY['Blue series readers'],
  'Your child reads books with blends and digraphs.',
  true, 'advanced', 10),

('Green Series - Long Vowels', 'green-series-long-vowels', 'language', 'reading', 5.0, 6.0, 5.5,
  ARRAY['Long vowel patterns', 'Silent e'],
  ARRAY['Advanced phonics', 'Spelling patterns'],
  ARRAY['Blue mastery'],
  ARRAY['phonics', 'decoding'],
  ARRAY['Green series long vowel materials'],
  'Your child learns long vowel patterns like silent e.',
  true, 'advanced', 11),

('Green Series - Books', 'green-series-books', 'language', 'reading', 5.5, 6.0, 6.0,
  ARRAY['Read complex books', 'Reading fluency'],
  ARRAY['Independent reading', 'Comprehension'],
  ARRAY['Phonogram success'],
  ARRAY['reading', 'fluency'],
  ARRAY['Green series readers'],
  'Your child reads books with complex phonics patterns.',
  true, 'mastery', 12);


-- ============================================
-- LANGUAGE - GRAMMAR
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Noun Introduction', 'noun-intro', 'language', 'grammar', 4.5, 6.0, 5.0,
  ARRAY['Identify naming words', 'Parts of speech'],
  ARRAY['Grammar foundation', 'Word classification'],
  ARRAY['Can read simple words'],
  ARRAY['grammar', 'classification'],
  ARRAY['Noun symbols', 'Objects or cards'],
  'Your child learns that nouns are naming words.',
  true, 'developing', 1),

('Article Introduction', 'article-intro', 'language', 'grammar', 5.0, 6.0, 5.5,
  ARRAY['Articles a, an, the', 'Grammar awareness'],
  ARRAY['Sentence structure', 'Reading fluency'],
  ARRAY['Noun understanding'],
  ARRAY['grammar', 'articles'],
  ARRAY['Article symbols', 'Word cards'],
  'Your child learns the small words that go with nouns.',
  false, 'developing', 2),

('Adjective Introduction', 'adjective-intro', 'language', 'grammar', 5.0, 6.0, 5.5,
  ARRAY['Describing words', 'Adjective function'],
  ARRAY['Descriptive language', 'Writing enrichment'],
  ARRAY['Article success'],
  ARRAY['grammar', 'descriptive'],
  ARRAY['Adjective symbols', 'Word cards'],
  'Your child learns that adjectives describe nouns.',
  false, 'developing', 3),

('Verb Introduction', 'verb-intro', 'language', 'grammar', 5.0, 6.0, 5.5,
  ARRAY['Action words', 'Verb function'],
  ARRAY['Sentence structure', 'Complete sentences'],
  ARRAY['Nouns understood'],
  ARRAY['grammar', 'verbs'],
  ARRAY['Verb symbols', 'Action cards'],
  'Your child learns that verbs show action.',
  true, 'developing', 4),

('Grammar Boxes', 'grammar-boxes', 'language', 'grammar', 5.5, 6.0, 6.0,
  ARRAY['Sentence analysis', 'Part identification'],
  ARRAY['Complex grammar', 'Reading comprehension'],
  ARRAY['All basic parts known'],
  ARRAY['grammar', 'analysis'],
  ARRAY['Grammar boxes', 'Sentence cards'],
  'Your child analyzes sentences by parts of speech.',
  false, 'advanced', 5),

('Sentence Analysis', 'sentence-analysis', 'language', 'grammar', 5.5, 6.0, 6.0,
  ARRAY['Subject and predicate', 'Sentence structure'],
  ARRAY['Writing structure', 'Complex grammar'],
  ARRAY['Grammar box success'],
  ARRAY['grammar', 'structure'],
  ARRAY['Sentence analysis materials'],
  'Your child identifies subject and predicate in sentences.',
  false, 'mastery', 6);

-- ============================================
-- CULTURAL - GEOGRAPHY
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Sandpaper Globe', 'sandpaper-globe', 'cultural', 'geography', 3.0, 5.0, 3.0,
  ARRAY['Land/water distinction', 'Earth concept'],
  ARRAY['Geography foundation', 'Tactile learning'],
  ARRAY['Can feel textures', 'Basic sensorial'],
  ARRAY['tactile', 'geography'],
  ARRAY['Sandpaper globe'],
  'Your child feels the difference between land and water on Earth.',
  true, 'introductory', 1),

('Colored Globe', 'colored-globe', 'cultural', 'geography', 3.0, 5.0, 3.5,
  ARRAY['Continent recognition', 'World awareness'],
  ARRAY['Map preparation', 'Color coding'],
  ARRAY['Sandpaper globe familiarity'],
  ARRAY['geography', 'color_coding'],
  ARRAY['Colored globe'],
  'Your child sees the continents in different colors.',
  false, 'introductory', 2),

('World Puzzle Map', 'world-puzzle-map', 'cultural', 'geography', 3.0, 5.5, 3.5,
  ARRAY['Continent shapes and names', 'World geography'],
  ARRAY['Geography vocabulary', 'Fine motor'],
  ARRAY['Globe familiarity'],
  ARRAY['geography', 'vocabulary'],
  ARRAY['World puzzle map'],
  'Your child learns continent names and shapes.',
  true, 'developing', 3),

('Continent Puzzle Maps', 'continent-maps', 'cultural', 'geography', 3.5, 6.0, 4.0,
  ARRAY['Country locations', 'Detailed geography'],
  ARRAY['Political geography', 'Map reading'],
  ARRAY['World map mastery'],
  ARRAY['geography', 'vocabulary'],
  ARRAY['Individual continent puzzle maps'],
  'Your child learns countries within each continent.',
  false, 'developing', 4),

('Land and Water Forms', 'land-water-forms', 'cultural', 'geography', 3.0, 5.5, 3.5,
  ARRAY['Physical formations', 'Vocabulary'],
  ARRAY['Landform understanding', 'Opposites'],
  ARRAY['Basic geography started'],
  ARRAY['geography', 'vocabulary'],
  ARRAY['Land/water form trays or cards'],
  'Your child learns about islands, lakes, peninsulas, and bays.',
  true, 'developing', 5),

('Flags', 'flags', 'cultural', 'geography', 3.5, 6.0, 4.0,
  ARRAY['Country identification', 'Flag recognition'],
  ARRAY['Cultural awareness', 'Memory'],
  ARRAY['Map familiarity'],
  ARRAY['geography', 'cultural'],
  ARRAY['Flag stand', 'Flags'],
  'Your child learns flags of different countries.',
  false, 'developing', 6),

('Continent Boxes', 'continent-boxes', 'cultural', 'geography', 4.0, 6.0, 4.5,
  ARRAY['Cultural artifacts', 'Continental cultures'],
  ARRAY['Cultural appreciation', 'Diversity'],
  ARRAY['Continent familiarity'],
  ARRAY['cultural', 'diversity'],
  ARRAY['Continent boxes with artifacts'],
  'Your child explores objects and images from each continent.',
  false, 'advanced', 7);

-- ============================================
-- CULTURAL - BOTANY
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Living and Non-Living', 'living-nonliving', 'cultural', 'botany', 3.0, 5.0, 3.0,
  ARRAY['Classification skill', 'Life concept'],
  ARRAY['Scientific thinking', 'Observation'],
  ARRAY['Can sort by attribute'],
  ARRAY['classification', 'science'],
  ARRAY['Pictures or objects'],
  'Your child sorts things into living and non-living.',
  true, 'introductory', 1),

('Plant and Animal Sorting', 'plant-animal', 'cultural', 'botany', 3.0, 5.0, 3.5,
  ARRAY['Kingdom classification', 'Biology foundation'],
  ARRAY['Scientific classification', 'Vocabulary'],
  ARRAY['Living/non-living success'],
  ARRAY['classification', 'biology'],
  ARRAY['Pictures of plants and animals'],
  'Your child distinguishes plants from animals.',
  false, 'developing', 2),

('Parts of a Plant', 'parts-of-plant', 'cultural', 'botany', 3.5, 6.0, 4.0,
  ARRAY['Plant anatomy', 'Vocabulary'],
  ARRAY['Science foundation', 'Observation'],
  ARRAY['Basic plant awareness'],
  ARRAY['botany', 'vocabulary'],
  ARRAY['Plant puzzle or cards'],
  'Your child learns the parts of a plant.',
  true, 'developing', 3),

('Leaf Puzzle', 'leaf-puzzle', 'cultural', 'botany', 3.0, 5.5, 3.5,
  ARRAY['Leaf parts', 'Botany vocabulary'],
  ARRAY['Detailed observation', 'Nature awareness'],
  ARRAY['Can work puzzles'],
  ARRAY['botany', 'vocabulary'],
  ARRAY['Leaf puzzle'],
  'Your child learns the parts of a leaf.',
  false, 'developing', 4),

('Flower Puzzle', 'flower-puzzle', 'cultural', 'botany', 3.5, 5.5, 4.0,
  ARRAY['Flower parts', 'Botany vocabulary'],
  ARRAY['Life cycle preparation', 'Detail'],
  ARRAY['Leaf puzzle success'],
  ARRAY['botany', 'vocabulary'],
  ARRAY['Flower puzzle'],
  'Your child learns the parts of a flower.',
  false, 'developing', 5),

('Tree Puzzle', 'tree-puzzle', 'cultural', 'botany', 3.5, 5.5, 4.0,
  ARRAY['Tree parts', 'Botany vocabulary'],
  ARRAY['Ecosystem understanding', 'Size perspective'],
  ARRAY['Flower puzzle success'],
  ARRAY['botany', 'vocabulary'],
  ARRAY['Tree puzzle'],
  'Your child learns the parts of a tree.',
  false, 'developing', 6),

('Leaf Shapes', 'leaf-shapes', 'cultural', 'botany', 4.0, 6.0, 4.5,
  ARRAY['Leaf classification', 'Shape identification'],
  ARRAY['Observation skills', 'Nature awareness'],
  ARRAY['Basic leaf knowledge'],
  ARRAY['classification', 'observation'],
  ARRAY['Leaf shape cards'],
  'Your child learns to classify leaves by shape.',
  false, 'advanced', 7),

('Planting Activities', 'planting', 'cultural', 'botany', 3.0, 6.0, 3.5,
  ARRAY['Life cycle observation', 'Planting skill'],
  ARRAY['Patience', 'Responsibility'],
  ARRAY['Care for plants interest'],
  ARRAY['science', 'responsibility'],
  ARRAY['Seeds', 'Soil', 'Pots'],
  'Your child plants seeds and observes growth.',
  true, 'developing', 8);

-- ============================================
-- CULTURAL - ZOOLOGY
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Vertebrate and Invertebrate', 'vertebrate-invertebrate', 'cultural', 'zoology', 3.5, 6.0, 4.0,
  ARRAY['Animal classification', 'Backbone concept'],
  ARRAY['Scientific classification', 'Vocabulary'],
  ARRAY['Living sort success'],
  ARRAY['classification', 'zoology'],
  ARRAY['Pictures or figures'],
  'Your child sorts animals by whether they have backbones.',
  true, 'developing', 1),

('Five Vertebrate Classes', 'five-classes', 'cultural', 'zoology', 4.0, 6.0, 4.5,
  ARRAY['Fish, amphibian, reptile, bird, mammal', 'Classification'],
  ARRAY['Animal diversity', 'Scientific naming'],
  ARRAY['Basic animal knowledge'],
  ARRAY['classification', 'zoology'],
  ARRAY['Class sorting cards or figures'],
  'Your child learns the five types of vertebrates.',
  true, 'developing', 2),

('Fish Puzzle', 'fish-puzzle', 'cultural', 'zoology', 3.5, 5.5, 4.0,
  ARRAY['Fish anatomy', 'Zoology vocabulary'],
  ARRAY['Observation', 'Detail orientation'],
  ARRAY['Can work puzzles'],
  ARRAY['zoology', 'vocabulary'],
  ARRAY['Fish puzzle'],
  'Your child learns the parts of a fish.',
  false, 'developing', 3),

('Frog Puzzle', 'frog-puzzle', 'cultural', 'zoology', 3.5, 5.5, 4.0,
  ARRAY['Amphibian anatomy', 'Zoology vocabulary'],
  ARRAY['Life cycle connection', 'Comparison'],
  ARRAY['Fish puzzle success'],
  ARRAY['zoology', 'vocabulary'],
  ARRAY['Frog puzzle'],
  'Your child learns the parts of a frog.',
  false, 'developing', 4),

('Turtle Puzzle', 'turtle-puzzle', 'cultural', 'zoology', 4.0, 6.0, 4.5,
  ARRAY['Reptile anatomy', 'Zoology vocabulary'],
  ARRAY['Class comparison', 'Detail'],
  ARRAY['Frog puzzle success'],
  ARRAY['zoology', 'vocabulary'],
  ARRAY['Turtle puzzle'],
  'Your child learns the parts of a turtle.',
  false, 'developing', 5),

('Bird Puzzle', 'bird-puzzle', 'cultural', 'zoology', 4.0, 6.0, 4.5,
  ARRAY['Bird anatomy', 'Zoology vocabulary'],
  ARRAY['Flight understanding', 'Adaptation'],
  ARRAY['Previous puzzles'],
  ARRAY['zoology', 'vocabulary'],
  ARRAY['Bird puzzle'],
  'Your child learns the parts of a bird.',
  false, 'developing', 6),

('Horse Puzzle', 'horse-puzzle', 'cultural', 'zoology', 4.0, 6.0, 4.5,
  ARRAY['Mammal anatomy', 'Zoology vocabulary'],
  ARRAY['Human comparison', 'Mammal features'],
  ARRAY['Bird puzzle success'],
  ARRAY['zoology', 'vocabulary'],
  ARRAY['Horse puzzle'],
  'Your child learns the parts of a horse.',
  false, 'developing', 7),

('Life Cycle Studies', 'life-cycles', 'cultural', 'zoology', 4.5, 6.0, 5.0,
  ARRAY['Development stages', 'Change over time'],
  ARRAY['Time concepts', 'Metamorphosis'],
  ARRAY['Animal familiarity'],
  ARRAY['science', 'sequence'],
  ARRAY['Life cycle materials'],
  'Your child explores how animals change as they grow.',
  true, 'advanced', 8);

-- ============================================
-- CULTURAL - PHYSICAL SCIENCE
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Sink and Float', 'sink-float', 'cultural', 'physical_science', 3.0, 5.0, 3.5,
  ARRAY['Buoyancy concept', 'Prediction'],
  ARRAY['Scientific prediction', 'Density awareness'],
  ARRAY['Familiar with water work'],
  ARRAY['science', 'prediction'],
  ARRAY['Water basin', 'Various objects'],
  'Your child predicts and tests which objects sink or float.',
  true, 'developing', 1),

('Magnetic and Non-Magnetic', 'magnetic', 'cultural', 'physical_science', 3.0, 5.5, 3.5,
  ARRAY['Magnetism concept', 'Classification'],
  ARRAY['Scientific classification', 'Force awareness'],
  ARRAY['Can sort by attribute'],
  ARRAY['science', 'classification'],
  ARRAY['Magnets', 'Various objects'],
  'Your child discovers which materials are attracted to magnets.',
  true, 'developing', 2),

('Color Mixing', 'color-mixing', 'cultural', 'physical_science', 3.0, 5.5, 3.5,
  ARRAY['Color combination', 'Primary/secondary colors'],
  ARRAY['Science concepts', 'Creativity'],
  ARRAY['Color tablet familiarity'],
  ARRAY['science', 'creativity'],
  ARRAY['Paint or colored water', 'Containers'],
  'Your child discovers how colors combine to make new colors.',
  false, 'developing', 3);

-- ============================================
-- CULTURAL - HISTORY/TIME
-- ============================================
INSERT INTO montessori_works (name, slug, curriculum_area, sub_area, age_min, age_max, age_typical, direct_aims, indirect_aims, readiness_indicators, primary_skills, materials_needed, parent_explanation_simple, is_gateway, difficulty_level, sequence_order) VALUES

('Birthday Celebration', 'birthday-celebration', 'cultural', 'history', 3.0, 6.0, 3.0,
  ARRAY['Personal time passage', 'Year concept'],
  ARRAY['Earth rotation', 'Growth awareness'],
  ARRAY['Understands birthdays'],
  ARRAY['time', 'self_awareness'],
  ARRAY['Sun symbol', 'Globe', 'Candle'],
  'Your child celebrates their birthday by walking around the sun.',
  true, 'introductory', 1),

('Days of the Week', 'days-of-week', 'cultural', 'history', 4.0, 6.0, 4.5,
  ARRAY['Day sequence', 'Weekly pattern'],
  ARRAY['Calendar understanding', 'Routine'],
  ARRAY['Routine awareness'],
  ARRAY['time', 'sequence'],
  ARRAY['Days of week materials'],
  'Your child learns the seven days in order.',
  true, 'developing', 2),

('Months of the Year', 'months-of-year', 'cultural', 'history', 4.5, 6.0, 5.0,
  ARRAY['Month sequence', 'Yearly pattern'],
  ARRAY['Calendar mastery', 'Seasons'],
  ARRAY['Day sequence solid'],
  ARRAY['time', 'sequence'],
  ARRAY['Month materials'],
  'Your child learns the twelve months in order.',
  false, 'developing', 3),

('Personal Timeline', 'personal-timeline', 'cultural', 'history', 4.0, 6.0, 4.5,
  ARRAY['Personal history', 'Sequence'],
  ARRAY['Memory', 'Time concepts'],
  ARRAY['Can recall past events'],
  ARRAY['time', 'memory'],
  ARRAY['Photos', 'Timeline strip'],
  'Your child creates a timeline of their own life.',
  true, 'developing', 4),

('Calendar Work', 'calendar-work', 'cultural', 'history', 4.5, 6.0, 5.0,
  ARRAY['Date tracking', 'Calendar use'],
  ARRAY['Time management', 'Planning'],
  ARRAY['Days and months known'],
  ARRAY['time', 'organization'],
  ARRAY['Calendar', 'Date markers'],
  'Your child learns to use a calendar.',
  false, 'developing', 5);


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- After running this migration, verify with:
-- SELECT curriculum_area, COUNT(*) FROM montessori_works GROUP BY curriculum_area ORDER BY curriculum_area;

-- Expected counts (approximate):
-- practical_life: ~60 works
-- sensorial: ~40 works  
-- mathematics: ~50 works
-- language: ~45 works
-- cultural: ~35 works
-- TOTAL: ~230+ works

-- Test recommendation function:
-- SELECT * FROM get_recommended_works(3.5, '{}', 10);
-- SELECT * FROM get_recommended_works(4.5, '{}', 10);
-- SELECT * FROM get_recommended_works(5.5, '{}', 10);
