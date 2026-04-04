-- Migration 160: Dashboard Section Feature Gates
-- Created: 2026-04-04
-- Purpose: Add feature definitions for dashboard sections so new schools get a clean, minimalist view.
-- Existing schools (like Whale Class) get these enabled via montree_school_features inserts.

-- New dashboard section features (default_enabled = false → clean for new schools)
INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  ('daily_brief', 'Daily Brief', 'AI-powered daily action items panel above the student grid.', '⭐', 'dashboard', true, false),
  ('intelligence_panels', 'Classroom Intelligence', 'Attendance, stale works, conference notes, evidence tracker, and classroom pulse panels.', '📊', 'dashboard', false, false),
  ('teacher_tools', 'Teacher Tools', 'Weekly admin docs, batch parent reports, and shelf autopilot.', '🛠️', 'dashboard', false, false),
  ('shelf_autopilot', 'Shelf Autopilot', 'AI analyzes each child''s progress and suggests next works for their shelf.', '🚀', 'dashboard', true, false),
  ('paperwork_tracker', 'Paperwork Tracker', 'Track which weekly paperwork packet each child is on (weeks 1-37).', '📋', 'dashboard', false, false)
ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium;

-- Enable ALL dashboard features for Whale Class school (Tredoux's school)
-- School ID for Whale Class: look up by slug or name
-- We use a DO block to safely look up the school and insert features
DO $$
DECLARE
  whale_school_id UUID;
BEGIN
  -- Find Whale Class school (the original school with classroom 945c846d...)
  SELECT s.id INTO whale_school_id
  FROM montree_schools s
  JOIN montree_classrooms c ON c.school_id = s.id
  WHERE c.id = '945c846d-fb33-4370-8a95-a29b7767af54'
  LIMIT 1;

  IF whale_school_id IS NOT NULL THEN
    INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
    VALUES
      (whale_school_id, 'daily_brief', true, 'migration_160'),
      (whale_school_id, 'intelligence_panels', true, 'migration_160'),
      (whale_school_id, 'teacher_tools', true, 'migration_160'),
      (whale_school_id, 'shelf_autopilot', true, 'migration_160'),
      (whale_school_id, 'paperwork_tracker', true, 'migration_160')
    ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true, enabled_by = 'migration_160';
  END IF;
END $$;
