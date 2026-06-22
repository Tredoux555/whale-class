-- 268_teacher_settings.sql
-- Per-teacher settings store. Currently used for the customizable dashboard
-- menu (settings.menu = { v, items: [{ id, visible }] }). Mirrors the existing
-- settings JSONB pattern on montree_schools / montree_classrooms / montree_children.
--
-- Idempotent. Until this runs, the customizable-menu code degrades gracefully:
-- the menu config reads return null (→ legacy flag-gated menu everywhere) and
-- the signup seed no-ops with a logged warning. Nothing breaks.

ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
