-- migrations/218_school_events.sql
--
-- Phase 4 of the School Ecosystem Plan — school-wide / classroom-scoped
-- events with parent RSVPs.
--
-- DESIGN NOTES:
--   - Events are CREATED by principals + teachers, RSVP'd by parents.
--   - school-wide events: classroom_id IS NULL → every parent in the
--     school sees them.
--   - classroom-scoped events: classroom_id IS NOT NULL → only parents
--     whose child is in that classroom see them.
--   - RSVPs are 1 per (event, parent). Status enum: yes|no|maybe.
--     Re-RSVP overwrites via PRIMARY KEY conflict path on the API.
--   - capacity is optional. When set, the API tracks count(yes) but
--     does NOT auto-cap at capacity in v1 — we just surface "X of Y
--     spots filled". Hard cap can come later.
--   - Volunteer signups (Bloomz pattern) are NOT in this migration —
--     deferred to a Phase 4.5 follow-up.
--
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_school_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  -- NULL = school-wide. Set = classroom-scoped.
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,

  -- Author
  created_by_role TEXT NOT NULL CHECK (created_by_role IN ('teacher', 'principal')),
  created_by_id UUID NOT NULL,

  title TEXT NOT NULL,
  description TEXT,

  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,

  location TEXT,
  capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),

  -- Soft-publish flag — drafts CAN be created (capacity=null, title=draft)
  -- and only shown to parents once flipped to TRUE.
  is_published BOOLEAN NOT NULL DEFAULT TRUE,

  -- Soft cancellation.
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_events_school_start
  ON montree_school_events(school_id, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_events_classroom_start
  ON montree_school_events(classroom_id, start_at DESC)
  WHERE classroom_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_school_events_upcoming
  ON montree_school_events(school_id, start_at)
  WHERE is_published = TRUE AND cancelled_at IS NULL;

-- ── RSVPs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_school_event_rsvps (
  event_id UUID NOT NULL REFERENCES montree_school_events(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES montree_parents(id) ON DELETE CASCADE,

  status TEXT NOT NULL CHECK (status IN ('yes', 'no', 'maybe')),

  -- Optional: parent can attach which of their children they're bringing.
  -- Useful for events scoped per-child (birthday parties, ceremonies).
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,

  note TEXT,

  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (event_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status
  ON montree_school_event_rsvps(event_id, status);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_parent
  ON montree_school_event_rsvps(parent_id);

-- ── updated_at triggers ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_school_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_school_events_updated_at ON montree_school_events;
CREATE TRIGGER trg_school_events_updated_at
  BEFORE UPDATE ON montree_school_events
  FOR EACH ROW EXECUTE FUNCTION update_school_event_updated_at();

DROP TRIGGER IF EXISTS trg_school_event_rsvps_updated_at ON montree_school_event_rsvps;
CREATE TRIGGER trg_school_event_rsvps_updated_at
  BEFORE UPDATE ON montree_school_event_rsvps
  FOR EACH ROW EXECUTE FUNCTION update_school_event_updated_at();

-- ── Feature flag ─────────────────────────────────────────────────────
INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'school_events',
  'School events',
  'Principals + teachers post events; parents RSVP yes / no / maybe. School-wide or classroom-scoped.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;

-- Verification:
--   SELECT count(*) FROM montree_school_events;
--   SELECT feature_key FROM montree_feature_definitions WHERE feature_key='school_events';
