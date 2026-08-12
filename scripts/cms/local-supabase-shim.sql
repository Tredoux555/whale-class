-- scripts/cms/local-supabase-shim.sql
-- ============================================================================
-- The minimum of Supabase that migrations/329_cms_phase2.sql needs in order to
-- be applied — and TESTED — against a plain local Postgres.
--
-- Run this FIRST, then the migration, then scripts/cms/rls-test.mjs.
--   createdb cms_test
--   psql -d cms_test -f scripts/cms/local-supabase-shim.sql
--   psql -d cms_test -v ON_ERROR_STOP=1 -f migrations/329_cms_phase2.sql
--   DATABASE_URL=postgres://.../cms_test node scripts/cms/rls-test.mjs
--
-- It creates the two roles PostgREST authenticates as and the auth.uid()
-- function, byte-for-byte in behaviour with Supabase's:
--
--   Supabase's definition (paraphrased from the platform's auth schema):
--     coalesce(
--       nullif(current_setting('request.jwt.claim.sub', true), ''),
--       (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
--     )::uuid
--
-- The migration itself does NOT call auth.uid() — cms_current_user_id() reads
-- the same claim inline so the schema is portable — but the shim defines it
-- anyway so the RLS test can assert the two agree. If they ever diverge, the
-- test fails and that is the point.
-- ============================================================================

create extension if not exists "pgcrypto";

create schema if not exists auth;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

-- The two roles every Supabase project has. `anon` is what the public key maps
-- to, `authenticated` what a signed-in JWT maps to. Neither may bypass RLS —
-- that is the whole point of the test.
do $$ begin
  create role anon nologin noinherit;
exception when duplicate_object then null; end $$;

do $$ begin
  create role authenticated nologin noinherit;
exception when duplicate_object then null; end $$;

-- service_role on Supabase carries BYPASSRLS. Reproduced so the "service role
-- sees everything" assertion means the same thing here as in production.
do $$ begin
  create role service_role nologin noinherit bypassrls;
exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

-- PostgREST grants table privileges separately from RLS; RLS only narrows what
-- a role already has. Without these grants every query fails on privilege
-- rather than on policy, which would make the test prove nothing.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
