-- Migration 134: Feature Toggle System + RAZ Reading Tracker
-- Created: 2026-03-04
-- Purpose: Add per-school/classroom feature toggles and RAZ book reading tracker

-- ============================================================
-- PART 1: FEATURE TOGGLE SYSTEM
-- Schools and classrooms can switch features on/off
-- ============================================================

CREATE TABLE IF NOT EXISTS montree_feature_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '⚙️',
  category TEXT DEFAULT 'general',
  is_premium BOOLEAN DEFAULT false,
  default_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS montree_school_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  enabled_by TEXT,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  settings JSONB DEFAULT '{}',
  UNIQUE(school_id, feature_key)
);

CREATE TABLE IF NOT EXISTS montree_classroom_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  enabled_by TEXT,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  settings JSONB DEFAULT '{}',
  UNIQUE(classroom_id, feature_key)
);

-- Enable RLS (service role bypasses anyway)
ALTER TABLE montree_feature_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_school_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_classroom_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on montree_feature_definitions" ON montree_feature_definitions;
CREATE POLICY "Service role full access on montree_feature_definitions" ON montree_feature_definitions FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access on montree_school_features" ON montree_school_features;
CREATE POLICY "Service role full access on montree_school_features" ON montree_school_features FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access on montree_classroom_features" ON montree_classroom_features;
CREATE POLICY "Service role full access on montree_classroom_features" ON montree_classroom_features FOR ALL USING (true) WITH CHECK (true);

-- Seed the RAZ tracker as first feature
INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES 
  ('raz_reading_tracker', 'RAZ Reading Tracker', 'Track daily RAZ reading books with photo evidence. Take a photo of the book and the child''s signature.', '📚', 'reading', false, false),
  ('weekly_plan_upload', 'Weekly Plan Upload', 'Upload Excel/Word weekly plans to auto-populate student work assignments.', '📋', 'planning', false, false),
  ('daily_reports', 'Daily Reports', 'Generate and send daily reports to parents.', '📝', 'reporting', false, true),
  ('parent_portal', 'Parent Portal', 'Allow parents to view their child''s progress online.', '👨‍👩‍👧', 'communication', false, true),
  ('games', 'Educational Games', 'Access to Montessori-aligned digital games.', '🎮', 'learning', false, true),
  ('voice_observations', 'Voice Observations', 'AI-powered hands-free classroom observation system. Teachers record during work cycles and the system automatically transcribes, identifies students, matches works, and proposes progress updates.', '🎙️', 'ai_tools', true, false)
ON CONFLICT (feature_key) DO NOTHING;

-- ============================================================
-- PART 2: RAZ READING TRACKER
-- Daily reading records per child with photo evidence
-- ============================================================

CREATE TABLE IF NOT EXISTS raz_reading_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- The book
  book_photo_url TEXT,
  book_title TEXT,
  
  -- The child's signature (proof they read)
  signature_photo_url TEXT,
  
  -- Status: 'read', 'not_read', 'no_folder'
  status TEXT NOT NULL DEFAULT 'not_read' CHECK (status IN ('read', 'not_read', 'no_folder')),
  
  -- Who recorded it
  recorded_by TEXT,
  recorded_by_id UUID,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One record per child per day
  UNIQUE(child_id, record_date)
);

-- Enable RLS
ALTER TABLE raz_reading_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on raz_reading_records" ON raz_reading_records;
CREATE POLICY "Service role full access on raz_reading_records" ON raz_reading_records FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_raz_child_date ON raz_reading_records(child_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_raz_classroom_date ON raz_reading_records(classroom_id, record_date DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_raz_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS raz_reading_updated_at ON raz_reading_records;
CREATE TRIGGER raz_reading_updated_at
  BEFORE UPDATE ON raz_reading_records
  FOR EACH ROW EXECUTE FUNCTION update_raz_updated_at();

-- ============================================================
-- PART 3: Enable RAZ for Whale Class (Beijing International)
-- ============================================================

-- Enable RAZ reading tracker for Beijing International School
INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
SELECT id, 'raz_reading_tracker', true, 'system_setup'
FROM montree_schools 
WHERE slug = 'beijing-international'
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;

-- Enable RAZ reading tracker for Whale Class specifically
INSERT INTO montree_classroom_features (classroom_id, feature_key, enabled, enabled_by)
SELECT mc.id, 'raz_reading_tracker', true, 'system_setup'
FROM montree_classrooms mc
JOIN montree_schools ms ON mc.school_id = ms.id
WHERE ms.slug = 'beijing-international' AND mc.name ILIKE '%whale%'
ON CONFLICT (classroom_id, feature_key) DO UPDATE SET enabled = true;
