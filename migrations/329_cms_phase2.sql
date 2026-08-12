-- ============================================================================
-- 329_cms_phase2.sql — CMS (Classroom Management System) PHASE 2
-- Aug 11, 2026. Makes the Harbor surface's data layer real.
-- ============================================================================
--
-- WHAT THIS IS
--   Phase 1 shipped db/cms-schema.sql as a DRAFT: tables sketched, RLS marked
--   with `-- RLS:` comments in English. This migration is that draft turned
--   into a real, runnable, policy-carrying schema, plus the four tables the
--   draft was missing (cms_users, cms_class_teachers, cms_pickup_authorizations
--   and the enrolment draft payload).
--
-- SAFETY CONTRACT (read before running against production Montree)
--   · PURELY ADDITIVE. Every object created here is `cms_`-prefixed. This file
--     contains no ALTER, DROP or UPDATE against any pre-existing table. Grep it:
--     the only tables named are cms_*.
--   · IDEMPOTENT. `create table if not exists`, enum creation wrapped in a
--     duplicate_object guard, `drop policy if exists` before each `create
--     policy`. Safe to re-run; safe to run after a partial failure.
--   · TRANSACTIONAL. One BEGIN/COMMIT. A failure anywhere rolls the whole file
--     back and leaves the database exactly as it was.
--   · No storage-schema statements (Montree lesson, Aug 8: a storage write
--     inside a migration rolls back the entire migration — buckets are created
--     in the dashboard, never here).
--
-- ── DECISION 1: prefixed tables in `public`, NOT a dedicated `cms` schema ────
--   Every product surface in this repo isolates itself with a table prefix in
--   the public schema — Montree with `montree_`, PSS with `tp_`, Story with
--   `story_`. A new Postgres schema would additionally require changing the
--   Supabase project's exposed-schema setting (Settings → API → "Exposed
--   schemas") for PostgREST to see it, which is a change to shared project
--   configuration and therefore NOT additive. `cms_` it is.
--
-- ── DECISION 2: cms_memberships IS the role system ──────────────────────────
--   No `cms_user_roles`, and Montree's own role rails are NOT reused. Montree
--   has three unrelated ones (`user_roles` for the legacy Whale admin surface;
--   `montree_teachers` / `montree_school_admins` / `montree_parent_invites` as
--   role-by-table; `montree_organization_admins` for the org tier) and every
--   one of them is scoped to `montree_schools`. CMS has its own tenancy
--   (organisation → school → class group), and binding CMS rows to
--   montree_schools would (a) modify the meaning of an existing table and
--   (b) make a CMS row undeletable without touching Montree data. One row of
--   cms_memberships = one person's authority in one school (or, for org_admin,
--   one organisation); a teacher who is also a parent holds two rows, never a
--   blended role. Convergence, when it comes, happens by pointing
--   cms_memberships.user_id at a shared identity — not by re-modelling now.
--
-- ── DECISION 3: cms_users, not auth.users ───────────────────────────────────
--   Montree does not use Supabase Auth. Every Montree login (teacher,
--   principal, parent, org director, agent) is email/password verified with
--   bcrypt against a product table, then a `jose` JWT in an httpOnly cookie —
--   see lib/montree/password.ts + lib/montree/server-auth.ts. `auth.users` in
--   the founder's project is effectively empty, so an FK to it would fail for
--   every real user. CMS therefore mirrors the house pattern: cms_users holds
--   the credential, and cms_users.id is what the CMS session JWT carries as its
--   subject. That id is also what the RLS helper below resolves, so the SAME
--   row-level rules hold whether the caller arrives with a Supabase-signed JWT
--   (`sub`) or a CMS-signed one (`cms_user_id`).
--
-- ── DECISION 4: RLS is real, and the app still uses the service role ─────────
--   Application code reaches Postgres through getSupabase() (service role,
--   which bypasses RLS) and does its own scoping — the same as every other
--   surface in this repo. The policies below are therefore DEFENCE IN DEPTH,
--   not the primary gate: they are what stands between the public anon key and
--   a child's medical record if a query is ever made from the browser, and they
--   are what makes a future direct-from-client CMS possible without a rewrite.
--   Every policy is declared `TO authenticated` — never bare — because a policy
--   without a `TO` clause defaults to PUBLIC, which includes `anon`. That exact
--   mistake is what migration 313 had to clean up.
--
-- VERIFY block at the bottom.
-- ROLLBACK: migrations/329_cms_phase2_ROLLBACK.sql (drops only cms_* objects).
-- ============================================================================

begin;

create extension if not exists "pgcrypto";

-- ── enums ───────────────────────────────────────────────────────────────────
-- `create type` has no IF NOT EXISTS; the duplicate_object guard is the
-- idempotent equivalent and is used repo-wide.

do $$ begin
  create type cms_membership_role as enum ('org_admin', 'school_admin', 'teacher', 'parent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cms_relationship as enum
    ('mother', 'father', 'aunt', 'uncle', 'grandparent', 'guardian', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cms_allergy_severity as enum ('mild', 'moderate', 'severe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cms_dietary_reason as enum
    ('allergy', 'medical', 'religious', 'cultural', 'preference');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cms_enrollment_status as enum
    ('draft', 'submitted', 'in_review', 'accepted', 'waitlisted', 'declined', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cms_enrollment_step as enum
    ('child', 'medical', 'dietary', 'previous_school', 'contacts', 'consents');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cms_consent_kind as enum
    ('photography', 'outings', 'emergency_medical', 'data_processing', 'sunscreen');
exception when duplicate_object then null; end $$;

do $$ begin
  create type cms_attendance_state as enum ('expected', 'present', 'absent', 'collected');
exception when duplicate_object then null; end $$;

-- ── shared trigger: updated_at ──────────────────────────────────────────────

create or replace function cms_touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- ── identity ────────────────────────────────────────────────────────────────

create table if not exists cms_users (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  -- bcrypt, via lib/montree/password.ts hashPassword(). Never a raw password,
  -- never a reversible hash.
  password_hash    text not null,
  display_name     text not null default '',
  preferred_locale text not null default 'en',
  is_active        boolean not null default true,
  last_login_at    timestamptz,
  created_at       timestamptz not null default now()
);
-- Case-insensitive uniqueness: logins are lowercased before lookup.
create unique index if not exists idx_cms_users_email on cms_users (lower(email));

-- ── organisational layer ────────────────────────────────────────────────────

create table if not exists cms_organisations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  country_code   text not null,
  default_locale text not null default 'en',
  created_at     timestamptz not null default now()
);

create table if not exists cms_schools (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references cms_organisations(id) on delete cascade,
  name            text not null,
  slug            text not null,
  timezone        text not null default 'UTC',
  address_line    text,
  phone           text,
  email           text,
  created_at      timestamptz not null default now(),
  unique (organisation_id, slug)
);
create index if not exists idx_cms_schools_org on cms_schools (organisation_id);

create table if not exists cms_class_groups (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references cms_schools(id) on delete cascade,
  name              text not null,
  age_min           numeric(3,1) not null,
  age_max           numeric(3,1) not null,
  capacity          integer not null default 0,
  lead_teacher_name text,
  created_at        timestamptz not null default now(),
  check (age_max >= age_min),
  check (capacity >= 0)
);
create index if not exists idx_cms_class_groups_school on cms_class_groups (school_id);

-- ── people ──────────────────────────────────────────────────────────────────

create table if not exists cms_guardians (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references cms_schools(id) on delete cascade,
  full_name        text not null,
  relationship     cms_relationship not null default 'guardian',
  phone            text,
  email            text,
  preferred_locale text not null default 'en',
  can_collect      boolean not null default true,
  contact_priority integer not null default 1,
  -- Court order / no-contact. When set, this person may NEVER collect,
  -- whatever a pickup authorisation row says.
  restriction_note text,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index if not exists idx_cms_guardians_school on cms_guardians (school_id);
create index if not exists idx_cms_guardians_email on cms_guardians (lower(email));

create table if not exists cms_memberships (
  id              uuid primary key default gen_random_uuid(),
  -- cms_users.id. Also the `sub` claim of the CMS session JWT — see DECISION 3.
  user_id         uuid references cms_users(id) on delete cascade,
  role            cms_membership_role not null,
  organisation_id uuid not null references cms_organisations(id) on delete cascade,
  school_id       uuid references cms_schools(id) on delete cascade,
  guardian_id     uuid references cms_guardians(id) on delete set null,
  email           text not null,
  display_name    text not null default '',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  -- Only an org_admin may be school-less; every other role is a school role.
  check (role = 'org_admin' or school_id is not null),
  -- A parent membership without a guardian row cannot own a child.
  check (role <> 'parent' or guardian_id is not null)
);
create index if not exists idx_cms_memberships_user on cms_memberships (user_id);
create index if not exists idx_cms_memberships_school_role on cms_memberships (school_id, role);
create index if not exists idx_cms_memberships_org_role on cms_memberships (organisation_id, role);
create index if not exists idx_cms_memberships_guardian on cms_memberships (guardian_id);
-- One membership per (person, role, scope). coalesce() because school_id is
-- null for org_admin and NULLs never collide in a plain unique index.
create unique index if not exists idx_cms_memberships_unique
  on cms_memberships (user_id, role, coalesce(school_id, organisation_id));

create table if not exists cms_children (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references cms_schools(id) on delete cascade,
  class_group_id uuid references cms_class_groups(id) on delete set null,
  legal_name     text not null,
  preferred_name text not null,
  date_of_birth  date not null,
  home_language  text not null default 'en',
  photo_url      text,
  -- Who created this row. Load-bearing for RLS, not audit decoration: it is
  -- what lets a family claim the child they have just created WITHOUT letting
  -- any other parent at the school claim it first. See cms_child_guardians.
  created_by_user_id uuid references cms_users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists idx_cms_children_school on cms_children (school_id);
-- The teacher Today roster's exact query path: room + not-deleted.
create index if not exists idx_cms_children_class_live
  on cms_children (class_group_id) where deleted_at is null;

drop trigger if exists trg_cms_children_touch on cms_children;
create trigger trg_cms_children_touch before update on cms_children
  for each row execute function cms_touch_updated_at();

create index if not exists idx_cms_children_creator on cms_children (created_by_user_id);

-- Which guardians belong to which child. This join is what "my children" means
-- for a parent, and it is the spine of every parent-side RLS policy.
create table if not exists cms_child_guardians (
  child_id    uuid not null references cms_children(id) on delete cascade,
  guardian_id uuid not null references cms_guardians(id) on delete cascade,
  is_primary  boolean not null default false,
  can_collect boolean not null default true,
  created_at  timestamptz not null default now(),
  primary key (child_id, guardian_id)
);
-- Parent dashboard reads guardian → children; the PK covers child → guardians.
create index if not exists idx_cms_child_guardians_guardian
  on cms_child_guardians (guardian_id);

-- Teacher → room assignment. The draft schema had no such table, which left
-- "teachers read children in their assigned class groups" unimplementable:
-- a school-wide teacher membership cannot express a room.
create table if not exists cms_class_teachers (
  membership_id  uuid not null references cms_memberships(id) on delete cascade,
  class_group_id uuid not null references cms_class_groups(id) on delete cascade,
  is_lead        boolean not null default false,
  created_at     timestamptz not null default now(),
  primary key (membership_id, class_group_id)
);
create index if not exists idx_cms_class_teachers_class
  on cms_class_teachers (class_group_id);

-- ── health & diet ───────────────────────────────────────────────────────────

create table if not exists cms_allergies (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references cms_children(id) on delete cascade,
  school_id       uuid not null references cms_schools(id) on delete cascade,
  allergen        text not null,
  severity        cms_allergy_severity not null,
  reaction        text not null default '',
  response_plan   text not null default '',
  requires_poster boolean not null default true,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists idx_cms_allergies_child on cms_allergies (child_id);
create index if not exists idx_cms_allergies_school on cms_allergies (school_id);

create table if not exists cms_dietary_requirements (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references cms_children(id) on delete cascade,
  school_id      uuid not null references cms_schools(id) on delete cascade,
  label          text not null,
  reason         cms_dietary_reason not null,
  excluded_foods text[] not null default '{}',
  notes          text,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists idx_cms_dietary_child on cms_dietary_requirements (child_id);
create index if not exists idx_cms_dietary_school on cms_dietary_requirements (school_id);

create table if not exists cms_medical_records (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references cms_children(id) on delete cascade,
  school_id        uuid not null references cms_schools(id) on delete cascade,
  conditions       text[] not null default '{}',
  -- Medication[] from lib/cms/engine/types.ts.
  medications      jsonb not null default '[]'::jsonb,
  doctor_name      text,
  doctor_phone     text,
  emergency_note   text,
  last_reviewed_at date,
  reviewed_by_name text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (child_id)
);
create index if not exists idx_cms_medical_school on cms_medical_records (school_id);

drop trigger if exists trg_cms_medical_touch on cms_medical_records;
create trigger trg_cms_medical_touch before update on cms_medical_records
  for each row execute function cms_touch_updated_at();

-- ── enrolment ───────────────────────────────────────────────────────────────

create table if not exists cms_enrollments (
  id                       uuid primary key default gen_random_uuid(),
  child_id                 uuid not null references cms_children(id) on delete cascade,
  school_id                uuid not null references cms_schools(id) on delete cascade,
  requested_class_group_id uuid references cms_class_groups(id) on delete set null,
  status                   cms_enrollment_status not null default 'draft',
  completed_steps          cms_enrollment_step[] not null default '{}',
  requested_start_date     date,
  -- PreviousSchool from lib/cms/engine/types.ts.
  previous_school          jsonb,
  settling_notes           text,
  -- Steps 2–6 are scaffolds in phase 2 but the wizard must still be resumable,
  -- so whatever a step has captured is parked here, keyed by step name, until
  -- that step gets its own typed columns. Never read for authority — the typed
  -- columns and the child/allergy/consent tables are the record.
  draft_data               jsonb not null default '{}'::jsonb,
  created_by_user_id       uuid references cms_users(id) on delete set null,
  submitted_at             timestamptz,
  decided_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists idx_cms_enrollments_school_status
  on cms_enrollments (school_id, status);
create index if not exists idx_cms_enrollments_child on cms_enrollments (child_id);
-- One live draft per child: the wizard's "resume where I left off" lookup, and
-- the guard against a double-submit creating two applications.
create unique index if not exists idx_cms_enrollments_one_draft
  on cms_enrollments (child_id) where status = 'draft';

drop trigger if exists trg_cms_enrollments_touch on cms_enrollments;
create trigger trg_cms_enrollments_touch before update on cms_enrollments
  for each row execute function cms_touch_updated_at();

create table if not exists cms_consents (
  id                     uuid primary key default gen_random_uuid(),
  child_id               uuid not null references cms_children(id) on delete cascade,
  school_id              uuid not null references cms_schools(id) on delete cascade,
  kind                   cms_consent_kind not null,
  granted                boolean not null default false,
  granted_by_guardian_id uuid references cms_guardians(id) on delete set null,
  granted_at             timestamptz,
  created_at             timestamptz not null default now(),
  unique (child_id, kind)
);
-- NOTE: lib/cms/engine/photo-filter.ts treats a MISSING row as refusal. Never
-- backfill this table with granted = true.

-- Who may collect this child, and when. Distinct from cms_child_guardians:
-- a guardian link is a RELATIONSHIP, an authorisation is a PERMISSION, and the
-- two change on different clocks (a grandparent authorised for one week).
create table if not exists cms_pickup_authorizations (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references cms_children(id) on delete cascade,
  school_id   uuid not null references cms_schools(id) on delete cascade,
  guardian_id uuid not null references cms_guardians(id) on delete cascade,
  authorised  boolean not null default true,
  valid_from  date,
  valid_to    date,
  note        text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (child_id, guardian_id),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create index if not exists idx_cms_pickup_child on cms_pickup_authorizations (child_id);
create index if not exists idx_cms_pickup_school on cms_pickup_authorizations (school_id);

-- ── operations ──────────────────────────────────────────────────────────────

create table if not exists cms_attendance (
  id                    uuid primary key default gen_random_uuid(),
  child_id              uuid not null references cms_children(id) on delete cascade,
  school_id             uuid not null references cms_schools(id) on delete cascade,
  class_group_id        uuid references cms_class_groups(id) on delete set null,
  on_date               date not null,
  state                 cms_attendance_state not null default 'expected',
  arrived_at            time,
  absence_reason        text,
  collector_guardian_id uuid references cms_guardians(id) on delete set null,
  collection_time       time,
  recorded_by_name      text,
  created_at            timestamptz not null default now(),
  unique (child_id, on_date)
);
-- The Today page's exact query path.
create index if not exists idx_cms_attendance_class_date
  on cms_attendance (class_group_id, on_date);

-- Rate limiting for CMS auth endpoints. Same shape as montree_rate_limit_logs
-- so lib/rate-limiter.ts works against it unchanged.
create table if not exists cms_rate_limit_logs (
  id         bigserial primary key,
  key        text not null,
  endpoint   text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_cms_rate_limit_lookup
  on cms_rate_limit_logs (key, endpoint, created_at desc);

-- ============================================================================
-- RLS HELPERS
-- ============================================================================
-- All SECURITY DEFINER and STABLE. Definer is not optional: a policy on
-- cms_memberships that itself selects from cms_memberships would recurse
-- forever under RLS. Definer functions run with the owner's rights and so read
-- the membership table without re-entering the policy. Each pins search_path,
-- which is what stops a definer function from being hijacked by a caller-set
-- search_path.

-- The current caller's cms_users.id, or NULL when unauthenticated.
--
-- Semantics are IDENTICAL to Supabase's auth.uid() — both read the `sub` claim
-- out of the request's JWT — but written inline rather than calling auth.uid()
-- so that (a) this migration applies to any Postgres, not only a Supabase
-- project, and (b) a CMS-signed session token can carry `cms_user_id` and get
-- the same treatment. `sub` is preferred when both are absent-safe: a Supabase
-- JWT wins, a CMS JWT is the fallback. Non-uuid subjects (the service key's
-- sub is the literal 'service_role') resolve to NULL rather than erroring.
create or replace function cms_current_user_id() returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  claims jsonb;
  raw    text;
begin
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    return null;
  end;
  if claims is null then return null; end if;
  raw := coalesce(claims ->> 'sub', claims ->> 'cms_user_id');
  if raw is null or raw !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then return null;
  end if;
  return raw::uuid;
end $$;

-- Organisations the caller belongs to in ANY role.
create or replace function cms_member_org_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct m.organisation_id from cms_memberships m
  where m.user_id = cms_current_user_id() and m.is_active
$$;

-- Organisations the caller administers (org_admin).
create or replace function cms_org_admin_org_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct m.organisation_id from cms_memberships m
  where m.user_id = cms_current_user_id() and m.is_active and m.role = 'org_admin'
$$;

-- Schools under an organisation the caller administers. This is the ORG LAYER's
-- scope and it is READ-ONLY on child data by design: a group office compares
-- schools, it does not edit a child's record or read a diagnosis. Kept strictly
-- separate from cms_admin_school_ids() — the two were one function during the
-- first pass and the RLS test caught it immediately: an org director could read
-- every medical record in the group.
create or replace function cms_org_school_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select s.id from cms_schools s
  where s.organisation_id in (select cms_org_admin_org_ids())
$$;

-- Schools the caller can see at all: any school membership, plus the org
-- layer's schools.
create or replace function cms_member_school_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select cms_org_school_ids()
  union
  select distinct m.school_id from cms_memberships m
  where m.user_id = cms_current_user_id() and m.is_active and m.school_id is not null
$$;

-- Schools the caller ADMINISTERS. school_admin ONLY — this is the authority
-- over CHILD DATA, and the org layer deliberately does not hold it.
create or replace function cms_admin_school_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct m.school_id from cms_memberships m
  where m.user_id = cms_current_user_id() and m.is_active
    and m.role = 'school_admin' and m.school_id is not null
$$;

-- Schools whose STRUCTURE (rooms, staff memberships, school record) the caller
-- may edit: their own as school_admin, or any in an org they direct. Structure
-- is not child data — an org director opening a new room is normal; an org
-- director editing a child's allergy is not.
create or replace function cms_structural_school_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select cms_admin_school_ids()
  union
  select cms_org_school_ids()
$$;

-- Rooms the caller teaches. A teacher membership with no cms_class_teachers row
-- yields nothing — deliberately: an unassigned teacher sees no children.
create or replace function cms_teacher_class_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct ct.class_group_id
  from cms_class_teachers ct
  join cms_memberships m on m.id = ct.membership_id
  where m.user_id = cms_current_user_id() and m.is_active and m.role = 'teacher'
$$;

-- The caller's own guardian rows (a parent may hold one per school).
create or replace function cms_guardian_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct m.guardian_id from cms_memberships m
  where m.user_id = cms_current_user_id() and m.is_active
    and m.role = 'parent' and m.guardian_id is not null
$$;

-- Schools where the caller holds a PARENT membership. The insert scope for a
-- family creating a child during enrolment.
create or replace function cms_parent_school_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct m.school_id from cms_memberships m
  where m.user_id = cms_current_user_id() and m.is_active
    and m.role = 'parent' and m.school_id is not null
$$;

-- Children the caller CREATED. The bootstrap key: between the INSERT of a child
-- and the INSERT of the guardian link there is a moment when the row belongs to
-- nobody, and without this a second parent at the same school could claim it.
-- The RLS test does exactly that ("parent B CANNOT attach themselves as a
-- guardian of parent A's child") and it failed until this existed.
create or replace function cms_own_created_child_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id from cms_children c
  where c.created_by_user_id = cms_current_user_id()
$$;

-- Children the caller guards.
create or replace function cms_parent_child_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct cg.child_id from cms_child_guardians cg
  where cg.guardian_id in (select cms_guardian_ids())
$$;

-- Children in the caller's rooms.
create or replace function cms_teacher_child_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id from cms_children c
  where c.class_group_id in (select cms_teacher_class_ids())
    and c.deleted_at is null
$$;

-- Every child the caller may READ, whatever the reason. The single predicate
-- behind every child-scoped read policy, so "who can see this child" has ONE
-- definition and cannot drift table to table.
create or replace function cms_readable_child_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select cms_parent_child_ids()
  union
  select cms_teacher_child_ids()
  union
  select c.id from cms_children c where c.school_id in (select cms_admin_school_ids())
$$;

-- Every child the caller may WRITE: their own (parent) or their school's
-- (admin). Teachers never write a child's standing record — they write
-- attendance, which has its own policy.
create or replace function cms_writable_child_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select cms_parent_child_ids()
  union
  select c.id from cms_children c where c.school_id in (select cms_admin_school_ids())
$$;

-- Helpers are called BY policies, which run as the querying role. authenticated
-- must be able to execute them; nothing else needs to.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function
      cms_current_user_id(), cms_member_org_ids(), cms_org_admin_org_ids(),
      cms_org_school_ids(), cms_member_school_ids(), cms_admin_school_ids(),
      cms_structural_school_ids(), cms_teacher_class_ids(), cms_guardian_ids(),
      cms_parent_school_ids(), cms_own_created_child_ids(), cms_parent_child_ids(),
      cms_teacher_child_ids(), cms_readable_child_ids(), cms_writable_child_ids()
      to authenticated';
  end if;
end $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Enabling RLS with zero policies is deny-all for anon/authenticated. Every
-- policy below is `TO authenticated` — never bare, never PUBLIC (migration 313).
-- The service role bypasses RLS in Supabase; the explicit `TO service_role`
-- policies exist so the same file behaves identically on a plain Postgres where
-- the role may not carry BYPASSRLS.

alter table cms_users                 enable row level security;
alter table cms_organisations         enable row level security;
alter table cms_schools               enable row level security;
alter table cms_class_groups          enable row level security;
alter table cms_memberships           enable row level security;
alter table cms_class_teachers        enable row level security;
alter table cms_guardians             enable row level security;
alter table cms_children              enable row level security;
alter table cms_child_guardians       enable row level security;
alter table cms_allergies             enable row level security;
alter table cms_dietary_requirements  enable row level security;
alter table cms_medical_records       enable row level security;
alter table cms_enrollments           enable row level security;
alter table cms_consents              enable row level security;
alter table cms_pickup_authorizations enable row level security;
alter table cms_attendance            enable row level security;
alter table cms_rate_limit_logs       enable row level security;

-- ── service role: full access on everything ─────────────────────────────────
do $$
declare
  t text;
begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    return;
  end if;
  foreach t in array array[
    'cms_users','cms_organisations','cms_schools','cms_class_groups',
    'cms_memberships','cms_class_teachers','cms_guardians','cms_children',
    'cms_child_guardians','cms_allergies','cms_dietary_requirements',
    'cms_medical_records','cms_enrollments','cms_consents',
    'cms_pickup_authorizations','cms_attendance','cms_rate_limit_logs'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_service', t);
    execute format(
      'create policy %I on %I for all to service_role using (true) with check (true)',
      t || '_service', t);
  end loop;
end $$;

-- ── cms_users ───────────────────────────────────────────────────────────────
-- A user may read and update ONLY their own row. password_hash is never
-- selected by client code; it is read server-side through the service role.
-- Nobody signs themselves up through the anon key: signup goes through the
-- server action, which holds the service role.
drop policy if exists cms_users_self_read on cms_users;
create policy cms_users_self_read on cms_users
  for select to authenticated
  using (id = cms_current_user_id());

drop policy if exists cms_users_self_update on cms_users;
create policy cms_users_self_update on cms_users
  for update to authenticated
  using (id = cms_current_user_id())
  with check (id = cms_current_user_id());

-- ── cms_organisations ───────────────────────────────────────────────────────
drop policy if exists cms_organisations_member_read on cms_organisations;
create policy cms_organisations_member_read on cms_organisations
  for select to authenticated
  using (id in (select cms_member_org_ids()));

drop policy if exists cms_organisations_admin_write on cms_organisations;
create policy cms_organisations_admin_write on cms_organisations
  for update to authenticated
  using (id in (select cms_org_admin_org_ids()))
  with check (id in (select cms_org_admin_org_ids()));

-- ── cms_schools ─────────────────────────────────────────────────────────────
drop policy if exists cms_schools_member_read on cms_schools;
create policy cms_schools_member_read on cms_schools
  for select to authenticated
  using (id in (select cms_member_school_ids()));

drop policy if exists cms_schools_admin_write on cms_schools;
create policy cms_schools_admin_write on cms_schools
  for update to authenticated
  using (id in (select cms_structural_school_ids()))
  with check (id in (select cms_structural_school_ids()));

-- ── cms_class_groups ────────────────────────────────────────────────────────
drop policy if exists cms_class_groups_member_read on cms_class_groups;
create policy cms_class_groups_member_read on cms_class_groups
  for select to authenticated
  using (school_id in (select cms_member_school_ids()));

drop policy if exists cms_class_groups_admin_write on cms_class_groups;
create policy cms_class_groups_admin_write on cms_class_groups
  for all to authenticated
  using (school_id in (select cms_structural_school_ids()))
  with check (school_id in (select cms_structural_school_ids()));

-- ── cms_memberships ─────────────────────────────────────────────────────────
-- Own rows always; a school's rows to its admins. Writes are admin-only, and
-- the WITH CHECK is on the TARGET school — that is what makes self-elevation
-- impossible: a parent cannot insert themselves a teacher row, because they
-- administer no school.
drop policy if exists cms_memberships_self_read on cms_memberships;
create policy cms_memberships_self_read on cms_memberships
  for select to authenticated
  using (
    user_id = cms_current_user_id()
    or school_id in (select cms_admin_school_ids())
    or organisation_id in (select cms_org_admin_org_ids())
  );

drop policy if exists cms_memberships_admin_write on cms_memberships;
create policy cms_memberships_admin_write on cms_memberships
  for all to authenticated
  using (
    school_id in (select cms_structural_school_ids())
    or organisation_id in (select cms_org_admin_org_ids())
  )
  with check (
    school_id in (select cms_structural_school_ids())
    or organisation_id in (select cms_org_admin_org_ids())
  );

-- ── cms_class_teachers ──────────────────────────────────────────────────────
drop policy if exists cms_class_teachers_read on cms_class_teachers;
create policy cms_class_teachers_read on cms_class_teachers
  for select to authenticated
  using (
    class_group_id in (select cms_teacher_class_ids())
    or class_group_id in (
      select cg.id from cms_class_groups cg
      where cg.school_id in (select cms_member_school_ids())
    )
  );

drop policy if exists cms_class_teachers_admin_write on cms_class_teachers;
create policy cms_class_teachers_admin_write on cms_class_teachers
  for all to authenticated
  using (class_group_id in (
    select cg.id from cms_class_groups cg
    where cg.school_id in (select cms_structural_school_ids())))
  with check (class_group_id in (
    select cg.id from cms_class_groups cg
    where cg.school_id in (select cms_structural_school_ids())));

-- ── cms_guardians ───────────────────────────────────────────────────────────
-- A parent reads their own guardian row and the co-guardians of their own
-- children (the family needs to see who else may collect). A teacher reads the
-- guardians of children in their room — that IS the pickup sheet. Admins read
-- their school.
drop policy if exists cms_guardians_read on cms_guardians;
create policy cms_guardians_read on cms_guardians
  for select to authenticated
  using (
    id in (select cms_guardian_ids())
    or id in (
      select cg.guardian_id from cms_child_guardians cg
      where cg.child_id in (select cms_readable_child_ids())
    )
    or school_id in (select cms_admin_school_ids())
  );

drop policy if exists cms_guardians_parent_insert on cms_guardians;
create policy cms_guardians_parent_insert on cms_guardians
  for insert to authenticated
  with check (
    school_id in (select cms_parent_school_ids())
    or school_id in (select cms_admin_school_ids())
  );

drop policy if exists cms_guardians_write on cms_guardians;
create policy cms_guardians_write on cms_guardians
  for update to authenticated
  using (
    id in (select cms_guardian_ids())
    or id in (
      select cg.guardian_id from cms_child_guardians cg
      where cg.child_id in (select cms_parent_child_ids())
    )
    or school_id in (select cms_admin_school_ids())
  )
  with check (
    id in (select cms_guardian_ids())
    or id in (
      select cg.guardian_id from cms_child_guardians cg
      where cg.child_id in (select cms_parent_child_ids())
    )
    or school_id in (select cms_admin_school_ids())
  );

-- ── cms_children ────────────────────────────────────────────────────────────
drop policy if exists cms_children_read on cms_children;
create policy cms_children_read on cms_children
  for select to authenticated
  using (
    id in (select cms_readable_child_ids())
    -- Org read-only across the group's schools (the aggregate view).
    or school_id in (select cms_org_school_ids())
  );

-- A family creates the child; the guardian link created immediately after is
-- what keeps it theirs. Insert scope is the school they are a parent at, so a
-- parent at school A can never create a row inside school B.
drop policy if exists cms_children_parent_insert on cms_children;
create policy cms_children_parent_insert on cms_children
  for insert to authenticated
  with check (
    (
      school_id in (select cms_parent_school_ids())
      -- A family may only ever stamp ITSELF as the creator. This column is what
      -- the guardian-link policy trusts one statement later.
      and created_by_user_id = cms_current_user_id()
    )
    or school_id in (select cms_admin_school_ids())
  );

drop policy if exists cms_children_write on cms_children;
create policy cms_children_write on cms_children
  for update to authenticated
  using (id in (select cms_writable_child_ids()))
  with check (id in (select cms_writable_child_ids()));

drop policy if exists cms_children_admin_delete on cms_children;
create policy cms_children_admin_delete on cms_children
  for delete to authenticated
  using (school_id in (select cms_admin_school_ids()));

-- ── cms_child_guardians ─────────────────────────────────────────────────────
-- The bootstrap rule: a parent may only ever link a child to THEIR OWN guardian
-- row. That is why a freshly-inserted child becomes theirs and nobody else's.
drop policy if exists cms_child_guardians_read on cms_child_guardians;
create policy cms_child_guardians_read on cms_child_guardians
  for select to authenticated
  using (child_id in (select cms_readable_child_ids()));

drop policy if exists cms_child_guardians_write on cms_child_guardians;
-- 🚨 THE CLAIM RULE. A parent may write a link only for a child that is ALREADY
-- theirs (adding a co-guardian), or for a child THEY THEMSELVES just created
-- (the enrolment bootstrap). "Any child, as long as the guardian_id is mine"
-- was the first draft of this policy and it let any parent at the school attach
-- themselves to any other family's child — caught by scripts/cms/rls-test.mjs,
-- not by review. Do not loosen it back.
create policy cms_child_guardians_write on cms_child_guardians
  for all to authenticated
  using (
    child_id in (select cms_parent_child_ids())
    or child_id in (
      select c.id from cms_children c where c.school_id in (select cms_admin_school_ids())
    )
  )
  with check (
    (
      guardian_id in (select cms_guardian_ids())
      and (
        child_id in (select cms_parent_child_ids())
        or child_id in (select cms_own_created_child_ids())
      )
    )
    or child_id in (
      select c.id from cms_children c where c.school_id in (select cms_admin_school_ids())
    )
  );

-- ── cms_allergies ───────────────────────────────────────────────────────────
-- SAFETY EXCEPTION, stated in the phase-1 draft and kept: a teacher of the
-- child's room always READS allergies, even where other medical detail is
-- office-only. A child who cannot breathe does not wait for a permission model.
drop policy if exists cms_allergies_read on cms_allergies;
create policy cms_allergies_read on cms_allergies
  for select to authenticated
  using (
    child_id in (select cms_readable_child_ids())
    or school_id in (select cms_org_school_ids())
  );

drop policy if exists cms_allergies_write on cms_allergies;
create policy cms_allergies_write on cms_allergies
  for all to authenticated
  using (child_id in (select cms_writable_child_ids()))
  with check (child_id in (select cms_writable_child_ids()));

-- ── cms_dietary_requirements ────────────────────────────────────────────────
drop policy if exists cms_dietary_read on cms_dietary_requirements;
create policy cms_dietary_read on cms_dietary_requirements
  for select to authenticated
  using (child_id in (select cms_readable_child_ids()));

drop policy if exists cms_dietary_write on cms_dietary_requirements;
create policy cms_dietary_write on cms_dietary_requirements
  for all to authenticated
  using (child_id in (select cms_writable_child_ids()))
  with check (child_id in (select cms_writable_child_ids()));

-- ── cms_medical_records ─────────────────────────────────────────────────────
-- Teacher READ-ONLY (their room only); parent and school admin read/write.
-- Never readable at the org layer — the org sees counts, not conditions.
drop policy if exists cms_medical_read on cms_medical_records;
create policy cms_medical_read on cms_medical_records
  for select to authenticated
  using (child_id in (select cms_readable_child_ids()));

drop policy if exists cms_medical_write on cms_medical_records;
create policy cms_medical_write on cms_medical_records
  for all to authenticated
  using (child_id in (select cms_writable_child_ids()))
  with check (child_id in (select cms_writable_child_ids()));

-- ── cms_enrollments ─────────────────────────────────────────────────────────
-- Teachers see no enrolments at all — an application is office business.
-- A parent's write access ENDS the moment status leaves 'draft': a submitted
-- form is evidence, and evidence does not get edited after the fact.
drop policy if exists cms_enrollments_read on cms_enrollments;
create policy cms_enrollments_read on cms_enrollments
  for select to authenticated
  using (
    child_id in (select cms_parent_child_ids())
    or school_id in (select cms_admin_school_ids())
    or school_id in (select cms_org_school_ids())
  );

drop policy if exists cms_enrollments_parent_insert on cms_enrollments;
create policy cms_enrollments_parent_insert on cms_enrollments
  for insert to authenticated
  with check (
    (child_id in (select cms_parent_child_ids()) and status = 'draft')
    or school_id in (select cms_admin_school_ids())
  );

drop policy if exists cms_enrollments_update on cms_enrollments;
create policy cms_enrollments_update on cms_enrollments
  for update to authenticated
  using (
    (child_id in (select cms_parent_child_ids()) and status = 'draft')
    or school_id in (select cms_admin_school_ids())
  )
  with check (
    (child_id in (select cms_parent_child_ids()) and status in ('draft', 'submitted'))
    or school_id in (select cms_admin_school_ids())
  );

-- ── cms_consents ────────────────────────────────────────────────────────────
drop policy if exists cms_consents_read on cms_consents;
create policy cms_consents_read on cms_consents
  for select to authenticated
  using (child_id in (select cms_readable_child_ids()));

drop policy if exists cms_consents_write on cms_consents;
create policy cms_consents_write on cms_consents
  for all to authenticated
  using (child_id in (select cms_writable_child_ids()))
  with check (child_id in (select cms_writable_child_ids()));

-- ── cms_pickup_authorizations ───────────────────────────────────────────────
drop policy if exists cms_pickup_read on cms_pickup_authorizations;
create policy cms_pickup_read on cms_pickup_authorizations
  for select to authenticated
  using (child_id in (select cms_readable_child_ids()));

drop policy if exists cms_pickup_write on cms_pickup_authorizations;
create policy cms_pickup_write on cms_pickup_authorizations
  for all to authenticated
  using (child_id in (select cms_writable_child_ids()))
  with check (child_id in (select cms_writable_child_ids()));

-- ── cms_attendance ──────────────────────────────────────────────────────────
-- The one table a teacher WRITES: their own room's register. Parents read their
-- own child's attendance and never write it.
drop policy if exists cms_attendance_read on cms_attendance;
create policy cms_attendance_read on cms_attendance
  for select to authenticated
  using (child_id in (select cms_readable_child_ids()));

drop policy if exists cms_attendance_staff_write on cms_attendance;
create policy cms_attendance_staff_write on cms_attendance
  for all to authenticated
  using (
    class_group_id in (select cms_teacher_class_ids())
    or school_id in (select cms_admin_school_ids())
  )
  with check (
    class_group_id in (select cms_teacher_class_ids())
    or school_id in (select cms_admin_school_ids())
  );

-- ── cms_rate_limit_logs ─────────────────────────────────────────────────────
-- No `authenticated` policy at all, on purpose: RLS enabled + zero policies =
-- deny-all for anon and authenticated. Only the service role touches this.

commit;

-- ============================================================================
-- VERIFY (run separately; expect 17 rows, rls_enabled = true, policy_count > 0
-- for every table except cms_rate_limit_logs, which is deliberately 0 + the
-- service policy)
-- ============================================================================
-- SELECT c.relname AS table_name,
--        c.relrowsecurity AS rls_enabled,
--        COUNT(p.polname) AS policy_count
-- FROM pg_class c
-- LEFT JOIN pg_policy p ON p.polrelid = c.oid
-- JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
-- WHERE c.relname LIKE 'cms\_%' AND c.relkind = 'r'
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relname;
