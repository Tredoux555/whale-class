-- Find and fix final 31 missing parent descriptions
-- Run this query first to see what's missing:
-- SELECT DISTINCT name FROM montree_classroom_curriculum_works WHERE parent_description IS NULL ORDER BY name;

BEGIN;

-- Common variations that might be in database with different names
-- Using ILIKE for flexible matching

-- Sensorial works
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the first block of Knobbed Cylinders, learning to match cylinders to their correct holes based on size differences.',
  why_it_matters = 'Knobbed Cylinders develop visual discrimination, fine motor control, and concentration while preparing the hand for writing.'
WHERE name ILIKE '%Knobbed Cylinder%Block 1%' OR name ILIKE '%Knobbed Cylinder%1%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring the Pink Tower, building a tower from largest to smallest cube. This iconic material develops visual discrimination of size.',
  why_it_matters = 'The Pink Tower develops visual discrimination, coordination, and concentration while introducing concepts of dimension and sequence.'
WHERE name ILIKE '%Pink Tower%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Brown Stair (Broad Stair), arranging prisms from thickest to thinnest.',
  why_it_matters = 'The Brown Stair develops visual discrimination of width while building vocabulary and preparing for geometry.'
WHERE (name ILIKE '%Brown Stair%' OR name ILIKE '%Broad Stair%') AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is arranging the Red Rods from longest to shortest, developing visual discrimination of length.',
  why_it_matters = 'Red Rods develop visual discrimination of length and prepare for the Number Rods used in mathematics.'
WHERE name ILIKE '%Red Rod%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is matching Color Tablets, developing visual discrimination of color.',
  why_it_matters = 'Color matching develops visual discrimination and builds color vocabulary.'
WHERE name ILIKE '%Color Tablet%Box 1%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring the Binomial Cube, a three-dimensional puzzle representing (a+b)³.',
  why_it_matters = 'The Binomial Cube develops spatial reasoning and indirectly prepares for algebra.'
WHERE name ILIKE '%Binomial%Cube%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring the Trinomial Cube, a complex three-dimensional puzzle representing (a+b+c)³.',
  why_it_matters = 'The Trinomial Cube develops advanced spatial reasoning and provides sensorial preparation for algebraic concepts.'
WHERE name ILIKE '%Trinomial%Cube%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring Constructive Triangles, discovering how triangles combine to form other shapes.',
  why_it_matters = 'Constructive Triangles develop geometric understanding and show that triangles are the building blocks of all polygons.'
WHERE name ILIKE '%Constructive Triangle%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Sound Cylinders, matching pairs that make the same sound when shaken.',
  why_it_matters = 'Sound Cylinders develop auditory discrimination and concentration through careful listening.'
WHERE name ILIKE '%Sound Cylinder%' OR name ILIKE '%Sound Box%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Geometric Solids, exploring three-dimensional shapes through touch.',
  why_it_matters = 'Geometric Solids develop understanding of 3D forms and build vocabulary for shapes found everywhere in the environment.'
WHERE name ILIKE '%Geometric Solid%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is feeling Mystery Bag objects, identifying shapes by touch alone.',
  why_it_matters = 'Mystery Bag work develops stereognostic sense - the ability to identify objects through touch without seeing them.'
WHERE name ILIKE '%Mystery Bag%' OR name ILIKE '%Stereognostic%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is matching Fabric samples by texture, developing tactile discrimination.',
  why_it_matters = 'Fabric matching refines the sense of touch and builds vocabulary for describing textures.'
WHERE name ILIKE '%Fabric%' OR name ILIKE '%Texture%Matching%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Baric Tablets, discriminating weight differences by feel.',
  why_it_matters = 'Baric Tablets develop the ability to perceive subtle weight differences, refining the baric sense.'
WHERE name ILIKE '%Baric%Tablet%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Thermic Tablets, feeling temperature differences in materials.',
  why_it_matters = 'Thermic Tablets develop temperature discrimination and teach that different materials conduct heat differently.'
WHERE name ILIKE '%Thermic%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring Smelling Bottles, matching pairs with the same scent.',
  why_it_matters = 'Smelling Bottles refine the olfactory sense and build vocabulary for describing scents.'
WHERE name ILIKE '%Smell%Bottle%' OR name ILIKE '%Olfactory%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring Tasting Bottles, identifying and matching basic tastes.',
  why_it_matters = 'Tasting work develops gustatory discrimination and vocabulary for sweet, sour, salty, and bitter.'
WHERE name ILIKE '%Tast%Bottle%' OR name ILIKE '%Gustatory%' AND parent_description IS NULL;

-- Practical Life works
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to wash hands properly - an essential hygiene skill for health and independence.',
  why_it_matters = 'Hand washing teaches hygiene habits while developing sequence following and self-care independence.'
WHERE name ILIKE '%Hand Washing%' OR name ILIKE '%Washing Hands%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to wash a table, developing thorough cleaning habits and care for the environment.',
  why_it_matters = 'Table washing develops sequence following, thorough work habits, and pride in maintaining the classroom.'
WHERE name ILIKE '%Table Washing%' OR name ILIKE '%Washing Table%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to polish items, developing careful circular motions and attention to results.',
  why_it_matters = 'Polishing develops fine motor control and teaches children to work toward a visible standard of completion.'
WHERE name ILIKE '%Polish%' AND name NOT ILIKE '%Mirror%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing spooning, transferring materials with a spoon to develop hand control.',
  why_it_matters = 'Spooning develops the hand control needed for eating independently and prepares for more complex transfers.'
WHERE name ILIKE '%Spoon%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing tonging, using tongs to transfer objects and develop hand strength.',
  why_it_matters = 'Tonging strengthens the hand muscles needed for writing while developing coordination and concentration.'
WHERE name ILIKE '%Tong%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to pour water, developing control and concentration with liquid transfers.',
  why_it_matters = 'Wet pouring develops precise hand control and teaches children to manage liquids independently.'
WHERE name ILIKE '%Wet Pour%' OR name ILIKE '%Water Pour%' OR name ILIKE '%Pouring Water%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to use a screwdriver, developing tool skills and hand-eye coordination.',
  why_it_matters = 'Screwdriver work develops fine motor control and introduces children to practical tool use.'
WHERE name ILIKE '%Screw%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to sew, developing fine motor coordination and concentration.',
  why_it_matters = 'Sewing develops hand-eye coordination, patience, and creates beautiful finished products that build pride.'
WHERE name ILIKE '%Sew%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to sweep, caring for the classroom environment.',
  why_it_matters = 'Sweeping develops coordination and teaches children to maintain clean spaces.'
WHERE name ILIKE '%Sweep%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing with locks and keys, developing problem-solving and fine motor skills.',
  why_it_matters = 'Lock and key work develops fine motor control and teaches cause-and-effect relationships.'
WHERE name ILIKE '%Lock%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is practicing opening and closing containers with various lids.',
  why_it_matters = 'Lid work develops hand strength and coordination while building independence with containers.'
WHERE name ILIKE '%Lid%' OR name ILIKE '%Opening%Container%' AND parent_description IS NULL;

-- Math works
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Spindle Box, placing spindles in compartments numbered 0-9.',
  why_it_matters = 'Spindle Box work reinforces counting and introduces zero as "nothing" in a concrete way.'
WHERE name ILIKE '%Spindle%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Cards and Counters, matching numerals with quantities.',
  why_it_matters = 'Cards and Counters reinforce number sequence and introduce odd/even concepts concretely.'
WHERE name ILIKE '%Cards and Counter%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Teens Board, learning numbers 11-19.',
  why_it_matters = 'Teen numbers are tricky in English. The Teens Board makes them concrete and logical.'
WHERE name ILIKE '%Teen%Board%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Tens Board, learning numbers 10-99.',
  why_it_matters = 'The Tens Board shows how decade numbers work, building understanding of place value.'
WHERE name ILIKE '%Tens Board%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Hundred Board, placing tiles 1-100 in sequence.',
  why_it_matters = 'The Hundred Board builds number sequence knowledge and reveals patterns in our number system.'
WHERE name ILIKE '%Hundred Board%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Short Bead Chains, counting and skip counting.',
  why_it_matters = 'Bead chains make skip counting tangible and prepare for multiplication.'
WHERE name ILIKE '%Short%Bead%Chain%' OR name ILIKE '%Short Chain%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Subtraction Strip Board, exploring subtraction facts.',
  why_it_matters = 'The Strip Board makes subtraction patterns visible and prepares for fact memorization.'
WHERE name ILIKE '%Subtraction%Strip%Board%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Multiplication Board, building multiplication facts.',
  why_it_matters = 'The Multiplication Board makes multiplication concrete before memorization.'
WHERE name ILIKE '%Multiplication%Board%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Division Board, exploring division concretely.',
  why_it_matters = 'The Division Board shows division as sharing equally, making the concept tangible.'
WHERE name ILIKE '%Division%Board%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Stamp Game, doing operations with small tiles representing place values.',
  why_it_matters = 'The Stamp Game bridges concrete materials and abstract algorithms for all four operations.'
WHERE name ILIKE '%Stamp Game%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Dot Game, practicing addition with dots representing quantities.',
  why_it_matters = 'The Dot Game develops mental math skills and bridges concrete and abstract addition.'
WHERE name ILIKE '%Dot Game%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Small Bead Frame (abacus), doing operations with beads.',
  why_it_matters = 'The Bead Frame is an abacus that makes place value operations visual and concrete.'
WHERE name ILIKE '%Bead Frame%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Fraction Circles, exploring parts of a whole.',
  why_it_matters = 'Fraction circles make fractions tangible, showing how wholes divide into equal parts.'
WHERE name ILIKE '%Fraction%' AND parent_description IS NULL;

-- Language works
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is tracing Sandpaper Letters, learning letter shapes through touch.',
  why_it_matters = 'Sandpaper Letters use touch and movement to build letter memory, preparing for writing.'
WHERE name ILIKE '%Sandpaper Letter%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with Metal Insets, tracing shapes to develop pencil control.',
  why_it_matters = 'Metal Insets develop the fine motor control and pencil grip needed for handwriting.'
WHERE name ILIKE '%Metal Inset%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about verbs - the action words in sentences.',
  why_it_matters = 'Understanding verbs helps children see how language works and improves their writing.'
WHERE name ILIKE '%Verb%Introduction%' OR name ILIKE '%Introduction%Verb%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about prepositions - words that show position and relationships.',
  why_it_matters = 'Prepositions help children express location and relationships precisely in speech and writing.'
WHERE name ILIKE '%Preposition%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about conjunctions - words that connect ideas.',
  why_it_matters = 'Conjunctions help children build complex sentences and express connected ideas.'
WHERE name ILIKE '%Conjunction%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about adverbs - words that describe how actions happen.',
  why_it_matters = 'Adverbs add detail to children''s expression and help them write more descriptively.'
WHERE name ILIKE '%Adverb%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about pronouns - words that replace nouns.',
  why_it_matters = 'Pronouns help children avoid repetition and write more fluently.'
WHERE name ILIKE '%Pronoun%' AND parent_description IS NULL;

-- Cultural works
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about the Land and Water Globe, identifying continents and oceans.',
  why_it_matters = 'The Globe introduces Earth''s geography and builds awareness of our planet.'
WHERE name ILIKE '%Land%Water%Globe%' OR name ILIKE '%Sandpaper Globe%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring Land and Water Forms, learning geographical vocabulary.',
  why_it_matters = 'Land and Water Forms teach vocabulary like island, lake, peninsula through hands-on models.'
WHERE name ILIKE '%Land%Water%Form%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about the Solar System, exploring planets and their relationships.',
  why_it_matters = 'Solar System work builds cosmic awareness and introduces astronomy concepts.'
WHERE name ILIKE '%Solar System%' OR name ILIKE '%Planet%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about the parts of animals through puzzle and card work.',
  why_it_matters = 'Parts of animals work builds scientific vocabulary and understanding of animal anatomy.'
WHERE name ILIKE '%Parts of%' AND (name ILIKE '%Animal%' OR name ILIKE '%Bird%' OR name ILIKE '%Fish%' OR name ILIKE '%Frog%' OR name ILIKE '%Horse%') AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about the parts of plants through puzzle and card work.',
  why_it_matters = 'Parts of plants work builds botanical vocabulary and understanding of plant structures.'
WHERE name ILIKE '%Parts of%' AND (name ILIKE '%Plant%' OR name ILIKE '%Flower%' OR name ILIKE '%Leaf%' OR name ILIKE '%Root%') AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is working with the Clock, learning to tell time.',
  why_it_matters = 'Learning to tell time builds independence and understanding of daily schedules.'
WHERE name ILIKE '%Clock%' OR name ILIKE '%Tell%Time%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning about the Calendar, understanding days, weeks, months, and years.',
  why_it_matters = 'Calendar work builds temporal awareness and helps children anticipate events.'
WHERE name ILIKE '%Calendar%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring Art activities, developing creativity and fine motor skills.',
  why_it_matters = 'Art develops creativity, self-expression, and fine motor control while building confidence.'
WHERE name ILIKE '%Art%' AND name NOT ILIKE '%Parts%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is exploring Music activities, developing rhythm and musical awareness.',
  why_it_matters = 'Music develops auditory skills, rhythm, and provides joy while building cultural appreciation.'
WHERE name ILIKE '%Music%' AND name NOT ILIKE '%Bell%' AND parent_description IS NULL;

-- Grace and Courtesy
UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to greet others politely with eye contact and kind words.',
  why_it_matters = 'Greeting skills build social confidence and teach children to acknowledge others respectfully.'
WHERE name ILIKE '%Greet%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to say please and thank you appropriately.',
  why_it_matters = 'Polite language shows respect for others and helps children navigate social situations gracefully.'
WHERE name ILIKE '%Please%' OR name ILIKE '%Thank%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to wait patiently and take turns.',
  why_it_matters = 'Waiting and turn-taking develop self-control and respect for others'' needs.'
WHERE name ILIKE '%Wait%' OR name ILIKE '%Turn%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to interrupt politely when needed.',
  why_it_matters = 'Learning to interrupt appropriately balances expressing needs with respecting others'' conversations.'
WHERE name ILIKE '%Interrupt%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to apologize sincerely when they have hurt someone.',
  why_it_matters = 'Apologizing teaches children to take responsibility and repair relationships.'
WHERE name ILIKE '%Apolog%' OR name ILIKE '%Sorry%' AND parent_description IS NULL;

UPDATE montree_classroom_curriculum_works SET
  parent_description = 'Your child is learning to share materials and take turns with classroom resources.',
  why_it_matters = 'Sharing develops generosity and helps children work cooperatively in community.'
WHERE name ILIKE '%Shar%' AND name NOT ILIKE '%Shape%' AND parent_description IS NULL;

COMMIT;

-- Verification query
SELECT COUNT(*) as total,
       COUNT(parent_description) as with_parent,
       COUNT(why_it_matters) as with_why
FROM montree_classroom_curriculum_works;
