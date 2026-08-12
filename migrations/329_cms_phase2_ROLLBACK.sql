-- ============================================================================
-- 329_cms_phase2_ROLLBACK.sql — undo migrations/329_cms_phase2.sql
-- ============================================================================
-- Drops ONLY objects whose names begin with `cms_`. It cannot touch a Montree,
-- PSS or Story table, because it names no other table — verify by grep before
-- running: every identifier below starts with cms_.
--
-- ⚠️ THIS DESTROYS CMS DATA. Children, guardians, medical records, consents and
-- enrolments all go. Only run it while CMS is still pre-launch, or after
-- exporting. There is no partial rollback — the schema is one artefact.
--
-- Order matters: tables before the enums and functions they depend on. CASCADE
-- on the drops removes the policies, indexes and triggers with them.
-- Idempotent: every drop is IF EXISTS.
-- ============================================================================

begin;

drop table if exists cms_rate_limit_logs        cascade;
drop table if exists cms_attendance             cascade;
drop table if exists cms_pickup_authorizations  cascade;
drop table if exists cms_consents               cascade;
drop table if exists cms_enrollments            cascade;
drop table if exists cms_medical_records        cascade;
drop table if exists cms_dietary_requirements   cascade;
drop table if exists cms_allergies              cascade;
drop table if exists cms_class_teachers         cascade;
drop table if exists cms_child_guardians        cascade;
drop table if exists cms_children               cascade;
drop table if exists cms_memberships            cascade;
drop table if exists cms_guardians              cascade;
drop table if exists cms_class_groups           cascade;
drop table if exists cms_schools                cascade;
drop table if exists cms_organisations          cascade;
drop table if exists cms_users                  cascade;

drop function if exists cms_writable_child_ids()     cascade;
drop function if exists cms_readable_child_ids()     cascade;
drop function if exists cms_teacher_child_ids()      cascade;
drop function if exists cms_parent_child_ids()       cascade;
drop function if exists cms_own_created_child_ids()  cascade;
drop function if exists cms_parent_school_ids()      cascade;
drop function if exists cms_guardian_ids()           cascade;
drop function if exists cms_teacher_class_ids()      cascade;
drop function if exists cms_structural_school_ids()  cascade;
drop function if exists cms_admin_school_ids()       cascade;
drop function if exists cms_member_school_ids()      cascade;
drop function if exists cms_org_school_ids()         cascade;
drop function if exists cms_org_admin_org_ids()      cascade;
drop function if exists cms_member_org_ids()         cascade;
drop function if exists cms_current_user_id()        cascade;
drop function if exists cms_touch_updated_at()       cascade;

drop type if exists cms_attendance_state   cascade;
drop type if exists cms_consent_kind       cascade;
drop type if exists cms_enrollment_step    cascade;
drop type if exists cms_enrollment_status  cascade;
drop type if exists cms_dietary_reason     cascade;
drop type if exists cms_allergy_severity   cascade;
drop type if exists cms_relationship       cascade;
drop type if exists cms_membership_role    cascade;

commit;

-- VERIFY (expect 0 rows)
-- SELECT c.relname FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
-- WHERE c.relname LIKE 'cms\_%' AND c.relkind = 'r';
