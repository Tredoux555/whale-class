import type { WorkSignature, ConfusionPair } from './work-signatures';

// 50 Cultural works - CLIP visual descriptions (escaped apostrophes verified)
export const CULTURAL_SIGNATURES: WorkSignature[] = [
  // ==================== GEOGRAPHY ====================
  {
    work_key: 'cu_globe_land_water',
    name: 'Globe - Land and Water',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'SPHERICAL WOODEN GLOBE (10-14 inches diameter) mounted on a LOW NATURAL BEECHWOOD STAND (~4 inches tall) with adjustable pivot allowing full 360-degree rotation. The SURFACE is divided into TWO DRAMATICALLY CONTRASTING TACTILE ZONES: (1) LAND AREAS covered in COARSE BROWN SANDPAPER creating a ROUGH, TEXTURED feel when fingers stroke across continents (North America, South America, Europe, Africa, Asia, Australia, Antarctica), (2) OCEAN AREAS painted in SMOOTH POLISHED FINISH of DEEP BLUE creating an entirely SMOOTH sensation - the texture contrast is IMMEDIATELY NOTICEABLE and INTENTIONAL. Child\'s hands are actively FEELING and STROKING the globe surface, fingers EXPLORING the dramatic transition between rough and smooth zones. From 1-2 meters: instantly recognizable as a two-tone sphere (brown rough + blue smooth) on a wooden stand. NOT a smooth colored globe (texture is the ABSOLUTE KEY distinguishing feature - no texture means wrong work). NOT a flat map or puzzle (three-dimensional sphere with permanent painted/textured zones).',
    key_materials: ['Wooden sphere blank', 'Coarse sandpaper material', 'Brown and blue paint', 'Natural beechwood stand', 'Pivot mechanism', 'Mounting hardware'],
    confusion_pairs: [
      {
        work_key: 'cu_globe_continents',
        reason: 'Both spherical globes on wooden stands with similar size and mounting',
        differentiation: 'ROUGH SANDPAPER texture on land areas vs SMOOTH painted colors'
      }
    ],
    negative_descriptions: [
      'NOT a smooth colored globe (must have rough sandpaper texture)',
      'NOT a flat map or puzzle (three-dimensional sphere)',
      'NOT a globe showing countries (only continents vs land/water zones)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_globe_continents',
    name: 'Globe - Continents',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'SPHERICAL POLISHED WOODEN GLOBE (12-14 inches diameter) featuring SEVEN DISTINCTLY PAINTED CONTINENTS in SMOOTH GLOSSY PAINT with MONTESSORI-STANDARD COLORS creating maximum visual separation: North America (BRIGHT ORANGE), South America (CORAL PINK/SALMON), Europe (VIBRANT RED), Africa (FOREST GREEN), Asia (WARM YELLOW), Australia/Oceania (WARM BROWN), Antarctica (PURE WHITE or LIGHT GRAY). Ocean areas are SOLID PAINTED BLUE with NO TEXTURE (unlike sandpaper globe). Each continent is delineated with THIN BLACK BOUNDARY LINES creating clear separation. The globe ROTATES SMOOTHLY on its wooden stand. Child ROTATING the globe, POINTING at colored regions, NAMING continents aloud, TRACING continent outlines with fingertips on the smooth painted surface. From 1-2 meters: a brightly colored sphere with SEVEN DISTINCT COLORED PATCHES and clear continent boundaries on a stand. NOT textured (smooth paint only - immediate contrast with sandpaper globe\'s roughness). NOT a puzzle (continents painted on, not removable).',
    key_materials: ['Wooden sphere blank', 'Smooth glossy paint (7 continent colors)', 'Blue ocean paint', 'Black paint for boundaries', 'Wooden stand with pivot', 'Mounting hardware'],
    confusion_pairs: [
      {
        work_key: 'cu_globe_land_water',
        reason: 'Both spherical globes on wooden stands with similar size and mounting',
        differentiation: 'SMOOTH painted colors on continents vs ROUGH sandpaper texture'
      }
    ],
    negative_descriptions: [
      'NOT a textured sandpaper globe (must be smooth painted)',
      'NOT a puzzle globe with removable pieces (continents painted on, fixed)',
      'NOT a globe showing countries (only seven continent colors, no internal boundaries)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_puzzle_map_world',
    name: 'Puzzle Map - World',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'FLAT RECTANGULAR WOODEN PUZZLE (approximately 18×24 inches) consisting of SEVEN LARGE CONTINENT-SHAPED WOODEN PIECES, each a DISTINCTLY DIFFERENT COLOR matching Montessori standards. Wooden BASE FRAME/TRAY shows PAINTED BLUE OCEAN background. Each continent piece features a PROMINENT WOODEN KNOB (round handle, 1-2 inches diameter) mounted on TOP for ergonomic grasping and lifting by small hands. Puzzle sits on a LOW TABLE at child\'s working level. Child REMOVES all continent pieces from the frame by GRASPING knobs, OBSERVES the ocean base, then REPLACES each piece back into its precisely SHAPED WOODEN RECESS using the knob for guidance. Pieces fit only in correct orientation and position. Frame shows continent outlines as RECESSED AREAS. From 1-2 meters: a wooden puzzle frame with seven large colored wooden pieces and visible knobs at top of each piece. NOT a globe (flat, not spherical). NOT country-level maps (only seven continent outlines, no internal country boundaries). NOT loose cards (rigid wooden construction with satisfying click when pieces seat correctly).',
    key_materials: ['Wooden frame base/tray', 'Seven wooden continent pieces', 'Wooden knobs (one per piece)', 'Paint in continent colors (matching globe)', 'Blue paint for ocean background'],
    confusion_pairs: [
      {
        work_key: 'cu_puzzle_maps_continents',
        reason: 'Both wooden puzzles with country/continent pieces and knobs on flat bases',
        differentiation: 'SEVEN LARGE pieces (continents) vs MANY SMALL pieces (countries within continents)'
      }
    ],
    negative_descriptions: [
      'NOT a spherical globe (flat wooden puzzle, not 3D)',
      'NOT a country-level map (only seven continent-level pieces)',
      'NOT flagcards or loose materials (rigid wooden puzzle frame with knobbed pieces)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_puzzle_maps_continents',
    name: 'Puzzle Maps - Individual Continents',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'COMPLETE SET OF SIX SEPARATE WOODEN PUZZLE BOXES, each containing ONE CONTINENT with DETAILED COUNTRY-LEVEL PUZZLE PIECES. Set includes: (1) NORTH AMERICA PUZZLE with USA, Canada, Mexico as distinct removable pieces with knobs, (2) SOUTH AMERICA PUZZLE with Brazil, Peru, Argentina, etc., (3) EUROPE PUZZLE with France, Germany, Italy, Spain, UK, etc., (4) AFRICA PUZZLE with Egypt, Kenya, South Africa, Nigeria, etc., (5) ASIA PUZZLE with China, India, Japan, Thailand, etc., (6) AUSTRALIA/OCEANIA PUZZLE with Australia, New Zealand, Pacific islands. Each puzzle is housed in its OWN WOODEN BOX or wooden frame. Countries within each continent are painted in DIFFERENT COLORS (but lighter shades than world puzzle). Each country piece has a WOODEN KNOB for handling. Interior frame shows continent OUTLINE and COUNTRY BOUNDARIES as RECESSED AREAS. Child SELECTS one continent box, REMOVES all country pieces using knobs, STUDIES the geography, and REPLACES pieces into correct positions. Pieces fit snugly with satisfying resistance. From 1-2 meters: six separate wooden puzzle boxes showing continent names, each containing colored wooden puzzle pieces. NOT the world puzzle (each is zoomed into single continent with country detail instead of continent outlines). NOT loose cards (rigid wooden puzzles in storage boxes).',
    key_materials: ['Six wooden puzzle frames/boxes', 'Approximately 60-80 wooden country-shaped pieces total', 'Wooden knobs (one per piece)', 'Paint in country colors', 'Wooden storage boxes', 'Labels with continent/country names'],
    confusion_pairs: [
      {
        work_key: 'cu_puzzle_map_world',
        reason: 'Both wooden puzzles with continent-related pieces and knobs on flat bases',
        differentiation: 'MANY SMALL pieces (countries within one continent) vs SEVEN LARGE pieces (continents only)'
      }
    ],
    negative_descriptions: [
      'NOT the world puzzle (multiple separate boxes per continent, not one frame)',
      'NOT continent-level detail (country-by-country pieces with internal boundaries)',
      'NOT a globe or 3D representation (flat wooden puzzles in storage boxes)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_flags',
    name: 'Flags of the World',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'COLLECTION OF APPROXIMATELY 50-100 MINIATURE FLAGS (2-4 inches tall) mounted in WOODEN or PLASTIC STANDS, representing countries from all seven continents. Flags are FABRIC (cotton or silk-like synthetic) with PRINTED or SEWN COLORS and PATTERNS: STRIPED FLAGS (French flag: blue/white/red vertical stripes, Italian flag: green/white/red vertical), SOLID COLORED WITH SYMBOLS (Chinese flag: red with yellow stars, Brazilian flag: green with yellow diamond), CROSSES (Swiss flag: white cross on red, Nordic flags: offset crosses), COMPLEX PATTERNS (UK Union Jack, Japanese rising sun circle). Flag stands are typically NATURAL WOOD or colored plastic ABOUT 4-6 INCHES TALL. Child INSERTS flags into stands, MATCHES flags to country outlines on LARGE WORLD MAP displayed on wall or table, ARRANGES flags in continental groupings, or DISPLAYS flags on shelf. Flags are SMALL, PORTABLE, and designed for TACTILE EXPLORATION. From 1-2 meters: colorful small fabric flags with distinctive patterns mounted in stands. NOT laminated flat flag cards (these are 3D fabric flags mounted in stands, not paper cards). NOT flags attached to puzzles (loose flags in independent stands).',
    key_materials: ['Flag stands (wood or plastic, 50-100 count)', 'Fabric flags (pre-made)', 'World map for reference', 'Flag storage box', 'Optional: flag identification guide'],
    confusion_pairs: [
      {
        work_key: 'cu_puzzle_map_world',
        reason: 'Both teach geography using visual/tactile materials at child height',
        differentiation: 'Flags are SMALL FABRIC ON STANDS vs LARGE WOODEN PUZZLE with fixed pieces'
      }
    ],
    negative_descriptions: [
      'NOT laminated flat flag cards (these are 3D fabric flags, not paper)',
      'NOT flags sewn into a puzzle (independent stands with loose flag insertion)',
      'NOT a map itself (flags are separate materials matched to maps, not integrated maps)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_land_water_forms',
    name: 'Land and Water Forms',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'SET OF FOUR PAIRS OF LANDFORM TRAYS (3-4 separate trays total), each a THREE-DIMENSIONAL CERAMIC or CAST POTTERY MODEL showing COMPLEMENTARY LAND/WATER RELATIONSHIPS in miniature scale (approximately 6×8 inches per tray). Trays showcase: (1) ISLAND vs. LAKE PAIR - island shows BROWN/TAN CERAMIC LAND completely surrounded on all sides by a BLUE-GLAZED WATER depression, lake shows BLUE WATER completely surrounded and enclosed by BROWN LAND forming a closed ring, (2) PENINSULA vs. GULF PAIR - peninsula shows brown land extending into blue water on THREE sides (attached on one side only), gulf shows blue water extending deeply into brown land on three sides (open to larger water body), (3) ISTHMUS vs. STRAIT PAIR - isthmus shows extremely NARROW BROWN land bridge connecting two larger land masses (approximately 1 inch wide), strait shows NARROW BLUE WATER CHANNEL separating two land masses (approximately 1 inch wide), (4) CAPE vs. BAY PAIR - cape shows POINTED brown land projection extending sharply into blue water, bay shows curved blue water INDENTATION into brown land (concave). Each tray has SMOOTH GLAZED SURFACES showing clear LAND (rough textured brown) and WATER (smooth glazed blue) contrast. Child TRACES fingers along the three-dimensional forms, OBSERVES land-water relationships from all angles, and UNDERSTANDS geographic vocabulary through tactile spatial experience. From 1-2 meters: ceramic trays with brown and blue elements showing clear topographic relationships. NOT flat diagrams (three-dimensional tactile models). NOT simple blue/brown coloring only (specific landform SHAPES are absolutely crucial for recognition).',
    key_materials: ['Four ceramic or cast pottery trays (8 landforms total)', 'Brown/tan and blue glaze', 'Smooth surfaces for tracing', 'Labels with landform names', 'Trays or storage box'],
    confusion_pairs: [
      {
        work_key: 'cu_globe_land_water',
        reason: 'Both show brown land and blue water in tactile/visual form',
        differentiation: 'LANDFORM TRAYS show specific geographic SHAPES vs GLOBE shows textured surface contrast'
      }
    ],
    negative_descriptions: [
      'NOT flat diagrams or 2D maps (three-dimensional tactile ceramic models)',
      'NOT just brown and blue coloring (specific topographic SHAPES are the key)',
      'NOT globes or puzzles (small ceramic trays showing 8 complementary pairs)',
      'NOT floating pieces (all landforms are molded into a single tray per pair)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_solar_system',
    name: 'Solar System',
    area_key: 'cultural',
    category: 'Geography',
    visual_description:
      'THREE-DIMENSIONAL SCALE MODEL of the SOLAR SYSTEM featuring SPHERES of DRAMATICALLY DIFFERENT SIZES and DISTINCT COLORS representing celestial bodies. Model includes: (1) SUN - LARGEST SPHERE (approximately 6-8 inches diameter), BRIGHT YELLOW-ORANGE color, sometimes with surface texture painted to show solar features, (2) EIGHT PLANETS in GRADUATED SIZES with PLANET-SPECIFIC COLORS - Mercury (tiny gray/dark, ~0.5 inch), Venus (yellow ~1 inch), Earth (blue-green ~1 inch with visible continent shapes or patterns), Mars (rust red ~0.75 inch), Jupiter (LARGE orange-brown ~3 inches with visible atmospheric band stripes/swirls painted on surface), Saturn (tan/golden ~2.5 inches WITH PROMINENT RING SYSTEM - white or painted rings extending outward from equator creating the iconic ringed appearance), Uranus (pale blue ~1.5 inches), Neptune (deep blue ~1.5 inches). Planets are arranged in a LINEAR SEQUENCE showing orbital order on a wooden FRAME or SHELF DISPLAY. Model may include the SUN on a central post with planets arranged around it. Child ARRANGES planets by size and order from the sun, NAMES each planet, LEARNS colors and relative positions, and UNDERSTANDS the solar system structure through three-dimensional spatial relationships. From 1-2 meters: spheres of varying sizes and colors arranged in sequence, with Saturn\'s rings immediately distinguishable. NOT a flat star chart (three-dimensional spheres, not 2D poster). NOT just Earth and moon (includes full solar system with all eight planets and sun).',
    key_materials: ['Wooden or plastic spheres (9 total, in varying sizes)', 'Paint in planet colors', 'Ring system for Saturn (wire rings or painted rings)', 'Wooden frame or display base', 'Planet labels', 'Optional: mobile-style hanging arrangement'],
    confusion_pairs: [
      {
        work_key: 'cu_globe_continents',
        reason: 'Both are painted spheres representing Earth and world geography',
        differentiation: 'SOLAR SYSTEM shows multiple planets with rings vs single Earth GLOBE showing continents'
      }
    ],
    negative_descriptions: [
      'NOT a flat star chart or poster (three-dimensional spheres arranged in space)',
      'NOT just Earth and moon (full solar system with all nine celestial bodies)',
      'NOT a terrestrial globe (shows planets, not continents - eight spheres besides Earth)',
      'NOT a mobile without planet spheres (actual painted spheres representing planets, not empty structure)'
    ],
    difficulty: 'medium'
  },

  // ==================== HISTORY & TIME ====================
  {
    work_key: 'cu_calendar',
    name: 'Calendar Work',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'LARGE STANDALONE CALENDAR DISPLAY (24-36 inches wide) mounted on wooden FRAME or STAND, featuring FOUR SEPARATE HORIZONTAL CARD RAILS or CARD SLOTS for displaying MOVABLE CARDS. Each rail holds THICK CARDSTOCK CARDS that SLIDE HORIZONTALLY to reveal current information: (1) DAY-OF-WEEK RAIL showing SEVEN CARDS (Monday through Sunday) with day names in LARGE BOLD TEXT (1+ inch letters), (2) MONTH-CARD RAIL showing TWELVE CARDS (January through December) with month names and month-specific ILLUSTRATIONS (snowflakes for December, flowers for March, etc.), (3) DATE RAIL showing NUMBERED CARDS (1 through 31) in LARGE TEXT with markings to show which dates are present in the current month, (4) WEATHER/SEASON RAIL showing ICON CARDS (bright sun, white cloud, rain cloud, snowflake, wind symbol) representing current conditions. All cards are LAMINATED or FULLY COATED for durability. Background board is typically natural wood or neutral color. Child ADVANCING cards each morning during circle time, SLIDING the day card to today\'s position (creating a satisfying clicking sound), MOVING the date card to today\'s number, SELECTING the weather card, and NAMING aloud the day, date, month, and weather. Cards move smoothly on wooden or plastic rails. From 1-2 meters: a large wooden structure with colorful cards and bold text showing current day/date information. NOT a printed paper calendar (cards are individually movable on physical rails). NOT a clock (no hands or time of day indication). Card movement is HORIZONTAL SLIDING on rails (not vertical).',
    key_materials: ['Wooden frame or stand', 'Four card rails (wood or plastic)', 'Thick cardstock cards (day, month, date, weather)', 'Lamination or clear coating', 'Bold text or printed labels', 'Card storage pouch'],
    confusion_pairs: [
      {
        work_key: 'cu_timeline',
        reason: 'Both help children understand time progression through visual/tactile materials',
        differentiation: 'CALENDAR shows daily/seasonal cycles with SLIDING CARDS vs TIMELINE shows historical events with SEQUENTIAL CARDS'
      }
    ],
    negative_descriptions: [
      'NOT a printed static calendar (cards are individually movable on physical rails)',
      'NOT a clock (no hour/minute hands, shows day/month/date only)',
      'NOT a timeline (focuses on current day/month cycles, not history)',
      'NOT vertical card stacks (cards SLIDE HORIZONTALLY on rails)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_birthday_celebration',
    name: 'Birthday Celebration',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'CEREMONIAL SETUP arranged on a TABLE or FLOOR SPACE for a MONTESSORI BIRTHDAY WALK ritual. Setup includes: (1) SMALL GLOBE (6-8 inch diameter) placed in CENTER of a large CIRCLE, (2) TWELVE MONTH CARDS arranged in a COMPLETE CIRCLE around the globe in CLOCKWISE ORDER (January at top, proceeding through December), each card approximately 12×18 inches with LARGE MONTH NAME and SEASONAL ILLUSTRATIONS, (3) LIT CANDLE or SAFE BATTERY-OPERATED LIGHT SOURCE positioned next to the globe representing the SUN, (4) OPEN CIRCULAR SPACE (6-8 feet in diameter minimum) allowing a child to WALK around the circle multiple times. Card sequence shows VISUAL PROGRESSION of seasons and months. Child or teacher HOLDS the globe, WALKS in a CIRCLE around the month cards in a complete revolution for EACH YEAR of the child\'s life (so if child is 4, they walk 4 complete circles), STOPPING at the child\'s BIRTH MONTH on each revolution, while other children SING or OBSERVE. The candle/sun is PASSED or MOVED along each lap to represent Earth\'s orbit. This is a SACRED RITUAL EXPERIENCE emphasizing the child\'s journey around the sun and the passage of time. From 1-2 meters: a circle of colorful month cards with a globe in center and children walking ceremonially. NOT a puzzle (cards are stationary in fixed circle). NOT a game board with winners/losers (ceremonial walking activity focused on time understanding).',
    key_materials: ['Small globe (6-8 inch)', 'Twelve month cards with illustrations', 'Candle or battery-operated light source', 'Safely enclosed candle holder', 'Open circular floor space'],
    confusion_pairs: [
      {
        work_key: 'cu_calendar',
        reason: 'Both use month cards to teach time and seasons',
        differentiation: 'Birthday walk has CIRCULAR arrangement on FLOOR with WALKING ritual vs Calendar has HORIZONTAL rails with SLIDING cards'
      }
    ],
    negative_descriptions: [
      'NOT a card puzzle (month cards are stationary in fixed circle)',
      'NOT just a classroom calendar (ceremonial walking ritual emphasizing journey around sun)',
      'NOT a game or competition (sacred Montessori ritual with singing and celebration)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_personal_timeline',
    name: 'Personal Timeline',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'LONG HORIZONTAL PAPER or CARDBOARD STRIP (4-8 feet long) laid out LINEARLY on table or wall showing the SPECIFIC LIFE EVENTS of an individual child in STRICT CHRONOLOGICAL ORDER from LEFT TO RIGHT (representing past on left, present on right). Timeline displays CHILD\'S ACTUAL EVENTS marked with: (1) PHOTOGRAPHS of the specific child (baby photo at birth, photos at key ages), (2) ILLUSTRATIONS or DRAWINGS created by teacher or child (new house, birthday cake, family trip), (3) TEXT LABELS describing each event in CLEAR LANGUAGE (e.g., "Born March 15, 2022," "Started Montessori September 2023," "Got a puppy," "First tooth fell out," "Trip to Grandma\'s house"), (4) DATES or AGES shown with each event. Typical events include: BIRTH (actual baby photo), LEARNING TO WALK (approximately 12-18 months, with illustration), FIRST BIRTHDAY (photo with cake), STARTING MONTESSORI (dated photo), FAMILY EVENTS (vacation, new sibling, move to new house), MILESTONES (first tooth, first word, first day of preschool). Events progress in ABSOLUTE CHRONOLOGICAL ORDER with NO SKIPPING. Child PARTICIPATES in ARRANGING cards in order, CREATING events by GLUING photos and writing labels, and REVIEWING timeline to understand personal history sequence. From 1-2 meters: a long paper strip with photos/illustrations and text arranged left-to-right in sequence. NOT a random scrapbook (events are in STRICT CHRONOLOGICAL ORDER, not haphazard arrangement). NOT a calendar (shows specific life events, not daily dates or all dates).',
    key_materials: ['Long paper or cardboard strip (4-8 feet)', 'Photographs of the child (multiple ages)', 'Illustrations or drawings', 'Text labels and markers', 'Glue and tape', 'Optional: colored paper for events'],
    confusion_pairs: [
      {
        work_key: 'cu_timeline_life',
        reason: 'Both are long horizontal strips showing events in chronological order',
        differentiation: 'PERSONAL timeline shows INDIVIDUAL CHILD\'S life events vs LIFE timeline shows EARTH\'S geological/evolutionary history'
      }
    ],
    negative_descriptions: [
      'NOT a random scrapbook (events are in STRICT chronological order, not haphazard)',
      'NOT a calendar or birthday chart (shows specific life milestones, not daily dates)',
      'NOT geological timeline (focuses on personal life events, not millions of years of Earth history)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_clock',
    name: 'Clock Work',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'LARGE LEARNING CLOCK (8-14 inches in diameter) with FULLY MOVABLE HOUR and MINUTE HANDS that child can MANUALLY ROTATE by hand or with finger. Clock face displays BOLD NUMBERS 1-12 around the PERIMETER in LARGE TEXT (minimum 1 inch letters, clearly readable from 2 meters away). Hands are DISTINCTLY DIFFERENT COLORS for easy identification: typically RED for HOUR HAND (shorter, wider), BLUE for MINUTE HAND (longer, thinner). Hands are DIFFERENT LENGTHS to make hour vs. minute hand distinction IMMEDIATELY OBVIOUS. Clock face often includes COLOR-CODED RINGS or SECTIONS: INNER RING showing hour positions with color, OUTER RING showing minute marks (5-minute intervals), QUARTER-HOUR marking (darker lines at 3, 6, 9, 12 positions). Clock construction is WOOD or DURABLE PLASTIC. Central pivot point allows SMOOTH hand rotation with LIGHT RESISTANCE (hands don\'t fall out but rotate with control). Child GRASPS hands and MANUALLY ROTATES them to match times called out (e.g., "Show me 3 o\'clock" - child moves red hand to 3, blue hand to 12), or READS the time shown by current hand positions (determining if it\'s "3 o\'clock" or "half past 3"). Clock may include DEMONSTRATION function where teacher can show time and child observes. From 1-2 meters: a clearly numbered circular clock face with two distinctly colored hands of different lengths. NOT a puzzle (hands rotate freely, not puzzle pieces). NOT a wristwatch or decorative clock (large table-top or wall-mounted size designed for classroom learning).',
    key_materials: ['Wood or plastic clock base', 'Two movable clock hands (different colors, lengths)', 'Numbers 1-12 (large text)', 'Color-coded rings or sections', 'Central fastener/pivot (allows smooth rotation)', 'Optional: demonstration model'],
    confusion_pairs: [
      {
        work_key: 'cu_calendar',
        reason: 'Both help teach time concepts through classroom materials',
        differentiation: 'CLOCK shows hours/minutes with ROTATING HANDS vs CALENDAR shows days/months with SLIDING CARDS'
      }
    ],
    negative_descriptions: [
      'NOT a puzzle (hands rotate freely on central pivot, not puzzle pieces)',
      'NOT a wristwatch or decorative clock (large table-top size designed for classroom learning)',
      'NOT a calendar (tells time of day with movable hands, not daily dates)',
      'NOT fixed/broken (hands must be FULLY MOVABLE by child\'s hands)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_timeline_life',
    name: 'Timeline of Life',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'EXTREMELY LONG HORIZONTAL TIMELINE (15-30+ feet when fully unrolled, often stored rolled on wooden dowel or in segments), showing the GEOLOGICAL AND BIOLOGICAL HISTORY of Earth spanning APPROXIMATELY 4.5 BILLION YEARS. Timeline displays MAJOR GEOLOGICAL ERAS with DISTINCT COLOR-CODED BANDS showing TIME PROPORTIONS accurately: Precambrian (often GRAY or pale color, representing ~4 BILLION YEARS shown as VERY WIDE band), Paleozoic (GREEN band, ~300 million years), Mesozoic (BROWN/TAN band, ~165 million years, shown as SIGNIFICANTLY WIDER than Cenozoic), Cenozoic (warm YELLOW/ORANGE band, ~66 million years, shown as MUCH NARROWER than Mesozoic). Timeline includes ILLUSTRATED CARDS or DETAILED DRAWINGS showing PREHISTORIC CREATURES representing each era and period: Precambrian (microscopic bacteria illustrations, early algae), Paleozoic (trilobites, armored fish, early amphibians, early reptiles), Mesozoic (DINOSAURS prominently featured - T-Rex with open jaws, Triceratops with three horns, flying Pterosaurs with wings, long-necked Sauropods, swimming Ichthyosaurs), early mammals (small, furry creatures), Cenozoic (Ice Age mammals with fur, early humans, modern animals). Timeline TEXT shows era names, time periods in millions of years ago, and creature names. PHYSICAL LENGTH of bands accurately represents TIME PROPORTION - Mesozoic era is shown with MUCH GREATER LENGTH than Cenozoic, visually emphasizing the VAST TIME SPAN of dinosaurs compared to human history. Child UNROLLS the timeline (often 2-3 feet at a time for study), STUDIES the progression of life, COMPARES the size of creatures across eras, and UNDERSTANDS that dinosaurs existed for ~150 million years while modern humans have existed for only ~200,000 years. From 1-2 meters when unrolled: a long colorful strip with color bands (light to warm colors) and numerous creature illustrations, text labels. NOT a calendar or human history timeline (geological timescale spanning millions of years, not human years). NOT just dinosaurs (includes all life eras from single cells through modern animals).',
    key_materials: ['Long paper or fabric roll (15-30+ feet)', 'Illustrated cards or detailed drawings', 'Color bands for each era (proportional to time)', 'Labels with era names and time periods', 'Creature illustrations and names', 'Wooden dowel for rolling', 'Card box for storage'],
    confusion_pairs: [
      {
        work_key: 'cu_personal_timeline',
        reason: 'Both are long horizontal strips showing progression through time',
        differentiation: 'LIFE timeline spans BILLIONS of YEARS with geological eras vs PERSONAL timeline shows INDIVIDUAL\'S life events in years'
      }
    ],
    negative_descriptions: [
      'NOT a human history timeline (shows ALL Earth history from single cells, not just human civilization)',
      'NOT just dinosaurs (includes Precambrian, Paleozoic, Cenozoic, and modern animals)',
      'NOT a personal or family timeline (geological and evolutionary timescale spanning millions/billions of years)',
      'NOT a calendar (extremely long historical record, not daily/monthly dates)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_fundamental_needs',
    name: 'Fundamental Needs of Humans',
    area_key: 'cultural',
    category: 'History and Time',
    visual_description:
      'COMPREHENSIVE CHART or ORGANIZED SET OF CARDS (4-6 large cards or a single large poster) showing UNIVERSAL HUMAN NEEDS organized into clearly DISTINCT CATEGORIES with COLORFUL ILLUSTRATIONS and READABLE LABELS. Categories typically include: (1) PHYSICAL/MATERIAL NEEDS - HIGH-QUALITY COLOR PHOTOGRAPHS or ILLUSTRATIONS showing: FOOD (variety of fruits, vegetables, bread, milk, prepared meals), WATER (glass of water, water source), SHELTER/HOUSE (house exterior, safe room interior), CLOTHING (shoes, jacket, warm clothes), SLEEP/REST (bed, sleeping child, safe mattress), (2) SAFETY NEEDS - ILLUSTRATIONS of safety rules (stop sign, crossing safely), protective environment (fenced yard, secure home), order and structure, (3) SOCIAL/BELONGING NEEDS - PHOTOGRAPHS of REAL PEOPLE: FAMILY (multiple generations together, holding hands), FRIENDS (children playing together, hugging), COMMUNITY (group of people together, cooperation), PLAYING TOGETHER (children engaged in group activity), (4) EMOTIONAL/SPIRITUAL NEEDS - PHOTOGRAPHS showing: ART PROJECTS (child painting, colorful artwork), MUSIC (child singing, playing instrument), LOVE/HUGGING (warm embraces, affection), PLAY and JOY (child laughing, playing), CELEBRATION (birthday party, group celebration). Cards are LARGE (minimum 8×10 inches), LAMINATED or FULLY COATED for durability, with BOLD TEXT LABELS in LARGE LETTERS (readable from classroom distance), and COLOR PHOTOGRAPHS or PROFESSIONAL ILLUSTRATIONS showing DIVERSE PEOPLE and REALISTIC SCENARIOS. The chart EMPHASIZES that ALL humans, REGARDLESS of culture, geography, or wealth, share these basic needs. Helps children understand EMPATHY and UNIVERSAL HUMAN CONNECTION. From 1-2 meters: large colorful cards with many photographs/illustrations and text labels organized into categories. NOT a single-concept fact card (comprehensive chart showing MULTIPLE need categories and many examples per category). NOT Maslow\'s pyramid (though related concept, typically presented as simple flat visual chart/cards with equal emphasis, not hierarchical).',
    key_materials: ['Thick cardstock or foam board cards (4-6)', 'Color photographs and illustrations', 'Lamination or durable coating', 'Labels and descriptive text (large, bold)', 'Optional: matching game cards', 'Storage box'],
    confusion_pairs: [],
    negative_descriptions: [
      'NOT a single-concept fact card (shows multiple need categories with many examples per category)',
      'NOT Maslow\'s hierarchy pyramid (presented as flat visual chart/cards with equal emphasis, not hierarchical)',
      'NOT culture-specific needs (emphasizes UNIVERSAL human needs regardless of geography or wealth)',
      'NOT abstract concepts (shows COLOR PHOTOGRAPHS and ILLUSTRATIONS of real people and realistic scenarios)'
    ],
    difficulty: 'medium'
  },

  // ==================== BOTANY ====================
  {
    work_key: 'cu_living_nonliving',
    name: 'Living vs Non-Living',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SET OF 25-35 CLASSIFICATION CARDS dividing objects into LIVING and NON-LIVING categories. LIVING category displays LAMINATED COLOR PHOTOGRAPHS or detailed ILLUSTRATIONS: ANIMALS (bird in flight with spread wings, butterfly with distinctive wing patterns, dog/puppy, fish in water, cat, lion, elephant), PLANTS (tall tree with foliage, flowering plant with petals, grass growing from soil, cactus with spines, fern with detailed leaves). NON-LIVING category shows: MINERAL/ROCK (gray stone or boulder), WATER (water droplet, flowing water), OBJECTS (wooden chair, pencil, book with pages visible, car with wheels, desk, shoe, spoon, fork, cup). Each card features a SINGLE LARGE IMAGE (minimum 3×4 inches) with CLEAR DETAILS and a simple LABEL TEXT below (large, easy-to-read letters). Child SORTING cards into two piles under "Living" and "Non-Living" headings on a mat, or MATCHING cards to category labels. This is BINARY classification with NO AMBIGUOUS MIDDLE CATEGORY. Living things are clearly ORGANISMS that grow and move. Non-living things are clearly INANIMATE objects. From 1-2 meters: laminated cards with colorful photos and text labels grouped into two distinct piles. NOT complex taxonomy (no subcategories or borderline cases like fungi). NOT puzzle pieces (loose cards with clear images).',
    key_materials: ['Laminated cardstock cards (25-35 count)', 'Color photographs or quality illustrations', 'Category labels and sorting mats', 'Lamination or protective coating', 'Card storage box'],
    confusion_pairs: [
      {
        work_key: 'cu_plant_animal',
        reason: 'Both are classification card sets sorting biological categories',
        differentiation: 'LIVING/NON-LIVING is BINARY (two groups) vs PLANT/ANIMAL focuses on LIVING diversity (two types of organisms)'
      }
    ],
    negative_descriptions: [
      'NOT complex taxonomy (no subcategories, no borderline cases like fungi)',
      'NOT just plants or just animals (includes both living categories and non-living objects)',
      'NOT puzzle pieces (loose cards with single images, not interlocking)',
      'NOT three-category system (strictly BINARY living vs non-living)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_plant_animal',
    name: 'Plant vs Animal',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SET OF 35-45 CLASSIFICATION CARDS dividing LIVING THINGS into PLANTS and ANIMALS with CLEAR VISUAL DISTINCTION. PLANT category shows LAMINATED PHOTOGRAPHS or ILLUSTRATIONS: FLOWERING PLANT (pink or red flowers with green stems), GRASS (green blades growing from soil, natural yard grass), CACTUS (tall green cactus with visible spines), FERN (delicate green fronds, clearly showing plant structure), TREE (full tree with trunk and canopy of leaves), WATER LILY (floating on water with roots visible), MUSHROOM (fungus with cap and stem - included in plant category for Montessori level). ANIMAL category shows CLEAR ANIMAL DIVERSITY: MAMMAL (dog with fur, cat with whiskers, horse with mane, human with features), BIRD (parrot with bright feathers and beak, chicken with distinctive comb), FISH (with visible fins and scales, gills), INSECT (butterfly with wings and antennae, ant with segmented body), REPTILE (turtle with shell, snake with scales, lizard), AMPHIBIAN (frog with bumpy skin and four legs, salamander). Each card shows CLEAR IMAGE (minimum 3×4 inches) with READABLE TEXT LABEL. Child SORTING into two piles under "Plants" and "Animals" headers, or MATCHING cards to category mats. Distinctions are ABSOLUTELY CLEAR-CUT with NO AMBIGUOUS ORGANISMS at this level. From 1-2 meters: laminated cards with colorful images showing obvious plants (green, rooted) and animals (mobile, eating behaviors visible). NOT including microorganisms or fungi complexity (stays simple plant vs animal distinction). NOT subcategories yet (no fish vs mammal distinction within animals).',
    key_materials: ['Laminated cardstock cards (35-45 count)', 'Color photographs or illustrations', 'Category label cards and sorting mats', 'Lamination or protective coating', 'Card storage box'],
    confusion_pairs: [
      {
        work_key: 'cu_living_nonliving',
        reason: 'Both are classification card sets for biological categories',
        differentiation: 'PLANT/ANIMAL divides living organisms into two types vs LIVING/NON-LIVING separates organisms from inanimate objects'
      }
    ],
    negative_descriptions: [
      'NOT including microorganisms or fungi complexity (stays simple plant vs animal distinction)',
      'NOT subcategories yet (no fish vs mammal distinctions within animals)',
      'NOT including non-living objects (focuses only on two types of living organisms)',
      'NOT abstract groupings (uses obvious visual characteristics: green/rooted vs mobile/eating)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_parts_plant',
    name: 'Parts of a Plant',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing a COMPLETE GENERIC PLANT with 4-6 REMOVABLE PIECES illustrating basic plant anatomy. Puzzle is SCHEMATIC/DIAGRAMMATIC (not realistic) with clear LABELS and COLOR-CODING. Puzzle displays: ROOT (brown or tan colored wooden piece, underground section showing BRANCHING STRUCTURE with visible root hairs as painted lines, representing underground portion), STEM (green painted wooden piece, vertical central section), LEAF (flat green wooden piece with visible VEINED PATTERN painted in darker lines), FLOWER (brightly COLORED petals surrounding center, representing reproductive organ). Puzzle BASE/BACKGROUND shows TWO DISTINCT LAYERS: lower BROWN SOIL section showing roots planted in earth, upper GREEN SECTION with SUN illustration showing above-ground growth. Removable pieces SLOT into RECESSED AREAS, creating satisfying click when correctly placed. LABELED TEXT appears underneath each piece position and MATCHING COLOR-CODED NOMENCLATURE CARDS (small cards with matching colors and printed names) provided for language extension. Child REMOVES and REPLACES each piece, LEARNS plant part names, and UNDERSTANDS the plant structure (roots below, stem and leaves above). Puzzle teaches that roots absorb water and nutrients from soil while leaves absorb sunlight. From 1-2 meters: a wooden puzzle showing layered plant structure with brown (soil) and green (plant) sections. NOT a realistic herbarium or botanical illustration (simplified schematic puzzle emphasizing major plant parts). NOT including complex flower anatomy (keeps flower as single colored unit).',
    key_materials: ['Wooden puzzle base/frame', 'Four to six wooden puzzle pieces', 'Brown, green, and flower-colored paint', 'Labels printed or carved', 'Color-coded nomenclature cards', 'SUN and soil background illustrations'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_flower',
        reason: 'Both are plant part puzzles with wooden pieces and nomenclature cards',
        differentiation: 'PARTS PLANT shows WHOLE plant (roots, stem, leaves, flower) vs PARTS FLOWER shows only FLOWER details'
      },
      {
        work_key: 'cu_parts_leaf',
        reason: 'Both focus on plant anatomy with wooden puzzle pieces',
        differentiation: 'PARTS PLANT shows complete plant structure vs PARTS LEAF focuses only on LEAF anatomy and structure'
      },
      {
        work_key: 'cu_parts_root',
        reason: 'Both are plant anatomy puzzles with wooden components',
        differentiation: 'PARTS PLANT shows complete plant (roots + stem + leaves + flower) vs PARTS ROOT focuses on ROOT system only'
      },
      {
        work_key: 'cu_parts_seed',
        reason: 'Both teach plant biology through wooden puzzle materials',
        differentiation: 'PARTS PLANT shows mature plant structure vs PARTS SEED shows seed components and germination'
      }
    ],
    negative_descriptions: [
      'NOT a realistic herbarium or botanical illustration (simplified schematic puzzle)',
      'NOT complex flower anatomy (flower shown as single colored unit, not broken into parts)',
      'NOT a scientific diagram (child-friendly wooden puzzle with satisfying clicks when pieces seat)',
      'NOT just roots or just leaves (shows COMPLETE plant with all major parts together)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_parts_flower',
    name: 'Parts of a Flower',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing a FLOWER IN CROSS-SECTION or SIDE VIEW DETAIL with 5-7 REMOVABLE PIECES revealing flower INTERNAL ANATOMY in schematic form. Puzzle illustrates: PETAL (colorful outer circle, brightly colored piece removable as one unit or separate pieces - typically pink, red, yellow, or purple), SEPAL (green leafy pieces beneath petals, protective outer layer), STAMEN (male reproductive parts, yellow stamens visible in center showing pollen-bearing structures), PISTIL (female reproductive part, center structure with distinctive shape), RECEPTACLE (base structure holding all parts together). Puzzle shows INTERNAL STRUCTURE in CROSS-SECTION VIEW (cutaway showing layers from outside to center). Each part is COLOR-CODED with DISTINCT COLORS (red petals, green sepals, yellow stamens, etc.) MATCHING PROVIDED NOMENCLATURE CARDS. Puzzle teaches FLOWER REPRODUCTION and how flowers are structured for pollination. Child IDENTIFIES and REPLACES pieces, learning reproductive plant structures and flower vocabulary. Background may show flower growth context. From 1-2 meters: a wooden puzzle showing flower parts in layers with colorful pieces and visible internal structure. NOT a whole plant puzzle (focuses exclusively on flower anatomy, not roots/stem/leaves). NOT realistic botanical specimen (simplified schematic diagram emphasizing structure).',
    key_materials: ['Wooden puzzle base', 'Five to seven wooden puzzle pieces', 'Paint in flower colors', 'Color-coded nomenclature cards', 'Labels for each part'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_plant',
        reason: 'Both are plant part puzzles with wooden pieces',
        differentiation: 'PARTS FLOWER shows only FLOWER ANATOMY in cross-section vs PARTS PLANT shows WHOLE plant structure (roots, stem, leaves, flower)'
      }
    ],
    negative_descriptions: [
      'NOT a whole plant puzzle (focuses exclusively on flower anatomy)',
      'NOT realistic botanical specimen (simplified schematic emphasizing reproductive structure)',
      'NOT a flower arrangement or bouquet (single flower dissected showing internal parts)',
      'NOT a closed flower (shows OPEN cross-section revealing internal reproductive organs)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_leaf',
    name: 'Parts of a Leaf',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing LEAF STRUCTURE in LARGE SCHEMATIC FORM with 4-5 REMOVABLE PIECES illustrating leaf anatomy. Puzzle displays: BLADE (large flat green section - the primary working part of leaf, painted bright or medium green, taking up majority of puzzle space), PETIOLE (thin stem attaching blade to branch, painted green, connecting piece), VEINS (sometimes shown as separate visible elements or painted network running through blade, darker green or brown), MIDRIB (prominent central vein running from petiole through center of blade), STIPULE (small leaf-like base structures at petiole connection point - optional on some puzzles). Puzzle shows a LARGE LEAF OUTLINE (approximately 6-8 inches tall), typically a simple oval or slightly lobed shape for clarity. Background is typically light YELLOW or PALE GREEN for contrast against the green leaf pieces. VISIBLE INTERNAL VEIN NETWORK is shown in darker color (brown or darker green) creating a realistic leaf vein pattern. Child IDENTIFIES veins, UNDERSTANDS how leaves attach to stems, and LEARNS leaf vocabulary through COLOR-CODED NOMENCLATURE CARDS. Puzzle emphasizes that leaves are where photosynthesis occurs (major plant food production). From 1-2 meters: a large green puzzle piece with visible internal vein networks and smaller connecting pieces. NOT a flower (leaf structure only, no petals or reproductive parts). NOT leaf shape sorting activity (focuses on detailed internal structure of a single leaf type, not comparing multiple leaf shapes).',
    key_materials: ['Wooden puzzle base', 'Wooden puzzle pieces (4-5)', 'Green paint in multiple shades', 'Brown paint for vein network', 'Color-coded nomenclature cards', 'Labels for each part'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_plant',
        reason: 'Both are plant anatomy puzzles with wooden pieces',
        differentiation: 'PARTS LEAF shows only LEAF ANATOMY with vein networks and blade structure vs PARTS PLANT shows WHOLE plant with roots, stem, leaves, and flower'
      }
    ],
    negative_descriptions: [
      'NOT a whole plant puzzle (shows LEAF STRUCTURE exclusively)',
      'NOT a flower part (leaf structure only, no petals or reproductive anatomy)',
      'NOT a leaf shape sorting activity (focuses on detailed INTERNAL VEIN NETWORKS, not comparing different leaf shapes)',
      'NOT a realistic pressed leaf (simplified schematic with REMOVABLE PIECES showing internal structure)',
      'NOT a stem anatomy puzzle (shows BLADE and PETIOLE as leaf parts, not woody stem cross-section)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_root',
    name: 'Parts of a Root',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing ROOT SYSTEM STRUCTURES with 3-4 REMOVABLE PIECES comparing and contrasting two main ROOT SYSTEM TYPES. Puzzle illustrates: (1) TAPROOT TYPE - single LARGE CENTRAL ROOT (similar to carrot shape) extending deeply downward with SMALLER SIDE ROOTS branching off laterally, tapering to a point at the root tip, with painted ROOT HAIRS (tiny extensions visible on root surface), (2) FIBROUS ROOT SYSTEM - many THIN ROOTS of roughly EQUAL SIZE spreading laterally with NO large central root (similar to grass root system), creating a dense mat-like appearance. Puzzle shows UNDERGROUND PERSPECTIVE with BROWN SOIL SECTION background. May include ROOT CAP (protective tip of root) and ROOT HAIRS (tiny absorption structures visible on roots as painted details). Pieces are DISTINCTLY DIFFERENT SHAPES representing the two root types. COLOR-CODED LABELS with nomenclature cards provided. Child COMPARES the two root types, UNDERSTANDS how different plants absorb water and nutrients differently - taproots go deep for water in dry climates (carrots, beets, taproots in trees), fibrous roots spread wide for water in shallow soil (grass, most vegetables). From 1-2 meters: a puzzle showing brown soil section with two distinctly different root structures visible. NOT a bulb or corm (shows ROOT SYSTEMS specifically, not underground STORAGE structures). NOT flower or leaf parts (root structure exclusively).',
    key_materials: ['Wooden puzzle base', 'Three to four wooden pieces', 'Brown and root-colored paint', 'Paint details for root hairs and root caps', 'Nomenclature cards with color coding', 'Labels for root types'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_plant',
        reason: 'Both are plant anatomy puzzles with wooden pieces',
        differentiation: 'PARTS ROOT shows UNDERGROUND ROOT SYSTEMS (taproot vs fibrous) vs PARTS PLANT shows WHOLE ABOVE-GROUND plant with stem, leaves, and flower'
      }
    ],
    negative_descriptions: [
      'NOT a bulb or corm puzzle (shows ROOT SYSTEMS specifically, not underground storage structures)',
      'NOT flower or leaf parts (root structure exclusively)',
      'NOT a single root specimen (shows TWO DIFFERENT ROOT SYSTEM TYPES for comparison)',
      'NOT above-ground plant structure (UNDERGROUND perspective with brown soil background)',
      'NOT a whole plant puzzle (roots only, no stem or leaves visible)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_seed',
    name: 'Parts of a Seed',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'WOODEN PUZZLE showing a SEED IN CROSS-SECTION with 3-4 REMOVABLE PIECES revealing internal seed ANATOMY. Puzzle illustrates: SEED COAT (protective outer layer, typically brown or tan colored wooden piece, hardened shell protecting interior), EMBRYO (tiny plant inside, visible as small green structure representing future plant), COTYLEDON(S) (seed leaves that store food - monocot seeds show ONE cotyledon, dicot seeds show TWO cotyledons as distinct pieces). Puzzle shows SIDE VIEW OF SEED CROSS-SECTION, displaying INTERNAL STRUCTURE in DETAIL. Puzzle often displays BOTH monocot (like corn/rice with one large food storage piece) and dicot (like bean/pea with two distinct food storage pieces) examples side by side for COMPARISON. Large CUTAWAY ILLUSTRATION shows exactly how seed is organized inside. REAL SEEDS are displayed nearby (actual dried beans, peas, corn kernels, sunflower seeds) for child to COMPARE with puzzle and FEEL TEXTURE of real seed coats. COLOR-CODED nomenclature cards for each part provided. Child COMPARES monocot vs dicot seeds, UNDERSTANDS seed structure and how seeds store food for germination, and LEARNS that seeds contain a complete tiny plant ready to grow. From 1-2 meters: a wooden puzzle showing cross-section of seed with visible internal layers and different colored pieces. NOT a flower or fruit (shows INTERIOR seed structure only, not flower development or seed pod). NOT a sprouted seedling (shows inside dormant seed, not germination process).',
    key_materials: ['Wooden puzzle base', 'Three to four wooden pieces', 'Brown, yellow, and green paint', 'Real seeds for comparison (beans, peas, corn)', 'Color-coded nomenclature cards', 'Labels for seed parts'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_plant',
        reason: 'Both are plant anatomy puzzles with removable wooden pieces',
        differentiation: 'PARTS SEED shows INTERNAL SEED STRUCTURE (embryo, cotyledons, seed coat in cross-section) vs PARTS PLANT shows COMPLETE WHOLE plant (roots, stem, leaves, flower)'
      }
    ],
    negative_descriptions: [
      'NOT a flower or fruit (shows INTERIOR seed structure only, not reproductive development or seed pod)',
      'NOT a sprouted seedling (shows inside DORMANT seed, not germination or growth process)',
      'NOT a whole plant puzzle (shows only SEED CROSS-SECTION anatomy)',
      'NOT a real seed (simplified WOODEN schematic with removable pieces for teaching)',
      'NOT a seed coat only (shows complete INTERNAL structure - embryo and cotyledons visible as distinct parts)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_plant_life_cycle',
    name: 'Plant Life Cycle',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'SEQUENCE OF 6-8 ILLUSTRATED CARDS or DRAWINGS showing COMPLETE PLANT GROWTH and REPRODUCTION stages in STRICT SEQUENTIAL ORDER. Cards illustrate: (1) SEED stage (whole dormant seed shown, resting, clearly closed), (2) GERMINATION stage (seed coat breaking open, white root emerging downward, tiny shoot emerging upward), (3) SEEDLING stage (small delicate roots established in soil, multiple tiny leaves emerging above ground, fragile appearance), (4) YOUNG PLANT stage (roots growing deeper into soil, multiple visible leaves, stronger stem developing), (5) MATURE VEGETATIVE PLANT stage (full-sized plant with many leaves, extensive root system, dark green healthy appearance, ready for flowering), (6) FLOWERING stage (bright flowers visible, reproductive organs active, insects or pollinators may be shown), (7) SEED FORMATION stage (flowers fading, fruits or seed pods developing as flowers are pollinated), (8) SEED DISPERSAL stage (mature seeds visible, being released, blown by wind, eaten by animals, ready to spread). Cards are LAMINATED or enclosed in protective CARD BOX. Cards feature COLORFUL HAND-DRAWN or PROFESSIONAL PHOTOGRAPHIC ILLUSTRATIONS showing each stage clearly and sequentially. Child ARRANGES cards in correct SEQUENTIAL ORDER, learning plant life cycle. Activity may include ACTUAL PLANTING MATERIALS (seeds, soil, containers, water, potting supplies) for hands-on growing observation. Child plants seeds, OBSERVES growth weekly, COMPARES observations to card sequence. From 1-2 meters: a series of colorful illustrated cards showing plant growth stages arranged in sequence. NOT a food crop cycle (shows plant growth structure, not nutrition/human food consumption). NOT seasonal cycle (shows LIFE CYCLE STAGES, not calendar seasons).',
    key_materials: ['Illustrated cards (6-8 cards)', 'Lamination or card box storage', 'Colorful hand-drawn or photos', 'Labels on each stage', 'Optional: seeds, soil, containers, water for growing'],
    confusion_pairs: [],
    negative_descriptions: [
      'NOT a food crop cycle (shows PLANT GROWTH STRUCTURE, not nutrition or human food consumption)',
      'NOT a seasonal cycle (shows LIFE CYCLE STAGES across time, not calendar seasons)',
      'NOT a single plant photo (shows COMPLETE SEQUENCE of 6-8 illustrated stages)',
      'NOT plant anatomy (shows growth PROGRESSION through stages, not internal structure)',
      'NOT a timeline without plants (features ACTUAL PLANT ILLUSTRATIONS showing physical growth changes)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_botany_experiments',
    name: 'Botany Experiments',
    area_key: 'cultural',
    category: 'Botany',
    visual_description:
      'COLLECTION OF HANDS-ON SCIENTIFIC EXPERIMENT MATERIALS for child-led plant science EXPLORATION and DISCOVERY. Typically includes 2-3 CONTROLLED EXPERIMENTS, each demonstrating a specific plant NEED: (1) WATER EXPERIMENT - two IDENTICAL small potted plants placed side by side on same shelf in same light conditions, one WATERED REGULARLY (soil kept consistently moist), one LEFT DRY (soil allowed to dry out), with VISUAL OBSERVATION CHART showing WEEKLY HEIGHT MEASUREMENTS and LEAF COLOR observations over 4-6 weeks, child PREDICTING which will grow better, then OBSERVING results - watered plant thrives while dry plant wilts and fails; (2) LIGHT EXPERIMENT - two identical plants placed in different conditions, one in BRIGHT LIGHT (near window or under grow light), one in DARKNESS or very low light (closed box or dark corner), with OBSERVATION CHART showing growth differences - light plant grows toward light, stays green, dark plant becomes pale, stretches toward light source, fails to thrive; (3) SOIL EXPERIMENT - same seeds planted in THREE different media: GOOD GARDEN SOIL (with nutrients), SAND (no nutrients), CLAY (compacted, poor drainage), with OBSERVATION CHART showing how soil quality affects growth - good soil produces healthy plants, sand produces stunted growth, clay prevents growth. Each experiment includes: small pots or containers (identical for fair comparison), soil and alternative media, packets of seeds, water containers, WRITTEN OBSERVATION CHART with DATE and MEASUREMENT columns, ruler for height measurements, PENCIL for recording observations and DRAWINGS. Child SETS UP the experiment (with guidance if needed), PREDICTS OUTCOMES before beginning, OBSERVES daily or weekly, RECORDS MEASUREMENTS and descriptions, DRAWS what they see, and DRAWS CONCLUSIONS. From 1-2 meters: small potted plants in various conditions with observation charts and measurement tools nearby. NOT a classroom display or completed demo (requires ongoing ACTIVE observation, measurement, and DATA COLLECTION by child). NOT a teacher-controlled experiment (child participates in setup and monitoring).',
    key_materials: ['Small pots or containers (multiple sets)', 'Garden soil, sand, clay media', 'Seed packets', 'Water containers and measuring cup', 'Observation/recording chart (printed or hand-made)', 'Ruler for measurements', 'Pencils and erasers', 'Grow light (optional)'],
    confusion_pairs: [],
    negative_descriptions: [
      'NOT a classroom display (requires ongoing ACTIVE observation, measurement, and DATA COLLECTION by child)',
      'NOT teacher-controlled demo (CHILD participates in setup and monitoring)',
      'NOT a single potted plant (shows MULTIPLE pots in CONTROLLED CONDITIONS for comparison)',
      'NOT plant anatomy or identification (focuses on plant NEEDS and growth VARIABLES)',
      'NOT a completed project (ACTIVE experiment with growing plants and ongoing observations)'
    ],
    difficulty: 'hard'
  },

  // ==================== ZOOLOGY ====================
  {
    work_key: 'cu_vertebrate_invertebrate',
    name: 'Vertebrate vs Invertebrate',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF 25-35 CLASSIFICATION CARDS showing animals DIVIDED BY PRESENCE or ABSENCE of BACKBONE (SPINE). VERTEBRATE category shows LAMINATED PHOTOGRAPHS or detailed ILLUSTRATIONS with VISIBLE SPINE/BACKBONE HIGHLIGHTED with color outline or transparency: MAMMAL (dog with visible backbone/spine highlighted, horse with neck vertebrae marked, cat with spinal column visible), BIRD (chicken with distinctive neck vertebrae visible, wings showing skeletal structure), FISH (anatomy showing clear backbone running along center body, surrounded by ribs), REPTILE (turtle showing spine inside protective shell, snake showing vertebral column), AMPHIBIAN (frog showing vertebral column visible on back). INVERTEBRATE category shows animals WITHOUT internal backbones: INSECT (butterfly with segmented body and no spine, ant with clear segments and no backbone, beetle with segmented exoskeleton), SPIDER (8 legs, body without spine, segmented abdomen), WORM (segmented body, no skeleton, no spine), SNAIL (shell but no internal spine, soft body), JELLYFISH (gelatinous transparent body, no skeleton or spine), CRAB (external shell/exoskeleton, no internal spine). Cards often HIGHLIGHT the presence or ABSENCE of spine with COLORED OUTLINES or ARROWS POINTING to where spine would be. Each card is LARGE (minimum 3×4 inches) showing CLEAR DETAIL. Child SORTS animals into two groups (Vertebrate/Invertebrate) based on backbone presence/absence. From 1-2 meters: laminated cards with colorful animals showing either visible spines or clear lack of spines. NOT detailed taxonomy (simple binary: HAS backbone / NO backbone distinction). NOT complex body part identification beyond skeletal structure comparison.',
    key_materials: ['Laminated cardstock cards (25-35 count)', 'Color photographs or detailed illustrations', 'Color outlines or arrows highlighting spine', 'Lamination or protective coating', 'Category label cards'],
    confusion_pairs: [
      {
        work_key: 'cu_five_classes',
        reason: 'Both are zoology classification materials with animal cards',
        differentiation: 'VERTEBRATE INVERTEBRATE uses BINARY HAS BACKBONE vs NO BACKBONE division with mixed examples vs FIVE CLASSES shows DETAILED VERTEBRATE CLASS DISTINCTIONS (fish, amphibian, reptile, bird, mammal) with specific characteristics'
      }
    ],
    negative_descriptions: [
      'NOT detailed taxonomy (simple BINARY: HAS backbone / NO backbone distinction)',
      'NOT complex body part identification (focuses on skeletal structure comparison only)',
      'NOT vertebrate-only classification (includes BOTH vertebrates AND invertebrates)',
      'NOT a single animal focus (shows multiple DIFFERENT ANIMAL examples for sorting)',
      'NOT color pictures without labeling (LARGE CLEAR cards with HIGHLIGHTED spine presence or absence)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_five_classes',
    name: 'Five Classes of Vertebrates',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'COMPREHENSIVE SET OF CLASSIFICATION CARDS dividing VERTEBRATE ANIMALS into FIVE MAIN DISTINCT CLASSES, each with CLEARLY ILLUSTRATED and LABELED DISTINGUISHING CHARACTERISTICS. Set includes: (1) FISH CLASS - DETAILED ILLUSTRATIONS showing SCALES (tiny overlapping tiles covering body), FINS (dorsal fin on back, pectoral fins on sides, tail fin), GILLS (breathing organs shown on sides of head), BODY adapted for WATER living (streamlined shape). Example fish: goldfish (orange with scales), salmon (silver with spots), shark (gray predator), tropical fish. (2) AMPHIBIAN CLASS - CLEAR PHOTOGRAPHS showing MOIST SMOOTH SKIN (wet appearance, no scales), LEGS FOR LAND (four legs distinct), METAMORPHOSIS mentioned/shown (tadpole and frog comparison), cold-blooded. Examples: frog (green bumpy throat, wide mouth), salamander (long body with spots), newt (aquatic with fin). (3) REPTILE CLASS - ILLUSTRATIONS showing DRY SCALY SKIN (overlapping scales, rough texture), COLD-BLOODED, LAY EGGS (emphasized), egg illustrated. Examples: turtle (hard shell protecting body), snake (no legs, scaled body), lizard (four legs, scaly), crocodile (large teeth, armored body). (4) BIRD CLASS - PHOTOGRAPHS showing DISTINCTIVE FEATHERS (colorful and detailed, showing wing and tail feathers prominently), BEAK (hard pointed mouth, no teeth), WINGS FOR FLIGHT, WARM-BLOODED, LAY EGGS. Examples: parrot (colorful feathers, large beak), chicken (distinctive comb, yellow feet), eagle (large wings, hooked beak), penguin (black and white feathers, flightless). (5) MAMMAL CLASS - PHOTOGRAPHS showing FUR or HAIR covering body (clearly visible, dense coat), WARM-BLOODED, PRODUCE MILK from MAMMARY GLANDS (emphasized as unique feature), usually live birth. Examples: cat (orange tabby with fur), dog (furry coat visible), horse (long mane and tail of hair), whale (gray with sparse hair), human (with hair visible). Each CLASS CARD shows 2-4 EXAMPLE ANIMALS with PHOTOGRAPHS or REALISTIC ILLUSTRATIONS. DISTINGUISHING FEATURES are LABELED CLEARLY with ARROWS or COLOR CODING. Large TEXT labels clearly identify each class. Child SORTS animals by class, LEARNING vertebrate CLASSIFICATION system and understanding how vertebrate diversity is organized. From 1-2 meters: colorful cards showing distinctive animal features with clear class names and examples. NOT detailed order or genus within classes (just five main vertebrate classes). Cards make distinctions IMMEDIATELY OBVIOUS through photographs and clear labeling.',
    key_materials: ['Cardstock cards with quality photographs or illustrations', 'Color coding for each class', 'Lamination for durability', 'Class label cards (5 main vertebrate classes)', 'Features labeled and highlighted', 'Example animal cards'],
    confusion_pairs: [
      {
        work_key: 'cu_vertebrate_invertebrate',
        reason: 'Both are zoology classification materials with animal cards',
        differentiation: 'FIVE CLASSES shows DETAILED VERTEBRATE CLASS DISTINCTIONS (fish/amphibian/reptile/bird/mammal) with multiple characteristics vs VERTEBRATE INVERTEBRATE uses simple BINARY backbone presence vs absence with mixed examples'
      }
    ],
    negative_descriptions: [
      'NOT detailed order or genus classification (just FIVE MAIN VERTEBRATE CLASSES)',
      'NOT invertebrate inclusion (VERTEBRATES ONLY - fish, amphibian, reptile, bird, mammal)',
      'NOT detailed body parts (focuses on CLASS-LEVEL DISTINGUISHING features like feathers, fur, scales)',
      'NOT a single animal focus (shows 2-4 EXAMPLE ANIMALS per class)',
      'NOT photographs without clear labeling (FEATURES LABELED clearly with ARROWS or COLOR CODING)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_fish',
    name: 'Parts of a Fish',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a FISH (typically a SIMPLE GENERIC FISH shape like goldfish or salmon silhouette) with 5-7 REMOVABLE WOODEN PIECES revealing FISH ANATOMY in schematic form. Puzzle illustrates: HEAD (front section including mouth and gill covers, separate removable piece), BODY (main torso section, largest piece), DORSAL FIN (back fin, colored piece removable from top), PECTORAL FINS (side fins for steering and balance, paired pieces), TAIL FIN/CAUDAL FIN (back propulsion fin, colored differently), GILL COVERS (operculum, removable protective flaps), SCALES (visible on body with painted detail or texture showing overlapping pattern). Puzzle shows SIDE VIEW of fish showing proper orientation and anatomy. Each part is COLOR-CODED with DISTINCT COLORS (orange/yellow body, red/pink fins, tan head) MATCHING PROVIDED NOMENCLATURE CARDS. Background often shows WATER (blue) for environmental context. Child IDENTIFYING fins and understanding their function in water movement - dorsal fin prevents rolling, pectoral fins steer and brake, tail fin propels. Puzzle teaches fish adaptation to aquatic life. From 1-2 meters: a fish-shaped puzzle with separate colored pieces and visible fins. NOT a flower or mammal (fish-specific anatomy and adaptations). NOT overly complex (simplified diagrammatic puzzle).',
    key_materials: ['Wooden puzzle base', 'Five to seven wooden puzzle pieces', 'Paint in fish colors', 'Nomenclature cards with color coding', 'Labels for each part', 'Blue water background'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_frog',
        reason: 'Both are zoology anatomy puzzles with removable wooden pieces',
        differentiation: 'PARTS FISH shows FISH ANATOMY with GILLS, SCALES, and FINS for water movement vs PARTS FROG shows AMPHIBIAN ANATOMY with MOIST SKIN, WEBBED LEGS, and BODY for both water and land'
      }
    ],
    negative_descriptions: [
      'NOT a flower or mammal (FISH-SPECIFIC anatomy and adaptations)',
      'NOT overly complex (simplified DIAGRAMMATIC puzzle, not detailed anatomy)',
      'NOT a real fish specimen (WOODEN schematic with REMOVABLE pieces)',
      'NOT a land animal puzzle (shows FISH with GILLS and FINS for aquatic life)',
      'NOT just scales (shows COMPLETE fish anatomy including HEAD, FINS, GILL COVERS)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_frog',
    name: 'Parts of a Frog',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a FROG (toad or tree frog in neutral pose) with 5-7 REMOVABLE PIECES revealing AMPHIBIAN ANATOMY. Puzzle illustrates: HEAD (large section, prominent EYES on top, wide MOUTH for catching insects, removable as separate piece), BODY (squat compact torso), FRONT LEGS (shorter limbs with four digits/toes, paired), BACK LEGS (MUCH LONGER and MUSCULAR, showing WEBBED FEET - visible webbing between toes for swimming/jumping, removing this is crucial to understanding amphibian adaptation), THROAT SAC (on some male frogs, shown as inflatable area for croaking), and sometimes TAIL REMNANT (showing tadpole to frog transition). Puzzle shows DORSAL VIEW (top-down perspective showing frog from above, how you would see it on a lily pad). Background may show lily pad or SHALLOW WATER environment for context. COLOR-CODED NOMENCLATURE CARDS for each part provided. Child UNDERSTANDS amphibian structure, COMPARES BACK LEGS to other animals (why so long? for jumping and swimming), OBSERVES webbed feet (adaptation for water). Puzzle emphasizes two-world lifestyle of amphibians (water and land). From 1-2 meters: a green/brown frog-shaped puzzle with distinct long back legs and webbed feet visible. NOT a fish (no fins, has legs and eyes adapted for air and land movement). NOT a mammal (smooth wet skin, metamorphosis from tadpole, cold-blooded, lives in water and on land).',
    key_materials: ['Wooden puzzle base', 'Five to seven wooden puzzle pieces', 'Green, tan, and brown paint', 'Webbing shown on back leg feet', 'Color-coded nomenclature cards', 'Labels for each part', 'Water/lily pad background'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_fish',
        reason: 'Both are zoology anatomy puzzles with removable wooden pieces',
        differentiation: 'PARTS FROG shows AMPHIBIAN ANATOMY with WEBBED LEGS for jumping/swimming and MOIST SKIN vs PARTS FISH shows AQUATIC-ONLY fish with GILLS, SCALES, and FINS'
      },
      {
        work_key: 'cu_parts_turtle',
        reason: 'Both are reptile/amphibian puzzles showing animal structure',
        differentiation: 'PARTS FROG shows AMPHIBIAN with SMOOTH MOIST SKIN and WEBBED FEET vs PARTS TURTLE shows REPTILE with PROTECTIVE SHELL and SCALY SKIN'
      }
    ],
    negative_descriptions: [
      'NOT a fish (no FINS, has LEGS adapted for air and land movement)',
      'NOT a mammal (SMOOTH WET SKIN, metamorphosis from tadpole, cold-blooded)',
      'NOT a turtle or reptile (SMOOTH MOIST SKIN, not SCALY or SHELLED)',
      'NOT a single frog photo (WOODEN schematic with REMOVABLE pieces showing anatomy)',
      'NOT simplified body parts (shows WEBBED FEET specifically, BACK LEGS vs FRONT LEGS distinction, THROAT SAC on males)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_turtle',
    name: 'Parts of a Turtle',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a TURTLE or TORTOISE with 5-6 REMOVABLE PIECES revealing REPTILE ANATOMY and the UNIQUE PROTECTIVE SHELL STRUCTURE. Puzzle illustrates: SHELL/CARAPACE (large protective dome covering back, the iconic turtle feature, removable as main piece, showing HEXAGONAL SCUTE PATTERN - individual scale sections visible on surface), PLASTRON (ventral shell on underside/bottom, removable as separate piece, flat), HEAD (small with eyes, nostrils, mouth, separate piece), FOUR LEGS (stubby reptilian limbs, clawed feet, may be removable as pairs or individual), TAIL (short extending from rear of shell, separate piece). Puzzle shows BOTH DORSAL (top) AND VENTRAL (bottom) PERSPECTIVES on same puzzle or in sequence - able to show both shell halves and understand complete protection. Shell pieces may show DETAILED SCUTE PATTERN (the hexagonal sections characteristic of turtles) painted or textured on surface. The SHELL ARMOR is immediately the most distinctive feature. COLOR-CODED LABELS with nomenclature cards provided. Child UNDERSTANDING the protective shell structure unique to reptiles and turtles specifically, APPRECIATES how shell provides total protection (can withdraw inside), and COMPARES to other reptiles without shells. From 1-2 meters: a reptile-shaped puzzle with prominent protective dome shell on top and flat shell on bottom. NOT a mammal (no fur, cold-blooded, shell-protected). NOT an amphibian (scaly protected shell, not moist skin, less dependent on water).',
    key_materials: ['Wooden puzzle base', 'Five to six wooden puzzle pieces', 'Brown, tan, and green paint', 'Scute pattern detail on shells', 'Color-coded nomenclature cards', 'Labels for each part'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_frog',
        reason: 'Both are zoology anatomy puzzles with removable pieces',
        differentiation: 'PARTS TURTLE shows REPTILE with PROTECTIVE SHELL and SCALY SKIN vs PARTS FROG shows AMPHIBIAN with SMOOTH MOIST SKIN and WEBBED FEET'
      }
    ],
    negative_descriptions: [
      'NOT a mammal (no fur, COLD-BLOODED, SHELL-PROTECTED)',
      'NOT an amphibian (SCALY PROTECTED shell, not moist skin, less dependent on water)',
      'NOT a snake or lizard (unique SHELL ARMOR with CARAPACE and PLASTRON)',
      'NOT a single turtle photo (WOODEN schematic with REMOVABLE pieces showing both DORSAL and VENTRAL perspectives)',
      'NOT simplified shell only (shows COMPLETE anatomy - HEAD, LEGS, TAIL, BOTH SHELL HALVES)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_bird',
    name: 'Parts of a Bird',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a BIRD (generic bird shape like chicken, parrot, or songbird) with 6-8 REMOVABLE PIECES revealing AVIAN ANATOMY and flight adaptations. Puzzle illustrates: HEAD (with distinctive BEAK, pointed and hard, EYES positioned on sides, removable piece), BEAK (hard pointed mouth, no teeth, separately emphasized), BODY (covered in feathers, compact shape for flight), FEATHERS (showing detailed feather arrangement, may include separate WING FEATHERS as removable piece showing flight feather arrangement), WINGS (showing internal wing structure with feathers and visible bone structure, removable as separate piece), TAIL (distinctly shaped tail feathers, often fan-like when spread, removable as separate piece), LEGS (thin bird legs with scaled appearance, feet with claws), and sometimes COMB or CREST (on some birds like chickens or cardinals, showing distinctive head feathers). Puzzle shows SIDE VIEW with clear feather structure visible on each piece - feathers are shown in realistic detail and color (reds, blues, yellows, whites depending on bird type). Background may show sky or tree perch. Child IDENTIFYING unique bird features - feathers (insulation and flight), beak (eating tool specific to diet), wings (flight adaptations), lightweight structure. Puzzle emphasizes FEATHERS as the #1 distinguishing bird feature. From 1-2 meters: a feathered bird-shaped puzzle with visible feathers, beak, and wings. NOT a mammal (feathers, not fur; beak, not teeth; lightweight hollow bones). NOT a reptile (feathers are unique to birds; most reptiles have scales, not feathers; birds are warm-blooded).',
    key_materials: ['Wooden puzzle base', 'Six to eight wooden puzzle pieces', 'Feather-patterned paint in bird colors', 'Detailed feather rendering', 'Color-coded nomenclature cards', 'Labels for each part'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_mammal',
        reason: 'Both are vertebrate anatomy puzzles with removable pieces',
        differentiation: 'PARTS BIRD shows AVIAN anatomy with FEATHERS, BEAK (no teeth), WINGS for flight vs PARTS MAMMAL shows MAMMAL anatomy with FUR/HAIR, TEETH, MILK-PRODUCING GLANDS'
      }
    ],
    negative_descriptions: [
      'NOT a mammal (FEATHERS not fur; hard BEAK not teeth; lightweight HOLLOW BONES)',
      'NOT a reptile (FEATHERS are unique to birds; reptiles have SCALES not feathers; birds are WARM-BLOODED)',
      'NOT just feathers (shows COMPLETE avian anatomy - HEAD, BEAK, WINGS, TAIL, LEGS)',
      'NOT a single bird photo (WOODEN schematic with REMOVABLE pieces showing internal structure)',
      'NOT fish or amphibian (no GILLS, no WEBBED FEET, specific BIRD-ONLY features like FEATHERS and BEAK)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_parts_horse',
    name: 'Parts of a Horse',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'WOODEN PUZZLE showing a HORSE in SIDE VIEW with 7-9 REMOVABLE WOODEN PIECES revealing MAMMAL ANATOMY and equine-specific features. Puzzle illustrates: HEAD (with ears, eyes, nostrils, removable piece), MANE (long flowing hair on neck, often removable as SEPARATE piece - distinctive feature of horses), NECK (muscular section), BODY (barrel chest and hindquarters, showing muscle and form), FRONT LEGS (paired, with visible hooves at bottom, may be removable as pair or individually), BACK LEGS (paired, muscular hindquarters, with hooves), TAIL (long flowing horse tail, removable as SEPARATE piece - another distinctive feature), and HOOVES (at end of each leg, dark hard covering, may be shown individually). Puzzle clearly shows FUR TEXTURE throughout (painted or textured to show hair coverage). MANE and TAIL are emphasized as distinctive horse features. Brown/chestnut/bay coloring typical. Puzzle may show muscular anatomy and correct proportions - horses are built for strength and running. COLOR-CODED NOMENCLATURE CARDS provided. Child IDENTIFIES mammalian features (fur, four legs, hooves) and HORSE-SPECIFIC features (mane, tail, hoof structure). From 1-2 meters: a furry brown horse-shaped puzzle with distinct long mane and tail. NOT a reptile or amphibian (visible fur covering, warm-blooded, hooves indicate mammal). NOT a bird (hooves, mane, long tail of hair not feathers, no wings).',
    key_materials: ['Wooden puzzle base', 'Seven to nine wooden puzzle pieces', 'Brown/chestnut/bay colored paint', 'Texture showing fur', 'Long mane and tail pieces emphasized', 'Color-coded nomenclature cards', 'Labels for each part'],
    confusion_pairs: [
      {
        work_key: 'cu_parts_bird',
        reason: 'Both are vertebrate anatomy puzzles with removable pieces',
        differentiation: 'PARTS HORSE shows MAMMAL anatomy with FUR/HAIR, HOOVES, MANE/TAIL of hair vs PARTS BIRD shows AVIAN anatomy with FEATHERS, hard BEAK, WINGS for flight'
      }
    ],
    negative_descriptions: [
      'NOT a reptile or amphibian (VISIBLE FUR covering, WARM-BLOODED, HOOVES indicate mammal)',
      'NOT a bird (HOOVES and long MANE/TAIL of hair, not feathers; no WINGS)',
      'NOT just hooves or mane (shows COMPLETE mammal anatomy - HEAD, LEGS, BODY, TAIL)',
      'NOT a single horse photo (WOODEN schematic with REMOVABLE pieces showing structure)',
      'NOT all four-legged animals (shows MAMMAL-SPECIFIC features - fur texture, mane, hooves)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_animal_habitats',
    name: 'Animal Habitats',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF HABITAT CLASSIFICATION CARDS showing WHERE different animals LIVE and THEIR ENVIRONMENTAL CHARACTERISTICS. Typically includes 6-8 major habitat types, each with ILLUSTRATED LARGE CARDS or COLOR PHOTOGRAPHS showing landscape and REPRESENTATIVE ANIMALS for each: (1) FOREST - dense tall trees, green undergrowth, dappled light, showing animals (brown deer in clearing, black bear on rocky outcrop, gray squirrel climbing tree, multicolored birds in branches, forest insects), (2) GRASSLAND/SAVANNA - open field with grass, scattered large trees, golden-brown colors, showing animals (zebra herd, lion stalking, antelope/gazelle leaping, ostrich standing tall, termite mound visible), (3) DESERT - sandy landscape, sparse dried vegetation, cacti, rocky terrain, showing animals (camel standing, small desert lizard, scorpion, sand-colored birds, rattlesnake), (4) OCEAN - blue water, coral or kelp visible, showing animals (colorful fish swimming, whale breaching water, jellyfish, sea turtle, shark fin visible), (5) ARCTIC/ICE - snow and ice landscape, icebergs, white colors, showing animals (white polar bear, penguin on ice, gray seal, arctic fox with white fur), (6) JUNGLE/RAINFOREST - dense dripping vegetation, vines, moisture visible, showing animals (red monkey in tree, jaguar spotted, colorful parrot, green snake, insects), (7) MOUNTAIN - rocky high elevation, snow-capped peaks, showing animals (golden eagle flying, mountain goat on cliff, brown bear, high-altitude bird). Each HABITAT CARD is LARGE (minimum 8×10 inches) with COLORFUL ILLUSTRATION or PROFESSIONAL PHOTOGRAPH showing complete habitat landscape. Animal cards (smaller, 3×4 inches) show individual animals with distinct features. Child MATCHING animal cards to habitat cards, or SORTING animals by where they live. Child learns that animals are ADAPTED to specific habitats and cannot all live everywhere. From 1-2 meters: large colorful habitat cards with smaller animal cards for matching. NOT ecosystem food chain (focuses on habitat/home location, not predator-prey relationships).',
    key_materials: ['Large cardstock habitat cards (6-8)', 'Colored illustrations or photographs', 'Smaller animal cards (30-50)', 'Lamination for durability', 'Matching/sorting labels', 'Storage box'],
    confusion_pairs: [
      {
        work_key: 'cu_animals_continents',
        reason: 'Both are animal geography materials with cards and matching activities',
        differentiation: 'ANIMAL HABITATS shows WHERE animals live by HABITAT TYPE (forest/grassland/desert/ocean) vs ANIMALS CONTINENTS shows WHERE animals live by GEOGRAPHIC CONTINENT (Africa/Asia/Australia)'
      }
    ],
    negative_descriptions: [
      'NOT ecosystem food chain (focuses on HABITAT/home location, not PREDATOR-PREY relationships)',
      'NOT genetic diversity (shows animal ENVIRONMENTAL ADAPTATIONS, not species evolution)',
      'NOT continent-based classification (organizes by HABITAT TYPE - forest/grassland/desert - not by continent)',
      'NOT just habitat photos (includes MATCHING ACTIVITY where child sorts ANIMALS into correct habitats)',
      'NOT a single environment (shows 6-8 DIVERSE habitat types with distinct characteristics)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_animals_continents',
    name: 'Animals of the Continents',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF ANIMAL FIGURINES or ILLUSTRATED CARDS matched with CONTINENT MATS or CONTINENT OUTLINE CARDS. Typically includes 7 CONTINENT MATS (large colored cards or fabric mats, each 12×18 inches minimum) showing CONTINENT OUTLINES and REPRESENTATIVE ANIMALS for each region: NORTH AMERICA (moose with antlers, bald eagle with white head, grizzly bear brown, mountain lion/puma, bison, raccoon), SOUTH AMERICA (jaguar spotted cat, anaconda snake, scarlet macaw colorful parrot, three-toed sloth hanging, piranha red), EUROPE (gray wolf, red fox with bushy tail, wild boar, tawny owl, brown deer, badger), AFRICA (ICONIC: lion with mane, zebra striped, tall giraffe with long neck, hippopotamus in water, African elephant large ears, leopard spotted, ostrich tall bird, cheetah running), ASIA (orange tiger with stripes, giant panda black and white, Asian elephant, Indian rhinoceros, red-crowned crane bird, orangutan in tree, Bengal tiger variant), AUSTRALIA (red kangaroo hopping, koala in tree, platypus unique, kookaburra laughing bird, Tasmanian devil, crocodile), ANTARCTICA (emperor penguin distinctive, Weddell seal, leopard seal predator, blue whale, skua bird). Animal FIGURINES are small (2-4 inch plastic or wooden figurines) or are ILLUSTRATED CARDS (3×4 inch photographs). Each continent MAT shows CONTINENT SHAPE, continent NAME in large letters, and illustrations or outlines showing where animals live on that continent. Child PLACING animal figurines or cards onto the correct continent mat, LEARNING geographic distribution of species. Child understands that certain animals are found only on specific continents (koalas only Australia, giraffes only Africa, etc.). From 1-2 meters: large continent mats with colorful animal figurines or cards positioned on correct continents. NOT food chain or ecosystem relationships (focuses on animal GEOGRAPHIC RANGE by continent, not predator-prey). NOT detailed taxonomy (shows representative animals per continent, not species classification).',
    key_materials: ['Seven continent mats (large, 12×18 inches)', 'Animal figurines (plastic or wood) or illustrated cards', 'Continent names and boundaries shown', 'Identification labels for animals', 'Storage box for figurines'],
    confusion_pairs: [
      {
        work_key: 'cu_animal_habitats',
        reason: 'Both are animal geography materials with cards and matching activities',
        differentiation: 'ANIMALS CONTINENTS shows WHERE animals live by GEOGRAPHIC CONTINENT (Africa/Asia/Australia) vs ANIMAL HABITATS shows WHERE animals live by HABITAT TYPE (forest/grassland/desert/ocean)'
      }
    ],
    negative_descriptions: [
      'NOT food chain or ecosystem relationships (focuses on animal GEOGRAPHIC RANGE by CONTINENT, not predator-prey)',
      'NOT detailed taxonomy (shows REPRESENTATIVE ANIMALS per continent, not species classification)',
      'NOT habitat-based classification (organizes by CONTINENT geography, not by habitat type)',
      'NOT a single continent (shows ALL 7 CONTINENTS with animal figurines placed on each)',
      'NOT evolutionary adaptation (shows GEOGRAPHIC DISTRIBUTION, not how animals adapted to environments)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_life_cycles',
    name: 'Animal Life Cycles',
    area_key: 'cultural',
    category: 'Zoology',
    visual_description:
      'SET OF SEQUENTIAL LIFE CYCLE CARDS showing METAMORPHOSIS and GROWTH STAGES of 2-4 different animal species, each demonstrating transformation. Set typically includes: (1) BUTTERFLY LIFE CYCLE - FOUR ILLUSTRATED CARDS showing DISTINCT STAGES: STAGE 1 - EGGS (tiny white or yellow eggs clustered on green leaf, barely visible), STAGE 2 - LARVA/CATERPILLAR (fat green worm with black stripes, large, eating leaf, causing damage visible on leaf edge), STAGE 3 - PUPA/CHRYSALIS (protective case hanging from branch, tan or green colored, appears dormant/resting), STAGE 4 - ADULT BUTTERFLY (colorful winged insect, orange/black or blue/black, completely different appearance from caterpillar, wings spread or resting), (2) FROG LIFE CYCLE - FOUR STAGES: EGGS (dark dots in clear jelly clusters in water), TADPOLE (fish-like with tail, no legs, gills visible, swims in water), TADPOLE WITH LEGS (tail shrinking, back legs growing then front legs appearing, transformation visible, breathing transitioning from gills to lungs), ADULT FROG (completely transformed, four legs, no tail, sitting on lily pad), (3) CHICKEN LIFE CYCLE - FOUR STAGES: EGG (brown egg in nest), CHICK (fluffy yellow baby chicken), JUVENILE CHICKEN (half-grown with emerging feathers), ADULT HEN or ROOSTER (full-sized, distinctive features like rooster comb or hen features), (4) OPTIONAL: BUTTERFLY AND MOTH comparison showing similar metamorphosis. Cards are LARGE (minimum 4×6 inches), LAMINATED or enclosed in CARD BOXES for protection. Each card shows CLEAR DETAILED ILLUSTRATION or PHOTOGRAPH showing the EXACT STAGE with NO AMBIGUITY. Child ARRANGING cards in CORRECT SEQUENTIAL ORDER, verbally describing the transformation, UNDERSTANDING METAMORPHOSIS and COMPLETE TRANSFORMATION (butterfly and frog change body plan completely), and COMPARING to gradual growth (chicken grows but maintains same body structure throughout). From 1-2 meters: colorful sequential cards showing obvious transformation stages. NOT plant cycles (shows animal METAMORPHOSIS specifically - dramatic body transformation). NOT continuous growth models (shows DISTINCT STAGES with visible transformations between stages).',
    key_materials: ['Illustrated life cycle cards (2-4 sets of 3-4 cards each)', 'Lamination or protective card boxes', 'Large clear illustrations', 'Labels showing stage names and descriptions', 'Storage box'],
    confusion_pairs: [
      {
        work_key: 'cu_plant_life_cycle',
        reason: 'Both show sequential life cycle cards with transformation stages',
        differentiation: 'ANIMAL LIFE CYCLES shows ANIMAL METAMORPHOSIS with DRAMATIC BODY TRANSFORMATION (butterfly/frog change structure) vs PLANT LIFE CYCLE shows PLANT GROWTH through stages maintaining same body plan'
      }
    ],
    negative_descriptions: [
      'NOT plant cycles (shows ANIMAL METAMORPHOSIS specifically - DRAMATIC BODY TRANSFORMATION)',
      'NOT continuous growth models (shows DISTINCT STAGES with visible TRANSFORMATIONS between stages)',
      'NOT adult animals only (shows COMPLETE TRANSFORMATION from egg/eggs through all growth stages)',
      'NOT single animal type (shows 2-4 DIFFERENT species with DISTINCT metamorphosis patterns)',
      'NOT geology or timeline (focuses on BIOLOGICAL TRANSFORMATION, not geological time periods)'
    ],
    difficulty: 'easy'
  },

  // ==================== PHYSICAL SCIENCE ====================
  {
    work_key: 'cu_sink_float',
    name: 'Sink and Float',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'HANDS-ON DENSITY EXPLORATION ACTIVITY with a LARGE WATER BASIN or WIDE SHALLOW TUB (6-8 inches deep, 12-18 inches diameter), FILLED WITH CLEAN WATER to 2/3 capacity. Set includes a DIVERSE COLLECTION OF OBJECTS with contrasting DENSITIES and MATERIALS: ITEMS THAT FLOAT - natural cork (light, buoyant), wooden block (water-resistant), foam pieces (very buoyant), plastic cup (hollow, buoyant), feather (extremely light), sponge (porous, absorbs but still floats), rubber duck (hollow, designed to float); ITEMS THAT SINK - smooth rock (dense, solid mineral), metal washer (denser than water), glass marble (solid, denser than water), ceramic tile (denser), plastic toy with solid construction, rubber toy (some rubber sinks depending on material and air pockets). Some objects are SURPRISING - solid plastic might float if hollow/full of air, certain wood might sink if water-saturated or if density is high. Basin is placed on CHILD-HEIGHT TABLE for easy access. Child PREDICTS which objects will float or sink, then PLACES them in water one by one to TEST predictions. Predictions are RECORDED on a two-column PREDICTION CHART. Child OBSERVES and RECORDS actual results. Through repeated testing, child develops understanding of DENSITY (mass per volume) determining whether objects float (less dense than water) or sink (more dense than water). Objects left in water show effects over time (wood absorbs water and eventually sinks if left long enough). From 1-2 meters: a tub of water with colorful objects, some floating on surface, some resting on bottom. NOT a game with winners/losers (scientific exploration activity focused on observation and prediction). NOT food safety or drink-related (uses toys and non-food objects only).',
    key_materials: ['Large water basin or tub', 'Collection of floating objects (cork, foam, plastic, feather, sponge)', 'Collection of sinking objects (rock, metal, glass, ceramic)', 'Prediction chart (printed or hand-drawn)', 'Water (fresh, clean)', 'Towel for cleanup'],
    confusion_pairs: [
      {
        work_key: 'cu_magnetic',
        reason: 'Both are hands-on physical science exploration activities',
        differentiation: 'SINK FLOAT uses WATER and explores DENSITY concepts (objects float/sink) vs MAGNETIC uses MAGNETS and explores MAGNETISM concepts (objects attract/repel)'
      }
    ],
    negative_descriptions: [
      'NOT a game with winners/losers (SCIENTIFIC EXPLORATION activity focused on observation and prediction)',
      'NOT food safety or drink-related (uses TOYS and non-food objects only)',
      'NOT electromagnetic (does not use electricity or magnets, only water and density)',
      'NOT a permanent activity (water will evaporate, objects dry, setup is temporary)',
      'NOT just letting objects sit (requires ACTIVE TESTING, PREDICTING, and RECORDING results)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_magnetic',
    name: 'Magnetic/Non-Magnetic',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'HANDS-ON MAGNETISM EXPLORATION with HANDHELD MAGNETS and a DIVERSE COLLECTION OF OBJECTS, some ferromagnetic (iron-based, attracted to magnets) and some NON-MAGNETIC. MAGNETIC OBJECTS include: metal washer (round flat metal), paper clip (bent metal, moves noticeably), iron nail (straight, attracted strongly), metal screw (threaded metal fastener), metal spoon (eating utensil, ferrous metal), metal fork (eating utensil), metal bolt (fastener). NON-MAGNETIC OBJECTS include: plastic fork (looks similar to metal fork but no attraction), rubber eraser (no attraction), wooden block (natural material, no attraction), paper (no attraction), glass marble (smooth, no attraction), ceramic tile (brittle, no attraction), aluminum foil (soft metal but NOT ferromagnetic), stone (natural mineral, no attraction), plastic toy (no attraction), wooden stick or pen. Child USES a HANDHELD MAGNET to TEST each object, PREDICTING which ones the magnet will attract BEFORE testing, RECORDING predictions on a CHART, then TESTING each object by BRINGING magnet close without touching, OBSERVING if object moves toward magnet or stays motionless. Child DISCOVERS that NOT all metal is magnetic - aluminum, stainless steel, and other metals are often NOT magnetic (learning an important distinction). Child SORTS objects into two groups (Magnetic / Non-Magnetic) based on test results. Child may notice that METAL APPEARANCE does not guarantee magnetism (aluminum looks metallic but is not magnetic, while iron might be dull but is strongly magnetic). From 1-2 meters: objects scattered on table with magnet in hand, some objects moving toward magnet, others unaffected. NOT a magnet science lecture or demonstration (hands-on DISCOVERY through experimentation - child actively tests). NOT electromagnetic (uses only simple permanent magnets, no electricity).',
    key_materials: ['Permanent handheld magnets (2-3)', 'Collection of ferrous metal objects', 'Collection of non-magnetic objects', 'Prediction and results chart', 'Pencils for recording'],
    confusion_pairs: [
      {
        work_key: 'cu_sink_float',
        reason: 'Both are hands-on physical science exploration activities with objects and prediction charts',
        differentiation: 'MAGNETIC tests if objects are ATTRACTED BY MAGNETS (ferrous/non-ferrous distinction) vs SINK FLOAT tests if objects FLOAT OR SINK in WATER (density distinction)'
      }
    ],
    negative_descriptions: [
      'NOT a magnet picking up game (SCIENTIFIC EXPLORATION with PREDICTION and TESTING, not a play activity)',
      'NOT electromagnets or electricity (uses simple PERMANENT MAGNETS only, no electrical circuits)',
      'NOT all metal is magnetic (key learning is that ALUMINUM and STAINLESS STEEL don\'t attract despite METALLIC APPEARANCE)',
      'NOT density or weight-based (magnetism is about ATOMIC IRON CONTENT, not how heavy an object is)',
      'NOT sorting by color or shape (sorts based on MAGNETIC ATTRACTION TEST, not visual appearance)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_states_matter',
    name: 'States of Matter',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'HANDS-ON EXPLORATION of THREE STATES OF MATTER (SOLID, LIQUID, GAS) with multiple demonstration activities: (1) SOLID DEMONSTRATION - child HANDLES AND OBSERVES TANGIBLE OBJECTS: WOODEN BLOCK (holds definite shape, doesn\'t change form when touched, maintains edges and dimensions), ROCK or STONE (hard, fixed shape, doesn\'t deform), ICE CUBE (frozen water, solid state, holds rectangular shape, cold temperature, eventually melts showing state change), child feels weight and rigidity, understands SOLIDS have DEFINITE SHAPE and DEFINITE VOLUME; (2) LIQUID DEMONSTRATION - WATER in clear containers (takes shape of container but volume remains constant when poured, flows freely, can be poured from one container to another), child POURS water back and forth, OBSERVES shape changes but volume stays same, understands LIQUIDS take container shape but maintain constant volume; (3) GAS DEMONSTRATION - STEAM from warm water (invisible gas, demonstrates that gas takes ALL available space, rises upward because less dense than air, disappears/disperses, or WATER VAPOR observation by holding cool surface near warm water and observing condensation), air bubbles rising in water (air is gas, visible as bubbles in liquid). Activities include PHASE CHANGE demonstrations: MELTING ICE (applying heat, solid ice transforms to liquid water, shows state change in action), EVAPORATING WATER (using heat/sun, liquid water becomes gas/vapor over days, water disappears/becomes invisible). Chart or ILLUSTRATION CARDS showing examples: solid (book, pen, shoe, block), liquid (water, milk, juice, oil), gas (air, steam, oxygen, CO2). Child IDENTIFIES household objects as solids, liquids, or gases. From 1-2 meters: water in containers, ice cubes, steam rising, and state labels shown. NOT phase changes only (focuses on PROPERTIES of each state - shape, volume, behavior - not just melting/evaporation). NOT chemical reactions (shows physical state changes only, molecules rearrange but same substance).',
    key_materials: ['Ice cubes in tray', 'Water in clear containers', 'Heat source (warm water, sun)', 'Wooden blocks, rocks, solids to hold', 'State of matter illustration cards', 'Chart showing three states', 'Optional: thermometer'],
    confusion_pairs: [
      {
        work_key: 'cu_sink_float',
        reason: 'Both explore physical properties with hands-on activities and observation charts',
        differentiation: 'STATES OF MATTER explores SHAPE and VOLUME properties across SOLID/LIQUID/GAS (phase changes with heat) vs SINK FLOAT explores DENSITY with objects in LIQUID water only'
      },
      {
        work_key: 'cu_color_mixing',
        reason: 'Both are physical science exploration with visible transformations and color/property changes',
        differentiation: 'STATES OF MATTER shows MOLECULAR STATE CHANGES (solid melts to liquid, liquid evaporates to gas, same substance but different form) vs COLOR MIXING shows PRIMARY colors combining into SECONDARY colors (different substances mixing, not state changes)'
      }
    ],
    negative_descriptions: [
      'NOT just melting ice (shows all THREE STATES of matter: solid, liquid, AND gas)',
      'NOT chemical reactions (molecules don\'t change structure, just PHYSICAL STATE changes - water stays water in all three states)',
      'NOT teaching phase diagrams or pressure (focuses on COMMON OBSERVABLE states at room temperature and with gentle heat)',
      'NOT liquid and solid only (includes GAS observations with STEAM or AIR BUBBLES)',
      'NOT evaporation/condensation only (explores DEFINING PROPERTIES of each state: shape, volume, flow behavior)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_color_mixing',
    name: 'Color Mixing',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'COLOR MIXING EXPERIMENT with PRIMARY COLORS (red, blue, yellow) in TRANSPARENT CONTAINERS. Materials include: SET OF 3 PRIMARY COLOR LIQUID PAINTS or FOOD COLORING (bright red, true blue, pure yellow in small squeeze bottles or dropper bottles), 6-8 CLEAR TRANSPARENT CUPS or JARS (glass or clear plastic, 4-6 oz, allowing full visibility of color changes), PLASTIC DROPPERS or PIPETTES for precise color addition, MIXING STICKS or SPOONS, WHITE PAPER or CARD underneath cups to show colors clearly, RECORDING SHEET with color wheel diagram. Child SQUEEZING or DROPPING measured amounts of primary colors into clear cups and STIRRING to create SECONDARY COLORS: red + blue = PURPLE/VIOLET, red + yellow = ORANGE, blue + yellow = GREEN. Child OBSERVING the GRADUAL COLOR TRANSFORMATION as colors blend, COMPARING resulting shades (more red + little yellow = red-orange vs equal parts = true orange), and RECORDING results on color wheel chart. Advanced: mixing all three primaries to create BROWN/BLACK, creating TINTS by adding white, creating SHADES by adding black. From 1-2 meters: clear cups with vivid colored liquids on white surface, droppers and paint bottles visible, child actively mixing and observing color changes. NOT painting or art project (SCIENTIFIC EXPERIMENT about color theory, not creating artwork). NOT sensorial Color Boxes work (uses LIQUID MIXING to discover color relationships, not MATCHING pre-made solid color tablets).',
    key_materials: ['Primary color paints or food coloring (red, blue, yellow)', 'Clear transparent cups or jars', 'Plastic droppers or pipettes', 'Mixing sticks', 'White paper underneath', 'Color wheel recording sheet'],
    confusion_pairs: [
      {
        work_key: 'se_color_box_2',
        reason: 'Both involve colors but Color Mixing uses liquids while Color Boxes use solid tablets',
        differentiation: 'COLOR MIXING uses LIQUID PAINTS in TRANSPARENT CUPS creating NEW colors by BLENDING vs COLOR BOX uses RIGID WOODEN TABLETS that are PRE-PAINTED and matched by COMPARISON'
      },
      {
        work_key: 'cu_painting',
        reason: 'Both involve paints and colors but one is scientific experiment, other is art creation',
        differentiation: 'COLOR MIXING is a SCIENCE EXPERIMENT in CLEAR CUPS observing color transformation vs PAINTING creates ARTWORK on PAPER or CANVAS using brushes'
      }
    ],
    negative_descriptions: [
      'NOT Color Box sensorial work (uses LIQUID PAINTS in TRANSPARENT CUPS to CREATE new colors, not matching PRE-MADE solid tablets)',
      'NOT painting or art class (SCIENTIFIC EXPERIMENT about primary and secondary colors, not creating artwork)',
      'NOT food preparation or cooking (uses MEASURED drops of colored liquid for CONTROLLED color theory experiments)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_simple_machines',
    name: 'Simple Machines',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'SET OF HANDS-ON DEMONSTRATION MATERIALS or BUILT MODELS showing BASIC MECHANICAL PRINCIPLES and how SIMPLE MACHINES REDUCE EFFORT or CHANGE DIRECTION of force. Typically includes 3-5 functional machines: (1) LEVER - wooden rod resting on fulcrum (wooden block or metal support point), with WEIGHT or object at one end, child PUSHING down on opposite end, OBSERVING how small effort at long end lifts heavy weight at short end, understanding MECHANICAL ADVANTAGE by adjusting fulcrum position (closer to weight = greater advantage), (2) PULLEY - rope threaded through FIXED BLOCK suspended above, with object attached to rope, child PULLING rope to LIFT object, DISCOVERING how PULLEY changes direction (pulling down lifts object up) and how MULTIPLE PULLEYS provide mechanical advantage (e.g., two pulleys double the mechanical advantage), (3) INCLINED PLANE - RAMP at adjustable ANGLE (15-45 degrees), child ROLLING or SLIDING objects down slope, COMPARING effort needed to slide object up vs pushing straight up vertically, discovering that longer slope reduces effort (trade longer distance for less force), (4) WHEEL AND AXLE - wooden wheel mounted on axle, child TURNING large wheel and OBSERVING how axle turns (or vice versa), UNDERSTANDING that wheel is like a lever wrapped around a circle, large wheel circumference makes turning easier than turning small axle directly, (5) SCREW - optional for older children, demonstrating how rotational motion converts to linear motion. Each machine has ADJUSTABLE DIFFICULTY (fulcrum position on lever, angle of ramp, pulley configuration) allowing child to experiment and DISCOVER principles through manipulation. From 1-2 meters: hands-on equipment with pulleys, ramps, blocks - child actively using hands to operate. NOT complex engineering (shows only basic mechanical principles, not compound machines). Emphasis on DISCOVERY and understanding work = force × distance trade-offs.',
    key_materials: ['Lever with adjustable fulcrum', 'Pulley system with rope and blocks', 'Inclined plane/ramp (adjustable)', 'Wheel and axle demonstration', 'Weights or objects to move', 'Screw (optional, older children)', 'Labels showing each machine type'],
    confusion_pairs: [
      {
        work_key: 'cu_magnetic',
        reason: 'Both are hands-on physics exploration with tools and discovery-based learning',
        differentiation: 'SIMPLE MACHINES explores MECHANICAL ADVANTAGE with LEVERS, PULLEYS, RAMPS, and WHEELS (using force and distance) vs MAGNETIC explores MAGNETISM with PERMANENT MAGNETS and iron-based attraction'
      }
    ],
    negative_descriptions: [
      'NOT toys or games (MECHANICAL PRINCIPLES exploration with functional machines, not entertainment)',
      'NOT advanced engineering (shows only basic SINGLE SIMPLE MACHINES - lever, pulley, ramp - not compound machines or gears)',
      'NOT computer robotics (hands-on PHYSICAL demonstration, not motors or electrical components)',
      'NOT decorative (machines are FUNCTIONAL and ADJUSTABLE for experimentation, not static displays)',
      'NOT memorization (emphasis on DISCOVERY through hands-on manipulation and experiencing mechanical advantage)'
    ],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_nature_study',
    name: 'Nature Study',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'OUTDOOR OBSERVATION and TACTILE EXPLORATION ACTIVITY encouraging CLOSE attention to NATURAL DETAILS through multiple senses. Materials include: MAGNIFYING GLASS (3-6x magnification, handheld lens 2-4 inches diameter in wooden or plastic frame), NATURE JOURNAL (blank or lightly structured pages with illustration space and writing lines, approximately 8×10 inches), PENCILS or MARKERS for drawing and recording, COLLECTION BAG or BASKET (cloth or canvas for gathering specimens), optional FIELD GUIDES (books showing common plants, insects, birds, etc.). Child GOING on NATURE WALK outdoors in various habitats (park, garden, woods, meadow), OBSERVING in detail: PLANTS (examining leaf shape, color, texture by touch, leaf venation pattern through magnifying glass, flowers and their structure, bark texture on trees - rough vs smooth), INSECTS (watching ants working, butterflies visiting flowers, spiders and their webs, flying insects), SMALL ANIMALS (birds (color, song, movement, size), squirrels or chipmunks (behavior, movement), small mammals), MINERALS (smooth rocks, rough stones, different colored pebbles, sand texture), WATER FEATURES (streams, puddles, water plants, aquatic insects). Child COLLECTING natural items (LEAVES - variety of shapes, colors, sizes, pressed in journal; SMOOTH STONES - comparing textures; INTERESTING STICKS or TWIGS - shapes and bark patterns; FEATHERS - soft, varied colors; SEED PODS - structures for plant dispersal). Collected items brought INDOORS for closer examination and study. Child SKETCHING observations in journal (drawing the plant/insect/rock with accurate details), DESCRIBING in words (color, texture, size estimate, where found, behavior observed). Multiple senses engaged: SEEING colors and shapes, TOUCHING textures (rough bark, smooth stone, soft feather), SMELLING (flowers, earth after rain), HEARING (bird songs, water sounds), occasionally TASTING (safe things like clover - with permission and knowledge). From 1-2 meters: child outdoors with collection bag, magnifying glass, nature journal, handling natural items. NOT structured curriculum or identification lesson (FREE EXPLORATION and observation - no need for correct identification, focus is LOOKING CLOSELY and RECORDING). NOT collection without observation (active LOOKING and RECORDING is core - collection is secondary to observation).',
    key_materials: ['Magnifying glass', 'Nature journal (blank or lightly structured)', 'Pencils or markers', 'Collection bag or basket', 'Field guides (optional)', 'Outdoor access'],
    confusion_pairs: [
      {
        work_key: 'cu_weather',
        reason: 'Both are outdoor observation and recording activities with journals',
        differentiation: 'NATURE STUDY observes LIVING THINGS and NATURAL OBJECTS in detail with magnifying glass (plants, insects, stones, textures) vs WEATHER STUDY systematically records ATMOSPHERIC CONDITIONS on charts (temperature, precipitation, wind)'
      }
    ],
    negative_descriptions: [
      'NOT structured identification lessons (FREE EXPLORATION - no requirement to identify correctly or name species)',
      'NOT collection without observation (active LOOKING, TOUCHING, DRAWING, and RECORDING is core - collection is secondary)',
      'NOT classroom science (OUTDOOR activity in natural habitats, not indoor experiments)',
      'NOT species memorization (focus on observing DETAILS and noting observations, not learning taxonomy)',
      'NOT hikes for exercise (pace is SLOW and CONTEMPLATIVE to allow CLOSE OBSERVATION and detailed sketching)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_weather',
    name: 'Weather Study',
    area_key: 'cultural',
    category: 'Physical Science',
    visual_description:
      'DAILY WEATHER OBSERVATION and SYSTEMATIC RECORDING ACTIVITY building weather awareness and scientific data collection habits. Materials include: LARGE WEATHER CHART or BOARD (2-3 feet wide) mounted on wall or easel with MOVABLE CARDS or ICON SLOTS showing WEATHER CONDITIONS on separate rails or card holders, DAY-OF-WEEK CARDS (similar to calendar work), MONTH and DATE indicators; SET OF WEATHER ICON CARDS or symbols (bright YELLOW sun card for sunny, WHITE cloud card for cloudy, GRAY rain cloud card for rainy, BLUE snowflake card for snowy, PURPLE lightning for stormy, ORANGE/BROWN wind symbol for windy) each approximately 3×3 inches with clear illustration; THERMOMETER (large classroom thermometer, 12-18 inches tall, clearly readable numbers showing temperature in Fahrenheit or Celsius) for daily temperature readings; TEMPERATURE RECORDING GRAPH or CHART (grid showing days on x-axis, temperature on y-axis, child plots daily temperatures creating a visible line/trend); PRECIPITATION GAUGE or RAIN GAUGE (clear container marked with measurement lines, placed outside to collect rainfall, child reads depth measurement daily); WIND DIRECTION INDICATOR (simple weather vane showing N/S/E/W directions, or wind sock that changes shape/direction with wind); WEATHER OBSERVATION JOURNAL (pages with space to draw and describe weather conditions, record temperature, note special observations). Child OBSERVING weather conditions each morning or designated time, SELECTING the appropriate WEATHER ICON CARD and MOVING it to TODAY\'S position on the chart, READING the THERMOMETER and RECORDING the temperature on the graph (creating a visible trend over weeks/months), MEASURING rainfall (if recent rain) and RECORDING precipitation amount, NOTING wind direction using wind vane, DESCRIBING in JOURNAL observations (Was it sunny all day or partly cloudy? Did temperature increase? Did it rain? How hard?). Often accompanied by SEASONAL PATTERN discussion (tracking how weather changes with seasons). Chart becomes a VISUAL RECORD of weather patterns over time. From 1-2 meters: a wall chart with movable cards, thermometer visible, graph showing temperature trends. NOT detailed meteorology (simple daily observation and recording of conditions - no pressure systems, humidity, or complex weather science). NOT climate science (weather in CURRENT season - not long-term patterns or climate change).',
    key_materials: ['Weather chart or board', 'Weather icon cards (sun, cloud, rain, snow, wind)', 'Large classroom thermometer', 'Temperature recording graph', 'Precipitation/rain gauge', 'Wind vane or direction indicator', 'Weather observation journal', 'Pencils/markers'],
    confusion_pairs: [
      {
        work_key: 'cu_nature_study',
        reason: 'Both are observation and recording activities with journals and outdoor awareness',
        differentiation: 'WEATHER STUDY systematically records ATMOSPHERIC CONDITIONS on CHARTS (temperature, precipitation, wind daily tracking) vs NATURE STUDY observes LIVING THINGS and NATURAL DETAILS (plants, insects, rocks) with magnifying glass and sketching'
      }
    ],
    negative_descriptions: [
      'NOT meteorology or complex weather science (simple DAILY OBSERVATION of temperature, sun/clouds/rain, wind direction - no pressure systems or humidity)',
      'NOT climate change or seasonal analysis (focuses on CURRENT weather recording, not long-term climate patterns)',
      'NOT astronomy (weather is atmospheric conditions, not stars or planets)',
      'NOT weather prediction (recording ACTUAL current conditions, not forecasting future weather)',
      'NOT decorative calendar (provides FUNCTIONAL temperature graphs and precipitation data showing PATTERNS over weeks/months)'
    ],
    difficulty: 'easy'
  },

  // ==================== ART ====================
  {
    work_key: 'cu_drawing',
    name: 'Drawing',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'OPEN-ENDED CREATIVE DRAWING ACTIVITY with diverse DRAWING MATERIALS and PAPER in various formats and colors. Materials include: PENCILS (wood-cased pencils in HB or #2 for general drawing, sharpened ready-to-use, natural wood color with black graphite visible), COLORED PENCILS (24+ colors in wooden form, bright colors visible when sharpened), CRAYONS (in standard color set, waxy appearance, various bright colors), MARKERS (washable markers, bright ink colors visible in barrel, felt or plastic tips), ERASERS (pink rubber erasers, white plastic erasers, kneaded erasers for blending), and PAPER (white drawing paper 8.5×11 or 9×12 inches, colored paper in various hues, pad of sketch paper). Child DRAWING freely on paper, EXPLORING mark-making with different materials, EXPERIMENTING with LINE QUALITY (light vs dark, thin vs thick, straight vs curved), and COMPOSITION (filling space, arranging shapes). Activity includes optional GUIDED DRAWING LESSONS (step-by-step drawings: draw a basic shape tree, add branches, add leaves, shade with pencil, progress to realistic rendering) or purely FREE DRAWING (child chooses subject, media, and approach). Child EXPERIMENTING with different PRESSURES on pencil (light feathering, dark heavy lines), different materials (pencil creates sharp lines, crayon creates soft blended areas, markers create bold colors), and COMBINATIONS (pencil outline with marker fill). Artwork displayed on walls, kept in PORTFOLIOS, or collected in SKETCHBOOKS showing growth over time. Child develops FINE MOTOR control, hand strength, and creative confidence through repetition. From 1-2 meters: child with pencil and paper, various drawings showing lines, shapes, and attempts at representation. NOT structured art production with specific requirements (focus on PROCESS and EXPLORATION, not product quality or artistic outcome). NOT copying or tracing (freehand drawing emphasis - child creates from imagination or observation, not copying a picture).',
    key_materials: ['Wood pencils (HB or #2)', 'Colored pencils (24+ colors)', 'Crayons', 'Washable markers', 'Erasers (pink, white, kneaded)', 'Drawing paper (white, colored)', 'Pencil sharpener', 'Sketch pad or portfolio'],
    confusion_pairs: [
      {
        work_key: 'cu_painting',
        reason: 'Both are open-ended creative visual art activities with various materials and paper/canvas',
        differentiation: 'DRAWING uses PENCILS, MARKERS, CRAYONS (dry media creating LINE-based marks) vs PAINTING uses BRUSHES and PAINT (wet media creating COLOR washes and strokes)'
      }
    ],
    negative_descriptions: [
      'NOT structured art lessons with specific subjects (child chooses WHAT to draw, not following predetermined themes)',
      'NOT copying or tracing (FREEHAND drawing from imagination or observation, not replicating reference images)',
      'NOT coloring books or worksheets (blank paper encourages original composition, not filling pre-drawn outlines)',
      'NOT assessment or grading (process-focused exploration - no \"right\" or \"wrong\" drawings)',
      'NOT fine art instruction (focus on EXPERIMENTATION and mark-making with various materials, not technique mastery)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_painting',
    name: 'Painting',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'OPEN-ENDED CREATIVE PAINTING ACTIVITY with PAINT MEDIA and BRUSHES of various sizes. Setup includes: EASEL or TABLE for working surface (easel holds paper at angle encouraging arm movement and easy brush strokes, table allows more control), WATERCOLOR PAINTS or TEMPERA/ACRYLIC PAINTS (in individual colors - reds, yellows, blues, greens, blacks, whites), PAINTBRUSHES (multiple sizes: thin brushes for detail, medium brushes for general coverage, wide brushes for background fills, each 0.5-1 inch across), WATER CONTAINERS for rinsing brushes (clear container shows water becoming colored with paint), PAPER or CANVAS (white paper 9×12 inches or larger, canvas board, watercolor paper), PALETTE for mixing colors (ceramic plate, plastic palette, or mixing tray showing color combinations), PAPER TOWELS for cleanup and brush management. Child PAINTING freely on paper, EXPERIMENTING with colors, BRUSHWORK TECHNIQUES (long strokes, dots/stipples, circular motions), and COMPOSITION. Activities include: FREE PAINTING (child chooses colors, subject, approach), GUIDED PAINTING LESSONS (learning specific techniques: wet-on-wet watercolor creates soft blends, dry brush creates texture, layering creates depth), COLOR EXPLORATION (mixing paints on palette, OBSERVING color changes, creating new colors). Child OBSERVING how COLORS MIX on paper (blue + yellow = green), how BRUSH SIZE affects line quality (thin brush = fine detail, wide brush = bold coverage), how WATER affects paint behavior (more water = light translucent color, less water = bold opaque color). Completed paintings displayed or collected in portfolio. From 1-2 meters: child at easel or table with brush and colorful paint palette visible, paintings with visible brushstrokes and color mixing. NOT structured art assignment (process-oriented exploration - no correct subject or color choice). NOT copying artwork (original creation using colors and marks child chooses).',
    key_materials: ['Easel or table surface', 'Watercolor, tempera, or acrylic paints', 'Paintbrushes (various sizes)', 'Water containers (clear)', 'Paper or canvas', 'Palette for mixing', 'Paper towels', 'Apron for protection'],
    confusion_pairs: [
      {
        work_key: 'cu_drawing',
        reason: 'Both are open-ended creative art activities with various materials on paper/canvas',
        differentiation: 'PAINTING uses BRUSHES and WET PAINT media creating COLOR washes and blended strokes vs DRAWING uses DRY MEDIA (pencils, markers, crayons) creating LINE-based marks and defined edges'
      },
      {
        work_key: 'cu_color_mixing',
        reason: 'Both involve color observation and mixing on palettes/surfaces',
        differentiation: 'PAINTING is open-ended CREATIVE EXPRESSION with colors chosen by child vs COLOR MIXING is SCIENTIFIC EXPLORATION of how primary colors combine into secondary colors'
      }
    ],
    negative_descriptions: [
      'NOT paint-by-numbers or structured templates (blank paper encourages original color choices and composition)',
      'NOT copying or reproducing reference artwork (child creates ORIGINAL paintings using their color choices)',
      'NOT formal art instruction (focuses on PROCESS of mark-making and color exploration, not technique mastery)',
      'NOT decorative (paintings show EXPERIMENTAL brushstrokes and color mixing, not polished finished works)',
      'NOT graded or evaluated (process-focused creative exploration - all paintings are valid regardless of appearance)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_collage',
    name: 'Collage',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'CUT AND PASTE ARTWORK using PAPER MATERIALS and ADHESIVES to create composite images. Materials include: COLORED PAPER (construction paper in 10+ colors, tissue paper in translucent colors, interesting textures), MAGAZINES (for cutting out images), SCISSORS (child-safe with rounded tips, cuts cleanly through paper), GLUE STICK or LIQUID GLUE (glue stick allows dry application, liquid glue creates stronger adhesion), BACKING PAPER (large sheet for composition base, white or colored). Child SELECTING colored paper pieces or CUTTING images from magazines, ARRANGING pieces on backing paper to create COMPOSITION, then GLUING in place. Activities include: FREE COLLAGE (child makes artistic choices about colors and arrangement), THEMED COLLAGE (cut images from magazines about a topic - animals, vehicles, food - and arrange), PAPER TEARING activity (tearing paper by hand instead of cutting creates interesting organic edges for younger children developing fine motor), COLOR COLLAGE (experimenting with color combinations and visual harmony). Child EXPERIMENTING with COMPOSITION (balance, visual weight, focal points), COLOR ARRANGEMENT (complementary colors, analogous colors), and SPATIAL RELATIONSHIPS (overlapping pieces create depth). Child ARRANGES pieces before gluing (dry arrangement allows adjustments), then carefully GLUES each piece. Finished collage shows LAYERING of pieces, OVERLAPPING creating dimension, and COLOR RELATIONSHIPS. From 1-2 meters: colorful paper pieces glued to backing creating mosaic-like or representational image. NOT structured template (child makes ALL artistic choices about composition, colors, and content - no pre-drawn outlines or predetermined arrangement).',
    key_materials: ['Colored construction paper', 'Tissue paper', 'Magazines', 'Child-safe scissors', 'Glue stick or liquid glue', 'Backing paper (large)', 'Optional: stamps, stickers, natural materials (leaves, twigs)'],
    confusion_pairs: [
      {
        work_key: 'cu_drawing',
        reason: 'Both are creative visual art activities with paper/surfaces and varied materials',
        differentiation: 'COLLAGE uses CUT PAPER PIECES and GLUING to layer/overlap materials vs DRAWING uses pencils/markers to create mark-based designs'
      }
    ],
    negative_descriptions: [
      'NOT coloring in pre-drawn shapes (uses CUT and ARRANGED paper pieces, not filling outlines)',
      'NOT structured craft projects with predetermined templates (child makes ALL choices about arrangement, colors, composition)',
      'NOT scrapbooking with photo preservation (focuses on ARTISTIC composition and color arrangement, not photo archiving)',
      'NOT mosaics with precise placement (organic arrangement with overlapping and layering, not geometric grid patterns)',
      'NOT gluing without arrangement (child ARRANGES pieces before gluing - dry composition allows adjustments before commitment)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_clay',
    name: 'Clay and Playdough',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'THREE-DIMENSIONAL SCULPTURAL WORK with CLAY or PLAYDOUGH MATERIALS for manipulation and creative form-making. Materials include: CLAY (natural clay - air-dry clay hardens without kiln over 24-48 hours, or kiln-fired clay for permanent hardening), or PLAYDOUGH (salt dough, commercial modeling compound, or natural flour-salt-water dough), SCULPTING TOOLS (wooden tools for texture, plastic tools, natural sticks for carving), WORK SURFACE (ceramic tile, wooden board, cloth-covered table). Child MANIPULATING material with HANDS and TOOLS to create THREE-DIMENSIONAL FORMS using techniques: PINCHING (pulling clay between thumb and fingers to thin and shape), COILING (rolling clay into long rope, coiling into spirals), ROLLING (creating balls and logs by rolling between palms or on surface), BUILDING (stacking pieces, attaching with slip/water as adhesive), CARVING (using tools to create texture and patterns). Creations may include: ABSTRACT SHAPES (exploring form and texture), RECOGNIZABLE OBJECTS (animals - cat, dog, elephant; human figures; houses; trees; food items), FUNCTIONAL ITEMS (bowls for holding objects, beads for stringing, tiles with impressed patterns). Child EXPLORING texture by pressing tools or found objects into surface (creating dots, lines, patterns), understanding BALANCE (wide base prevents tipping, proper weight distribution), and SPATIAL RELATIONSHIPS (how parts attach and relate). Activity DEVELOPS hand muscles, fine motor control, and three-dimensional spatial thinking. From 1-2 meters: colorful (brown, white, pink) clay pieces showing handprints, pinched edges, carved patterns, and recognizable or abstract forms. NOT structured pottery instruction (no potter\'s wheel, no kiln glazing, no production of matched sets - focus on free exploration and creation). NOT mold-based (hands and tools shape material, not pressing into pre-made molds).',
    key_materials: ['Clay (air-dry or kiln-fired)', 'Playdough or salt dough', 'Sculpting tools', 'Work board or ceramic tile', 'Water for clay adhesion', 'Kiln (if using clay)', 'Storage containers for clay/dough'],
    confusion_pairs: [
      {
        work_key: 'cu_painting',
        reason: 'Both are open-ended creative art activities exploring materials and form',
        differentiation: 'CLAY is THREE-DIMENSIONAL sculptural work with hands shaping MOLDABLE materials (pinching, coiling, carving) vs PAINTING is TWO-DIMENSIONAL with BRUSHES and PAINT on flat surfaces'
      }
    ],
    negative_descriptions: [
      'NOT pottery wheel instruction (focuses on hand-shaping with PINCHING and COILING, not professional wheel throwing)',
      'NOT mold-based crafts (child shapes material freely with HANDS and TOOLS, not pressing into pre-made molds)',
      'NOT kiln firing requirement (air-dry clay is sufficient - kiln-fired is optional for permanence)',
      'NOT matched set production (focuses on FREE EXPLORATION creating varied forms, not producing multiple identical pieces)',
      'NOT functional ware instruction (bowls and vessels are EXPLORATORY forms, not carefully crafted functional items)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_printmaking',
    name: 'Printmaking',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'PRINT CREATION USING STAMPS, BLOCKS, and INKING to transfer images to paper. Materials include: RUBBER STAMPS (variety: geometric shapes - circles, squares, triangles; letters for spelling; pictures - animals, plants, objects), FOAM STAMPS or WOODEN STAMPS, INK PADS or ACRYLIC PAINT (in rainbow colors), STAMPING SURFACE (firm sponge or felt pad for ink absorption, allowing clean stamp face contact), and PAPER (white or colored paper, large format 9×12 or larger). Child PRESSING stamp into INK PAD or paint, then STAMPING onto paper to create PRINTS. Activities include: FREE STAMPING (randomly placing stamps to create design), PATTERN CREATION (repeating same stamp in rows or grids to create organized pattern), PICTURE MAKING (combining multiple stamp images to create scene - stamp animals, trees, clouds to make landscape), COLOR EXPERIMENTATION (using multiple ink colors on same print, mixing colors by overlapping stamps). Optional advanced: CARVING stamps from ERASERS (cutting design into eraser surface with carving tool - older children) or LINOLEUM BLOCKS (more permanent, professional-looking prints). Child EXPERIMENTING with PRESSURE (light press creates faint print, firm press creates bold impression), STAMP PLACEMENT (composition), and COLOR COMBINATIONS (multiple colors create visual interest). Prints show CLEAR IMPRESSIONS and REPETITION creating pattern or rhythm. From 1-2 meters: paper covered with repeated stamp images in various colors creating patterns or pictures. NOT painting (uses stamps and ink pads, not brushes and paints - transfer method rather than direct application). NOT drawing (ink transfer method creates distinct impression look, not hand-drawn lines).',
    key_materials: ['Rubber stamps (variety of designs)', 'Foam or wooden stamps', 'Ink pads (multiple colors) or acrylic paint', 'Ink pad base with felt', 'Paper (white, colored, large)', 'Optional: carving tools, erasers, linoleum blocks'],
    confusion_pairs: [
      {
        work_key: 'cu_drawing',
        reason: 'Both are 2D mark-making art activities creating images on paper',
        differentiation: 'PRINTMAKING uses STAMP TRANSFER with INK PADS creating repeated IDENTICAL impressions vs DRAWING uses PENCILS/MARKERS to create unique hand-drawn LINE-based designs'
      },
      {
        work_key: 'cu_painting',
        reason: 'Both create colored images but use different transfer methods',
        differentiation: 'PRINTMAKING uses STAMPS and INK creating PRECISE REPEATED IMPRESSIONS vs PAINTING uses BRUSHES and PAINT creating INDIVIDUAL STROKES and color washes'
      }
    ],
    negative_descriptions: [
      'NOT painting (uses STAMPS and INK PADS for TRANSFER, not brushes and paint for direct application)',
      'NOT drawing (creates IMPRESSION-based designs with STAMPS, not hand-drawn lines)',
      'NOT mechanical reproduction of pre-made images (children ARRANGE and COMBINE stamps creatively - stamps are tools, not templates)',
      'NOT careful fine art (focuses on EXPERIMENTATION with pattern, color, and composition - not precision printing)',
      'NOT structured craft project (child makes ALL choices about which stamps, colors, placement, and pattern)'
    ],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_art_appreciation',
    name: 'Art Appreciation',
    area_key: 'cultural',
    category: 'Art',
    visual_description:
      'OBSERVATIONAL STUDY OF FAMOUS ARTWORK, ARTISTS, and ART MOVEMENTS developing aesthetic appreciation and art vocabulary. Materials include: HIGH-QUALITY ART PRINTS (museum-quality reproductions of famous paintings and sculptures, minimum 8×10 inches, clear color fidelity), ARTIST BIOGRAPHY CARDS (3×5 cards with artist name, birth/death dates, nationality, primary style/period, and personal information), ART DISCUSSION GUIDE (questions and prompts for reflection). Child OBSERVING artwork closely from various distances (near to see brushwork detail, far to see composition), DISCUSSING and DESCRIBING: COLORS (how colors are used, which colors dominate, emotional response to colors), COMPOSITION (where focal point is, how viewer\'s eye moves through painting, balance), SUBJECT MATTER (what is depicted, story or meaning), ARTIST\'S STYLE (distinctive approach - realistic, abstract, impressionist, cubist, etc.), TIME PERIOD (historical context, when created, relevant events), CULTURAL CONTEXT (artist\'s background, what inspired creation). Activities include: ARTIST STUDY (learning biography and major works of one artist like Vincent van Gogh - turbulent life reflected in swirling brushwork, use of bright colors; or Pablo Picasso - development from realism to cubism), MOVEMENT STUDY (learning about impressionism - light effects, loose brushwork, nature scenes; cubism - geometric forms, multiple perspectives; abstract - non-representational, exploring shape and color). Optional: CREATING ARTWORK IN STYLE OF artist studied (after careful observation and appreciation - child creates painting or drawing inspired by artist\'s style but with own subject matter). Child DEVELOPING VISUAL LITERACY - understanding how artists use tools, colors, composition to communicate ideas and emotions. From 1-2 meters: high-quality art prints on walls or in displays, artist cards visible, children discussing observations. NOT art history lecture (child-led observation and discussion - teacher asks questions and guides reflection, not lecturing). NOT copying artwork (appreciation first, original creation inspired by study comes second and is optional).',
    key_materials: ['Art prints (high quality, 8×10 or larger)', 'Artist biography cards', 'Discussion guide with reflection questions', 'Art history books and reference materials', 'Optional: materials for creating art inspired by famous works'],
    confusion_pairs: [],
    negative_descriptions: [
      'NOT children doing their own art projects (STUDYING and OBSERVING famous artworks, not creating original art)',
      'NOT art class or craft time (focused on APPRECIATION, DISCUSSION, and UNDERSTANDING of professional artwork)',
      'NOT museum visit or field trip (classroom-based study with high-quality REPRODUCTIONS and BIOGRAPHY CARDS)'
    ],
    difficulty: 'medium'
  },

  // ==================== MUSIC ====================
  {
    work_key: 'cu_singing',
    name: 'Singing',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'GROUP SINGING ACTIVITY with SONG REPERTOIRE and SUPPORTIVE MATERIALS. Materials include: LAMINATED SONG CARDS (8×10 inches or larger) with LYRICS PRINTED in LARGE CLEAR TEXT (minimum 1-inch letters readable from classroom distance), COLORFUL ILLUSTRATIONS for each song (matching the song theme - birds for birdsong, vehicles for transportation song, family figures for family songs), optional MUSICAL NOTATION (staff lines with notes, showing melody for those who can read music). Child SINGING together in a GROUP setting, with TEACHER LEADING or GUIDING the group. Songs typically include: SIMPLE CHILDREN\'S SONGS with familiar melodies (Twinkle Twinkle Little Star - 5-note melody, Row Row Row Your Boat - simple progression, Old MacDonald Had a Farm - repeated phrases with animal sounds), SEASONAL SONGS (Jingle Bells for winter, Mary Had a Little Lamb for spring), CULTURAL and FOLK SONGS from various traditions. Child LEARNING to MATCH PITCH (sing on correct note), FOLLOW RHYTHM (keep steady beat), and CONTROL breathing and VOLUME (singing loudly and softly). Activities include: UNISON SINGING (entire group singing same melody together), ECHO SINGING (teacher sings phrase, child group echoes exactly), CANON or ROUND (different groups sing same song offset by one phrase - creates harmonic texture). Optional GUITAR or PIANO ACCOMPANIMENT supports melody. Teacher provides PITCH REFERENCE for child to match. From 1-2 meters: group of children singing with song cards visible, faces animated with engagement, song lyrics readable. NOT performance or recital (singing for PARTICIPATION and JOY, not perfect execution or evaluation). NOT music notation instruction (singing is prioritized, notation is supplementary if provided).',
    key_materials: ['Song cards with lyrics (large text)', 'Colorful illustrations for songs', 'Optional: musical notation', 'Optional: guitar or keyboard for accompaniment', 'Music teacher or knowledgeable leader'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_rhythm',
    name: 'Rhythm Instruments',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'PERCUSSION INSTRUMENT EXPLORATION and RHYTHM-MAKING with accessible PERCUSSION INSTRUMENTS. Materials include diverse RHYTHM INSTRUMENTS: TAMBOURINE (metal frame with jingling metal discs, creates shimmering sound when shaken or struck), TRIANGLE (metal rod bent into triangle shape, ringing bell-like tone when struck with metal striker, very distinctive sound), WOODBLOCK (wooden percussion instrument, hollow inside, creates sharp wooden tone when struck with mallet or stick), MARACAS (handles with interior beads, shaking creates rhythmic rattling sound), DRUMS (hand-struck, various sizes, tones range from deep bass to high pitch), BELLS (different pitches, ringing tones, create melodic possibilities), CYMBALS (two metal plates, crashing when struck together), RHYTHM STICKS (wooden sticks striking each other creating clicking/clacking sound). Child EXPLORING each instrument, DISCOVERING its distinctive SOUND through free play, EXPERIMENTING with different striking techniques (gentle tap vs hard strike, shaking vs striking), and LISTENING to the unique tone quality. Activities include: FREE EXPLORATION (making different sounds with each instrument, experimenting), PATTERN CREATION (repeating rhythm patterns: fast-fast-slow or boom-boom-tap), FOLLOWING SONGS (keeping beat or playing rhythm to recorded music or singing), ENSEMBLE PLAYING (group of children each with different instrument creating coordinated rhythm). Optional: PLAYING ALONG with recorded instrumental music (child plays rhythm while music plays, developing synchronization), CREATING rhythmic compositions (child creates pattern and performs it), UNDERSTANDING beat vs rhythm concepts (steady beat = steady pulse, rhythm = varying pattern on top of beat). Child DEVELOPING EAR, discovering that SOUND QUALITY varies greatly between instruments, and learning rhythm through kinesthetic experience. From 1-2 meters: collection of colorful percussion instruments (some metal shining, some wooden natural color, maracas colorful), children playing and producing sounds. NOT music notation reading (focus on EAR and PARTICIPATION, not reading notation). NOT structured rhythm instruction (exploration first, then patterns).',
    key_materials: ['Percussion instruments (8-12 types)', 'Instrument storage box', 'Mallets and strikers', 'Optional: recorded music for playing along', 'Optional: rhythm pattern cards showing visual patterns'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_movement',
    name: 'Movement to Music',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'FREE MOVEMENT AND DANCE ACTIVITY to RECORDED MUSIC in an OPEN SPACE. Setup includes: LARGE OPEN MOVEMENT SPACE (gymnasium 30×40 feet, or large classroom with furniture moved aside, minimum 20×20 feet), MUSIC PLAYER with quality SPEAKERS, and VARIETY OF MUSIC RECORDINGS (instrumental music, songs with vocals, cultural/world music, classical, contemporary). Child MOVING FREELY to music: JUMPING (both feet leaving ground), SPINNING (turning in circles, developing balance and spatial awareness), SWAYING (side-to-side rocking motion), RUNNING (in open space, avoiding others), DANCING (moving with rhythm and expression), using FULL BODY EXPRESSION with arms, legs, torso all engaged. Activities include: FREE MOVEMENT (child moves however inspired by music, no prescribed steps or directions), GUIDED IMAGERY (teacher describes scene and child moves to match imagery - "You are a butterfly flying through flowers" - child makes flying motions, "Now moving slowly through a heavy snowstorm" - movements become slow and careful), EMOTION DANCING (moving to show feelings - happy jumping, sad slow swaying, angry strong movements, peaceful gentle swaying), CULTURAL DANCES (learning simple traditional movements - folk dances, cultural dances from around world). Optional: SCARVES or RIBBONS as props (child holds scarves while moving, creating visual patterns and extending movement reach), LIGHTS or PROJECTIONS for atmosphere (creates theater-like experience). Child DEVELOPING body awareness (understanding where body is in space), COORDINATION (moving different body parts in coordination), and EXPRESSION (using movement to express feelings and ideas). From 1-2 meters: child moving freely in open space, body engaged, facial expressions showing engagement and joy. NOT structured dance class (no choreography instruction, no learning specific steps - free creative movement). NOT choreography (child-directed movement, not following predetermined sequence).',
    key_materials: ['Open movement space', 'Music player with speakers', 'Recorded music (variety)', 'Optional: scarves, ribbons, props', 'Optional: lighting effects, projections'],
    confusion_pairs: [],
    difficulty: 'easy'
  },

  {
    work_key: 'cu_bells',
    name: 'Montessori Bells',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'PITCH DISCRIMINATION and MUSICAL TRAINING using MONTESSORI BELLS (a complete SET of 8-13 TUNED BELLS mounted on wooden frame or stand). SET includes: WOODEN STAND or FRAME holding bells, each BELL MOUNTED securely on individual wooden resonator (hollow wooden box amplifying bell sound), WOODEN MALLETS for striking bells (soft-headed to create pure tone without harshness), BELLS TUNED to MUSICAL NOTES typically C major scale (C-D-E-F-G-A-B-C matching piano keys). Bells are typically COLOR-CODED for visual reference: RED BELLS for WHITE PIANO KEYS (C-D-E-F-G-A-B-C natural notes), BLUE BELLS for BLACK PIANO KEYS (sharps and flats - optional for advanced). Child STRIKING bells with WOODEN MALLETS one at a time, LISTENING to pitches, MATCHING IDENTICAL SOUNDS (two bells at different positions but same pitch), and PLAYING simple MELODIES. Activities include: MATCHING PAIRS (striking same note twice but randomly choosing bells each time, trying to match the sound and find the "pair"), PITCH GRADING (arranging bells from LOWEST note (deep C) to HIGHEST note (C an octave higher), understanding pitch progression), SIMPLE MELODIES (playing familiar tunes: Twinkle Twinkle Little Star - only 5 notes, Mary Had a Little Lamb, other simple songs). Child DEVELOPING EAR (learning to recognize pitch differences), understanding PITCH and MELODY (how individual notes combine to create music), and building MUSICAL MEMORY (remembering which bell is which note). Bells create PURE TONES easily recognized and matched. From 1-2 meters: colorful bells on wooden stand (reds and possibly blues), wooden mallets visible, child striking bells. NOT complex music theory (focuses on LISTENING and MATCHING, not reading notation or understanding harmony). Bells make learning music accessible because sounds are PURE and EASY TO MATCH without need for finger dexterity or reading ability.',
    key_materials: ['Montessori bells (8-13 bells)', 'Wooden stand or frame', 'Wooden mallets', 'Color coding (red, blue)', 'Storage tray for bells'],
    confusion_pairs: [],
    difficulty: 'medium'
  },

  {
    work_key: 'cu_music_appreciation',
    name: 'Music Appreciation',
    area_key: 'cultural',
    category: 'Music',
    visual_description:
      'LISTENING TO AND STUDYING CLASSICAL MUSIC, COMPOSERS, and MUSICAL FORMS developing aesthetic appreciation. Materials include: RECORDED CLASSICAL MUSIC (high-quality recordings of orchestral pieces, symphonies, concertos by famous composers), COMPOSER BIOGRAPHY CARDS (3×5 cards with composer portrait, birth/death dates, nationality, compositions, and interesting biographical details), LISTENING GUIDE (questions and worksheet prompts for reflection during or after listening), INSTRUMENT IDENTIFICATION CARDS (showing orchestra instruments with names and sounds). Child LISTENING to ORCHESTRAL MUSIC, SYMPHONIES, or CONCERTOS, IDENTIFYING INSTRUMENTS (recognizing violin (high strings, soaring melodies), piano (versatile, playing both melody and harmony), flute (high woodwind, bird-like), drums (rhythm and power), trumpet (bright brass)), FOLLOWING MELODIES (remembering main tune, noticing when melody repeats or changes), and DISCUSSING emotional responses ("This music sounds happy/sad/exciting"). Activities include: COMPOSER STUDY (learning biography of Bach - structured polyphonic music, Mozart - prolific genius, Beethoven - revolutionary, passionate, Chopin - lyrical piano master), IDENTIFYING INSTRUMENTS (playing short excerpt, child identifying which instruments heard), MOVEMENT to MUSIC (interpreting music through movement or dance), FOLLOWING MUSICAL FORM (recognizing when A section returns, noticing B section as contrasting middle, understanding ABA form). Optional: ATTENDING LIVE CONCERT or PERFORMANCE (hearing orchestra in person, visually seeing instruments being played, experiencing live music). Child DEVELOPING MUSICAL TASTE, learning composers and their stories, and UNDERSTANDING that music communicates emotions and ideas. From 1-2 meters: child listening to recorded music, composer cards visible, discussion happening. NOT music theory instruction (appreciation and LISTENING prioritized, not notation reading or technical analysis). NOT performance (listening and responding, not performing).',
    key_materials: ['Recorded classical music (high quality)', 'Composer biography cards', 'Listening guide worksheets', 'Instrument identification cards', 'Music player with good speakers', 'Optional: program guide for live concerts'],
    confusion_pairs: [],
    difficulty: 'medium'
  }
];
