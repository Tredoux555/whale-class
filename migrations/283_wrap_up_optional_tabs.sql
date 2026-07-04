-- migrations/283_wrap_up_optional_tabs.sql
--
-- Gate two Wrap Up tabs behind per-school feature flags, default OFF:
--   wrap_discussion   → the "💬 Discussion" tab (flag photos for team review)
--   wrap_get_advice   → the "✦ Get Advice" tab (Guru next-steps per child)
--
-- These are operator/personal-workflow surfaces, not something a brand-new
-- Montessori school should see on day one. Default OFF; toggle per-school via
-- super-admin → ⚙️ Features. The "Weekly Admin" tab is already gated by the
-- pre-existing `weekly_admin_docs` flag (migration 149, default OFF) — this
-- migration only adds the two that had no flag.
--
-- Both are ENABLED here for Whale Class so the operator keeps them on their
-- own class while every real school starts clean.
--
-- Toggle OFF for Whale Class later with:
--   UPDATE montree_school_features SET enabled = false
--   WHERE school_id = '<id>' AND feature_key IN ('wrap_discussion','wrap_get_advice');
--
-- Idempotent — safe to re-run.

BEGIN;

-- Definitions (name is NOT NULL). category surfaces them in the right modal group.
INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  (
    'wrap_discussion',
    'Discussion Tab',
    'Adds the "Discussion" tab on Wrap Up — flag a photo for team review and it moves out of the Confirm queue into a shared Discussion list. Default OFF; schools opt in.',
    '💬',
    'management',
    false,
    false
  ),
  (
    'wrap_get_advice',
    'Get Advice Tab',
    'Adds the "Get Advice" tab on Wrap Up — Guru reviews each child''s confirmed observations and suggests next steps. Default OFF; schools opt in.',
    '✦',
    'ai_tools',
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

-- Keep both ON for Whale Class (the operator's personal class).
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
    VALUES
      (whale_school_id, 'wrap_discussion', true, 'migration_283'),
      (whale_school_id, 'wrap_get_advice', true, 'migration_283')
    ON CONFLICT (school_id, feature_key) DO UPDATE
      SET enabled = true, enabled_by = 'migration_283';
  END IF;
END $$;

COMMIT;
