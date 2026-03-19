-- Migration 142: Special Events system
-- Adds event tracking for non-curriculum activities (Cultural Day, Scouts Day, etc.)
-- Photos can be linked to events and included in child reports & album exports

-- ============================================
-- 1. EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS montree_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'special',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_montree_events_school ON montree_events(school_id);
CREATE INDEX idx_montree_events_date ON montree_events(event_date DESC);
CREATE INDEX idx_montree_events_school_date ON montree_events(school_id, event_date DESC);

-- Auto-update trigger
CREATE TRIGGER set_montree_events_updated_at
  BEFORE UPDATE ON montree_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. ADD event_id TO montree_media
-- ============================================

ALTER TABLE montree_media ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES montree_events(id) ON DELETE SET NULL;

-- Partial index: only index rows that have an event (most photos won't)
CREATE INDEX idx_montree_media_event ON montree_media(event_id) WHERE event_id IS NOT NULL;

-- Composite index for album queries: child + date range + event
CREATE INDEX idx_montree_media_child_captured ON montree_media(child_id, captured_at DESC) WHERE child_id IS NOT NULL;
