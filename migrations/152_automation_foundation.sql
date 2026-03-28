-- Migration 152: Automation Foundation (Phase A)
-- Creates 3 essential tables for the 10x10 automation plan
-- Date: 2026-03-28

BEGIN;

-- ==============================================================================
-- 1. Milestones Table
-- Tracks mastery progression across all children per school
-- Supports Phase A: Daily Operations, reporting, and analytics
-- ==============================================================================
CREATE TABLE IF NOT EXISTS montree_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  work_id UUID NOT NULL,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('presented', 'practicing', 'ready_for_review', 'mastered')),
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no duplicate milestone events for same child+work+type
  UNIQUE (child_id, work_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_milestones_child ON montree_milestones(child_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_school ON montree_milestones(school_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_work ON montree_milestones(work_id, achieved_at DESC);

-- ==============================================================================
-- 2. Weekly Pulse Locks Table
-- Deduplication mechanism for concurrent weekly report generation
-- Prevents race conditions when multiple workers trigger reports simultaneously
-- ==============================================================================
CREATE TABLE IF NOT EXISTS montree_weekly_pulse_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',

  -- One lock per classroom per week
  UNIQUE (classroom_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_pulse_locks_classroom ON montree_weekly_pulse_locks(classroom_id, week_start);
CREATE INDEX IF NOT EXISTS idx_pulse_locks_school ON montree_weekly_pulse_locks(school_id, week_start);

-- Auto-cleanup: remove expired locks (optional, can also be done in app)
CREATE OR REPLACE FUNCTION cleanup_expired_pulse_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM montree_weekly_pulse_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. Attendance Table
-- Per-child attendance tracking with school-level scope for reports
-- Supports Phase C: Conference notes and attendance summaries
-- ==============================================================================
CREATE TABLE IF NOT EXISTS montree_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'early_dismissal')),
  notes TEXT,
  recorded_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate attendance records per child per day
  UNIQUE (child_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_child ON montree_attendance(child_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_classroom ON montree_attendance(classroom_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_school ON montree_attendance(school_id, date DESC);

-- School-scoped attendance summary view (optional, for analytics)
CREATE OR REPLACE VIEW montree_attendance_summary AS
SELECT
  school_id,
  classroom_id,
  child_id,
  DATE_TRUNC('week', date)::DATE as week_start,
  COUNT(*) FILTER (WHERE status = 'present') as present_count,
  COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
  COUNT(*) FILTER (WHERE status = 'late') as late_count,
  COUNT(*) FILTER (WHERE status = 'early_dismissal') as early_dismissal_count,
  COUNT(*) as total_days
FROM montree_attendance
GROUP BY school_id, classroom_id, child_id, DATE_TRUNC('week', date)::DATE;

-- ==============================================================================
-- Column additions to existing tables
-- ==============================================================================

-- Add last_photo_at to montree_child_focus_works for Sprint 0 photo tracking
ALTER TABLE montree_child_focus_works
  ADD COLUMN IF NOT EXISTS last_photo_at TIMESTAMPTZ DEFAULT NULL;

-- ==============================================================================
-- Commit transaction
-- ==============================================================================
COMMIT;
