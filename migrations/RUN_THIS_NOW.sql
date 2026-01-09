-- MINIMAL MIGRATION FOR MULTI-SCHOOL ARCHITECTURE
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard

-- 1. Schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT DEFAULT '3-6',
  teacher_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Link children to classrooms
CREATE TABLE IF NOT EXISTS classroom_children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(classroom_id, child_id)
);

-- 4. Add school_id to children (if missing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'children' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE children ADD COLUMN school_id UUID REFERENCES schools(id);
  END IF;
END $$;

-- Done! Now run: curl -X POST https://www.teacherpotato.xyz/api/admin/seed-school
