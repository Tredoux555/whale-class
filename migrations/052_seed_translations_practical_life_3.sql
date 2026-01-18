-- ============================================
-- PHASE 8: WORK TRANSLATIONS SEED - PRACTICAL LIFE (Part 3)
-- Developmental context for parent reports
-- Session 52 - January 18, 2026
-- PURE ENGLISH VERSION
-- ============================================

-- PRACTICAL LIFE: Food Preparation
INSERT INTO montree_work_translations (work_id, display_name, developmental_context, home_extension, photo_caption_template, area, category) VALUES

('pl_washing_produce', 'Washing Fruits and Vegetables',
'Washing produce teaches food hygiene and preparation basics. Children learn that food requires care before eating and develop water control skills.',
'Let your child wash produce before meals, learning hygiene habits.',
'{name} prepares healthy food by carefully washing fruits and vegetables.',
'practical_life', 'food_preparation'),

('pl_spreading', 'Spreading',
'Spreading develops tool use and teaches children to cover surfaces evenly. This skill directly applies to preparing their own snacks and meals.',
'Practice spreading butter, jam, or cream cheese on bread.',
'{name} uses a spreader skillfully to prepare their own snack.',
'practical_life', 'food_preparation'),

('pl_peeling_easy', 'Peeling (Easy - Banana/Orange)',
'Peeling easy fruits teaches children to remove inedible parts and develops fine motor control. Success builds confidence for harder peeling tasks.',
'Let your child peel their own bananas and easy citrus fruits.',
'{name} independently peels fruit, developing self-sufficiency.',
'practical_life', 'food_preparation'),

('pl_peeling_tool', 'Peeling (With Peeler)',
'Using a peeler safely teaches tool use and vegetable preparation. Children learn to work carefully with sharper tools.',
'Supervised vegetable peeling teaches tool safety and preparation skills.',
'{name} carefully uses a peeler, learning safe tool techniques.',
'practical_life', 'food_preparation'),

('pl_cutting_soft', 'Cutting Soft Foods',
'Cutting soft foods introduces knife safety and develops coordination. Children learn proper technique in a low-risk environment.',
'Start with banana slicing using a child-safe knife.',
'{name} carefully cuts soft foods, developing safe knife skills.',
'practical_life', 'food_preparation'),

('pl_cutting_hard', 'Cutting Harder Foods',
'Cutting harder foods requires more control and proper technique. Children develop the strength and precision for real food preparation.',
'Progress to harder vegetables with proper supervision and technique.',
'{name} shows good technique cutting harder foods safely.',
'practical_life', 'food_preparation'),

('pl_grating', 'Grating',
'Grating develops hand strength and teaches children to work with force safely. This skill prepares many ingredients for cooking.',
'Cheese grating is a satisfying and useful kitchen contribution.',
'{name} develops hand strength and control through grating.',
'practical_life', 'food_preparation'),

('pl_juicing', 'Juicing',
'Juicing teaches children to extract liquid from fruit using hand strength. They see how food can be transformed through their effort.',
'Manual citrus juicers make breakfast preparation engaging.',
'{name} makes fresh juice, transforming fruit through their own effort.',
'practical_life', 'food_preparation'),

('pl_cracking_eggs', 'Cracking Eggs',
'Cracking eggs requires precise control and teaches children to work with fragile materials. This advanced skill brings great pride.',
'Practice egg cracking into a separate bowl before adding to recipes.',
'{name} masters the challenging skill of cracking eggs.',
'practical_life', 'food_preparation'),

('pl_making_snack', 'Making a Simple Snack',
'Preparing complete snacks teaches sequencing and builds independence. Children experience the satisfaction of feeding themselves.',
'Help your child plan and prepare a simple snack independently.',
'{name} prepares their own snack, demonstrating independence and capability.',
'practical_life', 'food_preparation');

-- PRACTICAL LIFE: Sewing and Needlework
INSERT INTO montree_work_translations (work_id, display_name, developmental_context, home_extension, photo_caption_template, area, category) VALUES

('pl_threading_beads', 'Threading Beads',
'Bead threading develops fine motor precision and concentration. Children create something beautiful while strengthening hand-eye coordination.',
'Provide beads and string for creating necklaces or patterns.',
'{name} concentrates deeply while threading beads.',
'practical_life', 'sewing'),

('pl_sewing_cards', 'Sewing Cards',
'Sewing cards introduce the up-down motion of sewing in a simplified form. Children develop the pattern recognition needed for real sewing.',
'Sewing cards provide engaging pre-sewing practice at home.',
'{name} practices the up-down sewing motion using sewing cards.',
'practical_life', 'sewing'),

('pl_punching', 'Punching Holes',
'Punching develops hand strength and prepares materials for sewing. Children learn to space holes evenly for successful stitching.',
'Punching holes in paper or craft foam makes custom sewing projects.',
'{name} prepares materials for sewing by punching even holes.',
'practical_life', 'sewing'),

('pl_running_stitch', 'Running Stitch',
'The running stitch teaches the fundamental sewing motion with needle and thread. Children experience real sewing success.',
'Simple burlap and yarn make safe running stitch practice.',
'{name} learns the running stitch, the foundation of all sewing.',
'practical_life', 'sewing'),

('pl_cross_stitch', 'Cross Stitch',
'Cross stitch combines sewing skill with pattern following and counting. Children create decorative work through precise stitches.',
'Simple cross stitch kits introduce decorative sewing.',
'{name} combines counting and sewing skills in cross stitch work.',
'practical_life', 'sewing'),

('pl_button_sewing', 'Sewing on a Button',
'Button sewing teaches a practical repair skill and develops precise stitching. Children can truly help maintain their own clothing.',
'Practice on fabric scraps before repairing real clothing.',
'{name} learns the practical skill of sewing buttons.',
'practical_life', 'sewing'),

('pl_weaving', 'Weaving',
'Weaving develops pattern recognition and bilateral coordination. Children see how individual threads create unified fabric.',
'Simple paper or loom weaving introduces this traditional craft.',
'{name} creates fabric through the patient work of weaving.',
'practical_life', 'sewing');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Practical Life translations (Part 3) seeded successfully!';
  RAISE NOTICE 'Categories: food_preparation (10), sewing (7)';
END $$;
