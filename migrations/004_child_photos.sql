-- CHILD PHOTOS TABLE
-- For activity photos used in parent reports
-- Run this in Supabase SQL Editor AFTER 003

-- =====================================================
-- CHILD PHOTOS TABLE
-- Teachers upload photos of children doing work
-- =====================================================
CREATE TABLE IF NOT EXISTS child_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  
  -- Optional: link to specific work being done
  work_id UUID REFERENCES curriculum_roadmap(id) ON DELETE SET NULL,
  
  -- Who took it and when
  taken_by UUID REFERENCES users(id) ON DELETE SET NULL,
  taken_at DATE DEFAULT CURRENT_DATE,
  
  -- For organizing/filtering
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_child_photos_child ON child_photos(child_id);
CREATE INDEX IF NOT EXISTS idx_child_photos_taken_at ON child_photos(taken_at);
CREATE INDEX IF NOT EXISTS idx_child_photos_work ON child_photos(work_id);
CREATE INDEX IF NOT EXISTS idx_child_photos_featured ON child_photos(is_featured);

-- =====================================================
-- PARENT REPORTS TABLE
-- Generated reports for parents
-- =====================================================
CREATE TABLE IF NOT EXISTS parent_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  
  -- Report content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  
  -- Period covered
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Photos included in this report
  photo_ids UUID[] DEFAULT '{}',
  
  -- Works mastered during this period
  works_mastered UUID[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'shared')),
  
  -- Who created/approved
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  shared_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_reports_child ON parent_reports(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_reports_status ON parent_reports(status);
CREATE INDEX IF NOT EXISTS idx_parent_reports_period ON parent_reports(period_start, period_end);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE child_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_reports ENABLE ROW LEVEL SECURITY;

-- Service role policies
CREATE POLICY "Service role full access on child_photos" 
  ON child_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on parent_reports" 
  ON parent_reports FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- TRIGGER: Auto-update updated_at for reports
-- =====================================================
DROP TRIGGER IF EXISTS update_parent_reports_updated_at ON parent_reports;
CREATE TRIGGER update_parent_reports_updated_at
  BEFORE UPDATE ON parent_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEW: Photos with child and work info
-- =====================================================
CREATE OR REPLACE VIEW child_photos_with_details AS
SELECT 
  cp.id,
  cp.child_id,
  c.name as child_name,
  cp.photo_url,
  cp.caption,
  cp.work_id,
  cr.name as work_name,
  cr.area as work_area,
  cp.taken_by,
  u.name as taken_by_name,
  cp.taken_at,
  cp.tags,
  cp.is_featured,
  cp.created_at
FROM child_photos cp
JOIN children c ON c.id = cp.child_id
LEFT JOIN curriculum_roadmap cr ON cr.id = cp.work_id
LEFT JOIN users u ON u.id = cp.taken_by;

-- =====================================================
-- DONE
-- =====================================================
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Child Photos Schema Created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - child_photos (activity photos)';
  RAISE NOTICE '  - parent_reports (generated reports)';
  RAISE NOTICE '';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - child_photos_with_details';
END $$;
