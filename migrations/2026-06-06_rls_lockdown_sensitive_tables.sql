-- ============================================================================
-- 2026-06-06  RLS LOCKDOWN — deny direct client access to sensitive tenant data
-- ============================================================================
--
-- WHY: A probe (scripts/probe-rls.mjs) proved the PUBLIC anon key — shipped in
-- the browser bundle, trivially extractable — can read straight from Supabase's
-- REST API, bypassing the app entirely:
--     montree_children   57 rows      montree_media     842 rows
--     montree_parents     3 rows      montree_schools    13 rows
--     montree_classrooms 19 rows
--
-- WHY THIS IS SAFE TO APPLY:
--   * The app reads these tables ONLY server-side via the SERVICE-ROLE key,
--     which has the BYPASSRLS attribute — it ignores RLS entirely. So enabling
--     RLS does NOT affect any app functionality.
--   * Verified 2026-06-06: the only browser (anon-key) table read in the whole
--     codebase is `activities` (curriculum) — NEVER these tables.
--   * This app uses its OWN JWT (MONTREE_JWT), not Supabase Auth, so auth.uid()
--     policies would be blind. Correct model = DEFAULT-DENY for anon/authenticated,
--     service-role keeps full access. Tenant scoping stays in app code (audited OK).
--
-- EFFECT: anon + authenticated roles get ZERO access to these tables. Service
-- role unaffected. The REST leak closes.
--
-- ROLLBACK: migrations/2026-06-06_rls_lockdown_sensitive_tables_ROLLBACK.sql
-- VERIFY:   node scripts/probe-rls.mjs   (expect all ✅ after applying)
-- ============================================================================

DO $$
DECLARE
  t    text;
  pol  record;
  tables text[] := ARRAY[
    'montree_children',
    'montree_parents',
    'montree_media',
    'montree_parent_meetings',
    'montree_parent_profiles',
    'montree_schools',
    'montree_classrooms'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- 1. Drop ANY existing policies (some may be permissive USING(true),
    --    which is how anon is currently reading these).
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- 2. Enable RLS. With no policies present, anon + authenticated are denied
    --    by default; service_role (BYPASSRLS) keeps full access.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    RAISE NOTICE 'RLS locked: %', t;
  END LOOP;
END $$;
