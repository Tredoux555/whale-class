-- Migration 175: Enable english_corner feature for Whale Class
-- "English Corner" — real-time tracker showing which children have done
-- Language area work this week and who still needs to visit.

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
    VALUES (whale_school_id, 'english_corner', true, 'migration_175')
    ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true, enabled_by = 'migration_175';
  END IF;
END $$;
