-- ============================================================================
-- 330_cms_phase3.sql — CMS (Classroom Management System) PHASE 3
-- Aug 12, 2026. Finishes the TOP of the hourglass: the whole parent intake.
-- ============================================================================
--
-- WHAT THIS IS
--   Phase 2 made the data layer real but left wizard steps 2–6 as scaffolds
--   parking their answers in `cms_enrollments.draft_data`. Phase 3 builds those
--   steps for real, and adds the step Tredoux locked on 2026-08-12: **"About
--   your child"** — likes, dislikes, interests, temperament, and what the
--   family wants the teacher to know. That step needs a table, and this is it.
--
--   Everything steps 2–6 write already had a home in migration 329
--   (cms_medical_records, cms_allergies, cms_dietary_requirements,
--   cms_consents, cms_pickup_authorizations, cms_guardians) with ONE gap:
--   schooling history was a single `previous_school` jsonb blob on the
--   enrolment, which cannot hold the two or three settings a real family often
--   has behind them. `cms_previous_schools` closes it.
--
-- SAFETY CONTRACT (identical to 329 — read it there in full)
--   · PURELY ADDITIVE. Every object created or altered here is `cms_`-prefixed.
--     Grep it: no Montree, PSS or Story table is named, and the only ALTERs are
--     `add column if not exists` on cms_children / `add value if not exists` on
--     a cms_ enum. Nothing is dropped, nothing is rewritten.
--   · IDEMPOTENT. `create table if not exists`, `add column if not exists`,
--     `add value if not exists`, `drop policy if exists` before each create.
--     Safe to re-run; safe to run after a partial failure.
--   · TRANSACTIONAL. One BEGIN/COMMIT.
--   · REQUIRES 329. It references cms_children, cms_schools and the RLS helper
--     functions that migration defines. Run 329 first.
--
-- ── DECISION 1: a table for the profile, not more draft_data ────────────────
--   The About-your-child answers are the one part of the intake with a SECOND
--   consumer: the Montree Guru (`lib/cms/engine/guru-feed.ts`). A jsonb blob
--   inside an enrolment would mean the Guru's picture of a child depends on
--   which application row happens to be open. `cms_child_profiles` is keyed to
--   the CHILD, one row, and outlives every enrolment.
--
-- ── DECISION 2: personality data is MORE private than medical data ──────────
--   The org layer can already read nothing clinical (329). This table goes
--   further: no org policy at all, and the read set is exactly
--   `cms_readable_child_ids()` — the family, the teacher of the child's OWN
--   room, and the school office. A group director cannot read a four-year-old's
--   temperament from head office, and `scripts/cms/rls-test.mjs` asserts it.
--
-- ── DECISION 3: temperament is jsonb, not nine columns ──────────────────────
--   Montree's own `montree_child_mental_profiles` uses one column per trait
--   because a clinician's instrument has a fixed instrument. This is a PARENT
--   answering four warm questions, and the set will change as we learn which
--   ones families answer honestly. jsonb `{"settling": 3, ...}`, validated in
--   `lib/cms/validation.ts`, keeps that free without a migration per edit.
--
-- ── DECISION 4: cms_children.montree_child_id — the convergence seam ────────
--   CLAUDE.md's stated intent is that Montree's own child onboarding eventually
--   adopts this shared engine. Until it does, a CMS child and a Montree child
--   are separate rows, and the Guru cannot find the profile a CMS family wrote.
--   One nullable column names that link. It is NULL for every row today, which
--   is exactly why the Guru wiring is a no-op until somebody sets it: montree's
--   behaviour is unchanged, by construction.
--
-- VERIFY block at the bottom.
-- ROLLBACK: migrations/330_cms_phase3_ROLLBACK.sql (drops only phase-3 objects).
-- ============================================================================

begin;

-- ── enum: the new wizard step ───────────────────────────────────────────────
-- `add value if not exists` is the idempotent form. Postgres 12+ permits it
-- inside a transaction block provided the new value is not USED in the same
-- transaction — nothing below writes an enrolment, so it is not.
-- `before 'medical'` keeps enum order equal to ENROLLMENT_STEPS order in
-- lib/cms/engine/types.ts; the two lists are one list in two languages.
alter type cms_enrollment_step add value if not exists 'about_child' before 'medical';

-- ── enum: the consent a school actually asks for separately ─────────────────
-- 329 folded "may we use a photo of your child in the newsletter / on the
-- website" into `photography`, which is wrong in law and wrong in practice: a
-- family that is happy for a picture on the classroom wall is often not happy
-- for one on a public page, and a single checkbox forces them to refuse both.
-- `media` splits it. `photography` keeps its old meaning (inside the school and
-- in the family's own updates), so no existing row changes meaning.
alter type cms_consent_kind add value if not exists 'media' after 'photography';

-- ============================================================================
-- TABLES
-- ============================================================================

-- ── the child as their family describes them ────────────────────────────────
-- One row per child. Written by the family in wizard step 2, read by the room's
-- teacher (CMS insight card) and, when guru_sync is true and the child is
-- linked, by the Montree Guru.
create table if not exists cms_child_profiles (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references cms_children(id) on delete cascade,
  school_id      uuid not null references cms_schools(id) on delete cascade,
  -- The family's own words. text[] rather than a tag table on purpose: these
  -- are not a controlled vocabulary and must never become one — "Baba's
  -- singing" is a perfectly good entry and will never appear in a taxonomy.
  likes          text[] not null default '{}',
  dislikes       text[] not null default '{}',
  interests      text[] not null default '{}',
  -- Temperament from lib/cms/engine/types.ts: {"settling":3,"company":2,...},
  -- each axis 1–5. NOT a score, NOT a diagnosis — see DECISION 3 and the
  -- comment on TemperamentAxis. An absent key means "the family did not say".
  temperament    jsonb not null default '{}'::jsonb,
  -- "What should the teacher know about your child?"
  parent_notes   text,
  -- May this profile inform the Montree Guru? The family's choice. False keeps
  -- the record in the classroom and out of the teaching assistant entirely.
  guru_sync      boolean not null default true,
  guru_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  -- One profile per child: this is the child's record, not an application's.
  unique (child_id)
);
create index if not exists idx_cms_child_profiles_school on cms_child_profiles (school_id);
-- The Guru's exact lookup path: only synced, live profiles ever leave CMS.
create index if not exists idx_cms_child_profiles_guru
  on cms_child_profiles (child_id) where guru_sync and deleted_at is null;

drop trigger if exists trg_cms_child_profiles_touch on cms_child_profiles;
create trigger trg_cms_child_profiles_touch before update on cms_child_profiles
  for each row execute function cms_touch_updated_at();

-- ── schooling history ───────────────────────────────────────────────────────
-- Rows, not a blob (see the header). `country_code` is text rather than an enum
-- because a family that writes "Zimbabwe" instead of "ZW" has still told the
-- office what it needed to know.
create table if not exists cms_previous_schools (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references cms_children(id) on delete cascade,
  school_id     uuid not null references cms_schools(id) on delete cascade,
  name          text not null,
  country_code  text,
  city          text,
  attended_from date,
  attended_to   date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  check (attended_to is null or attended_from is null or attended_to >= attended_from)
);
create index if not exists idx_cms_previous_schools_child on cms_previous_schools (child_id);
create index if not exists idx_cms_previous_schools_school on cms_previous_schools (school_id);

drop trigger if exists trg_cms_previous_schools_touch on cms_previous_schools;
create trigger trg_cms_previous_schools_touch before update on cms_previous_schools
  for each row execute function cms_touch_updated_at();

-- ── the one fact an allergy row was missing ─────────────────────────────────
-- Whether the child carries adrenaline (EpiPen / Jext / Anapen). 329 could only
-- express it inside the free-text `response_plan`, which means no query can
-- answer "which children in this room carry a pen?" — the single question a
-- relief teacher asks on their first morning. Additive, defaults false, so
-- every existing row keeps its exact current meaning.
alter table cms_allergies add column if not exists carries_epipen boolean not null default false;

-- ── the convergence seam (DECISION 4) ───────────────────────────────────────
-- Nullable, unenforced by FK: montree_children lives in the same database today
-- but CMS must remain runnable against a database that has no Montree at all,
-- and a hard FK would make 330 fail on a fresh CMS-only project. The Guru
-- resolves it with a lookup, not a join, and fails soft when it finds nothing.
alter table cms_children add column if not exists montree_child_id uuid;
create unique index if not exists idx_cms_children_montree_link
  on cms_children (montree_child_id) where montree_child_id is not null;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Same idioms as 329, and for the same reason: the app uses the service role
-- and scopes by session, so these policies are defence in depth. Every policy
-- is `TO authenticated` — never bare (migration 313's lesson).

alter table cms_child_profiles   enable row level security;
alter table cms_previous_schools enable row level security;

-- ── service role: full access ───────────────────────────────────────────────
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    return;
  end if;
  foreach t in array array['cms_child_profiles', 'cms_previous_schools'] loop
    execute format('drop policy if exists %I on %I', t || '_service', t);
    execute format(
      'create policy %I on %I for all to service_role using (true) with check (true)',
      t || '_service', t);
  end loop;
end $$;

-- ── cms_child_profiles ──────────────────────────────────────────────────────
-- READ: the family, the teacher of the child's own room, the school office.
-- That is exactly cms_readable_child_ids(), which — deliberately — does NOT
-- include the org layer. There is no `or school_id in (select
-- cms_org_school_ids())` clause here and there must never be one: a group
-- director reading a four-year-old's temperament from head office is the exact
-- failure this table's privacy note exists to prevent.
drop policy if exists cms_child_profiles_read on cms_child_profiles;
create policy cms_child_profiles_read on cms_child_profiles
  for select to authenticated
  using (child_id in (select cms_readable_child_ids()));

-- WRITE: the family and the school office only. A teacher READS the profile
-- and never edits it — the words in it are the parent's, and a record that
-- staff can quietly rewrite is not the family's description any more.
drop policy if exists cms_child_profiles_write on cms_child_profiles;
create policy cms_child_profiles_write on cms_child_profiles
  for all to authenticated
  using (child_id in (select cms_writable_child_ids()))
  with check (child_id in (select cms_writable_child_ids()));

-- ── cms_previous_schools ────────────────────────────────────────────────────
-- Schooling history is intake, not clinical detail, but it still identifies a
-- family's movements — same read set as the profile, same write set.
drop policy if exists cms_previous_schools_read on cms_previous_schools;
create policy cms_previous_schools_read on cms_previous_schools
  for select to authenticated
  using (child_id in (select cms_readable_child_ids()));

drop policy if exists cms_previous_schools_write on cms_previous_schools;
create policy cms_previous_schools_write on cms_previous_schools
  for all to authenticated
  using (child_id in (select cms_writable_child_ids()))
  with check (child_id in (select cms_writable_child_ids()));

commit;

-- ============================================================================
-- VERIFY (run separately; expect 19 cms_ tables, rls_enabled = true on both new
-- ones, and 'about_child' present in the step enum)
-- ============================================================================
-- SELECT c.relname AS table_name,
--        c.relrowsecurity AS rls_enabled,
--        COUNT(p.polname) AS policy_count
-- FROM pg_class c
-- LEFT JOIN pg_policy p ON p.polrelid = c.oid
-- JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
-- WHERE c.relname IN ('cms_child_profiles', 'cms_previous_schools')
--   AND c.relkind = 'r'
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relname;
--
-- SELECT unnest(enum_range(NULL::cms_enrollment_step)) AS step;
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'cms_children' AND column_name = 'montree_child_id';
