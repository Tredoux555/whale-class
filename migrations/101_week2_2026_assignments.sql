-- Session 101: Import Week 2, 2026 Assignments for Whale Class
-- Run this in Supabase SQL Editor

-- First, get child IDs (run this to verify)
-- SELECT id, name FROM children WHERE classroom_id IS NOT NULL ORDER BY name;

-- Clear any existing Week 2, 2026 assignments
DELETE FROM weekly_assignments WHERE week_number = 2 AND year = 2026;

-- Insert all assignments using child names to look up IDs
-- Amy
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Cutting Practice', 'practical_life', 'presented' FROM children WHERE name = 'Amy';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Constructive Triangles 3', 'sensorial', 'not_started' FROM children WHERE name = 'Amy';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Number Formation', 'math', 'not_started' FROM children WHERE name = 'Amy';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Review Box 1', 'language', 'not_started' FROM children WHERE name = 'Amy';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Colored Globe', 'cultural', 'not_started' FROM children WHERE name = 'Amy';

-- Austin
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Flower Arranging', 'practical_life', 'presented' FROM children WHERE name = 'Austin';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Thermal Tablets Pairing', 'sensorial', 'not_started' FROM children WHERE name = 'Austin';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bank Game Addition', 'math', 'not_started' FROM children WHERE name = 'Austin';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Building Work with /i/', 'language', 'not_started' FROM children WHERE name = 'Austin';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bird Studies', 'cultural', 'not_started' FROM children WHERE name = 'Austin';

-- Eric
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Table Washing', 'practical_life', 'presented' FROM children WHERE name = 'Eric';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Geometry Figures', 'sensorial', 'not_started' FROM children WHERE name = 'Eric';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Positive Snake Game', 'math', 'not_started' FROM children WHERE name = 'Eric';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Family Work with /u/', 'language', 'not_started' FROM children WHERE name = 'Eric';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Leaves Combined', 'cultural', 'not_started' FROM children WHERE name = 'Eric';

-- Gengerlyn (no Cultural listed)
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Flower Arranging', 'practical_life', 'presented' FROM children WHERE name = 'Gengerlyn';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Binomial Cube', 'sensorial', 'not_started' FROM children WHERE name = 'Gengerlyn';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Numerals and Counters', 'math', 'not_started' FROM children WHERE name = 'Gengerlyn';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'CVC 3-Part Cards Moveable Alphabet', 'language', 'not_started' FROM children WHERE name = 'Gengerlyn';

-- Hayden
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Table Washing', 'practical_life', 'presented' FROM children WHERE name = 'Hayden';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Color Box 3', 'sensorial', 'not_started' FROM children WHERE name = 'Hayden';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Number and Quantity', 'math', 'not_started' FROM children WHERE name = 'Hayden';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'I Spy Red Book 1', 'language', 'not_started' FROM children WHERE name = 'Hayden';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Tree Puzzle LA', 'cultural', 'not_started' FROM children WHERE name = 'Hayden';

-- Henry
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Spooning Practice', 'practical_life', 'presented' FROM children WHERE name = 'Henry';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Touch Boards', 'sensorial', 'not_started' FROM children WHERE name = 'Henry';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Linear Counting 5', 'math', 'not_started' FROM children WHERE name = 'Henry';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Matching Work', 'language', 'not_started' FROM children WHERE name = 'Henry';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Horse Puzzle LA', 'cultural', 'not_started' FROM children WHERE name = 'Henry';

-- Jimmy
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Dressing Frame Bow', 'practical_life', 'presented' FROM children WHERE name = 'Jimmy';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Constructive Triangles', 'sensorial', 'not_started' FROM children WHERE name = 'Jimmy';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Long Chain with Labels', 'math', 'not_started' FROM children WHERE name = 'Jimmy';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Family Work with /i/', 'language', 'not_started' FROM children WHERE name = 'Jimmy';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'How to Make Ice', 'cultural', 'not_started' FROM children WHERE name = 'Jimmy';

-- Joey
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Stringing Seed Beads', 'practical_life', 'presented' FROM children WHERE name = 'Joey';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Color Box 3', 'sensorial', 'not_started' FROM children WHERE name = 'Joey';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Linear Counting 6', 'math', 'not_started' FROM children WHERE name = 'Joey';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Family Work with /u/', 'language', 'not_started' FROM children WHERE name = 'Joey';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bird Puzzle', 'cultural', 'not_started' FROM children WHERE name = 'Joey';

-- Kayla
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Knitting', 'practical_life', 'presented' FROM children WHERE name = 'Kayla';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Sensorial Games', 'sensorial', 'not_started' FROM children WHERE name = 'Kayla';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Number Formation', 'math', 'not_started' FROM children WHERE name = 'Kayla';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'I Spy Red Book 1', 'language', 'not_started' FROM children WHERE name = 'Kayla';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Horse Puzzle LA', 'cultural', 'not_started' FROM children WHERE name = 'Kayla';

-- Kevin
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Rubber Band Skipping', 'practical_life', 'presented' FROM children WHERE name = 'Kevin';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Tasting Bottles', 'sensorial', 'not_started' FROM children WHERE name = 'Kevin';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Finger Chart 2', 'math', 'not_started' FROM children WHERE name = 'Kevin';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Phonics Book 2', 'language', 'not_started' FROM children WHERE name = 'Kevin';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Tree Puzzle', 'cultural', 'not_started' FROM children WHERE name = 'Kevin';

-- KK
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Braiding', 'practical_life', 'presented' FROM children WHERE name = 'KK';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Roman Arch', 'sensorial', 'not_started' FROM children WHERE name = 'KK';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Positive Snake Game', 'math', 'not_started' FROM children WHERE name = 'KK';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Building Work with /u/', 'language', 'not_started' FROM children WHERE name = 'KK';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bird Puzzle LA', 'cultural', 'not_started' FROM children WHERE name = 'KK';

-- Leo
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Dressing Frame Shoes', 'practical_life', 'presented' FROM children WHERE name = 'Leo';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Geometry Combined with Cards', 'sensorial', 'not_started' FROM children WHERE name = 'Leo';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Boards with Numbers', 'math', 'not_started' FROM children WHERE name = 'Leo';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Building Work with /o/', 'language', 'not_started' FROM children WHERE name = 'Leo';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Maps', 'cultural', 'not_started' FROM children WHERE name = 'Leo';

-- Lucky
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Food Preparation', 'practical_life', 'presented' FROM children WHERE name = 'Lucky';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Geometry Figures', 'sensorial', 'not_started' FROM children WHERE name = 'Lucky';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Skip Counting by 8', 'math', 'not_started' FROM children WHERE name = 'Lucky';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Family Work with /o/', 'language', 'not_started' FROM children WHERE name = 'Lucky';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Cultural Envelope', 'cultural', 'not_started' FROM children WHERE name = 'Lucky';

-- MaoMao (no Cultural listed)
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Table Washing', 'practical_life', 'presented' FROM children WHERE name = 'MaoMao';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Color Box 3', 'sensorial', 'not_started' FROM children WHERE name = 'MaoMao';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Number Rods', 'math', 'not_started' FROM children WHERE name = 'MaoMao';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Beginning Sounds - I Spy', 'language', 'not_started' FROM children WHERE name = 'MaoMao';

-- MingXi
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Weaving Craft', 'practical_life', 'presented' FROM children WHERE name = 'MingXi';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bells Matching', 'sensorial', 'not_started' FROM children WHERE name = 'MingXi';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bank Game Addition', 'math', 'not_started' FROM children WHERE name = 'MingXi';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Building Work with /o/', 'language', 'not_started' FROM children WHERE name = 'MingXi';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Maps', 'cultural', 'not_started' FROM children WHERE name = 'MingXi';

-- NiuNiu
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Folding', 'practical_life', 'presented' FROM children WHERE name = 'NiuNiu';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Constructive Triangles', 'sensorial', 'not_started' FROM children WHERE name = 'NiuNiu';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Linear Counting 8', 'math', 'not_started' FROM children WHERE name = 'NiuNiu';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Building Work with /e/', 'language', 'not_started' FROM children WHERE name = 'NiuNiu';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Roman Arch', 'cultural', 'not_started' FROM children WHERE name = 'NiuNiu';

-- Rachel
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Knitting', 'practical_life', 'presented' FROM children WHERE name = 'Rachel';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Geometric Solids', 'sensorial', 'not_started' FROM children WHERE name = 'Rachel';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bank Game Addition', 'math', 'not_started' FROM children WHERE name = 'Rachel';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Building Work with /i/', 'language', 'not_started' FROM children WHERE name = 'Rachel';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Color Mixing', 'cultural', 'not_started' FROM children WHERE name = 'Rachel';

-- Segina
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Wet Pouring', 'practical_life', 'presented' FROM children WHERE name = 'Segina';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Pink Tower LA Game', 'sensorial', 'not_started' FROM children WHERE name = 'Segina';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Number Rods with Cards', 'math', 'not_started' FROM children WHERE name = 'Segina';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Matching Work', 'language', 'not_started' FROM children WHERE name = 'Segina';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bird Puzzle LA', 'cultural', 'not_started' FROM children WHERE name = 'Segina';

-- Stella
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Dressing Frame', 'practical_life', 'presented' FROM children WHERE name = 'Stella';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Roman Arch Practice', 'sensorial', 'not_started' FROM children WHERE name = 'Stella';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bank Game Addition', 'math', 'not_started' FROM children WHERE name = 'Stella';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Word Building Work with /e/', 'language', 'not_started' FROM children WHERE name = 'Stella';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Leaf Shape Cabinet and Cards', 'cultural', 'not_started' FROM children WHERE name = 'Stella';

-- YueZe
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Fuse Bead Work', 'practical_life', 'presented' FROM children WHERE name = 'YueZe';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Thermal Tablets Grading', 'sensorial', 'not_started' FROM children WHERE name = 'YueZe';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Finger Charts 3', 'math', 'not_started' FROM children WHERE name = 'YueZe';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Mixed Box 1', 'language', 'not_started' FROM children WHERE name = 'YueZe';
INSERT INTO weekly_assignments (child_id, week_number, year, work_name, area, status)
SELECT id, 2, 2026, 'Bird Nomenclature', 'cultural', 'not_started' FROM children WHERE name = 'YueZe';

-- Verify the import
SELECT 
  c.name as child_name,
  wa.work_name,
  wa.area,
  wa.status
FROM weekly_assignments wa
JOIN children c ON c.id = wa.child_id
WHERE wa.week_number = 2 AND wa.year = 2026
ORDER BY c.name, wa.area;
