-- Migration 177: Add review_before_process feature flag
-- When enabled, photos captured by teachers are NOT auto-fired through the AI
-- identification pipeline on save. Instead they land with
-- identification_status='pending_review' so teachers can bulk-review (and delete
-- duds) before tapping "Process selected" — which fires the existing pipeline
-- with force=true on the survivors. Saves Haiku/Sonnet API costs and keeps the
-- visual memory corpus cleaner because only teacher-approved photos feed it.
--
-- Default OFF (preserve existing behavior for everyone). Enabled for Whale Class.

INSERT INTO montree_feature_definitions (
  feature_key, name, description, icon, category, is_premium, default_enabled
) VALUES (
  'review_before_process',
  'Review Before Processing',
  'Defer AI photo identification until the teacher reviews and approves photos. Reduces wasted API calls on blurry/duplicate shots and keeps the AI training corpus cleaner. Teachers review and process in batches at end of day or week.',
  '🧐',
  'capture',
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
    VALUES (whale_school_id, 'review_before_process', true, 'migration_177')
    ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true, enabled_by = 'migration_177';
  END IF;
END $$;

-- Performance: index on (classroom_id, identification_status) for the
-- "pending review" tab query. Partial index keeps it small.
CREATE INDEX IF NOT EXISTS idx_montree_media_pending_review
  ON montree_media (classroom_id, captured_at DESC)
  WHERE identification_status = 'pending_review';
