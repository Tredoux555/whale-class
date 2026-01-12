-- =============================================
-- MONTREE SCHOOL APP - COMBINED MIGRATIONS
-- Run this in Supabase SQL Editor
-- Date: Jan 12, 2026
-- =============================================

-- =============================================
-- TABLE 1: DAILY REPORTS (Teacher → Parent)
-- =============================================
CREATE TABLE IF NOT EXISTS daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  teacher_name TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  mood TEXT CHECK (mood IN ('happy', 'calm', 'tired', 'fussy', 'sick')),
  activities_done TEXT[],
  activities_notes TEXT,
  meals_eaten TEXT CHECK (meals_eaten IN ('all', 'most', 'some', 'little', 'none')),
  nap_duration INTEGER,
  highlights TEXT,
  notes TEXT,
  photo_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(child_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_child_date ON daily_reports(child_id, report_date DESC);
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for daily_reports" ON daily_reports FOR ALL USING (true);

-- =============================================
-- TABLE 2: PARENT MESSAGES (Chat)
-- =============================================
CREATE TABLE IF NOT EXISTS parent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('teacher', 'parent')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_child ON parent_messages(child_id, created_at DESC);
ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for messages" ON parent_messages FOR ALL USING (true);

-- =============================================
-- TABLE 3: CLASSROOM PHOTOS (Gallery)
-- =============================================
CREATE TABLE IF NOT EXISTS classroom_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  teacher_name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  photo_url TEXT NOT NULL,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  child_ids UUID[] DEFAULT '{}',
  activity_type TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_date ON classroom_photos(photo_date DESC);
ALTER TABLE classroom_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for photos" ON classroom_photos FOR ALL USING (true);

-- =============================================
-- TABLE 4: ATTENDANCE (Simple check-in)
-- =============================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'sick', 'late')),
  check_in_time TIME,
  check_out_time TIME,
  notes TEXT,
  marked_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(child_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_child_date ON attendance(child_id, attendance_date DESC);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for attendance" ON attendance FOR ALL USING (true);

-- =============================================
-- DONE! All 4 tables created.
-- =============================================
