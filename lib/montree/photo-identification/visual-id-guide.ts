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
// 🚨 Session 113 V2 photo AI quality audit Q-7 — STRUCTURE: confusion pairs FIRST.
// The audit found that the most-confused pairs (Sandpaper Letters ↔ Blue Series,
// Color Box ↔ Fabric Matching, Red Rods ↔ Number Rods) carry the highest signal
// per token but were BURIED at the end of each per-area section. Haiku attention
// drops sharply across long prompts; the highest-value content was getting the
// lowest attention. The guide now LEADS with a consolidated "MOST COMMON
// CONFUSIONS" block before the per-area listings.
//
// The constant intentionally starts with the "VISUAL IDENTIFICATION GUIDE" header
// so that callers (such as the legacy route's Pass 2 prompt assembly which does
// `systemPrompt.slice(systemPrompt.indexOf('VISUAL IDENTIFICATION GUIDE'))`)
// continue to work without modification.

export const VISUAL_ID_GUIDE = `VISUAL IDENTIFICATION GUIDE — Identify by the PRIMARY TOOL/MATERIAL visible.

🚨🚨🚨 MOST COMMON CONFUSIONS — CHECK THESE FIRST BEFORE ANYTHING ELSE 🚨🚨🚨

Before matching any photo, scan this list. These are the pairs that look similar but are DIFFERENT works. Every one of them has caused repeated misclassifications. If the description even partially matches a pair below, read the DISCRIMINATOR carefully and pick the correct side.

SENSORIAL — the #1 confusion zone:
- COLOR BOX vs FABRIC MATCHING. DISCRIMINATOR: rigid WOODEN/PLASTIC painted squares matched by COLOR (child LOOKS) → Color Box. Soft CLOTH/FABRIC swatches matched by TEXTURE (child FEELS with eyes closed) → Fabric Matching. If pieces are rigid colored squares → COLOR BOX. If pieces are soft foldable fabric → FABRIC MATCHING. This is the #1 most confused pair in the entire curriculum.
- RED RODS (Sensorial) vs NUMBER RODS (Mathematics). DISCRIMINATOR: all red → Red Rods. Red AND blue alternating → Number Rods. CHECK FOR BLUE SECTIONS — they determine the area as well as the work.
- CYLINDER BLOCKS vs KNOBLESS CYLINDERS. DISCRIMINATOR: cylinders with knobs in a wooden block → Cylinder Blocks. Cylinders without knobs, free-standing in colored boxes → Knobless Cylinders.
- BINOMIAL CUBE vs TRINOMIAL CUBE. DISCRIMINATOR: 8 pieces → Binomial. 27 pieces → Trinomial.
- PINK TOWER vs BROWN STAIR vs RED RODS. DISCRIMINATOR: cubes → Pink Tower. Prisms/rectangular blocks → Brown Stair. Long thin rods → Red Rods.
- SOUND BOXES vs SMELLING BOTTLES. DISCRIMINATOR: shaking cylinders → Sound Boxes. Sniffing bottles → Smelling Bottles.
- TOUCH BOARDS vs TOUCH TABLETS. DISCRIMINATOR: flat boards → Touch Boards. Small paired tablets in a box → Touch Tablets.

LANGUAGE — second most-confused area:
- SANDPAPER LETTERS vs GRAMMAR BOXES. DISCRIMINATOR: individual raised LETTERS on pink/blue BOARDS stored in a wooden box, child TRACES them → Sandpaper Letters. Colored compartment BOXES with WORD CARDS and SENTENCE STRIPS, grammar analysis → Grammar Boxes. If you see individual letters on colored boards → ALWAYS Sandpaper Letters, NEVER Grammar Boxes.
- SANDPAPER LETTERS vs PHONOGRAM INTRODUCTION. DISCRIMINATOR: individual letters → Sandpaper Letters. Letter PAIRS like sh, ch, th → Phonogram Introduction.
- MOVEABLE ALPHABET vs SANDPAPER LETTERS. DISCRIMINATOR: loose letters building words on a mat → Moveable Alphabet. Tracing letters fixed on boards → Sandpaper Letters.
- PINK / BLUE / GREEN OBJECT BOXES + SERIES. DISCRIMINATOR: identify by the COLOR of the labels/box. Pink = CVC. Blue = blends. Green = phonograms.
- CLASSIFIED CARDS (vocabulary, oral language) vs PINK/BLUE/GREEN SERIES (reading, phonetic progression). DISCRIMINATOR: nomenclature/categorisation cards → Classified. Phonetic progression cards or objects → Series.
- METAL INSETS (Language — writing preparation) vs GEOMETRIC CABINET (Sensorial — shape matching). DISCRIMINATOR: SQUARE FRAMES with one shape each, held in a VERTICAL RACK, often with traced pencil designs → Metal Insets. WIDE cabinet with PULL-OUT DRAWERS containing multiple flat shape insets → Geometric Cabinet.

MATHEMATICS:
- NUMBER RODS (Math, red+blue alternating) vs RED RODS (Sensorial, all red). See sensorial list above.
- GOLDEN BEADS (uniform gold colour) vs SHORT BEAD STAIR (each bar a different colour, 1-9).
- STAMP GAME (small printed tiles) vs LARGE NUMBER CARDS (big wooden cards).
- SMALL BEAD FRAME (4 wires) vs LARGE BEAD FRAME (7 wires) — count the rows.
- ADDITION STRIP BOARD vs SUBTRACTION STRIP BOARD — same board, different strips. Use the operation context (digits visible, ordering) to choose.
- HUNDRED BOARD (1-100 grid with number tiles) vs MULTIPLICATION BOARD (single bead/disc moved along a grid of 100 holes).
- SHORT BEAD CHAIN (squared, shorter — n×n beads) vs LONG BEAD CHAIN (cubed, very long — n×n×n beads). Check chain length relative to mat.
- HUNDRED CHAIN and SHORT BEAD CHAIN OF 10 are the same physical chain (100 gold beads). Use whichever name the classroom prefers.
- BEAD CHAINS — ALWAYS identify the bead COLOR to determine the NUMBER: 1=red, 2=green, 3=pink, 4=yellow, 5=light blue, 6=purple, 7=white, 8=brown, 9=dark blue, 10=gold.

PRACTICAL LIFE:
- TABLE SCRUBBING vs DISH WASHING. DISCRIMINATOR: wet table with suds + brush + no dishes → Table Scrubbing. Dishes visible in basin → Dish Washing.
- EYE DROPPER vs BASTER. DISCRIMINATOR: pipette with bulb tip (small) → Eye Dropper. Large turkey baster → Basting.
- DRESSING FRAMES all look similar — identify ONLY by the CLOSURE TYPE on the fabric (buttons / zipper / bows / buckles / lacing / snaps / safety pins / velcro / hook & eye).

CULTURAL:
- SANDPAPER GLOBE (rough/smooth, no colours) vs COLORED GLOBE (painted continents).
- PUZZLE MAP WORLD (all continents in one map) vs INDIVIDUAL CONTINENT MAP (one continent broken into countries).
- BOTANY PUZZLES (plant parts) vs ZOOLOGY PUZZLES (animal parts). Look at the SUBJECT.
- LAND AND WATER FORMS (clay/water trays of geographical forms) vs SINK AND FLOAT (objects in water basin).

If the description matches none of the above, proceed with full identification using the per-area reference below. The reference is grouped by area for orientation; the confusion pairs above are the highest-value information in this guide and override the per-area listings when they conflict.

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
