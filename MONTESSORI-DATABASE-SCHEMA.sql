-- MONTESSORI TRACKING DATABASE SCHEMA
-- Run this SQL in your Supabase SQL Editor to create all necessary tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CHILDREN TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  age_group TEXT NOT NULL CHECK (age_group IN ('2-3', '3-4', '4-5', '5-6')),
  active_status BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  parent_email TEXT,
  parent_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on active_status for faster queries
CREATE INDEX IF NOT EXISTS idx_children_active_status ON children(active_status);
CREATE INDEX IF NOT EXISTS idx_children_age_group ON children(age_group);

-- =====================================================
-- SKILL CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS skill_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area TEXT NOT NULL CHECK (area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'english', 'cultural')),
  category TEXT NOT NULL,
  subcategory TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on area for faster queries
CREATE INDEX IF NOT EXISTS idx_skill_categories_area ON skill_categories(area);

-- =====================================================
-- SKILLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  description TEXT,
  age_min NUMERIC(3,1) NOT NULL DEFAULT 2.0,
  age_max NUMERIC(3,1) NOT NULL DEFAULT 6.0,
  prerequisites UUID[] DEFAULT '{}',
  order_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_skills_category_id ON skills(category_id);
CREATE INDEX IF NOT EXISTS idx_skills_age_range ON skills(age_min, age_max);

-- =====================================================
-- CHILD PROGRESS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS child_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  status_level INTEGER NOT NULL CHECK (status_level BETWEEN 0 AND 5) DEFAULT 0,
  date_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  teacher_initials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, skill_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_child_progress_child_id ON child_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_child_progress_skill_id ON child_progress(skill_id);
CREATE INDEX IF NOT EXISTS idx_child_progress_status ON child_progress(status_level);

-- =====================================================
-- ACTIVITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'english', 'cultural')),
  age_min NUMERIC(3,1) NOT NULL DEFAULT 2.0,
  age_max NUMERIC(3,1) NOT NULL DEFAULT 6.0,
  skill_level INTEGER NOT NULL CHECK (skill_level BETWEEN 0 AND 5) DEFAULT 1,
  duration_minutes INTEGER,
  materials TEXT[] DEFAULT '{}',
  instructions TEXT NOT NULL,
  learning_goals TEXT[] DEFAULT '{}',
  prerequisites UUID[] DEFAULT '{}',
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activities_area ON activities(area);
CREATE INDEX IF NOT EXISTS idx_activities_age_range ON activities(age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_activities_skill_level ON activities(skill_level);

-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  engagement_level INTEGER CHECK (engagement_level BETWEEN 1 AND 5),
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  teacher_initials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_log_child_id ON activity_log(child_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_id ON activity_log(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_date ON activity_log(activity_date);

-- =====================================================
-- DAILY ACTIVITY ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_activity_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(child_id, assigned_date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_assignments_child_id ON daily_activity_assignments(child_id);
CREATE INDEX IF NOT EXISTS idx_daily_assignments_date ON daily_activity_assignments(assigned_date);
CREATE INDEX IF NOT EXISTS idx_daily_assignments_completed ON daily_activity_assignments(completed);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to children table
DROP TRIGGER IF EXISTS update_children_updated_at ON children;
CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to child_progress table
DROP TRIGGER IF EXISTS update_child_progress_updated_at ON child_progress;
CREATE TRIGGER update_child_progress_updated_at
  BEFORE UPDATE ON child_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to activities table
DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role full access
-- (Your Next.js app will use service role key for operations)

CREATE POLICY "Service role can do everything on children" ON children
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on skill_categories" ON skill_categories
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on skills" ON skills
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on child_progress" ON child_progress
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on activities" ON activities
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on activity_log" ON activity_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can do everything on daily_activity_assignments" ON daily_activity_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STORAGE BUCKET FOR CHILD PHOTOS
-- =====================================================

-- Note: Run this separately in Supabase Storage section or via API
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('child-photos', 'child-photos', true);

-- =====================================================
-- SEED DATA: SAMPLE SKILL CATEGORIES (OPTIONAL)
-- =====================================================

-- Practical Life Categories
INSERT INTO skill_categories (area, category, display_order) VALUES
  ('practical_life', 'Care of Self', 1),
  ('practical_life', 'Care of Environment', 2),
  ('practical_life', 'Grace and Courtesy', 3),
  ('practical_life', 'Food Preparation', 4)
ON CONFLICT DO NOTHING;

-- Sensorial Categories
INSERT INTO skill_categories (area, category, display_order) VALUES
  ('sensorial', 'Visual Discrimination', 1),
  ('sensorial', 'Tactile Discrimination', 2),
  ('sensorial', 'Auditory Discrimination', 3),
  ('sensorial', 'Olfactory and Gustatory', 4)
ON CONFLICT DO NOTHING;

-- Mathematics Categories
INSERT INTO skill_categories (area, category, display_order) VALUES
  ('mathematics', 'Number Recognition', 1),
  ('mathematics', 'Quantity and Counting', 2),
  ('mathematics', 'Introduction to Decimal System', 3),
  ('mathematics', 'Operations', 4)
ON CONFLICT DO NOTHING;

-- Language Categories
INSERT INTO skill_categories (area, category, display_order) VALUES
  ('language', 'Oral Language', 1),
  ('language', 'Pre-Writing', 2),
  ('language', 'Phonetic Reading', 3),
  ('language', 'Word Study', 4)
ON CONFLICT DO NOTHING;

-- English Language Categories
INSERT INTO skill_categories (area, category, display_order) VALUES
  ('english', 'Listening and Speaking', 1),
  ('english', 'Reading Comprehension', 2),
  ('english', 'Writing', 3),
  ('english', 'Grammar', 4)
ON CONFLICT DO NOTHING;

-- Cultural Studies Categories
INSERT INTO skill_categories (area, category, display_order) VALUES
  ('cultural', 'Geography', 1),
  ('cultural', 'History', 2),
  ('cultural', 'Science', 3),
  ('cultural', 'Art and Music', 4)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$ 
BEGIN 
  RAISE NOTICE 'Montessori Tracking Database Schema Created Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Create storage bucket "child-photos" in Supabase Storage';
  RAISE NOTICE '2. Make the bucket PUBLIC in storage settings';
  RAISE NOTICE '3. Add your first child in the admin panel';
  RAISE NOTICE '4. Add activities to the activities table';
  RAISE NOTICE '5. Start tracking progress!';
END $$;
