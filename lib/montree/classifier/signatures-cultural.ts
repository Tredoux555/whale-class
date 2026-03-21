import type { WorkSignature } from './work-signatures';

export const CULTURAL_SIGNATURES: WorkSignature[] = [
  // ==================== GEOGRAPHY ====================
  {
    work_key: 'cu_globe_land_water',
    name: 'Globe - Land and Water',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'Spherical GLOBE with CONTRASTING TEXTURES: rough SANDPAPER on BROWN continental areas, SMOOTH POLISHED surface on BLUE water regions. Child\'s hands STROKING and FEELING the textured differences. NOT a colored globe (lacks vibrant color paint). NOT a flat map (is three-dimensional sphere).',
    key_materials: ['Wooden or plastic sphere', 'Sandpaper coating', 'Smooth finish'],
    confusion_pairs: ['cu_globe_continents'],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_globe_continents',
    name: 'Globe - Continents',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'Spherical globe with DISTINCT COLOR-CODED CONTINENTS: North America (one color), South America (different color), Europe, Africa, Asia, Australia all in different VIBRANT PAINT COLORS on SMOOTH surface. Child POINTING at and NAMING colored regions. NOT sandpaper globe (has smooth painted surface, not textured). NOT a puzzle (continents NOT removable).',
    key_materials: ['Wooden sphere', 'Smooth surface', 'Paint in 7 continent colors'],
    confusion_pairs: ['cu_globe_land_water'],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_puzzle_map_world',
    name: 'Puzzle Map - World',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'FLAT WOODEN PUZZLE with 7 REMOVABLE CONTINENT PIECES, each continent a different COLOR. Wood PUZZLE FRAME with INLAID BASE showing ocean. Child LIFTING and PLACING continent-shaped pieces back into frame using KNOBS (round wooden handles on top of each piece). NOT a globe (flat, not spherical). NOT country maps (shows only continents, not individual countries).',
    key_materials: ['Wooden frame', 'Wood puzzle pieces', 'Wooden knobs', 'Paint colors'],
    confusion_pairs: ['cu_puzzle_maps_continents'],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_puzzle_maps_continents',
    name: 'Puzzle Maps - Individual Continents',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'SET OF 6 SEPARATE WOODEN PUZZLE MAPS (one per continent, NOT world). Each map shows INDIVIDUAL COUNTRIES as removable WOODEN PIECES with KNOBS, color-coded. North America frame shows USA, Canada, Mexico as distinct pieces. Child SORTING and ASSEMBLING each continent separately, then placing back. Maps typically in wooden boxes stacked. NOT world puzzle (each is single continent zoom). NOT flat flat colored cards (puzzle pieces are 3D wooden with knobs).',
    key_materials: ['6 wooden puzzle frames', 'Country-shaped pieces', 'Wooden knobs', 'Painted colors'],
    confusion_pairs: ['cu_puzzle_map_world'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_flags',
    name: 'Flags of the World',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'COLLECTION OF MINIATURE FLAGS (2-3 inches tall) IN FLAG STANDS. Wooden or plastic STANDS with FABRIC FLAGS showing national colors and patterns (stripes, crosses, symbols). Flags include all continents. Child INSERTING flags into stands, MATCHING to country outlines on map, or DISPLAYING on shelf. NOT laminated flag cards (these are 3D fabric flags in stands). NOT flag puzzle (no puzzle fitting, just display/matching).',
    key_materials: ['Flag stands (wood/plastic)', 'Fabric flags', 'Paint'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_land_water_forms',
    name: 'Land and Water Forms',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'SET OF 4 3D CERAMIC or WOODEN TRAYS showing LANDFORM PAIRS in miniature. Each pair demonstrates complementary forms: (1) ISLAND (brown land protruding from blue water) and LAKE (blue water surrounded by brown land), (2) PENINSULA (land extending into water) and GULF (water extending into land), (3) ISTHMUS (narrow land strip connecting two lands) and STRAIT (narrow water channel), (4) CAPE (pointed land extending into sea) and BAY (curved water indenting coastline). Child OBSERVING, TRACING, and NAMING each pair. NOT flat diagrams (these are 3D tactile models). NOT animal habitats (shows only water/land forms, no vegetation).',
    key_materials: ['Ceramic or wooden trays', 'Blue and brown paint/glaze'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_solar_system',
    name: 'Solar System',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      '3D MODEL of the solar system with SPHERES representing SUN (large yellow/orange), and 8 PLANETARY SPHERES in graduated sizes and colors: Mercury (gray, tiny), Venus (yellow), Earth (blue-green), Mars (red), Jupiter (orange-brown with bands), Saturn (tan with visible ring), Uranus (light blue), Neptune (deep blue). Typically mounted on frame showing orbital paths or arranged on shelves. Child ARRANGING planets in correct order, LEARNING sizes and colors. NOT flat star chart (three-dimensional spheres). NOT just the Earth and moon (includes all 8 planets and sun).',
    key_materials: ['Wooden or plastic spheres', 'Paint in planet colors', 'Frame or base'],
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
      'LARGE WALL CALENDAR or STANDING CALENDAR with MOVABLE CARDS for DAYS, MONTHS, DATES. Wooden FRAME holding separate card sets. Cards display DAY NAMES (Monday-Sunday), MONTH NAMES (January-December), DATE NUMBERS (1-31), and often SEASON or WEATHER indication. Child ADVANCING cards each day, POINTING to current day/month/date. NOT a printed calendar (cards are individually movable). NOT a clock (shows dates/days, not hours).',
    key_materials: ['Wooden frame', 'Cardstock cards', 'Paint/print'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_birthday_celebration',
    name: 'Birthday Celebration',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'RITUAL SETUP with SMALL GLOBE on CENTER TABLE, surrounding CARDS representing 12 MONTHS arranged in CIRCLE around globe, and LIT CANDLE (sun). Child or teacher HOLDING globe, WALKING around the circle one revolution per year of life, while PASSING the candle (sun) on each lap, STOPPING at birth month. Not a game (ceremonial experience). NOT a puzzle (cards arranged in fixed circle). NOT a game board (ritual, not competitive).',
    key_materials: ['Small globe', 'Month cards', 'Candle (or safe light)', 'Cards showing zodiac or seasonal symbols'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_personal_timeline',
    name: 'Personal Timeline',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'PAPER or CARDBOARD STRIP laid out horizontally showing CHILD\'S LIFE EVENTS in CHRONOLOGICAL ORDER. Events marked with PHOTOGRAPHS or DRAWINGS, TEXT LABELS, and DATES. Might include: birth (with photo/picture), learning to walk, starting preschool, first pet, etc. Child ARRANGING or CREATING this sequence. NOT a calendar (shows specific events, not days). NOT a random scrapbook (events in STRICT TIME ORDER).',
    key_materials: ['Paper/cardboard strip', 'Photos or drawings', 'Text labels', 'Paint/markers'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_clock',
    name: 'Clock Work',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'LARGE LEARNING CLOCK (8-12 inches diameter) with MOVABLE HOUR AND MINUTE HANDS (typically RED for hour, BLUE for minute). Face shows NUMBERS 1-12 around edge, and often COLORED RINGS or SECTIONS marking hours, half-hours, and quarter-hours. Wood or plastic construction. Child ADJUSTING hands to show times called out, or READING time shown. NOT a puzzle (hands are movable, not puzzle pieces). NOT an analog watch (large classroom-size, not wrist-worn).',
    key_materials: ['Wood or plastic face', 'Movable clock hands', 'Numbers and markers', 'Fastener for hands'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_timeline_life',
    name: 'Timeline of Life',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'LONG HORIZONTAL TIMELINE (often 10-20 feet when unrolled) showing GEOLOGICAL AND BIOLOGICAL HISTORY of Earth. Displays eras (Precambrian, Paleozoic, Mesozoic, Cenozoic) with ILLUSTRATED CARDS or DRAWINGS showing PREHISTORIC CREATURES (dinosaurs, early mammals, early humans). Timeline uses COLOR BANDS for each era and shows RELATIVE TIME PROPORTIONS (Mesozoic era much longer than Cenozoic, represented by length). Child UNROLLING and STUDYING the sequence. NOT a calendar (geological timescale, not human history). NOT animal figurines (illustrations/cards, though sometimes small figurines placed on timeline).',
    key_materials: ['Paper or fabric strip', 'Illustrated cards', 'Color bands', 'Labels'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_fundamental_needs',
    name: 'Fundamental Needs of Humans',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'CHART or CARD SET showing UNIVERSAL HUMAN NEEDS categorized into groups. Often displays 4-5 main categories with ILLUSTRATIONS and LABELS: (1) PHYSICAL/MATERIAL needs (food, water, shelter, clothing, sleep), (2) SAFETY needs (protection, rules), (3) SOCIAL needs (family, friends, community), (4) EMOTIONAL/SPIRITUAL needs (art, music, love, meaning). Large laminated cards with PICTURES showing children/families demonstrating each need. NOT a fact card (comprehensive chart showing multiple needs, not single concept). NOT Maslow\'s pyramid (though related, typically simplified visual format).',
    key_materials: ['Cardstock cards', 'Illustrations/photos', 'Lamination', 'Labels'],
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
      'SET OF CLASSIFICATION CARDS (20-30 cards) showing OBJECTS divided into two categories. LIVING category displays: animals (bird, butterfly, cat), plants (tree, flower, grass). NON-LIVING category displays: rock, water, chair, book, pencil, car. Cards are LAMINATED or PRINTED with COLOR PHOTOS or ILLUSTRATIONS. Child SORTING cards into two piles, or MATCHING to category mats. NOT complex (simple binary living/non-living). NOT taxonomy (no subcategories like animal/plant). NOT puzzle (loose cards, not jigsaw pieces).',
    key_materials: ['Cardstock cards', 'Photos or illustrations', 'Lamination', 'Category mats'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_plant_animal',
    name: 'Plant vs Animal',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SET OF CLASSIFICATION CARDS (30-40 cards) dividing living things into PLANTS and ANIMALS. PLANT category shows: trees, flowers, grass, cactus, fern, lily pad. ANIMAL category shows: mammal (cat, dog, horse), bird (chicken, parrot), fish, insect, reptile. Cards LAMINATED with COLOR PHOTOS or HAND-DRAWN ILLUSTRATIONS. Child SORTING into two piles, or MATCHING under plant/animal headings. NOT subcategories (no fish vs mammal distinction yet, just plant vs animal). NOT overlapping (no debate - clear categorization).',
    key_materials: ['Cardstock cards', 'Illustrations/photos', 'Lamination', 'Category mats'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_parts_plant',
    name: 'Parts of a Plant',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE SHOWING COMPLETE PLANT ANATOMY with 4-5 REMOVABLE PIECES: ROOT (underground, brown, branching), STEM (green vertical), LEAF (flat green), FLOWER (colorful petals and center). Each piece has LABEL underneath or separately. Puzzle base shows soil layer (brown) and above-ground layer with SUN illustration. Typically includes COLORED LABELS (nomenclature cards) with matching colors. Child REMOVING and REPLACING pieces, NAMING parts. NOT flower puzzle alone (includes root, stem, leaf, flower). NOT realistic herbarium (simplified diagrammatic puzzle).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint', 'Labels and nomenclature cards'],
    confusion_pairs: ['cu_parts_flower', 'cu_parts_leaf', 'cu_parts_root', 'cu_parts_seed'],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_parts_flower',
    name: 'Parts of a Flower',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE SHOWING FLOWER CROSS-SECTION with 4-6 REMOVABLE PIECES: PETAL (colorful outer circle), SEPAL (green beneath petals), STAMEN (male reproductive, yellow stamens in center), PISTIL (female reproductive, center), and sometimes RECEPTACLE (base). Each part LABELED with COLOR-CODED NOMENCLATURE CARDS. Puzzle shows SIDE VIEW and sometimes CROSS-SECTION. Child IDENTIFYING and REPLACING pieces. NOT whole plant (focuses on flower only). NOT botanical (simplified diagram, not anatomically complex).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces', 'Paint', 'Nomenclature cards'],
    confusion_pairs: ['cu_parts_plant'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_leaf',
    name: 'Parts of a Leaf',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE SHOWING LEAF STRUCTURE with 3-4 REMOVABLE PIECES: BLADE (flat green), PETIOLE (stem attaching blade), VEINS (visible lines in blade, sometimes removable), and STIPULE (small bases at petiole). Large LEAF OUTLINE showing internal structure. COLOR-CODED LABELS with nomenclature cards matching each part. Child IDENTIFYING veins, understanding leaf attachment. Often displayed on yellow or green background to highlight the leaf. NOT flower (leaf only, no petals or reproductive parts). NOT leaf shape sorting (parts of structure, not types of leaves).',
    key_materials: ['Wooden puzzle base', 'Wooden pieces', 'Paint', 'Nomenclature cards'],
    confusion_pairs: ['cu_parts_plant'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_root',
    name: 'Parts of a Root',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE SHOWING ROOT SYSTEM with 3-4 REMOVABLE PIECES showing ROOT TYPES: TAPROOT (single large central root, like carrot), FIBROUS ROOTS (many thin spreading roots), and ROOT HAIRS (tiny absorption structures). Puzzle shows underground perspective with SOIL layer. May include ROOT CAP (protective tip). COLOR-CODED with nomenclature cards. Child COMPARING taproot vs fibrous, understanding absorption. NOT bulb (shows root systems, not bulb storage). NOT flower or leaf.',
    key_materials: ['Wooden puzzle base', 'Wooden pieces', 'Paint', 'Nomenclature cards'],
    confusion_pairs: ['cu_parts_plant'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_seed',
    name: 'Parts of a Seed',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE SHOWING SEED CROSS-SECTION with 3-4 REMOVABLE PIECES: SEED COAT (protective outer layer, brown or tan), EMBRYO (tiny plant inside), and COTYLEDON or COTYLEDONS (seed leaves that store food). Often shows MONOCOT (one cotyledon - like corn) and DICOT (two cotyledons - like bean) examples. Large SEED CUTAWAY showing internal structure. Includes real seeds for comparison. COLOR-CODED nomenclature. NOT flower (seed interior, not reproductive parts). NOT seedling (shows inside seed, not sprouted).',
    key_materials: ['Wooden puzzle base', 'Wooden pieces', 'Paint', 'Real seeds for comparison', 'Nomenclature cards'],
    confusion_pairs: ['cu_parts_plant'],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_plant_life_cycle',
    name: 'Plant Life Cycle',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SEQUENCE OF ILLUSTRATED CARDS or DRAWINGS showing plant growth stages: (1) SEED (whole seed, dormant), (2) GERMINATION (root emerging), (3) SEEDLING (roots and tiny leaves), (4) YOUNG PLANT (leaves and stem), (5) MATURE PLANT (full growth, flowering), (6) FLOWERING (flowers visible), (7) SEED FORMATION (fruits developing), (8) DISPERSAL (seeds released). Cards are LAMINATED or in CARD BOX, often COLOR-ILLUSTRATED. Child ARRANGING in correct sequence. May include actual planting materials for hands-on growing. NOT food cycle (plant growth only, not predation). NOT seasons (focuses on growth stages).',
    key_materials: ['Illustrated cards', 'Lamination', 'Card box', 'Optional: seeds, soil, containers'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_botany_experiments',
    name: 'Botany Experiments',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SET OF SCIENTIFIC EXPERIMENT MATERIALS showing plant needs through CONTROLLED EXPERIMENTS. Common setups: (1) WATER EXPERIMENT - identical plants, one watered, one dry (demonstrating water need), (2) LIGHT EXPERIMENT - identical plants, one in light, one in darkness (demonstrating light need), (3) SOIL EXPERIMENT - plants in good soil vs sand (demonstrating nutrition). Materials include: small pots, soil, seeds, water containers, labels, and OBSERVATION CHART for recording growth over days/weeks. Child SETTING UP, PREDICTING, OBSERVING, and RECORDING. NOT classroom display (hands-on experimental setup requiring ongoing observation and data collection).',
    key_materials: ['Pots or containers', 'Soil and sand', 'Seeds', 'Water', 'Labels', 'Recording chart'],
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
      'SET OF CLASSIFICATION CARDS (20-30) dividing animals by presence of BACKBONE. VERTEBRATE category shows: mammal (dog, horse), bird (chicken), fish (with fins and scales), reptile (turtle), amphibian (frog). INVERTEBRATE category shows: insect (butterfly, ant), spider (8 legs), worm, snail, jellyfish, crab. Cards LAMINATED with COLOR PHOTOS or ILLUSTRATIONS highlighting SPINE or LACK of spine. Child SORTING into two groups. NOT taxonomy (simple binary backbone/no backbone). NOT body part identification (focuses only on skeletal feature).',
    key_materials: ['Cardstock cards', 'Photos or illustrations', 'Lamination', 'Category labels'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_five_classes',
    name: 'Five Classes of Vertebrates',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF CLASSIFICATION CARDS dividing VERTEBRATES into 5 CLASSES: (1) FISH - scales, fins, gills, cold-blooded (illustrations of salmon, goldfish, shark), (2) AMPHIBIANS - moist skin, metamorphosis, cold-blooded (frog, salamander, newt), (3) REPTILES - dry scales, cold-blooded, lay eggs (turtle, snake, lizard), (4) BIRDS - feathers, warm-blooded, lay eggs (parrot, chicken, eagle), (5) MAMMALS - fur, warm-blooded, produce milk (cat, dog, horse, whale). Cards show DISTINGUISHING FEATURES clearly illustrated. Child SORTING animals by class, LEARNING characteristics. NOT order within classes (just 5 main vertebrate classes).',
    key_materials: ['Cardstock cards', 'Illustrations/photos', 'Lamination', 'Class label cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_fish',
    name: 'Parts of a Fish',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing FISH ANATOMY with REMOVABLE PARTS: DORSAL FIN (top), TAIL FIN (caudal fin, rear), PECTORAL FINS (side fins), GILL COVER (operculum), SCALES (body covering), LATERAL LINE (sensing organ). Puzzle shows SIDE VIEW of realistic fish. Each part COLOR-CODED with matching nomenclature cards. Often blue background suggesting water. Child IDENTIFYING fins, gills, and body structure. NOT fish skeleton (shows exterior features, not bones). NOT whole ecosystem (single fish anatomy).',
    key_materials: ['Wooden puzzle base', 'Wooden pieces', 'Paint', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_frog',
    name: 'Parts of a Frog',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing AMPHIBIAN ANATOMY (frog) with REMOVABLE PARTS: HEAD (with eyes, mouth, nostrils), FRONT LEGS (4 digits), HIND LEGS (5 digits, webbed), BODY, TAIL (if tadpole variant shown). Puzzle shows TOP VIEW and SIDE VIEW options. Color typically green with yellow/tan underside. COLOR-CODED nomenclature. Child LEARNING amphibian adaptations (webbed feet, moist skin indication). NOT tadpole (adult frog form). NOT skeleton (shows body parts and external features).',
    key_materials: ['Wooden puzzle base', 'Wooden pieces', 'Paint in frog colors', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_turtle',
    name: 'Parts of a Turtle',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing REPTILE ANATOMY (turtle/tortoise) with REMOVABLE PARTS: SHELL (carapace, upper), PLASTRON (underside shell), HEAD (with eyes, mouth, nostrils), FRONT LEGS (4 toes), HIND LEGS (4 toes), TAIL. Puzzle often shows TOP VIEW highlighting shell pattern. Brown and tan colors typical. COLOR-CODED nomenclature. Child UNDERSTANDING shell as defining turtle characteristic, leg structure. NOT terrapin/aquatic turtle (typically shows land tortoise form). NOT empty shell display (anatomical parts labeled).',
    key_materials: ['Wooden puzzle base', 'Wooden pieces', 'Paint in browns/tans', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_bird',
    name: 'Parts of a Bird',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing BIRD ANATOMY with REMOVABLE PARTS: BEAK (upper and lower), HEAD (with eye), WING (showing feather structure), TAIL FEATHERS (long feathers at rear), BODY, LEG, FOOT (with toes). Puzzle shows SIDE VIEW of typical bird (not specific species). Colors include brown, tan, white for plumage. COLOR-CODED nomenclature highlighting FEATHERS as distinguishing feature. Child LEARNING bird characteristics, feather types. NOT skeleton (external anatomy). NOT specific bird species detail (generic bird form).',
    key_materials: ['Wooden puzzle base', 'Wooden pieces', 'Paint in bird colors', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_horse',
    name: 'Parts of a Horse',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing MAMMAL ANATOMY (horse) with REMOVABLE PARTS: HEAD (ears, eyes, nostrils, mouth), NECK, MANE (hair on neck), BODY, LEGS (4, with HOOVES at base), TAIL. Puzzle shows SIDE VIEW of horse in profile. Brown or tan colors typical. COLOR-CODED nomenclature. Child LEARNING mammal characteristics (fur, hooves, limbs). Emphasizes MANE and TAIL as distinctive features. NOT skeleton (external body parts). NOT detailed saddle/tack elements.',
    key_materials: ['Wooden puzzle base', 'Wooden pieces', 'Paint in horse colors', 'Nomenclature cards'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_animal_habitats',
    name: 'Animal Habitats',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF HABITAT CARDS or DIORAMA-STYLE DISPLAYS showing DIFFERENT ENVIRONMENTS and ANIMALS living there. FOREST habitat shows trees, woodland animals (deer, squirrel, bird). OCEAN habitat shows water, marine animals (fish, dolphin, shark). DESERT habitat shows sand, desert animals (camel, lizard). ARCTIC habitat shows ice/snow, arctic animals (polar bear, seal). GRASSLAND habitat shows grass, grazing animals (zebra, lion). Cards LAMINATED or DIORAMA BOXES with 3D elements. Child MATCHING animal figurines to correct habitat. NOT animal identification alone (geography/ecology focus).',
    key_materials: ['Habitat cards or diorama boxes', 'Background illustrations', 'Optional: animal figurines', 'Labels'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_animals_continents',
    name: 'Animals of the Continents',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF CONTINENT MATS or MAPS with ANIMAL FIGURINES to place geographically. North America mat shows bear, moose, bald eagle, cougar. South America mat shows jaguar, macaw, llama, anaconda. Africa mat shows lion, elephant, zebra, giraffe. Asia mat shows tiger, panda, elephant, cobra. Europe mat shows fox, boar, eagle. Australia mat shows kangaroo, koala, platypus. Child PLACING figurines on correct continent, LEARNING geographic animal distribution. NOT animal encyclopedia (focuses on geographic placement). NOT habitat detail (simple continental categorization).',
    key_materials: ['Continent mats or maps', 'Small animal figurines', 'Labels'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_life_cycles',
    name: 'Animal Life Cycles',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SEQUENCE OF ILLUSTRATED CARDS showing METAMORPHOSIS and GROWTH CYCLES for multiple animals. BUTTERFLY cycle: (1) EGG (tiny), (2) LARVA/CATERPILLAR (green, eating), (3) PUPA/CHRYSALIS (hanging), (4) ADULT BUTTERFLY (winged, colorful). FROG cycle: (1) EGGS (cluster in water), (2) TADPOLE (swimming, tail, gills), (3) TADPOLE WITH LEGS (transitional), (4) ADULT FROG. CHICKEN cycle: (1) EGG, (2) CHICK (fluffy yellow), (3) GROWING CHICKEN (feathering), (4) ADULT CHICKEN. Cards LAMINATED with COLOR ILLUSTRATIONS. Child ARRANGING stages in order. NOT animal parts (shows complete life progression). NOT single animal (multiple life cycle examples).',
    key_materials: ['Illustrated cards', 'Lamination', 'Card storage box', 'Labels for each stage'],
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
      'WATER BASIN (large bowl or tray) with COLLECTION OF VARIOUS OBJECTS for testing: WOOD (floats), STONE (sinks), CORK (floats), METAL BOLT (sinks), SPONGE (floats), RUBBER (floats or sinks depending), GLASS (sinks). Objects visible in water, some FLOATING on surface, some RESTING on bottom. Child PLACING objects, PREDICTING sink/float before testing, OBSERVING results. Clear water shows contrast. NOT science equipment (common classroom objects). NOT boat testing (individual objects, not floating vessels).',
    key_materials: ['Water basin/bowl', 'Various test objects (wood, metal, cork, stone, sponge)', 'Clear water', 'Towels'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_magnetic',
    name: 'Magnetic/Non-Magnetic',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'COLLECTION OF TEST OBJECTS and MAGNET(S). Objects include: METAL (iron nail, steel paperclip - ATTRACTS), NON-METAL (plastic, wood, rubber, cork - NO ATTRACT), ALUMINUM (looks metal but does NOT attract), COPPER (looks metal but does NOT attract). Child HOLDING MAGNET and TESTING objects, OBSERVING which attract, SORTING into two groups. Magnet typically visible U-SHAPE or BAR MAGNET. Often objects STUCK to magnet surface. NOT electromagnet (simple permanent magnet). NOT motor (magnetism exploration, not mechanics).',
    key_materials: ['Magnet(s)', 'Metal objects', 'Non-metal objects', 'Sorting tray or labels'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_states_matter',
    name: 'States of Matter',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'DEMONSTRATION OR HANDS-ON MATERIALS showing three states: SOLID (ice cube, wood block, rock - HARD, SHAPE), LIQUID (water in glass - FLOWS, takes shape of container), GAS (steam from boiling water, or balloons showing air is gas - INVISIBLE or VISIBLE as movement). Often includes ILLUSTRATION CARDS showing molecular structure differences. Child OBSERVING transformations (ice melting to water, water heating to steam). Illustrated cards show SOLID particles tightly packed, LIQUID particles loose, GAS particles far apart. NOT chemical reaction (physical state changes only). NOT energy focus (though heating/cooling may be involved).',
    key_materials: ['Ice or solid', 'Water', 'Heat source for steam', 'Illustration cards', 'Optional: balloons or containers'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_color_mixing',
    name: 'Color Mixing',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'PRIMARY COLOR PAINT or DYE in three containers (RED, YELLOW, BLUE) with MIXING TRAYS or CUPS. Child COMBINING two primary colors to create SECONDARY colors: RED+YELLOW=ORANGE, YELLOW+BLUE=GREEN, RED+BLUE=PURPLE. Mixing materials visible: color changes obvious in water or paint. Often includes ILLUSTRATION CARD showing color wheel with primary (outer triangle) and secondary (between). NOT food coloring activity (paint or opaque dyes are typical). NOT color sorting (focuses on CREATION of new colors).',
    key_materials: ['Primary color paints/dyes', 'Mixing containers/trays', 'Brushes or droppers', 'Color wheel card'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_simple_machines',
    name: 'Simple Machines',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'SET OF SIMPLE MACHINE EXAMPLES OR DEMONSTRATIONS. (1) LEVER: wooden plank BALANCED on fulcrum, used to LIFT weight, SHOWING mechanical advantage. (2) PULLEY: rope over fixed wheel lifting load, SHOWING force change. (3) INCLINED PLANE: ramp allowing object to move up with LESS effort than vertical lift. Often includes LABELED DIAGRAMS showing how each machine works. Child EXPERIMENTING with load, OBSERVING effort reduction. NOT complex machines (focuses on 3-5 fundamental simple machine types). NOT puzzle (working demonstrations).',
    key_materials: ['Wooden lever and fulcrum', 'Pulley and rope', 'Inclined plane/ramp', 'Weights or loads', 'Diagram labels'],
    confusion_pairs: [],
    difficulty: 'hard'
  },

  {
    work_key: 'cu_nature_study',
    name: 'Nature Study',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'OUTDOOR OBSERVATION KIT including MAGNIFYING GLASS, NATURE JOURNAL (blank or with drawing prompts), PENCILS, and optional collection containers. Child WALKING outside, FINDING natural objects (leaves, rocks, insects, flowers), OBSERVING details through MAGNIFICATION, DRAWING or WRITING observations in journal. Often includes FIELD GUIDE or identification charts. Emphasizes careful observation and recording. NOT classroom experiment (outdoor exploration). NOT collecting (focused on observation, not accumulation of specimens).',
    key_materials: ['Magnifying glass', 'Nature journal', 'Pencils', 'Optional: field guide', 'Optional: collection container'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_weather',
    name: 'Weather Study',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'WEATHER TRACKING MATERIALS including WEATHER CHART (paper or laminated board with columns for Date, Temperature, Condition), THERMOMETER (large classroom thermometer showing both Celsius and Fahrenheit), SYMBOL CARDS (sun, cloud, rain, snow icons for daily weather), and PENCILS or MARKERS for recording. Child OBSERVING sky each day, READING thermometer, RECORDING temperature and weather in chart. Chart may show week or month of observations. Developing DATA over time. NOT weather prediction (observation and recording, not forecasting).',
    key_materials: ['Weather chart (paper or laminated)', 'Thermometer', 'Weather symbol cards', 'Markers or pencils', 'Optional: barometer or rain gauge'],
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
      'DRAWING MATERIALS collection: PENCILS (HB, B, 2B for shading), COLORED PENCILS, ERASERS, PAPER (white and colored). Often includes SKETCHBOOK or PAPER PAD. Child SITTING at table with pencil, creating marks on paper - lines, shapes, free drawing, or guided drawing following steps. Simple materials visible. Paper shows PENCIL MARKS in various shades. NOT painting (no liquid paint or water). NOT collage (no cutting or pasting). NOT sculpture (two-dimensional marks on surface).',
    key_materials: ['Pencils and colored pencils', 'Eraser', 'Paper/sketchbook', 'Sharpener', 'Optional: ruler or guide'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_painting',
    name: 'Painting',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'PAINTING SETUP with EASEL or table holding PAPER or CANVAS, PAINT in multiple colors (watercolor or acrylic), BRUSHES in various sizes, WATER CONTAINER for rinsing, PALETTE for mixing, APRON to protect clothing. Child PAINTING with BRUSH strokes, colors MIXING on paper or palette, WET PAINT visible. Often creates ABSTRACT or REPRESENTATIONAL designs. Paper may show MULTIPLE COLOR LAYERS. NOT drawing (wet paint, not dry pencil). NOT print-making (direct painting, not stamping). NOT sculpture (two-dimensional final work).',
    key_materials: ['Easel or table', 'Paper or canvas', 'Watercolor or acrylic paints', 'Brushes', 'Water container', 'Palette', 'Apron'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_collage',
    name: 'Collage',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'PAPER COLLAGE MATERIALS: COLORED PAPER (construction paper, magazine pages), SCISSORS, GLUE STICK or PASTE, GLUE BRUSH, and BASE PAPER. Child CUTTING colored paper into shapes or collecting pieces, ARRANGING on base paper, GLUING pieces to create composition. Finished work shows OVERLAPPING PAPER PIECES in various colors and shapes, some RAISED edges visible. Composition shows BALANCE or DESIGN. NOT painting (no paint/brushes, paper-based). NOT drawing (no pencil marks, assembled pieces). NOT sculpture (flat two-dimensional final work).',
    key_materials: ['Colored paper sheets', 'Scissors', 'Glue stick or paste', 'Glue brush', 'Base paper', 'Optional: magazines'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_clay',
    name: 'Clay and Playdough',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'CLAY or PLAYDOUGH with TOOLS for sculpting. Materials: soft CLAY (red, tan, white) or PLAYDOUGH (multiple bright colors), HANDS of child, and optional WOODEN SCULPTING TOOLS (rolling tool, shaping tool, cutting tool). Child ROLLING, SQUEEZING, PINCHING, STRETCHING the clay, creating THREE-DIMENSIONAL SHAPES - balls, snakes, pots, figures. Finished work shows handprints, indentations, and molded forms. Material is SOFT, MALLEABLE. NOT drawing (three-dimensional, not marks on paper). NOT painting (not liquid/wet). NOT carving (additive, not subtractive).',
    key_materials: ['Clay or playdough', 'Hands', 'Optional: sculpting tools', 'Work surface', 'Optional: oven for hardening clay'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_printmaking',
    name: 'Printmaking',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'PRINTMAKING MATERIALS: STAMPS (foam, rubber, carved shapes), INK or INK PAD (color), PAPER, and optional ROLLER for applying ink evenly. Child PRESSING stamp into ink, PLACING on paper, PRESSING DOWN firmly, LIFTING to reveal PRINTED IMAGE. Multiple stamped impressions visible on paper, showing PATTERN or DESIGN. Prints may be REPEATED motifs or VARIED positions. NOT painting (no brushes, ink is applied via stamp). NOT drawing (no pencil/crayon). NOT collage (no cutting/pasting of paper).',
    key_materials: ['Stamps (foam, rubber, or carved)', 'Ink pads or liquid ink', 'Paper', 'Optional: ink roller', 'Optional: carved blocks for advanced'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_art_appreciation',
    name: 'Art Appreciation',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'COLLECTION OF FAMOUS ARTWORK REPRODUCTIONS (prints or cards) with ARTIST CARDS and INFORMATION. Materials: high-quality COLOR REPRODUCTIONS of paintings (e.g., Monet water lilies, Van Gogh starry night, Picasso portrait), CARDS with artist name, dates, birthplace, style description, and artwork title. Child VIEWING reproductions, READING artist cards, DISCUSSING artwork, learning ART HISTORY and ARTISTIC STYLES. Cards may show ARTIST PORTRAIT and BIOGRAPHY. NOT original art (reproductions for education). NOT art making (appreciation/learning, not creating).',
    key_materials: ['High-quality art reproductions', 'Artist cards with information', 'Display setup', 'Optional: picture frames'],
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
      'SINGING ACTIVITY with SONG CARDS or SONG BOOK. Materials: PRINTED OR ILLUSTRATED SONG CARDS showing simple songs (nursery rhymes, children\'s folk songs), LYRICS printed clearly, often with SIMPLE ILLUSTRATIONS. Teacher or child SINGING while GROUP LISTENS and JOINS. May include optional PICTURE CARDS showing song content (animal songs with animal illustrations). Singing is ACOUSTIC, voices only (no instruments). NOT instrumental (voices only). NOT silent activity (vocal expression).',
    key_materials: ['Song cards', 'Optional: song book', 'Optional: illustration cards', 'Voices'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_rhythm',
    name: 'Rhythm Instruments',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'PERCUSSION INSTRUMENTS collection for exploring rhythm: DRUM (hand-played), TAMBOURINE (shaking produces jingling sound), MARACAS (wooden handles with seeds/beads inside), RHYTHM STICKS or CLAVES (wooden sticks clacked together), BELL or GONG (struck), WOODBLOCK (wooden struck). Child PLAYING instruments, CREATING sounds, EXPERIMENTING with RHYTHM, or FOLLOWING teacher\'s pattern. Instruments visible, producing SOUND. NOT pitched instruments (no melody, rhythm only). NOT silent (creates clear percussion sounds).',
    key_materials: ['Rhythm drums', 'Tambourine', 'Maracas', 'Rhythm sticks', 'Bells or chimes', 'Woodblock', 'Optional: rhythm cards'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_movement',
    name: 'Movement to Music',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'MUSIC PLAYER (recording or live music) with CHILDREN MOVING their BODIES to the SOUND. Child DANCING, MOVING arms, WALKING, SWAYING, STRETCHING in response to MUSIC. Space is OPEN for movement, floor visible. Children may have SCARVES or RIBBONS in hands creating flowing lines. Movement is FREE or STRUCTURED (following teacher). NOT seated (full-body movement). NOT instrument playing (kinesthetic response to sound).',
    key_materials: ['Music player or live musician', 'Music recordings', 'Open space', 'Optional: scarves or ribbons', 'Optional: props'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_bells',
    name: 'Montessori Bells',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'SET OF 13 WOODEN-HANDLED BELLS mounted on WOODEN BASE or arranged in ROWS. Each bell produces a SPECIFIC PITCH (C-D-E-F-G-A-B-C octave, and sometimes chromatic tones). Bells are IDENTICAL in appearance (child learns pitch by LISTENING, not visual cues). Child STRIKING each bell with MALLET, LISTENING to pitch, MATCHING pairs (identical pitches), or ARRANGING in PITCH ORDER from LOW to HIGH. Bells make CLEAR RINGING SOUND. Base is typically TAN or NATURAL WOOD color. Bells are SHINY BRASS or METAL. NOT xylophone (tuned percussion, not bells). NOT random percussion (specifically tuned pitches).',
    key_materials: ['13 tuned bells with wooden handles', 'Wooden base or carrier', 'Mallets', 'Optional: pitch labels for reference'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_music_appreciation',
    name: 'Music Appreciation',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'RECORDED CLASSICAL MUSIC with COMPOSER CARDS and LISTENING GUIDE. Materials: high-quality MUSIC RECORDINGS (e.g., Mozart, Beethoven, Bach, Debussy), CARDS with COMPOSER PORTRAIT, biography, dates, place of birth, and MUSIC PIECE TITLE and description. Child LISTENING to RECORDING while VIEWING cards, LEARNING composer names, RECOGNIZING different STYLES (Classical, Romantic, etc.). May include INSTRUMENT IDENTIFICATION cards showing which instruments play in each piece. NOT live performance (recorded music). NOT music making (appreciation/learning, not instrument playing).',
    key_materials: ['Music player', 'Classical music recordings', 'Composer cards with portraits', 'Biographical information', 'Optional: movement guides for listening'],
    confusion_pairs: [],
    difficulty: 'medium'
  }
];
