-- ============================================================
-- COMBINED PORTAL MIGRATIONS
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PART 1: TEACHER_STUDENTS TABLE (from 003_rbac_system.sql)
-- ============================================================

CREATE TABLE IF NOT EXISTS teacher_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(teacher_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher ON teacher_students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_student ON teacher_students(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_active ON teacher_students(is_active);

ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view their own students" ON teacher_students;
CREATE POLICY "Teachers can view their own students" ON teacher_students
  FOR SELECT USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can manage their own students" ON teacher_students;
CREATE POLICY "Teachers can manage their own students" ON teacher_students
  FOR ALL USING (teacher_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_students TO authenticated;


-- ============================================================
-- PART 2: STUDENT PORTAL (from 007_student_portal.sql)
-- ============================================================

-- Update children table for login
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS login_password TEXT,
ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '🐋',
ADD COLUMN IF NOT EXISTS total_stars INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_badges INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_streak_date DATE;

CREATE INDEX IF NOT EXISTS idx_children_login ON children(id, login_password) WHERE login_password IS NOT NULL;

-- Game progress tables
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

CREATE TABLE IF NOT EXISTS letter_tracing_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  letter TEXT NOT NULL CHECK (letter ~ '^[A-Z]$'),
  status_level INTEGER NOT NULL CHECK (status_level BETWEEN 0 AND 5) DEFAULT 0,
  date_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  attempt_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, letter)
);

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

-- RLS for game tables
ALTER TABLE letter_sounds_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_builder_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_tracing_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON letter_sounds_progress;
CREATE POLICY "Allow public read" ON letter_sounds_progress FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read" ON word_builder_progress;
CREATE POLICY "Allow public read" ON word_builder_progress FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read" ON letter_tracing_progress;
CREATE POLICY "Allow public read" ON letter_tracing_progress FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public read" ON child_badges;
CREATE POLICY "Allow public read" ON child_badges FOR SELECT USING (true);


-- ============================================================
-- PART 3: PARENT DASHBOARD (from 012_parent_dashboard.sql)
-- ============================================================

ALTER TABLE children 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);

-- Link existing children to parents by email
UPDATE children c
SET parent_id = u.id
FROM auth.users u
WHERE c.parent_email = u.email
AND c.parent_id IS NULL;

-- Parent RLS policies
DROP POLICY IF EXISTS "Parents can view own children" ON children;
CREATE POLICY "Parents can view own children" ON children
  FOR SELECT USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "Parents can view child work completion" ON child_work_completion;
CREATE POLICY "Parents can view child work completion" ON child_work_completion
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM children 
      WHERE children.id = child_work_completion.child_id 
      AND children.parent_id = auth.uid()
    )
  );

-- ============================================================
-- PART 4: TEACHER DASHBOARD (from 013_teacher_dashboard.sql)
-- ============================================================

ALTER TABLE child_work_completion
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_work_completion_assigned_by ON child_work_completion(assigned_by);

-- Teacher RLS policies
DROP POLICY IF EXISTS "Teachers can view assigned students" ON children;
CREATE POLICY "Teachers can view assigned students" ON children
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_students 
      WHERE teacher_students.student_id = children.id 
      AND teacher_students.teacher_id = auth.uid()
      AND teacher_students.is_active = true
    )
  );

DROP POLICY IF EXISTS "Teachers can view student work completion" ON child_work_completion;
CREATE POLICY "Teachers can view student work completion" ON child_work_completion
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_students 
      WHERE teacher_students.student_id = child_work_completion.child_id 
      AND teacher_students.teacher_id = auth.uid()
      AND teacher_students.is_active = true
    )
  );

DROP POLICY IF EXISTS "Teachers can view own student assignments" ON teacher_students;
CREATE POLICY "Teachers can view own student assignments" ON teacher_students
  FOR SELECT USING (teacher_id = auth.uid());

-- ============================================================
-- DONE! Verify with:
-- ============================================================
SELECT 'teacher_students' as tbl, count(*) FROM teacher_students
UNION ALL
SELECT 'letter_sounds_progress', count(*) FROM letter_sounds_progress
UNION ALL
SELECT 'child_badges', count(*) FROM child_badges;
