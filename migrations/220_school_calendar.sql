-- migrations/220_school_calendar.sql
--
-- Phase 6 of the School Ecosystem Plan — birthday + holiday calendar.
--
-- Light-touch addition:
--   1. Birthdays are computed from existing montree_children.date_of_birth
--      — no new storage. The API derives "upcoming birthdays" on read.
--   2. Holidays live as a JSONB column on montree_schools. Schema:
--        [
--          { "date": "2026-09-04", "label": "Labor Day", "is_closed": true },
--          { "date": "2026-12-25", "label": "Christmas Day", "is_closed": true },
--          ...
--        ]
--      Principals manage the array via a small admin UI in future phases.
--   3. New feature flag `school_calendar`. When ON, parents see the
--      combined birthday + holiday + event feed on their dashboard.
--
-- Idempotent.

BEGIN;

ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS calendar_overrides JSONB DEFAULT '[]'::jsonb;

-- Ensure existing rows have an empty array rather than NULL so the API
-- can rely on `.filter()` working without a null guard.
UPDATE montree_schools SET calendar_overrides = '[]'::jsonb
  WHERE calendar_overrides IS NULL;

-- Feature flag registration.
INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'school_calendar',
  'School calendar',
  'Parents see upcoming birthdays (from each child''s date_of_birth) + school holidays + scheduled events on their dashboard.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;

-- Verification:
--   SELECT id, name, calendar_overrides FROM montree_schools LIMIT 5;
--   SELECT feature_key, default_enabled FROM montree_feature_definitions
--     WHERE feature_key = 'school_calendar';
--
-- Example: set holidays for a school manually for now (admin UI lands later):
--   UPDATE montree_schools
--   SET calendar_overrides = '[
--     {"date":"2026-09-04","label":"Labor Day","is_closed":true},
--     {"date":"2026-12-25","label":"Christmas Day","is_closed":true}
--   ]'::jsonb
--   WHERE id = '<school_uuid>';
