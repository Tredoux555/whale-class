-- Migration: Video Watch Tracking System
-- Purpose: Track when children watch curriculum videos and auto-complete work
-- Date: December 2024

-- ============================================================================
-- 1. CREATE CHILD_VIDEO_WATCHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS child_video_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  curriculum_video_id UUID NOT NULL REFERENCES curriculum_videos(id) ON DELETE CASCADE,
  curriculum_work_id UUID NOT NULL REFERENCES curriculum_roadmap(id) ON DELETE CASCADE,
  
  -- Watch Session Data
  watch_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  watch_completed_at TIMESTAMPTZ,
  watch_duration_seconds INTEGER DEFAULT 0,
  video_duration_seconds INTEGER,
  watch_percentage DECIMAL(5,2), -- 0.00 to 100.00
  is_complete BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for querying child's watch history
CREATE INDEX idx_video_watches_child_id ON child_video_watches(child_id);

-- Index for querying video statistics
CREATE INDEX idx_video_watches_video_id ON child_video_watches(curriculum_video_id);

-- Index for querying work completion
CREATE INDEX idx_video_watches_work_id ON child_video_watches(curriculum_work_id);

-- Index for completion queries
CREATE INDEX idx_video_watches_complete ON child_video_watches(is_complete) WHERE is_complete = TRUE;

-- Index for date-based queries
CREATE INDEX idx_video_watches_started_at ON child_video_watches(watch_started_at DESC);

-- Composite index for common queries
CREATE INDEX idx_video_watches_child_video ON child_video_watches(child_id, curriculum_video_id);

-- UNIQUE CONSTRAINT: One watch session per child/video/day (using unique index with expression)
-- Using date_trunc with UTC timezone for immutability
CREATE UNIQUE INDEX unique_child_video_day ON child_video_watches(child_id, curriculum_video_id, date_trunc('day', watch_started_at AT TIME ZONE 'UTC'));

-- ============================================================================
-- 3. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_video_watch_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_video_watch_updated_at
  BEFORE UPDATE ON child_video_watches
  FOR EACH ROW
  EXECUTE FUNCTION update_video_watch_timestamp();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE child_video_watches ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert their own watches
CREATE POLICY "Users can create video watches for their children"
  ON child_video_watches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = child_video_watches.child_id
      AND children.active_status = TRUE
    )
  );

-- Policy: Allow authenticated users to view watches for their children
CREATE POLICY "Users can view video watches for their children"
  ON child_video_watches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = child_video_watches.child_id
    )
  );

-- Policy: Allow authenticated users to update watches for their children
CREATE POLICY "Users can update video watches for their children"
  ON child_video_watches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = child_video_watches.child_id
    )
  );

-- Policy: Allow service role full access (for API routes)
CREATE POLICY "Service role has full access to video watches"
  ON child_video_watches
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON child_video_watches TO authenticated;

-- Grant full permissions to service role
GRANT ALL ON child_video_watches TO service_role;

-- ============================================================================
-- 6. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON TABLE child_video_watches IS 'Tracks when children watch curriculum teaching videos';
COMMENT ON COLUMN child_video_watches.watch_duration_seconds IS 'Accumulated watch time (not continuous - may be paused/resumed)';
COMMENT ON COLUMN child_video_watches.watch_percentage IS 'Percentage of video watched (watch_duration / video_duration * 100)';
COMMENT ON COLUMN child_video_watches.is_complete IS 'TRUE when watch_percentage >= 80% (configurable threshold)';
COMMENT ON INDEX unique_child_video_day IS 'Prevents duplicate watch records for same child/video/day';

-- ============================================================================
-- 7. VERIFICATION QUERIES (Run these to verify migration success)
-- ============================================================================

-- Verify table exists
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'child_video_watches'
-- );

-- Verify all indexes exist
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'child_video_watches'
-- ORDER BY indexname;

-- Verify RLS is enabled
-- SELECT relname, relrowsecurity 
-- FROM pg_class 
-- WHERE relname = 'child_video_watches';

-- Count policies
-- SELECT COUNT(*) FROM pg_policies 
-- WHERE tablename = 'child_video_watches';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

