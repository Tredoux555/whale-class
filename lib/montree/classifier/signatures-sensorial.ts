/**
 * Sensorial Area - Work Signatures for CLIP Embedding
 * 35 Montessori sensorial works with visual descriptions optimized for photo identification
 *
 * Each signature describes EXACTLY what is visible in a photo from 1-2 meters away.
 * Material-first, action-focused, anti-confusion descriptions for maximum visual distinction.
 */

import type { WorkSignature } from './work-signatures';

export const SENSORIAL_SIGNATURES: WorkSignature[] = [
  // ============================================================================
  // VISUAL SENSE - DIMENSION (Cylinders & Building Blocks)
  // ============================================================================

  {
    work_key: 'se_cylinder_block_1',
    name: 'Cylinder Block 1',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Rectangular wooden block with 10 cylindrical holes arranged in a linear row. Each hole increases in diameter only while maintaining identical depth (approximately 1cm deep). Wooden cylinders with round wooden knobs on top, varying from thin to thick (1cm to 10cm diameter). Child\'s hands inserting cylinders into corresponding holes or lifting cylinders by their knobs. All cylinders same depth. NOT Knobless Cylinders (those have no knobs and vary in height too). Smooth natural wood grain visible on block surface.',
    key_materials: ['rectangular wooden block', 'cylindrical wooden knobs', 'diameter-only variation', '1-10cm progression', 'light wood finish'],
    confusion_pairs: ['se_cylinder_block_2', 'se_knobless_cylinders'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_cylinder_block_2',
    name: 'Cylinder Block 2',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Rectangular wooden block with 10 cylindrical holes in a linear row. Cylinders vary in BOTH diameter AND height simultaneously - they get progressively larger in all dimensions as you move across the block. Each wooden cylinder has a round knob on top. Child matching and fitting each cylinder to its corresponding hole, lifting by knobs. Height variation is visible when cylinders are lined up. Key difference from Block 1: height changes in addition to diameter. Smooth wood, natural or light stain.',
    key_materials: ['rectangular wooden block', 'cylindrical wooden knobs', 'diameter + height variation', 'progressive scaling', 'wooden knobs'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_3', 'se_knobless_cylinders'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_cylinder_block_3',
    name: 'Cylinder Block 3',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Rectangular wooden block with 10 cylindrical holes. The cylinders vary in BOTH diameter and height BUT in INVERTED progression - the largest diameter cylinder sits in the smallest hole, and it\'s also the shortest cylinder. As you move across, cylinders get progressively smaller in diameter and taller in height (reverse of Block 2). Wooden knobs on each cylinder. Child handling the counter-intuitive sizing challenge. Wood grain visible, natural finish. This is the "opposite" pattern from Block 2.',
    key_materials: ['rectangular wooden block', 'inverted cylinder progression', 'tall thin to short thick', 'wooden knobs', 'contrast sizing'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_2', 'se_cylinder_block_4'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_cylinder_block_4',
    name: 'Cylinder Block 4',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Rectangular wooden block with 10 cylindrical holes arranged in a CIRCULAR or 2D GRID PATTERN (not a linear row like Blocks 1-3). Cylinders vary in both height and diameter, creating maximum complexity. Child matching cylinders to holes in non-linear positions, requiring rotation and spatial reasoning. Wooden knobs on cylinders. Most challenging of the four cylinder blocks. Smooth wood, natural stain. The non-linear layout is the key distinguishing feature.',
    key_materials: ['rectangular wooden block', 'circular hole arrangement', 'cylindrical wooden knobs', 'height + diameter variation', 'spatial puzzle layout'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_2', 'se_cylinder_block_3'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_cylinder_blocks_combined',
    name: 'Cylinder Blocks Combined',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'All four cylinder blocks displayed together on a single mat, tray, or classroom shelf. 40+ wooden cylinders with knobs scattered or organized around the four blocks in various size combinations. Block 1, 2, 3, 4 visible side-by-side showing different hole patterns (linear, inverted, circular). Child working through multiple blocks simultaneously, comparing size progressions, or organizing all cylinders by size. Wooden storage tray visible. Extensive collection of knobbed wooden cylinders at various sizes.',
    key_materials: ['4 wooden cylinder blocks', '40+ wooden cylinders with knobs', 'organized tray', 'multiple size progressions', 'wooden storage'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_pink_tower',
    name: 'Pink Tower',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Stack of 10 RIGID WOODEN CUBES painted BRIGHT SATURATED PINK (not magenta, true pink). Each cube is precisely 1cm smaller on all six sides than the one below it. When stacked from largest (10cm cube base) to smallest (1cm cube at top), creates a perfect symmetrical pyramid with visible step-downs on all four corners and sides. Child\'s hands stacking cubes from largest to smallest. Smooth glossy paint finish, vivid pink color visible. Wooden construction clearly visible, not wrapped. Distinctive CUBIC shape (all sides equal length).',
    key_materials: ['painted pink wooden cubes', '10 graduated cubes', 'pyramid stacking', 'glossy paint finish', '1cm-10cm progression'],
    confusion_pairs: ['se_brown_stair'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_brown_stair',
    name: 'Brown Stair',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Stack of 10 RECTANGULAR WOODEN PRISMS painted BROWN or dark wood stain. All 10 are IDENTICAL in HEIGHT (10cm tall), but each has a different square cross-section base, graduating from 1cm×1cm to 10cm×10cm. When stacked properly, creates a STAIR-STEP PROFILE visible on two perpendicular sides, resembling actual stairs that a child can walk fingers up and down. Smooth brown painted surface, wooden grain sometimes visible underneath stain. DISTINCTLY DIFFERENT from Pink Tower (rectangular, not cubic; creates stairs, not pyramid).',
    key_materials: ['painted brown wooden prisms', '10 rectangular blocks', 'stair-step arrangement', 'equal height (10cm)', 'base area variation'],
    confusion_pairs: ['se_pink_tower'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_red_rods',
    name: 'Red Rods',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Set of 10 CYLINDRICAL WOODEN RODS painted BRIGHT RED (pure red, not orange-red). All rods have IDENTICAL diameter (approximately 1cm round), but vary dramatically in length from 10cm shortest rod to 100cm (1 meter) longest rod. Child arranging rods from shortest to longest on floor or table, often placed end-to-end in a row showing dramatic length progression. Smooth red glossy paint. Wooden cylindrical shape consistent across all 10 rods. Length difference is the ONLY variable.',
    key_materials: ['painted red wooden cylinders', 'identical diameter (1cm)', 'length-only variation', '10-100cm range', '10 graduated lengths'],
    confusion_pairs: [],
    difficulty: 'easy',
  },

  {
    work_key: 'se_knobless_cylinders',
    name: 'Knobless Cylinders',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Wooden cylinders WITHOUT KNOBS (plain barrel shape with no handles on top). Smooth surfaces all around. Organized in 4 separate COLOR-CODED WOODEN TRAYS/BOXES: red cylinders in one tray, blue in another, yellow in third, natural wood color in fourth. Each tray contains 10 cylinders varying in BOTH height and diameter independently. Child stacking or sorting cylinders by size within and across trays. Smooth wood finish, no paint except colored trays. Used AFTER cylinder block work for more advanced sensorial experience. Lack of knobs distinguishes from cylinder block cylinders.',
    key_materials: ['wooden cylinders (no knobs)', '4 color-coded trays', 'height + diameter variation independently', 'smooth unfinished wood', 'barrel shape'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_2', 'se_cylinder_block_3', 'se_cylinder_block_4'],
    difficulty: 'hard',
  },

  // ============================================================================
  // VISUAL SENSE - COLOR (Color Boxes)
  // ============================================================================

  {
    work_key: 'se_color_box_1',
    name: 'Color Box 1',
    area_key: 'sensorial',
    category: 'Visual Sense - Color',
    visual_description: 'PRIMARY COLOR MATCHING WORK. Wooden box containing 9 small PAINTED WOODEN SQUARE TABLETS (3 of each color). Three primary colors ONLY: BRIGHT RED, BRIGHT BLUE, BRIGHT YELLOW - identical, saturated hues. Each tablet is identical size and shape (small flat squares, approximately 3cm × 3cm). Child matching pairs by color - lining up red with red, blue with blue, yellow with yellow. Solid paint finish, flat square tablets. No gradations, no secondary colors. SIMPLEST color work for young children starting color discrimination.',
    key_materials: ['painted wooden square tablets', '3 primary colors (red/blue/yellow)', '9 tablets total (3 of each)', 'solid paint finish', 'flat squares'],
    confusion_pairs: ['se_color_box_2', 'se_color_box_3'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_color_box_2',
    name: 'Color Box 2',
    area_key: 'sensorial',
    category: 'Visual Sense - Color',
    visual_description: 'INTERMEDIATE COLOR WORK introducing secondary colors. Wooden box containing painted wooden square tablets showing 6 distinct HUE FAMILIES: red, blue, yellow, green, orange, and purple/violet. Approximately 22 tablets total (unequal quantities per color). Child sorting or sequencing tablets by hue, creating color families. Introduces the secondary colors (green, orange, purple) in addition to primaries. Solid paint finish, flat square shapes similar to Box 1. More complex color discrimination than Box 1 but still solid single shades (no gradations within each hue).',
    key_materials: ['painted wooden square tablets', '6 color hues', 'primary + secondary colors', '22 tablets total', 'flat squares'],
    confusion_pairs: ['se_color_box_1', 'se_color_box_3'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_color_box_3',
    name: 'Color Box 3',
    area_key: 'sensorial',
    category: 'Visual Sense - Color',
    visual_description: 'COLOR GRADATION MASTERWORK. Wooden box containing 99 small PAINTED WOODEN SQUARE TABLETS in 11 different COLOR FAMILIES. Each color family has 9 DISTINCT SHADE GRADATIONS from very light pastel to deep saturated tone. Child arranging tablets by lightness and darkness within each color family - very subtle shade discrimination (light pink, medium pink, dark pink, very dark pink, etc. for the pink family). Visual discrimination of tone and saturation. Smooth paint finish. This is the MOST ADVANCED color work requiring refined color perception.',
    key_materials: ['painted wooden square tablets (99)', '11 color families', '9 shade gradations per color', 'light to dark progression', 'subtle tone discrimination'],
    confusion_pairs: ['se_color_box_1', 'se_color_box_2'],
    difficulty: 'hard',
  },

  // ============================================================================
  // VISUAL SENSE - FORM (Geometric Materials)
  // ============================================================================

  {
    work_key: 'se_geometric_cabinet',
    name: 'Geometric Cabinet',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Large WOODEN CABINET (usually with 6 drawers) containing 35+ geometric FLAT METAL INSET SHAPES in WOODEN FRAMES. Each drawer holds frames with shiny metal geometric outlines: circles (various sizes), triangles (equilateral/isosceles/right), squares, rectangles, ellipses, ovals, hexagons, pentagons, trapezoids, and other polygons. Metal insets are raised slightly from the wood frame, creating a border or "frame" effect. Child using pencil to trace around the metal inset outline, creating geometric shape drawings on paper. Flat work, shiny metal contrasts with wood. NOT 3D solids.',
    key_materials: ['wooden cabinet (6 drawers)', 'metal inset frames', '35+ geometric shapes', 'shiny metal outlines', 'wooden frames'],
    confusion_pairs: ['se_geometric_solids'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_geometric_solids',
    name: 'Geometric Solids',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Set of 3D GEOMETRIC WOODEN FORMS (NOT flat metal frames, but SOLID BLOCKS). Forms include: SPHERE (rolling ball shape), CUBE (6 equal square faces), RECTANGULAR PRISM (box shape), TRIANGULAR PRISM (wedge shape), CONE (pointed top), CYLINDER (round tube), OVOID (egg shape), ELLIPSOID (elongated sphere). Each form is approximately 5-10cm size, smooth wooden or painted finish. Child rolling sphere/cylinder, stacking cubes/prisms, exploring 3D properties. Some forms roll, some stack, some are stable. Distinct from geometric cabinet (these are 3D solids, not flat metal frames).',
    key_materials: ['3D wooden geometric forms', 'sphere/cube/cone/cylinder/prism', 'various sizes', 'smooth painted finish', '8+ different shapes'],
    confusion_pairs: ['se_geometric_cabinet'],
    difficulty: 'medium',
  },

  // ============================================================================
  // VISUAL SENSE - FORM (Constructive Triangles)
  // ============================================================================

  {
    work_key: 'se_constructive_triangles_rect',
    name: 'Constructive Triangles - Rectangle Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing RED WOODEN TRIANGLES that fit together to form rectangles and other shapes. Triangles are RIGHT TRIANGLES (one 90-degree angle). Child assembling 2 identical right triangles to form a perfect rectangle, or using 4 triangles to create diamond and complex designs. Flat wooden pieces, painted red color. Color-coded edge lines help with matching (edges must match to form correct shapes). Teaches symmetry and geometric composition. Most basic constructive triangle set.',
    key_materials: ['red wooden triangles', 'right triangle shapes', 'wooden box', 'color-coded edges', 'flat pieces'],
    confusion_pairs: ['se_constructive_triangles_tri', 'se_constructive_triangles_large_hex', 'se_constructive_triangles_small_hex', 'se_constructive_triangles_blue'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_constructive_triangles_tri',
    name: 'Constructive Triangles - Equilateral Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing YELLOW WOODEN TRIANGLES made from EQUILATERAL TRIANGLES (all three angles equal, 60 degrees each, all sides equal length). Child assembling equilateral triangles to form larger diamonds, parallelograms, and complex hexagon patterns. More challenging than rectangle box because pieces don\'t form rectangles - they create different composite shapes. Flat wooden pieces, painted yellow. Color-coded edges for assembly guidance. Creates stunning geometric designs. More complex than Rectangle Box.',
    key_materials: ['yellow wooden triangles', 'equilateral shape (all equal)', 'wooden box', 'color-coded edges', 'complex compositions'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_large_hex', 'se_constructive_triangles_small_hex'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_constructive_triangles_large_hex',
    name: 'Constructive Triangles - Large Hexagon Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing BLUE WOODEN TRIANGLES designed to form a LARGE HEXAGON shape when all pieces are assembled correctly. Many triangular pieces fit together to create the complete hexagon outline. Child building complex composite geometric shapes from smaller triangular components. Larger scale assembly compared to Equilateral Box. Flat wooden pieces, painted blue. Color-coded edges help guide placement. Creates impressive large hexagonal designs. More complex assembly challenge.',
    key_materials: ['blue wooden triangles', 'hexagon-forming pieces', 'wooden box', 'multiple triangular pieces', 'color-coded edges'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_tri', 'se_constructive_triangles_small_hex'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_constructive_triangles_small_hex',
    name: 'Constructive Triangles - Small Hexagon Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing GREEN WOODEN TRIANGLES designed to form a SMALL HEXAGON pattern. Similar to Large Hexagon Box but with smaller, more delicate triangular pieces requiring finer motor control and spatial reasoning. Child assembling intricate geometric designs from many small components. Flat wooden pieces, painted green. Color-coded edge lines guide assembly. Smallest and most complex of the constructive triangle sets. Requires advanced spatial visualization.',
    key_materials: ['green wooden triangles', 'small hexagon assembly', 'fine delicate pieces', 'wooden box', 'color-coded edges'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_tri', 'se_constructive_triangles_large_hex'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_constructive_triangles_blue',
    name: 'Constructive Triangles - Blue Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing BLUE WOODEN TRIANGLES - a mixed set of DIFFERENT TRIANGLE TYPES. Contains both ISOSCELES TRIANGLES (two equal sides) and RIGHT TRIANGLES (one 90-degree angle) in various sizes. Child exploring different triangle types and discovering how various angles combine differently. More exploratory than the other constructive triangle sets. Flat wooden pieces, painted blue. Color-coded edges for matching. Teaches that triangles come in different forms beyond just equilateral or right.',
    key_materials: ['blue wooden triangles', 'mixed triangle types (isosceles/right)', 'varied sizes', 'wooden box', 'color-coded edges'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_tri', 'se_constructive_triangles_large_hex', 'se_constructive_triangles_small_hex'],
    difficulty: 'hard',
  },

  // ============================================================================
  // VISUAL SENSE - FORM (3D Cube Building)
  // ============================================================================

  {
    work_key: 'se_binomial_cube',
    name: 'Binomial Cube',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing a large PAINTED WOODEN CUBE that DISASSEMBLES into 8 SMALLER WOODEN BLOCKS in THREE DISTINCT COLORS: RED BLOCKS, BLUE BLOCKS, and NATURAL WOOD COLOR BLOCKS. When disassembled, each color group consists of 2 smaller cubes (total 8 blocks = 2×2×2 arrangement in space). Child deconstructing the large cube into eight blocks, then reconstructing it back to the original large cube. Wooden storage box. Color-coded pieces. Explores 3D composition and algebra concepts through concrete materials.',
    key_materials: ['painted wooden blocks (8)', 'red/blue/natural wood colors', 'cube construction (2×2×2)', 'wooden storage box', 'disassembles/reassembles'],
    confusion_pairs: ['se_trinomial_cube'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_trinomial_cube',
    name: 'Trinomial Cube',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing a large PAINTED WOODEN CUBE that DISASSEMBLES into 27 SMALLER WOODEN BLOCKS in FOUR DISTINCT COLORS: RED BLOCKS, BLUE BLOCKS, YELLOW BLOCKS, and NATURAL WOOD COLOR BLOCKS. When disassembled, shows a 3×3×3 cubic arrangement (27 = 3 cubed). Much more complex puzzle than Binomial Cube with significantly more pieces. Child reconstructing the large cube from 27 smaller blocks arranged by color pattern. Wooden storage box. Color-coded pieces. Most advanced 3D composition work. Explores cubic algebraic concepts (a+b+c)³.',
    key_materials: ['painted wooden blocks (27)', 'red/blue/yellow/natural colors', 'cube construction (3×3×3)', 'wooden storage box', 'complex assembly puzzle'],
    confusion_pairs: ['se_binomial_cube'],
    difficulty: 'hard',
  },

  // ============================================================================
  // TOUCH SENSE (Texture & Material Discrimination)
  // ============================================================================

  {
    work_key: 'se_touch_boards',
    name: 'Touch Boards',
    area_key: 'sensorial',
    category: 'Touch Sense',
    visual_description: 'Set of 6 WOODEN BOARDS or thick wooden plaques, each approximately 6 inches × 6 inches. Each board has TWO DISTINCT SURFACES: one side is ROUGH (covered with sandpaper or coarse wood grain texture) and the opposite side is SMOOTH (polished, varnished, or silk-like finish). Boards show texture gradation from VERY ROUGH (coarse grit) to VERY SMOOTH (glass-like polish). Child running fingertips across rough and smooth surfaces, feeling the texture contrast. Wooden frame or stand may hold boards upright. Visual AND tactile discrimination work.',
    key_materials: ['wooden boards (6 pairs)', 'sandpaper texture (rough side)', 'polished smooth surface', 'texture gradation', 'visible contrast'],
    confusion_pairs: ['se_touch_tablets'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_touch_tablets',
    name: 'Touch Tablets',
    area_key: 'sensorial',
    category: 'Touch Sense',
    visual_description: 'Set of small WOODEN TABLETS (squares, approximately 3cm × 3cm, similar size to color tablets but with TEXTURE attached to each). Various TEXTURED MATERIALS mounted on tablet surface: rough sandpaper, medium-grit cloth, smooth silk, satin, velvet, burlap, and other tactile variations. 6+ texture gradations represented. Child (often blindfolded) touching tablets with fingertips to discriminate textures, matching pairs of identical textures. Portable tablets stored in wooden box. Visual texture is visible (can see sandpaper, cloth, silk) AND tactile discrimination required.',
    key_materials: ['wooden tablets', 'sandpaper/cloth/silk/velvet surfaces', 'texture gradation', 'mounted materials', 'portable set'],
    confusion_pairs: ['se_touch_boards'],
    difficulty: 'medium',
  },

  // ============================================================================
  // OLFACTORY SENSE (Smell)
  // ============================================================================

  {
    work_key: 'se_smelling_bottles',
    name: 'Smelling Bottles',
    area_key: 'sensorial',
    category: 'Olfactory Sense',
    visual_description: 'Set of small GLASS OR PLASTIC BOTTLES (opaque containers approximately 2 inches tall, often with colored plastic caps - red, blue, yellow, etc.). Each bottle contains COTTON SWABS or absorbent pads SOAKED WITH DIFFERENT SCENTS: lemon, vanilla, rose, mint, orange, coffee, cinnamon, or other aromatics. 6-12 PAIRS of bottles (two bottles with same scent). Bottles SEALED with caps to prevent scent leakage. Child removing caps, sniffing individual bottles, and matching pairs by smell alone (often blindfolded). Opaque bottles prevent visual identification of scent.',
    key_materials: ['glass/plastic bottles (6-12 pairs)', 'colored caps', 'scented cotton swabs', 'sealed containers', 'aromatic solutions'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  // ============================================================================
  // GUSTATORY SENSE (Taste)
  // ============================================================================

  {
    work_key: 'se_tasting_bottles',
    name: 'Tasting Bottles',
    area_key: 'sensorial',
    category: 'Gustatory Sense',
    visual_description: 'Set of small GLASS BOTTLES with COLORED LIDS/CAPS (white, red, blue, yellow caps for organization) containing TASTE SOLUTIONS on cotton swabs or eye droppers. Four to six basic taste categories: SWEET (sugar water or honey), SALTY (salt solution), BITTER (dilute tonic or herbal infusion), SOUR (lemon juice or vinegar), and sometimes BLAND (pure water). 4-6 PAIRS of bottles (two of each taste type). Child carefully placing cotton swab or small drop on tongue to discriminate taste families. Glass bottles, clearly visible solutions inside. Safe diluted concentrations for children.',
    key_materials: ['glass bottles', 'colored caps (white/red/blue/yellow)', 'taste solution swabs', '4-6 taste pairs', 'safe diluted solutions'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  // ============================================================================
  // AUDITORY SENSE (Sound/Hearing)
  // ============================================================================

  {
    work_key: 'se_sound_boxes',
    name: 'Sound Boxes',
    area_key: 'sensorial',
    category: 'Auditory Sense',
    visual_description: 'Set of WOODEN BOXES with FITTED LIDS (usually painted red or natural wood color, approximately 2 inches × 2 inches). Each box contains DIFFERENT MATERIALS inside that CREATE DISTINCTIVE SOUNDS when shaken: grains (rice, lentils), metal objects (bells, beads, screws), pebbles, shells, dried beans, or sand. 6+ PAIRS of boxes (two boxes with same sound). Boxes SEALED with lids to prevent seeing contents. Child shaking boxes and listening to match pairs by sound alone (often blindfolded). Visual inspection impossible - pure auditory discrimination. Sound quality varies from high-pitched tinkling to low-pitched rattling.',
    key_materials: ['wooden boxes with lids (6+ pairs)', 'sealed rattle contents', 'red/natural finish', 'various noise-making materials', 'paired sounds'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_bells',
    name: 'Montessori Bells',
    area_key: 'sensorial',
    category: 'Auditory Sense',
    visual_description: 'Set of 13+ TUNED METAL BELLS (bronze or brass) mounted on WOODEN HANDLES or arranged in a wooden FRAME/STAND. Each bell produces a DIFFERENT MUSICAL PITCH from very low tones to very high tones (typically spanning 2-3 octaves of musical notes). Includes wooden MALLETS for striking bells. Child striking individual bells with mallets to create tones, listening to pitch differences, sometimes arranging bells in order from lowest to highest pitch. Shiny metal bells, organized wooden frame. Pure auditory discrimination of pitch and tone quality.',
    key_materials: ['tuned metal bells (13+)', 'wooden handles or frame', 'wooden mallets', 'pitch variation (low to high)', 'bronze/brass construction'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  // ============================================================================
  // EXPLORATORY SENSORIAL
  // ============================================================================

  {
    work_key: 'se_mystery_bag',
    name: 'Mystery Bag',
    area_key: 'sensorial',
    category: 'Exploratory Sensorial',
    visual_description: 'OPAQUE FABRIC BAG (made of thick fabric, usually red or natural burlap color, approximately 8×8 inches). Bag has CLOSURE AT TOP (drawstring, velcro strip, or elastic band) to keep child from peeking inside. Bag contains VARIOUS OBJECTS OF DIFFERENT SHAPES AND TEXTURES: wooden geometric shapes, beads, cloth scraps, rubber objects, metal items, natural materials (shells, stones, pine cones), and everyday objects. Child reaching hand into bag (often blindfolded for additional sensory isolation) and FEELING OBJECTS BY TOUCH ALONE, identifying shapes and textures without visual input. Pure tactile exploration and spatial reasoning. Bag design prevents visual cheating.',
    key_materials: ['opaque fabric bag', 'various textured objects inside', 'closure mechanism', 'multiple shape variety', 'tactile learning focus'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_sorting_grains',
    name: 'Sorting Grains',
    area_key: 'sensorial',
    category: 'Exploratory Sensorial',
    visual_description: 'MULTIPLE WOODEN BOWLS or containers (4-8 bowls) arranged on a wooden TRAY with MIXED GRAINS combined in center sections or large bowl. 6-8 DIFFERENT GRAIN TYPES: white rice, brown rice, lentils (red and brown), black beans, white beans, millet, pasta shapes, chickpeas, and sometimes seeds. Grains visually distinct - different colors (white, brown, red, black, yellow) and different shapes (round, elongated, flat). Child using SPOON or TWEEZERS to carefully SORT mixed grains into separate bowls by type. Tactile and visual discrimination combined. Develops fine motor control and attention to detail.',
    key_materials: ['wooden bowls (4-8)', 'mixed grains on tray', 'spoon or tweezers', 'wooden tray', 'distinct grain varieties'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  // ============================================================================
  // BARIC SENSE (Weight Discrimination)
  // ============================================================================

  {
    work_key: 'se_baric_tablets',
    name: 'Baric Tablets',
    area_key: 'sensorial',
    category: 'Baric Sense',
    visual_description: 'Set of IDENTICAL-LOOKING WOODEN TABLETS (squares approximately 3-4 cm, painted a solid color, uniform size and shape identical to color box tablets). BUT each tablet has HIDDEN WEIGHTS inside - typically lead weights, sand, or metal pellets sealed inside. 6-9 PAIRS of tablets. When picked up and lifted, tablets feel surprisingly DIFFERENT IN WEIGHT despite identical appearance. Child holding and comparing tablets using only the sense of weight/heaviness (barometric sense). Cannot be identified by visual inspection or texture - requires precise kinesthetic discrimination. Child often arranges tablets from lightest to heaviest.',
    key_materials: ['wooden tablets (identical appearance)', 'hidden internal weights', 'different densities', '6-9 pairs', 'kinesthetic discrimination'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  // ============================================================================
  // THERMIC SENSE (Temperature)
  // ============================================================================

  {
    work_key: 'se_thermic_tablets',
    name: 'Thermic Tablets',
    area_key: 'sensorial',
    category: 'Thermic Sense',
    visual_description: 'WOODEN TABLETS (squares, similar size to color/baric tablets) made from DIFFERENT MATERIALS with DIFFERENT THERMAL CONDUCTIVITY: wood (poor conductor, stays cool), metal inlays (excellent conductor, feels cold), ceramic (moderate conductor), plastic (poor conductor), and sometimes stone or glass. Each tablet has IDENTICAL SIZE and appearance from a distance but feels dramatically different when touched. 6 PAIRS of tablets (same material pairs). Child touching tablets to feel which are cold, which are warm, without visual distinction. Exploits heat transfer properties. Kinesthetic and thermic sensory input combined.',
    key_materials: ['wooden tablets', 'metal/ceramic/plastic inlays', 'different heat conductivity', '6 pairs', 'temperature-based discrimination'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_thermic_bottles',
    name: 'Thermic Bottles',
    area_key: 'sensorial',
    category: 'Thermic Sense',
    visual_description: 'Glass or metal BOTTLES/CONTAINERS (approximately 3-4 inches tall, identical appearance) filled with WATER AT DIFFERENT TEMPERATURES. Some bottles contain ICE-COLD water (near freezing), some ROOM TEMPERATURE water (neutral), some WARM water (heated, approximately 40-45°C / 104-113°F). 3-6 PAIRS of identical-looking bottles. Child holding bottles and feeling the dramatic temperature differences. No color coding - bottles look identical but feel very different. Simple and direct thermic discrimination work. Temperature difference is immediately obvious through touch.',
    key_materials: ['glass/metal bottles (identical)', 'water at different temperatures', 'cold/room/warm water', '3-6 pairs', 'clear temperature gradations'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  // ============================================================================
  // EXPLORATORY & COMBINATORIAL
  // ============================================================================

  {
    work_key: 'se_sorting_objects',
    name: 'Sorting Objects',
    area_key: 'sensorial',
    category: 'Exploratory Sensorial',
    visual_description: 'MIXED COLLECTION OF EVERYDAY OBJECTS on a WOODEN TRAY with COMPARTMENTED SECTIONS or multiple BOWLS. Objects include: BUTTONS (various sizes, colors, materials), BEADS (wooden, glass, plastic), SHELLS (various types and sizes), SEEDS (different seed types), PEBBLES (polished stones), NATURAL ITEMS (moss, leaves, twigs), and FOUND OBJECTS. Child sorting objects into categories using MULTIPLE CLASSIFICATION SCHEMES: by color, by size, by texture, by material (wood vs plastic vs metal), by origin (natural vs human-made), or by function. Open-ended exploratory work developing classification and sensorial discrimination skills. Develops advanced sorting logic.',
    key_materials: ['mixed everyday objects (buttons/beads/shells/seeds)', 'wooden tray', 'compartments/bowls', 'varied materials', 'multiple categories possible'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  {
    work_key: 'se_superimposed_geometric_figures',
    name: 'Superimposed Geometric Figures',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Set of FLAT WOODEN or PAINTED METAL GEOMETRIC SHAPES (circles, squares, triangles, rectangles, hexagons, etc.) in MULTIPLE SIZE VARIATIONS of the SAME SHAPE FAMILY. Each geometric family (e.g., circles) has 5-10 sizes graduating from small to large. Shapes are DESIGNED TO OVERLAY/SUPERIMPOSE - placing one shape on top of another shows the size progression and relationship. Child stacking shapes to visualize size gradation, or overlaying them to see geometric scaling. Shapes are flat (not 3D), painted bright colors or shiny metal. Teaches geometric progressions and nesting concepts.',
    key_materials: ['geometric shapes (wood/metal)', 'progressive size variation', 'flat forms', 'overlayable design', 'multiple shape families'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  {
    work_key: 'se_fabric_matching',
    name: 'Fabric Matching',
    area_key: 'sensorial',
    category: 'Touch Sense',
    visual_description: 'SOFT CLOTH FABRIC SWATCHES mounted on CARDSTOCK or thin wooden backing cards. Different WEAVES, PATTERNS, and TEXTURES represented: SILK (smooth, shiny), COTTON (matte, flexible), WOOL (slightly fuzzy, warm), LINEN (slightly rough, natural), VELVET (plush, soft pile), BURLAP (coarse, rough woven), SATIN (glossy, smooth), and other textiles. 6-12 PAIRS of identical fabric samples (two swatches of each type). Child touching and matching fabrics by feel and visual appearance. DISTINCTLY DIFFERENT from Color Boxes (SOFT CLOTH vs RIGID PAINTED WOOD TABLETS). Emphasizes material texture and fabric characteristics, not color matching.',
    key_materials: ['fabric swatches (silk/cotton/wool/linen/velvet/burlap)', 'mounted on cards', 'different weaves visible', '6-12 pairs', 'soft textile materials'],
    confusion_pairs: ['se_color_box_1', 'se_color_box_2', 'se_color_box_3'],
    difficulty: 'medium',
  },
];

// ============================================================================
// EXPORT SIGNATURE DATABASE
// ============================================================================

export const sensorialSignatureMap = new Map(
  SENSORIAL_SIGNATURES.map((sig) => [sig.work_key, sig])
);
