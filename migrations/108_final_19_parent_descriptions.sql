-- Final 19 parent descriptions - exact name matches
BEGIN;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to serve themselves food independently. This practical skill develops independence, portion awareness, and table manners.',
  why_it_matters = 'Self-serving builds independence and teaches children to assess their own needs. It develops fine motor control and social awareness around shared meals.'
WHERE name = 'Serving Self';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to set a table properly - placing plates, utensils, napkins, and glasses in their correct positions. This practical skill develops sequence, spatial awareness, and care for the environment.',
  why_it_matters = 'Table setting teaches order, sequence, and attention to detail. Children learn to prepare spaces for others and take pride in creating a welcoming environment.'
WHERE name = 'Setting Table';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is participating in the Silence Game, sitting quietly and developing inner calm and self-control. This powerful activity helps children discover the peace of stillness.',
  why_it_matters = 'The Silence Game develops self-regulation, concentration, and inner awareness. Children learn they can control their bodies and find calm within themselves - a skill that serves them throughout life.'
WHERE name = 'Silence Game';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is preparing simple snacks independently - spreading, cutting soft foods, or assembling ingredients. This practical cooking skill builds independence and healthy eating habits.',
  why_it_matters = 'Snack preparation develops independence, fine motor skills, and healthy relationships with food. Children feel capable when they can feed themselves.'
WHERE name = 'Simple Snack Preparation';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to sit down and stand up from a chair gracefully and quietly. This fundamental skill develops body awareness and classroom courtesy.',
  why_it_matters = 'Proper sitting and standing teaches body control and awareness of shared spaces. Children learn to move without disturbing others.'
WHERE name = 'Sitting and Standing from Chair';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to squeeze fresh juice from oranges or lemons. This satisfying practical life activity develops hand strength while producing something delicious.',
  why_it_matters = 'Juice squeezing develops hand strength needed for writing while teaching cause and effect. Children experience the satisfaction of creating something real and enjoyable.'
WHERE name = 'Squeezing Juice';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is listening to and engaging with stories and poems, developing vocabulary, comprehension, and love of literature.',
  why_it_matters = 'Stories and poems build vocabulary, listening skills, and imagination. They introduce children to the joy of literature and develop comprehension skills essential for reading.'
WHERE name = 'Stories and Poems';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is associating quantities with symbols using the Ten Boards, connecting bead quantities with number cards for numbers 11-99.',
  why_it_matters = 'Association work connects concrete quantities with abstract symbols, reinforcing that numerals represent real amounts.'
WHERE name = 'Ten Boards - Association';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is building quantities for teen and ten numbers using golden beads and the Ten Boards, seeing how these numbers are composed.',
  why_it_matters = 'Working with quantities makes abstract numbers concrete. Children understand that 45 means 4 tens and 5 units through hands-on experience.'
WHERE name = 'Ten Boards - Quantity';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning the symbols for teen and ten numbers using the Ten Boards, reading and recognizing numerals 11-99.',
  why_it_matters = 'Symbol recognition prepares children for reading and writing numbers. The Ten Boards show how our number system builds logically.'
WHERE name = 'Ten Boards - Symbols';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning proper tooth brushing technique, developing an essential hygiene habit for lifelong health.',
  why_it_matters = 'Tooth brushing develops self-care independence and establishes healthy habits. Children learn to take responsibility for their own health.'
WHERE name = 'Tooth Brushing';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a puzzle showing the parts of a tree - roots, trunk, branches, and leaves. This develops fine motor skills while teaching botanical vocabulary.',
  why_it_matters = 'Tree puzzle work teaches children that trees have specific parts with specific functions, building scientific vocabulary and understanding of plant structures.'
WHERE name = 'Tree Puzzle';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with a puzzle showing the parts of a turtle. This develops fine motor skills while teaching vocabulary about reptile anatomy.',
  why_it_matters = 'Turtle puzzle work introduces reptile anatomy and builds scientific vocabulary while developing fine motor control and concentration.'
WHERE name = 'Turtle Puzzle';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to unroll a work mat to create their workspace and roll it up when finished. This fundamental skill teaches preparation, care, and respect for materials.',
  why_it_matters = 'Mat work teaches children to prepare their own workspace and clean up after themselves. It develops motor control and establishes the routine of caring for materials.'
WHERE name = 'Unrolling and Rolling a Mat';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use a dustpan with a brush, collecting swept debris and disposing of it properly. This practical skill completes the sweeping cycle.',
  why_it_matters = 'Using a dustpan teaches children to complete tasks fully. It develops coordination and shows that cleaning involves multiple steps working together.'
WHERE name = 'Using Dustpan';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to classify animals as vertebrates (with backbones) or invertebrates (without backbones). This fundamental distinction organizes the animal kingdom.',
  why_it_matters = 'Understanding the vertebrate/invertebrate distinction helps children organize knowledge about animals. It introduces biological classification in an accessible way.'
WHERE name = 'Vertebrate and Invertebrate';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to walk around another child''s work mat rather than stepping over or on it. This grace and courtesy lesson teaches respect for others'' workspaces.',
  why_it_matters = 'Walking around work teaches spatial awareness and respect for others. Children learn that everyone''s work deserves protection and consideration.'
WHERE name = 'Walking Around Work';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to whisk and mix ingredients, developing wrist control and coordination while preparing foods like eggs or batter.',
  why_it_matters = 'Whisking develops wrist flexibility and hand strength needed for writing. Children learn that their efforts transform ingredients into something new.'
WHERE name = 'Whisking and Mixing';

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the World Puzzle Map, learning the shapes and locations of all seven continents and the major oceans.',
  why_it_matters = 'The World Map builds global awareness and geographic knowledge. Children develop a mental map of Earth that supports all future geography learning.'
WHERE name = 'World Puzzle Map';

COMMIT;

-- Final verification
SELECT COUNT(*) as total,
       COUNT(parent_description) as with_parent,
       COUNT(why_it_matters) as with_why
FROM montree_classroom_curriculum_works;
