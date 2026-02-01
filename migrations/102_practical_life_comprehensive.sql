-- PRACTICAL LIFE COMPREHENSIVE DATA
-- AMI-Quality Presentation Guides for Montessori Works
-- Run in Supabase SQL Editor
-- Created: Session 132 - Deep Dive Research

-- ============================================
-- POURING (DRY AND WET)
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• Hold pitcher with THUMB ON TOP, four fingers below - pour from left to right
• Slow, analyzed movements - pause between steps for child to observe
• Tilt SLOWLY, watch the stream, wait for LAST DROP before straightening
• Spills are learning opportunities - show cleanup as part of the work
• Progress: large beans → rice → sand → water (wet comes AFTER dry mastery)',
  video_search_term = 'montessori pouring presentation AMI',
  presentation_steps = '[
    {"step": 1, "title": "Invitation", "description": "Invite child: Would you like to learn how to pour? Walk together to the shelf.", "tip": "Choose a time when child seems ready and focused"},
    {"step": 2, "title": "Carry the Tray", "description": "Demonstrate carrying tray with both hands, walking slowly to table. Place gently.", "tip": "Child mirrors your pace and care"},
    {"step": 3, "title": "Position Materials", "description": "Sit to child''s right. Position full pitcher on left, empty on right.", "tip": "Left-to-right prepares for reading direction"},
    {"step": 4, "title": "Grasp the Handle", "description": "Using dominant hand, grasp pitcher handle with thumb on top. Place other hand on side for support.", "tip": "Exaggerate grip slightly so child sees clearly"},
    {"step": 5, "title": "Lift and Pause", "description": "Lift pitcher slowly. Pause at midpoint to show control.", "tip": "This pause is a point of interest"},
    {"step": 6, "title": "Pour Slowly", "description": "Tilt and pour in one steady stream into empty pitcher. Watch the level.", "tip": "Pour until just below rim - not completely full"},
    {"step": 7, "title": "Last Drop", "description": "As you finish, tilt back slightly to catch the last drop.", "tip": "Prevents dripping - subtle but important"},
    {"step": 8, "title": "Return Pitcher", "description": "Place now-empty pitcher back on left side of tray.", "tip": "Maintain same careful movements"},
    {"step": 9, "title": "Repeat Transfer", "description": "Pour back to original pitcher using same technique.", "tip": "Child sees complete cycle"},
    {"step": 10, "title": "Invite Child", "description": "Say Now it''s your turn and move to child''s left to observe.", "tip": "Resist urge to correct immediately"},
    {"step": 11, "title": "Handle Spills", "description": "If spill occurs, calmly show sponge cleanup. This IS part of the work.", "tip": "Spills are learning, not failures"},
    {"step": 12, "title": "Return to Shelf", "description": "Show carrying tray back to its place on shelf.", "tip": "Work complete when materials returned"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Sound of grains hitting empty bowl or water flowing',
    'Visual of material moving from one container to another',
    'Sensory feedback of controlled pouring motion',
    'Satisfying completion when last drop captured'
  ],
  control_of_error = 'Spills provide immediate feedback. Container size prevents overpouring. Child can observe and correct own mistakes.',
  variations = ARRAY[
    'Dry pouring with progressively smaller items (large beans to rice to sand)',
    'Water pouring to specific marked levels',
    'Pouring with funnel for increased precision',
    'Multi-step pouring with multiple containers',
    'Pouring for practical purposes (serving drinks, watering plants)'
  ],
  common_challenges = ARRAY[
    'Talking too much during presentation - use minimal words',
    'Not analyzing movements beforehand - practice alone first',
    'Interrupting child during work - observe silently',
    'Rushing the presentation - slow deliberate movements essential',
    'Not allowing time for self-correction of spills'
  ]
WHERE slug IN ('dry-pouring', 'pouring-dry', 'wet-pouring', 'pouring-water', 'water-pouring')
   OR name ILIKE '%pouring%';

-- ============================================
-- SPOONING / TRANSFER ACTIVITIES
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• THREE-FINGER GRIP on spoon (thumb, index, middle) - EXACT pencil grip preparation
• Scoop TOWARD body, lift ABOVE bowl rim, pause, then release over target bowl
• Non-dominant hand GROUNDS the bowl throughout - stability is key
• Progress: large spoon + large items → small spoon + small items
• Let child continue HALFWAY through - don''t demonstrate entire transfer',
  video_search_term = 'montessori spooning presentation practical life',
  presentation_steps = '[
    {"step": 1, "title": "Setup", "description": "Sit to child''s right. Place full bowl on left, empty bowl on right, spoon between.", "tip": "Left-to-right flow prepares for reading"},
    {"step": 2, "title": "Demonstrate Grip", "description": "Show three-finger grip: thumb on top, index and middle below handle.", "tip": "This is exact pencil grip - indirect writing prep"},
    {"step": 3, "title": "Stabilize Bowl", "description": "Place non-dominant hand on edge of source bowl to steady it.", "tip": "Grounding prevents bowl from sliding"},
    {"step": 4, "title": "Scoop Motion", "description": "Scoop toward body, lifting spoon with material.", "tip": "Toward body gives better control"},
    {"step": 5, "title": "Lift Above Rim", "description": "Lift spoon UP and OVER the rim of bowl, pause briefly.", "tip": "Pause prevents drips between bowls"},
    {"step": 6, "title": "Transfer", "description": "Move spoon to target bowl, tilt to release material gently.", "tip": "Rotate spoon toward body to release"},
    {"step": 7, "title": "Return Spoon", "description": "Return spoon to starting position, ready for next scoop.", "tip": "Return spoon flat, not tilted"},
    {"step": 8, "title": "Invite Child", "description": "After 3-4 transfers, invite child to continue.", "tip": "Don''t complete entire transfer - leave work for child"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Sound of items dropping into receiving container',
    'Visual satisfaction of seeing bowl fill',
    'Texture and weight of materials being transferred',
    'Sensory feedback of controlled grip'
  ],
  control_of_error = 'Spills provide immediate tactile feedback. Container design prevents excessive spillage.',
  variations = ARRAY[
    'Progress from larger items (beans) to smaller (rice)',
    'Introduction to tweezers for finer control',
    'Sorting while transferring (colors to different bowls)',
    'Using spooning in food preparation contexts'
  ],
  common_challenges = ARRAY[
    'Correcting child''s mistakes verbally - let materials teach',
    'Not demonstrating slow enough movements',
    'Using containers that are too large',
    'Demonstrating only once - repeat several times'
  ]
WHERE slug IN ('spooning', 'spoon-transfer', 'transfer-spooning')
   OR name ILIKE '%spooning%';

-- ============================================
-- CUTTING WITH SCISSORS
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• Start with NARROW BLANK STRIPS (½" wide) - single snip success builds confidence
• Thumb UP in smaller hole, fingers DOWN in larger hole - check grip before cutting
• Present SAFETY first: carry closed, cut away from body, pass handles first
• Progress: blank strips → straight lines → curves → zigzag → shapes
• Dominant hand cuts, non-dominant hand FEEDS paper toward scissors',
  video_search_term = 'montessori scissor cutting lesson presentation',
  presentation_steps = '[
    {"step": 1, "title": "Safety Introduction", "description": "Show closed scissors. Demonstrate safe carrying: pointed end in fist, walk slowly.", "tip": "Safety MUST come before cutting"},
    {"step": 2, "title": "Hand Position", "description": "Show thumb in small hole pointing UP, other fingers in large hole pointing DOWN.", "tip": "Check child''s grip before allowing cuts"},
    {"step": 3, "title": "Open-Close Practice", "description": "Practice opening and closing motion WITHOUT paper first.", "tip": "Build muscle memory before adding paper"},
    {"step": 4, "title": "First Cuts", "description": "Present narrow strip (½ inch). Show single snip that cuts strip in one motion.", "tip": "Narrow strips = single snip success"},
    {"step": 5, "title": "Paper Feeding", "description": "Demonstrate: non-dominant hand holds and FEEDS paper toward scissors.", "tip": "Paper moves, not scissors"},
    {"step": 6, "title": "Cutting Motion", "description": "Cut with slow, controlled movements. Place cut pieces in designated container.", "tip": "Container on right for cut pieces"},
    {"step": 7, "title": "Clean Up", "description": "Show returning scissors to holder, discarding scraps properly.", "tip": "Scissors ALWAYS returned closed"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Sound of paper cutting',
    'Visual satisfaction of separating paper',
    'Sensory feedback of hand movement',
    'Visual progression from uncut to cut strips'
  ],
  control_of_error = 'Child can see if cut was successful. Paper provides resistance feedback. Lines guide cutting.',
  variations = ARRAY[
    'Narrow blank strips → wider strips → marked lines',
    'Straight lines → diagonal → curved → zigzag',
    'Cutting pictures from magazines',
    'Cutting for collage projects',
    'Food cutting preparation (soft fruits)'
  ],
  common_challenges = ARRAY[
    'Using inappropriate scissors (not child-sized)',
    'Presenting complex patterns too early',
    'Not analyzing hand positions adequately',
    'Pressuring child for speed'
  ]
WHERE slug IN ('cutting', 'scissor-cutting', 'scissors', 'cutting-practice')
   OR name ILIKE '%cutting%' OR name ILIKE '%scissor%';

-- ============================================
-- FOLDING CLOTHS
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• Fold FROM BODY AWAY (bottom to top) - stitched line appears on fold edge
• Match CORNERS EXACTLY - this precision IS the point of interest
• SLIDE fingers along fold to smooth - don''t press hard (no crease yet)
• Use cloths with CONTRASTING STITCHED LINES as visual guides
• Progress: single horizontal → double → diagonal → double diagonal',
  video_search_term = 'montessori folding cloths presentation',
  presentation_steps = '[
    {"step": 1, "title": "Position Cloth", "description": "Place first cloth in front with wrong side up, stitched line horizontal.", "tip": "Line orientation matters"},
    {"step": 2, "title": "Run Finger Along Line", "description": "Run index finger along the stitched line from left to right.", "tip": "Shows child where to fold"},
    {"step": 3, "title": "Fold Motion", "description": "Place dominant hand above line, grasp lower corner with other hand, fold upward.", "tip": "Fold away from body"},
    {"step": 4, "title": "Match Corners", "description": "Align corners EXACTLY - take time, this is the key skill.", "tip": "Precision is the goal - don''t rush"},
    {"step": 5, "title": "Smooth Fold", "description": "Slide fingers gently along fold from center outward.", "tip": "Smooth, don''t crease hard"},
    {"step": 6, "title": "Release", "description": "Lift index finger first, then thumb - deliberate sequence.", "tip": "Clean release prevents shifting"},
    {"step": 7, "title": "Unfold and Repeat", "description": "Open cloth, return to start position, invite child to try.", "tip": "Always unfold before child''s turn"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Visual alignment of fabric edges',
    'Tactile sensation of smooth fabric',
    'Symmetry and order created by folding',
    'Visual progression of complexity'
  ],
  control_of_error = 'Stitched lines show correct alignment. Child can see if fold is even.',
  variations = ARRAY[
    'Single horizontal fold → double horizontal',
    'Single diagonal fold → double diagonal',
    'Folding napkins and kitchen towels',
    'Folding children''s own clothing',
    'Rolling socks'
  ],
  common_challenges = ARRAY[
    'Moving too quickly through progression',
    'Attempting four-step folds before mastering two-step',
    'Not maintaining proper posture (sit to child''s right)',
    'Using cloths without visual guides initially'
  ]
WHERE slug IN ('folding-simple', 'folding-complex', 'folding-cloth', 'cloth-folding')
   OR name ILIKE '%folding%cloth%' OR name ILIKE '%cloth%folding%';

-- ============================================
-- POLISHING (METAL/WOOD)
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• Apply SMALL amount of polish to cloth - less is more
• Rub in CIRCULAR motions - clockwise, consistent pressure
• BUFF with clean cloth for shine - separate cloths for polish and buff
• Visual transformation (dull → shiny) IS the point of interest
• Return ALL materials to basket in proper order',
  video_search_term = 'montessori polishing presentation brass wood',
  presentation_steps = '[
    {"step": 1, "title": "Put On Apron", "description": "Put on apron and have child put on theirs.", "tip": "Polish can stain clothing"},
    {"step": 2, "title": "Bring Materials", "description": "Bring polishing basket to table, place in top right corner.", "tip": "Materials organized in basket"},
    {"step": 3, "title": "Place Mat", "description": "Put polishing mat down to protect surface.", "tip": "Defines workspace"},
    {"step": 4, "title": "Apply Polish", "description": "Dip cloth in small amount of polish, or apply dot to cloth.", "tip": "Very small amount - less is more"},
    {"step": 5, "title": "Rub Object", "description": "Rub in circular motions, covering entire surface.", "tip": "Consistent pressure, clockwise circles"},
    {"step": 6, "title": "Buff to Shine", "description": "Take clean buffing cloth, rub until shiny.", "tip": "Different cloth for buffing"},
    {"step": 7, "title": "Admire Result", "description": "Hold object to light, admire the shine transformation.", "tip": "Visual feedback is rewarding"},
    {"step": 8, "title": "Return Materials", "description": "Return all items to basket in original order.", "tip": "Order teaches organization"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Visual transformation from dull to shiny',
    'Texture and smell of polish',
    'Circular motion feedback',
    'Immediate visible results of effort'
  ],
  control_of_error = 'Visual feedback of dullness or shine. Child can see if polish is applied unevenly.',
  variations = ARRAY[
    'Wood polishing with furniture oil',
    'Mirror/glass polishing',
    'Brass polishing',
    'Silver polishing',
    'Leather polishing'
  ],
  common_challenges = ARRAY[
    'Using too much polish',
    'Not demonstrating circular motion clearly',
    'Moving presentation too quickly',
    'Correcting child verbally during work'
  ]
WHERE slug IN ('polishing', 'metal-polishing', 'wood-polishing', 'polishing-wood', 'polishing-metal')
   OR name ILIKE '%polish%';

-- ============================================
-- DRESSING FRAMES
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• Present ONE frame at a time - master before progressing to next
• Order: Velcro → Snaps → Large buttons → Small buttons → Zipper → Buckles → Lacing → Bow
• SLOW demonstration - child watches complete unfastening then fastening
• Place frame flat on table - sit to child''s right
• Let child practice IMMEDIATELY after demonstration',
  video_search_term = 'montessori dressing frames presentation buttons zipper',
  presentation_steps = '[
    {"step": 1, "title": "Select Frame", "description": "Choose appropriate frame for child''s level. Start with velcro for beginners.", "tip": "Don''t present all frames at once"},
    {"step": 2, "title": "Position Frame", "description": "Place frame flat on table in front of child.", "tip": "Sit to child''s right"},
    {"step": 3, "title": "Open Fabric", "description": "Unfold the two fabric pieces to show the fasteners clearly.", "tip": "Child sees starting state"},
    {"step": 4, "title": "Unfasten Top to Bottom", "description": "Slowly unfasten each fastener from top to bottom.", "tip": "Top to bottom like reading"},
    {"step": 5, "title": "Open Completely", "description": "Spread fabric pieces apart to show fully open state.", "tip": "Pause to let child observe"},
    {"step": 6, "title": "Begin Fastening", "description": "Slowly fasten bottom fastener first, working upward.", "tip": "Bottom to top when closing"},
    {"step": 7, "title": "Complete Fastening", "description": "Continue until all fasteners are closed.", "tip": "Maintain slow, deliberate pace"},
    {"step": 8, "title": "Fold Fabric", "description": "Smooth and fold fabric pieces back to center.", "tip": "Frame looks tidy when done"},
    {"step": 9, "title": "Invite Child", "description": "Say Now you try and move to observe.", "tip": "Immediate practice essential"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Satisfying click of fasteners closing',
    'Visual alignment and matching',
    'Smooth pulling of zippers',
    'Thread movement through buttonholes'
  ],
  control_of_error = 'Fastener either closes properly or doesn''t - immediate feedback. Child can see if alignment is correct.',
  variations = ARRAY[
    'Velcro frame (easiest - start here)',
    'Snap fasteners frame',
    'Large buttons frame',
    'Small buttons frame',
    'Zipper frames (separating and non-separating)',
    'Buckle frame',
    'Lacing frame',
    'Bow tying frame (most advanced)'
  ],
  common_challenges = ARRAY[
    'Presenting all frames at once',
    'Not demonstrating slowly enough',
    'Moving to next frame before mastery',
    'Using frames inappropriate for developmental level'
  ]
WHERE slug ILIKE '%frame%' OR name ILIKE '%frame%' OR name ILIKE '%dressing%';

-- ============================================
-- HAND WASHING
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• Five steps: WET → SOAP → SCRUB (20 sec) → RINSE → DRY
• Scrub palms, backs, between fingers, under nails - ALL surfaces
• "Happy Birthday" song TWICE = 20 seconds scrubbing time
• Watch water run CLEAR before drying - visual control of error
• Demonstrate SILENTLY - actions teach better than words',
  video_search_term = 'montessori hand washing presentation practical life',
  presentation_steps = '[
    {"step": 1, "title": "Approach Basin", "description": "Walk to hand washing station, turn on water if needed.", "tip": "Check water temperature"},
    {"step": 2, "title": "Wet Hands", "description": "Place both hands under running water, turn them over to wet completely.", "tip": "Both sides of hands wet"},
    {"step": 3, "title": "Apply Soap", "description": "Take small amount of soap, distribute to both hands.", "tip": "Small amount is enough"},
    {"step": 4, "title": "Scrub Palms", "description": "Rub palms together in circular motion.", "tip": "Start the 20-second count"},
    {"step": 5, "title": "Scrub Backs", "description": "Scrub back of each hand with opposite palm.", "tip": "Interlace fingers"},
    {"step": 6, "title": "Between Fingers", "description": "Interlace fingers and scrub between them.", "tip": "Often missed area"},
    {"step": 7, "title": "Under Nails", "description": "Scrub fingertips in opposite palm to clean under nails.", "tip": "Where germs hide"},
    {"step": 8, "title": "Rinse Thoroughly", "description": "Rinse under running water until water runs clear.", "tip": "All soap removed"},
    {"step": 9, "title": "Dry Hands", "description": "Take towel, dry each hand completely.", "tip": "Same sequence as washing"},
    {"step": 10, "title": "Return Materials", "description": "Replace towel, turn off water if needed.", "tip": "Leave station ready for next person"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Water temperature and feel',
    'Soap texture and bubbles forming',
    'Water running clear (sign of completion)',
    'Feeling of clean, dry hands'
  ],
  control_of_error = 'Water running clear shows rinsing complete. Tactile feedback of cleanliness. Towel shows if hands still wet.',
  variations = ARRAY[
    'Hand washing before food preparation',
    'Hand washing after outdoor play',
    'Using different soaps',
    'Adding nail brush for thorough cleaning',
    'Hand lotion application after washing'
  ],
  common_challenges = ARRAY[
    'Explaining rather than demonstrating',
    'Moving too quickly through steps',
    'Using adult-sized station (should be child-height)',
    'Skipping steps in demonstration'
  ]
WHERE slug IN ('hand-washing', 'washing-hands', 'handwashing')
   OR name ILIKE '%hand wash%' OR name ILIKE '%washing hand%';

-- ============================================
-- TABLE SCRUBBING
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• 21-step sequence - practice alone MANY times before presenting
• Layout L-to-R: sponge → soap → brush → drying cloth → basin → pitcher
• Scrub in CIRCULAR motions - clockwise, overlapping circles
• Dry completely - run hand across to check for moisture
• Return ALL materials in ORDER - this teaches sequencing',
  video_search_term = 'montessori table scrubbing washing presentation',
  presentation_steps = '[
    {"step": 1, "title": "Put On Apron", "description": "Put on apron, push up sleeves.", "tip": "Protect clothing"},
    {"step": 2, "title": "Bring Materials", "description": "Carry each item one at a time to workspace.", "tip": "Multiple trips teach patience"},
    {"step": 3, "title": "Lay Out Mat", "description": "Place mat to left of table being scrubbed.", "tip": "Protects floor"},
    {"step": 4, "title": "Pour Water", "description": "Pour water from pitcher into basin.", "tip": "Use wet pouring skills"},
    {"step": 5, "title": "Wet Sponge", "description": "Dip sponge in water, squeeze out excess.", "tip": "Not too wet"},
    {"step": 6, "title": "Wet Table", "description": "Wipe entire table surface with wet sponge.", "tip": "Prepares surface"},
    {"step": 7, "title": "Apply Soap", "description": "Rub soap bar on wet brush or apply to sponge.", "tip": "Small amount"},
    {"step": 8, "title": "Scrub Surface", "description": "Scrub in circular motions, covering entire surface.", "tip": "Overlapping circles"},
    {"step": 9, "title": "Rinse Sponge", "description": "Rinse sponge in basin.", "tip": "May need to change water"},
    {"step": 10, "title": "Wipe Off Soap", "description": "Wipe away soap with clean sponge.", "tip": "Multiple passes"},
    {"step": 11, "title": "Dry Surface", "description": "Use drying cloth to dry entire table.", "tip": "No moisture should remain"},
    {"step": 12, "title": "Check Work", "description": "Run hand across table to check for moisture or residue.", "tip": "Control of error"},
    {"step": 13, "title": "Empty Basin", "description": "Pour dirty water into bucket or sink.", "tip": "Carefully"},
    {"step": 14, "title": "Return Materials", "description": "Return all materials to proper places in order.", "tip": "Same order they came out"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Sound of water being poured',
    'Smell of soap',
    'Feel of wet cloth becoming saturated',
    'Visual transformation of clean table'
  ],
  control_of_error = 'Run hand across table - moisture or residue can be felt. Visual inspection shows if clean.',
  variations = ARRAY[
    'Scrubbing different surfaces (wood vs. glass)',
    'Using different sized tables',
    'Introduction to natural cleaning products',
    'Connection to snack cleanup'
  ],
  common_challenges = ARRAY[
    'Not analyzing all steps beforehand',
    'Rushing the presentation',
    'Allowing child to skip steps',
    'Not providing proper workspace setup'
  ]
WHERE slug IN ('table-scrubbing', 'table-washing', 'scrubbing-table')
   OR name ILIKE '%table scrub%' OR name ILIKE '%table wash%';

-- ============================================
-- PLANT CARE
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• CHECK SOIL FIRST - poke two fingers in, if dry needs water
• Pour water at BASE of plant, avoid leaves
• Small amounts - soil moist not soggy (overwatering kills)
• Wipe leaves with DAMP cloth to remove dust
• Return watering can to shelf when done',
  video_search_term = 'montessori plant care watering presentation',
  presentation_steps = '[
    {"step": 1, "title": "Identify Plant", "description": "Go to plant shelf, select a plant that needs attention.", "tip": "Check several plants"},
    {"step": 2, "title": "Check Soil", "description": "Poke index and middle fingers into soil to feel moisture.", "tip": "Dry = needs water"},
    {"step": 3, "title": "Get Watering Can", "description": "Carry watering can with two hands to plant.", "tip": "Proper carrying"},
    {"step": 4, "title": "Position Can", "description": "Hold can properly: thumb over four fingers, other hand braces below spout.", "tip": "Steady grip"},
    {"step": 5, "title": "Pour at Base", "description": "Pour small amount of water directly onto soil at base of plant.", "tip": "Avoid getting leaves wet"},
    {"step": 6, "title": "Check Moisture", "description": "Wait, then check soil moisture again.", "tip": "Moist, not soggy"},
    {"step": 7, "title": "Return Can", "description": "Return watering can to proper place.", "tip": "Ready for next person"},
    {"step": 8, "title": "Leaf Care", "description": "Optional: wipe dusty leaves gently with damp cloth.", "tip": "Helps plant breathe"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Water flowing from can',
    'Change in soil appearance as water absorbs',
    'Feel of moist vs dry soil',
    'Plant growth over time'
  ],
  control_of_error = 'Soil feel shows moisture level. Plant health indicates proper care over time.',
  variations = ARRAY[
    'Different types of plants (varying needs)',
    'Misting leaves with spray bottle',
    'Seed planting and germination',
    'Repotting growing plants',
    'Outdoor garden care'
  ],
  common_challenges = ARRAY[
    'Not demonstrating soil check first',
    'Allowing overwatering',
    'Not teaching assessment (when does plant need water)',
    'Ignoring dead plants instead of discussing'
  ]
WHERE slug IN ('plant-care', 'watering-plants', 'care-of-plants')
   OR name ILIKE '%plant%care%' OR name ILIKE '%water%plant%';

-- ============================================
-- FOOD PREPARATION - SPREADING
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• Hold knife with proper grip - thumb on top, fingers wrapped around handle
• SCOOP small amount of spread - don''t overload knife
• Hold bread steady with non-dominant hand
• Spread from CENTER outward to edges - smooth strokes
• Progress: soft spreads (avocado) → firm (butter) → thick (peanut butter)',
  video_search_term = 'montessori spreading butter bread food preparation',
  presentation_steps = '[
    {"step": 1, "title": "Wash Hands", "description": "Complete hand washing before food preparation.", "tip": "Hygiene first"},
    {"step": 2, "title": "Put On Apron", "description": "Put on apron to protect clothing.", "tip": "Food can be messy"},
    {"step": 3, "title": "Gather Materials", "description": "Bring bread, spread, knife, plate to workspace.", "tip": "Everything ready"},
    {"step": 4, "title": "Demonstrate Grip", "description": "Show proper knife grip: thumb on top, fingers around handle.", "tip": "Safe grip"},
    {"step": 5, "title": "Scoop Spread", "description": "Scoop small amount of spread onto knife.", "tip": "Less is more"},
    {"step": 6, "title": "Hold Bread", "description": "Place bread on plate, hold steady with non-dominant hand.", "tip": "Bread doesn''t move"},
    {"step": 7, "title": "Spread Motion", "description": "Starting at center, spread outward to edges in smooth strokes.", "tip": "Even coverage"},
    {"step": 8, "title": "Cover Surface", "description": "Continue until bread is evenly covered.", "tip": "Check edges"},
    {"step": 9, "title": "Place on Plate", "description": "Place finished piece on plate to right.", "tip": "Ready to eat"},
    {"step": 10, "title": "Clean Up", "description": "Return materials, wipe any drips.", "tip": "Leave workspace clean"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Visible spread coverage',
    'Texture change in bread',
    'Immediate sensory feedback',
    'Satisfaction of even application'
  ],
  control_of_error = 'Visual feedback shows coverage. Torn bread indicates too much pressure.',
  variations = ARRAY[
    'Different spreads (butter, jam, cream cheese, hummus)',
    'Different bases (bread, crackers, vegetables)',
    'Making sandwiches (multi-step)',
    'Preparing snack for group'
  ],
  common_challenges = ARRAY[
    'Talking too much during demonstration',
    'Not analyzing hand positions beforehand',
    'Using adult-sized utensils',
    'Progressing to harder spreads too quickly'
  ]
WHERE slug IN ('spreading', 'food-spreading', 'butter-spreading')
   OR name ILIKE '%spread%';

-- ============================================
-- FOOD PREPARATION - CUTTING/SLICING
-- ============================================

UPDATE montessori_works SET
  quick_guide = '• SAFETY FIRST: carry knife closed/pointed down, cut away from body, pass handle first
• "CLAW GRIP" for holding food - fingertips curled under, knuckles forward
• Start from END opposite your body, slice in controlled downward motion
• Progress: wooden knife + soft food → blunt serrated → child-safe sharp
• Foods: banana → avocado → cucumber → apple → carrot (soft to firm)',
  video_search_term = 'montessori cutting food knife safety child',
  presentation_steps = '[
    {"step": 1, "title": "Safety Discussion", "description": "Discuss knife safety: respect, proper carrying, passing handles first.", "tip": "Safety before skills"},
    {"step": 2, "title": "Demonstrate Carry", "description": "Show carrying knife: pointed end in fist, walk slowly.", "tip": "Never run with knife"},
    {"step": 3, "title": "Position Food", "description": "Place food on cutting board, stable position.", "tip": "Board prevents slipping"},
    {"step": 4, "title": "Claw Grip", "description": "Show claw grip for holding food: fingertips curled under, knuckles forward.", "tip": "Protects fingers"},
    {"step": 5, "title": "Knife Position", "description": "Hold knife properly, position at far end of food.", "tip": "Cut away from body"},
    {"step": 6, "title": "Cutting Motion", "description": "Press down with controlled motion, slice through food.", "tip": "Steady, not fast"},
    {"step": 7, "title": "Place Piece", "description": "Move cut piece to bowl on right side.", "tip": "Keep organized"},
    {"step": 8, "title": "Continue", "description": "Reposition food, continue cutting to end.", "tip": "Same technique throughout"},
    {"step": 9, "title": "Clean Knife", "description": "Wipe knife, return to proper storage.", "tip": "Knife always stored safely"}
  ]'::jsonb,
  points_of_interest = ARRAY[
    'Sound of knife cutting through food',
    'Visual creation of pieces',
    'Texture feedback of knife movement',
    'Satisfaction of creating uniform slices'
  ],
  control_of_error = 'Uneven cuts visible. Fingers protected by claw grip. Safety feedback immediate.',
  variations = ARRAY[
    'Wooden knife with soft fruits (banana)',
    'Butter knife with soft items',
    'Serrated child knife with firmer foods',
    'Different cutting styles (rounds, sticks, cubes)'
  ],
  common_challenges = ARRAY[
    'Talking too much during demonstration',
    'Using inappropriate knife for child''s level',
    'Not emphasizing proper finger positioning',
    'Progressing to harder foods too quickly'
  ]
WHERE slug IN ('cutting-food', 'slicing', 'food-cutting', 'cutting-soft', 'cutting-hard')
   OR name ILIKE '%cutting%food%' OR name ILIKE '%slic%';

-- ============================================
-- VERIFY UPDATES
-- ============================================
SELECT
  name,
  slug,
  CASE WHEN quick_guide IS NOT NULL THEN '✓' ELSE '✗' END as has_guide,
  CASE WHEN presentation_steps IS NOT NULL AND presentation_steps != '[]'::jsonb THEN '✓' ELSE '✗' END as has_steps,
  CASE WHEN points_of_interest IS NOT NULL AND array_length(points_of_interest, 1) > 0 THEN '✓' ELSE '✗' END as has_poi
FROM montessori_works
WHERE curriculum_area = 'practical_life'
ORDER BY sequence_order
LIMIT 30;
