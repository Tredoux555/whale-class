-- Migration 120: Montree Home tables
-- Session 155: Parent-facing home product
-- Run manually on Supabase after merge

-- home_families (parent accounts)
CREATE TABLE home_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '14 days')
);

-- home_children (kids per family)
CREATE TABLE home_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES home_families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0 AND age <= 12),
  enrolled_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_home_children_family ON home_children(family_id);

-- home_progress (per-child per-work status, area denormalized for fast reads)
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

-- home_curriculum (68-work curriculum per family, seeded on registration)
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

-- home_sessions (work session logs — future use, no API in MVP)
CREATE TABLE home_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES home_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  notes TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_home_sessions_child ON home_sessions(child_id);
