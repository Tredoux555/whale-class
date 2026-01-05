-- Migration: Child Work Media (Photos + Videos)
-- Unified media storage for classroom documentation
-- Supports: photos, videos, parent sharing, featured content

-- Drop old table if exists (we just created it, may be empty)
DROP TABLE IF EXISTS child_work_photos;

-- Create unified media table
CREATE TABLE IF NOT EXISTS child_work_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES weekly_assignments(id) ON DELETE SET NULL,
  work_id TEXT REFERENCES curriculum_roadmap(id) ON DELETE SET NULL,
  work_name TEXT NOT NULL,
  
  -- Media info
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Video-specific
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  
  -- Metadata
  notes TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  week_number INTEGER,
  year INTEGER,
  
  -- Parent sharing controls
  parent_visible BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  shared_at TIMESTAMPTZ,
  
  -- Daily report grouping
  report_date DATE DEFAULT CURRENT_DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_child_work_media_child ON child_work_media(child_id);
CREATE INDEX idx_child_work_media_assignment ON child_work_media(assignment_id);
CREATE INDEX idx_child_work_media_work ON child_work_media(work_id);
CREATE INDEX idx_child_work_media_week ON child_work_media(week_number, year);
CREATE INDEX idx_child_work_media_type ON child_work_media(media_type);
CREATE INDEX idx_child_work_media_parent ON child_work_media(parent_visible, child_id);
CREATE INDEX idx_child_work_media_featured ON child_work_media(is_featured, child_id);
CREATE INDEX idx_child_work_media_report_date ON child_work_media(report_date, child_id);

-- RLS Policies
ALTER TABLE child_work_media ENABLE ROW LEVEL SECURITY;

-- Teachers/admin can see all
CREATE POLICY "Staff can read all media" ON child_work_media
  FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Service role full access" ON child_work_media
  FOR ALL USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER child_work_media_updated_at
  BEFORE UPDATE ON child_work_media
  FOR EACH ROW EXECUTE FUNCTION update_media_updated_at();

-- Storage bucket for videos (photos bucket already exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('work-videos', 'work-videos', true)
ON CONFLICT DO NOTHING;

-- Storage policies for videos
CREATE POLICY "Allow video uploads" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'work-videos');

CREATE POLICY "Allow video reads" ON storage.objects 
FOR SELECT USING (bucket_id = 'work-videos');

-- Helper view: Daily report for parents
CREATE OR REPLACE VIEW parent_daily_report AS
SELECT 
  m.id,
  m.child_id,
  c.name as child_name,
  m.work_name,
  m.media_type,
  m.media_url,
  m.thumbnail_url,
  m.duration_seconds,
  m.notes,
  m.taken_at,
  m.report_date,
  m.is_featured
FROM child_work_media m
JOIN children c ON c.id = m.child_id
WHERE m.parent_visible = true
ORDER BY m.report_date DESC, m.taken_at DESC;

-- Helper view: Featured content for parent meetings
CREATE OR REPLACE VIEW featured_media AS
SELECT 
  m.id,
  m.child_id,
  c.name as child_name,
  m.work_name,
  m.media_type,
  m.media_url,
  m.thumbnail_url,
  m.duration_seconds,
  m.notes,
  m.taken_at,
  m.week_number,
  m.year
FROM child_work_media m
JOIN children c ON c.id = m.child_id
WHERE m.is_featured = true
ORDER BY m.taken_at DESC;
