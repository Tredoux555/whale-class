-- Classroom Curriculum Schema
-- Each classroom gets its own editable copy of the curriculum

-- Table: classroom_curriculum_areas
-- Stores the 5 main areas (Practical Life, Sensorial, etc) per classroom
CREATE TABLE IF NOT EXISTS classroom_curriculum_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL,  -- Links to a classroom (or school for now)
  area_key TEXT NOT NULL,      -- practical_life, sensorial, math, language, cultural
  name TEXT NOT NULL,          -- Display name
  name_chinese TEXT,           -- Chinese name
  icon TEXT,                   -- Emoji icon
  color TEXT,                  -- Hex color
  sequence INT DEFAULT 0,      -- Display order
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(classroom_id, area_key)
);

-- Table: classroom_curriculum_works
-- Stores all works per classroom, editable by teachers
CREATE TABLE IF NOT EXISTS classroom_curriculum_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES classroom_curriculum_areas(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL,  -- Denormalized for faster queries
  
  -- Work details (editable)
  work_key TEXT NOT NULL,      -- Original ID like pl_carrying_mat
  name TEXT NOT NULL,
  name_chinese TEXT,
  description TEXT,
  age_range TEXT DEFAULT '3-6',
  materials JSONB DEFAULT '[]'::jsonb,
  
  -- Montessori-specific
  direct_aims JSONB DEFAULT '[]'::jsonb,
  indirect_aims JSONB DEFAULT '[]'::jsonb,
  control_of_error TEXT,
  prerequisites JSONB DEFAULT '[]'::jsonb,
  
  -- Video search terms for demo lookup
  video_search_terms JSONB DEFAULT '[]'::jsonb,
  
  -- Classroom customization
  sequence INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  teacher_notes TEXT,          -- Custom notes from this classroom's teachers
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(classroom_id, work_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_curriculum_works_classroom ON classroom_curriculum_works(classroom_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_works_area ON classroom_curriculum_works(area_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_areas_classroom ON classroom_curriculum_areas(classroom_id);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS curriculum_areas_updated ON classroom_curriculum_areas;
CREATE TRIGGER curriculum_areas_updated
  BEFORE UPDATE ON classroom_curriculum_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS curriculum_works_updated ON classroom_curriculum_works;
CREATE TRIGGER curriculum_works_updated
  BEFORE UPDATE ON classroom_curriculum_works
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
