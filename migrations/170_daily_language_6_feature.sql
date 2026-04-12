-- Migration 170: Add daily_language_6 feature flag
-- Shows 6 recommended children for Language observation on the capture page.
-- Custom feature — disabled by default, enabled for Whale Class.

INSERT INTO montree_feature_definitions (
  feature_key, name, description, icon, category, is_premium, default_enabled
) VALUES (
  'daily_language_6',
  'Daily Language 6',
  'Shows 6 recommended children for Language area observation on the capture page. Prioritizes children not seen in Language the longest.',
  '📖',
  'dashboard',
  false,
  false
) ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category;

-- Enable for Whale Class school
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
    VALUES (whale_school_id, 'daily_language_6', true, 'migration_170')
    ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true, enabled_by = 'migration_170';
  END IF;
END $$;
