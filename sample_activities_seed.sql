-- Sample Activities Seed Data
-- Run this in Supabase SQL Editor to populate the activities table

INSERT INTO activities (name, area, skill_level, age_min, age_max, instructions, learning_goals, materials_needed, prerequisites) VALUES
-- Practical Life Activities
('Pouring Water', 'practical_life', 1, 2.5, 4.0, 
 'Set up two small pitchers on a tray. Show child how to pour water from one pitcher to the other. Practice until child can pour without spilling.',
 ARRAY['Develop hand-eye coordination', 'Practice fine motor skills', 'Learn independence'],
 ARRAY['Two small pitchers', 'Tray', 'Water', 'Sponge'],
 NULL),

('Buttoning Frame', 'practical_life', 2, 3.0, 5.0,
 'Use a dressing frame with large buttons. Show child how to button and unbutton. Practice until child can do it independently.',
 ARRAY['Develop fine motor skills', 'Learn self-dressing', 'Practice patience'],
 ARRAY['Buttoning frame', 'Large buttons'],
 NULL),

('Sweeping', 'practical_life', 1, 2.5, 4.0,
 'Provide child-sized broom and dustpan. Show how to sweep small objects into dustpan. Practice cleaning up spills.',
 ARRAY['Learn practical life skills', 'Develop gross motor skills', 'Understand care of environment'],
 ARRAY['Child-sized broom', 'Dustpan', 'Small objects to sweep'],
 NULL),

-- Sensorial Activities
('Color Box 1', 'sensorial', 1, 2.5, 4.0,
 'Introduce three primary colors (red, blue, yellow) using color tablets. Match colors and name them.',
 ARRAY['Learn color recognition', 'Develop visual discrimination', 'Build vocabulary'],
 ARRAY['Color Box 1 (red, blue, yellow tablets)'],
 NULL),

('Pink Tower', 'sensorial', 2, 3.0, 5.0,
 'Build tower from largest to smallest cube. Develop understanding of size gradation.',
 ARRAY['Understand size relationships', 'Develop visual discrimination', 'Practice precision'],
 ARRAY['Pink Tower (10 cubes)'],
 NULL),

('Sound Cylinders', 'sensorial', 2, 3.0, 5.0,
 'Match pairs of cylinders by sound. Shake and listen carefully to find matches.',
 ARRAY['Develop auditory discrimination', 'Practice concentration', 'Learn matching'],
 ARRAY['Sound cylinders (6 pairs)'],
 NULL),

-- Mathematics Activities
('Number Rods', 'mathematics', 2, 3.5, 5.5,
 'Introduce quantities 1-10 using number rods. Count and compare lengths.',
 ARRAY['Learn number quantities', 'Understand number sequence', 'Develop visual number sense'],
 ARRAY['Number rods (1-10)'],
 NULL),

('Sandpaper Numbers', 'mathematics', 1, 3.0, 5.0,
 'Trace sandpaper numbers 0-9 with fingers. Learn number symbols through touch.',
 ARRAY['Learn number symbols', 'Develop tactile sense', 'Prepare for writing'],
 ARRAY['Sandpaper numbers (0-9)'],
 NULL),

-- Language Arts Activities
('Sandpaper Letters', 'language_arts', 1, 3.0, 5.0,
 'Trace sandpaper letters with fingers. Learn letter sounds and shapes.',
 ARRAY['Learn letter sounds', 'Develop tactile sense', 'Prepare for reading'],
 ARRAY['Sandpaper letters (lowercase)'],
 NULL),

('Moveable Alphabet', 'language_arts', 3, 4.0, 6.0,
 'Use moveable alphabet to build words. Start with simple 3-letter words.',
 ARRAY['Practice spelling', 'Build words', 'Develop phonemic awareness'],
 ARRAY['Moveable alphabet', 'Picture cards'],
 ARRAY['Knows letter sounds']),

-- English Language Activities
('Phonics Song - Letter P', 'english', 1, 2.5, 4.0,
 'Sing Jolly Phonics song for letter P. Practice /p/ sound with actions.',
 ARRAY['Learn letter sound', 'Develop phonemic awareness', 'Practice pronunciation'],
 ARRAY['Jolly Phonics video', 'Letter P card'],
 NULL),

('Rhyming Words', 'english', 2, 3.5, 5.0,
 'Match picture cards that rhyme. Practice saying rhyming pairs.',
 ARRAY['Develop phonemic awareness', 'Learn rhyming', 'Build vocabulary'],
 ARRAY['Rhyming picture cards'],
 ARRAY['Knows basic vocabulary']),

-- Cultural Studies Activities
('Parts of a Plant', 'cultural_studies', 2, 3.5, 5.5,
 'Learn parts of a plant using puzzle or real plant. Name roots, stem, leaves, flower.',
 ARRAY['Learn plant parts', 'Develop vocabulary', 'Understand nature'],
 ARRAY['Plant puzzle or real plant', 'Picture cards'],
 NULL),

('World Map Puzzle', 'cultural_studies', 3, 4.0, 6.0,
 'Assemble world map puzzle. Learn continent names and locations.',
 ARRAY['Learn geography', 'Understand world map', 'Develop spatial awareness'],
 ARRAY['World map puzzle'],
 ARRAY['Knows basic geography']);

-- Verify the insert
SELECT COUNT(*) as total_activities FROM activities;
SELECT area, COUNT(*) as count FROM activities GROUP BY area ORDER BY area;
