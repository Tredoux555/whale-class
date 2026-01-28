-- Migration: 080_montree_complete_schema.sql
-- Purpose: Create ALL Montree tables from scratch (nothing exists!)
-- Run in Supabase SQL Editor

-- ============================================
-- PART 1: SCHOOLS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS montree_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  subscription_status TEXT DEFAULT 'trial',
  plan_type TEXT DEFAULT 'free',
  trial_ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PART 2: SCHOOL ADMINS (Principals)
-- ============================================

CREATE TABLE IF NOT EXISTS montree_school_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'principal',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_id, email)
);

CREATE INDEX IF NOT EXISTS idx_montree_school_admins_school ON montree_school_admins(school_id);

-- ============================================
-- PART 3: CLASSROOMS
-- ============================================

CREATE TABLE IF NOT EXISTS montree_classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🏫',
  color TEXT DEFAULT '#10B981',
  age_group TEXT DEFAULT '3-6',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_montree_classrooms_school ON montree_classrooms(school_id);

-- ============================================
-- PART 4: TEACHERS
-- ============================================

CREATE TABLE IF NOT EXISTS montree_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'teacher',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_montree_teachers_school ON montree_teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_montree_teachers_classroom ON montree_teachers(classroom_id);

-- ============================================
-- PART 5: CHILDREN (Students)
-- ============================================

CREATE TABLE IF NOT EXISTS montree_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age INT,
  date_of_birth DATE,
  photo_url TEXT,
  notes TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_montree_children_classroom ON montree_children(classroom_id);
CREATE INDEX IF NOT EXISTS idx_montree_children_active ON montree_children(is_active);

-- ============================================
-- PART 6: AUTO-UPDATE TIMESTAMPS
-- ============================================

CREATE OR REPLACE FUNCTION montree_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS montree_schools_updated ON montree_schools;
CREATE TRIGGER montree_schools_updated
  BEFORE UPDATE ON montree_schools
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

DROP TRIGGER IF EXISTS montree_school_admins_updated ON montree_school_admins;
CREATE TRIGGER montree_school_admins_updated
  BEFORE UPDATE ON montree_school_admins
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

DROP TRIGGER IF EXISTS montree_classrooms_updated ON montree_classrooms;
CREATE TRIGGER montree_classrooms_updated
  BEFORE UPDATE ON montree_classrooms
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

DROP TRIGGER IF EXISTS montree_teachers_updated ON montree_teachers;
CREATE TRIGGER montree_teachers_updated
  BEFORE UPDATE ON montree_teachers
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

DROP TRIGGER IF EXISTS montree_children_updated ON montree_children;
CREATE TRIGGER montree_children_updated
  BEFORE UPDATE ON montree_children
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- VERIFICATION
-- ============================================

-- Run this to verify all tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'montree_%' ORDER BY table_name;
