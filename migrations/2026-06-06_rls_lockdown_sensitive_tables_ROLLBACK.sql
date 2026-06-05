-- ============================================================================
-- ROLLBACK for 2026-06-06_rls_lockdown_sensitive_tables.sql
-- ============================================================================
-- Re-disables RLS on the locked tables, returning to the pre-2026-06-06 state.
--
-- ⚠️  WARNING: this RESTORES THE LEAK — anon will again be able to read these
-- tables directly. Use ONLY if the lockdown broke something and you need to
-- recover fast while investigating. Re-apply the lockdown ASAP after.
-- ============================================================================

DO $$
DECLARE
  t text;
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
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'RLS DISABLED (leak restored): %', t;
  END LOOP;
END $$;
