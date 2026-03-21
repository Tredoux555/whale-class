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
    visual_description: 'Wooden block with 10 cylindrical holes in a row, each hole increasing in diameter only (same depth). Wooden knobbed cylinders sitting in holes or stacked. Child inserting cylinders from left to right by matching hole diameter. NOT Knobless Cylinders (which vary in both height and diameter).',
    key_materials: ['wooden block', 'cylindrical knobs', 'diameter variation', 'wood grain'],
    confusion_pairs: ['se_cylinder_block_2', 'se_knobless_cylinders'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_cylinder_block_2',
    name: 'Cylinder Block 2',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Wooden block with 10 cylindrical holes in a row. Cylinders varying in BOTH diameter AND height (get progressively larger). Wooden knobbed cylinders, child matching by both size dimensions. Contrast to Block 1 where only diameter changes.',
    key_materials: ['wooden block', 'cylindrical knobs', 'height + diameter variation', 'wood'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_3', 'se_knobless_cylinders'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_cylinder_block_3',
    name: 'Cylinder Block 3',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Wooden block with 10 cylindrical holes in a row. Cylinders vary in BOTH diameter and height, but arranged oppositely to Block 2 (largest cylinder smallest hole, progression inverted). Wooden knobbed cylinders. Child matching size to hole.',
    key_materials: ['wooden block', 'cylindrical knobs', 'inverted size progression', 'wood'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_2', 'se_cylinder_block_4'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_cylinder_block_4',
    name: 'Cylinder Block 4',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Wooden block with 10 cylindrical holes arranged in a circle or 2D pattern (not linear row). Cylinders vary in BOTH height and diameter. Wooden knobbed cylinders, child matching size to hole position. Most complex cylinder block.',
    key_materials: ['wooden block', 'cylindrical knobs', 'circular arrangement', 'height + diameter'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_2', 'se_cylinder_block_3'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_cylinder_blocks_combined',
    name: 'Cylinder Blocks Combined',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'All 4 cylinder blocks displayed together on a mat or shelf. 40+ wooden cylinders with knobs in various size combinations. Child completing multiple blocks simultaneously or comparing blocks side-by-side. Wooden base with organized arrangement.',
    key_materials: ['wooden blocks (4)', 'cylindrical knobs (40+)', 'wood', 'organized tray'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_pink_tower',
    name: 'Pink Tower',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Stack of 10 WOODEN CUBES painted BRIGHT PINK, each precisely 1cm smaller on all sides than the previous. When stacked, creates perfect pyramid shape with visible steps down the corner. Child stacking from largest (10cm base) to smallest (1cm cube at top). Smooth finish, vivid pink color.',
    key_materials: ['painted pink wood', 'cubic blocks', 'smooth surface', '10 graduated cubes'],
    confusion_pairs: ['se_brown_stair'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_brown_stair',
    name: 'Brown Stair',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Stack of 10 WOODEN RECTANGULAR PRISMS painted BROWN. All 10cm in height, varying only in width and depth (1cm×1cm to 10cm×10cm cross-section). When stacked, creates STAIR-STEP profile with visible steps on TWO sides. Child stacking and walking fingers up the steps. Natural wood or brown stain finish.',
    key_materials: ['painted brown wood', 'rectangular prisms', 'stair-step shape', 'smooth'],
    confusion_pairs: ['se_pink_tower'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_red_rods',
    name: 'Red Rods',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: '10 WOODEN RODS painted BRIGHT RED, varying from 10cm to 1 meter in length (all same 1cm diameter). Child lining rods up shortest to longest on floor or table, creating length comparison. Smooth red paint, cylindrical rods. Often placed end-to-end showing dramatic length differences.',
    key_materials: ['painted red wood', 'cylindrical rods', 'length variation', '10-100cm range'],
    confusion_pairs: [],
    difficulty: 'easy',
  },

  {
    work_key: 'se_knobless_cylinders',
    name: 'Knobless Cylinders',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'Wooden cylinders WITHOUT KNOBS (plain barrel shape), varying in BOTH height and diameter. 4 sets of 10 cylinders each (different color-coded trays: red, blue, yellow, natural). Child stacking or sorting by size. Smooth wood, no handles. Often used AFTER cylinder blocks for more complex sensorial experience.',
    key_materials: ['wooden cylinders (no knobs)', 'color-coded trays', 'height + diameter variation', 'smooth'],
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
    visual_description: 'PRIMARY COLOR MATCHING. 3 primary colors only: BRIGHT RED, BRIGHT BLUE, BRIGHT YELLOW. 9 wooden tablets (3 of each color), identical size squares. Child matching pairs by color. Solid painted wood, vivid colors, flat square shape. Easy color discrimination.',
    key_materials: ['painted wooden tablets', 'primary colors (red, blue, yellow)', '3×3 matching set'],
    confusion_pairs: ['se_color_box_2', 'se_color_box_3'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_color_box_2',
    name: 'Color Box 2',
    area_key: 'sensorial',
    category: 'Visual Sense - Color',
    visual_description: 'ADVANCED COLOR SHADES. 6 colors (red, blue, yellow, green, orange, purple/violet). 22 wooden tablets total (different quantities per color). Child sorting or sequencing by hue. Solid painted wood, matching similar color tones. Introduces secondary colors.',
    key_materials: ['painted wooden tablets', '6 color hues', 'multiple shades per color'],
    confusion_pairs: ['se_color_box_1', 'se_color_box_3'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_color_box_3',
    name: 'Color Box 3',
    area_key: 'sensorial',
    category: 'Visual Sense - Color',
    visual_description: 'COLOR GRADATION. 11 colors with 9 SHADES EACH (99 wooden tablets total). Each color sequence from very light pastel to deep saturated tone. Child arranging by lightness/darkness within same hue family. Subtle shade discrimination. Painted wood tablets.',
    key_materials: ['painted wooden tablets (99)', '11 color families', '9-shade gradation', 'light to dark'],
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
    visual_description: 'WOODEN CABINET with 6 drawers containing 35+ METAL INSET SHAPES. Each drawer holds wooden frames with METAL INSERTS (circle, triangle, square, rectangle, ellipse, oval, hexagon, pentagon, trapezoid, etc.). Child tracing around metal insets with pencil. Flat wood frames, shiny metal, geometric shapes.',
    key_materials: ['wooden cabinet', 'metal insets', '35+ geometric shapes', 'wooden frames'],
    confusion_pairs: ['se_geometric_solids'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_geometric_solids',
    name: 'Geometric Solids',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: '3D GEOMETRIC SHAPES (NOT flat insets). Wooden or painted 3D forms: sphere, cube, rectangular prism, triangular prism, cone, cylinder, ovoid, ellipsoid. Child rolling, stacking, and exploring 3D properties. Solid wooden or painted blocks with various weights and rolling properties.',
    key_materials: ['3D wooden forms', 'sphere/cube/cone/cylinder', 'various sizes', 'smooth painted'],
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
    visual_description: 'Wooden box containing colored wooden triangles (RED) that fit together to make rectangles. Child assembling 2 right triangles to form rectangle, or using 4 triangles for complex designs. Flat wood triangles with color-coded edges. Teaches symmetry and composition.',
    key_materials: ['red wooden triangles', 'wooden box', 'right triangle shapes', 'color-coded edges'],
    confusion_pairs: ['se_constructive_triangles_tri', 'se_constructive_triangles_large_hex', 'se_constructive_triangles_small_hex', 'se_constructive_triangles_blue'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_constructive_triangles_tri',
    name: 'Constructive Triangles - Equilateral Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing colored wooden triangles (YELLOW) made from EQUILATERAL triangles. Child assembling triangles to form larger shapes (diamonds, parallelograms, complex hexagons). Flat wood, color-coded edges for matching. More complex than rectangle box.',
    key_materials: ['yellow wooden triangles', 'equilateral shape', 'wooden box', 'color-coded'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_large_hex', 'se_constructive_triangles_small_hex'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_constructive_triangles_large_hex',
    name: 'Constructive Triangles - Large Hexagon Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing colored wooden triangles (BLUE) that form a large hexagon when assembled. Child building complex composite shapes from smaller triangular pieces. Flat wood triangles with color-coded edges. Larger, more complex assembly patterns.',
    key_materials: ['blue wooden triangles', 'hexagon assembly', 'wooden box', 'multiple pieces'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_tri', 'se_constructive_triangles_small_hex'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_constructive_triangles_small_hex',
    name: 'Constructive Triangles - Small Hexagon Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing colored wooden triangles (GREEN) that form a SMALL hexagon when assembled. Similar to large hexagon but with smaller triangular pieces. Child building intricate designs. Flat wood, color-coded edges. Most complex constructive triangle set.',
    key_materials: ['green wooden triangles', 'small hexagon assembly', 'wooden box', 'fine pieces'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_tri', 'se_constructive_triangles_large_hex'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_constructive_triangles_blue',
    name: 'Constructive Triangles - Blue Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Wooden box containing BLUE wooden triangles (isosceles and right triangles mixed). Child exploring various triangle types and combinations. Flat wood triangles with different angles and sizes. Color-coded for matching pairs.',
    key_materials: ['blue wooden triangles', 'mixed triangle types', 'wooden box', 'color-coded'],
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
    visual_description: 'WOODEN CUBE (painted in 3 colors: RED, BLUE, NATURAL WOOD) that DISASSEMBLES into 8 smaller blocks. Red blocks, blue blocks, wood blocks arranged to rebuild the large cube. Child deconstructing and reconstructing to explore 3D composition. Wooden box for storage, color-coded pieces.',
    key_materials: ['painted wooden blocks (8)', 'red/blue/natural colors', 'cube construction', 'wooden box'],
    confusion_pairs: ['se_trinomial_cube'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_trinomial_cube',
    name: 'Trinomial Cube',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'WOODEN CUBE (painted in 4 colors: RED, BLUE, YELLOW, NATURAL WOOD) that DISASSEMBLES into 27 smaller blocks. Much more complex than binomial cube with many more pieces. Child reconstructing from components. Wooden box, color-coded pieces. Advanced 3D composition puzzle.',
    key_materials: ['painted wooden blocks (27)', 'red/blue/yellow/natural', 'cube construction', 'wooden box'],
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
    visual_description: 'Wooden boards with TWO SURFACES each: one ROUGH (sandpaper or rough wood) and one SMOOTH (polished or silk). 6 pairs of boards showing texture gradation from very rough to very smooth. Child running fingers across textures. Wooden frame, visible texture contrast.',
    key_materials: ['wooden boards', 'sandpaper texture', 'smooth polished surface', 'contrasting pairs'],
    confusion_pairs: ['se_touch_tablets'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_touch_tablets',
    name: 'Touch Tablets',
    area_key: 'sensorial',
    category: 'Touch Sense',
    visual_description: 'Small WOODEN TABLETS (squares) with various TEXTURES attached: rough sandpaper, medium cloth, smooth silk, etc. 6+ texture gradations mounted on tablets. Child blindfolded matching pairs by feel. Portable tablets, visible texture variety.',
    key_materials: ['wooden tablets', 'sandpaper/cloth/silk surfaces', 'texture gradation', 'portable'],
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
    visual_description: 'Small GLASS OR PLASTIC BOTTLES (opaque, often colored caps) containing COTTON SWABS or pads soaked with different scents (lemon, vanilla, rose, mint, etc.). 6-12 pairs for matching by smell. Child sniffing and pairing identical scents. Solid caps prevent spilling.',
    key_materials: ['glass/plastic bottles', 'colored caps', 'scented cotton', 'sealed containers'],
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
    visual_description: 'Small GLASS BOTTLES with colored lids containing different TASTE SOLUTIONS (sweet, salty, bitter, sour, etc.) on cotton swabs or droppers. 4-6 pairs for taste discrimination. Child tasting small samples (swab on tongue). Glass bottles with colored caps for organization.',
    key_materials: ['glass bottles', 'colored caps', 'cotton swabs', 'taste solutions'],
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
    visual_description: 'Wooden BOXES with LIDS (often red or natural wood) containing different materials (grains, bells, pebbles, beads) that RATTLE when shaken. 6+ pairs for matching by sound. Child shaking and listening to identify similar sounds. Sealed boxes prevent seeing contents.',
    key_materials: ['wooden boxes with lids', 'sealed rattle contents', 'red/natural finish', 'pairs'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_bells',
    name: 'Montessori Bells',
    area_key: 'sensorial',
    category: 'Auditory Sense',
    visual_description: 'Set of TUNED METAL BELLS mounted on WOODEN HANDLES or in a frame. 13+ bells producing different pitches from low to high. Wooden mallets for striking bells. Child striking bells and listening to pitch variation. Shiny metal bells, organized wooden frame.',
    key_materials: ['tuned metal bells', 'wooden handles/frame', 'wooden mallets', 'multiple pitches'],
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
    visual_description: 'Opaque FABRIC BAG (often red or natural) with closure at top. Child reaching inside (blindfolded or without looking) to FEEL objects by touch alone. Contains various objects (geometric shapes, everyday items, textured materials). Tactile exploration without visual input.',
    key_materials: ['fabric bag (opaque)', 'varied objects inside', 'closure mechanism', 'texture exploration'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_sorting_grains',
    name: 'Sorting Grains',
    area_key: 'sensorial',
    category: 'Exploratory Sensorial',
    visual_description: 'Multiple WOODEN BOWLS or containers with different GRAINS (rice, lentils, beans, millet, pasta, etc.). 6-8 different grain types mixed together on a tray. Child using spoon or tweezers to SORT grains into separate containers by type. Tactile and visual discrimination.',
    key_materials: ['wooden bowls', 'mixed grains', 'spoon or tweezers', 'tray'],
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
    visual_description: 'Identical WOODEN TABLETS (same size/appearance) with DIFFERENT WEIGHTS inside (lead weights, sand, etc.). 6-9 pairs for weight discrimination. Child holding and comparing tablets by lifting them. Smooth wood exterior, invisible weight differences. Requires sensory touch to discriminate.',
    key_materials: ['wooden tablets (identical)', 'hidden weights', 'different densities', 'pairs'],
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
    visual_description: 'Wooden TABLETS made from DIFFERENT MATERIALS (wood, metal, plastic, ceramic) that conduct heat at DIFFERENT RATES. 6 pairs of identical-looking tablets in different materials. Child touching tablets to feel temperature differences. Explores thermal conductivity through touch.',
    key_materials: ['wooden tablets', 'metal/ceramic/plastic inlays', 'heat-conducting materials', 'pairs'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_thermic_bottles',
    name: 'Thermic Bottles',
    area_key: 'sensorial',
    category: 'Thermic Sense',
    visual_description: 'Glass or metal BOTTLES/CONTAINERS filled with water at DIFFERENT TEMPERATURES (cold ice water, room temperature, warm water). 3-6 pairs of identical bottles. Child holding to discriminate temperature differences. Simple thermic discrimination work.',
    key_materials: ['glass/metal bottles', 'water at different temps', 'identical appearance', 'thermal contrast'],
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
    visual_description: 'Mixed collection of EVERYDAY OBJECTS (buttons, beads, shells, seeds, pebbles, etc.) on a tray with multiple COMPARTMENTS or bowls. Child sorting objects by category (color, size, type, texture). Develops classification and sensorial discrimination. Open-ended exploratory work.',
    key_materials: ['mixed everyday objects', 'compartmented tray', 'varied materials', 'sorting containers'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  {
    work_key: 'se_superimposed_geometric_figures',
    name: 'Superimposed Geometric Figures',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'Set of FLAT WOODEN or METAL GEOMETRIC SHAPES (circles, squares, triangles, rectangles, hexagons) in DIFFERENT SIZES but same shape family. Shapes TRACE over each other to show size relationships. Child stacking or overlaying shapes to build understanding of geometric progression. Painted wood or shiny metal frames.',
    key_materials: ['geometric shapes (wood/metal)', 'progressive sizing', 'overlapping designs', 'flat forms'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  {
    work_key: 'se_fabric_matching',
    name: 'Fabric Matching',
    area_key: 'sensorial',
    category: 'Touch Sense',
    visual_description: 'SOFT CLOTH FABRIC SWATCHES mounted on cards showing different WEAVES, patterns, and textures. Silk, cotton, wool, linen, velvet, burlap samples. 6-12 pairs for matching by feel and sight. Child touching and matching identical fabrics. DISTINCTLY DIFFERENT from Color Boxes (soft cloth vs rigid painted wood).',
    key_materials: ['fabric swatches', 'different weaves', 'soft textiles', 'mounted cards'],
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
