-- Migration: Student Portal - Login & Game Progress Tracking
-- Run this in Supabase SQL Editor
-- Date: December 2024

-- =====================================================
-- UPDATE CHILDREN TABLE
-- =====================================================

ALTER TABLE children 
ADD COLUMN IF NOT EXISTS login_password TEXT,
ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '🐋',
ADD COLUMN IF NOT EXISTS total_stars INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_badges INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_streak_date DATE;

-- Index for login lookups
CREATE INDEX IF NOT EXISTS idx_children_login ON children(id, login_password) WHERE login_password IS NOT NULL;

-- =====================================================
-- GAME PROGRESS TRACKING TABLES
-- =====================================================

-- Letter Sounds Progress (tracks which letters completed)
CREATE TABLE IF NOT EXISTS letter_sounds_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  letter TEXT NOT NULL CHECK (letter ~ '^[A-Z]$'),
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, letter)
);

CREATE INDEX idx_letter_sounds_child ON letter_sounds_progress(child_id);

-- Word Builder Progress (tracks which words completed)
CREATE TABLE IF NOT EXISTS word_builder_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, word)
);

CREATE INDEX idx_word_builder_child ON word_builder_progress(child_id);

-- Sentence Match Progress
CREATE TABLE IF NOT EXISTS sentence_match_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  sentence_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, sentence_id)
);

CREATE INDEX idx_sentence_match_child ON sentence_match_progress(child_id);

-- Sentence Builder Progress
CREATE TABLE IF NOT EXISTS sentence_builder_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  sentence_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, sentence_id)
);

CREATE INDEX idx_sentence_builder_child ON sentence_builder_progress(child_id);

-- Letter Match Progress
CREATE TABLE IF NOT EXISTS letter_match_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  letter_pair TEXT NOT NULL, -- e.g., "A-a"
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, letter_pair)
);

CREATE INDEX idx_letter_match_child ON letter_match_progress(child_id);

-- Letter Tracer Progress (already planned, but adding here for completeness)
CREATE TABLE IF NOT EXISTS letter_tracing_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  letter TEXT NOT NULL CHECK (letter ~ '^[A-Z]$'),
  status_level INTEGER NOT NULL CHECK (status_level BETWEEN 0 AND 5) DEFAULT 0,
  date_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  attempt_count INTEGER DEFAULT 0,
  completion_date DATE,
  accuracy_score DECIMAL(5,2),
  best_attempt_date DATE,
  best_attempt_accuracy DECIMAL(5,2),
  notes TEXT,
  teacher_initials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, letter)
);

CREATE INDEX idx_letter_tracing_child_id ON letter_tracing_progress(child_id);
CREATE INDEX idx_letter_tracing_letter ON letter_tracing_progress(letter);
CREATE INDEX idx_letter_tracing_status ON letter_tracing_progress(status_level);

-- =====================================================
-- BADGES AND ACHIEVEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS child_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  badge_description TEXT,
  earned_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, badge_type)
);

CREATE INDEX idx_child_badges_child ON child_badges(child_id);

-- =====================================================
-- PASSWORD RESET REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  parent_email TEXT,
  parent_name TEXT,
  request_message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_password_reset_pending ON password_reset_requests(status) WHERE status = 'pending';
CREATE INDEX idx_password_reset_child ON password_reset_requests(child_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- All progress tables: Allow public read (filtered by child_id in app)
ALTER TABLE letter_sounds_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_builder_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_match_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_builder_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_match_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_tracing_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

-- Allow public read (filtered by child_id in application layer)
CREATE POLICY "Allow public read" ON letter_sounds_progress FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON word_builder_progress FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sentence_match_progress FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sentence_builder_progress FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON letter_match_progress FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON letter_tracing_progress FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON child_badges FOR SELECT USING (true);

-- Password reset requests: Only admins can view
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage reset requests"
  ON password_reset_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
      AND role_name IN ('admin', 'super_admin')
    )
  );

-- Allow anyone to create reset requests
CREATE POLICY "Anyone can create reset requests"
  ON password_reset_requests FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify tables were created
SELECT 
  schemaname, 
  tablename
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'letter_sounds_progress',
    'word_builder_progress',
    'sentence_match_progress',
    'sentence_builder_progress',
    'letter_match_progress',
    'letter_tracing_progress',
    'child_badges',
    'password_reset_requests'
  )
ORDER BY tablename;

