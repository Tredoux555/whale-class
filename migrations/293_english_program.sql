-- migrations/293_english_program.sql
--
-- English Program (58-Week Curriculum) — a flag-gated 6th curriculum area.
--
-- The 58-week phonics program (letter-a-week → decodable readers → -tion, with a
-- song, a book and a printable pack per week) becomes trackable INSIDE Montree by
-- seeding each week as an ORDINARY curriculum work in the existing works ladder —
-- no new tables, no parallel tracker. New area key `english`.
--
-- This migration only defines + gates the feature flag. It does NOT seed any
-- works. Seeding is a deliberate, per-school manual step run AFTER a principal
-- turns the flag on:
--     node scripts/curriculum/seed-english-program.mjs --school <schoolId>
-- (mirrors the phonics_works precedent — real rows, source='english_program').
--
-- Default OFF; toggle per-school via super-admin → ⚙️ Features. ENABLED here for
-- Whale Class (the operator's own class) so it starts on while every real school
-- starts clean.
--
-- Turn OFF for Whale Class later with:
--   UPDATE montree_school_features SET enabled = false
--   WHERE school_id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
--     AND feature_key = 'english_program';
--
-- Idempotent — safe to re-run.

BEGIN;

-- Definition (name is NOT NULL). category 'learning' groups it with the other
-- curriculum/learning surfaces in the super-admin Features modal.
INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  (
    'english_program',
    'English Program (58-Week Curriculum)',
    'Adds the 58-week English phonics program as a trackable curriculum area — a song, a book and a printable pack per week, from the first letter to the graduation. Seed the weeks as works per school after enabling. Default OFF; schools opt in.',
    '🔤',
    'learning',
    false,
    false
  )
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    is_premium = EXCLUDED.is_premium,
    default_enabled = EXCLUDED.default_enabled;

-- Enable for Whale Class (school c6280fae-567c-45ed-ad4d-934eae79aabc). Resolved
-- directly by school id (the operator's home school); no-op if the row is absent.
DO $$
DECLARE
  whale_school_id UUID := 'c6280fae-567c-45ed-ad4d-934eae79aabc';
  exists_school BOOLEAN;
BEGIN
  SELECT TRUE INTO exists_school
  FROM montree_schools
  WHERE id = whale_school_id
  LIMIT 1;

  IF exists_school THEN
    INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
    VALUES (whale_school_id, 'english_program', true, 'migration_293')
    ON CONFLICT (school_id, feature_key) DO UPDATE
      SET enabled = true, enabled_by = 'migration_293';
  END IF;
END $$;

COMMIT;
