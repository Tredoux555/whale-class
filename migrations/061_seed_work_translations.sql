-- Migration: 061_seed_work_translations.sql
-- Purpose: Seed montree_work_translations with top 50 Montessori works
-- Session 49: Record-Keeping System
-- Created: 2026-01-22

-- First check the table structure
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'montree_work_translations';

-- Practical Life (10 works)
INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('pouring-water', 'Pouring Water', 'practical_life', 
 'Develops hand-eye coordination, concentration, and independence. This foundational skill builds confidence and prepares for self-care.',
 'Let your child pour their own water at meals using a small pitcher.',
 '{name} practiced pouring water with careful concentration.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  area = EXCLUDED.area,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('spooning', 'Spooning', 'practical_life',
 'Strengthens the pencil grip muscles and develops concentration. The transfer motion prepares for writing and self-feeding.',
 'Let your child help transfer ingredients while cooking together.',
 '{name} worked on transferring with a spoon.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('dressing-frames', 'Dressing Frames', 'practical_life',
 'Builds independence in self-care. Mastering buttons, zippers, and snaps develops fine motor control and self-confidence.',
 'Encourage your child to dress themselves, even if it takes longer.',
 '{name} practiced fastening with the dressing frame.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('polishing', 'Polishing', 'practical_life',
 'Develops care for the environment and attention to detail. The circular motion strengthens hand muscles for writing.',
 'Let your child help polish shoes or shine mirrors at home.',
 '{name} polished with careful circular motions.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('food-preparation', 'Food Preparation', 'practical_life',
 'Builds independence, sequencing skills, and practical math concepts. Following steps develops executive function.',
 'Involve your child in simple food prep like spreading, cutting soft foods, or mixing.',
 '{name} prepared food independently today.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('table-washing', 'Table Washing', 'practical_life',
 'Teaches care for the environment and introduces sequencing. The full cycle of work builds concentration and completion.',
 'Let your child wipe down their table or help wash surfaces at home.',
 '{name} washed the table following all the steps.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('flower-arranging', 'Flower Arranging', 'practical_life',
 'Develops aesthetic sense and care for living things. Requires planning, fine motor control, and spatial awareness.',
 'Let your child arrange flowers or plants at home.',
 '{name} arranged flowers beautifully.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('threading', 'Threading/Lacing', 'practical_life',
 'Strengthens fine motor skills and hand-eye coordination. Direct preparation for sewing and writing.',
 'Provide large beads or pasta for threading at home.',
 '{name} practiced threading with concentration.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('cutting', 'Cutting with Scissors', 'practical_life',
 'Develops bilateral coordination and fine motor strength. The controlled motion prepares for precise hand movements.',
 'Provide safety scissors and paper strips for cutting practice.',
 '{name} practiced cutting with careful control.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;

INSERT INTO montree_work_translations (work_id, display_name, area, developmental_context, home_extension, photo_caption_template)
VALUES 
('grace-courtesy', 'Grace and Courtesy', 'practical_life',
 'Teaches social skills and cultural norms. Role-playing greetings and manners builds confidence in social situations.',
 'Practice polite phrases and greetings together.',
 '{name} practiced grace and courtesy today.')
ON CONFLICT (work_id) DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  developmental_context = EXCLUDED.developmental_context,
  home_extension = EXCLUDED.home_extension;
