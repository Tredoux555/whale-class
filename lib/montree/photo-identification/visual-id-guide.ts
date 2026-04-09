// lib/montree/photo-identification/visual-id-guide.ts
//
// The Visual Identification Guide used in Pass 2 of the photo identification
// pipeline. Extracted from app/api/montree/guru/photo-insight/route.ts so it
// can be shared between:
//   - the legacy capture-time photo-insight route
//   - the new background photo-identification pipeline (lib/montree/photo-identification/two-pass.ts)
//
// IMPORTANT: This guide has been carefully tuned over many sessions to disambiguate
// confusion pairs (e.g. Color Box vs Fabric Matching, Sandpaper Letters vs Grammar
// Boxes). Edits should be made HERE only — there should never be a duplicate copy
// of the guide elsewhere in the codebase.
//
// The constant intentionally starts with the "VISUAL IDENTIFICATION GUIDE" header
// so that callers (such as the legacy route's Pass 2 prompt assembly which does
// `systemPrompt.slice(systemPrompt.indexOf('VISUAL IDENTIFICATION GUIDE'))`)
// continue to work without modification.

export const VISUAL_ID_GUIDE = `VISUAL IDENTIFICATION GUIDE — Identify by the PRIMARY TOOL/MATERIAL visible:

=== PRACTICAL LIFE ===

TRANSFER ACTIVITIES (identify by the TRANSFER TOOL — the tool determines the work name):
- Eye dropper/pipette transferring liquid → "Eye Dropper" (NOT Sponging, NOT Basting)
- Spoon transferring between bowls → "Spooning"
- Tongs/tweezers (large, spring-loaded) → "Tonging"
- Tweezers (small, fine-point) → "Tweezers Transfer"
- Chopsticks transferring items → "Chopsticks Transfer"
- Hands scooping dry materials between bowls → "Dry Transfer-Hands"
- Sponge squeezing water between bowls → "Sponging"
- Turkey baster/baster → "Basting"
- Pouring beans/rice/dry items → "Pouring Dry Materials"
- Pouring water/liquid between containers → "Pouring Water"

PRELIMINARY EXERCISES:
- Child carrying/rolling/unrolling a work mat → "Carrying a Mat"
- Walking along a line (tape/painted on floor) → "Walking on the Line"
- Carrying a small chair → "Carrying a Chair"
- Sitting down/standing up from chair slowly → "Sitting and Standing"
- Opening/closing jars, bottles, boxes → "Opening & Closing Containers"
- Folding fabric/cloth/napkins → "Folding Cloths"
- Cutting with scissors (paper strips/lines) → "Using Scissors"

CARE OF SELF (Dressing Frames — wooden frames with fabric closures):
- Frame with large buttons → "Dressing Frame - Buttons"
- Frame with zipper → "Dressing Frame - Zipping"
- Frame with bow ties/ribbons → "Dressing Frame - Bows"
- Frame with buckles → "Dressing Frame - Buckles"
- Frame with lacing holes/string → "Dressing Frame - Lacing"
- Frame with snaps/press studs → "Dressing Frame - Snaps"
- Frame with safety pins → "Dressing Frame - Safety Pins"
- Frame with velcro strips → "Dressing Frame - Velcro"
- Frame with hook and eye closures → "Dressing Frame - Hook & Eye"
- Child washing hands at basin → "Hand Washing"
- Polishing shoes with brush/cloth → "Shoe Polishing"
- Brushing/braiding hair on doll/mannequin → "Hair Brushing & Braiding"

CARE OF ENVIRONMENT:
- Sweeping floor with child-sized broom → "Sweeping"
- Dusting with cloth or duster → "Dusting"
- Scrubbing table with brush, soap, water → "Table Scrubbing" (wet table, brush, suds)
- Washing windows/mirrors with spray/squeegee → "Window Washing" or "Mirror Polishing"
- Polishing metal objects with polish/cloth → "Metal Polishing"
- Washing cloth/fabric in basin → "Cloth Washing"
- Arranging flowers in vase with scissors → "Flower Arranging"
- Watering plants with small watering can → "Plant Care"
- Washing dishes in basin with sponge → "Dish Washing"

FOOD PREPARATION:
- Peeling fruit/vegetables → "Peeling"
- Cutting banana/soft food with knife → "Cutting"
- Spreading butter/jam on bread → "Spreading"
- Squeezing oranges/citrus on juicer → "Squeezing"
- Grating cheese/soap on grater → "Grating"
- Rolling dough with rolling pin → "Rolling and Kneading Dough"

⚠️ PRACTICAL LIFE CONFUSION PAIRS:
- Table with suds + brush = "Table Scrubbing" NOT "Dish Washing" (dishes visible = Dish Washing)
- Eye Dropper = pipette with bulb tip. Baster = large turkey baster. DIFFERENT works.
- Dressing frames all look similar — identify by the CLOSURE TYPE on the fabric

=== SENSORIAL ===

VISUAL — DIMENSION (graduated materials, usually natural wood or painted):
- 10 pink graduated CUBES (1cm³→10cm³), stacked as tower → "Pink Tower"
- 10 brown graduated PRISMS (same length, varying width) → "Brown Stair" (aka "Broad Stair")
- 10 red graduated RODS (10cm→1m, all red) → "Red Rods" (NOT Number Rods — no blue sections)
- Wooden block with 10 cylinders with KNOBS (child uses 3-finger grip) → "Cylinder Block 1/2/3/4"
  → Block 1: diameter varies only. Block 2: height varies only. Block 3: both vary same direction. Block 4: both vary opposite.
  → Multiple blocks mixed together → "Cylinder Blocks Combined"
- Colored cylinders WITHOUT knobs (yellow/red/green/blue boxes) → "Knobless Cylinders"

VISUAL — COLOR (Color Tablets are small WOODEN or PLASTIC rectangles with painted colors — NOT fabric):
- Small box with 6 color tablets (3 pairs: red, yellow, blue) → "Color Box 1 (Primary Colors)"
- Medium box with 22 color tablets (11 pairs of different colors) → "Color Box 2 (Secondary Colors)"
- Large box with 63 color tablets (9 colors × 7 graded shades, arranged lightest to darkest) → "Color Box 3 (Color Gradations)"
- If you see colored SQUARES or RECTANGLES being matched/paired by COLOR on a mat → this is a "Color Box" (NOT Fabric Matching)

VISUAL — FORM (geometric shapes):
- Cabinet with multiple PULL-OUT DRAWERS containing flat geometric shape insets (circles, triangles, rectangles etc. in a WIDE cabinet) → "Geometric Cabinet" (NOT Metal Insets — Metal Insets are SQUARE FRAMES held in a VERTICAL RACK, not drawers)
- 10 blue 3D wooden shapes (sphere, cube, cone, cylinder, pyramid, etc.) → "Geometric Solids"
- Colored triangles being assembled into shapes → "Constructive Triangles" (specify box if visible:
  → Rectangular Box, Triangular Box, Large Hexagonal, Small Hexagonal, Blue Triangles)
- Red/blue/black cube puzzle (8 pieces, pattern on lid) → "Binomial Cube"
- Larger cube puzzle (27 pieces, more complex pattern) → "Trinomial Cube"

TACTILE/BARIC/THERMIC:
- Boards with rough/smooth sandpaper sections → "Touch Boards"
- Small tablets with varying sandpaper grades in box → "Touch Tablets (Rough and Smooth)"
- FABRIC swatches (soft, foldable CLOTH pieces — NOT rigid colored squares) in box, matched by TEXTURE with eyes closed → "Fabric Matching" (child feels texture, NOT looking at color)
- Three sets of wooden tablets of different weights → "Baric Tablets"
- Tablets of different materials (metal, wood, cork, felt) → "Thermic Tablets"
- Metal bottles being compared → "Thermic Bottles"

AUDITORY/OLFACTORY/GUSTATORY:
- 2 sets of 6 wooden cylinders (red/blue lids) being shaken → "Sound Boxes (Sound Cylinders)"
- Metal bells on stands with mallet → "Montessori Bells"
- Bottles being smelled → "Smelling Bottles"
- Bottles/cups being tasted with dropper → "Tasting Bottles/Cups"

STEREOGNOSTIC:
- Cloth bag, child reaching in blindfolded → "Mystery Bag"
- Blindfolded child sorting objects into containers → "Sorting Objects Stereognostically"

⚠️ SENSORIAL CONFUSION PAIRS:
- COLOR BOX / COLOR TABLETS (rigid WOODEN/PLASTIC painted squares matched by COLOR — child LOOKS at colors) vs FABRIC MATCHING (soft CLOTH/FABRIC swatches matched by TEXTURE — child FEELS with eyes closed). If pieces are rigid colored squares → COLOR BOX. If pieces are soft foldable fabric → FABRIC MATCHING. This is the #1 most confused pair.
- RED RODS (all red, Sensorial) vs NUMBER RODS (red AND blue alternating, Mathematics) — check for blue sections!
- CYLINDER BLOCKS (knobbed, in wooden block) vs KNOBLESS CYLINDERS (no knobs, colored, free-standing)
- BINOMIAL CUBE (smaller, 8 pieces) vs TRINOMIAL CUBE (larger, 27 pieces)
- PINK TOWER (cubes) vs BROWN STAIR (prisms/rectangular) vs RED RODS (long thin rods)
- SOUND BOXES (shaking cylinders) vs SMELLING BOTTLES (sniffing bottles)
- TOUCH BOARDS (flat boards) vs TOUCH TABLETS (small paired tablets in box)

=== MATHEMATICS ===

NUMBERS 1-10:
- Red AND blue alternating rods (10cm→1m) → "Number Rods" (NOT Red Rods — has blue sections)
- Sandpaper numerals 0-9 on green/wood boards → "Sandpaper Numbers"
- Wooden box with 45 spindles in compartments 0-9 → "Spindle Box"
- Number cards + loose counters (usually red dots) arranged in rows → "Cards and Counters"

DECIMAL SYSTEM (Golden Bead Material):
- Single golden beads (units) → "Golden Bead Material"
- Bar of 10 beads (tens) → "Golden Bead Material"
- Square of 100 beads (hundreds) → "Golden Bead Material"
- Cube of 1000 beads (thousands) → "Golden Bead Material"
- Large wooden number cards (1-9000, color-coded green/blue/red) → "Large Number Cards"
- Golden beads + number cards together on mat → "Formation of Numbers"
- Golden beads being combined/separated for operations → "Addition/Subtraction/Multiplication/Division with Golden Beads"

TEENS AND TENS:
- Wooden board with slots, cards 10-19, placing bead bars → "Seguin Board A (Teens)"
- Wooden board with slots, cards 10-90, placing bead bars → "Seguin Board B (Tens)"
- Short colored bead stair (1-9 beads, each color) → "Short Bead Stair"
- Wooden board with numbers 1-100 + number tiles → "Hundred Board"

LINEAR COUNTING (BEAD CHAINS):
MONTESSORI BEAD COLOR CODE — use this to identify the SPECIFIC chain number:
  1=red, 2=green, 3=pink/light pink, 4=yellow, 5=light blue/turquoise, 6=purple/violet, 7=white, 8=brown, 9=dark blue/navy, 10=gold
- Short bead chain = SQUARED chain (n×n beads). Identify the bead color → number → "Short Bead Chain of N"
  Example: light blue beads (5) in a short chain with arrows at 5,10,15,20,25 → "Short Bead Chain of 5"
- Long bead chain = CUBED chain (n×n×n beads, very long). Identify the bead color → number → "Long Bead Chain of N"
  Example: green beads (2) in a long chain with arrows at 2,4,6,8 → "Long Bead Chain of 2"
- The HUNDRED CHAIN is specifically 10 gold ten-bars (100 beads) = "Hundred Chain"
- The THOUSAND CHAIN is specifically 100 gold ten-bars (1000 beads) = "Thousand Chain"
- Arrow-shaped paper labels placed at skip-counting intervals confirm bead chain work
- ALWAYS specify the number when you can identify the bead color: "Short Bead Chain of 5", NOT just "Short Bead Chains (Squared)"

MEMORIZATION — OPERATION BOARDS:
- Red/blue strip board with number strips for addition → "Addition Strip Board"
- Strip board with number strips for subtraction → "Subtraction Strip Board"
- Board with bead/disc moved along grid (100 holes) → "Multiplication Board"
- Board with skittles + beads for division → "Division Board"
- Small boards with finger charts → "Addition/Subtraction/Multiplication/Division Finger Charts"

PASSAGE TO ABSTRACTION:
- Small tiles with numbers + colored dots → "Stamp Game"
- Paper with dots in color-coded columns → "Dot Game"
- Small wooden frame with 4 rows of sliding beads → "Small Bead Frame"
- Large wooden frame with 7 rows of sliding beads → "Large Bead Frame"

FRACTIONS:
- Red metal circle cut into fraction pieces (½, ⅓, ¼, etc.) in green frame → "Fraction Circles"
- Colored skittles (fraction visualization) → "Fraction Skittles"

⚠️ MATHEMATICS CONFUSION PAIRS:
- NUMBER RODS (red+blue, Math) vs RED RODS (all red, Sensorial)
- GOLDEN BEADS (gold colored) vs SHORT BEAD STAIR (colored 1-9)
- STAMP GAME (small tiles) vs LARGE NUMBER CARDS (big wooden cards)
- SMALL BEAD FRAME (4 wires) vs LARGE BEAD FRAME (7 wires)
- ADDITION STRIP BOARD vs SUBTRACTION STRIP BOARD (same board, different strips — check operation context)
- HUNDRED BOARD (1-100 grid) vs MULTIPLICATION BOARD (bead on grid)
- SHORT BEAD CHAIN (squared, shorter) vs LONG BEAD CHAIN (cubed, very long) — check chain length relative to mat
- HUNDRED CHAIN (gold, 100 beads) vs SHORT BEAD CHAIN OF 10 (also gold, also 100 beads) — these are the same work
- BEAD CHAINS: always identify the bead COLOR to determine the NUMBER (see color code above)

=== LANGUAGE ===

ORAL LANGUAGE:
- Picture cards sorted by category (animals, vehicles, food) → "Classified Cards (Nomenclature Cards)"
- Miniature objects matched to picture cards → "Object to Picture Matching"
- Small objects in basket + child pointing/naming sounds → "Sound Games (I Spy)"
- Rhyming picture card pairs → "Rhyming Activities"

WRITING PREPARATION:
- Square FRAMES (pink, red, or metal) each with ONE removable geometric shape inset + small knob, stored in a VERTICAL RACK or stand (may include colored pencils + traced designs nearby) → "Metal Insets" (NOT Geometric Cabinet — Geometric Cabinet has DRAWERS in a WIDE cabinet with multiple shapes per drawer)
- Individual LETTERS on pink (vowel) or blue (consonant) boards stored in a wooden box, child tracing the rough/textured letter surface with fingertips → "Sandpaper Letters" (NOT Grammar Boxes — Grammar Boxes contain WORD CARDS and SENTENCE STRIPS, not individual letters)
- Tray of colored sand, child writing with finger → "Sand Tray Writing"
- Child writing on chalkboard/whiteboard → "Chalkboard Writing"
- Box of loose letters (blue consonants, red vowels) spelling words → "Moveable Alphabet"
- Child writing on lined paper → "Handwriting on Paper"

READING:
- PINK miniature objects + CVC word labels → "Pink Object Box"
- Pink picture cards + 3-letter word cards → "Pink Series (CVC Words)"
- BLUE miniature objects + blend word labels → "Blue Object Box"
- Blue picture cards + blend word cards → "Blue Series (Blends)"
- Sandpaper letter combinations (sh, ch, th, ai, ee) → "Phonogram Introduction"
- GREEN miniature objects + phonogram word labels → "Green Object Box"
- Green picture/word cards with phonograms → "Green Series (Phonograms)"
- High-frequency word cards (the, said, was) → "Puzzle Words (Sight Words)"
- Child reading card and performing action → "Command Cards (Action Reading)"

GRAMMAR (identify by GRAMMAR SYMBOL if visible):
- Black triangle symbol + objects/labels → "Introduction to the Noun"
- Small light blue triangle → "Introduction to the Article"
- Medium dark blue triangle + describing game → "Introduction to the Adjective"
- Large red circle symbol + action cards → "Introduction to the Verb"
- Small orange circle → "Introduction to the Adverb"
- Colored compartment BOXES with WORD CARDS and SENTENCE STRIPS inside (NOT individual letters on boards) → "Grammar Boxes" (specify number if visible)
- Sentence analysis charts with arrows → "Sentence Analysis"

⚠️ LANGUAGE CONFUSION PAIRS:
- PINK Object Box (CVC objects) vs BLUE Object Box (blends) vs GREEN Object Box (phonograms) — identify by COLOR of labels/box
- SANDPAPER LETTERS (individual letters) vs PHONOGRAM INTRODUCTION (letter pairs like sh, ch, th)
- MOVEABLE ALPHABET (loose letters building words) vs SANDPAPER LETTERS (tracing on boards)
- CLASSIFIED CARDS (vocabulary, oral) vs PINK/BLUE/GREEN SERIES (reading, phonetic progression)
- METAL INSETS (geometric frames for pencil control) vs GEOMETRIC CABINET (Sensorial shape matching)
- SANDPAPER LETTERS (individual raised LETTERS on pink/blue BOARDS in a wooden box — child TRACES letters) vs GRAMMAR BOXES (colored compartment BOXES with WORD CARDS and SENTENCE STRIPS — grammar analysis, NOT letter tracing). If you see individual letters on colored boards → it is ALWAYS Sandpaper Letters, NEVER Grammar Boxes.

=== CULTURAL ===

GEOGRAPHY:
- Globe with rough (land) and smooth (water) surfaces → "Globe - Land and Water" (Sandpaper Globe)
- Globe with colored continents → "Globe - Continents"
- Large wooden puzzle map showing continents → "Puzzle Map - World"
- Puzzle map of a single continent with countries → "Puzzle Maps - Individual Continents"
- Miniature flags on stands → "Flags of the World"
- Trays with clay/water showing island/lake/peninsula/gulf → "Land and Water Forms"
- Solar system model or planet cards → "Solar System"

HISTORY AND TIME:
- Calendar activities, day/month cards → "Calendar Work"
- Walking around sun candle with globe → "Birthday Celebration"
- Learning clock / toy clock → "Clock Work"
- Long scroll showing eras of life → "Timeline of Life"

BOTANY (wooden inset puzzles — similar to Geometric Cabinet but showing plant parts):
- Wooden puzzle of whole plant (root, stem, leaf, flower) → "Parts of a Plant"
- Wooden puzzle of flower anatomy → "Parts of a Flower"
- Wooden puzzle of leaf with labeled parts → "Parts of a Leaf"
- Wooden puzzle of root system → "Parts of a Root"
- Wooden puzzle of seed cross-section → "Parts of a Seed"
- Life cycle cards/materials for plants → "Plant Life Cycle"
- Sorting cards living vs non-living → "Living vs Non-Living"

ZOOLOGY (wooden inset puzzles of animals):
- Wooden puzzle of fish anatomy → "Parts of a Fish"
- Wooden puzzle of frog anatomy → "Parts of a Frog"
- Wooden puzzle of turtle anatomy → "Parts of a Turtle"
- Wooden puzzle of bird anatomy → "Parts of a Bird"
- Wooden puzzle of horse anatomy → "Parts of a Horse"
- Animal sorting cards by vertebrate class → "Five Classes of Vertebrates"
- Animal figurines matched to continent mats → "Animals of the Continents"
- Life cycle cards (butterfly, frog, chicken) → "Animal Life Cycles"

SCIENCE:
- Basin of water + objects testing buoyancy → "Sink and Float"
- Magnet + various objects testing attraction → "Magnetic/Non-Magnetic"
- Ice/water experiments → "States of Matter"
- Mixing paint colors → "Color Mixing"

ART & MUSIC:
- Easel/paper + paints/brushes → "Painting"
- Drawing with pencils/crayons → "Drawing"
- Cutting/gluing paper collage → "Collage"
- Clay/playdough + tools → "Clay and Playdough"
- Rhythm instruments (shakers, drums, sticks) → "Rhythm Instruments"

⚠️ CULTURAL CONFUSION PAIRS:
- SANDPAPER GLOBE (rough/smooth, no colors) vs COLORED GLOBE (painted continents)
- PUZZLE MAP WORLD (all continents) vs INDIVIDUAL CONTINENT MAP (one continent with countries)
- BOTANY PUZZLES (plant parts) vs ZOOLOGY PUZZLES (animal parts) — look at the SUBJECT of the puzzle
- LAND AND WATER FORMS (clay trays with water) vs "Sink and Float" (objects in water basin)

CONFIDENCE CALIBRATION (CRITICAL — your confidence score has real consequences):
- 0.85+ : ONLY use when the material is unmistakable and you are CERTAIN of the exact work name
  → The system will AUTOMATICALLY update the child's progress record (no teacher review)
  → False positives at this level corrupt educational records — be conservative
- 0.75-0.84 : Likely match but some ambiguity (partially visible materials, angle obscures key features)
  → Teacher will be asked to confirm before any update happens
- 0.5-0.74 : Best guess based on limited visual evidence — requires teacher confirmation
- Below 0.5 : Cannot reliably identify — describe what you see, no matching attempted
IMPORTANT: When in doubt, round DOWN your confidence. It is always better to ask the teacher
to confirm (0.75-0.84) than to auto-update incorrectly (0.85+).
`;
