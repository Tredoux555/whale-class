-- Bulk Import Students for Whale Class
-- Generated: 2026-01-31T11:31:56.520Z
-- Classroom ID: PLACEHOLDER_ID

-- Note: This uses the EXISTING classroom. Make sure curriculum is seeded first.

-- ============================================
-- INSERT STUDENTS
-- ============================================

-- Amy
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Amy', 4)
ON CONFLICT DO NOTHING;

-- Austin
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Austin', 4)
ON CONFLICT DO NOTHING;

-- Eric
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Eric', 4)
ON CONFLICT DO NOTHING;

-- Gengerlyn
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Gengerlyn', 4)
ON CONFLICT DO NOTHING;

-- Hayden
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Hayden', 4)
ON CONFLICT DO NOTHING;

-- Henry
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Henry', 4)
ON CONFLICT DO NOTHING;

-- Jimmy
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Jimmy', 4)
ON CONFLICT DO NOTHING;

-- Joey
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Joey', 4)
ON CONFLICT DO NOTHING;

-- Kayla
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Kayla', 4)
ON CONFLICT DO NOTHING;

-- Kevin
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Kevin', 4)
ON CONFLICT DO NOTHING;

-- KK
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'KK', 4)
ON CONFLICT DO NOTHING;

-- Leo
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Leo', 4)
ON CONFLICT DO NOTHING;

-- Lucky
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Lucky', 4)
ON CONFLICT DO NOTHING;

-- MaoMao
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'MaoMao', 4)
ON CONFLICT DO NOTHING;

-- MingXi
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'MingXi', 4)
ON CONFLICT DO NOTHING;

-- NiuNiu
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'NiuNiu', 4)
ON CONFLICT DO NOTHING;

-- Rachel
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Rachel', 4)
ON CONFLICT DO NOTHING;

-- Segina
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Segina', 4)
ON CONFLICT DO NOTHING;

-- Stella
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'Stella', 4)
ON CONFLICT DO NOTHING;

-- YueZe
INSERT INTO montree_children (classroom_id, name, age)
VALUES ('PLACEHOLDER_ID', 'YueZe', 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERT PROGRESS (current works)
-- ============================================

-- Amy's current works
-- practical_life: "Cutting Practice" -> "Cutting Practice" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Cutting Practice', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Amy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Constructive Triangles 3" -> "Constructive Triangles - Triangular Box" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Constructive Triangles - Triangular Box', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Amy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Number Formation" -> "Sandpaper Numerals" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Sandpaper Numerals', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Amy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Review Box 1" -> "Review Box 1" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Review Box 1', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Amy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Colored Globe" -> "Globe - Continents" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Globe - Continents', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Amy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Austin's current works
-- practical_life: "Flower Arranging" -> "Flower Arranging" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Flower Arranging', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Austin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Thermal Tablets Pairing" -> "Thermic Tablets" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Thermic Tablets', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Austin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Bank Game Addition" -> "Addition Snake Game" [MEDIUM (0.55)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Addition Snake Game', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Austin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Building Work with /i/" -> "Moveable Alphabet" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Moveable Alphabet', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Austin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Bird Studies" -> "Bird Studies" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Bird Studies', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Austin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Eric's current works
-- practical_life: "Table Washing" -> "Face Washing" [MEDIUM (0.77)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Face Washing', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Eric' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Geometry Figures" -> "Geometric Solids" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Geometric Solids', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Eric' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Positive Snake Game" -> "Addition Snake Game" [MEDIUM (0.74)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Addition Snake Game', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Eric' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Family Work with /u/" -> "Word Families" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Word Families', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Eric' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Leaves Combined" -> "Leaves Combined" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Leaves Combined', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Eric' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Gengerlyn's current works
-- practical_life: "Flower Arranging" -> "Flower Arranging" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Flower Arranging', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Gengerlyn' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Binomial Cube" -> "Binomial Cube" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Binomial Cube', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Gengerlyn' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Numerals and Counters" -> "Cards and Counters" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Cards and Counters', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Gengerlyn' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "CVC 3-Part Cards Moveable Alphabet" -> "Moveable Alphabet" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Moveable Alphabet', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Gengerlyn' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Hayden's current works
-- practical_life: "Table Washing" -> "Face Washing" [MEDIUM (0.77)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Face Washing', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Hayden' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Color Box 3" -> "Color Box 3 (Color Gradations)" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Color Box 3 (Color Gradations)', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Hayden' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Number and Quantity" -> "Association of Quantity and Symbol" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Association of Quantity and Symbol', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Hayden' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "I Spy Red Book 1" -> "Sound Games (I Spy)" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Sound Games (I Spy)', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Hayden' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Tree Puzzle LA" -> "Tree Puzzle LA" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Tree Puzzle LA', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Hayden' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Henry's current works
-- practical_life: "Spooning Practice" -> "Spooning" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Spooning', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Henry' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Touch Boards" -> "Touch Boards" [MEDIUM (1)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Touch Boards', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Henry' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Linear Counting 5" -> "Linear Counting 5" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Linear Counting 5', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Henry' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Matching Work" -> "Object to Picture Matching" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Object to Picture Matching', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Henry' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Horse Puzzle LA" -> "Horse Puzzle LA" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Horse Puzzle LA', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Henry' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Jimmy's current works
-- practical_life: "Dressing Frame Bow" -> "Bow Tying Frame" [MEDIUM (0.62)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Bow Tying Frame', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Jimmy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Constructive Triangles" -> "Constructive Triangles - Rectangular Box" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Constructive Triangles - Rectangular Box', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Jimmy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Long Chain with Labels" -> "Long Chain with Labels" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Long Chain with Labels', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Jimmy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Family Work with /i/" -> "Word Families" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Word Families', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Jimmy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "How to Make Ice" -> "How to Make Ice" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'How to Make Ice', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Jimmy' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Joey's current works
-- practical_life: "Stringing Seed Beads" -> "Stringing Seed Beads" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Stringing Seed Beads', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Joey' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Color Box 3" -> "Color Box 3 (Color Gradations)" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Color Box 3 (Color Gradations)', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Joey' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Linear Counting 6" -> "Linear Counting 6" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Linear Counting 6', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Joey' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Family Work with /u/" -> "Word Families" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Word Families', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Joey' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Bird Puzzle" -> "Bird Puzzle" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Bird Puzzle', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Joey' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Kayla's current works
-- practical_life: "Knitting" -> "Knitting" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Knitting', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kayla' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Sensorial Games" -> "Sensorial Games" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Sensorial Games', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kayla' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Number Formation" -> "Sandpaper Numerals" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Sandpaper Numerals', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kayla' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "I Spy Red Book 1" -> "Sound Games (I Spy)" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Sound Games (I Spy)', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kayla' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Horse Puzzle LA" -> "Horse Puzzle LA" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Horse Puzzle LA', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kayla' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Kevin's current works
-- practical_life: "Rubber Band Skipping" -> "Rubber Band Skipping" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Rubber Band Skipping', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kevin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Tasting Bottles" -> "Tasting Bottles/Cups" [MEDIUM (0.9)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Tasting Bottles/Cups', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kevin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Finger Chart 2" -> "Finger Chart 2" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Finger Chart 2', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kevin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Phonics Book 2" -> "Phonics Book 2" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Phonics Book 2', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kevin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Tree Puzzle" -> "Tree Puzzle" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Tree Puzzle', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Kevin' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- KK's current works
-- practical_life: "Braiding" -> "Braiding Frame" [MEDIUM (0.9)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Braiding Frame', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'KK' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Roman Arch" -> "Roman Arch" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Roman Arch', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'KK' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Positive Snake Game" -> "Addition Snake Game" [MEDIUM (0.74)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Addition Snake Game', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'KK' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Building Work with /u/" -> "Moveable Alphabet" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Moveable Alphabet', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'KK' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Bird Puzzle LA" -> "Bird Puzzle LA" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Bird Puzzle LA', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'KK' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Leo's current works
-- practical_life: "Dressing Frame Shoes" -> "Dressing Oneself" [MEDIUM (0.55)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Dressing Oneself', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Leo' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Geometry Combined with Cards" -> "Geometric Cabinet" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Geometric Cabinet', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Leo' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Boards with Numbers" -> "Number Rods with Numerals" [MEDIUM (0.6)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Number Rods with Numerals', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Leo' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Building Work with /o/" -> "Moveable Alphabet" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Moveable Alphabet', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Leo' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Maps" -> "Puzzle Maps - Individual Continents" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Puzzle Maps - Individual Continents', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Leo' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Lucky's current works
-- practical_life: "Food Preparation" -> "Food Preparation" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Food Preparation', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Lucky' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Geometry Figures" -> "Geometric Solids" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Geometric Solids', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Lucky' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Skip Counting by 8" -> "Skip Counting by 8" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Skip Counting by 8', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Lucky' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Family Work with /o/" -> "Word Families" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Word Families', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Lucky' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Cultural Envelope" -> "Cultural Envelope" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Cultural Envelope', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Lucky' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- MaoMao's current works
-- practical_life: "Table Washing" -> "Face Washing" [MEDIUM (0.77)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Face Washing', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'MaoMao' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Color Box 3" -> "Color Box 3 (Color Gradations)" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Color Box 3 (Color Gradations)', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'MaoMao' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Number Rods" -> "Number Rods" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Number Rods', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'MaoMao' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Beginning Sounds - I Spy" -> "Sound Games (I Spy)" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Sound Games (I Spy)', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'MaoMao' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- MingXi's current works
-- practical_life: "Weaving Craft" -> "Weaving" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Weaving', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'MingXi' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Bells Matching" -> "Fabric Matching" [MEDIUM (0.6)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Fabric Matching', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'MingXi' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Bank Game Addition" -> "Addition Snake Game" [MEDIUM (0.55)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Addition Snake Game', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'MingXi' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Building Work with /o/" -> "Moveable Alphabet" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Moveable Alphabet', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'MingXi' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Maps" -> "Puzzle Maps - Individual Continents" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Puzzle Maps - Individual Continents', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'MingXi' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- NiuNiu's current works
-- practical_life: "Folding" -> "Folding Cloths" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Folding Cloths', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'NiuNiu' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Constructive Triangles" -> "Constructive Triangles - Rectangular Box" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Constructive Triangles - Rectangular Box', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'NiuNiu' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Linear Counting 8" -> "Linear Counting 8" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Linear Counting 8', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'NiuNiu' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Building Work with /e/" -> "Moveable Alphabet" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Moveable Alphabet', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'NiuNiu' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Roman Arch" -> "Roman Arch" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Roman Arch', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'NiuNiu' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Rachel's current works
-- practical_life: "Knitting" -> "Knitting" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Knitting', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Rachel' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Geometric Solids" -> "Geometric Solids" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Geometric Solids', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Rachel' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Bank Game Addition" -> "Addition Snake Game" [MEDIUM (0.55)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Addition Snake Game', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Rachel' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Building Work with /i/" -> "Moveable Alphabet" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Moveable Alphabet', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Rachel' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Color Mixing" -> "Color Mixing" [MEDIUM (1)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Color Mixing', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Rachel' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Segina's current works
-- practical_life: "Wet Pouring" -> "Metal Polishing" [MEDIUM (0.53)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Metal Polishing', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Segina' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Pink Tower LA Game" -> "Pink Tower" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Pink Tower', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Segina' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Number Rods with Cards" -> "Number Rods with Numerals" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Number Rods with Numerals', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Segina' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Matching Work" -> "Object to Picture Matching" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Object to Picture Matching', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Segina' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Bird Puzzle LA" -> "Bird Puzzle LA" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Bird Puzzle LA', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Segina' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- Stella's current works
-- practical_life: "Dressing Frame" -> "Braiding Frame" [MEDIUM (0.71)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Braiding Frame', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Stella' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Roman Arch Practice" -> "Roman Arch Practice" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Roman Arch Practice', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Stella' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Bank Game Addition" -> "Addition Snake Game" [MEDIUM (0.55)]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Addition Snake Game', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Stella' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Word Building Work with /e/" -> "Moveable Alphabet" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Moveable Alphabet', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Stella' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Leaf Shape Cabinet and Cards" -> "Leaf Shape Cabinet and Cards" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Leaf Shape Cabinet and Cards', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'Stella' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- YueZe's current works
-- practical_life: "Fuse Bead Work" -> "Fuse Bead Work" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Fuse Bead Work', 'practical_life', 'presented', NOW()
FROM montree_children c WHERE c.name = 'YueZe' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- sensorial: "Thermal Tablets Grading" -> "Thermic Tablets" [HIGH]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Thermic Tablets', 'sensorial', 'presented', NOW()
FROM montree_children c WHERE c.name = 'YueZe' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- math: "Finger Charts 3" -> "Finger Charts 3" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Finger Charts 3', 'mathematics', 'presented', NOW()
FROM montree_children c WHERE c.name = 'YueZe' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- language: "Mixed Box 1" -> "Mixed Box 1" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Mixed Box 1', 'language', 'presented', NOW()
FROM montree_children c WHERE c.name = 'YueZe' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;

-- cultural: "Bird Nomenclature" -> "Bird Nomenclature" [LOW]
INSERT INTO montree_child_progress (child_id, work_name, area, status, presented_at)
SELECT c.id, 'Bird Nomenclature', 'cultural', 'presented', NOW()
FROM montree_children c WHERE c.name = 'YueZe' AND c.classroom_id = 'PLACEHOLDER_ID'
ON CONFLICT DO NOTHING;
