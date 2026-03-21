/**
 * Sensorial Area - Work Signatures for CLIP Embedding (DEEP REWRITE)
 * 35 Montessori sensorial works with EXTREME visual detail optimized for photo identification
 *
 * Each signature describes EXACTLY what is visible in a classroom photo from 1-2 meters away.
 * MATERIAL-FIRST priority: what is it MADE OF? RIGID or SOFT? What COLOR? What SHAPE?
 * ACTION-FOCUSED: what are the child\'s hands DOING?
 * ANTI-CONFUSION: explicitly state what it is NOT.
 * Every description is 3-5 sentences minimum with specific visual markers.
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
    visual_description: 'RECTANGULAR WOODEN BLOCK (natural light wood stain or varnish, approximately 15cm × 10cm) with TEN CYLINDRICAL HOLES drilled in a SINGLE LINEAR HORIZONTAL ROW. The holes INCREASE ONLY IN DIAMETER (from 1cm to 10cm), while ALL holes maintain the SAME DEPTH of approximately 1.5cm — creating a flat bottom visible when cylinders are removed. TEN WOODEN CYLINDERS with ROUND WOODEN KNOBS on top (resembling mushroom handles) fit into these holes. Child\'s hands grasping cylinders by the knobs and fitting them into matching diameter holes, producing audible wooden "clunk" sounds as cylinders settle into place. The diameter progression is VISUALLY OBVIOUS from across the room — thin toothpick-like cylinders on one end graduate to thick thumb-sized cylinders on the other. When partially assembled, the mismatched cylinders do NOT fit, forcing trial-and-error learning. NOT Knobless Cylinders (no knobs, free-standing) and NOT Block 2 (which also varies HEIGHT). Smooth, splinter-free wood throughout.',
    key_materials: ['solid light-stain wooden block (15×10cm)', 'ten wooden knobs (mushroom-shaped)', 'cylindrical wood dowels (1-10cm diameter)', 'identical depth holes (1.5cm)', 'varnished light finish'],
    confusion_pairs: ['se_cylinder_block_2', 'se_cylinder_block_3', 'se_knobless_cylinders'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_cylinder_block_2',
    name: 'Cylinder Block 2',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'RECTANGULAR WOODEN BLOCK (natural or light-stained wood, approximately 15cm × 10cm) with TEN CYLINDRICAL HOLES arranged in a LINEAR HORIZONTAL ROW. CRITICAL DIFFERENCE from Block 1: cylinders vary in BOTH DIAMETER AND HEIGHT SIMULTANEOUSLY — smaller-diameter cylinders are TALLER (approximately 4cm tall), while larger-diameter cylinders are SHORTER (approximately 2cm tall). This creates an INVERTED HEIGHT RELATIONSHIP — thinnest cylinder is tallest, thickest cylinder is shortest. WOODEN KNOBS on each cylinder. When fully assembled and cylinders stand upright in the block, the TOP SURFACES of all cylinders roughly ALIGN to the same height, creating an optical illusion. Child discovering through trial-and-error that small thin cylinders reach higher into their deeper holes while large thick cylinders sit lower in their shallower holes. The OPPOSITE pattern from Block 1 — a sophisticated discrimination requiring careful observation. Smooth wood, light varnish. When cylinders are removed and lined up on a flat surface, the height variation becomes DRAMATICALLY OBVIOUS.',
    key_materials: ['solid wooden block (15×10cm)', 'ten wooden mushroom knobs', 'cylinders with diameter-height inverse relationship', 'varied hole depths', 'light wood finish'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_3', 'se_cylinder_block_4', 'se_knobless_cylinders'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_cylinder_block_3',
    name: 'Cylinder Block 3',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'RECTANGULAR WOODEN BLOCK (light natural wood, approximately 15cm × 10cm) with TEN CYLINDRICAL HOLES in a LINEAR ROW. UNIQUE FEATURE: cylinders vary in BOTH diameter and height, BUT in a DIRECT PROPORTIONAL RELATIONSHIP — largest-diameter cylinders are also TALLEST (approximately 4cm), while smallest-diameter cylinders are SHORTEST (approximately 2cm). This creates a PROPORTIONAL SCALING effect visible from across the room — the cylinders form a visually obvious STAIRCASE HEIGHT PROGRESSION from left to right. WOODEN KNOBS on each cylinder. When assembled correctly, the TOPS of the cylinders form a descending stair-step profile visible from the side. Child arranging cylinders left-to-right to create this distinctive stepped silhouette. The PROPORTIONAL relationship (not inverted like Block 2) makes this a logical intermediate difficulty. Smooth wood, varnished light finish. This block teaches CONSISTENT SCALING — every dimension increases together in harmony.',
    key_materials: ['wooden block (15×10cm)', 'ten wooden mushroom knobs', 'proportional diameter-height cylinders', 'staircase height profile', 'varnished wood'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_2', 'se_cylinder_block_4', 'se_knobless_cylinders'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_cylinder_block_4',
    name: 'Cylinder Block 4',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'RECTANGULAR WOODEN BLOCK (light natural wood) with TEN CYLINDRICAL HOLES arranged NOT in a linear row but in a CIRCULAR OR 2D GRID PATTERN (typically a spiral or scattered arrangement viewed from above). Cylinders vary in BOTH height and diameter independently — creating MAXIMUM VISUAL COMPLEXITY. The NON-LINEAR SPATIAL ARRANGEMENT (not left-to-right like Blocks 1-3) requires ACTIVE SPATIAL REASONING — child must rotate and manipulate cylinders while considering both size parameters and non-linear hole positions. WOODEN KNOBS on each cylinder. When assembled, creates an asymmetric three-dimensional composition without the visual "line" or "staircase" that makes Blocks 1-3 organized. The PUZZLE ASPECT is heightened — there\'s no simple left-to-right strategy, requiring careful visual matching and spatial visualization. Smooth light-stained wood. This block represents the MOST ADVANCED cylinder block work, combining multiple complexity variables.',
    key_materials: ['wooden block with circular/spiral hole layout', 'ten wooden mushroom knobs', 'height + diameter variation', 'non-linear spatial arrangement', 'varnished natural wood'],
    confusion_pairs: ['se_cylinder_block_1', 'se_cylinder_block_2', 'se_cylinder_block_3', 'se_knobless_cylinders'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_cylinder_blocks_combined',
    name: 'Cylinder Blocks Combined',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'ALL FOUR CYLINDER BLOCKS (Blocks 1, 2, 3, and 4) displayed together on a single LARGE WOODEN TRAY or classroom shelf/mat. Complete set includes 40+ WOODEN CYLINDERS with KNOBS arranged around and within the four blocks. The CONTRAST between the four different organizational patterns is VISUALLY STRIKING — Block 1 shows a simple left-to-right diameter increase, Block 2 shows the inverted height pattern, Block 3 shows proportional scaling, and Block 4 shows the non-linear puzzle layout. Some cylinders are inserted in holes, others are arranged on the tray surface sorted by size. The wooden storage tray (approximately 25cm × 35cm) contains all materials. Child rotating between the four blocks, comparing size progressions, or using mixed cylinders to challenge classification skills. From across the room, the visual variety of FOUR DISTINCT BLOCKS SIDE-BY-SIDE is the identifying feature. Light natural wood throughout.',
    key_materials: ['four cylinder blocks (1/2/3/4)', '40+ wooden cylinders with knobs', 'large wooden storage tray (25×35cm)', 'natural light wood finish', 'four distinct hole pattern variations'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_pink_tower',
    name: 'Pink Tower',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'SET OF TEN RIGID WOODEN CUBES painted in BRIGHT SATURATED PINK color (true candy pink, not magenta, not salmon, not dusty rose — a vivid PRIMARY PINK that\'s immediately recognizable from 5 meters away). Each cube is PERFECTLY CUBIC in shape with ALL SIX FACES exactly equal in length. Cubes graduate in SIZE from 1cm³ (smallest, fits in toddler palm) to 10cm³ (largest, requires both hands for young children). EVERY cube is PRECISELY 1cm smaller on each dimension than the one larger, creating PERFECT MATHEMATICAL PROGRESSION. When stacked from largest base to smallest top, forms a PERFECTLY SYMMETRICAL STEPPED PYRAMID visible from all four sides, with visible 1cm step-downs and corner alignment on each layer. Child stacking by size, often by trial-and-error, placing heavier/larger cubes first and progressively smaller cubes on top. SMOOTH GLOSSY LACQUER FINISH on paint creates reflective sheen visible in photographs. DISTINCTLY DIFFERENT from Brown Stair (which uses brown RECTANGULAR PRISMS creating stairs, not pink CUBES creating a pyramid). The PINK COLOR is unmistakable and visible from across the room.',
    key_materials: ['ten wooden cubes (solid beech)', 'saturated bright pink paint (not magenta)', 'glossy lacquer finish', '1cm³ to 10cm³ progression', 'pyramid stacking form'],
    confusion_pairs: ['se_brown_stair'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_brown_stair',
    name: 'Brown Stair',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'SET OF TEN RECTANGULAR WOODEN PRISMS painted DARK BROWN or natural wood-stain finish (chocolate brown, not light tan, not red-brown — a deep earthy brown visible in photographs). CRITICAL DIFFERENCE from Pink Tower: ALL TEN PRISMS have IDENTICAL HEIGHT of 10cm, but the SQUARE BASE AREA varies from 1cm×1cm (smallest, thin stick-like) to 10cm×10cm (largest, substantial block). When stacked in correct sequence, creates a distinctive STAIR-STEP PROFILE visible on two perpendicular sides — like looking at actual wooden stairs that a child could theoretically run fingers up and down. Each prism sits flat on the one below, progressively offset to create the staircase silhouette. Child recognizes the STAIR-STEP PATTERN after only brief exposure — this is the unmistakable visual signature. SMOOTH PAINTED FINISH or natural varnish shows wood grain slightly. From 1-2 meters, the BROWN COLOR and STAIR-STEP SHAPE are instantly distinguishable. NOT cubes (Pink Tower) and NOT the inverted patterns of cylinder blocks. The rectangular prism shape is unmistakable.',
    key_materials: ['ten brown wooden rectangular prisms', 'equal height (10cm)', 'base area 1-10cm²', 'stair-step arrangement profile', 'painted/varnished wood'],
    confusion_pairs: ['se_pink_tower'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_red_rods',
    name: 'Red Rods',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'SET OF TEN CYLINDRICAL WOODEN RODS painted BRIGHT RED (pure fire-engine red, not orange-red, not burgundy — a vivid PRIMARY RED visible from across the room). CRITICAL CHARACTERISTIC: ALL TEN RODS have IDENTICAL DIAMETER of approximately 1cm (uniform thickness throughout, like wooden dowels), but vary DRAMATICALLY IN LENGTH from 10cm (shortest, easily graspable) to 100cm (ONE METER, nearly as tall as young child when stood upright). The LENGTH DIFFERENCE is the ONLY variable — a single, simple dimension that children understand immediately. Child arranging ten rods from shortest to longest, often placed end-to-end on the floor creating a DRAMATIC LENGTH PROGRESSION visible from the side or end view. The BRIGHT RED COLOR combined with the EXTREME LENGTH RANGE (from pencil-sized to person-sized) makes this work unmistakable in photographs. SMOOTH CYLINDRICAL shape, glossy paint finish. NOT Color boxes (which vary COLOR, not length) and NOT Red-Blue number rods (which have ALTERNATING COLORED SEGMENTS). The rods lie relatively flat on the ground creating a visual "fan" pattern when arranged by increasing length.',
    key_materials: ['ten red wooden cylinders (dowels)', 'uniform 1cm diameter throughout', '10cm to 100cm length range', 'bright saturated red paint', 'glossy smooth finish'],
    confusion_pairs: [],
    difficulty: 'easy',
  },

  {
    work_key: 'se_knobless_cylinders',
    name: 'Knobless Cylinders',
    area_key: 'sensorial',
    category: 'Visual Sense - Dimension',
    visual_description: 'SET OF WOODEN CYLINDERS WITHOUT KNOBS — plain barrel shapes with completely smooth ends (no handles, no protrusions). The cylinders are FREE-STANDING and movable, not permanently mounted in a block. Organized into FOUR COLOR-CODED WOODEN TRAYS OR BOXES: RED TRAY (red cylinders), BLUE TRAY (blue cylinders), YELLOW TRAY (yellow cylinders), and NATURAL WOOD TRAY (unfinished/stained wood cylinders). Each color-coded tray contains TEN CYLINDERS varying in BOTH HEIGHT AND DIAMETER INDEPENDENTLY — creating more complex size relationships than cylinder blocks (where holes constrain the placement). Child removing cylinders from trays, stacking or arranging by size, discovering that cylinders can be arranged in multiple ways (by height, by diameter, or by proportion). The LACK OF KNOBS is the unmistakable distinguishing feature — cylinders have smooth ends, not mushroom-shaped handles. The FOUR COLOR-CODED TRAYS are visually obvious. From photographs, the smooth cylindrical shape without protruding knobs is immediately apparent, and the color-coded tray system is distinctive.',
    key_materials: ['wooden cylinders (no knobs)', 'four color-coded trays (red/blue/yellow/natural)', 'ten cylinders per tray (40 total)', 'height + diameter independent variation', 'smooth unfinished wood or painted'],
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
    visual_description: 'WOODEN BOX (natural light wood or painted, approximately 12cm × 8cm × 2cm) containing exactly NINE SMALL PAINTED WOODEN SQUARE TABLETS. The tablets are flat, square (approximately 3cm × 3cm × 0.5cm thick), and represent THREE PRIMARY COLORS ONLY: BRIGHT RED, BRIGHT BLUE, and BRIGHT YELLOW — each color repeated EXACTLY THREE TIMES (three red tablets, three blue tablets, three yellow tablets). Each color is a PURE, SATURATED PRIMARY HUE (not pastel, not mixed) — the most basic color discrimination. Tablets have SMOOTH PAINTED FINISH with uniform gloss. Child performing SIMPLE COLOR MATCHING: placing matching tablets side-by-side, creating red pairs, blue pairs, and yellow pairs. This is the INTRODUCTORY color work for toddlers 2-3 years old — absolutely no gradation, no secondary colors, just PRIMARY COLOR IDENTIFICATION. From photographs, the THREE DISTINCT BRIGHT COLORS are instantly visible. NOT Color Box 2 (which includes secondary colors) and NOT Color Box 3 (which includes gradations). The SIMPLICITY is the defining characteristic.',
    key_materials: ['painted wooden square tablets (nine total)', 'three primary colors (red/blue/yellow)', 'three tablets per color', 'flat square shape (3×3cm)', 'smooth paint finish'],
    confusion_pairs: ['se_color_box_2', 'se_color_box_3'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_color_box_2',
    name: 'Color Box 2',
    area_key: 'sensorial',
    category: 'Visual Sense - Color',
    visual_description: 'WOODEN BOX containing approximately 22 SMALL PAINTED WOODEN SQUARE TABLETS (similar size and shape to Color Box 1 tablets — approximately 3cm × 3cm). CRITICAL DIFFERENCE: introduces SIX distinct HUE FAMILIES, including SECONDARY COLORS. Color families represented: BRIGHT RED, BRIGHT BLUE, BRIGHT YELLOW (primaries), BRIGHT GREEN (secondary), BRIGHT ORANGE (secondary), and PURPLE/VIOLET (secondary). The quantity of tablets per color varies (not equal) — some colors have 2-3 tablets, creating asymmetry. Each tablet is a SOLID, SINGLE-HUE COLOR (no gradations within a color family). Child sorting or sequencing tablets by hue, discovering color relationships and family groupings. The INTRODUCTION OF SECONDARY COLORS (green, orange, purple) is the defining feature that distinguishes Box 2 from Box 1. Smooth paint finish. From photographs, the EXPANDED COLOR PALETTE is visually obvious, showing more diversity than the primary-color-only Box 1. NOT Color Box 3 (which includes subtle shade gradations within each color family).',
    key_materials: ['painted wooden square tablets (22 total)', 'six color hues (primary + secondary)', 'unequal quantities per color', 'flat square shape (3×3cm)', 'solid single-hue finish'],
    confusion_pairs: ['se_color_box_1', 'se_color_box_3'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_color_box_3',
    name: 'Color Box 3',
    area_key: 'sensorial',
    category: 'Visual Sense - Color',
    visual_description: 'WOODEN BOX containing exactly 99 SMALL PAINTED WOODEN SQUARE TABLETS (similar size to Boxes 1 and 2 — approximately 3cm × 3cm). ESSENTIAL DIFFERENCE: tablets represent ELEVEN DISTINCT COLOR FAMILIES, with NINE SUBTLE SHADE GRADATIONS within EACH family. For example, one family shows 9 variations of PINK: very light pale pink, light pink, medium pink, medium-dark pink, dark pink, dark saturated pink, very dark pink, etc. Each of the 11 color families (red, pink, orange, yellow, green, blue, indigo, violet, brown, black/gray, and one additional color) demonstrates the FULL SPECTRUM from lightest pastel shade to deepest saturated tone. Child arranging tablets within a single color family from lightest to darkest, performing EXTREMELY SUBTLE COLOR DISCRIMINATION that requires focused visual attention and refined color perception. This is the most advanced color work in the Sensorial curriculum. The PRESENCE OF MULTIPLE SHADE GRADATIONS within each color family (not just single solid hues like Boxes 1 and 2) is the defining characteristic. From photographs, when multiple tablets are laid out, the SUBTLE SHADE VARIATIONS become apparent — this is visually distinctive from the solid single-hue tablets of Boxes 1 and 2.',
    key_materials: ['painted wooden square tablets (99 total)', 'eleven color families', 'nine shade gradations per color', 'light to dark progression per family', 'subtle tone discrimination focus'],
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
    visual_description: 'Large WOODEN CABINET (typically with four or six drawers, natural light wood finish, approximately 40cm × 30cm × 12cm) containing 35+ FLAT METAL GEOMETRIC INSET SHAPES set into WOODEN FRAMES. The cabinet is visually striking with symmetrical drawer arrangement. Each drawer holds WOODEN FRAMES (approximately 15cm × 10cm) with SHINY METAL OUTLINE INSETS that form geometric shapes: CIRCLES (various sizes), TRIANGLES (equilateral, isosceles, right-angle), SQUARES, RECTANGLES, ELLIPSES, OVALS, HEXAGONS, PENTAGONS, TRAPEZOIDS, and complex polygons. The metal insets have a slightly RAISED BORDER or FRAME EDGE, creating a concave indentation where the shape outline sits. Child using a SHARP PENCIL to trace around the METAL INSET OUTLINE on paper, creating geometric shape drawings/templates. The metal is SHINY and REFLECTIVE in photographs. This is FLAT, 2D work (not 3D solids). The METAL INSETS with their RAISED FRAME EDGES are the unmistakable visual characteristic — these look like stencils or template sets. NOT Geometric Solids (which are 3D wooden blocks, not flat metal frames). From 1-2 meters, the wooden cabinet with visible drawer handles and the shiny metal shapes inside are distinctive.',
    key_materials: ['wooden cabinet (4-6 drawers)', 'metal geometric inset frames', '35+ shape varieties', 'shiny metal borders', 'wooden drawer frames'],
    confusion_pairs: ['se_geometric_solids'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_geometric_solids',
    name: 'Geometric Solids',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'SET OF 3D WOODEN GEOMETRIC FORMS (completely different from the flat metal insets of Geometric Cabinet). The set includes approximately 10-12 SOLID WOODEN BLOCKS in distinct geometric shapes: SPHERE (perfect rolling ball, approximately 5cm diameter), CUBE (6 equal square faces), RECTANGULAR PRISM (box shape, 2:1:1 ratio), TRIANGULAR PRISM (wedge/roof-like shape), CONE (pointed top, circular base), CYLINDER (round tube, flat top/bottom), OVOID (egg shape, elongated), ELLIPSOID (football-like shape), and sometimes additional forms. Each block is 5-10cm in size, smooth wooden or painted in DIFFERENT COLORS (to distinguish shapes visually). Child handling, rolling, and stacking these SOLID 3D FORMS, discovering that some shapes roll smoothly (sphere, cylinder, cone) while others are stable for stacking (cube, rectangular prism). This is hands-on kinesthetic exploration of 3D GEOMETRIC PROPERTIES. The SOLID WOODEN CONSTRUCTION (not metal frames) is the fundamental difference from Geometric Cabinet. From photographs, the chunky 3D blocks are immediately apparent versus the flat frames. Child\'s hands manipulating solid forms, rolling spheres, stacking cubes are the key visual elements.',
    key_materials: ['3D wooden geometric blocks', 'sphere/cube/cone/cylinder/prism/ovoid', '10-12 distinct shapes', 'smooth painted finish (various colors)', 'rolling and stacking properties'],
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
    visual_description: 'WOODEN BOX containing RED WOODEN TRIANGLE PIECES designed to fit together in geometric compositions. The triangles are RIGHT TRIANGLES (one 90-degree angle, two 45-degree angles), the SIMPLEST triangle type for children. Each box contains approximately 8-12 triangular pieces that are IDENTICAL in size within the set. Child discovering that TWO identical right triangles fit together PERFECTLY to form a RECTANGLE or SQUARE — this is the breakthrough insight of this box. Additional pieces allow creating LARGER PATTERNS, DIAMONDS, and COMPLEX DESIGNS by combining multiple triangles. FLAT WOODEN PIECES (2D), painted bright RED. COLOR-CODED EDGE LINES help with pattern matching — edges must align perfectly for correct assembly. Pieces fit together with SATISFYING SNAPS or CLICKS. This is the INTRODUCTORY constructive triangle work for young children (3-4 years), using the most basic triangle type. From photographs, the RED WOODEN TRIANGLES arranged in geometric patterns are visually distinctive. The SIMPLICITY (right triangles only) is the defining characteristic.',
    key_materials: ['red wooden triangle pieces', 'right triangle shape (90-45-45)', 'flat 2D pieces (wooden)', 'color-coded edge matching lines', '8-12 pieces per set'],
    confusion_pairs: ['se_constructive_triangles_tri', 'se_constructive_triangles_large_hex', 'se_constructive_triangles_small_hex', 'se_constructive_triangles_blue'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_constructive_triangles_tri',
    name: 'Constructive Triangles - Equilateral Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'WOODEN BOX containing YELLOW WOODEN TRIANGLE PIECES with a DIFFERENT TRIANGLE SHAPE than Rectangle Box: EQUILATERAL TRIANGLES (all three angles equal at 60 degrees, all three sides equal length). This creates MUCH MORE COMPLEX geometric possibilities than right triangles. Child assembling equilateral triangles to form LARGER DIAMONDS, PARALLELOGRAMS, COMPLEX HEXAGON PATTERNS, and INTRICATE DESIGNS that are visually stunning. The CHALLENGE IS SIGNIFICANTLY HIGHER because equilateral triangles don\'t form simple rectangles like right triangles — instead, they create UNEXPECTED and BEAUTIFUL COMPOSITE SHAPES. Box contains approximately 12-20 triangular pieces of varying sizes (not all identical like Rectangle Box), allowing INFINITE COMPOSITION possibilities. FLAT WOODEN PIECES, painted bright YELLOW. COLOR-CODED EDGE LINES guide assembly. This box represents INTERMEDIATE to ADVANCED constructive triangle work (4-5 years). The YELLOW COLOR and EQUILATERAL SHAPE (all angles 60 degrees) are the distinguishing visual features. From photographs, the YELLOW WOODEN TRIANGLES arranged in complex geometric patterns are distinctly more intricate than the simple Rectangle Box patterns.',
    key_materials: ['yellow wooden triangle pieces', 'equilateral shape (60-60-60 degrees)', 'flat 2D wooden pieces', 'multiple sizes within set', 'color-coded edge matching lines'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_large_hex', 'se_constructive_triangles_small_hex'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_constructive_triangles_large_hex',
    name: 'Constructive Triangles - Large Hexagon Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'WOODEN BOX containing BLUE WOODEN TRIANGLE PIECES specifically designed and sized to form one LARGE HEXAGON shape when all pieces are assembled together correctly. The box contains MANY TRIANGLE PIECES (approximately 15-25 pieces) that fit together in a precise arrangement to create the COMPLETE HEXAGON OUTLINE. This represents HIGHER COMPLEXITY than the Equilateral Box because the child must visualize and achieve a SPECIFIC FINAL FORM (hexagon shape) rather than open-ended abstract patterns. The puzzle aspect is heightened — pieces must be arranged in precise positions for the final hexagon to "close" correctly. FLAT WOODEN PIECES, painted bright BLUE. COLOR-CODED EDGE MATCHING LINES guide assembly. The visual GOAL (forming a large hexagon) makes this work FOCUSED and PURPOSEFUL compared to exploratory composition. From photographs, the BLUE WOODEN TRIANGLES arranged in the distinctive HEXAGON FORMATION are visually striking and immediately recognizable as a geometric target shape. This is ADVANCED constructive triangle work (4-5 years) requiring sustained focus and spatial planning.',
    key_materials: ['blue wooden triangle pieces', 'hexagon-forming assembly', '15-25 pieces per set', 'flat 2D wooden construction', 'color-coded edge guide lines'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_tri', 'se_constructive_triangles_small_hex'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_constructive_triangles_small_hex',
    name: 'Constructive Triangles - Small Hexagon Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'WOODEN BOX containing GREEN WOODEN TRIANGLE PIECES designed to form a SMALL HEXAGON pattern, similar in CONCEPT to the Large Hexagon Box but with SIGNIFICANTLY SMALLER and MORE DELICATE PIECES. The smaller pieces require FINER MOTOR CONTROL and MORE CAREFUL MANIPULATION by the child. Box contains approximately 20-30 TINY TRIANGLE PIECES that must be assembled into the final small HEXAGON SHAPE. The COMPLEXITY is the HIGHEST among all constructive triangle sets because children must manage numerous small components without dropping or misplacing them. This work requires ADVANCED FINE MOTOR SKILLS, SUSTAINED FOCUS, and SPATIAL VISUALIZATION. FLAT WOODEN PIECES, painted bright GREEN. COLOR-CODED EDGE MATCHING LINES (though harder to see on small pieces) guide assembly. From photographs, the GREEN WOODEN TRIANGLE PIECES and the intricate small HEXAGON PATTERN are visually distinctive. This represents ADVANCED/EXPERT constructive triangle work (5+ years). The SMALL SIZE and the number of pieces make this the most challenging constructive triangle set.',
    key_materials: ['green wooden triangle pieces', 'small delicate pieces', 'hexagon-forming assembly', '20-30 pieces per set', 'color-coded edge lines'],
    confusion_pairs: ['se_constructive_triangles_rect', 'se_constructive_triangles_tri', 'se_constructive_triangles_large_hex'],
    difficulty: 'hard',
  },

  {
    work_key: 'se_constructive_triangles_blue',
    name: 'Constructive Triangles - Blue Box',
    name: 'Constructive Triangles - Blue Box',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'WOODEN BOX containing BLUE WOODEN TRIANGLE PIECES representing a MIXED SET of DIFFERENT TRIANGLE TYPES (not all equilateral or all right, but a VARIETY). Set includes both ISOSCELES TRIANGLES (two equal sides, two equal angles) and RIGHT TRIANGLES (one 90-degree angle) in MULTIPLE SIZES. This creates an EXPLORATORY, OPEN-ENDED learning experience as child discovers that different triangle types combine in DIFFERENT WAYS to create unique patterns. Unlike the Rectangle, Equilateral, or Hexagon boxes which have more CONSTRAINED or GOAL-ORIENTED assembly, this box ENCOURAGES EXPERIMENTATION and CREATIVE COMPOSITION. Child explores how angles combine, why certain triangles fit together, and how geometry works fundamentally. FLAT WOODEN PIECES, painted bright BLUE. COLOR-CODED EDGE MATCHING LINES guide but don\'t constrain. Box contains approximately 12-18 pieces. From photographs, the BLUE WOODEN TRIANGLES arranged in varied, non-uniform patterns distinguish this from other constructive triangle sets. This is EXPLORATORY constructive triangle work (4-5 years) emphasizing understanding over achieving a specific form.',
    key_materials: ['blue wooden triangle pieces', 'mixed isosceles and right triangles', 'varied sizes', 'flat 2D wooden construction', 'color-coded edge guide lines'],
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
    visual_description: 'WOODEN BOX containing a LARGE PAINTED WOODEN CUBE that DISASSEMBLES into exactly EIGHT SMALLER WOODEN BLOCKS arranged in a 2×2×2 THREE-DIMENSIONAL GRID. The eight blocks are painted in THREE DISTINCT COLORS: RED BLOCKS (2 identical red cubes), BLUE BLOCKS (2 identical blue cubes), and NATURAL WOOD COLOR BLOCKS (2 identical natural wood blocks) — creating color-coded grouping. The assembled large cube shows visible COLOR BANDS creating a visual pattern on the exterior. Child DECONSTRUCTING the large cube by carefully removing the eight blocks (they fit together snugly), EXAMINING the component parts, then RECONSTRUCTING the cube back to its original assembled state. This requires spatial reasoning and patience. WOODEN STORAGE BOX with dividers keeps blocks organized. The DISASSEMBLY/REASSEMBLY ACTION is the defining feature — watching a child take apart the cube, see the eight components, and rebuild the original form is visually distinctive. From photographs, either the assembled large MULTICOLORED CUBE or the eight scattered COMPONENT BLOCKS are recognizable. This work explores 3D composition and introduces algebraic concepts (binomial = two terms) through CONCRETE MATERIALS for young children (3-4 years).',
    key_materials: ['painted wooden cube (large)', 'eight painted blocks (2×2×2)', 'red/blue/natural wood colors', 'disassembles/reassembles', 'wooden storage box with dividers'],
    confusion_pairs: ['se_trinomial_cube'],
    difficulty: 'medium',
  },

  {
    work_key: 'se_trinomial_cube',
    name: 'Trinomial Cube',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'WOODEN BOX containing a LARGE PAINTED WOODEN CUBE that DISASSEMBLES into exactly TWENTY-SEVEN (27) SMALLER WOODEN BLOCKS arranged in a 3×3×3 THREE-DIMENSIONAL GRID (3 cubed = 27 pieces). The 27 blocks are painted in FOUR DISTINCT COLORS: RED BLOCKS, BLUE BLOCKS, YELLOW BLOCKS, and NATURAL WOOD COLOR BLOCKS — arranged in a specific color pattern on the assembled cube\'s exterior. The assembled large cube is COLORFUL and visually STRIKING with visible color bands. Child DECONSTRUCTING the large cube to reveal all 27 component pieces (significantly MORE COMPLEX than Binomial with only 8), EXAMINING how they fit together, then RECONSTRUCTING the original cube. This is a SUBSTANTIAL PUZZLE requiring spatial visualization, patience, and careful manipulation to align 27 pieces correctly. WOODEN STORAGE BOX with dividers keeps blocks organized. The MUCH LARGER NUMBER OF PIECES (27 vs 8) makes this visually and functionally SIGNIFICANTLY MORE COMPLEX. From photographs, either the assembled MULTICOLORED CUBE or the array of 27 scattered COMPONENT BLOCKS show the scale and complexity. This work explores 3D composition and introduces algebraic concepts (trinomial = three terms: a+b+c cubed) for older children (4-5 years).',
    key_materials: ['painted wooden cube (large)', 'twenty-seven painted blocks (3×3×3)', 'red/blue/yellow/natural wood colors', 'complex disassembly/reassembly puzzle', 'wooden storage box with dividers'],
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
    visual_description: 'SET OF WOODEN BOARDS or THICK WOODEN PLAQUES (approximately 6 inches × 6 inches = 15cm × 15cm, wooden frame/edge visible). Each board displays TWO DISTINCTLY DIFFERENT SURFACE FINISHES on opposing sides: one side is ROUGH (covered with COARSE SANDPAPER or rough wood grain, visually GRAINY and TEXTURED in photographs), the opposite side is SMOOTH and POLISHED (varnished, silk-like, GLOSSY finish, visually REFLECTIVE). Set of 6 pairs shows texture GRADATION from VERY COARSE sandpaper (grit visible at distance) to VERY SMOOTH polished wood (mirror-like appearance). Child running fingertips across the ROUGH and SMOOTH surfaces, feeling the dramatic texture contrast. Work demonstrates TACTILE DISCRIMINATION combined with VISUAL EVIDENCE — the rough side\'s texture is visible in photographs as stippled/granular surface, while the smooth side reflects light. WOODEN FRAME around edges visible. This is INTRODUCTORY texture work (3-4 years) using obvious contrast. From photographs, the TEXTURE DIFFERENCE is VISUALLY APPARENT — rough sides show granular/sandy appearance, smooth sides show reflective gloss.',
    key_materials: ['wooden boards (6 pairs)', 'coarse sandpaper (rough side)', 'polished/varnished smooth surface', 'texture gradation (coarse to fine)', 'visible wood frame'],
    confusion_pairs: ['se_touch_tablets'],
    difficulty: 'easy',
  },

  {
    work_key: 'se_touch_tablets',
    name: 'Touch Tablets',
    area_key: 'sensorial',
    category: 'Touch Sense',
    visual_description: 'SET OF SMALL WOODEN TABLETS (squares, approximately 3cm × 3cm, similar SIZE to color box tablets but WITH TEXTURED MATERIALS MOUNTED on the tablet surface). Each tablet features a DIFFERENT TEXTURED MATERIAL glued or mounted on the wooden base: ROUGH SANDPAPER (several grit variations), MEDIUM CLOTH (canvas, burlap), SMOOTH SILK (glossy finish), SATIN (subtle sheen), VELVET (plush pile, visually FUZZY), LINEN (slightly textured), and other tactile variations. 6-12 TEXTURE GRADATIONS represented (typically 6-12 pairs of identical texture tablets). SMALL PORTABLE SIZE allows blindfolding and hands-on exploration. Child (often blindfolded) touching tablets with fingertips to DISCRIMINATE TEXTURES, matching PAIRED identical textures through TOUCH ALONE. Without visual input, the tactile differences become ACUTE. From photographs, the TEXTURE VARIETY is VISUALLY OBVIOUS — sandpaper tablets show granular appearance, velvet tablets show fuzzy pile, silk tablets show glossy sheen. This is INTERMEDIATE texture work (3-4 years) building on Touch Boards. The MOUNTED MATERIALS on small tablets create the distinctive visual appearance.',
    key_materials: ['wooden tablets (3×3cm)', 'sandpaper/cloth/silk/velvet surfaces', 'texture gradation', 'mounted/glued materials', 'portable set (often in wooden box)'],
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
    visual_description: 'SET OF SMALL GLASS OR PLASTIC BOTTLES (opaque construction to prevent visual identification, approximately 2-3 inches tall = 5-7cm). Each bottle has a COLORED PLASTIC CAP OR LID (red, blue, yellow, green caps creating color-coding) which is REMOVABLE for sniffing. Bottles are SEALED with caps when not in use to preserve scent. Interior contains COTTON SWABS or ABSORBENT PADS SOAKED WITH AROMATIC SOLUTIONS: lemon juice, vanilla extract, rose water, mint essential oil, orange extract, coffee scent, cinnamon, eucalyptus, and other familiar aromatics. Set is organized in PAIRS — two bottles containing the SAME SCENT (for matching work). Bottles are OPAQUE (cannot see contents) forcing reliance on OLFACTORY SENSE alone — child removes cap, SNIFFS bottle, and matches pairs by smell (often blindfolded to eliminate visual cues). From photographs, the COLORED CAPS and BOTTLE ARRAY are visually distinctive. The SEALED-WHEN-STORED appearance shows closed caps. This work isolates the SENSE OF SMELL from visual input, requiring pure olfactory discrimination (3-4 years).',
    key_materials: ['glass/plastic bottles (6-12 pairs)', 'colored caps (red/blue/yellow/green)', 'scented cotton swabs inside', 'sealed containers', 'opaque construction'],
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
    visual_description: 'SET OF SMALL GLASS BOTTLES with COLORED LIDS OR CAPS (white, red, blue, yellow caps for color-coding and organization) containing TASTE SOLUTIONS on COTTON SWABS or accessible via SMALL DROPPER. Bottles contain FOUR TO SIX BASIC TASTE CATEGORIES (fundamental taste families that all humans perceive the same way): SWEET (sugar water, honey solution, mild and pleasant), SALTY (salt solution, savory), BITTER (dilute herbal infusion, tonic water, strong and astringent), SOUR (lemon juice, vinegar, tart and acidic), and sometimes BLAND (pure distilled water, no taste). Set organized in PAIRS — two bottles of each taste type. Child carefully placing small COTTON SWAB on tongue or placing SMALL DROPS on tongue to DISCRIMINATE and MATCH taste families. Solutions are SAFE, DILUTED CONCENTRATIONS appropriate for children (not concentrated or caustic). From photographs, COLORED CAPS and GLASS BOTTLES with visible SOLUTIONS INSIDE are distinctive. The TASTE DISCRIMINATION work is pure GUSTATORY SENSE requiring systematic oral exploration (3-4 years). TASTE MATCHING develops understanding of the five fundamental tastes.',
    key_materials: ['glass bottles', 'colored caps (white/red/blue/yellow)', 'taste solution cotton swabs', '4-6 taste pairs (sweet/salty/bitter/sour/bland)', 'safe diluted solutions'],
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
    visual_description: 'SET OF SMALL WOODEN BOXES WITH FITTED LIDS (typically painted RED or NATURAL WOOD COLOR, approximately 2 inches × 2 inches = 5cm × 5cm cubes). Each box is SEALED with a LID that CANNOT be opened by children — interior contents are completely HIDDEN. Inside each box are NOISE-MAKING MATERIALS creating DISTINCTIVE SOUNDS when shaken: GRAINS (white rice, brown rice, lentils), METAL OBJECTS (small bells, metal beads, screws, coins), PEBBLES and STONES, SHELLS, DRIED BEANS and SEEDS, and SAND or SUGAR. Sounds range from HIGH-PITCHED TINKLING (bells, metal) to LOW-PITCHED RATTLING (stones, beans) to WHOOSHING (sand). Set organized in PAIRS — two boxes containing IDENTICAL SOUND-MAKING MATERIAL. Child SHAKING boxes and LISTENING intently to match pairs by AUDITORY DISCRIMINATION alone (often blindfolded to eliminate visual identification). The SEALED LIDS prevent visual inspection of contents — pure AUDITORY SENSE. From photographs, the WOODEN BOXES and LIDS are visible but contents are hidden. This is PURE SOUND WORK requiring sophisticated auditory discrimination and memory (3-5 years).',
    key_materials: ['wooden boxes (5×5cm, 6+ pairs)', 'sealed lids (cannot open)', 'various rattle contents (grains/metal/stones/shells/beans)', 'red/natural wood finish', 'paired identical sounds'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_bells',
    name: 'Montessori Bells',
    area_key: 'sensorial',
    category: 'Auditory Sense',
    visual_description: 'SET OF 13 OR MORE TUNED METAL BELLS (bronze or brass construction, SHINY METALLIC FINISH) mounted on WOODEN HANDLES or arranged in a WOODEN FRAME/STAND. Each bell is PRECISELY TUNED to produce a SPECIFIC MUSICAL PITCH — set spans 2-3 OCTAVES of musical notes covering the range from very LOW TONES (approximately 200 Hz, deep and resonant) to very HIGH TONES (approximately 1600+ Hz, bright and piercing). Bells are arranged in PITCH ORDER left-to-right (lowest note to highest note). SET INCLUDES WOODEN MALLETS (small hammers or strikers) for striking bells. Child STRIKING individual bells with mallets to create clear, SUSTAINED TONES, LISTENING to pitch differences, sometimes arranging bells in order from lowest to highest pitch (advanced work). From photographs, the SHINY METAL BELLS arranged in the wooden frame/stand are visually striking. The MALLET (wooden striker) visible in hand of child creating the sound. This work develops ABSOLUTE PITCH DISCRIMINATION and introduces MUSIC FUNDAMENTALS through PURE AUDITORY EXPERIENCE (3-5 years). The bells produce BEAUTIFUL, PURE TONES that are instantly recognizable.',
    key_materials: ['tuned metal bells (13+)', 'wooden handles or frame/stand', 'wooden mallets (strikers)', 'pitch range (low to high, 2-3 octaves)', 'bronze/brass metallic construction'],
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
    visual_description: 'OPAQUE FABRIC BAG made of THICK, NON-TRANSPARENT CLOTH (typically RED BURLAP or DARK CANVAS, approximately 8 inches × 8 inches = 20cm × 20cm cube-shaped). Bag has SECURE CLOSURE AT TOP (drawstring cord, velcro strip, or elastic band) preventing child from peeking inside or accidentally spilling contents. Bag is completely OPAQUE — light cannot pass through. Interior contains DIVERSE ASSORTMENT OF OBJECTS WITH DIFFERENT SHAPES, SIZES, AND TEXTURES: WOODEN GEOMETRIC SHAPES (cubes, spheres, pyramids), BEADS (wooden, glass, plastic in various sizes), CLOTH SCRAPS (silk, velvet, cotton), RUBBER OBJECTS (balls, animals), METAL ITEMS (bells, chains, coins), NATURAL MATERIALS (shells, stones, pine cones, sticks), and EVERYDAY OBJECTS (spoons, blocks, marbles). Child INSERTING HAND INTO BAG (often BLINDFOLDED for additional sensory isolation), FEELING AND IDENTIFYING OBJECTS BY TOUCH ALONE without visual input. Requires SOPHISTICATED TACTILE DISCRIMINATION and SPATIAL REASONING. From photographs, the OPAQUE FABRIC BAG with closure and contents partially visible (or hidden with blindfold) shows the pure TACTILE LEARNING environment. This is ADVANCED EXPLORATORY SENSORIAL work (4-5 years) emphasizing kinesthetic learning and spatial understanding.',
    key_materials: ['opaque fabric bag (thick cloth)', 'drawstring/velcro closure', 'diverse textured objects inside', 'multiple shape variety', 'pure tactile focus (vision excluded)'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_sorting_grains',
    name: 'Sorting Grains',
    area_key: 'sensorial',
    category: 'Exploratory Sensorial',
    visual_description: 'WOODEN TRAY (approximately 12 inches × 16 inches = 30cm × 40cm) with COMPARTMENTED SECTIONS or multiple WOODEN BOWLS arranged on the tray. Central section or LARGE MIXING BOWL contains MIXED GRAINS — a COMBINED ASSORTMENT of 6-8 DIFFERENT GRAIN TYPES. Grains are VISUALLY DISTINCT by COLOR and SHAPE: WHITE RICE (small white elongated grains), BROWN RICE (larger tan grains), RED LENTILS (small red round), BROWN LENTILS (darker), BLACK BEANS (large black), WHITE BEANS (large white), MILLET (tiny yellow seeds), CHICKPEAS (medium brown), PASTA SHAPES (various), SEEDS (sunflower, pumpkin). Surrounding the central mixed pile are EMPTY WOODEN BOWLS (4-8 bowls for sorting destinations). Child using SPOON or TWEEZERS to carefully SORT and SEPARATE the mixed grains into INDIVIDUAL BOWLS by type — white rice together, brown rice together, red lentils together, etc. The FINE MOTOR SKILL required (precise scooping or gripping with tweezers) combined with VISUAL DISCRIMINATION of grain types creates a MULTI-SENSORY LEARNING EXPERIENCE. From photographs, the WOODEN TRAY with COLORFUL GRAINS and MULTIPLE BOWLS is visually distinctive. The CHILD\'S HANDS using SPOON or TWEEZERS show the delicate manipulation. This work develops CONCENTRATION, FINE MOTOR SKILLS, and VISUAL DISCRIMINATION (2-4 years).',
    key_materials: ['wooden tray (30×40cm)', 'wooden bowls (4-8)', 'mixed grains (6-8 types)', 'spoon or tweezers', 'distinct grain varieties and colors'],
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
    visual_description: 'SET OF IDENTICAL-APPEARING WOODEN SQUARE TABLETS (approximately 3-4cm × 3-4cm × 0.5cm, similar SIZE and SHAPE to COLOR BOX tablets, painted a UNIFORM SINGLE COLOR — typically tan, beige, or pale yellow, all tablets painted identically). From visual inspection, tablets appear COMPLETELY IDENTICAL with no discernible difference in size, shape, color, or paint finish. BUT EACH TABLET CONTAINS HIDDEN INTERNAL WEIGHTS (lead weights, metal pellets, or sand sealed inside the wooden shell) creating DRAMATICALLY DIFFERENT WEIGHTS despite IDENTICAL APPEARANCE. 6-9 PAIRS of tablets — two tablets of each weight class (lightest pair, light pair, medium pair, heavy pair, heaviest pair, etc.). Child LIFTING and HOLDING tablets, COMPARING WEIGHT using KINESTHETIC SENSE (barometric sense) alone — eyes closed or tablet hidden in bag. Tablets feel SURPRISINGLY DIFFERENT in WEIGHT despite looking identical. Child arranging tablets in order from LIGHTEST to HEAVIEST by feel alone. From photographs, the IDENTICAL-LOOKING TABLETS are distinctive because they look uniform but child\'s hands show the evident effort/ease of lifting indicating weight difference. This is PURE WEIGHT DISCRIMINATION work requiring kinesthetic sensitivity (4-5 years).',
    key_materials: ['wooden square tablets (3-4cm, 6-9 pairs)', 'hidden internal weights', 'identical external appearance', 'different densities inside', 'kinesthetic discrimination focus'],
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
    visual_description: 'WOODEN SQUARE TABLETS (similar size to BARIC and COLOR tablets, approximately 3-4cm × 3-4cm) made from DIFFERENT MATERIALS with DIFFERENT THERMAL CONDUCTIVITY PROPERTIES. Tablets feature DIFFERENT MATERIAL INLAYS or CONSTRUCTION: some tablets are PURE WOOD (poor heat conductor, insulating), some have METAL INLAYS or METAL BACKING (excellent heat conductor, feels COLD), some feature CERAMIC TILES (moderate conductor), some have PLASTIC or RUBBER (poor conductor), and some use STONE or GLASS (moderate to excellent conductors). EXTERNAL APPEARANCE is largely IDENTICAL or very SIMILAR — cannot reliably identify material by sight. Tablets range in thermic properties from INSULATING (feels warm/neutral) to HIGHLY CONDUCTING (feels notably COLD when touched). 6 PAIRS of identical thermic property tablets. Child TOUCHING tablets with open hand or fingertips, FEELING dramatic TEMPERATURE DIFFERENCES (some feel warm, some feel cold, some feel neutral) without relying on visual input. The HEAT TRANSFER PROPERTIES create the sensory discrimination — metal feels COLDEST because thermal energy rapidly transfers from hand to metal, while wood feels warmer because it insulates. From photographs, the TABLET ARRANGEMENT is visible but temperature difference is not apparent without tactile exploration. This is PURE THERMIC SENSE work (4-5 years) exploiting heat physics.',
    key_materials: ['wooden tablets (3-4cm)', 'metal/ceramic/plastic/stone inlays', 'different thermal conductivity', '6 pairs', 'temperature-based discrimination (insulating to highly conducting)'],
    confusion_pairs: [],
    difficulty: 'hard',
  },

  {
    work_key: 'se_thermic_bottles',
    name: 'Thermic Bottles',
    area_key: 'sensorial',
    category: 'Thermic Sense',
    visual_description: 'GLASS OR METAL BOTTLES/CONTAINERS (approximately 3-4 inches tall = 8-10cm, IDENTICAL EXTERNAL APPEARANCE, no color coding or markings to indicate contents). Bottles are FILLED WITH WATER AT THREE DISTINCTLY DIFFERENT TEMPERATURES: COLD WATER (near freezing, approximately 4°C / 39°F, ICE-COLD to touch), ROOM TEMPERATURE WATER (neutral, approximately 20°C / 68°F, neither warm nor cold), and WARM WATER (heated, approximately 40-45°C / 104-113°F, noticeably WARM). The TEMPERATURE DIFFERENCE is DRAMATIC and IMMEDIATELY OBVIOUS upon touch. 3-6 PAIRS of identical bottles (two ice-cold, two room-temperature, two warm). No color coding or visual indicators — bottles look COMPLETELY IDENTICAL from external appearance. Child PICKING UP and HOLDING bottles, FEELING the DRAMATIC TEMPERATURE DIFFERENCE between them. Bottles can be arranged in order from COLDEST to WARMEST. From photographs, the GLASS BOTTLES appear identical, but observation of child\'s facial expressions, hand grip, or thermal imaging would show the temperature discrimination. This is PURE THERMIC SENSE WORK using obvious temperature gradients (2-4 years).',
    key_materials: ['glass/metal bottles (identical appearance)', 'water at different temperatures', 'cold/room/warm water', '3-6 pairs', 'clear temperature gradations'],
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
    visual_description: 'LARGE WOODEN TRAY (approximately 14 inches × 18 inches = 35cm × 45cm) with COMPARTMENTED SECTIONS or multiple WOODEN BOWLS/CONTAINERS arranged on the surface. Tray contains a DIVERSE MIXED COLLECTION OF EVERYDAY OBJECTS AND NATURAL MATERIALS: BUTTONS (various sizes — 1cm to 3cm diameter, various colors, various materials — wood, plastic, mother-of-pearl), BEADS (wooden, glass, plastic, various shapes and colors), SHELLS (scallop, conch, small seashells, various sizes), SEEDS (sunflower seeds, pumpkin seeds, sesame), POLISHED PEBBLES (smooth stones, various colors), NATURAL MATERIALS (moss, dried leaves, small twigs, bark pieces), and FOUND OBJECTS (feathers, small pine cones, smooth driftwood). Objects are MIXED TOGETHER in central section. Empty COMPARTMENTS or BOWLS surround for SORTING DESTINATIONS. Child engaging in OPEN-ENDED SORTING using MULTIPLE POSSIBLE CLASSIFICATION SYSTEMS: sorting by COLOR (all red objects together), by SIZE (small vs large), by MATERIAL (natural vs human-made), by TEXTURE (smooth vs rough), by SHAPE (round vs angular), or by FUNCTION. This EXPLORATORY WORK develops ADVANCED CLASSIFICATION SKILLS and FLEXIBLE THINKING. From photographs, the COLORFUL MIXED OBJECTS and MULTIPLE COMPARTMENTS show the open-ended exploration. This develops CRITICAL THINKING and OBSERVATION SKILLS (3-5 years).',
    key_materials: ['wooden tray (35×45cm)', 'buttons/beads/shells/seeds/pebbles/natural items', 'multiple bowl compartments', 'varied materials', 'multiple classification schemes possible'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  {
    work_key: 'se_superimposed_geometric_figures',
    name: 'Superimposed Geometric Figures',
    area_key: 'sensorial',
    category: 'Visual Sense - Form',
    visual_description: 'SET OF FLAT 2D GEOMETRIC SHAPES (WOODEN or PAINTED METAL, NOT 3D solids) representing DIFFERENT GEOMETRIC FAMILIES in MULTIPLE SIZE VARIATIONS. Geometric families might include: CIRCLES (5-10 sizes graduating from 3cm to 15cm diameter), SQUARES (5-10 sizes graduating by side length), TRIANGLES (5-10 sizes), RECTANGLES, HEXAGONS, and other polygons. Each geometric family shows PROGRESSIVE SIZE INCREASE while maintaining the SAME SHAPE. Shapes are DESIGNED TO LAYER/STACK — placing smaller shapes inside or atop larger shapes shows the size relationship and VISUAL PROGRESSION. When stacked, larger shapes create "frames" or "borders" around smaller inner shapes, visually demonstrating the SCALING CONCEPT. Shapes are FLAT (not 3D), painted BRIGHT DISTINCT COLORS or METALLIC finish to highlight shape visibility. Child OVERLAYING shapes to visualize GEOMETRIC SCALING RELATIONSHIPS and SIZE GRADATION, discovering mathematical proportions through visual experience. From photographs, the STACKED or OVERLAID SHAPES showing size progression are visually striking and distinctive. This work introduces GEOMETRIC CONCEPTS and MATHEMATICAL RELATIONSHIPS (3-4 years).',
    key_materials: ['flat geometric shapes (wood/metal)', 'progressive size variations (5-10 per shape type)', 'overlayable design', 'bright colors or metallic finish', 'multiple geometric families'],
    confusion_pairs: [],
    difficulty: 'medium',
  },

  {
    work_key: 'se_fabric_matching',
    name: 'Fabric Matching',
    area_key: 'sensorial',
    category: 'Touch Sense',
    visual_description: 'COLLECTION OF SOFT FABRIC SWATCHES mounted on THIN CARDSTOCK or lightweight WOODEN BACKING CARDS (approximately 4cm × 4cm or 5cm × 5cm). Fabrics represent DIVERSE TEXTILE MATERIALS with DISTINCTLY DIFFERENT WEAVES, TEXTURES, and VISUAL APPEARANCE: SILK (smooth, glossy sheen, light-reflecting), COTTON (matte, soft, slightly nubby), WOOL (slightly fuzzy or napped, warm tactile feel), LINEN (slightly rough, visible weave texture), VELVET (plush pile, deeply textured, visually fuzzy), BURLAP (coarse, rough woven, open weave), SATIN (glossy, smooth, silky), DENIM (sturdy, visible weave texture), CORDUROY (ribbed texture, ridged), and other natural and synthetic textiles. 6-12 PAIRS of identical fabric samples (two cards with each fabric type). CRITICAL DISTINCTION from COLOR BOXES: these are SOFT TEXTILE MATERIALS (not rigid painted wood), emphasizing MATERIAL TEXTURE and FABRIC CHARACTERISTICS rather than COLOR MATCHING. Child TOUCHING and FEELING fabrics, COMPARING by texture, and MATCHING IDENTICAL PAIRS through tactile and visual discrimination. From photographs, the FABRIC VARIETY and DIFFERENT WEAVE PATTERNS are visually obvious — silks look glossy, velvet looks fuzzy, burlap looks coarse and open-weave. This work teaches MATERIAL DISCRIMINATION and TEXTILE APPRECIATION (3-4 years).',
    key_materials: ['fabric swatches (silk/cotton/wool/linen/velvet/burlap/satin)', 'mounted on cardstock backing', 'different weaves and textures visible', '6-12 pairs', 'soft textile materials (not rigid painted wood)'],
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
