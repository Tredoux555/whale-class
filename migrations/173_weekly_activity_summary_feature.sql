-- Migration 173: Weekly Activity Summary feature flag
-- Short AI-generated sentence above the shelf on child week view
-- summarizing last week's area focus and suggesting this week's direction.

INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES (
  'weekly_activity_summary',
  'Weekly Activity Summary',
  'Shows a short AI-generated sentence above the shelf summarizing last week''s area focus and suggesting this week''s guidance direction.',
  '💡',
  'dashboard',
  false,
  false
)
ON CONFLICT (feature_key) DO NOTHING;

-- Enable for Whale Class (Tredoux House)
INSERT INTO montree_school_features (school_id, feature_key, enabled)
SELECT s.id, 'weekly_activity_summary', true
FROM montree_schools s
WHERE s.id = 'c6280fae-567c-45ed-ad4d-934eae79aabc'
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
