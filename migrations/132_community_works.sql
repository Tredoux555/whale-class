-- Migration 132: Community Works Library
-- A public, community-driven Montessori works database
-- Teachers can upload works, browse, download, and inject into their Montree classroom

-- Main community works table
CREATE TABLE IF NOT EXISTS montree_community_works (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core work data
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detailed_description TEXT,               -- rich detailed description of how to do the work
  area TEXT NOT NULL CHECK (area IN ('practical_life','sensorial','mathematics','language','cultural')),
  category TEXT,                            -- e.g. "Oral Language", "Number Operations"
  age_range TEXT DEFAULT 'all',             -- primary_year1, primary_year2, primary_year3, all

  -- Materials & pedagogy
  materials JSONB DEFAULT '[]',             -- ["Sandpaper letters", "Tray", "Cloth"]
  direct_aims JSONB DEFAULT '[]',
  indirect_aims JSONB DEFAULT '[]',
  control_of_error TEXT,
  prerequisites JSONB DEFAULT '[]',         -- titles of prerequisite works
  presentation_steps JSONB DEFAULT '[]',    -- [{step: 1, instruction: "..."}, ...]
  variations JSONB DEFAULT '[]',            -- alternative ways to present
  extensions JSONB DEFAULT '[]',            -- ways to extend the activity

  -- Media (photos, videos, PDFs stored in Supabase storage)
  photos JSONB DEFAULT '[]',                -- [{storage_path, thumbnail_path, caption, sequence}]
  videos JSONB DEFAULT '[]',                -- [{storage_path, thumbnail_path, caption, duration}]
  pdfs JSONB DEFAULT '[]',                  -- [{storage_path, filename, description}]
  cover_photo_index INTEGER DEFAULT 0,      -- which photo to use as card thumbnail

  -- AI-generated guide (admin-triggered)
  ai_guide JSONB,                           -- { steps: [...], tips: [...], variations: [...], materials_sourcing: [...] }
  ai_guide_generated_at TIMESTAMPTZ,

  -- Contributor info
  contributor_name TEXT NOT NULL,
  contributor_email TEXT,
  contributor_school TEXT,
  contributor_country TEXT,
  contributor_teacher_id UUID,              -- FK to montree_teachers if they're a Montree user

  -- Links to standard curriculum
  standard_work_id TEXT,                    -- e.g. "la_sandpaper_letters" if enhancing existing
  is_variation BOOLEAN DEFAULT false,       -- true if it's a variation of a standard work

  -- Moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','flagged')),
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,

  -- Stats
  download_count INTEGER DEFAULT 0,
  inject_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_community_works_area ON montree_community_works(area);
CREATE INDEX IF NOT EXISTS idx_community_works_status ON montree_community_works(status);
CREATE INDEX IF NOT EXISTS idx_community_works_standard ON montree_community_works(standard_work_id);
CREATE INDEX IF NOT EXISTS idx_community_works_created ON montree_community_works(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_works_downloads ON montree_community_works(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_works_contributor ON montree_community_works(contributor_teacher_id);

-- Daily backups table (stores JSON snapshots)
CREATE TABLE IF NOT EXISTS montree_community_backups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date DATE NOT NULL UNIQUE,
  work_count INTEGER NOT NULL,
  storage_path TEXT NOT NULL,               -- path in Supabase storage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_backups_date ON montree_community_backups(backup_date DESC);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_community_works_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_community_works_updated_at
  BEFORE UPDATE ON montree_community_works
  FOR EACH ROW
  EXECUTE FUNCTION update_community_works_updated_at();
