-- Migration 276: Security hardening (WARN-level linter items). Safe bulk fixes.
-- These are hardening, NOT the urgent RLS-exposure (that's 275). RUN AFTER 275.
-- RUN: paste into Supabase -> SQL Editor -> Run. Transactional + idempotent.
--
-- Covers:
--   • function_search_path_mutable (~90 functions) -> pin search_path
--   • anon/authenticated_security_definer_function_executable (~40) -> revoke EXECUTE
--     from anon + authenticated. SAFE: every .rpc() call in the app is server-side via
--     the service-role client, which KEEPS execute (revoke doesn't touch service_role).
--
-- NOT done here (need case-by-case review — see chat): the "RLS policy always true"
-- permissive policies (esp. montree_billing_history, montree_report_tokens,
-- montree_parent_children/invites), public storage-bucket listing, moving the `vector`
-- extension out of public, and the Auth "leaked password protection" dashboard toggle.

BEGIN;

-- 1) Pin a safe search_path on EVERY function in public (no per-signature typing needed).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
  END LOOP;
END $$;

-- 2) Remove direct RPC execute from public API roles. Server (service_role) is unaffected.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
-- And for any functions created later:
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

COMMIT;
