-- GAMIFICATION ARCHITECTURE MIGRATION
-- Run AFTER 050 + 051
-- Created: January 21, 2025
-- Purpose: Add game-related fields and tables for Phase 2

-- ============================================
-- 1. GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS montessori_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  
  -- Game Type
  game_type TEXT NOT NULL CHECK (game_type IN (
    'tracer',           -- Letter/number tracing
    'matching',         -- Object-word, picture-word matching
    'sorting',          -- Sound sorting, category sorting
    'builder',          -- Word builder, sentence builder
    'memory',           -- Memory card games
    'sequence',         -- Ordering, sequencing
    'counting',         -- Number quantity games
    'exploration'       -- Open-ended discovery
  )),
  
  -- Difficulty
  difficulty_level TEXT CHECK (difficulty_level IN ('introductory', 'developing', 'advanced', 'mastery')),
  age_min DECIMAL(3,1) NOT NULL,
  age_max DECIMAL(3,1) NOT NULL,
  
  -- Technical
  component_path TEXT NOT NULL,  -- React component path e.g., 'games/LetterTracer'
  config_schema JSONB DEFAULT '{}',  -- JSON schema for game configuration
  
  -- Content
  instructions TEXT NOT NULL,
  learning_objectives TEXT[] DEFAULT '{}',
  
  -- Media
  thumbnail_url TEXT,
  preview_gif_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. WORK-TO-GAME MAPPING
-- ============================================
CREATE TABLE IF NOT EXISTS work_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID REFERENCES montessori_works(id) ON DELETE CASCADE,
  game_id UUID REFERENCES montessori_games(id) ON DELETE CASCADE,
  
  -- Relationship
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'primary',      -- Main game for this work
    'reinforcement', -- Reinforces concepts
    'extension',    -- Advanced practice
    'prerequisite'  -- Game helps prepare for work
  )),
  
  -- Configuration for this specific work-game pairing
  game_config JSONB DEFAULT '{}',  -- Override default game config
  
  -- Ordering
  display_order INTEGER DEFAULT 0,
  
  UNIQUE(work_id, game_id)
);

-- ============================================
-- 3. GAME PROGRESS TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS game_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  student_id UUID NOT NULL,  -- References students table
  game_id UUID REFERENCES montessori_games(id) ON DELETE CASCADE,
  work_id UUID REFERENCES montessori_works(id) ON DELETE SET NULL,  -- Which work context
  
  -- Session Data
  session_date DATE DEFAULT CURRENT_DATE,
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Progress
  items_attempted INTEGER DEFAULT 0,
  items_correct INTEGER DEFAULT 0,
  accuracy_percent DECIMAL(5,2),
  
  -- Level/Score
  level_reached INTEGER DEFAULT 1,
  high_score INTEGER DEFAULT 0,
  
  -- Completion
  completed BOOLEAN DEFAULT false,
  
  -- Raw Data
  session_data JSONB DEFAULT '{}',  -- Detailed session data
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ADD related_games TO WORKS (Quick Access)
-- ============================================
ALTER TABLE montessori_works 
ADD COLUMN IF NOT EXISTS related_game_ids UUID[] DEFAULT '{}';

COMMENT ON COLUMN montessori_works.related_game_ids IS 
'Quick access to related games - synced from work_games table';

-- ============================================
-- 5. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_games_type ON montessori_games(game_type);
CREATE INDEX IF NOT EXISTS idx_games_active ON montessori_games(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_work_games_work ON work_games(work_id);
CREATE INDEX IF NOT EXISTS idx_work_games_game ON work_games(game_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_student ON game_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_game ON game_progress(game_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_date ON game_progress(session_date);

-- ============================================
-- 6. RLS POLICIES
-- ============================================
ALTER TABLE montessori_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_progress ENABLE ROW LEVEL SECURITY;

-- Public read for games catalog
CREATE POLICY "Public read games" ON montessori_games FOR SELECT USING (true);
CREATE POLICY "Public read work_games" ON work_games FOR SELECT USING (true);

-- Progress is user-specific (to be refined with auth)
CREATE POLICY "Read own progress" ON game_progress FOR SELECT USING (true);
CREATE POLICY "Insert own progress" ON game_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own progress" ON game_progress FOR UPDATE USING (true);

-- ============================================
-- 7. SEED INITIAL GAMES
-- ============================================
INSERT INTO montessori_games (name, slug, description, game_type, difficulty_level, age_min, age_max, component_path, instructions, learning_objectives) VALUES

-- Letter Tracer (EXISTS)
('Letter Tracer', 'letter-tracer', 
 'Trace letters with finger or stylus, building muscle memory for writing',
 'tracer', 'introductory', 2.5, 5.0,
 'games/LetterTracer',
 'Trace each letter following the arrows. Listen to the sound as you trace.',
 ARRAY['Letter formation', 'Sound-symbol connection', 'Fine motor control']
),

-- Number Tracer (EXISTS)
('Number Tracer', 'number-tracer',
 'Trace numerals 0-9 with finger or stylus',
 'tracer', 'introductory', 3.0, 5.0,
 'games/NumberTracer',
 'Trace each numeral following the arrows. Count the quantity shown.',
 ARRAY['Numeral formation', 'Quantity recognition', 'Fine motor control']
),

-- Sound Safari (I-Spy digital)
('Sound Safari', 'sound-safari',
 'Find objects that begin with the target sound - digital I-Spy',
 'sorting', 'introductory', 2.5, 4.5,
 'games/SoundSafari',
 'Listen to the sound. Tap all objects that begin with that sound!',
 ARRAY['Phonemic awareness', 'Beginning sound isolation', 'Listening skills']
),

-- Word Builder (Moveable Alphabet digital)
('Word Builder', 'word-builder',
 'Drag letters to build words - digital moveable alphabet',
 'builder', 'developing', 3.5, 6.0,
 'games/WordBuilder',
 'Listen to the word. Drag letters to build it!',
 ARRAY['Encoding', 'Sound-symbol correspondence', 'Spelling patterns']
),

-- Match Attack (Object box matching)
('Match Attack', 'match-attack',
 'Match objects to their words as fast as you can',
 'matching', 'developing', 4.0, 6.0,
 'games/MatchAttack',
 'Read each word and match it to the correct picture. Beat your best time!',
 ARRAY['Decoding', 'Reading fluency', 'Word recognition']
),

-- Read & Reveal (Reading cards)
('Read & Reveal', 'read-and-reveal',
 'Read the word, then tap to reveal the picture',
 'matching', 'developing', 4.5, 6.0,
 'games/ReadAndReveal',
 'Read the word carefully. Tap to see if you are right!',
 ARRAY['Decoding', 'Reading confidence', 'Self-checking']
),

-- Sentence Scramble
('Sentence Scramble', 'sentence-scramble',
 'Put the words in order to make a sentence',
 'sequence', 'advanced', 5.0, 7.0,
 'games/SentenceScramble',
 'Drag the words into the correct order to make a sentence.',
 ARRAY['Syntax awareness', 'Reading comprehension', 'Sentence structure']
),

-- Quantity Match (Number rods)
('Quantity Match', 'quantity-match',
 'Match numerals to quantities',
 'matching', 'introductory', 3.0, 5.0,
 'games/QuantityMatch',
 'Match each number to the group with that many objects.',
 ARRAY['Number recognition', 'Quantity sense', 'One-to-one correspondence']
),

-- Bead Frame (Golden beads)
('Bead Frame', 'bead-frame',
 'Build numbers using units, tens, hundreds, thousands',
 'builder', 'advanced', 4.5, 7.0,
 'games/BeadFrame',
 'Build the number shown using the golden bead materials.',
 ARRAY['Place value', 'Decimal system', 'Number composition']
),

-- Sensorial Sort
('Sensorial Sort', 'sensorial-sort',
 'Sort objects by size, color, or shape',
 'sorting', 'introductory', 2.5, 4.5,
 'games/SensorialSort',
 'Sort the objects into the correct groups.',
 ARRAY['Visual discrimination', 'Classification', 'Logical thinking']
)

ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 8. MAP GAMES TO WORKS
-- ============================================

-- This needs to be run AFTER works exist
-- Example mappings (update UUIDs when running):

-- Letter Tracer → Sandpaper Letters
-- INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
-- SELECT w.id, g.id, 'primary', 1
-- FROM montessori_works w, montessori_games g
-- WHERE w.slug = 'sandpaper-letters' AND g.slug = 'letter-tracer';

-- Sound Safari → Sound Games / I-Spy
-- INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
-- SELECT w.id, g.id, 'primary', 1
-- FROM montessori_works w, montessori_games g
-- WHERE (w.slug ILIKE '%sound-game%' OR w.slug ILIKE '%i-spy%') AND g.slug = 'sound-safari';

-- Word Builder → Moveable Alphabet
-- INSERT INTO work_games (work_id, game_id, relationship_type, display_order)
-- SELECT w.id, g.id, 'primary', 1
-- FROM montessori_works w, montessori_games g
-- WHERE w.slug ILIKE '%moveable-alphabet%' AND g.slug = 'word-builder';
