-- Migration 161: Enable weekly_admin_docs feature for Whale Class school
-- This feature was previously always-on; now gated by feature flag system.
-- Enable it for Whale Class (Tredoux's school) to maintain existing behavior.
-- Other schools can enable it via super-admin or their own feature settings.

DO $$
DECLARE
  whale_school_id UUID;
BEGIN
  -- Find Whale Class school via the known classroom ID
  SELECT s.id INTO whale_school_id
  FROM montree_schools s
  JOIN montree_classrooms c ON c.school_id = s.id
  WHERE c.id = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69'
  LIMIT 1;

  IF whale_school_id IS NOT NULL THEN
    INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
    VALUES (whale_school_id, 'weekly_admin_docs', true, 'migration_161')
    ON CONFLICT (school_id, feature_key) DO UPDATE SET
      enabled = true,
      enabled_by = 'migration_161',
      enabled_at = NOW();
    RAISE NOTICE 'Enabled weekly_admin_docs for Whale Class school %', whale_school_id;
  ELSE
    RAISE WARNING 'Whale Class school not found — skipping weekly_admin_docs enablement';
  END IF;
END $$;
