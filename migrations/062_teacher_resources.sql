-- ============================================
-- TEACHER_RESOURCES TABLE
-- For Shared Resources feature
-- Session 50 - January 22, 2026
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Resource info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  
  -- File info
  file_url TEXT,
  file_type TEXT,
  file_size_bytes INT,
  
  -- Metadata
  uploaded_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_resources_category ON teacher_resources(category);
CREATE INDEX IF NOT EXISTS idx_teacher_resources_created_at ON teacher_resources(created_at DESC);

-- Updated timestamp trigger
DROP TRIGGER IF EXISTS teacher_resources_updated_at ON teacher_resources;
CREATE TRIGGER teacher_resources_updated_at
BEFORE UPDATE ON teacher_resources
FOR EACH ROW EXECUTE FUNCTION update_montree_updated_at();

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '✅ teacher_resources table created successfully!';
END $$;
