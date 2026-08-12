-- ============================================================================
-- 332_cms_phase7_handshake_ROLLBACK.sql — undo migration 332
-- ============================================================================
-- Drops ONLY the objects 332 created. Every identifier below starts with
-- `cms_` — verify by grep before running. Migrations 329, 330 and 331 are left
-- fully intact, so CMS drops back to phase-6 behaviour (an office that cannot
-- accept into Montree) rather than to nothing.
--
-- ⚠️ WHAT THIS DESTROYS:
--   · Every school↔Montree and room↔Montree LINK. The links themselves are the
--     only record of which CMS school is which Montree school, so re-running
--     332 afterwards gives you the columns back EMPTY and the operator must
--     re-run the linking SQL. Write the uuids down before you run this.
--   · Every stored invite code — BOTH homes
--     (`cms_children.montree_parent_invite_code` and the family-side copy on
--     `cms_guardians`) — and the `montree_linked_at` audit stamp.
--     ⚠️ THE CODES THEMSELVES STILL WORK — they live in
--     `montree_parent_invites`, which this file does not touch and must not.
--     What is lost is CMS's ability to show a family their code; the office
--     reads it out of Montree's own Parents tab instead.
--   · The audit of who decided each enrolment (`decided_by_user_id`).
--     `decided_at` survives — 329 owns it.
--
-- ✅ WHAT SURVIVES, DELIBERATELY:
--   · `cms_children.montree_child_id` — migration 330's column, and the seam
--     the guru feed reads. Dropping it here would silently unlink every child
--     from their Montree record and take a working guru context down with it.
--     A phase-7 rollback is "stop making new links", not "sever the old ones".
--   · Every montree_* row this phase ever created: children, invites, threads.
--     A rollback of a CMS migration may not reach into the other product.
--
-- ⚠️ ORDER MATTERS. The triggers are dropped before the function they call:
-- Postgres refuses to drop a function a live trigger depends on.
--
-- Idempotent: every drop is IF EXISTS.
-- ============================================================================

begin;

drop trigger if exists trg_cms_children_guard_link     on cms_children;
drop trigger if exists trg_cms_guardians_guard_link    on cms_guardians;
drop trigger if exists trg_cms_schools_guard_link      on cms_schools;
drop trigger if exists trg_cms_class_groups_guard_link on cms_class_groups;

drop function if exists cms_guard_montree_link();

drop index if exists idx_cms_schools_montree_school;
drop index if exists idx_cms_class_groups_montree_classroom;
drop index if exists idx_cms_children_montree_link;

alter table if exists cms_schools      drop column if exists montree_school_id;
alter table if exists cms_class_groups drop column if exists montree_classroom_id;
alter table if exists cms_children     drop column if exists montree_parent_invite_code;
alter table if exists cms_children     drop column if exists montree_linked_at;
alter table if exists cms_guardians    drop column if exists montree_parent_invite_code;
alter table if exists cms_enrollments  drop column if exists decided_by_user_id;

commit;

-- VERIFY (expect 0 rows from all four)
-- SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trg_cms_%_guard_link';
-- SELECT proname FROM pg_proc WHERE proname = 'cms_guard_montree_link';
-- SELECT indexname FROM pg_indexes WHERE indexname IN
--   ('idx_cms_schools_montree_school','idx_cms_class_groups_montree_classroom',
--    'idx_cms_children_montree_link');
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE (table_name, column_name) IN (
--   ('cms_schools','montree_school_id'),
--   ('cms_class_groups','montree_classroom_id'),
--   ('cms_children','montree_parent_invite_code'),
--   ('cms_children','montree_linked_at'),
--   ('cms_guardians','montree_parent_invite_code'),
--   ('cms_enrollments','decided_by_user_id'));
--
-- And ONE row from this — 330's seam must still be there:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'cms_children' AND column_name = 'montree_child_id';
