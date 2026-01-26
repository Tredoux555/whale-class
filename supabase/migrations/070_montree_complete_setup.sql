-- Migration: 070_montree_complete_setup.sql
-- Purpose: Complete Montree setup with teachers and proper auth
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: SCHOOLS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS montree_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  subscription_tier TEXT DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: TEACHERS TABLE (simple password auth)
-- ============================================

CREATE TABLE IF NOT EXISTS montree_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,  -- Will store simple hash for demo, bcrypt for prod
  role TEXT DEFAULT 'teacher',   -- admin, teacher, assistant
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_montree_teachers_school ON montree_teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_teachers_classroom ON montree_teachers(classroom_id);

-- ============================================
-- PART 3: CREATE DEMO SCHOOL
-- ============================================

-- Insert Demo school
INSERT INTO montree_schools (id, name, slug, subscription_tier)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'Demo School',
  'demo',
  'premium'
) ON CONFLICT (slug) DO UPDATE SET name = 'Demo School';

-- ============================================
-- PART 4: CREATE DEMO CLASSROOM
-- ============================================

INSERT INTO montree_classrooms (id, school_id, name, age_group)
VALUES (
  'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'Demo Classroom',
  '3-6'
) ON CONFLICT DO NOTHING;

-- ============================================
-- PART 5: CREATE DEMO TEACHER (Demo/Demo)
-- ============================================

-- Password is simply 'Demo' hashed with SHA256 for simplicity
-- In production, use bcrypt
INSERT INTO montree_teachers (id, school_id, classroom_id, name, password_hash, role)
VALUES (
  't1e2a3c-h4e5r-6d7e-8m9o-0a1b2c3d4e5f',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f',
  'Demo',
  'Demo',  -- Plain text for demo, hash in production
  'admin'
) ON CONFLICT DO NOTHING;

-- ============================================
-- PART 6: CREATE DEMO STUDENTS
-- ============================================

INSERT INTO montree_children (id, classroom_id, name, age, notes) VALUES
  ('s1t2u3d-e4n5t-1111-1111-111111111111', 'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f', 'Rachel', 4, 'Demo student'),
  ('s1t2u3d-e4n5t-2222-2222-222222222222', 'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f', 'Marcus', 5, 'Demo student'),
  ('s1t2u3d-e4n5t-3333-3333-333333333333', 'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f', 'Sophie', 4, 'Demo student'),
  ('s1t2u3d-e4n5t-4444-4444-444444444444', 'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f', 'James', 5, 'Demo student'),
  ('s1t2u3d-e4n5t-5555-5555-555555555555', 'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f', 'Lily', 4, 'Demo student'),
  ('s1t2u3d-e4n5t-6666-6666-666666666666', 'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f', 'Oliver', 5, 'Demo student')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION: Check what was created
-- ============================================

-- Run these to verify:
-- SELECT * FROM montree_schools;
-- SELECT * FROM montree_classrooms;
-- SELECT * FROM montree_teachers;
-- SELECT * FROM montree_children WHERE classroom_id = 'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f';
