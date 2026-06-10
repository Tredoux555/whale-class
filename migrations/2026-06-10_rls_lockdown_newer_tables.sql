-- ============================================================================
-- 2026-06-10  RLS LOCKDOWN — newer sensitive tables missed by the 2026-06-06 pass
-- ============================================================================
--
-- WHY: The 2026-06-06 lockdown enabled RLS on 7 tables. Three tables created
-- afterward (migrations 243/244/246) shipped with NO row-level security, so the
-- PUBLIC anon key in the browser bundle can read them straight from Supabase's
-- REST API — the same leak class the earlier migration closed:
--     montree_parent_deletion_audit   (243 — parent PII / deletion audit trail)
--     montree_child_learning_state    (244 — per-child learning data)
--     montree_principal_conversations (246 — principal ↔ Astra chat history)
--
-- WHY THIS IS SAFE TO APPLY (identical reasoning to 2026-06-06):
--   * The app reads these tables ONLY server-side via the SERVICE-ROLE key,
--     which has BYPASSRLS — it ignores RLS entirely. App behaviour is unchanged.
--   * This app uses its OWN JWT (MONTREE_JWT), not Supabase Auth, so auth.uid()
--     policies would be blind. Correct model = DEFAULT-DENY for anon/authenticated,
--     service-role keeps full access. Tenant scoping stays in app code.
--
-- EFFECT: anon + authenticated roles get ZERO access to these tables. Service
-- role unaffected. The REST leak closes.
--
-- VERIFY: extend scripts/probe-rls.mjs with these three table names; expect ✅.
-- ============================================================================

DO $$
DECLARE
  t    text;
  pol  record;
  tables text[] := ARRAY[
    'montree_parent_deletion_audit',
    'montree_child_learning_state',
    'montree_principal_conversations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Only operate on tables that actually exist (defensive — these migrations
    -- may not all be applied in every environment).
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- 1. Drop ANY existing policies (a permissive USING(true) policy would
      --    keep anon able to read).
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
    ELSE
      RAISE NOTICE 'Skipped (not present): %', t;
    END IF;
  END LOOP;
END $$;
