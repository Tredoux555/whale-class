import type { WorkSignature } from './work-signatures';

export const CULTURAL_SIGNATURES: WorkSignature[] = [
  // ==================== GEOGRAPHY ====================
  {
    work_key: 'cu_globe_land_water',
    name: 'Globe - Land and Water',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'Spherical GLOBE with CONTRASTING TACTILE TEXTURES: rough SANDPAPER material on BROWN continental masses representing land, SMOOTH POLISHED finish on BLUE painted regions representing water. Child\'s hands STROKING across the sphere, fingers FEELING the dramatic texture contrast between land and water. Typically resting on a wooden stand. NOT a colored smooth globe (texture is the key distinguishing feature - this one is ROUGH on land). NOT a flat map (three-dimensional sphere). NOT a puzzle (pieces are not removable).',
    key_materials: ['Wooden sphere', 'Sandpaper coating on continents', 'Smooth finish on water', 'Stand', 'Brown and blue paint'],
    confusion_pairs: ['cu_globe_continents'],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_globe_continents',
    name: 'Globe - Continents',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'Spherical globe with SEVEN DISTINCTLY COLORED CONTINENTS painted in SMOOTH, VIBRANT PAINT: North America (one bright color), South America (contrasting color), Europe (different color), Africa (distinct color), Asia (prominent color), Australia (small color), Antarctica (often white). Child POINTING at each colored region and NAMING continents. Smooth painted surface (NOT textured like sandpaper globe). NOT a textured sandpaper globe (smooth painted only). NOT a puzzle (continents are painted on, not removable).',
    key_materials: ['Wooden sphere', 'Smooth surface', 'Paint in 7 distinct continent colors'],
    confusion_pairs: ['cu_globe_land_water'],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_puzzle_map_world',
    name: 'Puzzle Map - World',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'FLAT WOODEN PUZZLE consisting of SEVEN REMOVABLE CONTINENT-SHAPED PIECES, each a different COLOR. Wooden rectangular frame/base showing ocean background. Each continent piece has a WOODEN KNOB (round handle) on top for easy grasping and lifting. Child REMOVING all continent pieces from the frame, then REINSERTING them back into their shaped recesses using the knobs. Puzzle sits on a low table at child\'s eye level. NOT a globe (flat, not spherical). NOT country-level maps (shows only continent outlines, no individual countries). NOT just loose cards (rigid wooden construction).',
    key_materials: ['Wooden frame base', 'Wooden continent pieces', 'Wooden knobs', 'Paint in continent colors'],
    confusion_pairs: ['cu_puzzle_maps_continents'],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_puzzle_maps_continents',
    name: 'Puzzle Maps - Individual Continents',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'SET OF SIX SEPARATE WOODEN PUZZLE MAPS, each showing ONE CONTINENT with its INDIVIDUAL COUNTRY PIECES. North America frame contains USA, Canada, Mexico as distinct removable pieces. Each continent puzzle in its own wooden box. Each country/region piece has a WOODEN KNOB for handling. Child SELECTING and ASSEMBLING one continent at a time, placing country-shaped pieces into the continent frame. Colors distinguish countries within each continent. NOT the world puzzle (each map is zoomed into a single continent, showing country detail). NOT a single flat map (6 separate puzzle boxes).',
    key_materials: ['6 wooden puzzle frames', 'Wooden country-shaped pieces', 'Wooden knobs', 'Paint colors for countries', 'Wooden boxes for storage'],
    confusion_pairs: ['cu_puzzle_map_world'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_flags',
    name: 'Flags of the World',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'COLLECTION OF MINIATURE FLAGS (2-3 inches tall) IN WOODEN or PLASTIC STANDS, representing countries from all continents. Flags are FABRIC with COLORS and PATTERNS: stripes (French flag - blue/white/red), crosses (Swiss flag - white cross), symbols (Chinese flag - yellow stars). Child INSERTING flags into stands, MATCHING flags to country outlines on a large world map, or DISPLAYING flags in sequence on a shelf. Flags are SMALL and PORTABLE. NOT laminated flat flag cards (these are 3D fabric flags mounted in stands). NOT a flag puzzle game (just matching/display activity).',
    key_materials: ['Flag stands (wood or plastic)', 'Fabric flags', 'Paint or fabric printing'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_land_water_forms',
    name: 'Land and Water Forms',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'SET OF 3-4 3D CERAMIC or CAST POTTERY TRAYS, each showing a PAIR OF COMPLEMENTARY LANDFORMS in miniature: (1) ISLAND (brown clay land surrounded on all sides by BLUE WATER) paired with LAKE (BLUE WATER completely surrounded by brown LAND), (2) PENINSULA (brown land extending into blue water on three sides) paired with GULF (blue water extending into brown land), (3) ISTHMUS (very narrow brown strip connecting two land masses) paired with STRAIT (narrow blue water channel separating two land masses), (4) CAPE (pointed brown projection extending into blue water) paired with BAY (curved blue indentation into brown coastline). Child TRACING fingers along the forms, OBSERVING the land-water relationships. NOT flat diagrams or cards (three-dimensional tactile models). NOT simple blue/brown coloring only (specific landform shapes are crucial).',
    key_materials: ['Ceramic or cast pottery trays (4 pairs)', 'Blue and brown glaze or paint', 'Smooth surfaces'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_solar_system',
    name: 'Solar System',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      '3D MODEL showing the SOLAR SYSTEM with SPHERES of different sizes and colors: SUN (large yellow-orange sphere, biggest), and EIGHT PLANETS in graduated sizes - Mercury (tiny gray), Venus (yellow), Earth (blue-green with visible continents), Mars (red), Jupiter (large orange-brown with atmospheric bands/stripes), Saturn (tan with visible RINGS extending outward), Uranus (light blue), Neptune (deep blue). Planets often arranged in orbital order on a frame or shelf display. Child ARRANGING planets by size and order, LEARNING colors and relative positions. NOT a flat star chart or poster (three-dimensional spheres). NOT just Earth and moon (includes full solar system with all 8 planets and sun).',
    key_materials: ['Wooden or plastic spheres in multiple sizes', 'Paint in planet colors', 'Rings for Saturn (wire or painted)', 'Frame or base for display'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  // ==================== HISTORY & TIME ====================
  {
    work_key: 'cu_calendar',
    name: 'Calendar Work',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'LARGE STANDALONE CALENDAR (2-3 feet wide) with MOVABLE SEPARATE CARD SETS displayed on wooden frame or stand. Includes: DAY-OF-WEEK CARDS (Monday through Sunday) on one rail, MONTH CARD (current month name) on another rail, DATE CARDS (1-31) on a third rail, and often WEATHER or SEASON indicators (sun card, rain card, snow card) on a fourth section. All cards are THICK CARDSTOCK with LARGE PRINTED or HAND-WRITTEN text. Child ADVANCING cards each morning, POINTING to current day/date/month, NAMING the weather. NOT a printed paper calendar (cards are individually movable on rails). NOT a clock (shows calendar dates and days, not time of day). Card movement is HORIZONTAL SLIDING on rails.',
    key_materials: ['Wooden frame or stand', 'Thick cardstock cards', 'Paint or print on cards', 'Sliding rails or card holders'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_birthday_celebration',
    name: 'Birthday Celebration',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'CEREMONIAL SETUP consisting of: SMALL GLOBE placed in CENTER of table, TWELVE MONTH CARDS arranged in a CIRCLE around the globe (January through December), a LIT CANDLE or SAFE LIGHT SOURCE representing the sun. Child or teacher HOLDING the globe, WALKING around the circle of month cards in a complete revolution for EACH YEAR of the child\'s life. The candle/sun is PASSED on each lap, with the walker STOPPING at the child\'s birth month. This is a RITUAL EXPERIENCE, not a competitive game. NOT a puzzle (cards are stationary in circle). NOT a game board (ceremonial walking activity).',
    key_materials: ['Small globe', 'Twelve month cards', 'Candle or safe light (sun representation)', 'Cards with month names and symbols'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_personal_timeline',
    name: 'Personal Timeline',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'LONG HORIZONTAL PAPER or CARDBOARD STRIP (3-6 feet) laid out linearly showing CHILD\'S LIFE EVENTS in STRICT CHRONOLOGICAL ORDER from left to right. Events marked with: PHOTOGRAPHS of the child, ILLUSTRATIONS or DRAWINGS, TEXT LABELS describing the event, and DATES or AGES. Typical events include: BIRTH (photo/illustration), LEARNING TO WALK (photo), FIRST BIRTHDAY, STARTING PRESCHOOL, FIRST PET, FAMILY TRIPS, LOSING FIRST TOOTH, etc. Events progress in clear TIME SEQUENCE. Child ARRANGING cards or CREATING this timeline by GLUING photos and writing labels. NOT a random scrapbook (events are in STRICT CHRONOLOGICAL ORDER). NOT a calendar (shows specific life events, not daily dates).',
    key_materials: ['Long paper or cardboard strip', 'Photographs or drawings', 'Text labels', 'Glue', 'Paint or markers'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_clock',
    name: 'Clock Work',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'LARGE LEARNING CLOCK (8-12 inches in diameter) with MOVABLE HOUR and MINUTE HANDS that child can physically ROTATE. Face displays NUMBERS 1-12 around the perimeter in LARGE TEXT. Hands are typically TWO DIFFERENT COLORS (red for hour hand, blue for minute hand) and different LENGTHS (minute hand longer). Face often includes COLOR-CODED RINGS or SECTIONS marking quarter-hours and half-hours. Wooden or plastic construction. Child MOVING hands manually to match times called out (e.g., "3 o\'clock"), or READING the time shown by the current hand positions. NOT a puzzle (hands rotate freely, not puzzle pieces). NOT a wristwatch (large table-top size for classroom use).',
    key_materials: ['Wood or plastic clock face', 'Two movable clock hands', 'Numbers 1-12', 'Colored rings or section markers', 'Central fastener/pivot'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_timeline_life',
    name: 'Timeline of Life',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'VERY LONG HORIZONTAL TIMELINE (10-30 feet when fully unrolled, often stored on a roll or in segments). Shows GEOLOGICAL AND BIOLOGICAL HISTORY of Earth across MILLIONS OF YEARS. Timeline displays MAJOR ERAS with COLOR-CODED BANDS: Precambrian (often gray), Paleozoic (green), Mesozoic (brown/tan), Cenozoic (warm colors). Includes ILLUSTRATED CARDS or DRAWINGS showing PREHISTORIC CREATURES representing each era: early bacteria, trilobites, fish, amphibians, dinosaurs (T-Rex, Triceratops, flying pterosaurs), early mammals, early humans. TIME PROPORTIONS are represented by PHYSICAL LENGTH (Mesozoic era significantly longer than Cenozoic, shown by much longer band). Child UNROLLING the timeline and STUDYING the progression of life. NOT a calendar (geological timescale spanning millions of years, not human history). NOT just dinosaurs (includes all life eras including modern).',
    key_materials: ['Long paper or fabric roll', 'Illustrated cards or drawings', 'Color bands for each era', 'Labels with era names', 'Card box for storage'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_fundamental_needs',
    name: 'Fundamental Needs of Humans',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'CHART or COMPREHENSIVE SET OF CARDS showing UNIVERSAL HUMAN NEEDS organized into 4-5 main categories with ILLUSTRATIONS and DESCRIPTIVE LABELS. Categories typically include: (1) PHYSICAL/MATERIAL NEEDS - PHOTOS of food, water, shelter/house, clothing, sleep/bed (2) SAFETY NEEDS - illustration of rules, protection, secure environment (3) SOCIAL/BELONGING NEEDS - PHOTOS of family, friends, community, playing together (4) EMOTIONAL/SPIRITUAL NEEDS - PHOTOS of art projects, music, love/hugging, play. Large LAMINATED CARDS with COLORFUL ILLUSTRATIONS and READABLE TEXT. Helps children understand that ALL humans share these basic needs regardless of culture. NOT a single-concept fact card (comprehensive chart showing multiple need categories). NOT Maslow\'s pyramid (though related concept, typically presented as simple visual chart/cards).',
    key_materials: ['Thick cardstock or foam board cards', 'Illustrations/photographs', 'Lamination', 'Labels and descriptive text'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  // ==================== BOTANY ====================
  {
    work_key: 'cu_living_nonliving',
    name: 'Living vs Non-Living',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SET OF 20-30 CLASSIFICATION CARDS showing OBJECTS divided into two clear groups. LIVING category displays LAMINATED COLOR PHOTOS or ILLUSTRATIONS: animal (bird, butterfly, dog, fish), plants (tree, flower, grass, cactus). NON-LIVING category shows: rock, water, chair, pencil, book, car, desk, shoe. Each card has a SINGLE LARGE IMAGE and simple LABEL TEXT. Child SORTING cards into two separate piles on a mat, or MATCHING cards under category headings (Living / Non-Living). This is BINARY classification - no middle category. NOT complex taxonomy (no subcategories). NOT puzzle pieces (loose cards).',
    key_materials: ['Laminated cardstock cards', 'Color photographs or illustrations', 'Category labels and mats'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_plant_animal',
    name: 'Plant vs Animal',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SET OF 30-40 CLASSIFICATION CARDS dividing LIVING THINGS into PLANTS and ANIMALS. PLANT category shows LAMINATED PHOTOS or ILLUSTRATIONS: flowering plant, grass, cactus, fern, tree, lily pad, mushroom. ANIMAL category shows: dog (mammal), bird (parrot/chicken), fish with fins, insect (butterfly/ant), reptile (turtle), amphibian (frog). Each card has a CLEAR IMAGE and LABEL. Child SORTING into two piles under "Plants" and "Animals" headers, or MATCHING cards to category mats. Distinctions are CLEAR-CUT - no ambiguous organisms at this level. NOT including microorganisms or fungi complexity (stays simple plant vs animal). NOT subcategories yet (no fish vs mammal distinction).',
    key_materials: ['Laminated cardstock cards', 'Color photographs or illustrations', 'Category label cards and mats'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_parts_plant',
    name: 'Parts of a Plant',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing a COMPLETE PLANT with 4-6 REMOVABLE PIECES. Puzzle is DIAGRAMMATIC showing: ROOT (brown, underground section with branching root hairs), STEM (green vertical section), LEAF (flat green piece with veins), FLOWER (colorful petals around center). Puzzle base/background shows TWO LAYERS - brown SOIL layer at bottom with roots, and green ABOVE-GROUND section with SUN illustration. Each removable piece SLOTS INTO a recess. LABELED TEXT underneath each piece or COLOR-CODED NOMENCLATURE CARDS (with matching colors) for each plant part. Child REMOVING and REPLACING pieces, NAMING each part, and UNDERSTANDING the plant structure. NOT just a flower puzzle (includes roots, stem, leaves, and flower together). NOT a realistic herbarium (simplified diagram/schematic puzzle).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint', 'Labels and color-coded nomenclature cards'],
    confusion_pairs: ['cu_parts_flower', 'cu_parts_leaf', 'cu_parts_root', 'cu_parts_seed'],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_parts_flower',
    name: 'Parts of a Flower',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing a FLOWER IN CROSS-SECTION or SIDE VIEW with 5-7 REMOVABLE PIECES revealing flower anatomy: PETAL (colorful outer circle of petals, removable as one or separate pieces), SEPAL (green leaves beneath petals, often removable), STAMEN (male reproductive parts, yellow stamens visible in center), PISTIL (female reproductive part, center structure), and RECEPTACLE (the base structure holding parts). Puzzle shows INTERNAL STRUCTURE - cross-section view revealing layers. Each part is COLOR-CODED with MATCHING NOMENCLATURE CARDS. Child IDENTIFYING and REPLACING pieces, learning reproductive plant structures. NOT a whole plant puzzle (focuses only on flower structure, not roots/stem/leaves). NOT realistic botanical specimen (simplified diagram).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint in flower colors', 'Color-coded nomenclature cards'],
    confusion_pairs: ['cu_parts_plant'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_leaf',
    name: 'Parts of a Leaf',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing LEAF STRUCTURE in DIAGRAMMATIC form with 4-5 REMOVABLE PIECES: BLADE (large flat green section - the main part of leaf), PETIOLE (thin stem attaching blade to branch), VEINS (visible lines running through blade - sometimes shown as separate removable pieces), MIDRIB (central vein), and sometimes STIPULE (small leaf-like base structures). Puzzle shows a LARGE LEAF OUTLINE, typically on a yellow or light green background for contrast. VISIBLE INTERNAL VEIN NETWORK shown in darker color. Child IDENTIFYING veins, understanding how leaves attach to stems. COLOR-CODED LABELS match nomenclature cards for each part. NOT a flower (leaf structure only, no petals or reproductive parts). NOT leaf shape sorting (focuses on internal structure of a single leaf type).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint', 'Color-coded nomenclature cards'],
    confusion_pairs: ['cu_parts_plant'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_root',
    name: 'Parts of a Root',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing ROOT SYSTEM STRUCTURES with 3-4 REMOVABLE PIECES showing two main ROOT TYPES: TAPROOT (single large central root like a carrot with smaller side roots), and FIBROUS ROOT SYSTEM (many thin spreading roots with no large central root, like grass). Puzzle shows UNDERGROUND perspective with BROWN SOIL section. May include ROOT CAP (protective tip) and ROOT HAIRS (tiny absorption structures visible on roots). COLOR-CODED LABELS with nomenclature cards. Child COMPARING the two root types, understanding how different plants absorb water and nutrients. NOT a bulb or corm (shows root systems specifically, not underground storage structures). NOT flower or leaf parts.',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Brown and root-colored paint', 'Nomenclature cards'],
    confusion_pairs: ['cu_parts_plant'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_seed',
    name: 'Parts of a Seed',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing a SEED IN CROSS-SECTION with 3-4 REMOVABLE PIECES revealing seed anatomy: SEED COAT (protective outer layer, typically brown or tan colored), EMBRYO (tiny plant inside, visible as small green structure), and COTYLEDON(S) - seed leaves that store food (one cotyledon in monocots like corn, two in dicots like beans). Puzzle shows SIDE VIEW of seed cross-section, often displaying BOTH monocot and dicot examples side by side. Large CUTAWAY illustration showing internal structure. Includes REAL SEEDS nearby for comparison and tactile exploration. COLOR-CODED nomenclature cards for each part. Child COMPARING monocot vs dicot seeds, understanding seed structure and germination readiness. NOT a flower or fruit (seed interior structures only). NOT a sprouted seedling (shows inside dormant seed).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint', 'Real seeds for comparison', 'Color-coded nomenclature cards'],
    confusion_pairs: ['cu_parts_plant'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_plant_life_cycle',
    name: 'Plant Life Cycle',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SEQUENCE OF 6-8 ILLUSTRATED CARDS or DRAWINGS showing complete plant growth stages in order: (1) SEED (whole seed, dormant, resting), (2) GERMINATION (root emerging from seed coat), (3) SEEDLING (small roots established, tiny leaves emerging), (4) YOUNG PLANT (roots growing deeper, multiple leaves visible, stem strengthening), (5) MATURE VEGETATIVE PLANT (full plant with many leaves, ready to flower), (6) FLOWERING STAGE (flowers visible, reproductive organs active), (7) SEED FORMATION (flowers fade, fruits/seed pods developing), (8) SEED DISPERSAL (mature seeds released, ready to spread). Cards are LAMINATED or in a CARD BOX set. Typically COLORFUL HAND-DRAWN or PHOTO ILLUSTRATIONS. Child ARRANGING cards in correct sequential order. Activity may include ACTUAL PLANTING MATERIALS (seeds, soil, pots, water) for hands-on growing observation. NOT a food crop cycle (shows plant growth structure only, not nutrition/consumption). NOT seasonal cycle (shows life stages, not calendar seasons).',
    key_materials: ['Illustrated cards (6-8)', 'Lamination or card box', 'Optional: seeds, soil, containers, water for growing'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_botany_experiments',
    name: 'Botany Experiments',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SET OF SCIENTIFIC EXPERIMENT MATERIALS for hands-on plant science exploration. Typically includes 2-3 CONTROLLED EXPERIMENTS demonstrating plant NEEDS: (1) WATER EXPERIMENT - two identical small potted plants placed side by side, one WATERED REGULARLY, one LEFT DRY, with OBSERVATION CHART showing growth differences over weeks, (2) LIGHT EXPERIMENT - two identical plants, one in BRIGHT LIGHT, one in DARKNESS or low light, showing how light affects growth, (3) SOIL EXPERIMENT - same seeds planted in GOOD SOIL vs SAND vs CLAY showing how soil quality affects growth. Materials include: small pots/containers, soil and other media, seeds, water containers, OBSERVATION CHART or JOURNAL for recording plant heights/colors over time (days/weeks). Child SETTING UP the experiment, PREDICTING outcomes, OBSERVING daily changes, RECORDING measurements and drawings. NOT a classroom display (requires ongoing active observation and data collection). NOT a completed demo (child participates in setup and monitoring).',
    key_materials: ['Pots or containers (multiple)', 'Soil, sand, clay media', 'Seeds', 'Water containers', 'Observation/recording chart', 'Measuring tools'],
    confusion_pairs: [],
    difficulty: 'hard'
  },

  // ==================== ZOOLOGY ====================
  {
    work_key: 'cu_vertebrate_invertebrate',
    name: 'Vertebrate vs Invertebrate',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF 20-30 CLASSIFICATION CARDS showing animals divided by BACKBONE presence. VERTEBRATE category shows LAMINATED PHOTOS or ILLUSTRATIONS with VISIBLE SPINE/BACKBONE highlighted: mammal (dog, horse, cat with visible spine), bird (chicken with neck vertebrae visible), fish (with backbone along center), reptile (turtle with shell housing spine), amphibian (frog with vertebral column visible). INVERTEBRATE category shows animals WITHOUT backbones: insect (butterfly, ant with segmented body), spider (8 legs, no spine), worm (segmented, no spine), snail (shell but no spine), jellyfish (gelatinous, no skeleton), crab (external shell, no internal spine). Cards often HIGHLIGHT the presence or ABSENCE of spine with colored outlines. Child SORTING animals into two groups. NOT detailed taxonomy (simple binary: has backbone / no backbone). NOT body part identification beyond skeletal feature.',
    key_materials: ['Laminated cardstock cards', 'Color photographs or illustrations', 'Lamination', 'Category label cards'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_five_classes',
    name: 'Five Classes of Vertebrates',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF CLASSIFICATION CARDS dividing VERTEBRATE ANIMALS into FIVE MAIN CLASSES, each with DISTINCTIVE CHARACTERISTICS clearly illustrated: (1) FISH - ILLUSTRATIONS showing scales, fins, gills (goldfish, salmon, shark), body adapted for water, cold-blooded, (2) AMPHIBIANS - PHOTOS showing moist smooth skin, legs for land, gills/lungs, metamorphosis (frog, salamander, newt), (3) REPTILES - ILLUSTRATIONS showing dry scaly skin, cold-blooded, lay eggs (turtle, snake, lizard, crocodile), (4) BIRDS - PHOTOS showing FEATHERS, beaks, wings, warm-blooded, lay eggs (parrot, chicken, eagle, penguin), (5) MAMMALS - PHOTOS showing FUR or hair, warm-blooded, produce milk from mammary glands (cat, dog, horse, whale, human). Each class card shows 2-4 example animals. DISTINGUISHING FEATURES are labeled clearly. Child SORTING animals by class, LEARNING vertebrate classification. NOT order/genus within classes (just 5 main vertebrate classes). Cards make distinctions OBVIOUS through illustrations.',
    key_materials: ['Cardstock cards', 'Color illustrations/photographs', 'Lamination', 'Class label cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_fish',
    name: 'Parts of a Fish',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a FISH (typically a simple fish shape like goldfish or salmon) with 5-7 REMOVABLE PIECES revealing fish anatomy: HEAD (including mouth and gills), BODY (main torso section), DORSAL FIN (back fin), PECTORAL FINS (side fins for steering), TAIL FIN (caudal fin for propulsion), GILL COVERS (operculum), SCALES (visible on body with texture). Puzzle shows SIDE VIEW of fish. Each part LABELED with COLOR-CODED NOMENCLATURE CARDS matching the fish piece colors. Background often shows water (blue) for context. Child IDENTIFYING fins and understanding their function in water movement. NOT a flower or mammal (fish-specific anatomy). NOT overly complex (simplified diagrammatic puzzle).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint in fish colors', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_frog',
    name: 'Parts of a Frog',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a FROG (toad or tree frog) with 5-7 REMOVABLE PIECES revealing amphibian anatomy: HEAD (large, with two prominent EYES on top), MOUTH (wide mouth for catching insects), BODY (squat torso), FRONT LEGS (shorter, with four digits), BACK LEGS (much longer and muscular, with webbed feet for jumping/swimming), and sometimes THROAT SAC (for males' croaking). Puzzle shows DORSAL VIEW (top-down perspective showing the frog from above). Background may show lily pad or water environment. COLOR-CODED NOMENCLATURE CARDS for each part. Child UNDERSTANDING amphibian structure, comparing to fish and other animals. NOT a fish (no fins, has legs and eyes adapted for air). NOT a mammal (smooth wet skin, metamorphosis, cold-blooded).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint in amphibian colors', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_turtle',
    name: 'Parts of a Turtle',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a TURTLE or TORTOISE with 5-6 REMOVABLE PIECES revealing reptile anatomy: SHELL (carapace, the large protective dome covering the back), PLASTRON (ventral shell on underside, removable as a piece), HEAD (with eyes, nostrils, mouth), FOUR LEGS (stubby reptilian limbs), and TAIL (extending from rear of shell). Puzzle shows DORSAL AND VENTRAL VIEWS (top and bottom perspectives). Shell pieces may show detailed scute patterns (hexagonal sections). COLOR-CODED LABELS with nomenclature cards. Background may show rocks or water. Child UNDERSTANDING the protective shell structure unique to reptiles. NOT a mammal (no fur, cold-blooded). NOT an amphibian (scaly protected shell, not moist skin).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint in reptile colors', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_bird',
    name: 'Parts of a Bird',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a BIRD (typically a generic bird shape like a chicken, parrot, or generic songbird) with 6-8 REMOVABLE PIECES revealing avian anatomy: HEAD (with beak, eyes, ears), BEAK (pointed, hard), BODY (covered in feathers), FEATHERS (specifically wing feathers and tail feathers as distinct pieces), WINGS (with visible feather arrangement), TAIL (fanned tail feathers, removable), LEGS (scaled bird legs with talons/claws), and sometimes COMB or CREST (on head of some birds). Puzzle shows SIDE VIEW with clear feather structure visible. COLOR-CODED NOMENCLATURE CARDS. Background may show sky or perch. Child IDENTIFYING unique bird features (feathers, beak, wings for flight). NOT a mammal (feathers, not fur; beak, not teeth). NOT a reptile (feathers distinguish from scaled reptiles).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint in bird colors', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_horse',
    name: 'Parts of a Horse',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a HORSE with 7-9 REMOVABLE PIECES revealing mammal anatomy: HEAD (with ears, eyes, nostrils), MANE (long hair on neck, often removable as separate piece), NECK (muscular), BODY (barrel chest and hindquarters), FRONT LEGS (two legs with hooves), BACK LEGS (two legs with hooves), TAIL (long flowing horse tail, often removable), and HOOVES (at end of each leg). Puzzle shows SIDE VIEW of horse. Clearly shows FUR texture and MANE detail. COLOR-CODED NOMENCLATURE CARDS. Background may show pasture or stable. Child IDENTIFYING mammalian features (fur, four legs, hooves). NOT a reptile or amphibian (fur-covered, warm-blooded). NOT a bird (hooves, mane, no wings).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint in horse colors/brown', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_animal_habitats',
    name: 'Animal Habitats',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF HABITAT CLASSIFICATION CARDS showing WHERE different animals LIVE. Typically includes 5-8 major habitat types with ILLUSTRATED CARDS or PHOTOS: (1) FOREST - dense trees, undergrowth, showing animals (deer, bear, squirrel, bird, insect), (2) GRASSLAND/SAVANNA - open field with grass, showing animals (zebra, lion, antelope, bird), (3) DESERT - sandy, sparse vegetation, showing animals (camel, lizard, scorpion, vulture), (4) OCEAN - water environment, showing animals (fish, whale, jellyfish, shark, sea turtle), (5) ARCTIC/ICE - snow and ice, showing animals (polar bear, penguin, seal, arctic fox), (6) JUNGLE/RAINFOREST - dense vegetation, wet, showing animals (monkey, jaguar, parrot, snake, insect), (7) MOUNTAIN - high elevation, showing animals (eagle, mountain goat, bear). Child MATCHING animal cards to habitat cards, or SORTING animals by where they live. NOT ecosystem food chain (focuses on habitat/home, not predator-prey).',
    key_materials: ['Cardstock habitat cards', 'Illustrated photographs', 'Lamination', 'Animal cards for matching'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_animals_continents',
    name: 'Animals of the Continents',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF ANIMAL FIGURINES or CARDS matched with CONTINENT MAPS or MAT sections. Typically shows 5-7 CONTINENT MATS (North America, South America, Europe, Africa, Asia, Australia, Antarctica) with REPRESENTATIVE ANIMALS for each: North America (moose, bald eagle, grizzly bear, mountain lion), South America (jaguar, anaconda, macaw, sloth, piranha), Europe (wolf, red fox, boar, eagle owl), Africa (lion, zebra, giraffe, hippopotamus, elephant, leopard), Asia (tiger, panda, elephant, rhinoceros, orangutan), Australia (kangaroo, koala, platypus, kookaburra), Antarctica (penguin, seal, whale). Child PLACING animal figurines or cards onto the correct continent mat, understanding geographic distribution of species. NOT food chain or ecosystem (focuses on animal geographic range). NOT detailed taxonomy (shows representative animals per continent).',
    key_materials: ['Continent mats or cards', 'Animal figurines or illustrations', 'Identification labels'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_life_cycles',
    name: 'Animal Life Cycles',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF LIFE CYCLE SEQUENCE CARDS showing METAMORPHOSIS and GROWTH STAGES of different animals, typically 2-4 different species: (1) BUTTERFLY LIFE CYCLE - ILLUSTRATED CARDS showing EGG (tiny on leaf), LARVA/CATERPILLAR (green worm-like, eating leaf), PUPA/CHRYSALIS (hanging protective case), and ADULT BUTTERFLY (winged insect), (2) FROG LIFE CYCLE - ILLUSTRATIONS showing EGGS (clustered in water), TADPOLE (fish-like, swimming with tail), TADPOLE WITH LEGS (tail reducing, legs growing), and ADULT FROG (no tail, four legs), (3) CHICKEN LIFE CYCLE - EGG, CHICK (fluffy), JUVENILE CHICKEN, ADULT HEN/ROOSTER. Cards are LAMINATED or in CARD BOXES. Each card shows CLEAR STAGES in sequence. Child ARRANGING cards in correct ORDER, understanding METAMORPHOSIS and GROWTH. NOT plant cycles (animal metamorphosis specifically). NOT continuous growth (shows distinct stages/transformations).',
    key_materials: ['Illustrated life cycle cards (2-4 sets)', 'Lamination or card boxes', 'Labels showing stage names'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  // ==================== PHYSICAL SCIENCE ====================
  {
    work_key: 'cu_sink_float',
    name: 'Sink and Float',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'HANDS-ON DENSITY EXPLORATION ACTIVITY with a LARGE WATER BASIN (shallow tub or table), and a COLLECTION OF VARIOUS OBJECTS with different DENSITIES: ITEMS THAT FLOAT - cork, wood block, foam, plastic cup, feather, sponge, rubber duck; ITEMS THAT SINK - rock, metal washer, glass marble, ceramic tile, plastic toy, rubber toy. Child PREDICTING which objects will float or sink, then PLACING them in water one by one to TEST predictions. Some objects are SURPRISING (solid plastic might float, certain wood might sink depending on density and water saturation). Often accompanied by a PREDICTION CHART where child marks predictions before testing. NOT a game with winners (scientific exploration activity). NOT food safety (uses non-toxic objects only).',
    key_materials: ['Water basin or large tub', 'Collection of objects in various materials', 'Prediction chart', 'Water', 'Towel for drying'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_magnetic',
    name: 'Magnetic/Non-Magnetic',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'HANDS-ON MAGNETISM EXPLORATION with MAGNETS and a COLLECTION OF OBJECTS, some ferromagnetic (attracted to magnets) and some non-magnetic. MAGNETIC OBJECTS include: metal washer, paper clip, iron nail, metal screw, metal spoon, metal fork, metal bolt. NON-MAGNETIC OBJECTS include: plastic fork, rubber eraser, wooden block, paper, glass marble, ceramic tile, aluminum foil, stone. Child USING a MAGNET to TEST each object, PREDICTING which ones the magnet will attract before testing, SORTING objects into two groups (Magnetic / Non-Magnetic). Often accompanied by a CHART for recording results. Child discovers that NOT all metal is magnetic (aluminum, stainless steel often not magnetic). NOT a magnet science lesson (hands-on discovery through experimentation). NOT electromagnetic (simple permanent magnets).',
    key_materials: ['Magnets (permanent, handheld)', 'Collection of objects (metal, plastic, wood, ceramic)', 'Prediction/results chart'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_states_matter',
    name: 'States of Matter',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'HANDS-ON EXPLORATION of SOLID, LIQUID, and GAS states of matter. Activities include: (1) SOLID demonstration - WOODEN BLOCK, ROCK, ICE CUBE (hard, holds shape, volume fixed), child HANDLING and OBSERVING, (2) LIQUID demonstration - WATER in container (takes shape of container, volume constant, flows), child POURING water, OBSERVING behavior, (3) GAS demonstration - STEAM from warm water (invisible gas, takes all available space), or WATER VAPOR observation. Often includes PHASE CHANGE activities: MELTING ice (solid to liquid), EVAPORATING water (liquid to gas using heat). Child IDENTIFYING objects as solid, liquid, or gas. May include ILLUSTRATION CARDS showing examples: solid (pen, book, shoe), liquid (water, milk, juice), gas (air, steam, oxygen). NOT phase changes only (focuses on properties of each state). NOT chemical reactions (physical state changes only).',
    key_materials: ['Ice cubes', 'Water containers', 'Heat source (warm water)', 'Examples of solids', 'State of matter cards', 'Chart showing three states'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_color_mixing',
    name: 'Color Mixing',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'HANDS-ON COLOR THEORY exploration with PRIMARY COLORS and COLOR MIXING. Setup includes: THREE PRIMARY COLORS - RED, YELLOW, BLUE (in liquid paint or water-based dyes in clear containers). Child COMBINING primary colors to create SECONDARY COLORS: RED + YELLOW = ORANGE, YELLOW + BLUE = GREEN, RED + BLUE = PURPLE. Activities include MIXING paints in shallow trays or cups, OBSERVING the color change, RECORDING results on a COLOR MIXING CHART. Optional WHITE and BLACK for tints and shades. Often includes TISSUE PAPER or CELLOPHANE overlays showing color mixing by light transmission. Child creating a color wheel. NOT complex color theory (stays with primary and secondary colors). NOT painting as art (focuses on scientific color observation).',
    key_materials: ['Primary color paints or dyes', 'Mixing trays or cups', 'Brushes or stirrers', 'White paper or chart', 'Color mixing wheel template'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_simple_machines',
    name: 'Simple Machines',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'SET OF DEMONSTRATION MATERIALS or MODELS showing BASIC MECHANICAL PRINCIPLES. Typically includes 3-5 simple machines: (1) LEVER - wooden rod resting on fulcrum (block), child LIFTING weight on one end, OBSERVING mechanical advantage, (2) PULLEY - rope through fixed block, child PULLING rope to LIFT object, DISCOVERING how pulley changes direction of force, (3) INCLINED PLANE - ramp at angle, child ROLLING or SLIDING objects down, comparing effort needed vs pushing straight up, (4) WHEEL AND AXLE - wooden wheel on axle, child TURNING wheel and OBSERVING how axle turns (or vice versa), (5) SCREW - demonstrating rotational motion converting to linear (optional, age-dependent). Each machine has ADJUSTABLE DIFFICULTY (fulcrum position on lever, angle of ramp). NOT complex engineering (simple basic principles only).',
    key_materials: ['Lever equipment', 'Pulley setup', 'Inclined plane/ramp', 'Wheel and axle demonstration', 'Weight or objects to move', 'Labels showing each machine'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_nature_study',
    name: 'Nature Study',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'OUTDOOR OBSERVATION and EXPLORATION activity encouraging close nature observation. Materials include: MAGNIFYING GLASS for detailed observation, NATURE JOURNAL (blank pages or structured observation guide) for DRAWING and RECORDING observations, COLLECTION BAG or BASKET. Child GOING on NATURE WALK outdoors, OBSERVING: plants (leaves, flowers, bark texture), insects (bugs, worms, spiders), small animals (birds, squirrels), rocks, soil, water features. Child COLLECTING natural items (leaves, smooth stones, interesting sticks, feathers) and BRINGING them indoors for closer examination. Child SKETCHING observations in journal, DESCRIBING colors, textures, patterns. NOT structured curriculum (free exploration and observation). NOT collection without observation (focus is on LOOKING CLOSELY and RECORDING).',
    key_materials: ['Magnifying glass', 'Nature journal', 'Pencils/markers', 'Collection bag', 'Field guides (optional)'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_weather',
    name: 'Weather Study',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'DAILY WEATHER OBSERVATION and RECORDING activity. Materials include: LARGE WEATHER CHART or BOARD mounted on wall, with MOVABLE CARDS or ICONS showing WEATHER CONDITIONS (sun, cloud, rain, snow, wind), THERMOMETER for reading temperature and RECORDING daily highs/lows on a TEMPERATURE GRAPH, WIND DIRECTION indicator (wind vane or simple pointer), PRECIPITATION GAUGE for measuring rainfall. Child OBSERVING weather conditions each day, MOVING weather icon card to TODAY\'S position, READING and RECORDING temperature, DESCRIBING conditions in journal. Often accompanied by WEATHER SYMBOLS showing different conditions (sunny, partly cloudy, rainy, stormy, snowy). Child may also OBSERVE and DISCUSS seasonal patterns. NOT detailed meteorology (simple daily observation and recording). NOT climate science (weather in current season).',
    key_materials: ['Weather chart/board', 'Weather icon cards', 'Thermometer', 'Temperature recording graph', 'Precipitation gauge', 'Wind vane', 'Weather observation journal'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  // ==================== ART ====================
  {
    work_key: 'cu_drawing',
    name: 'Drawing',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'CREATIVE DRAWING ACTIVITY with various DRAWING MATERIALS and PAPER. Materials include: PENCILS (wood pencils, colored pencils), CRAYONS (in color sets), MARKERS, ERASERS, and PAPER (white drawing paper, colored paper). Child DRAWING freely on paper, EXPLORING mark-making, LINE QUALITY, and COMPOSITION. Activity may include GUIDED DRAWING LESSONS (step-by-step drawings of objects like tree, house, animal) or purely FREE DRAWING. Child experimenting with different pressures, line weights, and media combinations. Art is displayed on walls, in portfolios, or in sketchbooks. NOT structured art production (focus on process and exploration, not product). NOT copying or tracing (freehand drawing emphasis).',
    key_materials: ['Drawing pencils', 'Colored pencils', 'Crayons', 'Markers', 'Erasers', 'Drawing paper (white/colored)', 'Pencil sharpener'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_painting',
    name: 'Painting',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'CREATIVE PAINTING ACTIVITY with PAINT MEDIA and BRUSHES. Setup includes: EASEL or TABLE for working surface, WATERCOLOR PAINTS or TEMPERA/ACRYLIC PAINTS in colors, PAINTBRUSHES (multiple sizes), WATER CONTAINERS for rinsing, PAPER or CANVAS, PALETTE for mixing colors, PAPER TOWELS. Child PAINTING freely on paper, EXPERIMENTING with colors, BRUSHWORK TECHNIQUES, and COMPOSITION. Activities may include: FREE PAINTING (child\'s choice of subject), GUIDED PAINTING LESSONS (specific technique like wet-on-wet, dry brush), COLOR EXPLORATION. Child OBSERVING how colors MIX on paper, how brush size affects line quality. NOT structured art assignment (process-oriented exploration). NOT copying artwork (original creation).',
    key_materials: ['Easel or table', 'Watercolor or tempera paints', 'Paintbrushes (various sizes)', 'Water containers', 'Paper or canvas', 'Palette', 'Paper towels', 'Apron'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_collage',
    name: 'Collage',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'CUT AND PASTE ARTWORK using PAPER MATERIALS and ADHESIVES. Materials include: COLORED PAPER (various colors), TISSUE PAPER, MAGAZINES for cutting images, SCISSORS (child-safe), GLUE STICK or LIQUID GLUE, and BACKING PAPER. Child SELECTING, CUTTING, and ARRANGING paper pieces to create COMPOSITION. Activities include: FREE COLLAGE (child\'s artistic choice), THEMED COLLAGE (cut images from magazines about a topic), PAPER TEARING (for fine motor work), COLOR COLLAGE (experimenting with color combinations). Child EXPERIMENTING with COMPOSITION, BALANCE, and COLOR ARRANGEMENT before GLUING. Art shows OVERLAPPING pieces, LAYERING, and SPATIAL RELATIONSHIPS. NOT structured template (child makes artistic choices about composition).',
    key_materials: ['Colored paper', 'Tissue paper', 'Magazines', 'Child-safe scissors', 'Glue stick or liquid glue', 'Backing paper', 'Optional: stamps, stickers, natural materials'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_clay',
    name: 'Clay and Playdough',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      '3D SCULPTURAL WORK with CLAY or PLAYDOUGH MATERIALS. Materials include: CLAY (natural clay - air-dry or kiln-fired) or PLAYDOUGH (salt dough, modeling compound), SCULPTING TOOLS (wooden tools, plastic tools, natural sticks), and WORK SURFACE. Child MANIPULATING material with hands and tools to create 3D FORMS: PINCHING, COILING, ROLLING, BUILDING. Creations may include: abstract shapes, recognizable objects (animals, houses, people), functional items (bowls, beads). Child EXPLORING texture, BALANCE, and SPATIAL RELATIONSHIPS. Activity STRENGTHENS hand muscles. NOT structured pottery instruction (free exploration and creation). NOT mold-based (hand-sculpted forms).',
    key_materials: ['Clay or playdough', 'Sculpting tools', 'Work board', 'Water for adhesion', 'Kiln (if air-dry clay)', 'Storage containers'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_printmaking',
    name: 'Printmaking',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'PRINT CREATION USING STAMPS, BLOCKS, and INKING. Materials include: RUBBER STAMPS (geometric shapes, letters, pictures), FOAM or WOODEN STAMPS, INK PADS or PAINT, STAMPING SURFACE (sponge or felt pad for ink absorption), and PAPER. Child PRESSING stamps into ink pads, then STAMPING onto paper to create PRINTS. Activities may include: FREE STAMPING (random placement), PATTERN CREATION (repeating stamps), PICTURE MAKING (combining stamps into scene). Optional advanced: CARVING stamps from erasers or linoleum (age-appropriate). Child EXPERIMENTING with PRESSURE, PATTERN, and COLOR (using multiple ink colors). Prints show CLEAR IMPRESSIONS and REPETITION. NOT painting (uses stamps, not brushes). NOT drawing (ink transfer, not line-making).',
    key_materials: ['Rubber stamps', 'Foam or wooden stamps', 'Ink pads or paint', 'Ink pad base/felt', 'Paper', 'Optional: carving tools, linoleum blocks (older children)'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_art_appreciation',
    name: 'Art Appreciation',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'STUDY OF FAMOUS ARTWORK and ARTISTS. Materials include: HIGH-QUALITY ART PRINTS of famous paintings/sculptures, ARTIST CARDS with biography information (name, birth/death, nationality, style), and DISCUSSION GUIDE. Child OBSERVING artwork closely, DISCUSSING: colors, composition, subject matter, artist\'s style, time period, cultural context. Activities include: ARTIST STUDY (learning about Van Gogh, Picasso, Monet, etc.), MOVEMENT STUDY (impressionism, cubism, abstract), TECHNIQUE OBSERVATION (brushwork, use of color, perspective). Optional: CREATING ARTWORK IN STYLE OF artist studied (after observation and appreciation). NOT art history lecture (child-led observation and discussion). NOT copying artwork (appreciation first, then optional creation).',
    key_materials: ['Art prints (high quality)', 'Artist biography cards', 'Discussion guide', 'Art books', 'Optional: materials for creating art inspired by famous works'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  // ==================== MUSIC ====================
  {
    work_key: 'cu_singing',
    name: 'Singing',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'GROUP SINGING ACTIVITY with SONGS and SONG CARDS. Materials include: LAMINATED SONG CARDS with LYRICS printed in LARGE TEXT, ILLUSTRATIONS for each song, and optional MUSICAL NOTATION. Child SINGING together in a group, with teacher LEADING or GUIDING. Songs typically include: SIMPLE CHILDREN\'S SONGS (twinkle twinkle, row row row your boat, old macdonald), SEASONAL SONGS, and CULTURAL SONGS. Child LEARNING to MATCH PITCH, FOLLOW RHYTHM, and CONTROL breathing/volume. Activities include: UNISON SINGING (all singing same melody), ECHO SINGING (teacher sings phrase, child echoes), CANON/ROUND (different groups singing same song offset). Optional GUITAR or PIANO accompaniment. NOT performance (group singing for participation and joy). NOT music notation instruction (singing prioritized).',
    key_materials: ['Song cards with lyrics', 'Illustrations', 'Optional: musical notation', 'Optional: guitar or keyboard', 'Music teacher (optional)'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_rhythm',
    name: 'Rhythm Instruments',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'PERCUSSION INSTRUMENT EXPLORATION and RHYTHM-MAKING. Materials include: RHYTHM INSTRUMENTS - tambourine (jingling metal discs), triangle (ringing bell-like tone), woodblock (wooden percussion), maracas (shaking instruments), drums (hand-struck), bells (pitch-varying), cymbals (crashing), rhythm sticks (striking each other). Child EXPLORING each instrument, DISCOVERING its sound, and PLAYING freely. Activities include: FREE EXPLORATION (making different sounds), PATTERN CREATION (repeating rhythm patterns), FOLLOWING SONGS (keeping beat or rhythm to music). Optional: PLAYING ALONG with recorded music, CREATING rhythmic compositions, UNDERSTANDING beat vs. rhythm concepts. NOT music notation (focus on ear and participation). NOT structured rhythm reading (exploration first).',
    key_materials: ['Percussion instruments (8-10 types)', 'Instrument storage box', 'Optional: recorded music', 'Optional: rhythm cards showing patterns'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_movement',
    name: 'Movement to Music',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'FREE MOVEMENT and DANCE ACTIVITY to RECORDED MUSIC. Setup includes: OPEN MOVEMENT SPACE (gymnasium or large classroom), MUSIC PLAYER, and VARIETY OF MUSIC (instrumental, cultural music, songs). Child MOVING FREELY to music: JUMPING, SPINNING, SWAYING, RUNNING, DANCING, using FULL BODY EXPRESSION. Activities include: FREE MOVEMENT (child moves however inspired), GUIDED IMAGERY (teacher describes scene and child moves to match), EMOTION DANCING (moving to show happy, sad, slow, fast), CULTURAL DANCES (learning traditional movements). Optional: SCARVES or RIBBONS for props, LIGHTS/PROJECTIONS for atmosphere. Child DEVELOPING body awareness, COORDINATION, and EXPRESSION. NOT structured dance class (free creative movement). NOT choreography (child-directed).',
    key_materials: ['Music player', 'Recorded music (variety)', 'Open space', 'Optional: scarves, ribbons, props', 'Optional: lighting effects'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_bells',
    name: 'Montessori Bells',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'PITCH DISCRIMINATION and MUSICAL TRAINING using MONTESSORI BELLS (a set of 8-13 tuned bells). SET includes: WOODEN STAND holding bells, each bell MOUNTED on wooden frame, WOODEN MALLETS for striking. Bells are TUNED to MUSICAL NOTES (typically C major scale, matching piano keys). Bells are typically COLOR-CODED for visual aid (red bells for white keys/do-re-mi-fa-sol-la-ti-do, blue bells for black keys). Child STRIKING bells with mallets, LISTENING to pitches, MATCHING SOUNDS, and PLAYING melodies. Activities include: MATCHING PAIRS (striking same note twice to find match), PITCH GRADING (arranging bells from lowest to highest note), SIMPLE MELODIES (playing twinkle twinkle or mary had a lamb). Children DEVELOPING EAR, understanding PITCH and MELODY. NOT complex music theory (focuses on listening and matching).',
    key_materials: ['Montessori bells (8-13 bells)', 'Wooden stand', 'Wooden mallets', 'Color coding', 'Storage tray'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_music_appreciation',
    name: 'Music Appreciation',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'LISTENING TO AND STUDYING CLASSICAL MUSIC and COMPOSERS. Materials include: RECORDED CLASSICAL MUSIC (pieces by famous composers), COMPOSER CARDS with BIOGRAPHY and PORTRAIT, and LISTENING GUIDE. Child LISTENING to ORCHESTRAL MUSIC, symphonies, or concertos, IDENTIFYING INSTRUMENTS, FOLLOWING MELODIES, and DISCUSSING emotional responses. Activities include: COMPOSER STUDY (learning about Bach, Mozart, Beethoven, Chopin), IDENTIFYING INSTRUMENTS (recognizing violin, piano, flute, drums in music), MOVEMENT to MUSIC (interpreting music through movement), FOLLOWING MUSICAL FORM (recognizing when melody repeats or changes). Optional: ATTENDING LIVE PERFORMANCE or CONCERT. NOT music theory instruction (appreciation and listening prioritized). NOT performance (listening and responding).',
    key_materials: ['Recorded classical music', 'Composer biography cards', 'Listening guide/worksheets', 'Instrument identification cards', 'Music player with speakers'],
    confusion_pairs: [],
    difficulty: 'medium'
  }
];
