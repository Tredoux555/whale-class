-- ============================================================================
-- ROLLBACK for 2026-06-10_rls_lockdown_phase3_legacy_tables.sql
-- ============================================================================
-- Disables RLS on the phase-3 tables, restoring pre-lockdown behaviour
-- (anon/authenticated full access — INSECURE; only use if the lockdown broke
-- something unexpected, then re-investigate). The original permissive
-- policies are NOT recreated — with RLS disabled they are irrelevant.
-- ============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'montree_work_sessions','montree_teachers','montree_weekly_reports',
    'montree_report_media','montree_media_children','montree_parent_access',
    'montree_consent_log','montree_super_admin_audit','montree_voice_notes',
    'montree_weekly_admin_output','montree_student_aliases',
    'montree_custom_curriculum','montree_curriculum_imports','montree_work_imports',
    'montree_school_features','montree_classroom_features',
    'children','families','classroom_children','child_work_progress',
    'progress_history','teacher_classrooms','child_progress','work_progress',
    'child_badges','child_photos','child_work_photos','child_work_media',
    'classroom_photos','shared_photos','attendance','daily_reports',
    'weekly_plans','weekly_assignments','daily_activity_assignments',
    'parent_sessions','parent_access_codes','parent_phone_codes',
    'parent_children','parent_messages','parent_reports',
    'password_reset_requests','report_share_tokens','user_sessions','users',
    'simple_teachers','teacher_notes','lesson_documents','teacher_children',
    'role_permissions','permission_audit_log','activity_log',
    'school_english_works','child_english_progress','child_english_position',
    'weekly_english_log','english_weekly_log','english_progress',
    'raz_reading_records','assessment_sessions','assessment_results',
    'game_sessions','student_game_progress','letter_tracing_progress',
    'letter_sounds_progress','letter_match_progress','sentence_match_progress',
    'sentence_builder_progress','word_builder_progress',
    'voice_observation_sessions','voice_observation_extractions',
    'voice_observation_audio_chunks','voice_observation_student_aliases'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE 'RLS disabled: %', t;
    END IF;
  END LOOP;
END $$;
