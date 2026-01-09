-- Teacher Portal Migration
-- Creates tables for simple teacher login and notes board

-- =====================================================
-- SIMPLE TEACHERS TABLE (Name-based login)
-- =====================================================
CREATE TABLE IF NOT EXISTS simple_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(20) NOT NULL DEFAULT '123',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 7 teachers
INSERT INTO simple_teachers (name, password) VALUES 
  ('Jasmine', '123'),
  ('Ivan', '123'),
  ('John', '123'),
  ('Richard', '123'),
  ('Liza', '123'),
  ('Michael', '123'),
  ('Tredoux', '123')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- TEACHER NOTES BOARD TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_name VARCHAR(50) NOT NULL,
  note_text TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_pinned BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  week_number INTEGER,
  year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching notes by week
CREATE INDEX IF NOT EXISTS idx_teacher_notes_week ON teacher_notes(week_number, year);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_pinned ON teacher_notes(is_pinned, created_at DESC);

-- =====================================================
-- LESSON DOCUMENTS TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS lesson_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  public_url TEXT NOT NULL,
  description TEXT,
  uploaded_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_lesson_doc_path UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS idx_lesson_docs_week ON lesson_documents(week_number, year);

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE simple_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on simple_teachers" ON simple_teachers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on teacher_notes" ON teacher_notes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on lesson_documents" ON lesson_documents
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STORAGE BUCKET FOR LESSON DOCUMENTS
-- Run this in Supabase Dashboard > Storage > Create Bucket:
-- Bucket name: lesson-documents
-- Public: Yes
-- =====================================================

-- Completion message
DO $$ 
BEGIN 
  RAISE NOTICE 'Teacher Portal Tables Created Successfully!';
  RAISE NOTICE 'Now create storage bucket "lesson-documents" in Supabase Storage (make it PUBLIC)';
END $$;
