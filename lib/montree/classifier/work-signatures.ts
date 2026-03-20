/**
 * Work Signatures Database
 *
 * Enriched text descriptions for ALL 329 Montessori works across 5 areas.
 * Optimized for CLIP/SigLIP text embedding matching in visual identification.
 *
 * Each signature describes WHAT IS VISIBLE in a photo, not what the work teaches.
 * Examples:
 * - "A child stacking ten graduated pink wooden cubes from largest to smallest"
 * - "A small glass pipette with rubber bulb transferring colored liquid between bowls"
 * - "A child tracing textured rough letters on wooden boards with fingertips"
 *
 * Generated: March 20, 2026
 * Source: 5 curriculum JSON files + visual ID guide from photo-insight/route.ts
 */

export interface WorkSignature {
  /** Unique work identifier from curriculum JSON (e.g., "pl_carrying_mat") */
  work_key: string;

  /** Exact curriculum name from JSON */
  name: string;

  /** Area key: "practical_life" | "sensorial" | "mathematics" | "language" | "cultural" */
  area_key: "practical_life" | "sensorial" | "mathematics" | "language" | "cultural";

  /** Category within the area (e.g., "Preliminary Exercises", "Visual Sense - Dimension") */
  category: string;

  /**
   * Rich visual description for CLIP embedding (2-3 sentences).
   * Focus on: materials, colors, size relationships, what child is doing with it.
   * NOT what it teaches or developmental benefits.
   */
  visual_description: string;

  /** Primary visual identifiers / key materials visible in photos */
  key_materials: string[];

  /** work_keys of similar-looking materials that could cause confusion */
  confusion_pairs?: string[];

  /** How hard it is to visually identify from photo alone */
  difficulty: "easy" | "medium" | "hard";
}

// ============================================================================
// PRACTICAL LIFE AREA (Green theme, 🌱)
// ============================================================================

const PRACTICAL_LIFE_SIGNATURES: WorkSignature[] = [
  {
    work_key: "pl_carrying_mat",
    name: "Carrying a Mat",
    area_key: "practical_life",
    category: "Preliminary Exercises",
    visual_description:
      "A child holding a rolled or unrolled fabric mat with both hands, carrying it horizontally at chest height or unrolling it on the floor. The mat is typically a small rectangular cloth about 1-2 feet wide.",
    key_materials: ["Cloth mat", "Child's hands"],
    difficulty: "easy",
  },
  {
    work_key: "pl_carrying_objects",
    name: "Carrying Objects",
    area_key: "practical_life",
    category: "Preliminary Exercises",
    visual_description:
      "A child carefully carrying small objects such as baskets, trays, or containers with both hands, walking slowly with controlled movements.",
    key_materials: ["Small objects", "Tray or basket"],
    difficulty: "easy",
  },
  {
    work_key: "pl_rolling_rolling_pin",
    name: "Rolling with a Rolling Pin",
    area_key: "practical_life",
    category: "Preliminary Exercises",
    visual_description:
      "A child using a small wooden rolling pin to roll clay or dough on a work mat, making circular motions with both hands.",
    key_materials: ["Rolling pin", "Clay or dough", "Mat"],
    difficulty: "medium",
  },
  {
    work_key: "pl_folding_cloths",
    name: "Folding Cloths",
    area_key: "practical_life",
    category: "Preliminary Exercises",
    visual_description:
      "A child folding fabric cloths or napkins into halves, quarters, or triangles, working on a table or mat with focused hand movements.",
    key_materials: ["Cloth napkins or towels"],
    difficulty: "easy",
  },
  {
    work_key: "pl_walking_line",
    name: "Walking the Line",
    area_key: "practical_life",
    category: "Preliminary Exercises",
    visual_description:
      "A child walking slowly along a painted or tape-marked line on the floor, often with arms extended or carrying objects for balance and coordination.",
    key_materials: ["Line on floor"],
    difficulty: "easy",
  },
  {
    work_key: "pl_spooning",
    name: "Spooning",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Self",
    visual_description:
      "A child using a small metal or wooden spoon to transfer dry materials (rice, beans, pasta) or liquid between bowls or containers on a tray.",
    key_materials: ["Spoon", "Two bowls", "Dry materials or liquid"],
    confusion_pairs: ["pl_pouring_liquid"],
    difficulty: "medium",
  },
  {
    work_key: "pl_pouring_liquid",
    name: "Pouring Liquid",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Self",
    visual_description:
      "A child pouring liquid (water, juice, milk) from a small pitcher into a cup or glass on a tray, tilting the pitcher carefully with control.",
    key_materials: ["Pitcher", "Cup or glass", "Liquid"],
    confusion_pairs: ["pl_spooning"],
    difficulty: "medium",
  },
  {
    work_key: "pl_pouring_dry",
    name: "Pouring Dry Materials",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Self",
    visual_description:
      "A child pouring dry grains, seeds, or beans from one container to another using careful hand control, on a tray to contain spills.",
    key_materials: ["Two containers", "Dry grains or beans"],
    difficulty: "medium",
  },
  {
    work_key: "pl_eye_dropper",
    name: "Eye Dropper",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Self",
    visual_description:
      "A child using a small glass pipette with a rubber bulb (or dropper) to transfer colored water drops one at a time between bowls, using a precise three-finger grip.",
    key_materials: ["Glass pipette with rubber bulb", "Colored liquid", "Bowls"],
    confusion_pairs: ["pl_baster"],
    difficulty: "hard",
  },
  {
    work_key: "pl_baster",
    name: "Baster",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Self",
    visual_description:
      "A child using a large turkey-style baster (rubber bulb with wide plastic or glass tube) to draw up and release colored water into containers.",
    key_materials: ["Baster (large)", "Colored water", "Containers"],
    confusion_pairs: ["pl_eye_dropper"],
    difficulty: "medium",
  },
  {
    work_key: "pl_sponging",
    name: "Sponging",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Self",
    visual_description:
      "A child using a small natural sea sponge to transfer water from one bowl to another, squeezing the sponge over containers on a tray.",
    key_materials: ["Sponge", "Water", "Bowls"],
    difficulty: "medium",
  },
  {
    work_key: "pl_dish_washing",
    name: "Dish Washing",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Self",
    visual_description:
      "A child washing dishes (bowls, plates, utensils) in a basin with soapy water using a brush or cloth, rinsing in clean water, and drying on a rack.",
    key_materials: ["Basin", "Soapy water", "Dishes", "Brush"],
    confusion_pairs: ["pl_table_scrubbing"],
    difficulty: "medium",
  },
  {
    work_key: "pl_table_scrubbing",
    name: "Table Scrubbing",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Self",
    visual_description:
      "A child scrubbing a small wooden table or tray with a stiff brush and soapy water, using circular motions to clean the surface. Dishes NOT visible on table.",
    key_materials: ["Table or tray", "Brush", "Soapy water"],
    confusion_pairs: ["pl_dish_washing"],
    difficulty: "medium",
  },
  {
    work_key: "pl_sweeping",
    name: "Sweeping",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Environment",
    visual_description:
      "A child using a small child-sized broom with a dustpan to sweep up dried materials (beans, rice, sand) from the floor, collecting it into the pan.",
    key_materials: ["Small broom", "Dustpan"],
    difficulty: "easy",
  },
  {
    work_key: "pl_dusting",
    name: "Dusting",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Environment",
    visual_description:
      "A child using a soft cloth or duster to wipe dust from shelves, tables, or objects in the classroom, using gentle circular motions.",
    key_materials: ["Soft cloth or duster"],
    difficulty: "easy",
  },
  {
    work_key: "pl_window_washing",
    name: "Window Washing",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Environment",
    visual_description:
      "A child washing a small window pane or mirror with a cloth and soapy water, then drying it with a squeegee or dry cloth.",
    key_materials: ["Window or mirror", "Cloth", "Water"],
    difficulty: "easy",
  },
  {
    work_key: "pl_polishing",
    name: "Polishing",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Environment",
    visual_description:
      "A child polishing metal, wood, or brass objects with a cloth and polish, using circular or linear rubbing motions to create shine.",
    key_materials: ["Metal or brass objects", "Cloth", "Polish"],
    difficulty: "easy",
  },
  {
    work_key: "pl_arranging_flowers",
    name: "Arranging Flowers",
    area_key: "practical_life",
    category: "Practical Exercises - Care of Environment",
    visual_description:
      "A child arranging fresh flowers in a vase with water, cutting stems with scissors, and adjusting placement for aesthetic appeal.",
    key_materials: ["Fresh flowers", "Vase", "Water", "Scissors"],
    difficulty: "easy",
  },
  {
    work_key: "pl_button_frame",
    name: "Button Frame",
    area_key: "practical_life",
    category: "Practical Exercises - Dressing Frames",
    visual_description:
      "A child buttoning large buttons through button holes on a wooden frame with two fabric panels, practiced repeatedly to master the motion.",
    key_materials: ["Wooden frame", "Large buttons", "Button holes"],
    confusion_pairs: ["pl_snap_frame", "pl_buckle_frame", "pl_zipper_frame"],
    difficulty: "medium",
  },
  {
    work_key: "pl_snap_frame",
    name: "Snap Frame",
    area_key: "practical_life",
    category: "Practical Exercises - Dressing Frames",
    visual_description:
      "A child fastening large metal snaps (press studs) through fabric on a wooden frame by pressing the two pieces together repeatedly.",
    key_materials: ["Wooden frame", "Large metal snaps", "Fabric"],
    confusion_pairs: ["pl_button_frame", "pl_buckle_frame"],
    difficulty: "easy",
  },
  {
    work_key: "pl_buckle_frame",
    name: "Buckle Frame",
    area_key: "practical_life",
    category: "Practical Exercises - Dressing Frames",
    visual_description:
      "A child fastening a large buckle closure on a wooden frame with fabric straps, sliding the strap through the buckle and securing it.",
    key_materials: ["Wooden frame", "Large buckle", "Fabric strap"],
    confusion_pairs: ["pl_button_frame", "pl_snap_frame"],
    difficulty: "medium",
  },
  {
    work_key: "pl_zipper_frame",
    name: "Zipper Frame",
    area_key: "practical_life",
    category: "Practical Exercises - Dressing Frames",
    visual_description:
      "A child opening and closing a large zipper on a wooden frame with fabric panels on both sides, using a oversized tab for easy manipulation.",
    key_materials: ["Wooden frame", "Large zipper", "Fabric panels"],
    confusion_pairs: ["pl_button_frame", "pl_snap_frame"],
    difficulty: "easy",
  },
  {
    work_key: "pl_lacing_frame",
    name: "Lacing Frame",
    area_key: "practical_life",
    category: "Practical Exercises - Dressing Frames",
    visual_description:
      "A child threading a cord or lace through holes on a wooden frame with fabric, using a lacing pattern to develop fine motor control.",
    key_materials: ["Wooden frame", "Cord or lace", "Holes"],
    difficulty: "hard",
  },
  {
    work_key: "pl_bow_frame",
    name: "Bow Tying Frame",
    area_key: "practical_life",
    category: "Practical Exercises - Dressing Frames",
    visual_description:
      "A child tying a bow using two cords attached to a wooden frame, practicing the pulling and looping motions to create a perfect bow knot.",
    key_materials: ["Wooden frame", "Two cords with large handles", "Knot"],
    difficulty: "hard",
  },
  {
    work_key: "pl_hook_eye_frame",
    name: "Hook and Eye Frame",
    area_key: "practical_life",
    category: "Practical Exercises - Dressing Frames",
    visual_description:
      "A child fastening large metal hooks and eyes on a wooden frame with fabric, connecting the hook to the eye loop repeatedly.",
    key_materials: ["Wooden frame", "Large metal hooks and eyes", "Fabric"],
    confusion_pairs: ["pl_button_frame"],
    difficulty: "medium",
  },
  {
    work_key: "pl_weaving",
    name: "Weaving",
    area_key: "practical_life",
    category: "Practical Exercises - Other Fine Motor",
    visual_description:
      "A child weaving colored yarn or strips of fabric through horizontal strings on a wooden loom frame, creating a woven pattern.",
    key_materials: ["Loom frame", "Yarn or fabric strips", "Warp strings"],
    difficulty: "hard",
  },
  {
    work_key: "pl_knot_tying",
    name: "Knot Tying",
    area_key: "practical_life",
    category: "Practical Exercises - Other Fine Motor",
    visual_description:
      "A child tying various knots using ropes or cords of different thicknesses, practicing overhand knots, square knots, or other rope knots.",
    key_materials: ["Ropes or cords"],
    difficulty: "medium",
  },
  {
    work_key: "pl_clipboard",
    name: "Clipboard",
    area_key: "practical_life",
    category: "Practical Exercises - Other Fine Motor",
    visual_description:
      "A child using a clipboard with a spring clamp to hold paper and write or draw on it, learning to secure and release paper.",
    key_materials: ["Clipboard", "Paper", "Spring clamp"],
    difficulty: "easy",
  },
];

// ============================================================================
// SENSORIAL AREA (Orange theme, 👁️)
// ============================================================================

const SENSORIAL_SIGNATURES: WorkSignature[] = [
  {
    work_key: "se_pink_tower",
    name: "Pink Tower",
    area_key: "sensorial",
    category: "Visual Sense - Dimension",
    visual_description:
      "A child stacking ten graduated pink wooden cubes from largest (10cm³) at bottom to smallest (1cm³) at top in a perfect tower. All cubes are uniformly painted pink wood.",
    key_materials: ["Pink wooden cubes", "Ten different sizes", "1cm³ to 10cm³"],
    confusion_pairs: ["se_red_rods", "se_brown_stair"],
    difficulty: "easy",
  },
  {
    work_key: "se_brown_stair",
    name: "Brown Stair",
    area_key: "sensorial",
    category: "Visual Sense - Dimension",
    visual_description:
      "A child stacking ten graduated brown wooden rectangular prisms. Each is the same length but varies in width and height, creating a stair-step profile when stacked.",
    key_materials: ["Brown wooden prisms", "Ten different widths"],
    confusion_pairs: ["se_pink_tower", "se_red_rods"],
    difficulty: "easy",
  },
  {
    work_key: "se_red_rods",
    name: "Red Rods",
    area_key: "sensorial",
    category: "Visual Sense - Dimension",
    visual_description:
      "A child arranging ten long red painted wooden rods (10cm to 1 meter in length). ALL RODS ARE SOLID RED with no colored sections (unlike Number Rods which have blue).",
    key_materials: ["Red wooden rods", "Ten different lengths"],
    confusion_pairs: ["ma_number_rods", "se_pink_tower", "se_brown_stair"],
    difficulty: "easy",
  },
  {
    work_key: "se_cylinder_block_1",
    name: "Cylinder Block 1",
    area_key: "sensorial",
    category: "Visual Sense - Dimension",
    visual_description:
      "A child placing ten wooden cylinders with knobs into holes in a wooden block. Cylinders vary in DIAMETER ONLY (same height), requiring the child to find the correct hole for each.",
    key_materials: ["Wooden block with holes", "Ten cylinders with knobs"],
    confusion_pairs: ["se_cylinder_block_2", "se_cylinder_block_3", "se_cylinder_block_4", "se_knobless_cylinders"],
    difficulty: "medium",
  },
  {
    work_key: "se_cylinder_block_2",
    name: "Cylinder Block 2",
    area_key: "sensorial",
    category: "Visual Sense - Dimension",
    visual_description:
      "A child placing ten wooden cylinders with knobs into holes in a wooden block. Cylinders vary in HEIGHT ONLY (same diameter), arranged from tallest to shortest.",
    key_materials: ["Wooden block with holes", "Ten cylinders with knobs"],
    confusion_pairs: ["se_cylinder_block_1", "se_cylinder_block_3", "se_cylinder_block_4"],
    difficulty: "medium",
  },
  {
    work_key: "se_cylinder_block_3",
    name: "Cylinder Block 3",
    area_key: "sensorial",
    category: "Visual Sense - Dimension",
    visual_description:
      "A child placing ten wooden cylinders with knobs into holes in a wooden block. Cylinders vary in BOTH HEIGHT AND DIAMETER IN THE SAME DIRECTION (tallest is widest).",
    key_materials: ["Wooden block with holes", "Ten cylinders with knobs"],
    confusion_pairs: ["se_cylinder_block_1", "se_cylinder_block_2", "se_cylinder_block_4"],
    difficulty: "hard",
  },
  {
    work_key: "se_cylinder_block_4",
    name: "Cylinder Block 4",
    area_key: "sensorial",
    category: "Visual Sense - Dimension",
    visual_description:
      "A child placing ten wooden cylinders with knobs into holes in a wooden block. Cylinders vary in HEIGHT AND DIAMETER IN OPPOSITE DIRECTIONS (tallest is narrowest).",
    key_materials: ["Wooden block with holes", "Ten cylinders with knobs"],
    confusion_pairs: ["se_cylinder_block_1", "se_cylinder_block_2", "se_cylinder_block_3"],
    difficulty: "hard",
  },
  {
    work_key: "se_cylinder_blocks_combined",
    name: "Cylinder Blocks Combined",
    area_key: "sensorial",
    category: "Visual Sense - Dimension",
    visual_description:
      "A child mixing cylinders from multiple blocks (1, 2, 3, 4) and reorganizing them, requiring discrimination of all four dimensional variations at once.",
    key_materials: ["Wooden blocks", "40 cylinders with knobs"],
    confusion_pairs: ["se_cylinder_block_1", "se_cylinder_block_2", "se_cylinder_block_3", "se_cylinder_block_4"],
    difficulty: "hard",
  },
  {
    work_key: "se_knobless_cylinders",
    name: "Knobless Cylinders",
    area_key: "sensorial",
    category: "Visual Sense - Dimension",
    visual_description:
      "A child arranging colored wooden cylinders WITHOUT knobs (yellow, red, green, blue boxes) on a table. Four sets of cylinders, no handles, loose on the mat.",
    key_materials: ["Colored wooden cylinders", "Yellow, red, green, blue boxes"],
    confusion_pairs: ["se_cylinder_block_1", "se_cylinder_block_2", "se_cylinder_block_3", "se_cylinder_block_4"],
    difficulty: "hard",
  },
  {
    work_key: "se_color_box_1",
    name: "Color Box 1",
    area_key: "sensorial",
    category: "Visual Sense - Color",
    visual_description:
      "Rigid flat WOODEN or PLASTIC painted color tablets, smooth glossy surface, bright saturated solid colors (red, yellow, blue). Small rectangular HARD pieces with visible paint coating, NOT fabric. Child LOOKING at colors to match pairs visually.",
    key_materials: ["Rigid painted wooden tablets", "Glossy smooth hard surface", "Bright solid colors red yellow blue"],
    confusion_pairs: ["se_color_box_2", "se_color_box_3"],
    difficulty: "easy",
  },
  {
    work_key: "se_color_box_2",
    name: "Color Box 2",
    area_key: "sensorial",
    category: "Visual Sense - Color",
    visual_description:
      "Rigid flat WOODEN or PLASTIC painted color tablets, smooth glossy surface, many different solid colors (orange, green, purple, brown, pink, white, gray, black). HARD rectangular pieces with painted surface, NOT fabric. Child LOOKING at colors to match pairs visually.",
    key_materials: ["Rigid painted wooden tablets", "Glossy smooth hard surface", "Many solid colors"],
    confusion_pairs: ["se_color_box_1", "se_color_box_3"],
    difficulty: "medium",
  },
  {
    work_key: "se_color_box_3",
    name: "Color Box 3",
    area_key: "sensorial",
    category: "Visual Sense - Color",
    visual_description:
      "Many rigid flat WOODEN or PLASTIC painted color tablets arranged in rows from light to dark, smooth glossy surface, gradations of the same color from pale to deep. HARD rectangular pieces with painted surface, NOT fabric. Child arranging colors in gradient order.",
    key_materials: ["Rigid painted wooden tablets", "Glossy smooth hard surface", "Color gradations light to dark"],
    confusion_pairs: ["se_color_box_1", "se_color_box_2"],
    difficulty: "hard",
  },
  {
    work_key: "se_geometric_cabinet",
    name: "Geometric Cabinet",
    area_key: "sensorial",
    category: "Visual Sense - Form",
    visual_description:
      "A child opening drawers in a wooden cabinet and matching flat geometric shape insets (circles, squares, triangles, ellipses, etc.) to their outline frames.",
    key_materials: ["Wooden cabinet with drawers", "Geometric shape insets"],
    confusion_pairs: ["se_geometric_solids"],
    difficulty: "medium",
  },
  {
    work_key: "se_geometric_solids",
    name: "Geometric Solids",
    area_key: "sensorial",
    category: "Visual Sense - Form",
    visual_description:
      "A child exploring 10-12 three-dimensional wooden shapes (sphere, cube, cone, cylinder, pyramid, prism, rectangular block) by rolling, stacking, and feeling them.",
    key_materials: ["3D wooden shapes", "Sphere, cube, cone, cylinder, pyramid"],
    confusion_pairs: ["se_geometric_cabinet"],
    difficulty: "easy",
  },
  {
    work_key: "se_constructive_triangles_rectangular",
    name: "Constructive Triangles - Rectangular Box",
    area_key: "sensorial",
    category: "Visual Sense - Form",
    visual_description:
      "A child assembling colored right triangles to form rectangles and other shapes. Rectangular box: primarily right triangles in the rectangular family.",
    key_materials: ["Colored wooden triangles", "Triangular pieces"],
    confusion_pairs: ["se_constructive_triangles_blue", "se_constructive_triangles_hexagonal_large"],
    difficulty: "medium",
  },
  {
    work_key: "se_constructive_triangles_blue",
    name: "Constructive Triangles - Blue Triangles Box",
    area_key: "sensorial",
    category: "Visual Sense - Form",
    visual_description:
      "A child assembling blue wooden triangles of various sizes (large equilateral triangles in blue) to form larger triangles and hexagons.",
    key_materials: ["Blue wooden triangles"],
    confusion_pairs: ["se_constructive_triangles_rectangular", "se_constructive_triangles_hexagonal_large"],
    difficulty: "medium",
  },
  {
    work_key: "se_constructive_triangles_hexagonal_large",
    name: "Constructive Triangles - Large Hexagonal Box",
    area_key: "sensorial",
    category: "Visual Sense - Form",
    visual_description:
      "A child assembling colored wooden triangles to form large hexagons and other shapes using pieces from the large hexagonal family.",
    key_materials: ["Colored wooden triangles", "Hexagonal pieces"],
    confusion_pairs: ["se_constructive_triangles_rectangular", "se_constructive_triangles_blue"],
    difficulty: "hard",
  },
  {
    work_key: "se_constructive_triangles_hexagonal_small",
    name: "Constructive Triangles - Small Hexagonal Box",
    area_key: "sensorial",
    category: "Visual Sense - Form",
    visual_description:
      "A child assembling small colored triangles to form small hexagons and other shapes using pieces from the small hexagonal family.",
    key_materials: ["Small colored wooden triangles"],
    confusion_pairs: ["se_constructive_triangles_hexagonal_large"],
    difficulty: "hard",
  },
  {
    work_key: "se_binomial_cube",
    name: "Binomial Cube",
    area_key: "sensorial",
    category: "Visual Sense - Form",
    visual_description:
      "A child assembling a colored wooden cube puzzle (8 pieces total) back into a complete cube by matching patterns. Small cube, 2×2×2 structure visible on pieces.",
    key_materials: ["Wooden cube", "8 puzzle pieces", "Pattern on lid"],
    confusion_pairs: ["se_trinomial_cube"],
    difficulty: "medium",
  },
  {
    work_key: "se_trinomial_cube",
    name: "Trinomial Cube",
    area_key: "sensorial",
    category: "Visual Sense - Form",
    visual_description:
      "A child assembling a larger colored wooden cube puzzle (27 pieces) with complex internal color patterns. Significantly larger than Binomial Cube, 3×3×3 structure.",
    key_materials: ["Large wooden cube", "27 puzzle pieces"],
    confusion_pairs: ["se_binomial_cube"],
    difficulty: "hard",
  },
  {
    work_key: "se_touch_boards",
    name: "Touch Boards",
    area_key: "sensorial",
    category: "Tactile Sense",
    visual_description:
      "A child feeling and exploring sandpaper boards divided into two halves: one rough sandpaper section and one smooth varnished section. Used with hands, often blindfolded.",
    key_materials: ["Wooden boards", "Sandpaper", "Smooth varnish"],
    confusion_pairs: ["se_touch_tablets"],
    difficulty: "easy",
  },
  {
    work_key: "se_touch_tablets",
    name: "Touch Tablets",
    area_key: "sensorial",
    category: "Tactile Sense",
    visual_description:
      "A child matching small pairs of sandpaper tablets with varying roughness grades (six pairs in a wooden box). Handles held against sandpaper surfaces.",
    key_materials: ["Wooden box", "Sandpaper tablets", "Six pairs"],
    confusion_pairs: ["se_touch_boards"],
    difficulty: "medium",
  },
  {
    work_key: "se_fabric_matching",
    name: "Fabric Matching",
    area_key: "sensorial",
    category: "Tactile Sense",
    visual_description:
      "Soft foldable CLOTH or FABRIC swatches, visible textile weave texture, muted natural colors. SOFT flexible pieces that drape and fold, NOT rigid painted tablets. Child FEELING texture with fingertips, often with eyes closed or blindfolded. Materials include silk, linen, cotton, wool — identified by TOUCH not sight.",
    key_materials: ["Soft cloth fabric swatches", "Visible textile weave texture", "Foldable flexible material"],
    difficulty: "medium",
  },
  {
    work_key: "se_baric_tablets",
    name: "Baric Tablets",
    area_key: "sensorial",
    category: "Baric (Weight) Sense",
    visual_description:
      "A child comparing sets of wooden tablets of increasing weight (light, medium, heavy) by holding them and feeling the difference in heaviness.",
    key_materials: ["Wooden tablets", "Different weights"],
    difficulty: "medium",
  },
  {
    work_key: "se_thermic_tablets",
    name: "Thermic Tablets",
    area_key: "sensorial",
    category: "Thermic (Temperature) Sense",
    visual_description:
      "A child comparing tablets made of different materials (metal, wood, cork, felt, rubber) to feel temperature conductivity—some feel cold, some warm.",
    key_materials: ["Tablets of different materials", "Metal, wood, cork, felt"],
    difficulty: "medium",
  },
  {
    work_key: "se_thermic_bottles",
    name: "Thermic Bottles",
    area_key: "sensorial",
    category: "Thermic (Temperature) Sense",
    visual_description:
      "A child comparing metal bottles filled with different temperatures of water (hot, warm, room temperature, cold), held to feel temperature differences.",
    key_materials: ["Metal bottles", "Water at different temperatures"],
    difficulty: "easy",
  },
  {
    work_key: "se_sound_boxes",
    name: "Sound Boxes",
    area_key: "sensorial",
    category: "Auditory Sense",
    visual_description:
      "A child shaking pairs of wooden cylinders with red and blue lids containing different materials (sand, beans, rice, etc.) to match sounds by ear.",
    key_materials: ["Wooden cylinders", "Red and blue lids", "12 matching pairs"],
    confusion_pairs: ["se_smelling_bottles"],
    difficulty: "medium",
  },
  {
    work_key: "se_montessori_bells",
    name: "Montessori Bells",
    area_key: "sensorial",
    category: "Auditory Sense",
    visual_description:
      "A child striking wooden bells on stands with a mallet, creating different musical notes. Usually 8-13 colored bells arranged in sequence.",
    key_materials: ["Wooden bell stands", "Mallet", "Colored bells"],
    difficulty: "easy",
  },
  {
    work_key: "se_smelling_bottles",
    name: "Smelling Bottles",
    area_key: "sensorial",
    category: "Olfactory Sense",
    visual_description:
      "A child sniffing matching pairs of small glass or plastic bottles (lids hidden) containing different scents (lemon, vanilla, cinnamon, coffee, etc.) and matching pairs by smell.",
    key_materials: ["Glass or plastic bottles", "Scented materials"],
    confusion_pairs: ["se_sound_boxes"],
    difficulty: "hard",
  },
  {
    work_key: "se_tasting_bottles",
    name: "Tasting Bottles",
    area_key: "sensorial",
    category: "Gustatory Sense",
    visual_description:
      "A child tasting different flavors (sweet, sour, salty, bitter) from small cups or bottles using a dropper or tasting stick. Often on a tray with water for rinsing.",
    key_materials: ["Small cups or bottles", "Tasting solutions"],
    difficulty: "easy",
  },
  {
    work_key: "se_mystery_bag",
    name: "Mystery Bag",
    area_key: "sensorial",
    category: "Stereognostic Sense",
    visual_description:
      "A child reaching blindfolded into a cloth bag containing small objects, identifying them by touch alone without looking.",
    key_materials: ["Cloth bag", "Small objects"],
    difficulty: "hard",
  },
  {
    work_key: "se_sorting_objects",
    name: "Sorting Objects Stereognostically",
    area_key: "sensorial",
    category: "Stereognostic Sense",
    visual_description:
      "A child blindfolded sorting objects into containers by touch, using tactile discrimination to feel shapes and textures and place them correctly.",
    key_materials: ["Objects", "Containers", "Blindfold"],
    difficulty: "hard",
  },
];

// ============================================================================
// MATHEMATICS AREA (Blue theme, 🔢)
// ============================================================================

const MATHEMATICS_SIGNATURES: WorkSignature[] = [
  {
    work_key: "ma_number_rods",
    name: "Number Rods",
    area_key: "mathematics",
    category: "Introduction to Numbers (1-10)",
    visual_description:
      "A child arranging ten rods with ALTERNATING RED AND BLUE SECTIONS (10cm to 1 meter). Each rod is divided into unit segments with red and blue colors. DIFFERENT from all-red Sensorial rods.",
    key_materials: ["Red and blue rods", "10 rods", "Segment divisions"],
    confusion_pairs: ["se_red_rods"],
    difficulty: "easy",
  },
  {
    work_key: "ma_sandpaper_numbers",
    name: "Sandpaper Numbers",
    area_key: "mathematics",
    category: "Introduction to Numbers (1-10)",
    visual_description:
      "A child tracing textured sandpaper numerals (0-9) mounted on green or wooden boards with their fingers, feeling the rough texture of the numbers.",
    key_materials: ["Sandpaper numerals", "Green or wooden boards"],
    difficulty: "easy",
  },
  {
    work_key: "ma_spindle_box",
    name: "Spindle Box",
    area_key: "mathematics",
    category: "Introduction to Numbers (1-10)",
    visual_description:
      "A child placing loose wooden spindles into numbered compartments (0-9) in a wooden box, counting out the correct quantity for each number.",
    key_materials: ["Wooden box", "45 spindles", "9 compartments"],
    difficulty: "medium",
  },
  {
    work_key: "ma_cards_and_counters",
    name: "Cards and Counters",
    area_key: "mathematics",
    category: "Introduction to Numbers (1-10)",
    visual_description:
      "A child placing number cards (1-10) on a mat with loose red dot counters arranged in rows below each card to represent the quantity.",
    key_materials: ["Number cards", "Red dot counters"],
    difficulty: "medium",
  },
  {
    work_key: "ma_golden_bead_units",
    name: "Golden Bead Material - Units",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child handling individual golden beads (small individual units), the foundation of the decimal system representing ones.",
    key_materials: ["Individual golden beads"],
    confusion_pairs: ["ma_golden_bead_bars", "ma_golden_bead_squares", "ma_golden_bead_cubes"],
    difficulty: "easy",
  },
  {
    work_key: "ma_golden_bead_bars",
    name: "Golden Bead Material - Bars",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child handling golden bead bars (10 beads strung together on wire) representing tens in the decimal system.",
    key_materials: ["Golden bead bars", "10 beads each"],
    confusion_pairs: ["ma_golden_bead_units", "ma_golden_bead_squares", "ma_golden_bead_cubes"],
    difficulty: "easy",
  },
  {
    work_key: "ma_golden_bead_squares",
    name: "Golden Bead Material - Squares",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child handling golden bead squares (100 beads arranged in a square grid on a frame) representing hundreds in the decimal system.",
    key_materials: ["Golden bead squares", "100 beads in grid"],
    confusion_pairs: ["ma_golden_bead_units", "ma_golden_bead_bars", "ma_golden_bead_cubes"],
    difficulty: "easy",
  },
  {
    work_key: "ma_golden_bead_cubes",
    name: "Golden Bead Material - Cubes",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child handling a golden bead cube (1000 beads arranged in a cube) representing thousands in the decimal system. Large and heavy.",
    key_materials: ["Golden bead cube", "1000 beads"],
    confusion_pairs: ["ma_golden_bead_units", "ma_golden_bead_bars", "ma_golden_bead_squares"],
    difficulty: "easy",
  },
  {
    work_key: "ma_large_number_cards",
    name: "Large Number Cards",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child arranging large wooden number cards (1-9000, color-coded: green for units, blue for tens, red for hundreds, green for thousands) alongside golden beads.",
    key_materials: ["Large number cards", "Color-coded cards"],
    confusion_pairs: ["ma_stamp_game"],
    difficulty: "medium",
  },
  {
    work_key: "ma_formation_numbers",
    name: "Formation of Numbers",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child combining golden beads (units, bars, squares, cubes) with large number cards to show how numbers are formed from the decimal system.",
    key_materials: ["Golden beads", "Number cards"],
    difficulty: "hard",
  },
  {
    work_key: "ma_addition_beads",
    name: "Addition with Golden Beads",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child using golden beads to perform addition: combining quantities, exchanging units for bars, bars for squares, representing the process concretely.",
    key_materials: ["Golden beads"],
    difficulty: "hard",
  },
  {
    work_key: "ma_subtraction_beads",
    name: "Subtraction with Golden Beads",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child using golden beads to perform subtraction: starting with a quantity, removing beads, making exchanges (breaking down larger units as needed).",
    key_materials: ["Golden beads"],
    difficulty: "hard",
  },
  {
    work_key: "ma_multiplication_beads",
    name: "Multiplication with Golden Beads",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child using golden beads to perform multiplication: arranging groups of beads, counting total quantity, making exchanges into tens/hundreds/thousands.",
    key_materials: ["Golden beads"],
    difficulty: "hard",
  },
  {
    work_key: "ma_division_beads",
    name: "Division with Golden Beads",
    area_key: "mathematics",
    category: "Decimal System",
    visual_description:
      "A child using golden beads to perform division: splitting a total quantity into equal groups, making exchanges as needed to distribute fairly.",
    key_materials: ["Golden beads"],
    difficulty: "hard",
  },
  {
    work_key: "ma_seguin_board_a",
    name: "Seguin Board A (Teens)",
    area_key: "mathematics",
    category: "Teens and Tens",
    visual_description:
      "A child placing number cards (10-19) in slots on a wooden board and placing corresponding golden bead bars to learn the teen numbers.",
    key_materials: ["Wooden board", "Number cards 10-19", "Golden bead bars"],
    confusion_pairs: ["ma_seguin_board_b"],
    difficulty: "medium",
  },
  {
    work_key: "ma_seguin_board_b",
    name: "Seguin Board B (Tens)",
    area_key: "mathematics",
    category: "Teens and Tens",
    visual_description:
      "A child placing number cards (10-90) in slots on a wooden board and placing corresponding golden bead bars to learn the tens.",
    key_materials: ["Wooden board", "Number cards 10-90", "Golden bead bars"],
    confusion_pairs: ["ma_seguin_board_a"],
    difficulty: "medium",
  },
  {
    work_key: "ma_short_bead_stair",
    name: "Short Bead Stair",
    area_key: "mathematics",
    category: "Teens and Tens",
    visual_description:
      "A child arranging a stair of short bead chains: 1 bead (red), 2 beads (green), 3 beads (pink), up to 9 beads (dark blue). Colored sequence showing 1-9.",
    key_materials: ["Colored bead chains", "1 through 9 beads"],
    confusion_pairs: ["ma_golden_bead_units"],
    difficulty: "easy",
  },
  {
    work_key: "ma_hundred_board",
    name: "Hundred Board",
    area_key: "mathematics",
    category: "Teens and Tens",
    visual_description:
      "A child placing number tiles (1-100) into a wooden board with 100 compartments (10×10 grid), building understanding of number sequence and patterns.",
    key_materials: ["Wooden board", "100 number tiles"],
    difficulty: "medium",
  },
  {
    work_key: "ma_short_bead_chains",
    name: "Short Bead Chains (Squared)",
    area_key: "mathematics",
    category: "Linear Counting",
    visual_description:
      "A child arranging short bead chains: 1² (1 bead), 2² (4 beads), 3² (9 beads), up to 10² (100 beads). Showing square numbers visually.",
    key_materials: ["Short bead chains", "Colored beads"],
    confusion_pairs: ["ma_long_bead_chains"],
    difficulty: "hard",
  },
  {
    work_key: "ma_long_bead_chains",
    name: "Long Bead Chains (Cubed)",
    area_key: "mathematics",
    category: "Linear Counting",
    visual_description:
      "A child arranging very long bead chains: 1³ (1 bead), 2³ (8 beads), 3³ (27 beads), up to 10³ (1000 beads). Extremely long chains showing cubic numbers.",
    key_materials: ["Long bead chains", "Colored beads"],
    confusion_pairs: ["ma_short_bead_chains"],
    difficulty: "hard",
  },
  {
    work_key: "ma_addition_strip_board",
    name: "Addition Strip Board",
    area_key: "mathematics",
    category: "Memorization - Operation Boards",
    visual_description:
      "A child placing number strips on a board to practice addition facts: a red strip + blue strip = answer strip, working through all addition combinations.",
    key_materials: ["Wooden board", "Red and blue number strips"],
    confusion_pairs: ["ma_subtraction_strip_board"],
    difficulty: "medium",
  },
  {
    work_key: "ma_subtraction_strip_board",
    name: "Subtraction Strip Board",
    area_key: "mathematics",
    category: "Memorization - Operation Boards",
    visual_description:
      "A child placing number strips on a board to practice subtraction facts: starting quantity - amount removed = answer, working through all subtraction combinations.",
    key_materials: ["Wooden board", "Number strips"],
    confusion_pairs: ["ma_addition_strip_board"],
    difficulty: "medium",
  },
  {
    work_key: "ma_multiplication_board",
    name: "Multiplication Board",
    area_key: "mathematics",
    category: "Memorization - Operation Boards",
    visual_description:
      "A child moving a bead or counter along a grid board (100 holes) following the columns and rows to show multiplication: counting groups and totals.",
    key_materials: ["Wooden board with holes", "Bead or counter"],
    confusion_pairs: ["ma_hundred_board"],
    difficulty: "medium",
  },
  {
    work_key: "ma_division_board",
    name: "Division Board",
    area_key: "mathematics",
    category: "Memorization - Operation Boards",
    visual_description:
      "A child using a board with skittles (pegs) and beads to practice division facts: distributing beads into equal groups represented by the board layout.",
    key_materials: ["Wooden board", "Skittles", "Beads"],
    difficulty: "medium",
  },
  {
    work_key: "ma_operation_finger_charts",
    name: "Operation Finger Charts",
    area_key: "mathematics",
    category: "Memorization - Operation Boards",
    visual_description:
      "A child using small finger charts for addition, subtraction, multiplication, or division to practice facts with tactile counting guides.",
    key_materials: ["Finger charts"],
    difficulty: "easy",
  },
  {
    work_key: "ma_stamp_game",
    name: "Stamp Game",
    area_key: "mathematics",
    category: "Passage to Abstraction",
    visual_description:
      "A child using small color-coded stamps (tiles with numbers and symbols) to practice arithmetic operations, showing place value with physical stamps.",
    key_materials: ["Stamp tiles", "Color-coded symbols"],
    confusion_pairs: ["ma_large_number_cards"],
    difficulty: "hard",
  },
  {
    work_key: "ma_dot_game",
    name: "Dot Game",
    area_key: "mathematics",
    category: "Passage to Abstraction",
    visual_description:
      "A child practicing arithmetic on paper: numbers represented by color-coded dots in columns (ones, tens, hundreds, thousands), leading to written numbers.",
    key_materials: ["Paper", "Colored dots"],
    difficulty: "hard",
  },
  {
    work_key: "ma_small_bead_frame",
    name: "Small Bead Frame",
    area_key: "mathematics",
    category: "Passage to Abstraction",
    visual_description:
      "A child using a small wooden frame with 4 horizontal wires of sliding beads (10 beads per wire) to perform simple arithmetic operations.",
    key_materials: ["Wooden frame", "4 wires", "40 beads"],
    confusion_pairs: ["ma_large_bead_frame"],
    difficulty: "medium",
  },
  {
    work_key: "ma_large_bead_frame",
    name: "Large Bead Frame",
    area_key: "mathematics",
    category: "Passage to Abstraction",
    visual_description:
      "A child using a large wooden frame with 7 horizontal wires of sliding beads (10 beads per wire) to perform complex arithmetic operations with larger numbers.",
    key_materials: ["Large wooden frame", "7 wires", "70 beads"],
    confusion_pairs: ["ma_small_bead_frame"],
    difficulty: "medium",
  },
  {
    work_key: "ma_fraction_circles",
    name: "Fraction Circles",
    area_key: "mathematics",
    category: "Fractions",
    visual_description:
      "A child assembling red metal circle pieces cut into fractions (½, ⅓, ¼, ⅕, ⅙, ⅛, ⅙, etc.) mounted on a green frame to understand parts of a whole.",
    key_materials: ["Metal circle pieces", "Green frame"],
    difficulty: "hard",
  },
  {
    work_key: "ma_fraction_skittles",
    name: "Fraction Skittles",
    area_key: "mathematics",
    category: "Fractions",
    visual_description:
      "A child using colored skittles (pegs) in various arrangements to visualize fractions: ½ of ten, ⅓ of nine, etc., showing fractional relationships.",
    key_materials: ["Colored skittles", "Board with holes"],
    difficulty: "hard",
  },
];

// ============================================================================
// LANGUAGE AREA (Pink/Rose theme, 📚)
// ============================================================================

const LANGUAGE_SIGNATURES: WorkSignature[] = [
  {
    work_key: "la_enrichment_vocabulary",
    name: "Vocabulary Enrichment",
    area_key: "language",
    category: "Oral Language Development",
    visual_description:
      "A child pointing to and naming classroom objects or pictures, building vocabulary through conversation with materials and real objects displayed.",
    key_materials: ["Real objects", "Pictures", "Books"],
    difficulty: "easy",
  },
  {
    work_key: "la_classified_cards",
    name: "Classified Cards",
    area_key: "language",
    category: "Oral Language Development",
    visual_description:
      "A child sorting picture cards by category (animals, vehicles, food, clothing) and naming them aloud, building vocabulary and categorization skills.",
    key_materials: ["Picture cards", "Categories"],
    confusion_pairs: ["la_pink_series", "la_blue_series", "la_green_series"],
    difficulty: "easy",
  },
  {
    work_key: "la_object_to_picture",
    name: "Object to Picture Matching",
    area_key: "language",
    category: "Oral Language Development",
    visual_description:
      "A child matching miniature objects to corresponding picture cards, developing one-to-one correspondence and vocabulary in a concrete way.",
    key_materials: ["Miniature objects", "Picture cards"],
    difficulty: "easy",
  },
  {
    work_key: "la_sound_games",
    name: "Sound Games",
    area_key: "language",
    category: "Oral Language Development",
    visual_description:
      "A child pointing to and naming small objects in a basket, focusing on initial sounds (I spy with my little eye something that starts with /s/).",
    key_materials: ["Small objects in basket"],
    difficulty: "easy",
  },
  {
    work_key: "la_rhyming_activities",
    name: "Rhyming Activities",
    area_key: "language",
    category: "Oral Language Development",
    visual_description:
      "A child matching rhyming picture card pairs or generating rhyming words orally, developing phonemic awareness.",
    key_materials: ["Picture cards", "Rhyming pairs"],
    difficulty: "easy",
  },
  {
    work_key: "la_metal_insets",
    name: "Metal Insets",
    area_key: "language",
    category: "Writing Preparation",
    visual_description:
      "A child using metal geometric frames (circles, squares, rectangles, triangles, etc.) with colored pencils to trace and draw designs inside the insets.",
    key_materials: ["Metal geometric frames", "Colored pencils"],
    confusion_pairs: ["se_geometric_cabinet"],
    difficulty: "medium",
  },
  {
    work_key: "la_sandpaper_letters",
    name: "Sandpaper Letters",
    area_key: "language",
    category: "Writing Preparation",
    visual_description:
      "A child tracing textured sandpaper individual letters (both lowercase and uppercase) mounted on pink (vowels) or blue (consonants) wooden boards with their fingertips.",
    key_materials: ["Sandpaper letters", "Wooden boards", "Pink and blue colors"],
    confusion_pairs: ["la_phonogram_introduction"],
    difficulty: "medium",
  },
  {
    work_key: "la_sand_tray",
    name: "Sand Tray Writing",
    area_key: "language",
    category: "Writing Preparation",
    visual_description:
      "A child writing letters or words with their finger in a shallow tray of colored sand (usually blue or white), erasing with a sweep and starting again.",
    key_materials: ["Sand tray", "Colored sand"],
    difficulty: "easy",
  },
  {
    work_key: "la_chalkboard_writing",
    name: "Chalkboard Writing",
    area_key: "language",
    category: "Writing Preparation",
    visual_description:
      "A child writing letters or words on a small chalkboard or whiteboard with chalk or dry-erase marker, learning letter formation with erasable medium.",
    key_materials: ["Chalkboard or whiteboard", "Chalk or marker"],
    difficulty: "easy",
  },
  {
    work_key: "la_moveable_alphabet",
    name: "Moveable Alphabet",
    area_key: "language",
    category: "Writing Preparation",
    visual_description:
      "A child using loose wooden or plastic letters (blue consonants, red vowels) to build and spell words on a mat, exploring phonetic word building.",
    key_materials: ["Loose letters", "Blue and red colors"],
    confusion_pairs: ["la_sandpaper_letters"],
    difficulty: "hard",
  },
  {
    work_key: "la_handwriting_paper",
    name: "Handwriting on Paper",
    area_key: "language",
    category: "Writing Preparation",
    visual_description:
      "A child writing letters or words on lined paper with pencil, practicing proper letter formation and spacing on a paper surface.",
    key_materials: ["Lined paper", "Pencil"],
    difficulty: "easy",
  },
  {
    work_key: "la_pink_object_box",
    name: "Pink Object Box",
    area_key: "language",
    category: "Reading",
    visual_description:
      "A child matching small miniature objects (cat, bat, hat, pig, etc.) to CVC word labels stored in a pink-colored box or container.",
    key_materials: ["Miniature objects", "CVC word labels", "Pink box"],
    confusion_pairs: ["la_blue_object_box", "la_green_object_box"],
    difficulty: "hard",
  },
  {
    work_key: "la_pink_series",
    name: "Pink Series",
    area_key: "language",
    category: "Reading",
    visual_description:
      "A child matching pink picture cards showing CVC words (cat, bat, hat, pig, pig, etc.) to corresponding three-letter word cards. Picture-only introduction to reading.",
    key_materials: ["Pink picture cards", "CVC word cards"],
    confusion_pairs: ["la_blue_series", "la_green_series", "la_classified_cards"],
    difficulty: "hard",
  },
  {
    work_key: "la_blue_object_box",
    name: "Blue Object Box",
    area_key: "language",
    category: "Reading",
    visual_description:
      "A child matching small miniature objects to word labels that contain BLENDS (bl, st, fl, cr, gr, etc.) stored in a blue-colored box or container.",
    key_materials: ["Miniature objects", "Blend word labels", "Blue box"],
    confusion_pairs: ["la_pink_object_box", "la_green_object_box"],
    difficulty: "hard",
  },
  {
    work_key: "la_blue_series",
    name: "Blue Series",
    area_key: "language",
    category: "Reading",
    visual_description:
      "A child matching blue picture cards showing words with BLENDS (blend, stop, flag, crane, grass, etc.) to corresponding word cards. Introduces blends in reading.",
    key_materials: ["Blue picture cards", "Blend word cards"],
    confusion_pairs: ["la_pink_series", "la_green_series"],
    difficulty: "hard",
  },
  {
    work_key: "la_phonogram_introduction",
    name: "Phonogram Introduction",
    area_key: "language",
    category: "Reading",
    visual_description:
      "A child tracing textured sandpaper letter COMBINATIONS (sh, ch, th, ai, ee, ou, etc.) on boards, learning phonograms as single units in reading.",
    key_materials: ["Sandpaper phonograms", "Wooden boards"],
    confusion_pairs: ["la_sandpaper_letters"],
    difficulty: "hard",
  },
  {
    work_key: "la_green_object_box",
    name: "Green Object Box",
    area_key: "language",
    category: "Reading",
    visual_description:
      "A child matching small miniature objects to word labels containing PHONOGRAMS (th, sh, ch, ai, ee, etc.) stored in a green-colored box or container.",
    key_materials: ["Miniature objects", "Phonogram word labels", "Green box"],
    confusion_pairs: ["la_pink_object_box", "la_blue_object_box"],
    difficulty: "hard",
  },
  {
    work_key: "la_green_series",
    name: "Green Series",
    area_key: "language",
    category: "Reading",
    visual_description:
      "A child matching green picture cards showing words with PHONOGRAMS (thing, shovel, chair, train, tree, house, etc.) to corresponding word cards. Advanced phonetic reading.",
    key_materials: ["Green picture cards", "Phonogram word cards"],
    confusion_pairs: ["la_pink_series", "la_blue_series"],
    difficulty: "hard",
  },
  {
    work_key: "la_puzzle_words",
    name: "Puzzle Words (Sight Words)",
    area_key: "language",
    category: "Reading",
    visual_description:
      "A child reading and matching high-frequency irregular words (the, said, was, were, have, etc.) that don't follow phonetic patterns.",
    key_materials: ["Word cards", "Sight word cards"],
    difficulty: "hard",
  },
  {
    work_key: "la_command_cards",
    name: "Command Cards",
    area_key: "language",
    category: "Reading",
    visual_description:
      "A child reading action cards and performing the action shown (jump, skip, touch your nose, sit down, etc.), proving they understand the written words.",
    key_materials: ["Command cards", "Action instructions"],
    difficulty: "medium",
  },
  {
    work_key: "la_noun_introduction",
    name: "Introduction to the Noun",
    area_key: "language",
    category: "Grammar",
    visual_description:
      "A child learning that nouns are words for things/people, identified by a BLACK TRIANGLE grammar symbol (largest), with object/picture labels for practice.",
    key_materials: ["Black triangle symbol", "Noun objects/labels"],
    difficulty: "hard",
  },
  {
    work_key: "la_article_introduction",
    name: "Introduction to the Article",
    area_key: "language",
    category: "Grammar",
    visual_description:
      "A child learning that articles (a, an, the) modify nouns, identified by a SMALL LIGHT BLUE TRIANGLE grammar symbol.",
    key_materials: ["Light blue triangle symbol", "Article labels"],
    difficulty: "hard",
  },
  {
    work_key: "la_adjective_introduction",
    name: "Introduction to the Adjective",
    area_key: "language",
    category: "Grammar",
    visual_description:
      "A child learning that adjectives describe nouns, identified by a MEDIUM DARK BLUE TRIANGLE grammar symbol, with describing game activities.",
    key_materials: ["Dark blue triangle symbol", "Adjective labels"],
    difficulty: "hard",
  },
  {
    work_key: "la_verb_introduction",
    name: "Introduction to the Verb",
    area_key: "language",
    category: "Grammar",
    visual_description:
      "A child learning that verbs are action words, identified by a LARGE RED CIRCLE grammar symbol, with action cards to demonstrate understanding.",
    key_materials: ["Red circle symbol", "Action cards"],
    difficulty: "hard",
  },
  {
    work_key: "la_adverb_introduction",
    name: "Introduction to the Adverb",
    area_key: "language",
    category: "Grammar",
    visual_description:
      "A child learning that adverbs modify verbs/adjectives, identified by a SMALL ORANGE CIRCLE grammar symbol.",
    key_materials: ["Orange circle symbol", "Adverb labels"],
    difficulty: "hard",
  },
  {
    work_key: "la_grammar_boxes",
    name: "Grammar Boxes",
    area_key: "language",
    category: "Grammar",
    visual_description:
      "A child using sets of color-coded grammar boxes with sentence cards and labeled parts, practicing advanced grammar analysis and function identification.",
    key_materials: ["Colored boxes", "Grammar cards", "Sentence strips"],
    difficulty: "hard",
  },
  {
    work_key: "la_sentence_analysis",
    name: "Sentence Analysis",
    area_key: "language",
    category: "Grammar",
    visual_description:
      "A child analyzing sentences visually using color-coded symbols and arrow charts, showing relationships between words and sentence structure.",
    key_materials: ["Sentence cards", "Analysis charts", "Arrows"],
    difficulty: "hard",
  },
];

// ============================================================================
// CULTURAL AREA (Purple theme, 🌍)
// ============================================================================

const CULTURAL_SIGNATURES: WorkSignature[] = [
  {
    work_key: "cu_globe_land_water",
    name: "Globe - Land and Water",
    area_key: "cultural",
    category: "Geography",
    visual_description:
      "A child touching a globe with rough sandpaper-textured LAND areas and smooth varnished WATER areas, learning the tactile difference between land and water.",
    key_materials: ["Sandpaper globe", "Rough and smooth surfaces"],
    confusion_pairs: ["cu_globe_continents"],
    difficulty: "easy",
  },
  {
    work_key: "cu_globe_continents",
    name: "Globe - Continents",
    area_key: "cultural",
    category: "Geography",
    visual_description:
      "A child viewing and naming colored continental regions on a painted globe showing the seven continents in different colors on a blue ocean background.",
    key_materials: ["Colored globe", "Painted continents"],
    confusion_pairs: ["cu_globe_land_water"],
    difficulty: "easy",
  },
  {
    work_key: "cu_puzzle_map_world",
    name: "Puzzle Map - World",
    area_key: "cultural",
    category: "Geography",
    visual_description:
      "A child assembling a large wooden puzzle map showing all seven continents and oceans together as one complete world map.",
    key_materials: ["Wooden puzzle pieces", "World map"],
    confusion_pairs: ["cu_puzzle_maps_continents"],
    difficulty: "hard",
  },
  {
    work_key: "cu_puzzle_maps_continents",
    name: "Puzzle Maps - Individual Continents",
    area_key: "cultural",
    category: "Geography",
    visual_description:
      "A child assembling wooden puzzle maps of individual continents with countries labeled and color-coded (e.g., North America with Canada, USA, Mexico).",
    key_materials: ["Wooden puzzle pieces", "Continent maps"],
    confusion_pairs: ["cu_puzzle_map_world"],
    difficulty: "hard",
  },
  {
    work_key: "cu_flags_world",
    name: "Flags of the World",
    area_key: "cultural",
    category: "Geography",
    visual_description:
      "A child matching miniature flag stands to country names and locations, learning about different nations and cultures through flag design and symbolism.",
    key_materials: ["Flag stands", "Country labels"],
    difficulty: "hard",
  },
  {
    work_key: "cu_land_water_forms",
    name: "Land and Water Forms",
    area_key: "cultural",
    category: "Geography",
    visual_description:
      "A child creating geographical features using clay or sand trays with water: building peninsulas, islands, lakes, gulfs, bays, and other landforms.",
    key_materials: ["Clay or sand", "Water tray"],
    confusion_pairs: ["cu_sink_float"],
    difficulty: "medium",
  },
  {
    work_key: "cu_solar_system",
    name: "Solar System",
    area_key: "cultural",
    category: "Geography",
    visual_description:
      "A child viewing a solar system model or cards showing planets in order from the sun, learning about Earth's place in space and planetary characteristics.",
    key_materials: ["Model or cards", "Planet representations"],
    difficulty: "easy",
  },
  {
    work_key: "cu_calendar_work",
    name: "Calendar Work",
    area_key: "cultural",
    category: "History and Time",
    visual_description:
      "A child manipulating day, month, and year cards or a calendar system to track time, identify dates, and understand temporal concepts.",
    key_materials: ["Calendar cards", "Date tiles"],
    difficulty: "easy",
  },
  {
    work_key: "cu_birthday_celebration",
    name: "Birthday Celebration",
    area_key: "cultural",
    category: "History and Time",
    visual_description:
      "A child walking around a sun candle while holding a globe, representing Earth's yearly orbit, celebrating a birthday and understanding seasons.",
    key_materials: ["Candle", "Globe"],
    difficulty: "easy",
  },
  {
    work_key: "cu_clock_work",
    name: "Clock Work",
    area_key: "cultural",
    category: "History and Time",
    visual_description:
      "A child using a large learning clock or toy clock with moveable hands to learn time-telling, hours, minutes, and daily time concepts.",
    key_materials: ["Learning clock", "Moveable hands"],
    difficulty: "medium",
  },
  {
    work_key: "cu_timeline_life",
    name: "Timeline of Life",
    area_key: "cultural",
    category: "History and Time",
    visual_description:
      "A child viewing a long scroll showing different eras of life on Earth: from earliest life forms through dinosaurs to modern humans.",
    key_materials: ["Long scroll", "Time periods"],
    difficulty: "medium",
  },
  {
    work_key: "cu_parts_plant",
    name: "Parts of a Plant",
    area_key: "cultural",
    category: "Botany",
    visual_description:
      "A child assembling a wooden inset puzzle of a complete plant showing root, stem, leaves, and flower as separate interlocking parts.",
    key_materials: ["Wooden puzzle", "Plant parts"],
    confusion_pairs: ["cu_parts_flower", "cu_parts_leaf", "cu_parts_root", "cu_parts_seed"],
    difficulty: "easy",
  },
  {
    work_key: "cu_parts_flower",
    name: "Parts of a Flower",
    area_key: "cultural",
    category: "Botany",
    visual_description:
      "A child assembling a wooden inset puzzle showing flower anatomy: petals, sepals, stamen, pistil, and other reproductive parts.",
    key_materials: ["Wooden puzzle", "Flower parts"],
    confusion_pairs: ["cu_parts_plant", "cu_parts_leaf"],
    difficulty: "medium",
  },
  {
    work_key: "cu_parts_leaf",
    name: "Parts of a Leaf",
    area_key: "cultural",
    category: "Botany",
    visual_description:
      "A child assembling a wooden inset puzzle of a leaf showing blade, petiole (stem), and veins in a leaf cross-section.",
    key_materials: ["Wooden puzzle", "Leaf parts"],
    confusion_pairs: ["cu_parts_plant", "cu_parts_flower"],
    difficulty: "medium",
  },
  {
    work_key: "cu_parts_root",
    name: "Parts of a Root",
    area_key: "cultural",
    category: "Botany",
    visual_description:
      "A child assembling a wooden inset puzzle showing root anatomy: main root, root hairs, and branching structure underground.",
    key_materials: ["Wooden puzzle", "Root parts"],
    confusion_pairs: ["cu_parts_plant", "cu_parts_seed"],
    difficulty: "medium",
  },
  {
    work_key: "cu_parts_seed",
    name: "Parts of a Seed",
    area_key: "cultural",
    category: "Botany",
    visual_description:
      "A child assembling a wooden inset puzzle of a seed showing embryo (root and shoot) and seed coat in a cross-section view.",
    key_materials: ["Wooden puzzle", "Seed parts"],
    confusion_pairs: ["cu_parts_plant", "cu_parts_root"],
    difficulty: "medium",
  },
  {
    work_key: "cu_plant_lifecycle",
    name: "Plant Life Cycle",
    area_key: "cultural",
    category: "Botany",
    visual_description:
      "A child viewing cards or materials showing stages of plant growth: seed germination, seedling, mature plant with flowers, and seed production.",
    key_materials: ["Lifecycle cards", "Growth stages"],
    difficulty: "easy",
  },
  {
    work_key: "cu_living_vs_nonliving",
    name: "Living vs Non-Living",
    area_key: "cultural",
    category: "Botany",
    visual_description:
      "A child sorting cards or objects into two categories: those with life (plants, animals, insects) and those without life (rocks, water, tools).",
    key_materials: ["Sorting cards", "Objects"],
    difficulty: "easy",
  },
  {
    work_key: "cu_parts_fish",
    name: "Parts of a Fish",
    area_key: "cultural",
    category: "Zoology",
    visual_description:
      "A child assembling a wooden inset puzzle of a fish showing fins, scales, gills, and body structure typical of aquatic vertebrates.",
    key_materials: ["Wooden puzzle", "Fish parts"],
    confusion_pairs: ["cu_parts_frog", "cu_parts_turtle", "cu_parts_bird", "cu_parts_horse"],
    difficulty: "easy",
  },
  {
    work_key: "cu_parts_frog",
    name: "Parts of a Frog",
    area_key: "cultural",
    category: "Zoology",
    visual_description:
      "A child assembling a wooden inset puzzle of a frog (amphibian) showing legs, skin, and body adaptations for both water and land living.",
    key_materials: ["Wooden puzzle", "Frog parts"],
    confusion_pairs: ["cu_parts_fish", "cu_parts_turtle", "cu_parts_bird"],
    difficulty: "easy",
  },
  {
    work_key: "cu_parts_turtle",
    name: "Parts of a Turtle",
    area_key: "cultural",
    category: "Zoology",
    visual_description:
      "A child assembling a wooden inset puzzle of a turtle showing shell, legs, head, and body structure of this reptile.",
    key_materials: ["Wooden puzzle", "Turtle parts"],
    confusion_pairs: ["cu_parts_fish", "cu_parts_frog", "cu_parts_bird"],
    difficulty: "easy",
  },
  {
    work_key: "cu_parts_bird",
    name: "Parts of a Bird",
    area_key: "cultural",
    category: "Zoology",
    visual_description:
      "A child assembling a wooden inset puzzle of a bird showing wings, feathers, beak, legs, and other adaptations for flight.",
    key_materials: ["Wooden puzzle", "Bird parts"],
    confusion_pairs: ["cu_parts_fish", "cu_parts_frog", "cu_parts_horse"],
    difficulty: "easy",
  },
  {
    work_key: "cu_parts_horse",
    name: "Parts of a Horse",
    area_key: "cultural",
    category: "Zoology",
    visual_description:
      "A child assembling a wooden inset puzzle of a horse showing legs, hooves, mane, tail, and body structure of this large mammal.",
    key_materials: ["Wooden puzzle", "Horse parts"],
    confusion_pairs: ["cu_parts_bird"],
    difficulty: "easy",
  },
  {
    work_key: "cu_classes_vertebrates",
    name: "Five Classes of Vertebrates",
    area_key: "cultural",
    category: "Zoology",
    visual_description:
      "A child sorting animal figurines or cards by vertebrate class: fish, amphibians, reptiles, birds, and mammals. Understanding animal classification.",
    key_materials: ["Animal cards or figurines", "Classification system"],
    difficulty: "medium",
  },
  {
    work_key: "cu_animals_continents",
    name: "Animals of the Continents",
    area_key: "cultural",
    category: "Zoology",
    visual_description:
      "A child matching animal figurines to continent puzzle mats, learning which animals live in different geographic regions (Africa, Asia, Australia, etc.).",
    key_materials: ["Animal figurines", "Continent mats"],
    difficulty: "medium",
  },
  {
    work_key: "cu_animal_lifecycle",
    name: "Animal Life Cycles",
    area_key: "cultural",
    category: "Zoology",
    visual_description:
      "A child viewing cards or materials showing life stages: egg → caterpillar → butterfly, egg → tadpole → frog, or other animal metamorphosis sequences.",
    key_materials: ["Lifecycle cards", "Transformation stages"],
    difficulty: "easy",
  },
  {
    work_key: "cu_sink_float",
    name: "Sink and Float",
    area_key: "cultural",
    category: "Science",
    visual_description:
      "A child testing various objects in a basin of water to observe and categorize which items sink and which float based on density and material properties.",
    key_materials: ["Water basin", "Test objects"],
    confusion_pairs: ["cu_land_water_forms"],
    difficulty: "easy",
  },
  {
    work_key: "cu_magnetic_nonmagnetic",
    name: "Magnetic/Non-Magnetic",
    area_key: "cultural",
    category: "Science",
    visual_description:
      "A child using a magnet to test various metal and non-metal objects, sorting them into magnetic (attracted) and non-magnetic (not attracted) categories.",
    key_materials: ["Magnet", "Test objects"],
    difficulty: "easy",
  },
  {
    work_key: "cu_states_matter",
    name: "States of Matter",
    area_key: "cultural",
    category: "Science",
    visual_description:
      "A child experimenting with ice, water, and steam to observe solid, liquid, and gas states. May include melting and evaporation demonstrations.",
    key_materials: ["Ice", "Water", "Heat source"],
    difficulty: "medium",
  },
  {
    work_key: "cu_color_mixing",
    name: "Color Mixing",
    area_key: "cultural",
    category: "Science",
    visual_description:
      "A child mixing paint colors (primary to secondary: red + yellow = orange) or observing liquid color blending to understand color theory and chemistry.",
    key_materials: ["Paint or colored liquids", "Mixing containers"],
    difficulty: "easy",
  },
  {
    work_key: "cu_painting",
    name: "Painting",
    area_key: "cultural",
    category: "Art and Music",
    visual_description:
      "A child at an easel or table with paper, paints, and brushes, creating artistic expressions through color and form.",
    key_materials: ["Paper", "Paints", "Brushes", "Easel"],
    difficulty: "easy",
  },
  {
    work_key: "cu_drawing",
    name: "Drawing",
    area_key: "cultural",
    category: "Art and Music",
    visual_description:
      "A child using pencils, crayons, or charcoal to create line drawings and artistic designs on paper.",
    key_materials: ["Paper", "Pencils or crayons"],
    difficulty: "easy",
  },
  {
    work_key: "cu_collage",
    name: "Collage",
    area_key: "cultural",
    category: "Art and Music",
    visual_description:
      "A child cutting and gluing colored paper, fabric, or natural materials onto a backing paper to create a composite artwork.",
    key_materials: ["Paper", "Glue", "Scissors", "Collage materials"],
    difficulty: "easy",
  },
  {
    work_key: "cu_clay_playdough",
    name: "Clay and Playdough",
    area_key: "cultural",
    category: "Art and Music",
    visual_description:
      "A child manipulating clay or playdough with hands and tools, creating three-dimensional sculptures and exploring form.",
    key_materials: ["Clay or playdough", "Sculpting tools"],
    difficulty: "easy",
  },
  {
    work_key: "cu_rhythm_instruments",
    name: "Rhythm Instruments",
    area_key: "cultural",
    category: "Art and Music",
    visual_description:
      "A child playing percussion instruments (shakers, drums, bells, sticks, maracas) to explore rhythm, tempo, and musical expression.",
    key_materials: ["Percussion instruments", "Drums", "Shakers"],
    difficulty: "easy",
  },
];

// ============================================================================
// AREA-LEVEL DESCRIPTIONS FOR TIER-1 CLASSIFICATION
// ============================================================================

export const AREA_SIGNATURES: Record<string, string> = {
  practical_life:
    "Green area with real-life materials: a child performing daily tasks like carrying, pouring, washing, dressing, or organizing. Materials are functional and used in everyday life.",
  sensorial:
    "Orange area with sensory exploration: a child discriminating size, color, shape, texture, sound, smell, or weight using specially designed materials like towers, cylinders, color tablets, bells, or touch materials.",
  mathematics:
    "Blue area with math materials: a child manipulating golden beads, rods, number cards, or boards to understand quantity, number system, and arithmetic operations.",
  language:
    "Pink/rose area with reading and writing: a child tracing sandpaper letters, building words with moveable letters, reading cards, or using grammar materials.",
  cultural:
    "Purple area with knowledge materials: a child exploring geography (maps, globes), biology (anatomy puzzles, plant/animal parts), history (timelines, calendars), or science (experiments) and art.",
};

// ============================================================================
// COMPLETE WORK SIGNATURES DATABASE
// ============================================================================

export const WORK_SIGNATURES: WorkSignature[] = [
  ...PRACTICAL_LIFE_SIGNATURES,
  ...SENSORIAL_SIGNATURES,
  ...MATHEMATICS_SIGNATURES,
  ...LANGUAGE_SIGNATURES,
  ...CULTURAL_SIGNATURES,
];

// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================

/**
 * Get all signatures for a specific area.
 */
export function getSignaturesByArea(area_key: string): WorkSignature[] {
  return WORK_SIGNATURES.filter((sig) => sig.area_key === area_key);
}

/**
 * Get a specific work signature by its work_key.
 */
export function getSignatureByKey(work_key: string): WorkSignature | undefined {
  return WORK_SIGNATURES.find((sig) => sig.work_key === work_key);
}

/**
 * Get all work keys for a specific area (for easy iteration).
 */
export function getWorkKeysForArea(area_key: string): string[] {
  return getSignaturesByArea(area_key).map((sig) => sig.work_key);
}

/**
 * Get all confusion pairs for a work, resolved to actual signatures.
 */
export function getConfusionPairsForWork(
  work_key: string
): WorkSignature[] | undefined {
  const sig = getSignatureByKey(work_key);
  if (!sig?.confusion_pairs) return undefined;
  return sig.confusion_pairs
    .map((key) => getSignatureByKey(key))
    .filter((s): s is WorkSignature => s !== undefined);
}

/**
 * Statistics for the work signatures database.
 */
export const WORK_SIGNATURES_STATS = {
  total_works: WORK_SIGNATURES.length,
  by_area: {
    practical_life: getSignaturesByArea("practical_life").length,
    sensorial: getSignaturesByArea("sensorial").length,
    mathematics: getSignaturesByArea("mathematics").length,
    language: getSignaturesByArea("language").length,
    cultural: getSignaturesByArea("cultural").length,
  },
  difficulty_distribution: {
    easy: WORK_SIGNATURES.filter((s) => s.difficulty === "easy").length,
    medium: WORK_SIGNATURES.filter((s) => s.difficulty === "medium").length,
    hard: WORK_SIGNATURES.filter((s) => s.difficulty === "hard").length,
  },
  works_with_confusion_pairs: WORK_SIGNATURES.filter(
    (s) => s.confusion_pairs && s.confusion_pairs.length > 0
  ).length,
};

export default WORK_SIGNATURES;
