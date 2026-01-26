-- Add Missing Works for Week 17
-- Run in Supabase SQL Editor FIRST, then run WEEK_17_ASSIGNMENTS.sql

-- =============================================
-- PRACTICAL LIFE
-- =============================================

INSERT INTO montessori_works (
  name, slug, curriculum_area, sub_area,
  age_min, age_max, age_typical,
  direct_aims, indirect_aims,
  materials_needed,
  parent_explanation_simple,
  parent_explanation_detailed,
  difficulty_level, sequence_order
) VALUES 
(
  'Cutting Paper',
  'cutting_paper',
  'practical_life',
  'fine_motor',
  2.5, 5.0, 3.0,
  ARRAY['Develop scissor control', 'Hand-eye coordination'],
  ARRAY['Preparation for writing', 'Concentration', 'Fine motor development'],
  ARRAY['Child-safe scissors', 'Paper strips', 'Cutting tray'],
  'Your child is learning to use scissors safely, developing the hand strength and control needed for writing.',
  'Cutting paper exercises progress from simple snips to cutting along lines and curves. This work develops the small muscles in the hand while teaching proper tool use and safety awareness.',
  'introductory',
  15
),
(
  'Braiding',
  'braiding',
  'practical_life',
  'fine_motor',
  3.5, 6.0, 4.5,
  ARRAY['Learn braiding technique', 'Bilateral coordination'],
  ARRAY['Concentration', 'Independence', 'Pattern recognition'],
  ARRAY['Braiding frame or ribbons', 'Work mat'],
  'Your child is learning to braid, which develops coordination and the ability to follow complex patterns.',
  'Braiding requires coordinating both hands in a specific sequence, developing motor planning and patience. This skill transfers to self-care tasks like braiding hair.',
  'developing',
  25
);

-- =============================================
-- SENSORIAL
-- =============================================

INSERT INTO montessori_works (
  name, slug, curriculum_area, sub_area,
  age_min, age_max, age_typical,
  direct_aims, indirect_aims,
  materials_needed,
  parent_explanation_simple,
  parent_explanation_detailed,
  difficulty_level, sequence_order
) VALUES 
(
  'Decanomial Square',
  'decanomial_square',
  'sensorial',
  'visual',
  4.5, 6.0, 5.0,
  ARRAY['Explore squared numbers visually', 'Pattern recognition'],
  ARRAY['Preparation for multiplication', 'Mathematical mind', 'Aesthetic appreciation'],
  ARRAY['Decanomial bead box', 'Layout mat'],
  'Your child explores mathematical patterns by building a beautiful square arrangement that reveals how numbers relate to each other.',
  'The Decanomial Square is a stunning visual representation of the multiplication table. Children arrange colored bead bars to create a pattern that shows squared numbers and introduces algebraic concepts through sensorial exploration.',
  'advanced',
  45
);

-- =============================================
-- MATHEMATICS
-- =============================================

INSERT INTO montessori_works (
  name, slug, curriculum_area, sub_area,
  age_min, age_max, age_typical,
  direct_aims, indirect_aims,
  materials_needed,
  parent_explanation_simple,
  parent_explanation_detailed,
  difficulty_level, sequence_order
) VALUES 
(
  'Linear Counting',
  'linear_counting',
  'mathematics',
  'counting',
  3.0, 5.0, 3.5,
  ARRAY['Count in sequence', 'One-to-one correspondence'],
  ARRAY['Number sense', 'Concentration', 'Order'],
  ARRAY['Counting materials', 'Number line or beads'],
  'Your child is practicing counting in order, building the foundation for all math skills.',
  'Linear counting helps children internalize the number sequence through repetition and movement. Counting along a line or with beads reinforces that each number represents one more than the previous.',
  'introductory',
  5
),
(
  'Addition Snake Game',
  'addition_snake_game',
  'mathematics',
  'operations',
  4.5, 6.0, 5.0,
  ARRAY['Practice addition', 'Understand making tens'],
  ARRAY['Mental math', 'Number bonds', 'Problem solving'],
  ARRAY['Colored bead bars', 'Black and white checker board', 'Golden bead bars'],
  'Your child practices addition by building colorful "snakes" and exchanging them for golden tens.',
  'The Addition Snake Game makes abstract addition concrete and visual. Children lay out colored bead bars, then exchange groups of ten for golden bars, physically experiencing regrouping while building addition fluency.',
  'developing',
  35
);

-- =============================================
-- CULTURAL
-- =============================================

INSERT INTO montessori_works (
  name, slug, curriculum_area, sub_area,
  age_min, age_max, age_typical,
  direct_aims, indirect_aims,
  materials_needed,
  parent_explanation_simple,
  parent_explanation_detailed,
  difficulty_level, sequence_order
) VALUES 
(
  'Butterfly Puzzle',
  'butterfly_puzzle',
  'cultural',
  'zoology',
  3.0, 5.0, 3.5,
  ARRAY['Learn butterfly anatomy', 'Visual discrimination'],
  ARRAY['Fine motor control', 'Vocabulary', 'Nature appreciation'],
  ARRAY['Butterfly puzzle with labeled parts'],
  'Your child learns the parts of a butterfly while developing fine motor skills with the puzzle pieces.',
  'The butterfly puzzle introduces children to insect anatomy through hands-on exploration. Each piece represents a body part, building vocabulary and understanding of how living things are structured.',
  'introductory',
  20
),
(
  'Parts of a Tree',
  'parts_of_tree',
  'cultural',
  'botany',
  3.5, 6.0, 4.0,
  ARRAY['Learn tree anatomy', 'Understand plant structure'],
  ARRAY['Vocabulary development', 'Classification', 'Environmental awareness'],
  ARRAY['Tree puzzle or nomenclature cards', 'Real tree samples if possible'],
  'Your child is learning the different parts of a tree and how each part helps the tree live and grow.',
  'Parts of a Tree introduces botanical concepts through concrete materials. Children learn terms like trunk, branches, roots, and leaves while understanding how trees get water and nutrients.',
  'introductory',
  15
);

-- =============================================
-- VERIFICATION
-- =============================================
SELECT name, curriculum_area FROM montessori_works 
WHERE slug IN ('cutting_paper', 'braiding', 'decanomial_square', 'linear_counting', 'addition_snake_game', 'butterfly_puzzle', 'parts_of_tree')
ORDER BY curriculum_area, name;
