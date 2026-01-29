-- Migration: 095_parent_portal.sql
-- Purpose: Parent Portal - authentication and child linking
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: PARENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS montree_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  preferred_language TEXT DEFAULT 'en', -- en, zh
  notification_prefs JSONB DEFAULT '{"email": true, "push": false}',
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_parents_email_school 
  ON montree_parents(email, school_id);
CREATE INDEX IF NOT EXISTS idx_parents_school 
  ON montree_parents(school_id);

-- ============================================
-- PART 2: PARENT-CHILD LINKING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS montree_parent_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES montree_parents(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent', -- parent, guardian, grandparent
  can_view_reports BOOLEAN DEFAULT true,
  can_message_teacher BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_child_unique 
  ON montree_parent_children(parent_id, child_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_parent 
  ON montree_parent_children(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_children_child 
  ON montree_parent_children(child_id);

-- ============================================
-- PART 3: PARENT INVITE CODES
-- ============================================

CREATE TABLE IF NOT EXISTS montree_parent_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  parent_email TEXT, -- Optional: pre-fill if known
  created_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  used_by UUID REFERENCES montree_parents(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_code 
  ON montree_parent_invites(invite_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invites_child 
  ON montree_parent_invites(child_id);

-- ============================================
-- PART 4: RLS POLICIES
-- ============================================

ALTER TABLE montree_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_parent_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_parent_invites ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (refine later)
CREATE POLICY "Allow all parent operations" ON montree_parents
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all parent_children operations" ON montree_parent_children
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all invite operations" ON montree_parent_invites
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- PART 5: HELPER FUNCTION - Generate invite code
-- ============================================

CREATE OR REPLACE FUNCTION generate_parent_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- No I, O, 0, 1 to avoid confusion
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 6: CREATE DEMO INVITES FOR TESTING
-- ============================================

-- Create invite codes for demo children
INSERT INTO montree_parent_invites (child_id, invite_code, created_by)
SELECT 
  c.id,
  'DEMO' || ROW_NUMBER() OVER (ORDER BY c.name),
  't1e2a3c-h4e5r-6d7e-8m9o-0a1b2c3d4e5f'
FROM montree_children c
WHERE c.classroom_id = 'c1a2s3s-r4o5m-6d7e-8m9o-0a1b2c3d4e5f'
ON CONFLICT (invite_code) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Parent Portal tables created successfully' as status;

-- Check tables exist:
-- SELECT * FROM montree_parents;
-- SELECT * FROM montree_parent_children;
-- SELECT * FROM montree_parent_invites;
