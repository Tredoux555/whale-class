-- Migration 139: Phonics Teacher Words & Images
-- Allows teachers to add custom words and upload images for phonics tools
-- Images can be attached to BOTH default words (from phonics-data.ts) AND custom words

-- Custom words added by teachers (school-scoped)
CREATE TABLE IF NOT EXISTS montree_phonics_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('initial', 'phase2', 'blue1', 'blue2')),
  group_id TEXT NOT NULL,           -- e.g. 'tray-1', 'custom', etc.
  word TEXT NOT NULL,
  image_emoji TEXT DEFAULT '',      -- emoji fallback
  miniature TEXT DEFAULT '',        -- physical object description
  is_noun BOOLEAN DEFAULT true,
  custom_image_url TEXT,            -- uploaded photo URL (Supabase storage)
  created_by UUID REFERENCES montree_teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, phase, word)
);

-- Image overrides for default words (from phonics-data.ts) — school-scoped
-- Teachers can replace the emoji with a real photo for any built-in word
CREATE TABLE IF NOT EXISTS montree_phonics_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('initial', 'phase2', 'blue1', 'blue2')),
  word TEXT NOT NULL,               -- the word from phonics-data.ts
  image_url TEXT NOT NULL,          -- Supabase storage URL
  created_by UUID REFERENCES montree_teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, phase, word)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_phonics_words_school_phase ON montree_phonics_words(school_id, phase);
CREATE INDEX IF NOT EXISTS idx_phonics_images_school_phase ON montree_phonics_images(school_id, phase);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_phonics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_phonics_words_updated ON montree_phonics_words;
CREATE TRIGGER trg_phonics_words_updated
  BEFORE UPDATE ON montree_phonics_words
  FOR EACH ROW EXECUTE FUNCTION update_phonics_updated_at();

DROP TRIGGER IF EXISTS trg_phonics_images_updated ON montree_phonics_images;
CREATE TRIGGER trg_phonics_images_updated
  BEFORE UPDATE ON montree_phonics_images
  FOR EACH ROW EXECUTE FUNCTION update_phonics_updated_at();

-- RLS policies
ALTER TABLE montree_phonics_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_phonics_images ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (our app uses service role key)
CREATE POLICY "service_role_phonics_words" ON montree_phonics_words
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "service_role_phonics_images" ON montree_phonics_images
  FOR ALL USING (true) WITH CHECK (true);
