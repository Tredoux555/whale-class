-- Migration 137: Add print_weekly_plan feature toggle and enable for Beijing International
-- Only Beijing International gets print for now (user's school)

-- 1. Add the feature to the definitions table (if not exists)
INSERT INTO montree_feature_definitions (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES ('print_weekly_plan', 'Print Weekly Plan', 'Allows teachers to print a clean A4 weekly plan for each child', '🖨️', 'planning', false, false)
ON CONFLICT (feature_key) DO NOTHING;

-- 2. Enable at school level for Beijing International
INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
SELECT id, 'print_weekly_plan', true, 'system_setup'
FROM montree_schools
WHERE slug = 'beijing-international'
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true, enabled_at = now();
