-- Migration 176: Enable unified_photo_tagger for Whale Class
-- Feature flag for the new single "This is..." button on photo audit cards
-- (replaces the confusing Accept/Fix two-button split)

-- Define the feature
INSERT INTO montree_feature_definitions (feature_key, name, description, category, is_premium, default_enabled)
VALUES (
  'unified_photo_tagger',
  'Unified Photo Tagger',
  'Single "This is..." button on photo audit cards instead of Accept/Fix split',
  'photo_audit',
  false,
  false
) ON CONFLICT (feature_key) DO NOTHING;

-- Enable for Whale Class school
INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by, enabled_at)
VALUES (
  'c6280fae-567c-45ed-ad4d-934eae79aabc',
  'unified_photo_tagger',
  true,
  'migration_176',
  NOW()
) ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true, enabled_by = 'migration_176', enabled_at = NOW();
