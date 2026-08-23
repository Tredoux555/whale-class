-- 337_evaluation_org_rls_lockdown.sql
-- Aug 23, 2026 — closes a LIVE anon-key CRUD hole on the Montree Milestones
-- (evaluation) and Organizations tables. Same failure mode as 313.
--
-- WHY (verified against production on 2026-08-23, using only the public
-- NEXT_PUBLIC_SUPABASE_ANON_KEY that ships in every browser bundle):
--
--   GET /rest/v1/montree_evaluation_item_responses     -> 200, 32 rows
--   GET /rest/v1/montree_evaluation_milestone_results  -> 200, 56 rows
--   GET /rest/v1/montree_evaluation_sessions           -> 200,  2 rows
--   GET /rest/v1/montree_evaluation_bank_versions      -> 200,  1 row
--   GET /rest/v1/montree_organizations                 -> 200,  3 rows
--   GET /rest/v1/montree_organization_admins           -> 200,  3 rows
--   GET /rest/v1/montree_org_invites                   -> 200,  8 rows
--
-- THIS IS NOT ONLY A READ LEAK. The policies are `FOR ALL … WITH CHECK (true)`,
-- so anon can INSERT too, and `hashInviteToken()` is an unsalted, unpeppered
-- SHA-256 (lib/montree/org/invite-tokens.ts:64). An anonymous caller can
-- therefore POST a row into montree_org_invites with
-- token_hash = sha256("<token they chose>"), invite_type = 'organization' and a
-- future expires_at, then walk /montree/org/join/<token> —
-- app/api/montree/org/invites/validate/route.ts looks the invite up by that hash
-- alone — and register themselves as an ORGANIZATION admin. They can equally
-- INSERT straight into montree_organization_admins, or DELETE a real child's
-- montree_evaluation_milestone_results. Treat this as an active escalation path,
-- not a metadata leak.
--
-- Every other core table (montree_children, montree_media, montree_parents,
-- montree_weekly_reports, montree_behavioral_observations, montree_child_progress,
-- montree_work_sessions, montree_observation_sessions, montree_period_reports,
-- voice_observation_sessions, …) correctly returns 0 rows to anon — RLS on,
-- zero policies. These six are the exception.
--
-- CAUSE: migrations 314 and 315 created their policies as
--
--   CREATE POLICY "Service role all on …" ON … FOR ALL USING (true) WITH CHECK (true);
--
-- Despite the name, there is NO `TO service_role` clause. A policy created
-- without `TO` defaults to role PUBLIC, which includes `anon`. Both migrations
-- landed AFTER the 275/276/277 lockdown pass, so the linter-driven sweep that
-- caught the older instances never saw them, and 313 only covered the two
-- curriculum tables. `FOR ALL` + `WITH CHECK (true)` means anon can INSERT,
-- UPDATE and DELETE these rows too, not merely read them — a stranger can
-- rewrite or wipe a real child's milestone assessment.
--
-- SAFETY: RLS is already ENABLED on all of these tables. Dropping the policies
-- leaves zero policies, i.e. deny-all for anon/authenticated. The service-role
-- key bypasses RLS entirely, and every application read/write to these tables
-- goes through getSupabase() (service role) — the evaluation routes all enter
-- via lib/montree/evaluation/route-helpers.ts `openRoute()`, and the org routes
-- via verifySchoolRequest/org auth, both server-side. No client-side or anon
-- query targets any of these tables anywhere in the codebase. The app is
-- unaffected. Idempotent; safe to re-run.

BEGIN;

-- ── Migration 314 — Montree Milestones (child assessment data) ──────────────
DROP POLICY IF EXISTS "Service role all on meval_bank_versions"    ON montree_evaluation_bank_versions;
DROP POLICY IF EXISTS "Service role all on meval_sessions"         ON montree_evaluation_sessions;
DROP POLICY IF EXISTS "Service role all on meval_item_responses"   ON montree_evaluation_item_responses;
DROP POLICY IF EXISTS "Service role all on meval_milestone_results" ON montree_evaluation_milestone_results;

ALTER TABLE montree_evaluation_bank_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_evaluation_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_evaluation_item_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_evaluation_milestone_results ENABLE ROW LEVEL SECURITY;

-- ── Migration 315 — Organizations ───────────────────────────────────────────
DROP POLICY IF EXISTS "Service role all on montree_organizations"       ON montree_organizations;
DROP POLICY IF EXISTS "Service role all on montree_organization_admins" ON montree_organization_admins;
DROP POLICY IF EXISTS "Service role all on montree_org_invites"         ON montree_org_invites;

ALTER TABLE montree_organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_organization_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_org_invites         ENABLE ROW LEVEL SECURITY;

COMMIT;

-- ── VERIFY (paste separately after the migration) ───────────────────────────
-- Expect rls_enabled = true and policy_count = 0 for all seven rows:
--
--   SELECT c.relname AS table_name,
--          c.relrowsecurity AS rls_enabled,
--          (SELECT count(*) FROM pg_policies p
--             WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policy_count
--     FROM pg_class c
--     JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'public'
--      AND c.relname IN ('montree_evaluation_bank_versions',
--                        'montree_evaluation_sessions',
--                        'montree_evaluation_item_responses',
--                        'montree_evaluation_milestone_results',
--                        'montree_organizations',
--                        'montree_organization_admins',
--                        'montree_org_invites')
--    ORDER BY c.relname;
--
-- Then re-run the anon probe — every one should come back with 0 rows:
--
--   curl -s -I -X HEAD \
--     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/montree_evaluation_milestone_results?select=*&limit=0" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--     -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--     -H "Prefer: count=exact" | grep -i content-range
--
-- ── FUTURE MIGRATIONS ───────────────────────────────────────────────────────
-- If a new table genuinely needs a policy, WRITE THE ROLE DOWN:
--     CREATE POLICY "…" ON … FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Better still: create no policy at all. RLS-enabled + zero policies is the
-- house posture (313/318/336) and the service-role key bypasses RLS anyway.
