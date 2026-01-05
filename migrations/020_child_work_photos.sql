-- Migration: Child Work Photos
-- Stores photos taken during work cycle for each child's work

CREATE TABLE IF NOT EXISTS child_work_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES weekly_assignments(id) ON DELETE SET NULL,
  work_id TEXT REFERENCES curriculum_roadmap(id) ON DELETE SET NULL,
  work_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  notes TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  week_number INTEGER,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_child_work_photos_child ON child_work_photos(child_id);
CREATE INDEX IF NOT EXISTS idx_child_work_photos_assignment ON child_work_photos(assignment_id);
CREATE INDEX IF NOT EXISTS idx_child_work_photos_work ON child_work_photos(work_id);
CREATE INDEX IF NOT EXISTS idx_child_work_photos_week ON child_work_photos(week_number, year);

-- RLS Policies
ALTER TABLE child_work_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can read (for parent dashboard later)
CREATE POLICY "Anyone can read photos" ON child_work_photos
  FOR SELECT USING (true);

-- Service role can insert/update/delete
CREATE POLICY "Service role full access" ON child_work_photos
  FOR ALL USING (true);

-- Storage bucket (run in Supabase dashboard or via API):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('work-photos', 'work-photos', true);
