-- Migration 276 (corrected): Security hardening (WARN-level linter items). RUN AFTER 275.
-- Pins search_path + revokes RPC execute from anon/authenticated on functions WE own.
-- Skips extension-owned functions (e.g. pgvector's vector_*), which we cannot ALTER.
-- SAFE: every .rpc() call in the app is server-side via the service-role client, which keeps execute.
-- RUN: paste into Supabase -> SQL Editor -> Run. Transactional; per-function exception = skip, never abort.
--
-- NOT done here (need case-by-case review): "RLS policy always true" permissive policies
-- (esp. montree_billing_history, montree_report_tokens, montree_parent_children/invites),
-- public storage-bucket listing, moving `vector` out of public, Auth leaked-password toggle.

BEGIN;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proowner = (SELECT oid FROM pg_roles WHERE rolname = current_user)
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_temp;', r.proname, r.args);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, authenticated;', r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skipped %(%): %', r.proname, r.args, SQLERRM;
    END;
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

COMMIT;
