-- migrations/284_parent_night_present.sql
--
-- Gate the "Present" button (parent-night slideshow) behind a per-school
-- feature flag, default OFF:
--   parent_night_present → the 🎞 "Present" pill on the dashboard student grid
--                          → /montree/dashboard/present (full-bleed photo
--                            slideshow for in-person parent nights)
--
-- This was built for Tredoux's first parent night (May 17, 2026) — it is an
-- operator/personal-workflow surface, not something a brand-new Montessori
-- school should see on day one. Default OFF; toggle per-school via
-- super-admin → ⚙️ Features.
--
-- ENABLED here for Whale Class so the operator keeps it on their own class
-- while every real school starts clean.
--
-- Toggle OFF for Whale Class later with:
--   UPDATE montree_school_features SET enabled = false
--   WHERE school_id = '<id>' AND feature_key = 'parent_night_present';
--
-- Idempotent — safe to re-run.

BEGIN;

-- Definition (name is NOT NULL). category surfaces it in the "media" modal group.
INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  (
    'parent_night_present',
    'Present (Parent Night)',
    'Adds the "Present" button on the dashboard — a full-bleed photo slideshow for in-person parent nights (no dates, captions or work names shown). Default OFF; schools opt in.',
    '🎞',
    'media',
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

-- Keep it ON for Whale Class (the operator's personal class).
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
    VALUES (whale_school_id, 'parent_night_present', true, 'migration_284')
    ON CONFLICT (school_id, feature_key) DO UPDATE
      SET enabled = true, enabled_by = 'migration_284';
  END IF;
END $$;

COMMIT;
