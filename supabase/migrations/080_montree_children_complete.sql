-- Migration: 080_montree_children_complete.sql
-- Purpose: Create montree_children table (was missing!) and add admin columns
-- Run in Supabase SQL Editor

-- ============================================
-- PART 1: CREATE THE TABLE (if not exists)
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

-- Index for classroom lookup
CREATE INDEX IF NOT EXISTS idx_montree_children_classroom ON montree_children(classroom_id);
CREATE INDEX IF NOT EXISTS idx_montree_children_active ON montree_children(is_active);

-- ============================================
-- PART 2: ADD COLUMNS IF TABLE EXISTED WITHOUT THEM
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_children' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE montree_children ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_children' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE montree_children ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_children' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE montree_children ADD COLUMN date_of_birth DATE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_children' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE montree_children ADD COLUMN photo_url TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_children' AND column_name = 'settings'
  ) THEN
    ALTER TABLE montree_children ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================
-- PART 3: AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================

-- Create function if not exists
CREATE OR REPLACE FUNCTION montree_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS montree_children_updated ON montree_children;
CREATE TRIGGER montree_children_updated
  BEFORE UPDATE ON montree_children
  FOR EACH ROW EXECUTE FUNCTION montree_update_timestamp();

-- ============================================
-- PART 4: SET DEFAULTS FOR EXISTING RECORDS
-- ============================================

UPDATE montree_children SET is_active = true WHERE is_active IS NULL;

-- ============================================
-- VERIFICATION
-- ============================================

-- Run this to verify:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'montree_children';
