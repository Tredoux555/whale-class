-- migrations/247_group_lesson_suggester_flag.sql
--
-- ✨ Group Lesson Suggester (Jun 10, 2026) — feature flag, default ON.
--
-- First cross-child intelligence surface: groups children who are ready
-- for the SAME next work ("Amy, Leo and Kayla are all ready for the Teen
-- Board — group presentation Tuesday?") plus joint-practice groups.
-- Deterministic — reads montree_child_progress against the classroom
-- curriculum sequence. No AI call, no per-use cost, so default_enabled
-- is TRUE for every school including Free tier.
--
-- ROLLBACK per school:
--   UPDATE montree_school_features SET enabled = false
--   WHERE school_id = '<id>' AND feature_key = 'group_lesson_suggester';
--
-- Idempotent.

BEGIN;

-- NOTE: montree_feature_definitions.name is NOT NULL (Session 118 lesson) —
-- every flag migration must include it.
INSERT INTO montree_feature_definitions (feature_key, name, default_enabled, description, icon, category)
VALUES (
  'group_lesson_suggester',
  'Group Lesson Suggester',
  true,
  'Suggests group presentations when several children are ready for the same work, and joint practice circles for works multiple children are working on.',
  '👥',
  'dashboard'
)
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category = EXCLUDED.category,
    default_enabled = EXCLUDED.default_enabled;

COMMIT;
