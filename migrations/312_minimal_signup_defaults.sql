-- migrations/312_minimal_signup_defaults.sql
--
-- Minimal signup: fewer switches in a new teacher's face (Tredoux, Aug 2026).
--
-- A brand-new school currently lands in a dashboard carrying every feature that
-- ever shipped default-ON. Most of them are meaningless on day one (you cannot
-- bulk-import students you haven't entered, or print a weekly plan you haven't
-- written), and the noise is the first impression the product makes. Same
-- reasoning as migration 280 (Curriculum Gap Radar → default OFF): opt-in, not
-- shoved in a new user's face.
--
-- This flips the SYSTEMWIDE DEFAULT only. Nothing is deleted, no feature is
-- removed from the admin toggle, and every school that already holds a
-- montree_school_features override KEEPS it — an override always beats this
-- default. Existing schools that were relying on the default alone will see the
-- feature disappear from their menu until someone turns it on.
--
-- ── TURNED OFF BY DEFAULT (this migration) ──────────────────────────────
--   games                   class_events            bulk_student_import
--   multi_child_tagging     print_weekly_plan       group_lesson_suggester
--   home_practice_cards     multi_teacher_mgmt
--
-- ── DELIBERATELY LEFT ON (the day-one core — do NOT add these below) ────
--   photo_audit             photo_pipeline_v2       daily_reports
--   teacher_notes           parent_portal           onboarding_copilot
--
-- 👉 FOUNDER: this list is a judgement call, not a law. Edit the IN (...) list
--    below before running if you want a feature to stay on for new schools —
--    deleting a line here is all it takes.
--
-- TURN ON for one school:
--   INSERT INTO montree_school_features (school_id, feature_key, enabled)
--   VALUES ('<id>', '<feature_key>', true)
--   ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
--
-- Idempotent.

BEGIN;

UPDATE montree_feature_definitions
SET default_enabled = false
WHERE feature_key IN (
  'games',
  'class_events',
  'bulk_student_import',
  'multi_child_tagging',
  'print_weekly_plan',
  'group_lesson_suggester',
  'home_practice_cards',
  'multi_teacher_mgmt'
);

COMMIT;
