-- ============================================================================
-- 331_cms_phase4_teacher_roster_ROLLBACK.sql — undo migration 331
-- ============================================================================
-- Drops ONLY the objects 331 created. Every identifier below starts with
-- `cms_` — verify by grep before running. Migrations 329 and 330 are left
-- fully intact, so CMS drops back to phase-3 behaviour (parent-entered records
-- only, teachers read-only) rather than to nothing.
--
-- ⚠️ WHAT THIS DESTROYS: the `staff_note` line a teacher wrote against each
-- child. Nothing else. Children, allergies, dietary rows and contacts that a
-- teacher created SURVIVE — they are ordinary rows in 329's tables and are
-- indistinguishable from parent-entered ones by design. What the rollback
-- removes is the teacher's continuing PERMISSION to write them, which is
-- exactly the phase-3 posture.
--
-- ⚠️ ORDER MATTERS. The policies are dropped before the functions they call:
-- Postgres will refuse to drop a function a live policy depends on.
--
-- Idempotent: every drop is IF EXISTS.
-- ============================================================================

begin;

drop policy if exists cms_children_teacher_insert       on cms_children;
drop policy if exists cms_children_teacher_write        on cms_children;
drop policy if exists cms_allergies_teacher_write       on cms_allergies;
drop policy if exists cms_dietary_teacher_write         on cms_dietary_requirements;
drop policy if exists cms_guardians_teacher_insert      on cms_guardians;
drop policy if exists cms_guardians_teacher_write       on cms_guardians;
drop policy if exists cms_child_guardians_teacher_write on cms_child_guardians;
drop policy if exists cms_pickup_teacher_write          on cms_pickup_authorizations;

drop function if exists cms_teacher_writable_child_ids();
drop function if exists cms_staff_entered_child_ids();
drop function if exists cms_teacher_school_ids();

drop index if exists idx_cms_children_room_name_dob;

alter table if exists cms_children drop column if exists staff_note;

commit;

-- VERIFY (expect 0 rows from all four)
-- SELECT polname FROM pg_policy WHERE polname LIKE 'cms_%teacher%';
-- SELECT proname FROM pg_proc WHERE proname IN
--   ('cms_teacher_school_ids','cms_staff_entered_child_ids',
--    'cms_teacher_writable_child_ids');
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'cms_children' AND column_name = 'staff_note';
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'cms_children' AND indexname = 'idx_cms_children_room_name_dob';
