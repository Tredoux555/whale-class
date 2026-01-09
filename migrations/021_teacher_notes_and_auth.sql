-- Teacher Notes Table
CREATE TABLE IF NOT EXISTS teacher_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  teacher_name VARCHAR(100) NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_notes_week ON teacher_notes(week_number, year);

-- Simple Teachers Table (no passwords stored - just names for simple login)
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default teachers
INSERT INTO teachers (name) VALUES 
  ('Jasmine'),
  ('Ivan'),
  ('John'),
  ('Richard'),
  ('Liza'),
  ('Michael'),
  ('Tredoux')
ON CONFLICT (name) DO NOTHING;
