-- ============================================================================
-- 330_cms_phase3_ROLLBACK.sql — undo migrations/330_cms_phase3.sql
-- ============================================================================
-- Drops ONLY the objects 330 created. Every identifier below starts with
-- `cms_` — verify by grep before running. It leaves migration 329's schema
-- fully intact, so CMS drops back to phase-2 behaviour rather than to nothing.
--
-- ⚠️ THIS DESTROYS PHASE-3 DATA: every family's "About your child" answers and
-- every schooling-history row. The rest of the CMS record survives.
--
-- ⚠️ TWO THINGS CANNOT BE UNDONE: the `about_child` member added to the
-- `cms_enrollment_step` enum, and the `media` member added to
-- `cms_consent_kind`. Postgres has no `ALTER TYPE ... DROP VALUE`, and there is
-- no safe workaround — recreating either type would require rewriting
-- `cms_enrollments.completed_steps` / `cms_consents.kind`, which is an ALTER
-- against a table holding real applications and therefore exactly what the
-- additive-only contract forbids. Both leftovers are harmless: enum members
-- nothing writes. The 329 rollback drops the whole types anyway if you go all
-- the way back.
--
-- Idempotent: every drop is IF EXISTS.
-- ============================================================================

begin;

drop table if exists cms_previous_schools cascade;
drop table if exists cms_child_profiles   cascade;

-- The convergence seam. Dropping the column also drops its partial unique
-- index. Nothing in Montree reads it — the Guru's lookup fails soft.
drop index if exists idx_cms_children_montree_link;
alter table if exists cms_children drop column if exists montree_child_id;

-- The adrenaline flag. Every allergy row falls back to its phase-2 meaning,
-- where "carries a pen" lived in the free-text response_plan.
alter table if exists cms_allergies drop column if exists carries_epipen;

commit;

-- VERIFY (expect 0 rows for the tables, 0 rows for the column)
-- SELECT c.relname FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
-- WHERE c.relname IN ('cms_child_profiles', 'cms_previous_schools');
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'cms_children' AND column_name = 'montree_child_id';
