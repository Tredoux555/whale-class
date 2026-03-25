-- Migration 145: Event Attendance System
-- Adds classroom_id to events + attendance tracking table
-- Run via Supabase SQL Editor (already run Mar 23, 2026)

-- A) Add classroom_id to montree_events (nullable = school-wide events)
ALTER TABLE montree_events ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES montree_classrooms(id);
CREATE INDEX IF NOT EXISTS idx_montree_events_classroom ON montree_events(classroom_id);

-- B) Backfill existing events with creator's classroom
UPDATE montree_events e
SET classroom_id = t.classroom_id
FROM montree_teachers t
WHERE e.created_by = t.id::text
AND e.classroom_id IS NULL;

-- C) Attendance table
CREATE TABLE IF NOT EXISTS montree_event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES montree_events(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id),
  school_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'attended',
  tagged_by UUID,
  tagged_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(event_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON montree_event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_child ON montree_event_attendance(child_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_classroom ON montree_event_attendance(classroom_id);
