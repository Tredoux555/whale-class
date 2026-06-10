-- migrations/248_curriculum_gap_radar_flag.sql
--
-- ✨ Curriculum Gap Radar (Jun 10, 2026) — feature flag, default ON.
--
-- Second cross-child intelligence surface. Surfaces curriculum areas that
-- have gone quiet relative to the rest of the classroom (or fully stale),
-- plus areas with many never-presented works. Deterministic — reads
-- montree_child_progress.updated_at against the classroom curriculum.
-- No AI call, no per-use cost, so default_enabled is TRUE for every school.
--
-- ROLLBACK per school:
--   UPDATE montree_school_features SET enabled = false
--   WHERE school_id = '<id>' AND feature_key = 'curriculum_gap_radar';
--
-- Idempotent.

BEGIN;

-- montree_feature_definitions.name is NOT NULL (Session 118 lesson).
INSERT INTO montree_feature_definitions (feature_key, name, default_enabled, description, icon, category)
VALUES (
  'curriculum_gap_radar',
  'Curriculum Gap Radar',
  true,
  'Flags curriculum areas that have gone quiet relative to the rest of the classroom, or that have many works no child has been presented yet.',
  '📡',
  'dashboard'
)
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    default_enabled = EXCLUDED.default_enabled;

COMMIT;
