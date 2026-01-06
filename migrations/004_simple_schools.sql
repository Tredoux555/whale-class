-- SIMPLE MULTI-SCHOOL SETUP
-- Run this in Supabase SQL Editor
-- Creates schools table and links children

-- =====================================================
-- SCHOOLS TABLE (Simple version)
-- =====================================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_slug ON schools(slug);
CREATE INDEX IF NOT EXISTS idx_schools_active ON schools(is_active);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on schools" ON schools FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- ADD SCHOOL_ID TO CHILDREN TABLE
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE children ADD COLUMN school_id UUID REFERENCES schools(id) ON DELETE SET NULL;
    CREATE INDEX idx_children_school ON children(school_id);
  END IF;
END $$;

-- =====================================================
-- CREATE YOUR 4 SCHOOLS
-- =====================================================

-- School 1: Beijing International (YOUR school - ID 1)
INSERT INTO schools (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Beijing International School',
  'beijing-international',
  '{"owner": true, "primary": true}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings;

-- School 2: Placeholder
INSERT INTO schools (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'School 2 (Available)',
  'school-2',
  '{"placeholder": true}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- School 3: Placeholder
INSERT INTO schools (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'School 3 (Available)',
  'school-3',
  '{"placeholder": true}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- School 4: Placeholder
INSERT INTO schools (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'School 4 (Available)',
  'school-4',
  '{"placeholder": true}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ASSIGN ALL EXISTING CHILDREN TO YOUR SCHOOL
-- =====================================================
UPDATE children 
SET school_id = '00000000-0000-0000-0000-000000000001'
WHERE school_id IS NULL;

-- =====================================================
-- VERIFY
-- =====================================================
DO $$ 
DECLARE
  school_count INTEGER;
  children_count INTEGER;
BEGIN 
  SELECT COUNT(*) INTO school_count FROM schools;
  SELECT COUNT(*) INTO children_count FROM children WHERE school_id IS NOT NULL;
  
  RAISE NOTICE '✅ Schools created: %', school_count;
  RAISE NOTICE '✅ Children assigned: %', children_count;
END $$;
