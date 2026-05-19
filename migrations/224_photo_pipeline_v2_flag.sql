-- migrations/224_photo_pipeline_v2_flag.sql
--
-- Photo pipeline v2 — bundles 4 coordinated fixes to the photo identification
-- pipeline after the user reported regressions ("not feeling very smart anymore",
-- Untagged surge, recently-corrected-work bias):
--
-- A. Gate is_curriculum_work=false routing behind confidence >= 0.80 (when v2 ON).
--    Reduces the silent "Untagged" surge from Haiku Pass 2 over-applying the
--    non-curriculum escape hatch. Ambiguous cases (<0.80) now fall through to
--    haiku_drafted so the teacher sees chips + can confirm.
--
-- B. Reduce visual memory injection budget from 50KB/100-entry to 20KB/40-entry.
--    Less moat injection = less Haiku attention drowning = less worksheet-bias.
--    Also drop MAX_NEGATIVES per visual_memory row from 50 -> 15 (unconditional —
--    affects future corrections only).
--
-- C. Carry top_candidates through to sonnet_drafted writes. The Auto-Sonnet path
--    used to clobber the haiku_drafted's top_candidates with nothing, so chips
--    disappeared on sonnet_drafted cards. Now preserved.
--
-- D. Age-decay weighting on visual memory ordering. Replace pure
--    (description_confidence DESC, updated_at DESC) with weighted score
--    (description_confidence * exp(-days_since_update / 90)). Kills the
--    "recently-confirmed work dominates all future matches" pattern.
--
-- ROLLBACK: If quality drops further, flip per-school via super-admin:
--   UPDATE montree_school_features SET enabled = false
--   WHERE school_id = '<id>' AND feature_key = 'photo_pipeline_v2';
-- That restores the v1 behavior for that school. Other schools unaffected.
--
-- Idempotent.

BEGIN;

-- The `name` column on montree_feature_definitions is NOT NULL — every
-- migration that adds a feature flag must include it. icon, category,
-- is_premium have defaults so they're optional.
INSERT INTO montree_feature_definitions (feature_key, name, default_enabled, description)
VALUES (
  'photo_pipeline_v2',
  'Photo Pipeline v2',
  TRUE,
  'Photo pipeline v2 bundle: confidence-gated is_curriculum_work routing + reduced moat budget + top_candidates on sonnet_drafted + age-decayed visual memory ordering. Roll back per-school via montree_school_features if quality drops.'
)
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    default_enabled = EXCLUDED.default_enabled,
    description = EXCLUDED.description;

COMMIT;
