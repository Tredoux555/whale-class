-- Migration 155: Teacher OS Foundation
-- Sprint 0 of Teacher OS build
-- Creates: attendance override table, attendance view, stale works view
-- Adds: evidence tracking columns on montree_child_progress
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS throughout)

-- ============================================================
-- 1. Attendance Override Table (for manual "Mark Present")
-- ============================================================
CREATE TABLE IF NOT EXISTS montree_attendance_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  marked_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_override_child_date
  ON montree_attendance_override(child_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_attendance_override_school_date
  ON montree_attendance_override(school_id, attendance_date);

-- ============================================================
-- 2. Attendance View (derived from photos + manual overrides)
-- ============================================================
-- Uses captured_at (actual photo time), NOT created_at (upload time)
-- Timezone-aware via school settings JSONB → 'timezone' key
-- Falls back to 'Asia/Shanghai' if no timezone set (most Montree schools are in China)
CREATE OR REPLACE VIEW montree_attendance_view AS
WITH photo_presence AS (
  SELECT DISTINCT
    m.child_id,
    c.school_id,
    DATE(m.captured_at AT TIME ZONE COALESCE(s.settings->>'timezone', 'Asia/Shanghai')) AS attendance_date
  FROM montree_media m
  JOIN montree_children c ON c.id = m.child_id
  JOIN montree_schools s ON s.id = c.school_id
  WHERE m.child_id IS NOT NULL
),
manual_presence AS (
  SELECT
    child_id,
    school_id,
    attendance_date
  FROM montree_attendance_override
)
SELECT
  COALESCE(p.child_id, m.child_id) AS child_id,
  COALESCE(p.school_id, m.school_id) AS school_id,
  COALESCE(p.attendance_date, m.attendance_date) AS attendance_date,
  (p.child_id IS NOT NULL) AS has_photos,
  (m.child_id IS NOT NULL) AS manually_marked
FROM photo_presence p
FULL OUTER JOIN manual_presence m
  ON p.child_id = m.child_id AND p.attendance_date = m.attendance_date;

-- ============================================================
-- 3. Stale Works View
-- ============================================================
CREATE OR REPLACE VIEW montree_stale_works_view AS
SELECT
  cp.child_id,
  cp.work_name,
  cp.area,
  cp.status,
  cp.updated_at,
  EXTRACT(DAY FROM NOW() - cp.updated_at)::INT AS days_stale,
  c.school_id,
  c.classroom_id
FROM montree_child_progress cp
JOIN montree_children c ON c.id = cp.child_id
WHERE cp.status IN ('presented', 'practicing')
  AND cp.updated_at < NOW() - INTERVAL '7 days';

-- ============================================================
-- 4. Evidence Tracking Columns on montree_child_progress
-- ============================================================
ALTER TABLE montree_child_progress
  ADD COLUMN IF NOT EXISTS evidence_photo_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evidence_photo_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_observation_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mastery_confirmed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mastery_confirmed_by UUID DEFAULT NULL;

-- ============================================================
-- 5. Pulse Lock Table
-- ============================================================
CREATE TABLE IF NOT EXISTS montree_pulse_lock (
  classroom_id UUID PRIMARY KEY REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  locked_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  batch_index INT DEFAULT 0,
  total_children INT DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  completed_at TIMESTAMPTZ DEFAULT NULL
);

-- ============================================================
-- 6. Conference Notes Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS montree_conference_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES montree_teachers(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'shared', 'retracted')),
  shared_at TIMESTAMPTZ DEFAULT NULL,
  shared_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  retracted_at TIMESTAMPTZ DEFAULT NULL,
  retracted_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conference_notes_child
  ON montree_conference_notes(child_id, status);

CREATE INDEX IF NOT EXISTS idx_conference_notes_school
  ON montree_conference_notes(school_id, created_at DESC);

CREATE TABLE IF NOT EXISTS montree_conference_note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES montree_conference_notes(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  edited_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conference_note_versions_note
  ON montree_conference_note_versions(note_id, created_at DESC);

-- ============================================================
-- 7. Stale Work Dismissals (teacher can dismiss alerts)
-- ============================================================
CREATE TABLE IF NOT EXISTS montree_stale_work_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  work_name TEXT NOT NULL,
  dismissed_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, work_name)
);

-- ============================================================
-- 8. RPCs
-- ============================================================

-- Acquire pulse lock (atomic — prevents concurrent generation)
CREATE OR REPLACE FUNCTION acquire_pulse_lock(
  p_classroom_id UUID,
  p_teacher_id UUID,
  p_total_children INT
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO montree_pulse_lock (classroom_id, locked_by, locked_at, batch_index, total_children, status)
  VALUES (p_classroom_id, p_teacher_id, NOW(), 0, p_total_children, 'in_progress')
  ON CONFLICT (classroom_id) DO UPDATE
    SET locked_by = p_teacher_id,
        locked_at = NOW(),
        batch_index = 0,
        total_children = p_total_children,
        status = 'in_progress',
        completed_at = NULL
    WHERE montree_pulse_lock.status != 'in_progress'
       OR montree_pulse_lock.locked_at < NOW() - INTERVAL '30 minutes';
  -- Returns true if a row was inserted or updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Increment pulse batch index (atomic counter)
CREATE OR REPLACE FUNCTION increment_pulse_progress(
  p_classroom_id UUID,
  p_expected_index INT
) RETURNS INT AS $$
DECLARE
  new_index INT;
BEGIN
  UPDATE montree_pulse_lock
    SET batch_index = batch_index + 1
    WHERE classroom_id = p_classroom_id
      AND status = 'in_progress'
      AND batch_index = p_expected_index
    RETURNING batch_index INTO new_index;
  RETURN COALESCE(new_index, -1);
END;
$$ LANGUAGE plpgsql;

-- Complete pulse
CREATE OR REPLACE FUNCTION complete_pulse_lock(
  p_classroom_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE montree_pulse_lock
    SET status = 'completed',
        completed_at = NOW()
    WHERE classroom_id = p_classroom_id
      AND status = 'in_progress';
END;
$$ LANGUAGE plpgsql;

-- Increment evidence photo count (atomic — no read-modify-write)
CREATE OR REPLACE FUNCTION increment_evidence_photo(
  p_child_id UUID,
  p_work_name TEXT,
  p_photo_date DATE
) RETURNS VOID AS $$
BEGIN
  UPDATE montree_child_progress
    SET evidence_photo_count = evidence_photo_count + 1,
        evidence_photo_days = CASE
          WHEN updated_at::date < p_photo_date THEN evidence_photo_days + 1
          ELSE evidence_photo_days
        END,
        updated_at = NOW()
    WHERE child_id = p_child_id AND work_name = p_work_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 9. Updated_at trigger for conference notes
-- ============================================================
CREATE OR REPLACE FUNCTION update_conference_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_conference_notes_updated_at ON montree_conference_notes;
CREATE TRIGGER tr_conference_notes_updated_at
  BEFORE UPDATE ON montree_conference_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_conference_notes_updated_at();
