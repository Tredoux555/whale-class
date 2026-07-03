-- migrations/280_curriculum_gap_radar_default_off.sql
--
-- Curriculum Gap Radar → default OFF (Tredoux, Jul 3 2026).
--
-- The dashboard "Curriculum gaps" panel was default ON (migration 248), so a
-- brand-new teacher with an empty classroom got a wall of "N of M works haven't
-- been presented to anyone yet" the moment they logged in — information overload
-- off the bat. It should be opt-in, not shoved in a new user's face.
--
-- This flips the systemwide default to FALSE. The feature definition, the card
-- (components/montree/CurriculumGapCard.tsx), and the endpoint
-- (/api/montree/dashboard/curriculum-gaps) are all UNCHANGED — functionality is
-- fully preserved. It stays in the admin feature toggle (category 'dashboard'):
-- a principal/super-admin flips it on per-school via SchoolFeaturesModal, which
-- writes a montree_school_features override that beats this default.
--
-- No schools currently hold an override for this key, so after this runs it is
-- OFF everywhere until someone turns it on.
--
-- TURN ON for a school:
--   INSERT INTO montree_school_features (school_id, feature_key, enabled)
--   VALUES ('<id>', 'curriculum_gap_radar', true)
--   ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
--
-- Idempotent.

BEGIN;

UPDATE montree_feature_definitions
SET default_enabled = false
WHERE feature_key = 'curriculum_gap_radar';

COMMIT;
