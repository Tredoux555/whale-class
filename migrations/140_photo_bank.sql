-- Migration 140: Photo Bank
-- A searchable, public photo library for Montessori English teaching materials
-- Photos can be browsed, searched by keyword, and drag-dropped into content creation tools

-- Main photo bank table
CREATE TABLE IF NOT EXISTS montree_photo_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core photo data
  filename TEXT NOT NULL,                    -- original filename
  label TEXT NOT NULL,                       -- cleaned label extracted from filename (e.g. "Cat" from "Cat.webp")
  tags TEXT[] DEFAULT '{}',                  -- auto-generated tags from filename + manual tags
  category TEXT DEFAULT 'general',           -- vocabulary, phonics, animals, objects, food, actions, places, etc.

  -- Storage
  storage_path TEXT NOT NULL,                -- path in Supabase 'photo-bank' bucket
  thumbnail_path TEXT,                       -- smaller version for gallery grid
  public_url TEXT NOT NULL,                  -- direct public URL for rendering
  thumbnail_url TEXT,                        -- direct public URL for thumbnail

  -- Metadata
  file_size INTEGER,                         -- bytes
  width INTEGER,
  height INTEGER,
  mime_type TEXT,

  -- Contributor
  uploaded_by TEXT DEFAULT 'system',         -- 'system' for initial bulk upload, or teacher name
  uploaded_by_teacher_id UUID,               -- FK to montree_teachers if applicable

  -- Flags
  is_public BOOLEAN DEFAULT true,            -- visible to all users
  is_approved BOOLEAN DEFAULT true,          -- auto-approved for system uploads, moderated for public

  -- Search optimization
  search_vector TSVECTOR,                    -- full-text search vector

  -- Stats
  use_count INTEGER DEFAULT 0,               -- how many times used in tools

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_photo_bank_label ON montree_photo_bank(label);
CREATE INDEX IF NOT EXISTS idx_photo_bank_category ON montree_photo_bank(category);
CREATE INDEX IF NOT EXISTS idx_photo_bank_tags ON montree_photo_bank USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_photo_bank_search ON montree_photo_bank USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_photo_bank_created ON montree_photo_bank(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_bank_public ON montree_photo_bank(is_public, is_approved);

-- Auto-generate search vector from label and tags
CREATE OR REPLACE FUNCTION update_photo_bank_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.label, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_photo_bank_search_vector
  BEFORE INSERT OR UPDATE ON montree_photo_bank
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_bank_search_vector();

-- Category suggestions table for smart categorization
CREATE TABLE IF NOT EXISTS montree_photo_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT,                                  -- emoji icon
  keywords TEXT[] DEFAULT '{}',               -- keywords that auto-map to this category
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO montree_photo_categories (name, display_name, icon, keywords, sort_order) VALUES
  ('animals', 'Animals', '🐾', ARRAY['cat','dog','bird','fish','elephant','lion','bear','horse','cow','pig','duck','chicken','frog','snake','turtle','rabbit','sheep','goat','monkey','tiger','giraffe','zebra','penguin','whale','dolphin','bee','butterfly','ant','spider','snail'], 1),
  ('food', 'Food & Drinks', '🍎', ARRAY['apple','banana','orange','grape','strawberry','watermelon','cake','bread','milk','water','juice','rice','noodle','pizza','egg','cheese','meat','fish','vegetable','fruit','carrot','tomato','potato','corn','pear','peach','mango','cherry','lemon'], 2),
  ('objects', 'Objects', '📦', ARRAY['ball','book','pen','pencil','table','chair','door','window','clock','phone','computer','bag','shoe','hat','cup','plate','spoon','fork','key','box','bottle','lamp','mirror','brush','comb','scissors','umbrella','bell','flag'], 3),
  ('body', 'Body Parts', '🤚', ARRAY['hand','foot','head','eye','ear','nose','mouth','arm','leg','finger','toe','hair','face','teeth','tongue','shoulder','knee','elbow','neck','back'], 4),
  ('nature', 'Nature', '🌿', ARRAY['tree','flower','sun','moon','star','cloud','rain','snow','mountain','river','ocean','beach','forest','garden','grass','leaf','rock','sand','sky','wind','rainbow'], 5),
  ('places', 'Places', '🏠', ARRAY['house','school','park','store','hospital','library','church','farm','zoo','airport','beach','city','village','kitchen','bedroom','bathroom','classroom','playground','garden','office'], 6),
  ('actions', 'Actions', '🏃', ARRAY['run','walk','jump','swim','eat','drink','sleep','read','write','draw','sing','dance','play','cook','clean','wash','sit','stand','open','close','push','pull','throw','catch','climb','fly'], 7),
  ('colors', 'Colors', '🎨', ARRAY['red','blue','green','yellow','orange','purple','pink','black','white','brown','gray','gold','silver'], 8),
  ('clothing', 'Clothing', '👕', ARRAY['shirt','pants','dress','skirt','jacket','coat','hat','shoes','socks','gloves','scarf','boots','uniform','sweater','shorts'], 9),
  ('transport', 'Transport', '🚗', ARRAY['car','bus','train','airplane','boat','bicycle','motorcycle','truck','taxi','helicopter','rocket','submarine'], 10),
  ('phonics', 'Phonics', '🔤', ARRAY['short_a','short_e','short_i','short_o','short_u','long_a','long_e','long_i','long_o','long_u','cvc','blend','digraph','pink_series','blue_series','green_series'], 11),
  ('general', 'General', '📸', ARRAY[], 99)
ON CONFLICT (name) DO NOTHING;
