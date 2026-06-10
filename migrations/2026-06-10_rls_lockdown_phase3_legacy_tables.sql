-- ============================================================================
-- 2026-06-10  RLS LOCKDOWN PHASE 3 — legacy tables with permissive policies
-- ============================================================================
--
-- WHY: Phases 1 (2026-06-06, 7 tables) and 2 (2026-06-10, 3 tables) closed the
-- anon-REST leak on the headline tenant tables. This pass closes the REST of
-- the gap: ~50 older tables created with `USING (true)` / `WITH CHECK (true)`
-- policies (e.g. migration 060 montree_work_sessions, 003 child_work_progress,
-- 023 simple_teachers, 035 game_sessions, 040 children). Anyone holding the
-- PUBLIC anon key can currently read — and in several cases WRITE — these
-- tables straight through Supabase's REST API, including child progress data,
-- teacher rows with password hashes, parent session/access codes, and report
-- share tokens.
--
-- WHY THIS IS SAFE TO APPLY (same reasoning as phases 1 + 2):
--   * The app reads/writes these tables ONLY server-side via the SERVICE-ROLE
--     key, which has BYPASSRLS. App behaviour is unchanged.
--   * Verified anon-key consumers in the codebase (Jun 10 audit):
--       - app/admin/english-curriculum/page.tsx reads `activities`
--       - lib/hooks/useStudentProgressRealtime.ts subscribes to
--         `child_work_completion` realtime changes
--     Both tables are therefore EXCLUDED from this lockdown.
--   * Non-sensitive content tables (curriculum catalogs, skills, songs,
--     video caches, phonics word banks, feature definitions) are left alone.
--
-- EFFECT: anon + authenticated roles get ZERO access to the tables below.
-- Service role unaffected. Idempotent — skips tables that don't exist.
--
-- VERIFY: node scripts/probe-rls.mjs  (SENSITIVE list extended in same commit)
-- ROLLBACK: 2026-06-10_rls_lockdown_phase3_legacy_tables_ROLLBACK.sql
-- ============================================================================

DO $$
DECLARE
  t    text;
  pol  record;
  tables text[] := ARRAY[
    -- Montree multi-tenant child/teacher data
    'montree_work_sessions',          -- 060: USING(true) SELECT + INSERT (verified)
    'montree_teachers',               -- password hashes + agent login hashes
    'montree_weekly_reports',
    'montree_report_media',
    'montree_media_children',
    'montree_parent_access',
    'montree_consent_log',
    'montree_super_admin_audit',
    'montree_voice_notes',
    'montree_weekly_admin_output',
    'montree_student_aliases',
    'montree_custom_curriculum',
    'montree_curriculum_imports',
    'montree_work_imports',
    'montree_school_features',        -- reveals per-school feature/AI-tier state
    'montree_classroom_features',

    -- Legacy Whale-Class child data (pre-Montree tables)
    'children',                       -- 040: "Allow all on children" FOR ALL
    'families',
    'classroom_children',
    'child_work_progress',            -- 003
    'progress_history',               -- 003
    'teacher_classrooms',             -- 003
    'child_progress',
    'work_progress',
    'child_badges',
    'child_photos',
    'child_work_photos',
    'child_work_media',
    'classroom_photos',
    'shared_photos',
    'attendance',
    'daily_reports',
    'weekly_plans',
    'weekly_assignments',
    'daily_activity_assignments',

    -- Auth / session / token tables (highest write-risk)
    'parent_sessions',
    'parent_access_codes',
    'parent_phone_codes',
    'parent_children',
    'parent_messages',
    'parent_reports',
    'password_reset_requests',
    'report_share_tokens',
    'user_sessions',
    'users',
    'simple_teachers',                -- 023
    'teacher_notes',                  -- 023
    'lesson_documents',               -- 023
    'teacher_children',
    'role_permissions',               -- RBAC deprecated; page short-circuits
    'permission_audit_log',
    'activity_log',

    -- English / reading / assessment child data
    'school_english_works',           -- 036
    'child_english_progress',         -- 036
    'child_english_position',
    'weekly_english_log',             -- 036
    'english_weekly_log',
    'english_progress',
    'raz_reading_records',
    'assessment_sessions',            -- 034
    'assessment_results',             -- 034

    -- Game progress (per-child data, written via service-role API routes)
    'game_sessions',                  -- 035
    'student_game_progress',          -- 035
    'letter_tracing_progress',
    'letter_sounds_progress',
    'letter_match_progress',
    'sentence_match_progress',
    'sentence_builder_progress',
    'word_builder_progress',

    -- Voice observation pipeline (transcripts = sensitive)
    'voice_observation_sessions',
    'voice_observation_extractions',
    'voice_observation_audio_chunks',
    'voice_observation_student_aliases'
    -- EXCLUDED on purpose:
    --   activities             (read by anon client in english-curriculum admin page)
    --   child_work_completion  (anon realtime subscription in useStudentProgressRealtime)
    --   curriculum catalogs / skills / songs / phonics banks / feature_definitions
    --   montree_work_translations (public curriculum content)
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      -- 1. Drop ANY existing policies (permissive USING(true) policies would
      --    keep anon able to read/write).
      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;

      -- 2. Enable RLS. No policies = default-deny for anon + authenticated;
      --    service_role (BYPASSRLS) keeps full access.
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      RAISE NOTICE 'RLS locked: %', t;
    ELSE
      RAISE NOTICE 'Skipped (not present): %', t;
    END IF;
  END LOOP;
END $$;
