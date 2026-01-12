-- Circle Time Theme Songs
-- Each week can have an uploaded song file (mp3, mp4, etc.)

CREATE TABLE IF NOT EXISTS circle_time_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  
  -- File info
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL,  -- audio/mp3, video/mp4, etc.
  file_size INTEGER NOT NULL,
  public_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  
  -- Metadata
  title TEXT,  -- Optional custom title (defaults to curriculum title)
  uploaded_by TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One song per week per year
  UNIQUE(week_number, year)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_circle_songs_week ON circle_time_songs(week_number, year);

-- RLS
ALTER TABLE circle_time_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for circle_time_songs" ON circle_time_songs FOR ALL USING (true);
