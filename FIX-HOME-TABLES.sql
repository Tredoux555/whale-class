-- FIX: Recreate home_curriculum and home_children tables with correct schema
-- Safe to run: both tables are currently empty (0 rows)
-- Run this in Supabase SQL Editor

-- 1. Drop the broken tables (cascade drops indexes too)
DROP TABLE IF EXISTS home_sessions CASCADE;
DROP TABLE IF EXISTS home_progress CASCADE;
DROP TABLE IF EXISTS home_children CASCADE;
DROP TABLE IF EXISTS home_curriculum CASCADE;

-- 2. Recreate home_children with correct schema
CREATE TABLE home_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES home_families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 12),
  enrolled_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_home_children_family ON home_children(family_id);

-- 3. Recreate home_curriculum with correct schema
CREATE TABLE home_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES home_families(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'cultural')),
  category TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX idx_home_curriculum_family ON home_curriculum(family_id);

-- 4. Recreate home_progress
CREATE TABLE home_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES home_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('practical_life', 'sensorial', 'mathematics', 'language', 'cultural')),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'presented', 'practicing', 'mastered')),
  presented_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(child_id, work_name)
);
CREATE INDEX idx_home_progress_child ON home_progress(child_id);

-- 5. Recreate home_sessions
CREATE TABLE home_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES home_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_home_sessions_child ON home_sessions(child_id);
