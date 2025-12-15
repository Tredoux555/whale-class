// lib/curriculum/roadmap-seed.ts
// COMPLETE MONTESSORI CURRICULUM (Ages 2-6)
// 74 works in complete sequence with prerequisites
// Ready to seed into curriculum_roadmap table

export const CURRICULUM_ROADMAP_SEED = [
  // ===== STAGE 0: FOUNDATION (Age 2.0-2.5) =====
  {
    sequence_order: 1,
    work_name: 'Water Pouring',
    area: 'practical_life',
    stage: 'stage_0',
    age_min: 2.0,
    age_max: 2.5,
    prerequisite_work_ids: [],
    description: 'Child pours water from one pitcher to another, developing fine motor control, concentration, and coordination. This is the foundational work of the entire curriculum.',
    notes: 'Starting point for all children. Repetition is key.'
  },

  // ===== STAGE 1: PRELIMINARY EXERCISES & CARE OF SELF (Age 2.5-3.5) =====
  {
    sequence_order: 2,
    work_name: 'Dry Pouring (Grains)',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [1],
    description: 'Child pours dry grains (rice, lentils) from one pitcher to another. Easier than water because no splashing/absorption, develops same skills.',
    notes: 'Precedes wet pouring. Grains create natural feedback if spilled.'
  },
  {
    sequence_order: 3,
    work_name: 'Pouring Grains to Many Containers',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [2],
    description: 'Child practices pouring grains into multiple small cups/containers, refining precision.',
    notes: 'Extension of dry pouring. Introduces variability.'
  },
  {
    sequence_order: 4,
    work_name: 'Spooning Grains',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [2],
    description: 'Child scoops grains from one container to another using a spoon. Different motion than pouring, develops new fine motor patterns.',
    notes: 'Introduces different utensil. Grip practice for writing preparation.'
  },
  {
    sequence_order: 5,
    work_name: 'Water Pouring (Advanced)',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [1, 2, 3],
    description: 'Returning to water pouring with greater skill. Child can pour with more precision and control.',
    notes: 'Revisit after dry work. Child shows noticeable improvement.'
  },
  {
    sequence_order: 6,
    work_name: 'Object Washing',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [5],
    description: 'Child washes small objects (stones, toys) in soapy water, rinses, dries. Introduces sequence of steps.',
    notes: 'First multi-step practical life work. Shows child can follow sequence.'
  },
  {
    sequence_order: 7,
    work_name: 'Table Scrubbing',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [6],
    description: 'Child scrubs a small child-sized table or tray with soapy water and brush, rinses, dries.',
    notes: 'Child can see tangible results. Builds sense of ownership.'
  },
  {
    sequence_order: 8,
    work_name: 'Sweeping',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [7],
    description: 'Child sweeps with child-sized broom and dustpan, learning proper technique.',
    notes: 'Visible results motivate child. Often repeated by choice.'
  },
  {
    sequence_order: 9,
    work_name: 'Mopping',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [8],
    description: 'Child mops a small area with child-sized mop and bucket, wringing technique.',
    notes: 'Child\'s face lights up seeing "clean" result.'
  },
  {
    sequence_order: 10,
    work_name: 'Dusting',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [7],
    description: 'Child dusts surfaces with cloth or duster, learning gentle care of objects.',
    notes: 'Teaches gentleness with beautiful objects.'
  },
  {
    sequence_order: 11,
    work_name: 'Arranging Flowers',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [6],
    description: 'Child arranges flowers in a vase with water. Combines water pouring, care, and aesthetic sense.',
    notes: 'Engages child\'s sense of beauty and order.'
  },
  {
    sequence_order: 12,
    work_name: 'Watering Plants',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [1],
    description: 'Child waters plants with small watering can, learning to care for living things.',
    notes: 'Often done daily by choice. Builds routine and responsibility.'
  },
  {
    sequence_order: 13,
    work_name: 'Washing Hands',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [6],
    description: 'Child washes hands with proper technique - wetting, soaping, washing all surfaces, rinsing, drying.',
    notes: 'Foundational self-care work. Done daily.'
  },
  {
    sequence_order: 14,
    work_name: 'Dressing Frames (Buttons)',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [1],
    description: 'Child practices buttoning/unbuttoning with large buttons on a wooden frame.',
    notes: 'Child practices until mastery. Then moves to other fasteners.'
  },
  {
    sequence_order: 15,
    work_name: 'Dressing Frames (Zippers)',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [14],
    description: 'Child practices zipping/unzipping on a wooden frame with large zippers.',
    notes: 'Different motion than buttons. Child practices both.'
  },
  {
    sequence_order: 16,
    work_name: 'Polishing Shoes',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [7],
    description: 'Child polishes shoes with cloth and polish, learning to care for personal items.',
    notes: 'Child sees transformation. Builds self-care habits.'
  },
  {
    sequence_order: 17,
    work_name: 'Getting Dressed',
    area: 'practical_life',
    stage: 'stage_1',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [14, 15],
    description: 'Child dresses self (shirt, pants, socks, shoes) with increasing independence.',
    notes: 'Begins slowly, increases in speed with practice.'
  },

  // ===== STAGE 2: SENSORIAL FOUNDATION (Age 2.5-3.5) =====
  {
    sequence_order: 18,
    work_name: 'Knobbed Cylinders (Cylinder Block)',
    area: 'sensorial',
    stage: 'stage_2',
    age_min: 2.5,
    age_max: 3.5,
    prerequisite_work_ids: [],
    description: 'Child removes cylinders of varying diameter from a wooden block using three-finger grip, then replaces them. Isolates one dimension (thickness).',
    notes: 'Indirect preparation for pencil grip. Multiple exercises possible.'
  },
  {
    sequence_order: 19,
    work_name: 'Pink Tower',
    area: 'sensorial',
    stage: 'stage_2',
    age_min: 3.0,
    age_max: 4.0,
    prerequisite_work_ids: [18],
    description: 'Child builds a tower with 10 pink wooden cubes, starting with largest to smallest. Isolates dimension of size.',
    notes: 'Can be extended with other materials. Control of error is visual.'
  },
  {
    sequence_order: 20,
    work_name: 'Brown Stair (Broad Stair)',
    area: 'sensorial',
    stage: 'stage_2',
    age_min: 3.0,
    age_max: 4.0,
    prerequisite_work_ids: [19],
    description: 'Child arranges 10 brown wooden prisms from thickest to thinnest, creating a stair-like pattern. Isolates dimension of width/thickness.',
    notes: 'Often combined with Pink Tower for extensions.'
  },
  {
    sequence_order: 21,
    work_name: 'Red Rods',
    area: 'sensorial',
    stage: 'stage_2',
    age_min: 3.0,
    age_max: 4.0,
    prerequisite_work_ids: [19, 20],
    description: 'Child arranges 10 red wooden rods from longest to shortest (10cm to 100cm). Isolates dimension of length.',
    notes: 'Larger work requiring more space and body coordination.'
  },
  {
    sequence_order: 22,
    work_name: 'Color Tablets - Primary Colors',
    area: 'sensorial',
    stage: 'stage_2',
    age_min: 3.0,
    age_max: 3.5,
    prerequisite_work_ids: [18],
    description: 'Child matches and orders tablets of primary colors (red, yellow, blue), developing color discrimination.',
    notes: 'Introduces color work before extended color study.'
  },
  {
    sequence_order: 23,
    work_name: 'Geometric Form Insets (Knobbed)',
    area: 'sensorial',
    stage: 'stage_2',
    age_min: 3.0,
    age_max: 4.0,
    prerequisite_work_ids: [18],
    description: 'Child removes geometric shapes (circle, square, triangle, rectangle) from wooden insets using knobs, then replaces them.',
    notes: 'Shapes are knobbed for three-finger grip development.'
  },

  // ===== STAGE 3: EARLY LANGUAGE & COUNTING (Age 3.0-3.5) =====
  {
    sequence_order: 24,
    work_name: 'Sound Games & Phonological Awareness',
    area: 'language',
    stage: 'stage_3',
    age_min: 3.0,
    age_max: 3.5,
    prerequisite_work_ids: [],
    description: 'Child plays games identifying initial sounds in words, rhyming words, clapping syllables. Develops phonological awareness.',
    notes: 'Foundation for reading. Games make it fun.'
  },
  {
    sequence_order: 25,
    work_name: 'Oral Language Development',
    area: 'language',
    stage: 'stage_3',
    age_min: 3.0,
    age_max: 3.5,
    prerequisite_work_ids: [],
    description: 'Child engages in conversations, storytelling, vocabulary building through discussion and shared reading.',
    notes: 'Informal but critical. Model excellent language.'
  },
  {
    sequence_order: 26,
    work_name: 'Sandpaper Letters - Group 1 (m, s, t, a)',
    area: 'language',
    stage: 'stage_3',
    age_min: 3.0,
    age_max: 3.5,
    prerequisite_work_ids: [24, 25],
    description: 'Child traces sandpaper letters with fingers, learning the sound and shape. First group: /m/, /s/, /t/ (and first vowel /a/).',
    notes: 'NOT alphabet order - phonetic order. 3 letters at a time.'
  },
  {
    sequence_order: 27,
    work_name: 'Sandpaper Letters - Group 2 (c, d, b)',
    area: 'language',
    stage: 'stage_3',
    age_min: 3.0,
    age_max: 3.5,
    prerequisite_work_ids: [26],
    description: 'Child continues learning new letter sounds with sandpaper letters. Group 2: /c/, /d/, /b/.',
    notes: 'Only introduce when first group is mastered.'
  },
  {
    sequence_order: 28,
    work_name: 'Object Sound Boxes',
    area: 'language',
    stage: 'stage_3',
    age_min: 3.0,
    age_max: 3.5,
    prerequisite_work_ids: [24, 26],
    description: 'Child matches small objects to letters by initial sound (ex: match "m" card to marble, mitten, etc).',
    notes: 'Makes letter sounds concrete and meaningful.'
  },
  {
    sequence_order: 29,
    work_name: 'Number Rods',
    area: 'mathematics',
    stage: 'stage_3',
    age_min: 3.0,
    age_max: 3.5,
    prerequisite_work_ids: [21],
    description: 'Child arranges 10 wooden rods (length from 10cm to 100cm, divided into red/blue segments) in order, learning to count quantities.',
    notes: 'First explicit mathematics work. Shows quantity = length.'
  },
  {
    sequence_order: 30,
    work_name: 'Spindle Box',
    area: 'mathematics',
    stage: 'stage_3',
    age_min: 3.0,
    age_max: 3.5,
    prerequisite_work_ids: [29],
    description: 'Child places correct number of wooden spindles into compartments labeled 1-9, introducing zero concept.',
    notes: 'First encounter with numeral-quantity matching.'
  },
  {
    sequence_order: 31,
    work_name: 'Sandpaper Numbers (1-9)',
    area: 'mathematics',
    stage: 'stage_3',
    age_min: 3.0,
    age_max: 3.5,
    prerequisite_work_ids: [29],
    description: 'Child traces sandpaper numerals with fingers, learning shape and forming muscle memory for writing numbers.',
    notes: 'Precedes pencil writing. Tactile preparation.'
  },

  // ===== STAGE 4: READING & WRITING PREPARATION (Age 3.5-4.0) =====
  {
    sequence_order: 32,
    work_name: 'Sandpaper Letters - Groups 3+ (Extended)',
    area: 'language',
    stage: 'stage_4',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [27],
    description: 'Child continues learning more letter sounds until 20+ letters are mastered.',
    notes: 'Continue until child recognizes most consonant and vowel sounds.'
  },
  {
    sequence_order: 33,
    work_name: 'Moveable Alphabet - Introduction',
    area: 'language',
    stage: 'stage_4',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [32],
    description: 'Child is introduced to the Moveable Alphabet - a box of wooden letters (consonants pink, vowels blue) and learns to find letters and organize them.',
    notes: 'First lesson focuses on learning the tool, not making words yet.'
  },
  {
    sequence_order: 34,
    work_name: 'Moveable Alphabet - Matching with Sandpaper',
    area: 'language',
    stage: 'stage_4',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [33],
    description: 'Child matches Moveable Alphabet letters to Sandpaper Letters, connecting the tactile experience with the moveable version.',
    notes: 'Bridge between two letter materials.'
  },
  {
    sequence_order: 35,
    work_name: 'Moveable Alphabet - CVC Word Building (Short Vowel)',
    area: 'language',
    stage: 'stage_4',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [34],
    description: 'Child builds simple 3-letter CVC words (Consonant-Vowel-Consonant) like "cat," "dog," "sit" using the Moveable Alphabet.',
    notes: 'Major breakthrough moment! Child is "writing" before holding pencil.'
  },
  {
    sequence_order: 36,
    work_name: 'Moveable Alphabet - CVC Words with Objects',
    area: 'language',
    stage: 'stage_4',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [35],
    description: 'Child builds CVC words and matches them to corresponding objects or pictures.',
    notes: 'Makes words real and meaningful.'
  },
  {
    sequence_order: 37,
    work_name: 'Pencil Grip Development',
    area: 'language',
    stage: 'stage_4',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [14],
    description: 'Child engages in fine motor activities (polishing, threading, pouring) that develop the hand muscles and grip needed for writing.',
    notes: 'Not formal instruction - indirect preparation through other works.'
  },
  {
    sequence_order: 38,
    work_name: 'Tracing Letters on Paper',
    area: 'language',
    stage: 'stage_4',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [37],
    description: 'Child traces letters on paper, initially with stencils or traced outlines, moving toward independence.',
    notes: 'Bridge activity between tactile and pencil work.'
  },
  {
    sequence_order: 39,
    work_name: 'Short Vowel Sound Introduction',
    area: 'language',
    stage: 'stage_4',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [35],
    description: 'Child practices short vowel sounds (/a/, /e/, /i/, /o/, /u/) with objects and word cards.',
    notes: 'Important for reading comprehension.'
  },

  // ===== STAGE 5: MATHEMATICS FOUNDATION (Age 3.5-4.0) =====
  {
    sequence_order: 40,
    work_name: 'Short Bead Stair (1-10 Colored Beads)',
    area: 'mathematics',
    stage: 'stage_5',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [29],
    description: 'Child arranges 10 colored bead bars (each representing 1-10 beads) in stair formation. Each bar is a different color representing its quantity.',
    notes: 'Beautiful color pattern helps visual learning.'
  },
  {
    sequence_order: 41,
    work_name: 'Cards & Counters (Quantity to Numeral)',
    area: 'mathematics',
    stage: 'stage_5',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [31, 40],
    description: 'Child matches numeral cards to correct quantity of small counters, reinforcing quantity-symbol relationship.',
    notes: 'Self-correcting material.'
  },
  {
    sequence_order: 42,
    work_name: 'Teens Introduction (11-19)',
    area: 'mathematics',
    stage: 'stage_5',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [41],
    description: 'Child learns that 10 + 1 = 11, 10 + 2 = 12, etc. using Golden Bead introduction materials.',
    notes: 'Bridge to larger numbers.'
  },
  {
    sequence_order: 43,
    work_name: 'Introduction to Golden Beads (Material)',
    area: 'mathematics',
    stage: 'stage_5',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [42],
    description: 'Child is introduced to Golden Bead material - unit bead (1), ten bar (10), hundred square (100), thousand cube (1000). Learns to name and handle each.',
    notes: 'HUGE concept introduction. Multiple lessons needed.'
  },
  {
    sequence_order: 44,
    work_name: 'Golden Beads - Counting Through',
    area: 'mathematics',
    stage: 'stage_5',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [43],
    description: 'Child counts individual units (1-9), then exchanges 10 units for a ten bar, building understanding of decimal exchanges.',
    notes: 'Foundation work. Repeated multiple times.'
  },
  {
    sequence_order: 45,
    work_name: 'Bead Chains - Short Bead Chains',
    area: 'mathematics',
    stage: 'stage_5',
    age_min: 3.5,
    age_max: 4.0,
    prerequisite_work_ids: [40],
    description: 'Child works with chains of colored beads representing 2, 3, 4, etc. up to 10. Arranges and counts.',
    notes: 'Beautiful and tactilely engaging.'
  },

  // ===== STAGE 6: ADVANCED SENSORIAL (Age 4.0-4.5) =====
  {
    sequence_order: 46,
    work_name: 'Pink Tower + Brown Stair Extensions',
    area: 'sensorial',
    stage: 'stage_6',
    age_min: 4.0,
    age_max: 4.5,
    prerequisite_work_ids: [19, 20],
    description: 'Child creates designs, patterns, and constructions combining Pink Tower, Brown Stair, and other materials.',
    notes: 'Imaginative play with mathematical materials.'
  },
  {
    sequence_order: 47,
    work_name: 'Red Rods + Pink Tower Extensions',
    area: 'sensorial',
    stage: 'stage_6',
    age_min: 4.0,
    age_max: 4.5,
    prerequisite_work_ids: [19, 21],
    description: 'Child combines Red Rods and Pink Tower in complex arrangements.',
    notes: 'Child discovers relationships between length and volume.'
  },
  {
    sequence_order: 48,
    work_name: 'Binomial Cube',
    area: 'sensorial',
    stage: 'stage_6',
    age_min: 4.0,
    age_max: 4.5,
    prerequisite_work_ids: [19],
    description: 'Child assembles a cube from 8 colored wooden pieces representing (a+b)³. Spatial puzzle work.',
    notes: 'Beautiful mathematical object. Works on concentration.'
  },
  {
    sequence_order: 49,
    work_name: 'Geometric Solids',
    area: 'sensorial',
    stage: 'stage_6',
    age_min: 4.0,
    age_max: 4.5,
    prerequisite_work_ids: [23],
    description: 'Child learns names and properties of 10 geometric solids (cube, sphere, cylinder, cone, pyramid, prism, ellipsoid, ovoid).',
    notes: 'Child learns to identify shapes in environment.'
  },

  // ===== STAGE 7: PHONETIC READING & WRITING (Age 4.0-4.5) =====
  {
    sequence_order: 50,
    work_name: 'Phonetic Reading Introduction',
    area: 'language',
    stage: 'stage_7',
    age_min: 4.0,
    age_max: 4.5,
    prerequisite_work_ids: [35],
    description: 'Child reads the CVC words they built with Moveable Alphabet. Reading emerges naturally from writing.',
    notes: 'Huge confidence boost when child realizes they can read.'
  },
  {
    sequence_order: 51,
    work_name: 'Four-Letter Phonetic Words',
    area: 'language',
    stage: 'stage_7',
    age_min: 4.0,
    age_max: 4.5,
    prerequisite_work_ids: [50],
    description: 'Child builds and reads phonetic 4+ letter words like "jump," "flag," "stop" using Moveable Alphabet.',
    notes: 'Child\'s reading scope expanding rapidly.'
  },
  {
    sequence_order: 52,
    work_name: 'Writing CVC Words (Pencil & Paper)',
    area: 'language',
    stage: 'stage_7',
    age_min: 4.0,
    age_max: 4.5,
    prerequisite_work_ids: [38, 35],
    description: 'Child writes CVC words with pencil and paper, using knowledge from Moveable Alphabet.',
    notes: 'Child has been "writing" with Moveable Alphabet, now does with pencil.'
  },
  {
    sequence_order: 53,
    work_name: 'Consonant Blends Introduction',
    area: 'language',
    stage: 'stage_7',
    age_min: 4.0,
    age_max: 4.5,
    prerequisite_work_ids: [51],
    description: 'Child learns consonant blends (st, bl, cr, fl, etc.) and reads words like "stop," "blend," "cross."',
    notes: 'Opening door to more complex reading.'
  },
  {
    sequence_order: 54,
    work_name: 'Stories & Sentence Building',
    area: 'language',
    stage: 'stage_7',
    age_min: 4.0,
    age_max: 4.5,
    prerequisite_work_ids: [52],
    description: 'Child reads simple phonetic stories, builds sentences using Moveable Alphabet, begins creative writing.',
    notes: 'Child begins to see writing as communication tool.'
  },

  // ===== STAGE 8: DECIMAL SYSTEM & OPERATIONS (Age 4.5-5.0) =====
  {
    sequence_order: 55,
    work_name: 'Golden Beads - 45 Layout',
    area: 'mathematics',
    stage: 'stage_8',
    age_min: 4.5,
    age_max: 5.0,
    prerequisite_work_ids: [44],
    description: 'Child arranges all quantities from 1 unit to 9000 (1 unit, 10 units, 100 units, 1000, then 2 tens through 9 tens, 2 hundreds through 9 hundreds, 2 thousands through 9 thousands). Matches with numeral cards.',
    notes: 'Can take multiple sessions. Profound understanding building.'
  },
  {
    sequence_order: 56,
    work_name: 'Addition with Golden Beads - Exchange Game',
    area: 'mathematics',
    stage: 'stage_8',
    age_min: 4.5,
    age_max: 5.0,
    prerequisite_work_ids: [55],
    description: 'Child performs addition using Golden Beads - combining quantities, exchanging when reaching 10 at any level.',
    notes: 'First introduction to regrouping/carrying.'
  },
  {
    sequence_order: 57,
    work_name: 'Subtraction with Golden Beads',
    area: 'mathematics',
    stage: 'stage_8',
    age_min: 4.5,
    age_max: 5.0,
    prerequisite_work_ids: [56],
    description: 'Child performs subtraction using Golden Beads - removing quantities, making change when necessary.',
    notes: 'Inverse of addition. Child sees relationship.'
  },
  {
    sequence_order: 58,
    work_name: 'Addition & Subtraction Strip Boards',
    area: 'mathematics',
    stage: 'stage_8',
    age_min: 4.5,
    age_max: 5.0,
    prerequisite_work_ids: [56, 57],
    description: 'Child uses wooden strip boards with colored bead bars to visualize addition and subtraction combinations.',
    notes: 'Visual tool that shows mathematical relationships.'
  },
  {
    sequence_order: 59,
    work_name: 'Bead Chains - Long Bead Chains & Skip Counting',
    area: 'mathematics',
    stage: 'stage_8',
    age_min: 4.5,
    age_max: 5.0,
    prerequisite_work_ids: [45],
    description: 'Child counts long bead chains (10, 100, 1000 beads) practicing skip counting (2s, 3s, 4s, 5s, etc.).',
    notes: 'Tactile and visual multiplication foundation.'
  },
  {
    sequence_order: 60,
    work_name: 'Snake Game (Colored Bead Bars)',
    area: 'mathematics',
    stage: 'stage_8',
    age_min: 4.5,
    age_max: 5.0,
    prerequisite_work_ids: [59],
    description: 'Child creates a "snake" of colored bead bars, then "transforms" it by exchanging colored bars for golden bead bars, discovering addition through grouping.',
    notes: 'Beautiful bridge between colored beads and Golden Beads.'
  },

  // ===== STAGE 9: EXTENDED LANGUAGE & PHONETICS (Age 5.0-5.5) =====
  {
    sequence_order: 61,
    work_name: 'Long Vowels & Silent E',
    area: 'language',
    stage: 'stage_9',
    age_min: 5.0,
    age_max: 5.5,
    prerequisite_work_ids: [53],
    description: 'Child learns about long vowel sounds and silent "e" rule (cake, make, like, etc.).',
    notes: 'Opens door to more English vocabulary.'
  },
  {
    sequence_order: 62,
    work_name: 'Digraphs (ch, sh, th, wh)',
    area: 'language',
    stage: 'stage_9',
    age_min: 5.0,
    age_max: 5.5,
    prerequisite_work_ids: [61],
    description: 'Child learns digraph sounds and reads words with digraphs (church, ship, these, whale).',
    notes: 'Child can now read significantly more words.'
  },
  {
    sequence_order: 63,
    work_name: 'Phonogram Cards (Advanced Phonetics)',
    area: 'language',
    stage: 'stage_9',
    age_min: 5.0,
    age_max: 5.5,
    prerequisite_work_ids: [62],
    description: 'Child works with phonogram cards showing sound combinations, reading and building words with various patterns.',
    notes: 'Deepening phonetic understanding.'
  },
  {
    sequence_order: 64,
    work_name: 'Free Writing (Child-Generated Sentences)',
    area: 'language',
    stage: 'stage_9',
    age_min: 5.0,
    age_max: 5.5,
    prerequisite_work_ids: [52],
    description: 'Child writes their own sentences using phonetic knowledge, creating meaningful personal writing.',
    notes: 'Child realizes they can write what they think. Motivating!'
  },
  {
    sequence_order: 65,
    work_name: 'Story Writing & Illustration',
    area: 'language',
    stage: 'stage_9',
    age_min: 5.0,
    age_max: 5.5,
    prerequisite_work_ids: [64],
    description: 'Child writes simple stories or books combining text and illustrations, becoming an author.',
    notes: 'Child\'s confidence and love of writing flourish.'
  },

  // ===== STAGE 10: ADVANCED MATHEMATICS & INTEGRATION (Age 5.5-6.0) =====
  {
    sequence_order: 66,
    work_name: 'Multiplication with Golden Beads',
    area: 'mathematics',
    stage: 'stage_10',
    age_min: 5.5,
    age_max: 6.0,
    prerequisite_work_ids: [60],
    description: 'Child performs multiplication using Golden Beads - creating groups of quantities and understanding multiplication as repeated addition.',
    notes: 'Child sees multiplication as grouping quantities.'
  },
  {
    sequence_order: 67,
    work_name: 'Bead Board (Multiplication Practice)',
    area: 'mathematics',
    stage: 'stage_10',
    age_min: 5.5,
    age_max: 6.0,
    prerequisite_work_ids: [66],
    description: 'Child uses bead boards with holes to create arrays for multiplication facts, practicing times tables.',
    notes: 'Visual representation of times tables.'
  },
  {
    sequence_order: 68,
    work_name: 'Division with Golden Beads',
    area: 'mathematics',
    stage: 'stage_10',
    age_min: 5.5,
    age_max: 6.0,
    prerequisite_work_ids: [66],
    description: 'Child performs division using Golden Beads - sharing quantities equally and understanding division as repeated subtraction.',
    notes: 'Child understands division as sharing.'
  },
  {
    sequence_order: 69,
    work_name: 'Stamp Game (Hierarchical Operations)',
    area: 'mathematics',
    stage: 'stage_10',
    age_min: 5.5,
    age_max: 6.0,
    prerequisite_work_ids: [58],
    description: 'Child uses colored tiles (hierarchical colors representing 1s, 10s, 100s, 1000s) to perform all four operations with abstract representation.',
    notes: 'Bridge between concrete and pencil-and-paper math.'
  },
  {
    sequence_order: 70,
    work_name: 'Fractions Introduction',
    area: 'mathematics',
    stage: 'stage_10',
    age_min: 5.5,
    age_max: 6.0,
    prerequisite_work_ids: [68],
    description: 'Child learns fractions through manipulation - dividing whole items into halves, quarters, eighths, understanding equal parts.',
    notes: 'Concrete introduction to abstract fraction concepts.'
  },

  // ===== STAGE 11: MASTERY & DEPTH (Age 6.0-6.5) =====
  {
    sequence_order: 71,
    work_name: 'Cultural Studies - Geography (Continents & Countries)',
    area: 'cultural',
    stage: 'stage_11',
    age_min: 6.0,
    age_max: 6.5,
    prerequisite_work_ids: [],
    description: 'Child learns continents, oceans, countries through puzzle maps, global exploration, and cultural study.',
    notes: 'Lifelong learning foundation.'
  },
  {
    sequence_order: 72,
    work_name: 'Cultural Studies - Science (Simple Botany & Zoology)',
    area: 'cultural',
    stage: 'stage_11',
    age_min: 6.0,
    age_max: 6.5,
    prerequisite_work_ids: [],
    description: 'Child studies plants and animals through observation, collection, classification, and study cards.',
    notes: 'Can combine with classroom nature studies.'
  },
  {
    sequence_order: 73,
    work_name: 'Art & Music Integration',
    area: 'cultural',
    stage: 'stage_11',
    age_min: 6.0,
    age_max: 6.5,
    prerequisite_work_ids: [],
    description: 'Child engages in fine arts (painting, drawing, sculpture) and music activities, integrated into all areas.',
    notes: 'Should be integrated throughout, not separate.'
  },
  {
    sequence_order: 74,
    work_name: 'Practical Life Mastery - Complex Tasks',
    area: 'practical_life',
    stage: 'stage_11',
    age_min: 6.0,
    age_max: 6.5,
    prerequisite_work_ids: [17],
    description: 'Child engages in complex practical life (cooking, advanced cleaning, gardening, caring for community), mastering independence.',
    notes: 'Child becomes confident community member.'
  }
];

// Export for database seeding
export default CURRICULUM_ROADMAP_SEED;

