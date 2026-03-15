-- Migration 139: Performance indexes identified during 15-cycle deep audit
-- These indexes support the most common query patterns across the app

-- Composite index for curriculum work browsing (area filter + active + sequence sort)
-- Supports: works/search, curriculum/route, WorkWheelPicker, CurriculumWorkList
CREATE INDEX IF NOT EXISTS idx_curriculum_works_browse
  ON montree_classroom_curriculum_works (classroom_id, area_id, is_active, sequence);

-- Index for child progress lookups by child + area (used in progress/route, focus-works)
CREATE INDEX IF NOT EXISTS idx_child_progress_child_area
  ON montree_child_progress (child_id, area, created_at DESC);

-- Index for focus works lookup (child_id + area — used on every week view load)
CREATE INDEX IF NOT EXISTS idx_focus_works_child_area
  ON montree_child_focus_works (child_id, area);

-- Index for guru interactions lookup (child_id + asked_at — context builder)
CREATE INDEX IF NOT EXISTS idx_guru_interactions_child_recent
  ON montree_guru_interactions (child_id, asked_at DESC);

-- Index for media queries by child (used in gallery, reports, photo-insight cache)
CREATE INDEX IF NOT EXISTS idx_media_child_created
  ON montree_media (child_id, created_at DESC);

-- Index for behavioral observations by child + date (context builder)
CREATE INDEX IF NOT EXISTS idx_observations_child_date
  ON montree_behavioral_observations (child_id, observed_at DESC);
