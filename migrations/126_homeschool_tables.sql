-- Migration 126: Montree Home — Homeschool parent tables
-- Date: Feb 14, 2026
-- Purpose: Add homeschool parent support to Montree
--
-- Architecture: Homeschool parents are a new user type alongside teachers/principals.
-- They get their own "school" record (plan_type='homeschool') and manage children
-- through the same montree_children table. All tracking tables (progress, focus works,
-- extras, observations, guru) work unchanged — they only need child_id.

-- ============================================
-- 1. Homeschool Parents Table
-- ============================================
-- Mirrors montree_teachers structure but for homeschool parents.
-- Each parent gets a school_id (their own "home school" tenant record).

CREATE TABLE IF NOT EXISTS montree_homeschool_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  email TEXT,

  -- Auth (same code-based pattern as teachers)
  login_code TEXT UNIQUE,
  password_hash TEXT,
  password_set_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,

  -- Guru subscription
  guru_plan TEXT DEFAULT 'free' CHECK (guru_plan IN ('free', 'paid')),
  guru_prompts_used INTEGER DEFAULT 0,  -- lifetime count for free trial (3 free)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_homeschool_parents_school ON montree_homeschool_parents(school_id);
CREATE INDEX IF NOT EXISTS idx_homeschool_parents_login_code ON montree_homeschool_parents(login_code);
CREATE INDEX IF NOT EXISTS idx_homeschool_parents_email ON montree_homeschool_parents(email);
CREATE INDEX IF NOT EXISTS idx_homeschool_parents_active ON montree_homeschool_parents(is_active) WHERE is_active = true;

-- ============================================
-- 2. Adapt montree_children for homeschool use
-- ============================================
-- Homeschool children use the existing montree_children table.
-- Two schema changes needed:
--   a) Make classroom_id NULLABLE (homeschool children have no classroom)
--   b) Add school_id column (for direct parent→children lookup without classroom)
--
-- All tracking tables (montree_child_work_progress, montree_child_focus_works,
-- montree_child_extras, montree_behavioral_observations, montree_guru_interactions)
-- work unchanged — they only reference child_id.

-- 2a. Make classroom_id nullable (was NOT NULL — homeschool children have no classroom)
ALTER TABLE montree_children ALTER COLUMN classroom_id DROP NOT NULL;

-- 2b. Add school_id for direct tenant-level queries
-- Backfill from classroom → school relationship for existing rows
ALTER TABLE montree_children ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE;

-- Backfill school_id for existing children (look up via their classroom's school_id)
UPDATE montree_children c
SET school_id = cl.school_id
FROM montree_classrooms cl
WHERE c.classroom_id = cl.id
AND c.school_id IS NULL;

-- Index for homeschool parent queries: SELECT * FROM montree_children WHERE school_id = ?
CREATE INDEX IF NOT EXISTS idx_children_school_id ON montree_children(school_id);

-- To find a homeschool parent's children:
--   SELECT * FROM montree_children WHERE school_id = <parent's school_id>;
