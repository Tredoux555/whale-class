-- migrations/350_rls_lockdown_pii.sql
--
-- CRITICAL — closes a full public read/write hole on every child, parent and
-- teacher record in the product.
--
-- ── What is wrong ────────────────────────────────────────────────────────────
-- supabase/migrations/096_rls_policies.sql turned RLS ON for seven tables and
-- then, on each one, created a policy shaped:
--
--     CREATE POLICY "children_service_role" ON montree_children
--       FOR ALL USING (true) WITH CHECK (true);
--
-- The intent (per that file's own footer) was "service role only". That is NOT
-- what the SQL says. A policy with no TO clause is granted to PUBLIC, which
-- includes the `anon` and `authenticated` roles. USING (true) means every row
-- is visible; WITH CHECK (true) means every INSERT/UPDATE is allowed. RLS is
-- enabled and then immediately waived for everyone.
--
-- The service role never needed a policy in the first place: it holds BYPASSRLS
-- and is unaffected by anything in this file. The policies only ever granted
-- access to the public web.
--
-- ── Why it is reachable ──────────────────────────────────────────────────────
-- NEXT_PUBLIC_SUPABASE_ANON_KEY is compiled into the browser bundle (it is
-- referenced from lib/hooks/useStudentProgressRealtime.ts and lib/supabase-client.ts,
-- and NEXT_PUBLIC_* is inlined by Next.js at build time). Anyone can read it out
-- of montree.xyz's JavaScript and then call PostgREST directly:
--
--     curl 'https://<project>.supabase.co/rest/v1/montree_children?select=*' \
--          -H 'apikey: <anon key from the JS bundle>'
--
-- That returns every child in every school. The same key can UPDATE and DELETE.
--
-- ── What this migration does ─────────────────────────────────────────────────
-- Drops the seven permissive policies and leaves the tables with RLS ENABLED and
-- NO policies at all. In PostgreSQL, RLS enabled + zero policies = deny all rows
-- to every non-BYPASSRLS role. It also REVOKEs table privileges from anon and
-- authenticated so that a future accidental policy cannot re-open the hole on
-- its own.
--
-- ── Blast radius: none ───────────────────────────────────────────────────────
-- Every application read/write of these tables goes through our own API routes,
-- which use the SERVICE ROLE key (lib/supabase-client.ts getSupabase()). The
-- service role bypasses RLS, so it is untouched. There is no client-side
-- Supabase query against any of these seven tables anywhere in the codebase
-- (verified by grep across app/ and components/). The one client-side realtime
-- hook subscribes to `child_work_completion`, which is not in this list and is
-- not modified here.
--
-- Idempotent. Safe to run more than once.


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 1 — DRY RUN.  Run this SELECT **first**, on its own, and read the result.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- It lists the offending policies. Expect roughly seven rows, each with
-- roles = {public} and qual = true. Those are exactly the rows STEP 2 removes.
--
-- If this returns ZERO rows, the hole is already closed and you can stop here.
-- If it returns policies you do NOT recognise, stop and ask before running STEP 2.

SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual        AS using_expression,
  with_check  AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'montree_schools',
    'montree_classrooms',
    'montree_teachers',
    'montree_children',
    'montree_parents',
    'montree_parent_children',
    'montree_parent_invites'
  )
ORDER BY tablename, policyname;


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 2 — THE FIX.  Run this only after STEP 1's dry run looks as described.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 2a. Drop the permissive policies from 096_rls_policies.sql ───────────────
DROP POLICY IF EXISTS "schools_service_role"         ON montree_schools;
DROP POLICY IF EXISTS "classrooms_service_role"      ON montree_classrooms;
DROP POLICY IF EXISTS "teachers_service_role"        ON montree_teachers;
DROP POLICY IF EXISTS "children_service_role"        ON montree_children;
DROP POLICY IF EXISTS "parents_service_role"         ON montree_parents;
DROP POLICY IF EXISTS "parent_children_service_role" ON montree_parent_children;
DROP POLICY IF EXISTS "invites_service_role"         ON montree_parent_invites;

-- Also drop the older names 096 itself dropped, in case an environment still
-- carries them from an even earlier run.
DROP POLICY IF EXISTS "schools_all"         ON montree_schools;
DROP POLICY IF EXISTS "classrooms_all"      ON montree_classrooms;
DROP POLICY IF EXISTS "teachers_all"        ON montree_teachers;
DROP POLICY IF EXISTS "children_all"        ON montree_children;
DROP POLICY IF EXISTS "parents_all"         ON montree_parents;
DROP POLICY IF EXISTS "parent_children_all" ON montree_parent_children;
DROP POLICY IF EXISTS "invites_all"         ON montree_parent_invites;

-- ── 2b. Re-assert that RLS is ON (deny-all now that no policy remains) ───────
-- Deliberately NOT "FORCE ROW LEVEL SECURITY": FORCE would also subject the
-- table OWNER (postgres) to these policies, which would break Supabase's own
-- dashboard and maintenance paths. Plain ENABLE is what we want — it applies to
-- anon/authenticated and is bypassed by the service role.
ALTER TABLE montree_schools         ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_classrooms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_teachers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_children        ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_parents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_parent_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_parent_invites  ENABLE ROW LEVEL SECURITY;

-- ── 2c. Belt and braces: take the grants away too ────────────────────────────
-- RLS with no policies is already deny-all. Revoking the underlying privileges
-- means that if someone later adds a well-meaning policy to one of these tables,
-- anon/authenticated STILL cannot reach it without a second, deliberate GRANT.
REVOKE ALL ON montree_schools         FROM anon, authenticated;
REVOKE ALL ON montree_classrooms      FROM anon, authenticated;
REVOKE ALL ON montree_teachers        FROM anon, authenticated;
REVOKE ALL ON montree_children        FROM anon, authenticated;
REVOKE ALL ON montree_parents         FROM anon, authenticated;
REVOKE ALL ON montree_parent_children FROM anon, authenticated;
REVOKE ALL ON montree_parent_invites  FROM anon, authenticated;

COMMIT;


-- ═════════════════════════════════════════════════════════════════════════════
-- STEP 3 — VERIFY.  Run this after STEP 2.
-- ═════════════════════════════════════════════════════════════════════════════
--
-- Expect: policy_count = 0 and rls_enabled = true on all seven rows.

SELECT
  c.relname                                   AS tablename,
  c.relrowsecurity                            AS rls_enabled,
  (SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = c.relname)            AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'montree_schools',
    'montree_classrooms',
    'montree_teachers',
    'montree_children',
    'montree_parents',
    'montree_parent_children',
    'montree_parent_invites'
  )
ORDER BY c.relname;
