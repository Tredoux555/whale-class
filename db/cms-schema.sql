-- ============================================================================
-- CMS — POSTGRES / SUPABASE SCHEMA (draft, phase 1)
-- ============================================================================
-- This file is the database half of lib/engine/types.ts. The two are ONE
-- artefact split across two languages: every table below has a TypeScript
-- interface, every interface has a table, and the field names line up in
-- snake_case ↔ camelCase. Change one, change the other in the same commit.
--
-- STATUS: draft. Not yet applied to any project. RLS policies are marked with
-- `-- RLS:` placeholders describing the rule in words; they become real
-- policies in phase 2, when auth is wired to Supabase.
--
-- CONVENTIONS
--   · uuid primary keys, generated server-side.
--   · timestamptz everywhere; dates that are genuinely dates use `date`.
--   · Tenancy is by organisation_id → school_id. EVERY tenant-scoped table
--     carries school_id even when it could be derived, so an RLS policy is one
--     join, never three. Montree's audit found derived tenancy to be the single
--     most common source of cross-tenant leaks.
--   · Deletions are soft where a record has legal weight (children, medical,
--     consents) — `deleted_at timestamptz`.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── organisational layer ────────────────────────────────────────────────────

create table if not exists cms_organisations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  country_code  text not null,
  default_locale text not null default 'en',
  created_at    timestamptz not null default now()
);
-- RLS: readable by any member of the organisation; writable by org_admin only.

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
create index if not exists idx_cms_schools_org on cms_schools(organisation_id);
-- RLS: readable by members of the school, or by org_admin of the parent org.

create table if not exists cms_class_groups (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references cms_schools(id) on delete cascade,
  name              text not null,
  age_min           numeric(3,1) not null,
  age_max           numeric(3,1) not null,
  capacity          integer not null default 0,
  lead_teacher_name text,
  created_at        timestamptz not null default now()
);
create index if not exists idx_cms_class_groups_school on cms_class_groups(school_id);
-- RLS: readable by school members; writable by school_admin+.

create type cms_membership_role as enum ('org_admin', 'school_admin', 'teacher', 'parent');

create table if not exists cms_memberships (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,                            -- auth.users.id once auth lands
  role            cms_membership_role not null,
  organisation_id uuid not null references cms_organisations(id) on delete cascade,
  school_id       uuid references cms_schools(id) on delete cascade,  -- null only for org_admin
  guardian_id     uuid,                            -- FK added after cms_guardians
  email           text not null,
  display_name    text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  check (role = 'org_admin' or school_id is not null)
);
create index if not exists idx_cms_memberships_user on cms_memberships(user_id);
create index if not exists idx_cms_memberships_school on cms_memberships(school_id);
-- RLS: a user may read their OWN memberships always; school_admin may read the
--      memberships of their school; org_admin may read all in the org.
--      Insert/update restricted to school_admin+ (never self-elevation).

-- ── people ──────────────────────────────────────────────────────────────────

create type cms_relationship as enum
  ('mother', 'father', 'aunt', 'uncle', 'grandparent', 'guardian', 'other');

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
  restriction_note text,             -- court order / no-contact. Blocks collection.
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index if not exists idx_cms_guardians_school on cms_guardians(school_id);
-- RLS: a parent may read ONLY guardian rows linked to their own children;
--      teachers may read guardians of children in their class groups.

alter table cms_memberships
  add constraint cms_memberships_guardian_fk
  foreign key (guardian_id) references cms_guardians(id) on delete set null;

create table if not exists cms_children (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references cms_schools(id) on delete cascade,
  class_group_id uuid references cms_class_groups(id) on delete set null,
  legal_name     text not null,
  preferred_name text not null,
  date_of_birth  date not null,
  home_language  text not null default 'en',
  photo_url      text,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists idx_cms_children_school on cms_children(school_id);
create index if not exists idx_cms_children_class on cms_children(class_group_id);
-- RLS: parent → only children they guard (via cms_child_guardians);
--      teacher → only children in their class group;
--      school_admin → their school; org_admin → their org.

-- Join table: which guardians belong to which child, and who may collect.
create table if not exists cms_child_guardians (
  child_id     uuid not null references cms_children(id) on delete cascade,
  guardian_id  uuid not null references cms_guardians(id) on delete cascade,
  is_primary   boolean not null default false,
  can_collect  boolean not null default true,
  primary key (child_id, guardian_id)
);
-- RLS: inherits the child's rule.

-- ── health & diet ───────────────────────────────────────────────────────────

create type cms_allergy_severity as enum ('mild', 'moderate', 'severe');

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
create index if not exists idx_cms_allergies_child on cms_allergies(child_id);
-- RLS: same as the child. NOTE: allergy rows are safety-critical — teachers of
--      the child's room must always be able to READ them, even when other
--      medical detail is restricted to the office.

create type cms_dietary_reason as enum
  ('allergy', 'medical', 'religious', 'cultural', 'preference');

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
create index if not exists idx_cms_dietary_child on cms_dietary_requirements(child_id);
-- RLS: same as the child; kitchen staff (a future role) get read-only.

create table if not exists cms_medical_records (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references cms_children(id) on delete cascade,
  school_id        uuid not null references cms_schools(id) on delete cascade,
  conditions       text[] not null default '{}',
  medications      jsonb not null default '[]'::jsonb,  -- Medication[] from types.ts
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
-- RLS: parent (own child) + school_admin read/write; teacher READ-ONLY and only
--      for children in their room. Never exposed to the org layer in raw form.

-- ── enrolment ───────────────────────────────────────────────────────────────

create type cms_enrollment_status as enum
  ('draft', 'submitted', 'in_review', 'accepted', 'waitlisted', 'declined', 'withdrawn');

create type cms_enrollment_step as enum
  ('child', 'medical', 'dietary', 'previous_school', 'contacts', 'consents');

create table if not exists cms_enrollments (
  id                        uuid primary key default gen_random_uuid(),
  child_id                  uuid not null references cms_children(id) on delete cascade,
  school_id                 uuid not null references cms_schools(id) on delete cascade,
  requested_class_group_id  uuid references cms_class_groups(id) on delete set null,
  status                    cms_enrollment_status not null default 'draft',
  completed_steps           cms_enrollment_step[] not null default '{}',
  requested_start_date      date,
  previous_school           jsonb,   -- PreviousSchool from types.ts
  settling_notes            text,
  submitted_at              timestamptz,
  decided_at                timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists idx_cms_enrollments_school_status
  on cms_enrollments(school_id, status);
-- RLS: parent may read/write their OWN draft; once status <> 'draft' the
--      parent's write access ends (submitted forms are immutable evidence).
--      school_admin reviews; teachers do not see enrolments at all.

create type cms_consent_kind as enum
  ('photography', 'outings', 'emergency_medical', 'data_processing', 'sunscreen');

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
-- RLS: parent read/write own child; staff read-only.
-- NOTE: lib/engine/photo-filter.ts treats a MISSING row as refusal. Do not
--       "helpfully" backfill this table with granted = true.

-- ── operations ──────────────────────────────────────────────────────────────

create type cms_attendance_state as enum ('expected', 'present', 'absent', 'collected');

create table if not exists cms_attendance (
  id                      uuid primary key default gen_random_uuid(),
  child_id                uuid not null references cms_children(id) on delete cascade,
  school_id               uuid not null references cms_schools(id) on delete cascade,
  class_group_id          uuid references cms_class_groups(id) on delete set null,
  on_date                 date not null,
  state                   cms_attendance_state not null default 'expected',
  arrived_at              time,
  absence_reason          text,
  collector_guardian_id   uuid references cms_guardians(id) on delete set null,
  collection_time         time,
  recorded_by_name        text,
  created_at              timestamptz not null default now(),
  unique (child_id, on_date)
);
create index if not exists idx_cms_attendance_class_date
  on cms_attendance(class_group_id, on_date);
-- RLS: teacher read/write for their room and today; parent read-only own child.

-- Rate limiting, reused verbatim from Montree's lib/rate-limiter.ts.
create table if not exists cms_rate_limit_logs (
  id         bigserial primary key,
  key        text not null,          -- client IP
  endpoint   text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_cms_rate_limit_lookup
  on cms_rate_limit_logs(key, endpoint, created_at desc);
-- RLS: service role only. Never exposed to the anon key.

-- ── enable RLS everywhere (policies land in phase 2) ────────────────────────
-- Enabling RLS with NO policy denies everything to the anon/authenticated
-- roles, which is the correct default: the app currently reaches the database
-- only through the service role in server code.
alter table cms_organisations        enable row level security;
alter table cms_schools              enable row level security;
alter table cms_class_groups         enable row level security;
alter table cms_memberships          enable row level security;
alter table cms_guardians            enable row level security;
alter table cms_children             enable row level security;
alter table cms_child_guardians      enable row level security;
alter table cms_allergies            enable row level security;
alter table cms_dietary_requirements enable row level security;
alter table cms_medical_records      enable row level security;
alter table cms_enrollments          enable row level security;
alter table cms_consents             enable row level security;
alter table cms_attendance           enable row level security;
alter table cms_rate_limit_logs      enable row level security;
