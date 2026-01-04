-- Lesson Documents Table
-- Stores documents attached to weekly Circle Time lessons

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
  
  -- Index for quick lookup by week
  CONSTRAINT unique_lesson_doc_path UNIQUE (storage_path)
);

-- Index for fetching documents by week
CREATE INDEX IF NOT EXISTS idx_lesson_docs_week ON lesson_documents(week_number, year);

-- Storage bucket policy (run in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-documents', 'lesson-documents', true);
