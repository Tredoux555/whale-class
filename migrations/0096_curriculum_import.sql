-- Migration: Curriculum Import System with AI Disambiguation
-- Session: Curriculum Import for Classroom Onboarding
--
-- This creates tables for tracking:
-- 1. Classroom onboarding state (curriculum first, then students, then works)
-- 2. Imported student works with AI matching status
-- 3. Custom curriculum items added during import

-- ============================================
-- CLASSROOM ONBOARDING STATE
-- ============================================
-- Track which phase of onboarding each classroom is in
ALTER TABLE montree_classrooms
ADD COLUMN IF NOT EXISTS onboarding_phase TEXT DEFAULT 'curriculum'
CHECK (onboarding_phase IN ('curriculum', 'students', 'works', 'complete'));

ALTER TABLE montree_classrooms
ADD COLUMN IF NOT EXISTS curriculum_locked BOOLEAN DEFAULT FALSE;

ALTER TABLE montree_classrooms
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ============================================
-- CUSTOM CURRICULUM ITEMS
-- ============================================
-- Schools can add their own curriculum items during import
CREATE TABLE IF NOT EXISTS montree_custom_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,

  -- Curriculum structure
  area TEXT NOT NULL,  -- practical_life, sensorial, mathematics, language, cultural
  category TEXT,       -- Optional subcategory
  name TEXT NOT NULL,
  description TEXT,

  -- For AI matching
  keywords TEXT[],     -- Keywords extracted by AI for matching student works
  expected_work_type TEXT, -- essay, project, presentation, etc.

  -- Metadata
  sequence INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES montree_teachers(id)
);

CREATE INDEX IF NOT EXISTS idx_custom_curriculum_classroom
ON montree_custom_curriculum(classroom_id);

CREATE INDEX IF NOT EXISTS idx_custom_curriculum_area
ON montree_custom_curriculum(area);

-- ============================================
-- STUDENT WORK IMPORTS
-- ============================================
-- Track uploaded student works and their AI-assisted matching status
CREATE TABLE IF NOT EXISTS montree_work_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,

  -- File info
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,  -- UUID-based name for storage
  storage_path TEXT NOT NULL,     -- Full path in Supabase storage
  file_type TEXT,                 -- pdf, docx, etc.
  file_size INTEGER,              -- bytes
  content_hash TEXT,              -- SHA-256 for deduplication

  -- Extracted content for matching
  content_preview TEXT,           -- First ~1000 chars
  extracted_student_name TEXT,    -- Name found in filename/content

  -- Student matching
  matched_child_id UUID REFERENCES montree_children(id),
  student_confidence DECIMAL(3,2), -- 0.00 to 1.00

  -- Curriculum matching (can match to standard or custom curriculum)
  matched_work_key TEXT,           -- From standard curriculum
  matched_custom_id UUID REFERENCES montree_custom_curriculum(id),
  curriculum_confidence DECIMAL(3,2),

  -- Match status
  match_status TEXT DEFAULT 'unmatched'
    CHECK (match_status IN ('unmatched', 'auto', 'suggested', 'confirmed', 'manual')),
  ai_reasoning TEXT,              -- AI's explanation for the match
  alternative_matches JSONB,      -- Other possible matches with confidence

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  matched_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES montree_teachers(id)
);

CREATE INDEX IF NOT EXISTS idx_work_imports_classroom
ON montree_work_imports(classroom_id);

CREATE INDEX IF NOT EXISTS idx_work_imports_child
ON montree_work_imports(matched_child_id);

CREATE INDEX IF NOT EXISTS idx_work_imports_status
ON montree_work_imports(match_status);

-- ============================================
-- STUDENT NAME ALIASES
-- ============================================
-- Track alternative names for students (discovered during import)
CREATE TABLE IF NOT EXISTS montree_student_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source TEXT DEFAULT 'import', -- How we discovered this alias
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(child_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_student_aliases_child
ON montree_student_aliases(child_id);

CREATE INDEX IF NOT EXISTS idx_student_aliases_alias
ON montree_student_aliases(alias);

-- ============================================
-- CURRICULUM IMPORT BATCHES
-- ============================================
-- Track curriculum import operations
CREATE TABLE IF NOT EXISTS montree_curriculum_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,

  -- Import info
  source_filename TEXT,
  import_type TEXT DEFAULT 'excel', -- excel, csv, manual

  -- Results
  items_parsed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  warnings JSONB,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES montree_teachers(id)
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get match summary for a classroom
CREATE OR REPLACE FUNCTION get_work_import_summary(p_classroom_id UUID)
RETURNS TABLE(
  total BIGINT,
  auto_matched BIGINT,
  suggested BIGINT,
  confirmed BIGINT,
  manual_matched BIGINT,
  unmatched BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE match_status = 'auto')::BIGINT as auto_matched,
    COUNT(*) FILTER (WHERE match_status = 'suggested')::BIGINT as suggested,
    COUNT(*) FILTER (WHERE match_status = 'confirmed')::BIGINT as confirmed,
    COUNT(*) FILTER (WHERE match_status = 'manual')::BIGINT as manual_matched,
    COUNT(*) FILTER (WHERE match_status = 'unmatched')::BIGINT as unmatched
  FROM montree_work_imports
  WHERE classroom_id = p_classroom_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE montree_custom_curriculum ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_work_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_student_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_curriculum_imports ENABLE ROW LEVEL SECURITY;

-- Service role full access (API uses service role key)
-- These tables are accessed via API routes, not directly by users
CREATE POLICY "Service role full access on custom curriculum"
ON montree_custom_curriculum FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access on work imports"
ON montree_work_imports FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access on student aliases"
ON montree_student_aliases FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access on curriculum imports"
ON montree_curriculum_imports FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- STORAGE BUCKET FOR WORK IMPORTS
-- ============================================
-- Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-imports', 'work-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to work-imports bucket
CREATE POLICY "Allow uploads to work-imports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'work-imports');

-- Allow authenticated users to read from work-imports bucket
CREATE POLICY "Allow reads from work-imports"
ON storage.objects FOR SELECT
USING (bucket_id = 'work-imports');
