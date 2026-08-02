-- 313_curriculum_rls_lockdown.sql
-- Aug 2, 2026 — closes an anon-key CRUD hole on the classroom curriculum tables.
--
-- WHY:
-- migrations/099_montree_classroom_curriculum_tables.sql created these two policies:
--
--   CREATE POLICY "Service role full access areas" ON montree_classroom_curriculum_areas FOR ALL USING (true);
--   CREATE POLICY "Service role full access works" ON montree_classroom_curriculum_works FOR ALL USING (true);
--
-- Despite the names, NEITHER has a `TO service_role` clause. In Postgres a policy
-- created without `TO` defaults to role PUBLIC — which includes `anon`, the role
-- every browser holds via NEXT_PUBLIC_SUPABASE_ANON_KEY. So anyone with the public
-- key could read, modify or delete EVERY classroom's curriculum in EVERY school
-- straight through PostgREST, bypassing all app-layer school scoping.
--
-- The June lockdown pass (275) only re-ran ALTER TABLE ... ENABLE ROW LEVEL SECURITY
-- on these tables (a no-op — 099 already enabled it) and 277_tighten_permissive_policies
-- did not include them in its drop list. This migration finishes that job.
--
-- SAFETY:
-- RLS is already ENABLED on both tables. Dropping these policies leaves zero
-- policies, i.e. deny-all for anon/authenticated. The service-role key bypasses
-- RLS entirely, and every application read/write to these tables goes through
-- getSupabase() (service role) — verified: no client-side/anon query targets
-- either table anywhere in the codebase. So the app is unaffected.
--
-- Idempotent. Safe to re-run.

BEGIN;

DROP POLICY IF EXISTS "Service role full access areas" ON montree_classroom_curriculum_areas;
DROP POLICY IF EXISTS "Service role full access works" ON montree_classroom_curriculum_works;

-- Belt and braces: RLS must be on for the deny-all to mean anything.
ALTER TABLE montree_classroom_curriculum_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_classroom_curriculum_works ENABLE ROW LEVEL SECURITY;

COMMIT;

-- VERIFY (expect: rls_enabled = true and policy_count = 0 for both rows)
-- SELECT c.relname            AS table_name,
--        c.relrowsecurity     AS rls_enabled,
--        COUNT(p.polname)     AS policy_count
-- FROM pg_class c
-- LEFT JOIN pg_policy p ON p.polrelid = c.oid
-- WHERE c.relname IN ('montree_classroom_curriculum_areas','montree_classroom_curriculum_works')
-- GROUP BY c.relname, c.relrowsecurity;
