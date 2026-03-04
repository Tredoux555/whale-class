-- Migration 136: Enable voice_observations feature for Beijing International School
-- The feature was built and deployed (Mar 4) but never explicitly enabled in the feature toggle tables

-- Enable at school level
INSERT INTO montree_school_features (school_id, feature_key, enabled, enabled_by)
SELECT id, 'voice_observations', true, 'system_setup'
FROM montree_schools
WHERE slug = 'beijing-international'
ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true, enabled_at = now();

-- Enable at classroom level for Whale Class
INSERT INTO montree_classroom_features (classroom_id, feature_key, enabled, enabled_by)
SELECT mc.id, 'voice_observations', true, 'system_setup'
FROM montree_classrooms mc
JOIN montree_schools ms ON mc.school_id = ms.id
WHERE ms.slug = 'beijing-international' AND mc.name ILIKE '%whale%'
ON CONFLICT (classroom_id, feature_key) DO UPDATE SET enabled = true, enabled_at = now();
