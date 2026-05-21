-- migrations/227_weekly_teaching_notes_flag.sql
--
-- Teaching Notes — a teacher-only view on the Weekly Admin tab. Collects the
-- distinct works planned for the class this week and renders each one as a
-- printable reference card: what the work is, how to teach it, the materials,
-- why it matters, and which children have it on their shelf. Lets a teacher
-- who doesn't recognise every work walk into the week prepared.
--
-- Default OFF — schools opt in. Enabled here for Whale Class.
-- Toggle per-school via super-admin, or:
--   UPDATE montree_school_features SET enabled = false
--   WHERE school_id = '<id>' AND feature_key = 'weekly_teaching_notes';
--
-- Idempotent.

BEGIN;

-- The `name` column on montree_feature_definitions is NOT NULL.
INSERT INTO montree_feature_definitions (feature_key, name, default_enabled, description)
VALUES (
  'weekly_teaching_notes',
  'Weekly Teaching Notes',
  FALSE,
  'Teacher-only view on the Weekly Admin tab: the week''s planned works, each with what it is and how to teach it, plus which children have it. Printable. Default OFF; schools opt in.'
)
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    default_enabled = EXCLUDED.default_enabled,
    description = EXCLUDED.description;

-- Enable for Whale Class.
DO $$
DECLARE
  whale_school_id UUID;
BEGIN
  SELECT school_id INTO whale_school_id
  FROM montree_classrooms
  WHERE id = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69'
  LIMIT 1;

  IF whale_school_id IS NOT NULL THEN
    INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
    VALUES (whale_school_id, 'weekly_teaching_notes', true, 'migration_227')
    ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true, enabled_by = 'migration_227';
  END IF;
END $$;

COMMIT;
