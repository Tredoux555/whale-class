import type { WorkSignature, ConfusionPair } from './work-signatures';

// 45 Language works - CLIP visual descriptions (escaped apostrophes verified)
export const LANGUAGE_SIGNATURES: WorkSignature[] = [
  // ===== ORAL LANGUAGE DEVELOPMENT =====
  {
    work_key: 'la_enrichment_vocabulary',
    name: 'Vocabulary Enrichment',
    area_key: 'language',
    category: 'Oral Language Development',
    visual_description: 'COLLECTION of REAL 3D CLASSROOM OBJECTS in NATURAL LIGHTING displayed on a WOODEN TRAY or TABLE SURFACE—scissors with SILVER metal blades and PLASTIC handles, pencil with POINTED graphite tip and WOODEN barrel, ERASER in PINK rubber form, CERAMIC or PLASTIC cup in LIGHT COLOR, WOODEN spoon with SMOOTH GRAIN, METAL fork with SHINY SILVER tines. Each object is FULLY 3-DIMENSIONAL, ISOLATED from others with CLEAR SPACING. Child\'s HAND holding or TOUCHING individual object, FINGER POINTING at specific part, MOUTH OPEN mid-speech engaging in VOCABULARY NAMING. Adult or teacher at child\'s EYE LEVEL with ATTENTIVE LISTENING POSTURE, NOT lecturing but RESPONSIVE to child\'s utterances.',
    key_materials: ['Scissors metal/plastic', 'Pencils with erasers', 'Ceramic cups', 'Wooden utensils', 'Metal forks and spoons'],
    confusion_pairs: [
      {
        work_key: 'la_object_picture_matching',
        reason: 'Both show REAL OBJECTS and CHILDREN engaged with them, but Vocabulary Enrichment shows classroom objects with HAND engagement while Object Matching shows MINIATURE objects paired with picture cards',
        differentiation: 'Vocabulary Enrichment shows FULL-SIZE classroom objects (SCISSORS, PENCIL, CUP, SPOON). Object Matching shows MINIATURE 1.5-2 inch objects with MATCHING illustrations.'
      }
    ],
    negative_descriptions: [
      'NOT picture cards or illustrations - these are REAL 3D objects',
      'NOT a single object - multiple classroom items arranged',
      'NOT abstract concept or vocabulary building chart'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_classified_cards',
    name: 'Classified Cards (Nomenclature Cards)',
    area_key: 'language',
    category: 'Oral Language Development',
    visual_description: 'LAMINATED PICTURE CARDS (precisely 2x3 inches, glossy CARD STOCK surface) ORGANIZED IN NEAT ROWS or STACKS by SEMANTIC CATEGORY on a WORK MAT. Each card displays ONE CLEAR PHOTOGRAPHIC or ILLUSTRATED IMAGE: BROWN DOG facing forward with clear ears, ORANGE CAT sitting upright, BLUE BIRD in profile, RED FIRE TRUCK with visible wheels, SCHOOL BUS in bright YELLOW, colorful CLOTHING ITEMS (BLUE shirt, RED pants, GREEN hat). Illustrations rendered in BRIGHT SATURATED COLORS on PURE WHITE BACKGROUND with NO background clutter. Child\'s FINGERS SEPARATING cards from stack, THUMB and FOREFINGER pinching card edges, EYES SCANNING card details. Cards laying FLAT on table surface in ORGANIZED ARRANGEMENT by category.',
    key_materials: ['Laminated picture cards 2x3 inches', 'Card sets by animal/vehicle/clothing categories', 'Card baskets or wooden trays'],
    confusion_pairs: [
      {
        work_key: 'la_pink_object_box',
        reason: 'Both involve PICTURE CARDS with objects and ORGANIZED arrangement, but Classified Cards show only ILLUSTRATIONS while Pink Object Box shows MINIATURE 3D objects with matching cards',
        differentiation: 'Classified Cards show LAMINATED PICTURE ILLUSTRATIONS of objects (NOT real). Pink Object Box shows REAL CERAMIC MINIATURES alongside matching picture cards.'
      }
    ],
    negative_descriptions: [
      'NOT 3-part cards which have label + picture + control card',
      'NOT picture-word cards showing both image and written word',
      'NOT miniature objects - these are picture illustrations only'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_object_picture_matching',
    name: 'Object to Picture Matching',
    area_key: 'language',
    category: 'Oral Language Development',
    visual_description: 'MINIATURE 3D OBJECTS (1.5-2 inches tall, CERAMIC or HARD PLASTIC construction with FINE DETAIL work) arranged in NEAT ROWS on WHITE WORK SURFACE alongside MATCHING COLOR ILLUSTRATION CARDS. Miniatures include REALISTIC DOG figurine with BROWN SPOTS and POINTED EARS, TINY RED CAR with BLACK wheels and CHROME details, SMALL CUP with HANDLE in CERAMIC white. Picture cards show IDENTICAL objects as COLOR ILLUSTRATIONS (NOT photographs—hand-drawn style). Clear SPATIAL PAIRING with each 3D object positioned DIRECTLY NEXT TO matching illustration card. Child\'s HAND REACHING or HOVERING toward object, FINGERS TOUCHING miniature surface showing tactile engagement. Strong CAST SHADOWS visible under miniatures demonstrating 3D form and OBJECT DEPTH.',
    key_materials: ['Ceramic miniature objects animals/vehicles/household', 'Matching picture illustration cards', 'White wooden work trays'],
    confusion_pairs: [
      {
        work_key: 'la_classified_cards',
        reason: 'Both show OBJECTS and PICTURES together in organized layout, but Object Matching has MINIATURE 3D objects while Classified Cards show only flat picture illustrations',
        differentiation: 'Object Matching shows TACTILE MINIATURE CERAMIC 3D objects paired with cards. Classified Cards show only flat LAMINATED PICTURE ILLUSTRATIONS without 3D objects.'
      }
    ],
    negative_descriptions: [
      'NOT classified cards which show only pictures',
      'NOT 3D objects without matching picture cards',
      'NOT full-size real objects - these are MINIATURES'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_sound_games',
    name: 'Sound Games (I Spy)',
    area_key: 'language',
    category: 'Oral Language Development',
    visual_description: 'WOVEN BASKET or WOODEN TRAY containing 12-15 SMALL OBJECTS with DISTINCT INITIAL PHONETIC SOUNDS: CERAMIC muffin figurine, PLASTIC apple, STUFFED bear, WOODEN dog, CERAMIC cat, PLASTIC fan with ROTATING blades, WOODEN sun shape, WOODEN or METAL pen, FELT mouse, BROWN rat figurine, CERAMIC pig, BRIGHT YELLOW sun, WOODEN pen holder, SMALL CARD with word. Objects are TEXTURED with REALISTIC DETAIL (embossed patterns, CARVED grain, MOLDED features). Child\'s RIGHT INDEX FINGER POINTING DIRECTLY at selected object while MOUTH SHAPES INITIAL SOUND aloud (/m/ for muffin, /b/ for bear). CLASSROOM BACKGROUND visible with SHELVING and other materials. Multiple OBJECT DISPLACEMENT visible showing child making multiple selections.',
    key_materials: ['Sound objects in woven basket', 'Objects with distinct initial consonants and vowels', 'Classroom shelf setting'],
    confusion_pairs: [
      {
        work_key: 'la_enrichment_vocabulary',
        reason: 'Both feature REAL CLASSROOM OBJECTS arranged in organized settings with children TOUCHING/POINTING, but Sound Games focuses on PHONETIC SOUNDS while Vocabulary Enrichment focuses on OBJECT NAMING',
        differentiation: 'Sound Games shows FINGER POINTING at object while PRONOUNCING INITIAL SOUND (/m/, /b/). Vocabulary Enrichment shows CHILD TOUCHING object while NAMING the whole object (scissors, pencil, cup).'
      }
    ],
    negative_descriptions: [
      'NOT picture-based sound matching - these are REAL 3D objects',
      'NOT letter cards or phonograms',
      'NOT rhyming activities which match end sounds'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_rhyming',
    name: 'Rhyming Activities',
    area_key: 'language',
    category: 'Oral Language Development',
    visual_description: 'PICTURE CARDS or CERAMIC MINIATURE OBJECTS showing RHYMING PAIRS (cat wearing PURPLE hat, DOG near BROWN log, BRIGHT sun above BUN on plate, SILVER moon and WOODEN spoon) arranged in DISTINCT PAIRS on WORK MAT. Cards are 2x3 inches with LARGE COLORFUL ILLUSTRATIONS of single FAMILIAR objects. Child\'s HANDS holding TWO MATCHING RHYME cards between THUMB and FOREFINGER, holding cards NEAR MOUTH as if SPEAKING words aloud. FACIAL EXPRESSION showing CONCENTRATION on SOUND SIMILARITY. Card pairs spatially separated in ORGANIZED GROUPINGS, with CLEAR SPACE between different rhyme sets. Visual shows progression from HOLDING to SPEAKING to MATCHING.',
    key_materials: ['Rhyming picture card pairs', 'Ceramic rhyming object sets', 'Rhyming matching baskets'],
    confusion_pairs: [
      {
        work_key: 'la_sound_games',
        reason: 'Both involve sound-focused language activities with objects/cards, but Rhyming matches END sounds while Sound Games matches INITIAL sounds',
        differentiation: 'Rhyming shows cards PAIRED together (cat-hat, sun-bun) emphasizing matching END SOUNDS. Sound Games shows INDIVIDUAL objects emphasizing matching INITIAL SOUNDS (/m/, /b/).'
      }
    ],
    negative_descriptions: [
      'NOT initial sound games which focus on first sound',
      'NOT phonogram introduction which teaches letter combinations',
      'NOT single objects - these are PAIRS matching by END sound'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_storytelling',
    name: 'Storytelling and Sequencing',
    area_key: 'language',
    category: 'Oral Language Development',
    visual_description: 'SEQUENCE CARDS (set of 4-6 LAMINATED cards, each 3x4 inches) showing CLEAR NARRATIVE PROGRESSION with BRIGHT CARTOON-STYLE ILLUSTRATIONS (NOT photographs, hand-drawn expressiveness): CHILD IN BED with EYES CLOSED and PILLOW (morning waking), CHILD AT TABLE with BOWL and SPOON (breakfast eating), CHILD GETTING DRESSED with SHIRT and PANTS pulled halfway on, CHILD WALKING through DOORWAY with BACKPACK. Each card depicts ONE DISTINCT ACTION with MINIMAL background detail. Cards LAID OUT in LINEAR LEFT-TO-RIGHT sequence on TABLE SURFACE with SPACE between each card for clarity. Child\'s HAND POINTING to each card IN SEQUENCE while MOUTH MOVES mid-speech creating narrative flow. Story ACTION is OBVIOUS and SEQUENTIAL with clear VISUAL TRANSITIONS.',
    key_materials: ['Story sequence cards 3x4 inches', 'Laminated narrative cards with 4-6 scenes', 'Felt board optional for manipulation'],
    confusion_pairs: [
      {
        work_key: 'la_poems_songs',
        reason: 'Both involve NARRATIVE engagement with GROUP of children, but Storytelling shows SEQUENTIAL picture CARDS requiring ORDERING while Poems/Songs show LYRICS on poster for RECITATION',
        differentiation: 'Storytelling shows SEQUENCE CARDS laid out left-to-right requiring child to ORDER events. Poems/Songs show LYRICS POSTER with children SINGING/RECITING words aloud together.'
      }
    ],
    negative_descriptions: [
      'NOT individual picture cards without sequence relationship',
      'NOT written story text or chapter books',
      'NOT phonogram or reading practice cards'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_poems_songs',
    name: 'Poems, Songs, and Fingerplays',
    area_key: 'language',
    category: 'Oral Language Development',
    visual_description: 'LARGE POSTER or CHART (visible from 6+ feet classroom distance, approximately 24x36 inches) showing SONG or POEM LYRICS in BOLD BLACK TEXT (14-18pt font, SANS-SERIF for clarity) with COLORFUL ILLUSTRATED BORDERS featuring NATURE motifs (flowers, leaves, butterflies, birds). Chart mounted on STURDY FOAM BOARD or LAMINATED PAPER backing, POSITIONED at child\'s EYE LEVEL or slightly above. Teacher or MULTIPLE CHILDREN POINTING to WORDS with FINGER or WOODEN POINTER STICK while SINGING or RECITING in UNISON. Children\'s HANDS performing COORDINATED FINGERPLAY MOTIONS: TOUCHING forehead, CLAPPING palms together, ARMS RAISED overhead, TOUCHING nose tip, CROSSING arms over chest. Group of 2-5 CHILDREN visible with OPEN MOUTHS and ENGAGED FACIAL EXPRESSIONS. Chart is BRIGHTLY COLORED with CLEAR READABILITY and PROMINENT POSITIONING.',
    key_materials: ['Song poster or chart 24x36 inches', 'Poetry cards with colorful borders', 'Wooden pointer stick'],
    confusion_pairs: [
      {
        work_key: 'la_storytelling',
        reason: 'Both involve GROUP engagement with NARRATIVE, but Poems/Songs show LYRICS with GROUP SINGING while Storytelling shows SEQUENCE CARDS requiring ORDER CREATION',
        differentiation: 'Poems/Songs show LARGE POSTER with LYRICS, children POINTING and SINGING/RECITING. Storytelling shows individual SEQUENCE CARDS that child ARRANGES in order.'
      }
    ],
    negative_descriptions: [
      'NOT single-child quiet reading activity',
      'NOT silent or solo recitation',
      'NOT handwriting or writing practice'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_conversation',
    name: 'Conversation and Discussion',
    area_key: 'language',
    category: 'Oral Language Development',
    visual_description: 'SMALL INTIMATE GROUP of 2-4 CHILDREN sitting in CIRCLE FORMATION on CARPETED FLOOR or in LOW WOODEN CHAIRS, POSITIONED so ALL PARTICIPANTS are FACING each other at EQUAL EYE LEVEL. NO TABLE between speakers—completely unobstructed INTERPERSONAL SPACE. Child\'s MOUTH OPEN mid-speech with VISIBLE TONGUE and LIP MOVEMENT. HAND GESTURES prominently displayed: HANDS RAISED in animated discussion, FINGERS POINTING to reference objects, PALMS FACING outward for emphasis, ARMS MOVING expressively. ADULT sitting at child\'s HEIGHT on same level, displaying ATTENTIVE LISTENING POSTURE with LEANED-IN TORSO and DIRECT EYE CONTACT. INFORMAL CLASSROOM SETTING with SHELVING visible in background. INTIMATE COMPOSITION showing FACES, EYE CONTACT, and ENGAGED BODY LANGUAGE. NOT formal presentation, NOT lecture format, NOT one-way communication.',
    key_materials: ['Circle discussion area on floor', 'Low wooden chairs or cushions', 'Conversation starter prompts'],
    confusion_pairs: [
      {
        work_key: 'la_poems_songs',
        reason: 'Both are GROUP language activities, but Conversation is DISCUSSION in small CIRCLE facing each other while Poems/Songs is GROUP recitation facing a POSTER',
        differentiation: 'Conversation shows INTIMATE CIRCLE formation with all FACING each other, HANDS GESTURING, NATURAL talk flow. Poems/Songs shows children GROUPED before a POSTER, POINTING and SINGING together.'
      }
    ],
    negative_descriptions: [
      'NOT structured group lesson with all children facing one direction',
      'NOT formal presentation where child faces audience',
      'NOT individual child speaking to adult one-on-one'
    ],
    difficulty: 'easy',
  },

  // ===== WRITING PREPARATION =====
  {
    work_key: 'la_metal_insets',
    name: 'Metal Insets',
    area_key: 'language',
    category: 'Writing Preparation',
    visual_description: 'SET of 10 GEOMETRIC METAL FRAMES (SHINY BRASS or POLISHED STEEL with REFLECTIVE surface) in PERFECT GEOMETRIC SHAPES: circle, square, triangle, rectangle, oval, diamond, pentagon, hexagon, star with POINTED rays, and trapezoid. Each frame mounted on WOODEN base (approximately 14cm square), with MATCHING CUT-OUT INSET PIECE stored in SAME base. Metal shows BRIGHT REFLECTIONS of CLASSROOM LIGHT. Child\'s PENCIL HELD in PROPER TRIPOD GRIP (THUMB and INDEX+MIDDLE fingers) with SHARPENED GRAPHITE TIP. Pencil DRAWING COLORED PENCIL LINES (BLUE, RED, YELLOW, GREEN pencils visible) tracing METAL FRAME EDGE on WHITE SPECIAL INSET PAPER below. Completed paper shows CLEAN GEOMETRIC SHAPE OUTLINES with FILL PATTERNS: HORIZONTAL parallel lines perfectly SPACED, VERTICAL lines creating CROSS-HATCH, DIAGONAL lines crossing at consistent ANGLES. Metal frame\'s REFLECTIVE quality clearly visible showing CLASSROOM reflected in surface. Child\'s POSTURE shows FOCUSED CONCENTRATION with SHOULDERS relaxed and EYES CLOSE to work.',
    key_materials: ['Metal inset frames 10 shapes', 'Matching cut-out inset pieces', 'Colored pencil set', 'Specialized inset paper white/cream'],
    confusion_pairs: [
      {
        work_key: 'se_geometric_cabinet',
        reason: 'Both feature GEOMETRIC SHAPES, but Metal Insets are SHINY METAL with PENCIL DRAWING, Geometric Cabinet is WOODEN with COLORED INSETS',
        differentiation: 'Metal Insets show REFLECTIVE METALLIC FRAMES and PENCIL marks on paper. Geometric Cabinet shows WOODEN TRAY with YELLOW GEOMETRIC SHAPES being SORTED.'
      }
    ],
    negative_descriptions: [
      'NOT wooden shape sorter or geometric cabinet with colored pieces',
      'NOT puzzle-type shapes being placed into spaces',
      'NOT magnetic geometry tools'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_sandpaper_letters',
    name: 'Sandpaper Letters',
    area_key: 'language',
    category: 'Writing Preparation',
    visual_description: 'INDIVIDUAL LOWERCASE CURSIVE LETTER (c, m, a, t, s, r, n, o, i, u, e) AFFIXED to FLAT WOODEN or CARDBOARD TABLET BASE (approximately 6x8 inches). ONE LETTER PER TABLET — each tablet is a SEPARATE FLAT BOARD, NOT stored in compartments. LETTER SHAPE entirely constructed from COARSE TEXTURED SANDPAPER (MEDIUM-GRIT sand GLUED firmly to base, visible GRAINY TEXTURE with ROUGHNESS apparent). PINK or RED BASE COLOR for CONSONANTS, BLUE BASE COLOR for VOWELS (clear chromatic distinction). Letter outline is DISTINCT AGAINST BASE with CRISP EDGES. Child\'s INDEX AND MIDDLE FINGER TRACING SANDPAPER LETTER OUTLINE in CORRECT DIRECTION, clearly FEELING the TEXTURED surface with TACTILE PRESSURE visible in FINGER TENSION. CLOSE-UP shows FINGER TIPS directly contacting ROUGH SANDPAPER surface with SKIN INDENTATION visible. Lowercase cursive letters show CONNECTED strokes and FLOWING form. STRONG VISUAL CONTRAST between SMOOTH painted base and ROUGH textured letter. Child\'s FACE often positioned CLOSE to letter, EYES sometimes CLOSED to enhance tactile sensation. CRITICAL: These are FLAT TABLETS with ONE FIXED letter each — NOT a compartmentalized box of loose pieces.',
    key_materials: ['Sandpaper letters lowercase cursive', 'Pink/red consonant bases', 'Blue vowel bases', 'Sandpaper texture medium-grit'],
    confusion_pairs: [
      {
        work_key: 'ma_sandpaper_numerals',
        reason: 'Both are SANDPAPER-textured and TRACED by hand, but LETTERS are ALPHABET symbols while NUMERALS are NUMBERS 0-9',
        differentiation: 'Sandpaper LETTERS are LOWERCASE CURSIVE script (a,b,c,d,...) with PINK/BLUE color-coding. Sandpaper NUMERALS are NUMBER SHAPES (1,2,3,...) with GREEN/ORANGE color-coding.'
      },
      {
        work_key: 'la_moveable_alphabet',
        reason: 'Both involve INDIVIDUAL LETTERS with BLUE/RED color-coding, but Sandpaper Letters are FLAT TABLETS with TEXTURED surface for TRACING while Moveable Alphabet is a COMPARTMENTALIZED BOX of LOOSE SMOOTH pieces for SPELLING',
        differentiation: 'Sandpaper Letters: FLAT TABLET with ONE FIXED rough SANDPAPER letter, child TRACES with FINGER. Moveable Alphabet: LARGE BOX with 26 LABELED COMPARTMENTS full of LOOSE SMOOTH PLASTIC/WOODEN letters, child PICKS UP pieces and ARRANGES them on a MAT to SPELL WORDS.'
      }
    ],
    negative_descriptions: [
      'NOT numerals or numbers - these are ALPHABET LETTERS a-z',
      'NOT a compartmentalized box of loose letter pieces - those are MOVEABLE ALPHABET',
      'NOT wooden shape cutouts without sandpaper texture',
      'NOT printed letter cards',
      'NOT loose moveable pieces being arranged to spell words'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_sand_tray',
    name: 'Sand Tray Writing',
    area_key: 'language',
    category: 'Writing Preparation',
    visual_description: 'WOODEN TRAY (12x18 inches, STAINED DARK BROWN or NATURAL WOOD finish) FILLED completely with FINE SMOOTH COLORED SAND (TAN sand or LIGHT BLUE sand, 2-3 inches DEEP, SURFACE completely LEVEL and SMOOTH). Child\'s FINGER (SINGLE index finger or MULTIPLE fingers) or SMALL WOODEN STICK DRAGGING through sand to FORM LARGE LETTERS (capital and lowercase). CLEAR DARK TRACKS visible in sand showing LETTER SHAPE, with SAND DISPLACED to sides of track showing DEPTH of impression. CLOSE-UP detail shows FINGER-WIDTH GROOVES in sand surface with CLEAN track edges. Multiple LETTER ATTEMPTS visible in SAME tray showing PROGRESSION: some letters COMPLETE and WELL-FORMED, some PARTIALLY erased with GHOSTING visible, some NEW attempts BEGINNING. Sand SURFACE is SMOOTH WITHOUT WATER or moisture. TACTILE IMPRESSION visible showing DEPRESSION DEPTH of 0.5+ inches demonstrating HAND PRESSURE and CONTROL.',
    key_materials: ['Wooden sand tray 12x18 inches', 'Fine smooth colored sand tan/blue', 'Sand tray tools and sticks'],
    confusion_pairs: [
      {
        work_key: 'la_chalkboard_writing',
        reason: 'Both are large-format writing activities using DARK SURFACES and whole-arm movement, but Sand Tray is HORIZONTAL with SMOOTH SAND while Chalkboard is VERTICAL with CHALK',
        differentiation: 'Sand Tray shows HORIZONTAL tray at table with FINE SMOOTH SAND, FINGER making TRACKS. Chalkboard shows VERTICAL mounted board, WHOLE-ARM motion with CHALK, creating bright white LINES on dark surface.'
      }
    ],
    negative_descriptions: [
      'NOT sandpaper letter tracing which has rough texture',
      'NOT chalkboard writing which uses chalk on dark surface',
      'NOT wet sand or water-based activities'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_chalkboard_writing',
    name: 'Chalkboard Writing',
    area_key: 'language',
    category: 'Writing Preparation',
    visual_description: 'WOODEN FRAME or SLATE CHALKBOARD (24x36 inches, MOUNTED on WALL or EASEL at CHILD\'S SHOULDER HEIGHT) with DARK BLACKBOARD surface (MATTE finish, CHALK dust visible). Child\'s ARM FULLY EXTENDED from SHOULDER at approximately 45-degree ANGLE, holding CHALK stick in FINGERTIP grip (NOT pencil grip—whole-arm movement required). LARGE WHITE or COLORED CHALK LINES drawn (WHITE chalk shows BRIGHTEST contrast, COLORED chalk in YELLOW/PINK also visible). Each LETTER is 8+ INCHES TALL per letter stroke. CHALK MARKS show BRIGHT WHITE LINES on DEEP BLACK SURFACE with HIGH CONTRAST. Whole-arm motion is OBVIOUS and VISIBLE—SHOULDER, ELBOW, WRIST all moving together in COORDINATED GROSS-MOTOR movement, NOT just finger movement. CHALK DUST visible suspended in AIR and accumulated on CHILD\'S HAND. WOODEN CHALKBOARD ERASER hanging from STRING on board side. VERTICAL SURFACE positioning shown clearly. Letters are LARGE and LEGIBLE from across CLASSROOM distance.',
    key_materials: ['Wooden or slate chalkboard 24x36 inches', 'Colored chalk sticks white/yellow/pink', 'Wooden chalkboard eraser'],
    confusion_pairs: [
      {
        work_key: 'la_sand_tray',
        reason: 'Both are WRITING preparation activities with LARGE MARKS, but Chalkboard is VERTICAL with WHOLE-ARM CHALK motion while Sand Tray is HORIZONTAL with FINGER TRACKING',
        differentiation: 'Chalkboard shows VERTICAL surface at SHOULDER HEIGHT, BRIGHT WHITE CHALK LINES on black surface, WHOLE-ARM motion from SHOULDER. Sand Tray shows HORIZONTAL table surface, FINE SMOOTH SAND, FINGER-WIDTH GROOVES.'
      }
    ],
    negative_descriptions: [
      'NOT horizontal sand tray writing activity',
      'NOT small pencil writing with tripod grip',
      'NOT personal whiteboard or small surface'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_moveable_alphabet',
    name: 'Moveable Alphabet',
    area_key: 'language',
    category: 'Writing Preparation',
    visual_description: 'LARGE WOODEN COMPARTMENTALIZED BOX (approximately 18x12 inches) with 26 LABELED SECTIONS arranged in rows, each compartment holding MULTIPLE COPIES of the SAME LOOSE PLASTIC or WOODEN LETTER in LOWERCASE CURSIVE form (approximately 2 inches tall each). The BOX WITH COMPARTMENTS is the KEY VISUAL IDENTIFIER — a GRID-LIKE STORAGE SYSTEM full of loose pieces. BLUE CONSONANTS clearly distinct from RED VOWELS—stark COLOR CONTRAST (BLUE letters in compartments B, C, D vs RED letters A, E, I, O, U). Letters are SMOOTH SOLID PIECES (NO sandpaper texture) that can be LIFTED OUT and MOVED freely. Child PULLING individual BLUE or RED letter from COMPARTMENTS and ARRANGING letters on FLAT WORK MAT to SPELL WORDS: C-A-T, D-O-G, R-U-N. Arranged letters show CLEAR COLOR CONTRAST between BLUE consonants and RED vowels in LEFT-TO-RIGHT sequence. Multiple COMPLETED WORDS visible on mat. CRITICAL DIFFERENCE from Sandpaper Letters: Moveable Alphabet has a LARGE BOX FULL OF LOOSE PIECES being ARRANGED to SPELL; Sandpaper Letters are INDIVIDUAL FLAT TABLETS with ONE FIXED TEXTURED letter being TRACED.',
    key_materials: ['Large moveable alphabet box compartmented', 'Blue consonant letter pieces smooth plastic/wood', 'Red vowel letter pieces smooth plastic/wood', 'Work mats for arrangement'],
    confusion_pairs: [
      {
        work_key: 'la_sandpaper_letters',
        reason: 'Both use BLUE consonants and RED vowels color-coding, but Sandpaper Letters are FLAT TABLETS with TEXTURED surface for TRACING while Moveable Alphabet is a COMPARTMENTALIZED BOX of LOOSE SMOOTH pieces for SPELLING',
        differentiation: 'Sandpaper Letters: FLAT TABLET with ONE FIXED rough SANDPAPER letter, child TRACES with FINGER. Moveable Alphabet: LARGE BOX with 26 LABELED COMPARTMENTS full of LOOSE SMOOTH PLASTIC/WOODEN letters, child PICKS UP pieces and ARRANGES them on a MAT to SPELL WORDS.'
      }
    ],
    negative_descriptions: [
      'NOT sandpaper letter tracing activity — NO rough textured surface',
      'NOT individual flat tablets with one fixed letter each',
      'NOT printed letter cards or worksheets',
      'NOT a child tracing a letter with their finger — pieces are PICKED UP and MOVED'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_handwriting_paper',
    name: 'Handwriting on Paper',
    area_key: 'language',
    category: 'Writing Preparation',
    visual_description: 'LINED HANDWRITING PAPER with PRECISELY MEASURED 4-LINE FORMAT: TOP SOLID LINE, MIDDLE DASHED LINE (BASELINE for lowercase body), BOTTOM SOLID LINE, and ADDITIONAL BASELINE showing PROPER letter PROPORTION. Paper is STANDARD 8.5x11 inches WHITE or CREAM COLORED with LIGHT BLUE or GRAY lines. Child\'s HANDWRITTEN lowercase LETTERS positioned CORRECTLY on baseline between BOTTOM and MIDDLE DASHED lines (showing PROPER letter SIZING of 0.5-0.75 inches tall). PENCIL HELD in CORRECT TRIPOD GRIP with THUMB and TWO FINGERS supporting WOODEN #2 PENCIL (SHARPENED graphite visible). Letters show CONSISTENT FORMATION with CONNECTED cursive strokes. PROPER SPACING visible between LETTERS (approximately LETTER WIDTH) and between WORDS (approximately HALF-LETTER WIDTH). Paper shows MULTIPLE LETTERS or simple CVC WORDS (cat, dog, run) written in CHILD\'S natural handwriting. NO CRAYONS or MARKERS—standard GRAPHITE PENCIL only. Light PENCIL MARKS visible where child may have MADE corrections.',
    key_materials: ['Lined handwriting paper 4-line format', 'Standard #2 sharpened pencils', 'Letter formation reference cards'],
    confusion_pairs: [
      {
        work_key: 'la_creative_writing',
        reason: 'Both are PENCIL-BASED writing on paper, but Handwriting Practice shows LINED paper with MODELS while Creative Writing shows BLANK paper with CHILD\'S original composition',
        differentiation: 'Handwriting shows LINED 4-line FORMAT paper with GUIDED BASELINES and child FORMING LETTERS correctly. Creative Writing shows BLANK UNLINED paper with child WRITING original thoughts.'
      }
    ],
    negative_descriptions: [
      'NOT chalkboard large-format writing',
      'NOT sand tray writing activity',
      'NOT printed letter models to trace over'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_creative_writing',
    name: 'Creative Writing',
    area_key: 'language',
    category: 'Writing Preparation',
    visual_description: 'BLANK WRITING JOURNAL or PAGE showing child\'s HANDWRITTEN ORIGINAL COMPOSITION (NOT copying from model, NOT handwriting practice—ORIGINAL authorship). PENCIL-WRITTEN TEXT in child\'s NATURAL HANDWRITING showing INDIVIDUAL letter VARIATIONS and PERSONAL WRITING STYLE. Sentences are SELF-COMPOSED demonstrating ORIGINAL IDEAS and CREATIVE THOUGHT. Lines of text show LEGIBLE SPELLING with CONSISTENT LETTER SPACING. Paper BACKGROUND is PLAIN WHITE without PRINTED lines or GUIDING TEXT. Writing demonstrates CHILD-AUTHORED WORDS—word SELECTIONS reflect CHILD\'S thinking, word ORDER matches CHILD\'S syntax, CONTENT is CHILD\'S original narrative. May include TEACHER\'S LIGHT PENCIL MARKS showing GENTLE CORRECTION or ENCOURAGEMENT (light check marks, arrow indicators—NOT extensive marking). Writing shows ORIGINAL THOUGHT and PERSONAL VOICE, NOT REPEATED TEXT or DICTATION transcription. OVERALL composition shows EMERGING writing CONFIDENCE and VOICE development.',
    key_materials: ['Writing journals bound or loose', 'Blank paper unlined', 'Standard pencils', 'Writing prompt cards optional'],
    confusion_pairs: [
      {
        work_key: 'la_handwriting_paper',
        reason: 'Both are PENCIL-BASED WRITING on paper, but Handwriting Practice focuses on LETTER FORMATION while Creative Writing focuses on ORIGINAL COMPOSITION and VOICE',
        differentiation: 'Handwriting shows LINED paper with child COPYING/FORMING standard letters correctly. Creative Writing shows BLANK paper with child\'s ORIGINAL thoughts, PERSONAL style, NATURAL spelling variations.'
      }
    ],
    negative_descriptions: [
      'NOT handwriting practice copying prescribed letters',
      'NOT lined handwriting paper with guided format',
      'NOT dictation or copying from other text'
    ],
    difficulty: 'medium',
  },

  // ===== READING =====
  {
    work_key: 'la_pink_object_box',
    name: 'Pink Object Box',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'WOODEN BOX with PINK-COLORED ACCENT TRIM containing 20-30 MINIATURE CERAMIC or PLASTIC OBJECTS (approximately 1.5-2 inches tall each) matching CVC (consonant-vowel-consonant) WORDS: SMALL CAT figurine with WHISKERS, BROWN DOG with POINTED EARS, CERAMIC FAN with ROTATING blades, LEATHER or RUBBER BAT, RED CERAMIC MOP, SMALL POT with HANDLE, WOODEN BED, METAL PAN, BROWN RAT figurine, PINK PIG, BRIGHT YELLOW SUN, RED HAT, WOVEN MAT, STRAIGHT PIN, WOODEN PEN. Alongside EACH OBJECT: SMALL LABEL CARD (approximately 2x3 inches) with CVC WORD in LOWERCASE BLACK PRINT (c-a-t, d-o-g, f-a-n, b-a-t). Objects are REALISTIC MINIATURES with FINE DETAIL (embossed patterns, PAINTED features, CLEAR FORM). Labels show CLEAN BLACK TEXT on WHITE CARD STOCK. Child PICKING up individual miniature object, READING label card aloud, CONFIRMING MATCH between object and word. Objects ARRANGED in NEAT ROWS with LABELS clearly VISIBLE. PINK THEME on box EXTERIOR. NOT picture cards—these are PHYSICAL 3-DIMENSIONAL OBJECTS.',
    key_materials: ['Pink object box with miniatures', 'CVC word label cards', 'Wooden tray for object organization'],
    confusion_pairs: [
      {
        work_key: 'la_blue_object_box',
        reason: 'Both are miniature object boxes with label cards, but PINK contains CVC words (3-letter simple) while BLUE contains BLEND words (consonant clusters)',
        differentiation: 'Pink Box shows PINK-TRIMMED box with simple 3-letter CVC words (cat, dog, bat). Blue Box shows BLUE-TRIMMED box with BLEND words (clock, flag, star).'
      },
      {
        work_key: 'la_green_object_box',
        reason: 'Both are miniature object boxes with labels, but PINK is CVC while GREEN is PHONOGRAM words with complex letter patterns',
        differentiation: 'Pink Box shows simple CVC words (c-a-t). Green Box shows PHONOGRAM words (sh-ee-p, tr-ee, sp-oo-n).'
      }
    ],
    negative_descriptions: [
      'NOT picture-only cards without objects',
      'NOT full-size objects',
      'NOT blend words with consonant clusters'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_pink_series',
    name: 'Pink Series (CVC Words)',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'PINK-SPINED READING MATERIALS collection for CVC (consonant-vowel-consonant) WORD reading progression including: PICTURE-WORD CARDS (shows COLORED illustration of cat + word "cat" below), WORD-ONLY CARDS (text only "cat" in lowercase), PHRASE CARDS (text "the cat" or "a cat" on card), SENTENCE CARDS (text "The cat sat." with PERIOD visible), and SMALL ILLUSTRATED BOOKLETS (4-8 pages with ONE simple CVC word or phrase per page). PINK BINDING or COVER SPINE visible on all materials. Simple COLOR ILLUSTRATIONS of CVC OBJECT (cat, dog, bat, mat, pig, sit, hop, run—all common CVC words). Text rendered in LOWERCASE, CLEARLY PRINTED in SANS-SERIF font for LEGIBILITY. Child READING text aloud while FINGER FOLLOWS along LEFT-TO-RIGHT across line. Each page or card shows ONE CVC word or simple phrase. ILLUSTRATED PICTURES match TEXT meaning.',
    key_materials: ['Pink series picture cards', 'Pink series word cards', 'Pink series phrases and sentences', 'Pink series booklets'],
    confusion_pairs: [
      {
        work_key: 'la_blue_series',
        reason: 'Both are reading series with colored spines and progressions, but PINK teaches CVC words while BLUE teaches CONSONANT BLENDS',
        differentiation: 'Pink Series shows PINK-SPINED books with simple CVC words (c-a-t, d-o-g). Blue Series shows BLUE-SPINED books with BLEND words (bl-ack, fl-ag).'
      },
      {
        work_key: 'la_green_series',
        reason: 'Both are reading series, but PINK is CVC while GREEN is PHONOGRAM words with complex letter patterns',
        differentiation: 'Pink Series shows PINK SPINES with 3-letter CVC. Green Series shows GREEN SPINES with PHONOGRAM words (sh-ee-p).'
      }
    ],
    negative_descriptions: [
      'NOT early alphabet/letter learning materials',
      'NOT picture-only cards without words',
      'NOT blend or phonogram reading materials'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_blue_object_box',
    name: 'Blue Object Box',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'WOODEN BOX with BLUE-COLORED ACCENT TRIM containing 20-30 MINIATURE CERAMIC or PLASTIC OBJECTS matching CONSONANT BLEND WORDS: CERAMIC CLOCK with ROMAN NUMERALS visible, WOODEN BLOCK (cube-shaped), RED FLAG with CLOTH, CERAMIC PLANT in POT, METALLIC STAR, WOODEN STEP or STAIR piece, RED TRAFFIC LIGHT (STOP), CERAMIC SPIDER with LEGS, WOODEN or CERAMIC SNAIL with SHELL, ROLLER SKATE, SILVER SLIP or SHOE, CERAMIC SNAP (button or fastener). Alongside EACH OBJECT: LABEL CARD (2x3 inches) with BLEND WORD in LOWERCASE BLACK PRINT (c-l-o-c-k, f-l-a-g, s-t-a-r, s-p-i-d-e-r, sn-a-il, sk-a-te). Blend CONSONANT COMBINATIONS clearly VISIBLE in printed text. BLUE-THEMED BOX EXTERIOR and matching materials. Child READING blend labels with FOCUS on INITIAL CONSONANT BLEND CLUSTERS (CL, BL, FL, ST, SN, SP, SK, SL, SM, SW visible). Objects and cards ORGANIZED in NEAT rows showing CLEAR CATEGORIZATION by blend TYPE.',
    key_materials: ['Blue object box with miniatures', 'Consonant blend word label cards', 'Wooden organization tray'],
    confusion_pairs: [
      {
        work_key: 'la_pink_object_box',
        reason: 'Both are miniature object boxes with labels, but BLUE contains BLEND words while PINK contains simple CVC words',
        differentiation: 'Blue Box shows BLUE-TRIMMED box with BLEND words (cl-ock, fl-ag, st-ar). Pink Box shows PINK-TRIMMED box with simple CVC (cat, dog, bat).'
      },
      {
        work_key: 'la_green_object_box',
        reason: 'Both are miniature object boxes, but BLUE is BLEND words while GREEN is PHONOGRAM words with digraphs',
        differentiation: 'Blue Box shows CONSONANT BLENDS (two consonants together like cl, fl, st). Green Box shows PHONOGRAMS (letter combinations like sh, ee, oo).'
      }
    ],
    negative_descriptions: [
      'NOT simple CVC word objects',
      'NOT phonogram or digraph objects',
      'NOT picture-only cards'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_blue_series',
    name: 'Blue Series (Blends)',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'BLUE-SPINED READING MATERIALS collection for CONSONANT BLEND WORDS including: PICTURE-WORD CARDS (COLORED illustration + word showing BLEND WORDS like "black", "block", "flag", "plant", "star", "stop", "spider", "sleep", "green", "smile", "snow", "fly"), WORD-ONLY CARDS (text-only reading of BLEND WORDS), PHRASE CARDS (text "the black flag" or "a green plant"), SENTENCE CARDS (text "The black flag flies."), and SMALL ILLUSTRATED BOOKLETS (4-10 pages with BLEND WORDS or phrases per page). BLUE BINDING or COVER visible on all materials. COLORED ILLUSTRATIONS showing objects matching BLEND WORDS. Text in LOWERCASE, CLEARLY PRINTED font. BLEND CONSONANT CLUSTERS (bl, cl, fl, st, sn, sp, sk, sl) shown prominently and BOLD in many materials. Child READING BLEND WORDS aloud while FINGER TRACES text LEFT-TO-RIGHT. Each page or card shows BLEND WORDS with ACCOMPANYING ILLUSTRATIONS.',
    key_materials: ['Blue series picture cards with blends', 'Blue series word cards', 'Blue series phrases and sentences', 'Blue series booklets'],
    confusion_pairs: [
      {
        work_key: 'la_pink_series',
        reason: 'Both are reading series with progressions, but BLUE teaches BLENDS while PINK teaches CVC words',
        differentiation: 'Blue Series shows BLUE SPINES with BLEND words (bl-ack, fl-ag). Pink Series shows PINK SPINES with simple CVC (cat, dog).'
      },
      {
        work_key: 'la_green_series',
        reason: 'Both are reading series, but BLUE is BLENDS while GREEN is PHONOGRAMS with digraphs',
        differentiation: 'Blue Series shows CONSONANT BLENDS at the START (bl, cl, fl). Green Series shows PHONOGRAM patterns (sh, ee, oa) throughout words.'
      }
    ],
    negative_descriptions: [
      'NOT simple CVC reading series',
      'NOT phonogram/digraph reading series',
      'NOT early letter introduction materials'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_phonogram_intro',
    name: 'Phonogram Introduction',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'SANDPAPER PHONOGRAMS (textured two-letter combinations) or CARDBOARD CARDS showing TWO-LETTER COMBINATIONS that produce ONE NEW SOUND: double letters (ee, oo, ll, ss, ff, zz), consonant digraphs (sh, ch, th, wh, ck, ph, ng, nk), vowel digraphs (ai, ay, ea, oa, aw, ou, ow, oi, oy, ew), and r-controlled vowels (ar, er, ir, or, ur). Each phonogram card is 2-3 inches in HEIGHT. May have TEXTURED ROUGH LETTERS (SANDPAPER-style) or PLAIN BLACK PRINT on GREEN CARDS (color-coding GREEN for phonograms distinct from PINK/BLUE letter boxes). Child\'s FINGER TRACING PHONOGRAM shape and SAYING SOUND aloud (not letter names, but BLENDED SOUND: /sh/ for "sh", /th/ for "th"). Multiple PHONOGRAMS visible on WOODEN TRAY or CHART organized by TYPE. DOUBLE-LETTER FORMAT is VISUALLY DISTINCT—these are TWO-CHARACTER COMBINATIONS, NOT single letters.',
    key_materials: ['Sandpaper phonograms textured', 'Phonogram cards on green background', 'Phonogram sorting trays'],
    confusion_pairs: [
      {
        work_key: 'la_sandpaper_letters',
        reason: 'Both are textured SANDPAPER materials, but PHONOGRAMS are TWO-letter combinations while LETTERS are single ALPHABET letters',
        differentiation: 'Sandpaper LETTERS show single cursive letters (a, b, c, d). Sandpaper PHONOGRAMS show two-letter combinations (sh, th, ee, oa) that make ONE SOUND.'
      }
    ],
    negative_descriptions: [
      'NOT single letter cards - these are TWO-LETTER combinations',
      'NOT alphabetic letters - these are PHONOGRAMS',
      'NOT consonant blends (which require two separate sounds)'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_green_object_box',
    name: 'Green Object Box',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'WOODEN BOX with GREEN-COLORED ACCENT TRIM containing 20-30 MINIATURE CERAMIC or PLASTIC OBJECTS matching PHONOGRAM WORDS (words containing DOUBLE LETTERS, DIGRAPHS, or COMPLEX PHONOGRAM PATTERNS): WHITE SHEEP figurine with WOOL texture, CERAMIC or WOODEN TREE with BRANCHES, BLUE MOON shape, RAIN DROPS or WATER DROPLET object, SAILBOAT, WOODEN STAR, SILVER SPOON, OPEN BOOK, CERAMIC SHELL with RIDGES, METAL CHAIN, WOODEN FISH, CERAMIC QUEEN figurine, WOODEN FOOT shape, CERAMIC MOUSE, CERAMIC OWL, WOODEN BOY figurine, CAT\'S TAIL, METAL KEY. Alongside EACH OBJECT: LABEL CARD with PHONOGRAM WORD in LOWERCASE PRINT showing PHONOGRAM COMBINATIONS: sh-ee-p, tr-ee, m-oo-n, r-ai-n, b-oa-t, st-ar, sp-oo-n, b-oo-k, sh-ell, ch-ai-n, f-i-sh, qu-ee-n, f-oo-t, m-ou-se, ow-l, b-oy, t-ai-l, k-ey. GREEN-THEMED BOX EXTERIOR. Child READING phonogram labels with FOCUS on COMPLEX letter PATTERNS and PHONOGRAM COMBINATIONS.',
    key_materials: ['Green object box with miniatures', 'Phonogram word label cards', 'Wooden organization materials'],
    confusion_pairs: [
      {
        work_key: 'la_pink_object_box',
        reason: 'Both are miniature object boxes with labels, but PINK is CVC words while GREEN is PHONOGRAM words',
        differentiation: 'Green Box shows GREEN-TRIMMED box with PHONOGRAM words (sh-ee-p, sp-oo-n). Pink Box shows PINK-TRIMMED box with simple CVC (cat, dog).'
      },
      {
        work_key: 'la_blue_object_box',
        reason: 'Both are miniature object boxes, but BLUE is BLEND words while GREEN is PHONOGRAM words with digraphs',
        differentiation: 'Green Box shows PHONOGRAM letter patterns (sh, ee, oa) throughout words. Blue Box shows CONSONANT BLENDS (cl, fl, st) at word start.'
      }
    ],
    negative_descriptions: [
      'NOT simple CVC word objects',
      'NOT consonant blend objects',
      'NOT picture cards without real objects'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_green_series',
    name: 'Green Series (Phonograms)',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'GREEN-SPINED READING MATERIALS collection for PHONOGRAM WORDS and COMPLEX READING including: PICTURE-WORD CARDS (COLORED illustrations + words with PHONOGRAMS like "sheep", "tree", "boat", "rain", "moon", "shell", "chain", "fish", "spoon", "book", "queen", "owl", "tail", "snow", "fly"), WORD-ONLY CARDS (text-only reading with PHONOGRAM WORDS), PHRASE CARDS (text "the sheep", "the tree", "green boat"), SENTENCE CARDS (text "The sheep is white."), and SMALL ILLUSTRATED BOOKLETS (6-12 pages with PHONOGRAM WORDS and sentences per page). GREEN BINDING or COVER visible. PHONOGRAM LETTER COMBINATIONS (sh, ee, oa, ai, etc.) often HIGHLIGHTED in BOLD or COLOR-CODED DIFFERENTLY. Simple COLORED ILLUSTRATIONS matching WORD MEANING. Child READING COMPLEX PHONOGRAM WORDS with ADVANCED phonetic READING LEVEL. Text in LOWERCASE, CLEARLY PRINTED font.',
    key_materials: ['Green series picture cards with phonograms', 'Green series word cards', 'Green series phrases and sentences', 'Green series booklets'],
    confusion_pairs: [
      {
        work_key: 'la_pink_series',
        reason: 'Both are reading series with progressions, but PINK teaches CVC words while GREEN teaches PHONOGRAM words',
        differentiation: 'Green Series shows GREEN SPINES with PHONOGRAM words (sh-ee-p, sp-oo-n). Pink Series shows PINK SPINES with simple CVC (cat, dog).'
      },
      {
        work_key: 'la_blue_series',
        reason: 'Both are reading series, but BLUE teaches BLENDS while GREEN teaches PHONOGRAMS',
        differentiation: 'Green Series shows PHONOGRAM letter patterns (sh, ee, oa) highlighted throughout words. Blue Series shows CONSONANT BLENDS (bl, fl, st) primarily at word start.'
      }
    ],
    negative_descriptions: [
      'NOT simple CVC reading series',
      'NOT consonant blend series',
      'NOT early letter introduction materials'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_puzzle_words',
    name: 'Puzzle Words (Sight Words)',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'CARDS or BOOKLETS featuring NON-PHONETIC high-frequency WORDS that CANNOT be decoded using phonetic rules: "the", "a", "an", "is", "to", "and", "was", "were", "said", "have", "do", "does", "you", "of", "water", "could", "would". Words PRINTED on CARD STOCK (2x3 inch cards or booklet pages) in LOWERCASE, CLEARLY PRINTED text (SANS-SERIF font for CLARITY). Words do NOT follow PHONETIC DECODING rules—they must be LEARNED VISUALLY and MEMORIZED from SIGHT. Some materials may feature PUZZLE-CUT SHAPES where WORD PIECES physically INTERLOCK like jigsaw puzzle pieces (hence "puzzle" words). Child READING SIGHT WORDS from CARDS without attempting PHONETIC DECODING. Irregular SPELLING PATTERNS clearly visible (compare "though", "through", "tough"—all SPELLED differently despite shared sounds). NOT phonetically decodable.',
    key_materials: ['Puzzle word cards 2x3 inches', 'Sight word booklets', 'Puzzle-cut interlocking word materials'],
    confusion_pairs: [
      {
        work_key: 'la_phonogram_intro',
        reason: 'Both are WORD-based language activities, but Puzzle Words are NON-PHONETIC sight words while Phonogram Introduction teaches LETTER COMBINATION sounds',
        differentiation: 'Puzzle Words shows IRREGULAR words (the, said, water) that CANNOT be sounded out. Phonogram Intro shows TWO-LETTER COMBINATIONS (sh, th, ee) that produce predictable SOUNDS.'
      }
    ],
    negative_descriptions: [
      'NOT phonetically decodable words following phonetic rules',
      'NOT CVC words, blend words, or phonogram words',
      'NOT picture illustration cards'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_reading_analysis',
    name: 'Reading Analysis',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'Child READING a COMPLEX WORD aloud and ANALYZING which PHONOGRAMS are PRESENT using a PHONOGRAM REFERENCE CHART (LARGE LAMINATED POSTER showing all learned PHONOGRAMS organized by TYPE). Child\'s FINGER POINTING to CHART while simultaneously IDENTIFYING PHONOGRAM COMPONENTS in WORD CARD. Analysis shows DECOMPOSITION of word—BREAKING COMPLEX WORDS into constituent PHONOGRAM PATTERNS (example: "playing" = "pl-ay-ing" with each COMPONENT identified). Paper or CHART showing COLOR-CODED or HIGHLIGHTED PHONOGRAM IDENTIFICATION with DIFFERENT COLORS for different PHONOGRAM TYPES (BLUE for consonant BLENDS, GREEN for VOWEL DIGRAPHS, PINK for silent E patterns, etc.). Diagram or WRITTEN ANALYSIS shows EXPLICIT BREAKDOWN of word STRUCTURE. NOT simple reading—this is ADVANCED ANALYTICAL reading with EXPLICIT PHONOGRAM IDENTIFICATION and word STRUCTURE BREAKDOWN.',
    key_materials: ['Reading analysis charts and materials', 'Laminated phonogram reference posters', 'Colored word cards with analysis markings'],
    confusion_pairs: [
      {
        work_key: 'la_reading_classification',
        reason: 'Both are ADVANCED reading activities requiring COMPREHENSION, but Reading Analysis focuses on PHONOGRAM BREAKDOWN while Reading Classification focuses on SEMANTIC SORTING',
        differentiation: 'Reading Analysis shows child DECOMPOSING words into PHONOGRAM components (pl-ay-ing), examining LETTER PATTERNS. Reading Classification shows child SORTING words by MEANING category (animals, food, clothing).'
      }
    ],
    negative_descriptions: [
      'NOT simple sight word reading',
      'NOT phonogram introduction - this is ANALYSIS of phonograms',
      'NOT reading comprehension activity'
    ],
    difficulty: 'hard',
  },
  {
    work_key: 'la_reading_classification',
    name: 'Reading Classification',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'WORD CARDS (approximately 1x2 inches each) to be CLASSIFIED by SEMANTIC CATEGORY while READING and COMPREHENDING meaning. CATEGORY LABEL CARDS visible: "ANIMALS", "FOOD", "CLOTHING", "FURNITURE", "VERBS", "ADJECTIVES". Child READS each WORD CARD independently (example: child reads "dog", "cat", "bird" and comprehends meaning). Child then SORTS WORD CARDS into CORRECT SEMANTIC CATEGORIES by UNDERSTANDING word MEANING and CATEGORY membership. SORTED WORD CARDS arranged in NEAT PILES or COLUMNS by CATEGORY on table. CATEGORY LABELS clearly visible at TOP or HEADER of each GROUPING. Multiple CATEGORIES visible with CLEAR SPATIAL SEPARATION between category PILES. READING COMPREHENSION is demonstrated through ACCURATE CLASSIFICATION—child must UNDERSTAND word MEANING (not just DECODE) AND recognize CATEGORY membership.',
    key_materials: ['Classification reading word cards', 'Category label cards', 'Word sorting materials and trays'],
    confusion_pairs: [
      {
        work_key: 'la_reading_analysis',
        reason: 'Both are ADVANCED reading requiring ANALYSIS, but Reading Classification focuses on SEMANTIC MEANING while Reading Analysis focuses on PHONOGRAM STRUCTURE',
        differentiation: 'Reading Classification shows child SORTING words by SEMANTIC CATEGORY (animals, food, clothing). Reading Analysis shows child BREAKING words into PHONOGRAM components (sh-ee-p, sp-oo-n).'
      }
    ],
    negative_descriptions: [
      'NOT decoding practice without comprehension',
      'NOT phonogram or sound-based sorting',
      'NOT physical object sorting'
    ],
    difficulty: 'hard',
  },
  {
    work_key: 'la_command_cards',
    name: 'Command Cards (Action Reading)',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'COMMAND CARDS (3x5 inch LAMINATED CARD STOCK) showing IMPERATIVE SENTENCES with ACTION VERBS in LOWERCASE PRINT: "Stand up", "Hop on one foot", "Touch your nose", "Clap your hands three times", "Walk to the door", "Jump high", "Sit down", "Skip around the room". Text is CLEARLY PRINTED in large SANS-SERIF font (14-18pt). Card BACKGROUND is WHITE or CREAM with BOLD BLACK TEXT. Child HOLDING card in HAND, READING command aloud silently or WHISPERED. Immediately AFTER reading, child PERFORMS the PHYSICAL ACTION described. Visual shows child MID-ACTION: JUMPING with FEET off ground, HOPPING on single LEG while BALANCING, CLAPPING palms together repeatedly, WALKING in specific DIRECTION, TOUCHING nose with FINGERTIP, SITTING on CHAIR or FLOOR. Card VISIBLE in child\'s HAND during or AFTER action execution. Child\'s BODY POSITION clearly showing ACTION EXECUTION.',
    key_materials: ['Command cards 3x5 inches', 'Action reading verb cards', 'Simple imperative sentence cards'],
    confusion_pairs: [
      {
        work_key: 'la_verb_intro',
        reason: 'Both involve READING and PERFORMING ACTIONS, but Command Cards focus on INSTRUCTION FOLLOWING while Verb Intro focuses on VERB SYMBOL learning',
        differentiation: 'Command Cards show child READING imperative sentence then EXECUTING action (Jump, Clap, Hop). Verb Intro shows child IDENTIFYING RED CIRCLE symbols above VERBS and performing corresponding ACTIONS.'
      }
    ],
    negative_descriptions: [
      'NOT grammar symbol instruction cards',
      'NOT silent reading or comprehension-only activity',
      'NOT verb introduction with just symbols'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_interpretive_reading',
    name: 'Interpretive Reading',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'Child READING ALOUD from POETRY BOOK, SHORT STORY, or DRAMATIC SCRIPT with VARIED EXPRESSION and EMOTIONAL INTERPRETATION. Reader\'s FACIAL EXPRESSION changes with TEXT MEANING: EYEBROWS raised for surprise or excitement, MOUTH CURVED upward for happy content, EYES NARROWED for serious or fearful passages, OVERALL EXPRESSION MATCHING emotional TONE. VOICE INFLECTION clearly varied: VOLUME increases for emphasis, PITCH rises for excitement, SPEECH SLOWS for dramatic moments, PAUSES between phrases for effect. HAND GESTURES match TEXT MOOD and DESCRIBED ACTIONS: HANDS raised for joy, ARMS CROSSED for confrontation, PALMS OPEN for invitation, FINGERS POINTING for emphasis. Child\'s MOUTH clearly MOVING with VARIED INTONATION—NOT flat or monotone. OPEN BOOK visible in child\'s HANDS or on TABLE. May show child READING to SMALL AUDIENCE of 2-4 peers listening with ENGAGED ATTENTION. EXPRESSIVE BODY LANGUAGE visible throughout (LEANING forward, TURNING pages with INTENTION, POSTURE changing). NOT mechanical reading—this is EMOTIONAL INTERPRETIVE reading demonstrating deep TEXT COMPREHENSION through VOCAL and PHYSICAL EXPRESSION.',
    key_materials: ['Poetry books with expressive text', 'Short story collections', 'Drama scripts with dialogue'],
    confusion_pairs: [
      {
        work_key: 'la_silent_reading',
        reason: 'Both are READING ACTIVITIES with books, but Interpretive Reading emphasizes EXPRESSIVE VOCAL/PHYSICAL delivery while Silent Reading is QUIET WITHOUT expression',
        differentiation: 'Interpretive Reading shows child READING ALOUD with VARIED VOICE inflection, FACIAL EXPRESSIONS, HAND GESTURES matching emotional tone. Silent Reading shows child READING quietly alone with CLOSED LIPS, EYES scanning pages.'
      }
    ],
    negative_descriptions: [
      'NOT silent independent reading without expression',
      'NOT simple word decoding or sight word reading',
      'NOT reading analysis or phonogram study'
    ],
    difficulty: 'hard',
  },
  {
    work_key: 'la_silent_reading',
    name: 'Silent Reading',
    area_key: 'language',
    category: 'Reading',
    visual_description: 'Child SITTING AT WOODEN TABLE or in COZY READING CORNER on CUSHIONED seat with OPEN CHAPTER BOOK or LEVELED READER (appropriate READING LEVEL for child). Child\'s EYES SCANNING PAGES from LEFT to RIGHT, MOVING down lines systematically. NO VOICE—completely SILENT reading with LIPS CLOSED. Child\'s HAND occasionally TURNING PAGE with DELIBERATE motion, using THUMB to HOLD page. QUIET CLASSROOM ENVIRONMENT: SOFT NATURAL or warm LIGHTING, MINIMAL background NOISE, CARPETED or soft FLOORING. Child SITTING ALONE with book—not being TAUGHT, not answering QUESTIONS in REAL TIME, not DISCUSSING text—purely INDEPENDENT reading. READING POSTURE shows UPRIGHT SEATED position with RELAXED SHOULDERS and BOOK held at COMFORTABLE distance (10-12 inches from EYES). FACIAL EXPRESSION shows CONCENTRATION with EYES FOCUSED on PAGE text. NOT guided reading with teacher, NOT read-aloud (which is expressive and vocal), NOT interpretive performance.',
    key_materials: ['Leveled books by reading level', 'Chapter books for independent readers', 'Reading corner with comfortable seating'],
    confusion_pairs: [
      {
        work_key: 'la_interpretive_reading',
        reason: 'Both are READING from books, but Silent Reading is QUIET INDEPENDENT activity while Interpretive Reading is EXPRESSIVE read-aloud with AUDIENCE',
        differentiation: 'Silent Reading shows child READING ALONE in QUIET corner, CLOSED LIPS, EYES scanning left-to-right. Interpretive Reading shows child READING ALOUD with VOCAL VARIATION, HAND GESTURES, often to AUDIENCE of peers.'
      }
    ],
    negative_descriptions: [
      'NOT read-aloud or expressive reading with vocal variation',
      'NOT guided reading lesson with teacher instruction',
      'NOT phonogram study or word decoding activity'
    ],
    difficulty: 'hard',
  },

  // ===== GRAMMAR =====
  {
    work_key: 'la_noun_intro',
    name: 'Introduction to the Noun',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'Teacher or child HOLDING REAL CLASSROOM OBJECTS (WOODEN pencil, LEATHER-BOUND book, WOODEN desk, WOODEN chair) with BLACK SOLID EQUILATERAL TRIANGLE SYMBOL (Montessori standard grammar symbol for NOUNS, approximately 2x2 inches) placed DIRECTLY ABOVE each OBJECT. Triangle is COMPLETELY BLACK with SHARP EDGES and clear GEOMETRIC FORM. Child SORTING WORD CARDS into TWO PILES: NOUN and NON-NOUN categories. NOUN CARDS have BLACK TRIANGLE symbol GLUED or PRINTED above NOUN word (example: black triangle above word "pencil", "book", "desk", "chair"). NON-NOUN CARDS lack triangle SYMBOL. Multiple OBJECTS or CARDS visible showing NOUN IDENTIFICATION across different semantic categories. NAMING is EXPLICIT: teacher or child POINTS to object/card and SAYS: "This is a pencil—a NOUN. This is a run—NOT a noun." NOT verb CIRCLES, NOT adjective TRIANGLES—specifically BLACK TRIANGLE for NOUNS.',
    key_materials: ['Noun lesson materials with objects', 'Black triangle symbol 2x2 inches', 'Real classroom objects for demonstration'],
    confusion_pairs: [
      {
        work_key: 'la_grammar_boxes',
        reason: 'Both use GRAMMAR SYMBOLS and sentence structures, but NOUN INTRO isolates parts of speech while GRAMMAR BOXES fill missing words in complete sentences',
        differentiation: 'Noun Intro shows BLACK TRIANGLES above objects and emphasizes NOUN definition. Grammar Boxes show MULTIPLE COLORED SYMBOLS across 8 boxes and require SELECTING correct word to complete SENTENCE.'
      }
    ],
    negative_descriptions: [
      'NOT verb or action words with red circles',
      'NOT adjective introduction with colored triangles',
      'NOT Grammar Boxes fill-in-the-blank sentences'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_article_intro',
    name: 'Introduction to the Article',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'ARTICLES (a, an, the) displayed on LIGHT BLUE SMALL TRIANGLE SYMBOL (SMALLER and LIGHTER in color than NOUN\'s BLACK triangle—approximately 1x1 inch, PASTEL BLUE shade). Child POINTING to OBJECT or WORD CARD while SAYING article + noun aloud: "a book" (article A + noun BOOK), "an apple" (article AN + noun APPLE), "the chair" (article THE + noun CHAIR). WORD CARDS with LIGHT BLUE SMALL TRIANGLE symbols placed above ARTICLE words. Simple SENTENCE STRUCTURE visible: ARTICLE + NOUN format (example: "a pencil", "the desk", "an eraser"). LIGHT BLUE triangle distinctly different from NOUN\'s BLACK triangle (darker, LARGER). NOT noun TRIANGLE (black, larger). NOT adjective TRIANGLE (dark blue, medium). LIGHT BLUE SMALL TRIANGLE is MONTESSORI standard grammar symbol = ARTICLE.',
    key_materials: ['Article lesson materials with symbols', 'Light blue triangle symbols 1x1 inch', 'Article and noun word cards'],
    confusion_pairs: [
      {
        work_key: 'la_noun_intro',
        reason: 'Both introduce grammar symbols with triangles, but ARTICLES use LIGHT BLUE small triangles while NOUNS use BLACK large triangles',
        differentiation: 'Article Intro shows LIGHT BLUE SMALL TRIANGLES (1x1") above articles like "a, an, the". Noun Intro shows BLACK LARGE TRIANGLES (2x2") above nouns like "pencil, book".'
      },
      {
        work_key: 'la_adjective_intro',
        reason: 'Both use colored triangle grammar symbols, but ARTICLES use light blue while ADJECTIVES use dark blue with different sizes',
        differentiation: 'Article Intro shows LIGHT BLUE SMALL TRIANGLES. Adjective Intro shows DARK BLUE MEDIUM TRIANGLES (1.5x1.5").'
      }
    ],
    negative_descriptions: [
      'NOT noun introduction with black triangles',
      'NOT adjective introduction with dark blue triangles',
      'NOT verb or adverb symbols'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_adjective_intro',
    name: 'Introduction to the Adjective',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'Child playing \'COLOR DETECTIVE GAME\': \'Which one? The BLUE pencil! The BIG book! The HAPPY child!\' ADJECTIVES displayed on MEDIUM DARK BLUE TRIANGLE SYMBOL (size between ARTICLE and NOUN TRIANGLE—approximately 1.5x1.5 inches, SATURATED BLUE shade darker than article LIGHT BLUE). Multiple SIMILAR OBJECTS in different COLORS or SIZES visible: RED pencil, BLUE pencil, YELLOW pencil (child SELECTING based on ADJECTIVE color); BIG book, SMALL book, MEDIUM book (child SELECTING by size); HAPPY picture, SAD picture, CONFUSED picture (child SELECTING by emotion). WORD CARDS with DARK BLUE TRIANGLE symbols above ADJECTIVE words. Phrase structure visible: THE + ADJECTIVE + NOUN (example: "the BLUE pencil", "the BIG book"). NOT noun TRIANGLE (black, larger). NOT article TRIANGLE (light blue, smaller). DARK BLUE MEDIUM TRIANGLE = MONTESSORI standard grammar symbol = ADJECTIVE.',
    key_materials: ['Adjective lesson materials with objects', 'Medium dark blue triangle symbols 1.5x1.5 inches', 'Objects in different colors/sizes'],
    confusion_pairs: [
      {
        work_key: 'la_article_intro',
        reason: 'Both use colored triangle grammar symbols, but ADJECTIVES use dark blue while ARTICLES use light blue with different sizes',
        differentiation: 'Adjective Intro shows DARK BLUE MEDIUM TRIANGLES (1.5x1.5") above descriptive words like "big, blue, happy". Article Intro shows LIGHT BLUE SMALL TRIANGLES (1x1") above "a, an, the".'
      }
    ],
    negative_descriptions: [
      'NOT article introduction with light blue triangles',
      'NOT noun introduction with black triangles',
      'NOT verb or adverb symbols'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_verb_intro',
    name: 'Introduction to the Verb',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'Child READING COMMAND CARD and PERFORMING ACTION corresponding to VERB: "RUN" (child running across CLASSROOM), "HOP" (child hopping on alternating FEET), "SIT" (child sitting on FLOOR or chair), "CLAP" (child clapping HANDS), "JUMP" (child jumping with FEET leaving ground), "DANCE" (child moving rhythmically), "LAUGH" (child showing JOYFUL expression). VERBS displayed on LARGE RED CIRCLE SYMBOL (MONTESSORI standard = action word, approximately 3x3 inches, BRIGHT RED). Child\'s BODY CLEARLY IN MOTION performing ACTION. ACTION CARD visible with RED CIRCLE symbol printed above VERB word. Multiple ACTION examples shown with child demonstrating different VERBS. CLASSROOM SPACE clearly visible showing ROOM for MOVEMENT and activity. LARGE RED CIRCLE = MONTESSORI standard grammar symbol = VERB. NOT triangle SYMBOLS (nouns/adjectives). NOT small ORANGE circle (adverbs).',
    key_materials: ['Verb lesson materials with symbols', 'Large red circle symbols 3x3 inches', 'Action command cards'],
    confusion_pairs: [
      {
        work_key: 'la_adverb_intro',
        reason: 'Both involve ACTION words and movement, but VERBS use LARGE RED CIRCLES while ADVERBS use SMALL ORANGE CIRCLES and modify verbs',
        differentiation: 'Verb Intro shows LARGE RED CIRCLES (3x3") for base action words (run, jump, sit). Adverb Intro shows SMALL ORANGE CIRCLES (2x2") and shows the SAME verb executed in different WAYS (run quickly, run slowly).'
      }
    ],
    negative_descriptions: [
      'NOT adverb introduction with orange circles',
      'NOT grammar symbol triangles (nouns, articles, adjectives)',
      'NOT noun or adjective introduction'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_adverb_intro',
    name: 'Introduction to the Adverb',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'Child DEMONSTRATING same VERB executed in different ADVERBIAL WAYS: "Walk SLOWLY" (exaggerated SLOW steps with EXTENDED stride time), "Walk QUICKLY" (rapid FAST steps with QUICK foot placement), "Walk HAPPILY" (BOUNCY steps with ELEVATED knees and SMILING FACE), "Walk QUIETLY" (tiptoeing with SOFT foot contact), "Walk BACKWARDS" (facing opposite DIRECTION while WALKING). ADVERBS displayed on SMALL ORANGE CIRCLE SYMBOL (MONTESSORI standard = modifies verb, approximately 2x2 inches, BRIGHT ORANGE). Child performing SAME BASE ACTION (walking) in distinctly different ADVERBIAL WAYS. BODY LANGUAGE and FACIAL EXPRESSION clearly CHANGING with each ADVERB: happy FACE and BOUNCY motion for "happily", slow DELIBERATE motion for "slowly", rapid quick-paced motion for "quickly". CLASSROOM SPACE visible showing MOVEMENT area. SMALL ORANGE CIRCLE = ADVERB symbol. NOT large RED circle (verb). NOT triangle SYMBOLS (nouns/adjectives).',
    key_materials: ['Adverb lesson materials with symbols', 'Small orange circle symbols 2x2 inches', 'Adverb game activities with actions'],
    confusion_pairs: [
      {
        work_key: 'la_verb_intro',
        reason: 'Both involve ACTION demonstrations, but VERBS use LARGE RED CIRCLES for base actions while ADVERBS use SMALL ORANGE CIRCLES and modify those actions',
        differentiation: 'Verb Intro shows LARGE RED CIRCLES (3x3") for actions like run, jump, sit (static actions). Adverb Intro shows SMALL ORANGE CIRCLES (2x2") and demonstrates same action performed differently (walk QUICKLY, walk SLOWLY).'
      }
    ],
    negative_descriptions: [
      'NOT verb introduction with red circles',
      'NOT grammar symbol triangles (nouns, articles, adjectives)',
      'NOT preposition or pronoun introduction'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_pronoun_intro',
    name: 'Introduction to the Pronoun',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'Child SAYING demonstrative SENTENCES: "Maria has a pencil. SHE has a pencil." PRONOUNS (I, you, he, she, it, we, they) displayed on PURPLE or VIOLET TRIANGLE SYMBOL (similar TRIANGULAR shape to NOUN but distinctly PURPLE/VIOLET color—approximately 1.75x1.75 inches). Child POINTING to self saying "I", POINTING to friend saying "You", POINTING to CHILD ACROSS ROOM saying "He/She", POINTING to GROUP saying "We/They". WORD CARDS with PURPLE TRIANGLE symbols glued above PRONOUN words. PRONOUNS REPLACE NOUNS in SENTENCES while MEANING remains SAME—demonstrates SUBSTITUTION function (PRONOUN takes PLACE of noun). PURPLE TRIANGLE = MONTESSORI standard grammar symbol = PRONOUN. NOT black TRIANGLE (noun). NOT other COLORED TRIANGLES.',
    key_materials: ['Pronoun lesson materials with symbols', 'Purple/violet triangle symbols 1.75x1.75 inches', 'Pronoun word cards with symbols'],
    confusion_pairs: [
      {
        work_key: 'la_noun_intro',
        reason: 'Both use TRIANGLE symbols, but PRONOUNS use PURPLE TRIANGLES while NOUNS use BLACK TRIANGLES, and pronouns SUBSTITUTE for nouns',
        differentiation: 'Pronoun Intro shows PURPLE TRIANGLES (1.75x1.75") above pronouns (he, she, it, they). Noun Intro shows BLACK TRIANGLES (2x2") above nouns (pencil, book, chair).'
      }
    ],
    negative_descriptions: [
      'NOT noun introduction with black triangles',
      'NOT preposition or other grammar symbols',
      'NOT article or adjective introduction'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_preposition_intro',
    name: 'Introduction to the Preposition',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'Child DEMONSTRATING POSITION words with REAL OBJECTS showing SPATIAL RELATIONSHIPS: pencil placed "IN the box" (pencil INSIDE box opening), pencil placed "ON the table" (pencil RESTING on FLAT surface), pencil placed "UNDER the chair" (pencil BELOW chair SEAT), pencil placed "BEHIND the door" (pencil OBSCURED behind door), pencil placed "BETWEEN two books" (pencil SANDWICHED between OBJECTS). PREPOSITIONS displayed on GREEN CRESCENT or BRIDGE SYMBOL (curved shape suggesting RELATIONSHIP or CONNECTION—approximately 2x1.5 inches, BRIGHT GREEN). Child\'s HAND and OBJECT clearly showing SPATIAL RELATIONSHIP—demonstrating POSITIONAL meaning through PHYSICAL action. Multiple POSITION examples visible showing PREPOSITION VARIETY. GREEN CRESCENT = MONTESSORI standard grammar symbol = PREPOSITION. NOT circle (verb/adverb). NOT triangle (noun/adjective/article/pronoun).',
    key_materials: ['Preposition lesson materials with symbols', 'Green crescent/bridge symbols 2x1.5 inches', 'Preposition game objects for demonstration'],
    confusion_pairs: [
      {
        work_key: 'la_conjunction_intro',
        reason: 'Both connect elements, but PREPOSITIONS show SPATIAL RELATIONSHIPS while CONJUNCTIONS JOIN SENTENCES',
        differentiation: 'Preposition Intro shows GREEN CRESCENT symbol with OBJECTS in SPATIAL positions (in, on, under, between). Conjunction Intro shows PINK RECTANGLE symbol JOINING two complete SENTENCES.'
      }
    ],
    negative_descriptions: [
      'NOT circle symbols (verbs or adverbs)',
      'NOT triangle symbols (nouns, articles, adjectives, pronouns)',
      'NOT conjunction or interjection introduction'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_conjunction_intro',
    name: 'Introduction to the Conjunction',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'TWO SENTENCE CARDS JOINED TOGETHER with CONJUNCTION CARD positioned in MIDDLE: Left sentence "The cat is black" + CONJUNCTION CARD "AND" (on PINK RECTANGLE symbol) + Right sentence "the dog is brown." CONJUNCTIONS (and, but, or, nor, yet, so) displayed on PINK RECTANGLE SYMBOL (approximately 2x1 inches, BRIGHT PINK). COMPLETE COMPOUND SENTENCE written out showing CONJUNCTION HIGHLIGHTED or BOLD: "The cat is black AND the dog is brown." Conjunction CONNECTS two INDEPENDENT CLAUSES creating LONGER sentence. CARD ARRANGEMENT shows PHYSICAL JOINING—sentence HALVES separated until CONJUNCTION CARD placed between them. PINK RECTANGLE = MONTESSORI standard grammar symbol = CONJUNCTION. NOT other grammar symbols. SENTENCE BUILDING with PHYSICAL cards clearly showing conjunction JOINING two COMPLETE sentence HALVES.',
    key_materials: ['Conjunction lesson materials with symbols', 'Pink rectangle symbols 2x1 inches', 'Conjunction sentence card sets'],
    confusion_pairs: [
      {
        work_key: 'la_preposition_intro',
        reason: 'Both connect elements, but CONJUNCTIONS JOIN SENTENCES while PREPOSITIONS show SPATIAL RELATIONSHIPS',
        differentiation: 'Conjunction Intro shows PINK RECTANGLE symbol JOINING two complete SENTENCES ("The cat is black AND the dog is brown"). Preposition Intro shows GREEN CRESCENT symbol with OBJECTS in POSITIONS (in, on, under).'
      }
    ],
    negative_descriptions: [
      'NOT triangle or circle grammar symbols',
      'NOT single-word grammar instruction (nouns, verbs, adjectives)',
      'NOT preposition or interjection introduction'
    ],
    difficulty: 'hard',
  },
  {
    work_key: 'la_interjection_intro',
    name: 'Introduction to the Interjection',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'Child EXCLAIMING with STRONG EMOTIONAL EXPRESSION: "Oh! I found my pencil!" (SURPRISED expression), "Wow! That\'s amazing!" (AMAZED FACIAL expression), "Ouch! That hurt!" (PAINED EXPRESSION), "Yay! I won!" (JOYFUL CELEBRATION). INTERJECTIONS displayed on GOLD or YELLOW KEYHOLE SYMBOL (UNIQUE curved shape with HOLE in center—approximately 2x1.5 inches, BRIGHT GOLD or YELLOW). Child\'s FACE showing STRONG EMOTION MATCHING interjection: EYEBROWS raised for surprise ("Oh!"), MOUTH open WIDE for amazement ("Wow!"), MOUTH GRIMACED for pain ("Ouch!"), BIG SMILE for joy ("Yay!"). EXCLAMATION MARK clearly visible after interjection. Interjection STANDS ALONE in SENTENCE—NOT connected grammatically to REST of sentence. GOLD KEYHOLE = MONTESSORI standard grammar symbol = INTERJECTION (UNIQUE shape, distinct from all other SYMBOLS).',
    key_materials: ['Interjection lesson materials with symbols', 'Gold/yellow keyhole symbols 2x1.5 inches', 'Interjection word cards with exclamation marks'],
    confusion_pairs: [
      {
        work_key: 'la_verb_intro',
        reason: 'Both involve EMOTIONAL demonstration, but VERBS are ACTION words with RED CIRCLES while INTERJECTIONS are EMOTIONAL EXCLAMATIONS with GOLD KEYHOLES',
        differentiation: 'Verb Intro shows RED CIRCLE symbols for base ACTIONS (run, jump, sit). Interjection Intro shows GOLD KEYHOLE symbols for EMOTIONAL EXCLAMATIONS (Oh!, Wow!, Ouch!).'
      }
    ],
    negative_descriptions: [
      'NOT triangle or circle or crescent grammar symbols',
      'NOT emotionless or neutral expressions',
      'NOT noun, verb, adjective, or adverb introduction'
    ],
    difficulty: 'hard',
  },
  {
    work_key: 'la_grammar_boxes',
    name: 'Grammar Boxes',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'SET of 8 WOODEN BOXES labeled "Grammar Box I" through "Grammar Box VIII", each containing SENTENCE CARDS with ONE WORD MISSING in strategic position. Box I (ARTICLES): printed sentence strip "The ___ is red." with BLANK space. Child SELECTS from provided WORD CARDS (a, an, the) and INSERTS correct ARTICLE to complete SENTENCE: "The cat is red." Box II (NOUNS), Box III (ADJECTIVES), Box IV (VERBS), Box V (ADVERBS), Box VI (PRONOUNS), Box VII (PREPOSITIONS), Box VIII (CONJUNCTIONS). SENTENCES MAKE LOGICAL SENSE only when CORRECT part of SPEECH INSERTED—provides SELF-CORRECTING CONTROL. WOODEN BOXES with REMOVABLE lids, CARD STOCK sentence strips, and SEPARATE WORD CARDS inside. Child READING sentence and SELECTING correct WORD CARD from options. NOT single grammar symbol introduction—this is ANALYTICAL sentence-level WORK spanning MULTIPLE boxes with INCREASING complexity.',
    key_materials: ['Grammar Boxes I-VIII wooden set', 'Sentence card strips with blanks', 'Word cards for each part of speech'],
    confusion_pairs: [
      {
        work_key: 'la_sentence_analysis',
        reason: 'Both analyze sentence structure, but GRAMMAR BOXES focus on FILLING missing words while SENTENCE ANALYSIS focuses on IDENTIFYING sentence PARTS',
        differentiation: 'Grammar Boxes show sentences with BLANKS to fill (e.g., "The ___ is red. [cat/dog/bird]"). Sentence Analysis shows COMPLETE sentences with COLORED ARROWS labeling PARTS (who/what/what receiving).'
      }
    ],
    negative_descriptions: [
      'NOT single grammar symbol introduction (like noun intro or verb intro)',
      'NOT sentence structure analysis with colored arrows',
      'NOT reading comprehension or content-based reading activity'
    ],
    difficulty: 'hard',
  },
  {
    work_key: 'la_sentence_analysis',
    name: 'Sentence Analysis',
    area_key: 'language',
    category: 'Grammar',
    visual_description: 'Child READING COMPLETE SENTENCE and ANALYZING its GRAMMATICAL STRUCTURE using COLORED QUESTION ARROWS pointing to SENTENCE PARTS. Printed SENTENCE example: "Maria reads the book." with ARROWS showing: RED ARROW pointing to "Maria" labeled "WHO? (subject)", BLUE ARROW pointing to "reads" labeled "WHAT IS IT DOING? (predicate/verb)", GREEN ARROW pointing to "the book" labeled "WHAT IS RECEIVING ACTION? (object)". SENTENCE written on CARD with COLORED LINES or ARROWS physically pointing to SENTENCE COMPONENTS. CHART or PAPER showing COLOR-CODED GRAMMATICAL FUNCTIONS (SUBJECTS in red, PREDICATES in blue, OBJECTS in green). Diagram demonstrates DEEP STRUCTURAL ANALYSIS—breaking SENTENCE into ESSENTIAL PARTS and LABELING functions. NOT Grammar Boxes (those FILL missing WORDS). NOT part-of-speech symbols (those introduce INDIVIDUAL parts). This is ADVANCED STRUCTURAL ANALYSIS using QUESTION framework and COLOR-CODING.',
    key_materials: ['Sentence analysis charts with arrows', 'Question arrow templates', 'Sentence strips with analysis markings'],
    confusion_pairs: [
      {
        work_key: 'la_grammar_boxes',
        reason: 'Both analyze sentence structure, but SENTENCE ANALYSIS focuses on IDENTIFYING sentence PARTS while GRAMMAR BOXES focus on FILLING missing words',
        differentiation: 'Sentence Analysis shows COMPLETE sentences with COLORED ARROWS pointing to and LABELING sentence PARTS (subject, verb, object). Grammar Boxes show INCOMPLETE sentences with BLANKS requiring WORD SELECTION.'
      }
    ],
    negative_descriptions: [
      'NOT fill-in-the-blank Grammar Boxes',
      'NOT single grammar symbol introduction',
      'NOT reading comprehension without structural analysis'
    ],
    difficulty: 'hard',
  },

  // ===== WORD STUDY =====
  {
    work_key: 'la_word_families',
    name: 'Word Families',
    area_key: 'language',
    category: 'Word Study',
    visual_description: 'WORD FAMILY CLUSTERS displayed on CARDS or CHART showing RHYMING WORDS grouped by SHARED ENDING SOUND and SPELLING PATTERN: AT FAMILY (cat, bat, hat, sat, mat, fat, rat, pat, sat, vat—all ENDING in "-at" sound), AN FAMILY (can, fan, pan, ran, man, tan, ban, van, plan—all ENDING in "-an"), IG FAMILY (big, dig, fig, jig, pig, rig, wig, lig—all ENDING in "-ig"). Each WORD on SMALL CARD (1x2 inches) or CHART format. Child ARRANGING RHYMING WORDS by FAMILY. Multiple WORD CARDS GROUPED IN FAMILY STACKS or CHART DISPLAY with FAMILY NAMES (AT, AN, AP, OT, IG, etc.) prominently LISTED with words GROUPED UNDER each FAMILY LABEL. Words SHARING ENDING SOUND and IDENTICAL SPELLING PATTERN grouped TOGETHER visually. NOT rhyming ACTIVITIES (those use OBJECTS for sound comparison). NOT phonogram WORK (phonograms are SINGLE combinations like "sh", "th").',
    key_materials: ['Word family cards 1x2 inches', 'Word family organization charts', 'Family name label cards'],
    confusion_pairs: [
      {
        work_key: 'la_phonogram_intro',
        reason: 'Both involve LETTER patterns, but WORD FAMILIES group COMPLETE rhyming WORDS while PHONOGRAMS focus on LETTER SOUND COMBINATIONS',
        differentiation: 'Word Families show complete words grouped by ending SOUND/SPELLING (cat, bat, hat in AT family). Phonograms teach individual LETTER COMBINATIONS like "sh" sound, "th" sound.'
      }
    ],
    negative_descriptions: [
      'NOT phonogram work (which focuses on letter COMBINATIONS)',
      'NOT rhyming sound activity with objects',
      'NOT phonetic decoding practice'
    ],
    difficulty: 'easy',
  },
  {
    work_key: 'la_spelling_rules',
    name: 'Spelling Rules',
    area_key: 'language',
    category: 'Word Study',
    visual_description: 'CHART or CARD SET displaying ENGLISH SPELLING RULES with CLEAR EXAMPLES for each RULE: DOUBLING RULE (\'hop\' + \'ing\' = \'hopping\'—double final consonant before ADDING vowel suffix), SILENT E RULE (\'made\' removes final E when ADDING \'ing\' to make \'making\'—silent E DROPS before vowel suffix), Y TO I RULE (\'happy\' changes Y to I before ADDING suffix to make \'happier\'). COLOR-CODED CHART clearly LISTING each RULE with MULTIPLE EXAMPLES, or CARD PAIRS showing BEFORE and AFTER spelling transformation. Child READING RULE statement and APPLYING it to NEW WORDS not shown (TRANSFER learning). PATTERN RECOGNITION—consistent SPELLING RULE PATTERNS clearly visible throughout CHART. Words HIGHLIGHTED to show changed LETTERS. NOT word families (those group RHYMING words). NOT phonograms (those are LETTER combinations).',
    key_materials: ['Spelling rule reference charts', 'Word sorting materials by rule type', 'Before/after rule example cards'],
    confusion_pairs: [
      {
        work_key: 'la_prefixes_suffixes',
        reason: 'Both involve ADDING parts to words, but SPELLING RULES govern HOW letters CHANGE when ADDING suffixes while PREFIXES/SUFFIXES focus on MEANING change',
        differentiation: 'Spelling Rules show TRANSFORMATION patterns (hop→hopping, silent E drops). Prefixes/Suffixes focus on SEMANTIC change (happy→unhappy, play→playing).'
      }
    ],
    negative_descriptions: [
      'NOT word families or rhyming word groups',
      'NOT phonogram instruction (letter COMBINATIONS)',
      'NOT compound words or prefix/suffix work'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_compound_words',
    name: 'Compound Words',
    area_key: 'language',
    category: 'Word Study',
    visual_description: 'CARDS showing COMPOUND WORD FORMATION through VISUAL DECOMPOSITION: sun + flower displayed SEPARATELY on TWO cards with PLUS sign between them, then FINAL COMPOUND WORD "sunflower" shown SEPARATELY. Additional examples: rain + bow = rainbow, butter + fly = butterfly, tooth + brush = toothbrush, sun + set = sunset, snow + man = snowman. TWO WORD CARDS JOINED by PHYSICAL PLUS SIGN card (+), then FINAL COMPOUND CARD displayed SEPARATELY. PICTURE-WORD CARDS showing COMPOUND WORD matching to COLOR ILLUSTRATION (sunflower picture shows YELLOW flower attached to SUN). Child MATCHING TWO WORD PARTS to CREATE REAL COMPOUND WORD by SELECTING appropriate first and second WORDS. COMPOSITION demonstration—two SEPARATE SMALLER WORDS COMBINE to CREATE one LARGER WORD with NEW meaning. NOT prefixes/suffixes (those MODIFY meaning, not CREATE by COMBINING equal parts).',
    key_materials: ['Compound word cards', 'Compound word matching materials', 'Picture cards with compound words'],
    confusion_pairs: [
      {
        work_key: 'la_prefixes_suffixes',
        reason: 'Both combine word parts, but COMPOUND WORDS join two equal WORDS while PREFIXES/SUFFIXES MODIFY a root with non-equal PARTS',
        differentiation: 'Compound Words combine sun + flower (equal words) = sunflower. Prefixes/Suffixes add un- (prefix) or -ing (suffix) to a ROOT word to CHANGE meaning.'
      }
    ],
    negative_descriptions: [
      'NOT prefix/suffix work (which MODIFIES meaning rather than COMBINES equal words)',
      'NOT word families or spelling rules',
      'NOT syllable division or decoding practice'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_prefixes_suffixes',
    name: 'Prefixes and Suffixes',
    area_key: 'language',
    category: 'Word Study',
    visual_description: 'CARDS showing MORPHOLOGICAL WORD PARTS: PREFIXES (un-, re-, pre-, dis-, in-, mis-, over-, under-) and SUFFIXES (-ed, -ing, -er, -est, -ly, -tion, -ment, -ful, -less, -able). ROOT WORD with PREFIX and SUFFIX CARDS that can SLIDE or ATTACH before and AFTER: prefix "un-" + root "happy" = "unhappy", root "play" + suffix "-ing" = "playing". POSSIBLY COLOR-CODED (PREFIXES one color like YELLOW, roots another color like GREEN, SUFFIXES third color like BLUE). Child BUILDING NEW WORDS by systematically ADDING WORD PARTS to CHANGE or EXTEND meaning. MORPHOLOGY demonstrated—adding WORD PARTS MODIFIES or EXTENDS base WORD meaning. Examples show MEANING CHANGES: "happy" (positive) vs "unhappy" (negative), "play" (verb) vs "playing" (verb+action), "quick" (adjective) vs "quickly" (adverb). NOT compound WORDS (those COMBINE equal WORDS, not MODIFY with PARTS).',
    key_materials: ['Prefix/suffix cards color-coded', 'Root word cards', 'Word building materials with examples'],
    confusion_pairs: [
      {
        work_key: 'la_compound_words',
        reason: 'Both combine word parts, but PREFIXES/SUFFIXES MODIFY a ROOT with non-equal PARTS while COMPOUND WORDS join two equal WORDS',
        differentiation: 'Prefixes/Suffixes: un- (prefix) + happy (root) = unhappy (MEANING changes). Compound Words: sun (word) + flower (word) = sunflower (two equal WORDS joined).'
      }
    ],
    negative_descriptions: [
      'NOT compound words (which COMBINE equal words rather than MODIFY)',
      'NOT spelling rules or word families',
      'NOT syllable division practice'
    ],
    difficulty: 'hard',
  },
  {
    work_key: 'la_synonyms_antonyms',
    name: 'Synonyms and Antonyms',
    area_key: 'language',
    category: 'Word Study',
    visual_description: 'CARD PAIRS showing SEMANTIC RELATIONSHIPS: SYNONYMS with SAME MEANING (big/large, happy/joyful, run/sprint, beautiful/lovely) displayed NEXT to each other; ANTONYMS with OPPOSITE MEANING (hot/cold, fast/slow, happy/sad, beginning/end, open/close) displayed on OPPOSITE SIDES of card or SEPARATED visually. TWO WORD CARDS placed HORIZONTALLY NEXT TO each other for SYNONYM PAIRS, or VERTICALLY OPPOSITE for ANTONYM PAIRS. CHART with two COLUMNS labeled "SAME" and "OPPOSITE" showing EXAMPLE WORD PAIRS in each CATEGORY. Child MATCHING WORD PAIRS by SEMANTIC RELATIONSHIP—determining if words MEAN SAME or OPPOSITE. Cards may show PICTURE ILLUSTRATIONS alongside WORDS to clarify MEANING (picture of BIG dog, LARGE dog for synonyms; HAPPY face, SAD face for antonyms). NOT homonyms (those SOUND SAME but MEAN different—like "to/two/too"). NOT word families (those SHARE spelling PATTERNS).',
    key_materials: ['Synonym/antonym card pairs', 'Semantic relationship matching games', 'Comparison/contrast charts'],
    confusion_pairs: [
      {
        work_key: 'la_homonyms',
        reason: 'Both work with word MEANING relationships, but SYNONYMS/ANTONYMS have DIFFERENT SOUNDS while HOMONYMS SOUND IDENTICAL',
        differentiation: 'Synonyms/Antonyms: big/large (SOUND different, mean SAME), hot/cold (SOUND different, mean OPPOSITE). Homonyms: to/two/too (SOUND IDENTICAL /too/, but DIFFERENT meanings).'
      }
    ],
    negative_descriptions: [
      'NOT homonyms (words that SOUND SAME with different meanings)',
      'NOT word families or spelling patterns',
      'NOT rhyming activity'
    ],
    difficulty: 'medium',
  },
  {
    work_key: 'la_homonyms',
    name: 'Homonyms',
    area_key: 'language',
    category: 'Word Study',
    visual_description: 'CARDS or PICTURE CARDS showing HOMOPHONES—words that SOUND IDENTICAL but HAVE DIFFERENT MEANINGS and SPELLING: to/two/too, their/there/they\'re, here/hear, see/sea, sun/son, knight/night, brake/break, right/write, be/bee, sail/sale, deer/dear, meet/meat. PICTURE CARDS showing MEANING DIFFERENCES (BEACH with OCEAN water = "sea" vs LETTER C in ALPHABET = "see"—both SOUND SAME /sē/ but SPELLED DIFFERENTLY with DIFFERENT meanings). Child MATCHING HOMOPHONES to DIFFERENT ILLUSTRATIONS showing DISTINCT MEANINGS. Cards may display ONE SOUND phonetically (/tə/ sound) with MULTIPLE WRITTEN FORMS and PICTURES showing DIFFERENT MEANINGS. ONE IDENTICAL SOUND, MULTIPLE SPELLINGS and MEANINGS clearly shown. NOT synonyms/antonyms (those have DIFFERENT SOUNDS). NOT word families (those SHARE spellings).',
    key_materials: ['Homonym cards with pictures', 'Homophone matching materials', 'Picture cards showing different meanings'],
    confusion_pairs: [
      {
        work_key: 'la_synonyms_antonyms',
        reason: 'Both work with word MEANING relationships, but HOMONYMS SOUND IDENTICAL while SYNONYMS/ANTONYMS have DIFFERENT SOUNDS',
        differentiation: 'Homonyms: to/two/too SOUND IDENTICAL /too/ but are SPELLED differently and mean DIFFERENT things. Synonyms/Antonyms: big/large SOUND different but mean SAME or OPPOSITE.'
      }
    ],
    negative_descriptions: [
      'NOT synonyms or antonyms (which have different sounds)',
      'NOT word families (which share spelling patterns)',
      'NOT rhyming words'
    ],
    difficulty: 'medium',
  },
];
