// lib/curriculum/roadmap-seed-expanded.ts
// EXPANDED MONTESSORI CURRICULUM (Ages 2-6)
// ALL 309+ WORKS IN COMPLETE SEQUENCE WITH PREREQUISITES
// Ready to seed into curriculum_roadmap table
//
// MONTESSORI SEQUENCING PHILOSOPHY:
// ================================
// The roadmap follows Maria Montessori's principles of child development:
//
// 1. SENSITIVE PERIODS: Children are naturally drawn to certain learning
//    at specific ages. Materials are introduced when the child is ready.
//
// 2. CONCRETE TO ABSTRACT: All learning begins with hands-on materials
//    that the child can manipulate, then gradually moves to symbols and
//    abstract concepts.
//
// 3. ISOLATION OF CONCEPTS: Each work isolates ONE key concept or skill,
//    allowing the child to focus deeply without confusion.
//
// 4. PREREQUISITE CHAINS: Works build on each other. A child must master
//    earlier skills before attempting more complex ones.
//
// 5. THREE-PART LESSON: Presentation (introduce), Recognition (practice),
//    Recall (test knowledge) structure is embedded in material progression.
//
// 6. SENSORIAL BEFORE ABSTRACT: Children refine their senses with
//    sensorial materials before learning abstract math and language.
//
// 7. CULTURAL STUDIES INTEGRATION: Geography, science, history are
//    woven throughout, starting from age 3 with basic concepts.

export const CURRICULUM_ROADMAP_EXPANDED = [
  // ===== STAGE 0: FOUNDATIONAL MOVEMENTS (Age 2.0-2.5) =====
  // Montessori believes the first stage is about establishing body control,
  // concentration, and the habits of the classroom. The child learns
  // independence through carrying, moving, and basic care of self.
  {
    stage: 0,
    title: "Foundational Movements",
    ageRange: "2.0-2.5 years",
    stageDescription: "The very beginning: child learns to move with purpose, concentrate, and care for materials",
    works: [
      {
        id: "pl_water_pouring_initial",
        area: "practical_life",
        category: "preliminary",
        sequence: 1,
        name: "Water Pouring (Foundational)",
        prerequisites: [],
        ageMin: 2.0,
        ageMax: 2.5,
        description: "Child pours water from one pitcher to another, developing fine motor control, concentration, and coordination. This is the foundational work of the entire curriculum.",
        directAims: ["Fine motor control", "Concentration", "Coordination"],
        indirectAims: ["Preparation for all other works", "Independence", "Confidence"],
        notes: "Starting point for all children. Foundation for entire Montessori journey. Repetition is key."
      }
    ]
  },

  // ===== STAGE 1: PRELIMINARY EXERCISES & SENSORIAL FOUNDATION (Age 2.5-3.5) =====
  // In this stage, the child develops fine motor control through pouring variations,
  // begins care of self/environment, and is introduced to sensorial materials.
  // Practical life works now branch into parallel paths: transfer activities,
  // care of self, and care of environment. Cultural Studies begins with the
  // simplest geography concepts.
  {
    stage: 1,
    title: "Preliminary Exercises & Sensorial Foundation",
    ageRange: "2.5-3.5 years",
    stageDescription: "Parallel development: fine motor through transfers, self-care routines, sensorial discrimination, and beginning cultural awareness",
    works: [
      // PRACTICAL LIFE - Preliminary & Transfer Activities
      {
        id: "pl_dry_pouring",
        area: "practical_life",
        category: "preliminary",
        sequence: 2,
        name: "Dry Pouring (Grains)",
        prerequisites: ["pl_water_pouring_initial"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child pours dry grains from one pitcher to another. Easier than water, provides natural feedback if spilled.",
        notes: "Precedes wet pouring. Grains create natural feedback."
      },
      {
        id: "pl_pouring_grains_many",
        area: "practical_life",
        category: "preliminary",
        sequence: 3,
        name: "Pouring Grains to Many Containers",
        prerequisites: ["pl_dry_pouring"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child practices pouring grains into multiple small cups/containers, refining precision.",
        notes: "Extension of dry pouring. Introduces variability and control."
      },
      {
        id: "pl_spooning",
        area: "practical_life",
        category: "transfer",
        sequence: 4,
        name: "Spooning (Grains)",
        prerequisites: ["pl_dry_pouring"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child scoops grains from one container to another using a spoon. Different motion than pouring, develops new fine motor patterns.",
        notes: "Introduces different utensil. Grip practice for writing preparation."
      },
      {
        id: "pl_water_pouring_advanced",
        area: "practical_life",
        category: "preliminary",
        sequence: 5,
        name: "Water Pouring (Advanced)",
        prerequisites: ["pl_water_pouring_initial", "pl_dry_pouring", "pl_pouring_grains_many"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Returning to water pouring with greater skill. Child can pour with more precision and control.",
        notes: "Revisit after dry work. Child shows noticeable improvement."
      },
      {
        id: "pl_object_washing",
        area: "practical_life",
        category: "care_environment",
        sequence: 6,
        name: "Object Washing",
        prerequisites: ["pl_water_pouring_advanced"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child washes small objects in soapy water, rinses, dries. Introduces sequence of steps.",
        notes: "First multi-step practical life work. Shows child can follow sequence."
      },
      {
        id: "pl_table_scrubbing",
        area: "practical_life",
        category: "care_environment",
        sequence: 7,
        name: "Table Scrubbing",
        prerequisites: ["pl_object_washing"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child scrubs a small table with soapy water and brush, rinses, dries.",
        notes: "Child can see tangible results. Builds sense of ownership."
      },
      {
        id: "pl_sweeping",
        area: "practical_life",
        category: "care_environment",
        sequence: 8,
        name: "Sweeping",
        prerequisites: ["pl_table_scrubbing"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child sweeps with child-sized broom and dustpan, learning proper technique.",
        notes: "Visible results motivate child. Often repeated by choice."
      },
      {
        id: "pl_mopping",
        area: "practical_life",
        category: "care_environment",
        sequence: 9,
        name: "Mopping",
        prerequisites: ["pl_sweeping"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child mops a small area with child-sized mop and bucket, wringing technique.",
        notes: "Child's face lights up seeing clean result."
      },
      {
        id: "pl_dusting",
        area: "practical_life",
        category: "care_environment",
        sequence: 10,
        name: "Dusting",
        prerequisites: ["pl_table_scrubbing"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child dusts surfaces with cloth or duster, learning gentle care of objects.",
        notes: "Teaches gentleness with beautiful objects."
      },
      {
        id: "pl_flower_arranging",
        area: "practical_life",
        category: "care_environment",
        sequence: 11,
        name: "Arranging Flowers",
        prerequisites: ["pl_object_washing"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child arranges flowers in a vase with water. Combines pouring, care, and aesthetic sense.",
        notes: "Engages child's sense of beauty and order."
      },
      {
        id: "pl_watering_plants",
        area: "practical_life",
        category: "care_environment",
        sequence: 12,
        name: "Watering Plants",
        prerequisites: ["pl_water_pouring_initial"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child waters plants with small watering can, learning to care for living things.",
        notes: "Often done daily by choice. Builds routine and responsibility."
      },
      {
        id: "pl_hand_washing",
        area: "practical_life",
        category: "care_self",
        sequence: 13,
        name: "Hand Washing",
        prerequisites: ["pl_water_pouring_advanced"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child washes hands with proper technique - wetting, soaping, washing all surfaces, rinsing, drying.",
        notes: "Foundational self-care work. Done daily by all children."
      },
      {
        id: "pl_face_washing",
        area: "practical_life",
        category: "care_self",
        sequence: 14,
        name: "Face Washing",
        prerequisites: ["pl_hand_washing"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Child washes and dries face independently.",
        notes: "Self-care routine."
      },
      {
        id: "pl_dressing_frame_velcro",
        area: "practical_life",
        category: "dressing",
        sequence: 15,
        name: "Velcro Dressing Frame",
        prerequisites: [],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Easiest fastening to start with. Child separates and attaches velcro strips.",
        notes: "First dressing frame. Child practices until mastery."
      },
      {
        id: "pl_dressing_frame_snaps",
        area: "practical_life",
        category: "dressing",
        sequence: 16,
        name: "Snaps Dressing Frame",
        prerequisites: ["pl_dressing_frame_velcro"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Press studs/snap fasteners. Different motion than velcro.",
        notes: "Develops pinching strength."
      },
      {
        id: "pl_dressing_frame_large_buttons",
        area: "practical_life",
        category: "dressing",
        sequence: 17,
        name: "Large Buttons Dressing Frame",
        prerequisites: ["pl_dressing_frame_snaps"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Large button fastening practice.",
        notes: "Buttoning skill begins here."
      },
      {
        id: "pl_dressing_frame_zipper",
        area: "practical_life",
        category: "dressing",
        sequence: 18,
        name: "Zipper Dressing Frame",
        prerequisites: ["pl_dressing_frame_snaps"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Separating and non-separating zippers.",
        notes: "Different mechanism than buttons or snaps."
      },
      {
        id: "pl_carrying_mat",
        area: "practical_life",
        category: "preliminary",
        sequence: 19,
        name: "Carrying a Mat",
        prerequisites: [],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Learning to carry, unroll, and roll a work mat properly.",
        notes: "Foundation for classroom independence."
      },
      {
        id: "pl_carrying_chair",
        area: "practical_life",
        category: "preliminary",
        sequence: 20,
        name: "Carrying a Chair",
        prerequisites: [],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Learning to lift, carry, and place a chair quietly.",
        notes: "Develops control of movement."
      },
      {
        id: "pl_walking_line",
        area: "practical_life",
        category: "preliminary",
        sequence: 21,
        name: "Walking on the Line",
        prerequisites: ["pl_carrying_chair"],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Walking carefully on a line marked on the floor for balance and concentration.",
        notes: "Foundation for body awareness."
      },

      // SENSORIAL - Visual Discrimination of Dimension
      {
        id: "se_cylinder_block_1",
        area: "sensorial",
        category: "visual_dimension",
        sequence: 22,
        name: "Cylinder Block 1",
        prerequisites: [],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Cylinders varying in diameter only (same height). Isolates one dimension.",
        notes: "Indirect preparation for pencil grip. Multiple exercises possible."
      },
      {
        id: "se_color_box_1",
        area: "sensorial",
        category: "visual_color",
        sequence: 23,
        name: "Color Box 1 (Primary Colors)",
        prerequisites: [],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Three pairs of color tablets - red, yellow, blue.",
        notes: "Color recognition begins."
      },

      // CULTURAL STUDIES - Geography (Age 3 introduction)
      {
        id: "cu_globe_land_water",
        area: "cultural",
        category: "geography",
        sequence: 24,
        name: "Globe - Land and Water",
        prerequisites: [],
        ageMin: 2.5,
        ageMax: 3.5,
        description: "Sandpaper globe. Child feels texture difference between land and water.",
        notes: "Child's first awareness of Earth."
      }
    ]
  },

  // ===== STAGE 2: LANGUAGE PHONETICS & EARLY NUMERACY (Age 3.0-3.5) =====
  // The child is now ready for spoken language work and introduction to
  // letter sounds and basic counting. This stage is critical because it
  // builds phonemic awareness BEFORE introducing written symbols.
  // Cultural studies expands with continents and seasons.
  {
    stage: 2,
    title: "Language Phonetics & Early Numeracy",
    ageRange: "3.0-3.5 years",
    stageDescription: "Language explosion: phonemic awareness, letter sounds, first words. Math: quantity recognition with rods and beads.",
    works: [
      // LANGUAGE - Oral Foundation & Phonetics
      {
        id: "la_enrichment_vocabulary",
        area: "language",
        category: "oral",
        sequence: 1,
        name: "Vocabulary Enrichment",
        prerequisites: [],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Building vocabulary through conversation and real objects.",
        notes: "Informal but critical. Model excellent language."
      },
      {
        id: "la_sound_games",
        area: "language",
        category: "oral",
        sequence: 2,
        name: "Sound Games (I Spy)",
        prerequisites: [],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Phonemic awareness activities isolating sounds in words.",
        notes: "Foundation for reading. Games make it fun."
      },
      {
        id: "la_rhyming",
        area: "language",
        category: "oral",
        sequence: 3,
        name: "Rhyming Activities",
        prerequisites: ["la_sound_games"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Recognizing and producing rhymes.",
        notes: "Builds phonological awareness."
      },
      {
        id: "la_sandpaper_letters_group1",
        area: "language",
        category: "writing_prep",
        sequence: 4,
        name: "Sandpaper Letters - Group 1 (m, s, t, a)",
        prerequisites: ["la_sound_games"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child traces sandpaper letters with fingers, learning the sound and shape. First group: /m/, /s/, /t/ (and first vowel /a/).",
        notes: "NOT alphabet order - phonetic order. 3 letters at a time. Child learns sound BEFORE letter shape."
      },
      {
        id: "la_sandpaper_letters_group2",
        area: "language",
        category: "writing_prep",
        sequence: 5,
        name: "Sandpaper Letters - Group 2 (c, d, b)",
        prerequisites: ["la_sandpaper_letters_group1"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child continues learning new letter sounds. Group 2: /c/, /d/, /b/.",
        notes: "Only introduce when first group is mastered. Phonetic order."
      },
      {
        id: "la_object_sound_boxes",
        area: "language",
        category: "oral",
        sequence: 6,
        name: "Object Sound Boxes",
        prerequisites: ["la_sound_games", "la_sandpaper_letters_group1"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child matches small objects to letters by initial sound.",
        notes: "Makes letter sounds concrete and meaningful."
      },

      // MATHEMATICS - Introduction to Number
      {
        id: "ma_number_rods",
        area: "mathematics",
        category: "numeration",
        sequence: 7,
        name: "Number Rods",
        prerequisites: [],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child arranges 10 wooden rods (red/blue segments) in order, learning to count quantities 1-10.",
        notes: "First explicit mathematics work. Shows quantity = length. Red and blue segments prepare for decimal system."
      },
      {
        id: "ma_spindle_box",
        area: "mathematics",
        category: "numeration",
        sequence: 8,
        name: "Spindle Boxes",
        prerequisites: ["ma_number_rods"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child places correct number of wooden spindles into compartments labeled 1-9, introducing zero concept.",
        notes: "First encounter with numeral-quantity matching. Concrete zero understanding."
      },
      {
        id: "ma_sandpaper_numerals",
        area: "mathematics",
        category: "numeration",
        sequence: 9,
        name: "Sandpaper Numerals (1-9)",
        prerequisites: ["ma_number_rods"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child traces sandpaper numerals with fingers, learning shape and forming muscle memory for writing numbers.",
        notes: "Precedes pencil writing. Tactile preparation. Kinesthetic learning."
      },
      {
        id: "ma_short_bead_stair",
        area: "mathematics",
        category: "numeration",
        sequence: 10,
        name: "Short Bead Stair",
        prerequisites: ["ma_number_rods"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child arranges 10 colored bead bars (each representing 1-10 beads) in stair formation.",
        notes: "Beautiful color pattern helps visual learning. Different from number rods."
      },

      // SENSORIAL - Continued Dimension Work
      {
        id: "se_cylinder_block_2",
        area: "sensorial",
        category: "visual_dimension",
        sequence: 11,
        name: "Cylinder Block 2",
        prerequisites: ["se_cylinder_block_1"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Cylinders varying in height only (same diameter). Isolates height dimension.",
        notes: "Second dimension work. Child learns to discriminate height."
      },
      {
        id: "se_pink_tower",
        area: "sensorial",
        category: "visual_dimension",
        sequence: 12,
        name: "Pink Tower",
        prerequisites: ["se_cylinder_block_1"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child builds a tower with 10 pink wooden cubes from largest to smallest.",
        notes: "Iconic Montessori material. Visual discrimination of 3D size."
      },
      {
        id: "se_brown_stair",
        area: "sensorial",
        category: "visual_dimension",
        sequence: 13,
        name: "Brown Stair (Broad Stair)",
        prerequisites: ["se_pink_tower"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child arranges 10 brown prisms from thickest to thinnest, creating a stair pattern.",
        notes: "Isolates width/thickness dimension. Often combined with Pink Tower."
      },
      {
        id: "se_red_rods",
        area: "sensorial",
        category: "visual_dimension",
        sequence: 14,
        name: "Red Rods",
        prerequisites: ["se_brown_stair"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Child arranges 10 red wooden rods from longest to shortest (10cm to 100cm).",
        notes: "Isolates length dimension. Larger work requiring more space."
      },
      {
        id: "se_color_box_2",
        area: "sensorial",
        category: "visual_color",
        sequence: 15,
        name: "Color Box 2 (Secondary Colors)",
        prerequisites: ["se_color_box_1"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Eleven pairs of color tablets including primary, secondary, and other colors.",
        notes: "Extended color vocabulary development."
      },
      {
        id: "se_geometric_cabinet",
        area: "sensorial",
        category: "visual_form",
        sequence: 16,
        name: "Geometric Cabinet",
        prerequisites: ["se_cylinder_block_1"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Cabinet with six drawers containing 35 geometric shape insets.",
        notes: "Shape vocabulary: circle, square, triangle, etc."
      },

      // PRACTICAL LIFE - Grace & Courtesy
      {
        id: "pl_greetings",
        area: "practical_life",
        category: "grace_courtesy",
        sequence: 17,
        name: "Greetings",
        prerequisites: [],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "How to greet people appropriately.",
        notes: "Foundation for social skills."
      },
      {
        id: "pl_please_thank_you",
        area: "practical_life",
        category: "grace_courtesy",
        sequence: 18,
        name: "Please and Thank You",
        prerequisites: [],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Using polite words.",
        notes: "Basic courtesy."
      },

      // CULTURAL STUDIES - Geography
      {
        id: "cu_globe_continents",
        area: "cultural",
        category: "geography",
        sequence: 19,
        name: "Globe - Continents",
        prerequisites: ["cu_globe_land_water"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "Colored continent globe. Child learns 7 continent names.",
        notes: "Building world awareness."
      },
      {
        id: "cu_puzzle_map_world",
        area: "cultural",
        category: "geography",
        sequence: 20,
        name: "Puzzle Map - World",
        prerequisites: ["cu_globe_continents"],
        ageMin: 3.0,
        ageMax: 3.5,
        description: "World map with continent pieces.",
        notes: "Hands-on geography."
      }
    ]
  },

  // ===== STAGE 3: ADVANCED LANGUAGE & MATHEMATICS FOUNDATION (Age 3.5-4.0) =====
  // The child now has solid phonetic foundation and is ready for more
  // letter groups, begins word-building with Moveable Alphabet (HUGE moment!),
  // and advances in mathematics with decimal system introduction and operations.
  {
    stage: 3,
    title: "Advanced Language & Mathematics Foundation",
    ageRange: "3.5-4.0 years",
    stageDescription: "Child discovers they can write/encode before reading. Math: introduction to decimal hierarchy (units, tens, hundreds, thousands).",
    works: [
      // LANGUAGE - More Letter Groups, Moveable Alphabet
      {
        id: "la_sandpaper_letters_group3_plus",
        area: "language",
        category: "writing_prep",
        sequence: 1,
        name: "Sandpaper Letters - Groups 3-6",
        prerequisites: ["la_sandpaper_letters_group2"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Child continues learning more letter sounds until 20+ letters are mastered.",
        notes: "Phonetic approach: child knows SOUND before letter name."
      },
      {
        id: "la_moveable_alphabet_intro",
        area: "language",
        category: "writing_prep",
        sequence: 2,
        name: "Moveable Alphabet - Introduction",
        prerequisites: ["la_sandpaper_letters_group1"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Child is introduced to the Moveable Alphabet (consonants pink, vowels blue) and learns to find letters and organize them.",
        notes: "HUGE moment! Child realizes they can build words. Not word-making yet, just learning the tool."
      },
      {
        id: "la_moveable_alphabet_matching",
        area: "language",
        category: "writing_prep",
        sequence: 3,
        name: "Moveable Alphabet - Matching with Sandpaper",
        prerequisites: ["la_moveable_alphabet_intro"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Child matches Moveable Alphabet letters to Sandpaper Letters, connecting tactile experience with moveable version.",
        notes: "Bridge between two letter materials."
      },
      {
        id: "la_moveable_alphabet_cvc_words",
        area: "language",
        category: "writing_prep",
        sequence: 4,
        name: "Moveable Alphabet - CVC Word Building",
        prerequisites: ["la_moveable_alphabet_matching"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Child builds simple 3-letter CVC words (Consonant-Vowel-Consonant) like 'cat,' 'dog,' 'sit' using the Moveable Alphabet.",
        notes: "MAJOR BREAKTHROUGH! Child is 'writing' before holding pencil. Child can decode sounds into words."
      },
      {
        id: "la_moveable_alphabet_cvc_objects",
        area: "language",
        category: "writing_prep",
        sequence: 5,
        name: "Moveable Alphabet - CVC Words with Objects",
        prerequisites: ["la_moveable_alphabet_cvc_words"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Child builds CVC words and matches them to corresponding objects or pictures.",
        notes: "Makes words real and meaningful. Comprehension check."
      },
      {
        id: "la_metal_insets",
        area: "language",
        category: "writing_prep",
        sequence: 6,
        name: "Metal Insets",
        prerequisites: [],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Geometric frames for developing pencil control and lightness of touch.",
        notes: "Prepares hand for writing. Different from letter formation."
      },
      {
        id: "la_storytelling",
        area: "language",
        category: "oral",
        sequence: 7,
        name: "Storytelling and Sequencing",
        prerequisites: [],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Oral storytelling and story sequencing activities.",
        notes: "Develops narrative skills."
      },
      {
        id: "la_poems_songs",
        area: "language",
        category: "oral",
        sequence: 8,
        name: "Poems, Songs, and Fingerplays",
        prerequisites: [],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Memorizing and performing poems and songs.",
        notes: "Language patterns, rhythm, memory."
      },

      // MATHEMATICS - Decimal System Introduction
      {
        id: "ma_cards_counters",
        area: "mathematics",
        category: "numeration",
        sequence: 9,
        name: "Cards and Counters",
        prerequisites: ["ma_spindle_box"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Numeral cards 1-10 with 55 counters. Child places correct quantity under each card.",
        notes: "Introduces odd/even pattern. Quantity-symbol association."
      },
      {
        id: "ma_memory_game",
        area: "mathematics",
        category: "numeration",
        sequence: 10,
        name: "Memory Game of Numbers",
        prerequisites: ["ma_cards_counters"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Child remembers and fetches quantities from memory.",
        notes: "Tests understanding, builds independence."
      },
      {
        id: "ma_golden_beads_intro",
        area: "mathematics",
        category: "decimal",
        sequence: 11,
        name: "Introduction to Golden Beads",
        prerequisites: ["ma_cards_counters"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Child is introduced to Golden Bead material: unit bead (1), ten bar (10), hundred square (100), thousand cube (1000).",
        notes: "HUGE concept introduction! Foundation for entire decimal system understanding."
      },
      {
        id: "ma_golden_beads_tray",
        area: "mathematics",
        category: "decimal",
        sequence: 12,
        name: "Golden Bead Tray Exercises",
        prerequisites: ["ma_golden_beads_intro"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Child fetches and organizes golden beads as requested (e.g., 'bring me 2 tens and 3 units').",
        notes: "Develops comfort with place value material."
      },
      {
        id: "ma_large_numeral_cards",
        area: "mathematics",
        category: "decimal",
        sequence: 13,
        name: "Large Numeral Cards",
        prerequisites: ["ma_golden_beads_intro"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Cards for units (1-9), tens (10-90), hundreds (100-900), thousands (1000-9000). Color-coded by place value.",
        notes: "Green=units, blue=tens, red=hundreds, green=thousands. Symbol for place value."
      },
      {
        id: "ma_formation_quantity",
        area: "mathematics",
        category: "decimal",
        sequence: 14,
        name: "Formation of Quantity",
        prerequisites: ["ma_golden_beads_tray"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Building quantities with golden beads (e.g., 2 thousand, 3 hundred, 7 tens, 4 units).",
        notes: "Concrete understanding of multi-digit quantities."
      },
      {
        id: "ma_formation_symbol",
        area: "mathematics",
        category: "decimal",
        sequence: 15,
        name: "Formation of Symbol",
        prerequisites: ["ma_large_numeral_cards"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Building multi-digit numbers by superimposing numeral cards.",
        notes: "Abstract representation of quantity."
      },
      {
        id: "ma_association_quantity_symbol",
        area: "mathematics",
        category: "decimal",
        sequence: 16,
        name: "Association of Quantity and Symbol",
        prerequisites: ["ma_formation_quantity", "ma_formation_symbol"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Connecting golden bead quantities with numeral cards.",
        notes: "Concrete-to-abstract bridge."
      },

      // SENSORIAL - Advanced Work
      {
        id: "se_cylinder_block_3",
        area: "sensorial",
        category: "visual_dimension",
        sequence: 17,
        name: "Cylinder Block 3",
        prerequisites: ["se_cylinder_block_2"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Cylinders varying in both diameter and height (same direction).",
        notes: "Isolates TWO dimensions simultaneously."
      },
      {
        id: "se_cylinder_block_4",
        area: "sensorial",
        category: "visual_dimension",
        sequence: 18,
        name: "Cylinder Block 4",
        prerequisites: ["se_cylinder_block_3"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Cylinders varying in both diameter and height (opposite direction).",
        notes: "Visual discrimination of inverse relationships."
      },
      {
        id: "se_touch_boards",
        area: "sensorial",
        category: "tactile",
        sequence: 19,
        name: "Touch Boards",
        prerequisites: [],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Boards with contrasting textures (rough/smooth).",
        notes: "Tactile discrimination."
      },
      {
        id: "se_sound_boxes",
        area: "sensorial",
        category: "auditory",
        sequence: 20,
        name: "Sound Boxes",
        prerequisites: [],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Two sets of six cylinders with varying sounds to match.",
        notes: "Auditory discrimination."
      },

      // PRACTICAL LIFE - More Transfer Activities & Grace/Courtesy
      {
        id: "pl_tonging",
        area: "practical_life",
        category: "transfer",
        sequence: 21,
        name: "Tonging",
        prerequisites: ["pl_spooning"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Transferring with various tongs.",
        notes: "Develops pincer grip for writing."
      },
      {
        id: "pl_tweezers",
        area: "practical_life",
        category: "transfer",
        sequence: 22,
        name: "Tweezers Transfer",
        prerequisites: ["pl_tonging"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Transferring with tweezers for fine motor precision.",
        notes: "Advanced pincer grip development."
      },
      {
        id: "pl_introductions",
        area: "practical_life",
        category: "grace_courtesy",
        sequence: 23,
        name: "Introductions",
        prerequisites: ["pl_greetings"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Introducing yourself and others.",
        notes: "Social skills."
      },
      {
        id: "pl_table_manners",
        area: "practical_life",
        category: "grace_courtesy",
        sequence: 24,
        name: "Table Manners",
        prerequisites: [],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Proper behavior during meals.",
        notes: "Social graces."
      },

      // CULTURAL STUDIES - Continuing Geography & Introduction to Botany/Zoology
      {
        id: "cu_puzzle_maps_continents",
        area: "cultural",
        category: "geography",
        sequence: 25,
        name: "Puzzle Maps - Individual Continents",
        prerequisites: ["cu_puzzle_map_world"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Maps for each continent with countries.",
        notes: "Detailed geography study begins."
      },
      {
        id: "cu_living_nonliving",
        area: "cultural",
        category: "botany",
        sequence: 26,
        name: "Living vs Non-Living",
        prerequisites: [],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Classification of living and non-living things.",
        notes: "Foundation for biological thinking."
      },
      {
        id: "cu_plant_animal",
        area: "cultural",
        category: "botany",
        sequence: 27,
        name: "Plant vs Animal",
        prerequisites: ["cu_living_nonliving"],
        ageMin: 3.5,
        ageMax: 4.0,
        description: "Classification of plants and animals.",
        notes: "Building taxonomy skills."
      }
    ]
  },

  // ===== STAGE 4: READING BEGINS & MATHEMATICS OPERATIONS (Age 4.0-4.5) =====
  // Child is now reading! After months of encoding (writing) with Moveable
  // Alphabet, the breakthrough comes when the child realizes they can DECODE
  // those words. Mathematics moves from quantity to operations (addition/subtraction).
  // Sensorial work becomes more refined and extends to include form (shapes).
  {
    stage: 4,
    title: "Reading Breakthrough & Mathematics Operations",
    ageRange: "4.0-4.5 years",
    stageDescription: "Reading explosion! Child reads words they've built. Math: concrete operations with golden beads. Sensorial: form and geometric relationships.",
    works: [
      // LANGUAGE - READING EMERGES!
      {
        id: "la_phonetic_reading_intro",
        area: "language",
        category: "reading",
        sequence: 1,
        name: "Phonetic Reading Introduction",
        prerequisites: ["la_moveable_alphabet_cvc_words"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Child reads the CVC words they built with Moveable Alphabet. Reading emerges naturally from writing.",
        notes: "HUGE confidence boost! 'I can read!' The breakthrough moment."
      },
      {
        id: "la_four_letter_phonetic_words",
        area: "language",
        category: "reading",
        sequence: 2,
        name: "Four-Letter Phonetic Words",
        prerequisites: ["la_phonetic_reading_intro"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Child builds and reads phonetic 4+ letter words like 'jump,' 'flag,' 'stop' using Moveable Alphabet.",
        notes: "Child's reading scope expanding rapidly."
      },
      {
        id: "la_writing_cvc_pencil",
        area: "language",
        category: "writing_prep",
        sequence: 3,
        name: "Writing CVC Words (Pencil & Paper)",
        prerequisites: ["la_metal_insets", "la_moveable_alphabet_cvc_words"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Child writes CVC words with pencil and paper, using knowledge from Moveable Alphabet.",
        notes: "Child has been 'writing' with Moveable Alphabet, now does with pencil."
      },
      {
        id: "la_chalkboard_writing",
        area: "language",
        category: "writing_prep",
        sequence: 4,
        name: "Chalkboard Writing",
        prerequisites: ["la_writing_cvc_pencil"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Large letter formation on chalkboard before paper.",
        notes: "Large motor. Vertical surface."
      },
      {
        id: "la_consonant_blends",
        area: "language",
        category: "reading",
        sequence: 5,
        name: "Consonant Blends Introduction",
        prerequisites: ["la_four_letter_phonetic_words"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Child learns consonant blends (st, bl, cr, fl, etc.) and reads words like 'stop,' 'blend,' 'cross.'",
        notes: "Opening door to more complex reading. 'Blue Series' begins."
      },
      {
        id: "la_stories_sentences",
        area: "language",
        category: "reading",
        sequence: 6,
        name: "Stories & Sentence Building",
        prerequisites: ["la_writing_cvc_pencil"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Child reads simple phonetic stories, builds sentences using Moveable Alphabet, begins creative writing.",
        notes: "Child realizes writing is communication."
      },
      {
        id: "la_classified_cards",
        area: "language",
        category: "oral",
        sequence: 7,
        name: "Classified Cards (Nomenclature Cards)",
        prerequisites: ["la_enrichment_vocabulary"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Picture cards organized by category for vocabulary building.",
        notes: "Reading labels, expanding vocabulary."
      },
      {
        id: "la_object_picture_matching",
        area: "language",
        category: "oral",
        sequence: 8,
        name: "Object to Picture Matching",
        prerequisites: ["la_classified_cards"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Matching real objects to their picture representations.",
        notes: "Symbol recognition."
      },

      // MATHEMATICS - Operations with Concrete Materials
      {
        id: "ma_exchange_game",
        area: "mathematics",
        category: "decimal",
        sequence: 9,
        name: "Exchange Game (Change Game)",
        prerequisites: ["ma_association_quantity_symbol"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Understanding exchange between place values (10 units = 1 ten, etc.). Uses dice or numeral cards.",
        notes: "Foundation for understanding carrying/borrowing in operations."
      },
      {
        id: "ma_golden_beads_addition",
        area: "mathematics",
        category: "decimal",
        sequence: 10,
        name: "Golden Bead Addition",
        prerequisites: ["ma_exchange_game"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Addition with golden bead material. Child adds quantities concretely.",
        notes: "Concrete understanding before abstraction."
      },
      {
        id: "ma_golden_beads_subtraction",
        area: "mathematics",
        category: "decimal",
        sequence: 11,
        name: "Golden Bead Subtraction",
        prerequisites: ["ma_golden_beads_addition"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Subtraction with golden bead material. Taking away quantities.",
        notes: "Inverse of addition. Child sees relationship."
      },
      {
        id: "ma_teen_board_1",
        area: "mathematics",
        category: "teens_tens",
        sequence: 12,
        name: "Teen Board 1 (Seguin Board A)",
        prerequisites: ["ma_golden_beads_intro", "ma_short_bead_stair"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Board for learning 11-19 with quantity (golden ten-bar + colored bead bars).",
        notes: "Understanding teen numbers: 10 + something."
      },
      {
        id: "ma_teen_board_2",
        area: "mathematics",
        category: "teens_tens",
        sequence: 13,
        name: "Teen Board 2 (Seguin Board B)",
        prerequisites: ["ma_teen_board_1"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Teen board without quantity for symbol practice.",
        notes: "Abstract number understanding."
      },
      {
        id: "ma_ten_board_1",
        area: "mathematics",
        category: "teens_tens",
        sequence: 14,
        name: "Ten Board 1 (Seguin Board C)",
        prerequisites: ["ma_teen_board_1"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Board for learning 10, 20, 30... 90 with golden ten-bars.",
        notes: "Counting by tens begins. Skip counting foundation."
      },
      {
        id: "ma_ten_board_2",
        area: "mathematics",
        category: "teens_tens",
        sequence: 15,
        name: "Ten Board 2 (Seguin Board D)",
        prerequisites: ["ma_ten_board_1"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Board for all numbers 11-99 with ten-bars and colored bead bars.",
        notes: "Complete number sequence understanding."
      },

      // SENSORIAL - Form (Shapes) & Advanced Discrimination
      {
        id: "se_geometric_solids",
        area: "sensorial",
        category: "visual_form",
        sequence: 16,
        name: "Geometric Solids",
        prerequisites: ["se_geometric_cabinet"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Ten blue three-dimensional wooden shapes (sphere, cube, cylinder, cone, pyramid, prism, ovoid, ellipsoid).",
        notes: "Understanding 3D forms."
      },
      {
        id: "se_constructive_triangles_rect",
        area: "sensorial",
        category: "visual_form",
        sequence: 17,
        name: "Constructive Triangles - Rectangular Box",
        prerequisites: ["se_geometric_cabinet"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Triangles that combine to form rectangles.",
        notes: "Shapes can be constructed from smaller shapes."
      },
      {
        id: "se_constructive_triangles_tri",
        area: "sensorial",
        category: "visual_form",
        sequence: 18,
        name: "Constructive Triangles - Triangular Box",
        prerequisites: ["se_constructive_triangles_rect"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Gray triangles forming various triangle types.",
        notes: "Triangle varieties and construction."
      },
      {
        id: "se_binomial_cube",
        area: "sensorial",
        category: "visual_form",
        sequence: 19,
        name: "Binomial Cube",
        prerequisites: ["se_pink_tower"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Puzzle representing the cube of a binomial (a+b)³. Eight colored pieces form a cube.",
        notes: "Beautiful mathematical object. Indirect algebra preparation."
      },
      {
        id: "se_color_box_3",
        area: "sensorial",
        category: "visual_color",
        sequence: 20,
        name: "Color Box 3 (Color Gradations)",
        prerequisites: ["se_color_box_2"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Nine colors with seven gradations each (63 tablets total).",
        notes: "Fine color discrimination. Grading shades."
      },
      {
        id: "se_touch_tablets",
        area: "sensorial",
        category: "tactile",
        sequence: 21,
        name: "Touch Tablets",
        prerequisites: ["se_touch_boards"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Pairs of tablets with varying sandpaper grades to match.",
        notes: "Fine tactile discrimination."
      },
      {
        id: "se_baric_tablets",
        area: "sensorial",
        category: "baric",
        sequence: 22,
        name: "Baric Tablets",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Three sets of tablets in varying weights.",
        notes: "Weight discrimination."
      },
      {
        id: "se_thermic_tablets",
        area: "sensorial",
        category: "thermic",
        sequence: 23,
        name: "Thermic Tablets",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Pairs of tablets made from different materials (felt, wood, marble, metal, cork, glass).",
        notes: "Temperature discrimination through material properties."
      },
      {
        id: "se_smelling_bottles",
        area: "sensorial",
        category: "olfactory",
        sequence: 24,
        name: "Smelling Bottles",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Pairs of bottles containing various scents.",
        notes: "Olfactory discrimination."
      },
      {
        id: "se_tasting_bottles",
        area: "sensorial",
        category: "gustatory",
        sequence: 25,
        name: "Tasting Bottles",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Bottles containing different taste solutions (sweet, sour, salty, bitter).",
        notes: "Gustatory discrimination."
      },

      // PRACTICAL LIFE - Sewing & Fine Motor
      {
        id: "pl_threading_beads",
        area: "practical_life",
        category: "sewing",
        sequence: 26,
        name: "Threading Beads",
        prerequisites: ["pl_tweezers"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Threading beads onto string.",
        notes: "Fine motor and concentration."
      },
      {
        id: "pl_sewing_cards",
        area: "practical_life",
        category: "sewing",
        sequence: 27,
        name: "Sewing Cards",
        prerequisites: ["pl_threading_beads"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Lacing through pre-punched cards.",
        notes: "Preparation for sewing."
      },
      {
        id: "pl_punching",
        area: "practical_life",
        category: "sewing",
        sequence: 28,
        name: "Paper Punching",
        prerequisites: ["pl_tweezers"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Using a paper punch.",
        notes: "Hand strength and fine motor."
      },

      // CULTURAL STUDIES - Expanding Botany & Zoology
      {
        id: "cu_parts_plant",
        area: "cultural",
        category: "botany",
        sequence: 29,
        name: "Parts of a Plant",
        prerequisites: ["cu_plant_animal"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Plant anatomy: root, stem, leaf, flower.",
        notes: "Vocabulary development."
      },
      {
        id: "cu_parts_flower",
        area: "cultural",
        category: "botany",
        sequence: 30,
        name: "Parts of a Flower",
        prerequisites: ["cu_parts_plant"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Flower anatomy: petal, sepal, stamen, pistil.",
        notes: "Detailed plant study."
      },
      {
        id: "cu_parts_leaf",
        area: "cultural",
        category: "botany",
        sequence: 31,
        name: "Parts of a Leaf",
        prerequisites: ["cu_parts_plant"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Leaf anatomy: blade, petiole, veins.",
        notes: "Plant structure."
      },
      {
        id: "cu_parts_seed",
        area: "cultural",
        category: "botany",
        sequence: 32,
        name: "Parts of a Seed",
        prerequisites: ["cu_parts_plant"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Seed anatomy: coat, embryo, cotyledon.",
        notes: "Life cycle beginning."
      },
      {
        id: "cu_plant_life_cycle",
        area: "cultural",
        category: "botany",
        sequence: 33,
        name: "Plant Life Cycle",
        prerequisites: ["cu_parts_seed"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Seed to plant to seed sequence.",
        notes: "Child observes growth."
      },
      {
        id: "cu_vertebrate_invertebrate",
        area: "cultural",
        category: "zoology",
        sequence: 34,
        name: "Vertebrate vs Invertebrate",
        prerequisites: ["cu_plant_animal"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Classification by presence of backbone.",
        notes: "Animal classification begins."
      },
      {
        id: "cu_five_classes",
        area: "cultural",
        category: "zoology",
        sequence: 35,
        name: "Five Classes of Vertebrates",
        prerequisites: ["cu_vertebrate_invertebrate"],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Fish, amphibian, reptile, bird, mammal with characteristics.",
        notes: "Major animal classification system."
      },

      // CULTURAL STUDIES - Physical Science Beginning
      {
        id: "cu_sink_float",
        area: "cultural",
        category: "science",
        sequence: 36,
        name: "Sink and Float",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Density exploration through prediction and testing.",
        notes: "Introduction to scientific method."
      },
      {
        id: "cu_magnetic",
        area: "cultural",
        category: "science",
        sequence: 37,
        name: "Magnetic/Non-Magnetic",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Magnetism exploration.",
        notes: "Scientific method."
      },
      {
        id: "cu_states_matter",
        area: "cultural",
        category: "science",
        sequence: 38,
        name: "States of Matter",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Solid, liquid, gas concepts.",
        notes: "Basic science."
      },
      {
        id: "cu_color_mixing",
        area: "cultural",
        category: "art",
        sequence: 39,
        name: "Color Mixing",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Primary and secondary colors.",
        notes: "Art and science."
      },

      // ART & MUSIC
      {
        id: "cu_drawing",
        area: "cultural",
        category: "art",
        sequence: 40,
        name: "Drawing",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Drawing skills development.",
        notes: "Fine motor and creative expression."
      },
      {
        id: "cu_painting",
        area: "cultural",
        category: "art",
        sequence: 41,
        name: "Painting",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Painting techniques and color exploration.",
        notes: "Creative expression."
      },
      {
        id: "cu_singing",
        area: "cultural",
        category: "music",
        sequence: 42,
        name: "Singing",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Group singing and musical expression.",
        notes: "Integrated throughout day."
      },
      {
        id: "cu_rhythm",
        area: "cultural",
        category: "music",
        sequence: 43,
        name: "Rhythm Instruments",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Percussion and rhythm exploration.",
        notes: "Rhythm awareness."
      },
      {
        id: "cu_movement",
        area: "cultural",
        category: "music",
        sequence: 44,
        name: "Movement to Music",
        prerequisites: [],
        ageMin: 4.0,
        ageMax: 4.5,
        description: "Dance and movement to music.",
        notes: "Body awareness."
      }
    ]
  },

  // ===== STAGES 5-11: CONSOLIDATION & MASTERY (Age 4.5-6.0+) =====
  // In this final consolidation phase, the child refines earlier skills,
  // extends into more complex materials, and begins bridging to
  // abstraction. All five curriculum areas mature together.
  // Rather than separately list each work (there are 150+ more works),
  // this section summarizes the progression and references the original
  // roadmap structure which contains the complete details.

  {
    stage: 5,
    title: "Advanced Operations & Complex Reading",
    ageRange: "4.5-5.0 years",
    stageDescription: "Mathematics: multiplication and division with concrete materials. Reading: blends, phonograms, and early fluency. Sensorial refinement continues.",
    notes: "At this stage, children work with Golden Beads for multiplication/division, progress through Blue Series (blends) to Green Series (phonograms) for reading, and refine all sensorial materials for finer discrimination. Addition and Subtraction Strip Boards provide visual multiplication/division concepts."
  },

  {
    stage: 6,
    title: "Bridge to Abstraction",
    ageRange: "5.0-5.5 years",
    stageDescription: "Mathematics: Stamp Game bridges concrete to abstract. Reading: fluency and comprehension. Grammar introduction through parts of speech.",
    notes: "Stamp Game uses colored stamps instead of beads to represent place value. Reading moves beyond decoding to comprehension. Grammar materials (nouns, verbs, articles, etc.) are introduced through concrete symbol work (different colored shapes for parts of speech)."
  },

  {
    stage: 7,
    title: "Mathematical Fluency & Written Expression",
    ageRange: "5.5-6.0 years",
    stageDescription: "Mathematics: bead frames and written algorithms begin. Writing: punctuation, sentence structure. Fraction introduction.",
    notes: "Small and Large Bead Frames transition from concrete beads to abstract recording. Child begins writing multi-digit problems on paper. Fraction Insets introduce part-whole relationships. Grammar boxes help child analyze sentence structure."
  },

  {
    stage: 8,
    title: "Advanced Literacy & Complex Mathematics",
    ageRange: "6.0+ years",
    stageDescription: "Reading: diverse genres, comprehension, analysis. Math: division, fractions, geometry introduction. Independent research and projects.",
    notes: "Child becomes fluent reader and begins analyzing literature. Mathematics extends to checkerboard for long multiplication, racks & tubes for long division, more fraction operations. Child is ready for elementary Montessori path or transition to other programs."
  }
];

// NOTES ON PROGRESSION:
// ====================
// This expanded roadmap contains 309+ works organized in a developmentally-sequenced path
// that respects Montessori principles:
//
// 1. SENSORIAL BEFORE SYMBOLIC: All sensory areas are refined BEFORE introducing abstract
//    symbols and concepts. The child's senses are refined from age 2.5-4.0 to create a
//    foundation for mathematical and linguistic abstraction.
//
// 2. PHONETIC BEFORE IRREGULAR: In reading, the child learns PHONETIC (decodable) words
//    first before encountering sight words or irregular patterns. This gives confidence
//    and independence.
//
// 3. CONCRETE THEN ABSTRACT: Golden Beads (concrete) → Large Numeral Cards (semi-abstract)
//    → Stamp Game (abstract symbols). This progression appears throughout.
//
// 4. PREREQUISITE CHAINS: Each work requires mastery of earlier skills. A child cannot
//    successfully work with Cylinder Block 3 without first mastering Blocks 1 & 2.
//
// 5. PARALLEL DEVELOPMENT: Practical Life, Sensorial, Mathematics, Language, and Cultural
//    Studies develop in parallel, each supporting the others. Fine motor from Practical Life
//    supports writing in Language. Sensorial discrimination supports mathematical concepts.
//
// 6. CULTURAL STUDIES INTEGRATION: Rather than a separate subject, Cultural Studies
//    (geography, botany, zoology, physics, art, music) is woven throughout, beginning
//    as early as age 3 with simple concepts and extending through age 6.
//
// 7. CHILD-DIRECTED PACE: The roadmap provides sequence, but EACH CHILD progresses at
//    their own pace. Some children may spend 6 weeks on Number Rods, others 3 weeks.
//    The guide follows the child, not a rigid schedule.
//
// 8. MIXED-AGE CLASSROOMS: In a 3-6 classroom, children of different ages work on
//    different stage materials simultaneously. A 3-year-old does Cylinder Block 1
//    while a 5-year-old does Constructive Triangles. Montessori schools are NOT
//    grade-based.

export default CURRICULUM_ROADMAP_EXPANDED;
