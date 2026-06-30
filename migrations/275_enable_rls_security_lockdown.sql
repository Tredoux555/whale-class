-- Migration 275: Security lockdown — enable RLS on public tables exposed via PostgREST.
-- WHY: the anon key ships to the browser; with RLS off, these tables are readable via the
--      Supabase REST API by anyone with that key. The app reads/writes server-side with the
--      SERVICE-ROLE key, which BYPASSES RLS — so enabling RLS (deny-by-default) closes the
--      hole WITHOUT breaking server access. Generated 2026-06-30 from the DB linter.
-- RUN: paste into Supabase -> SQL Editor -> Run. Idempotent + transactional (all-or-nothing).
-- IF EXISTS guards every statement so a stale name can never abort the run.

BEGIN;

-- SECTION A — server-only tables: enable RLS (deny-all to anon; service role unaffected)
ALTER TABLE IF EXISTS public.montree_school_curriculum_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_onboarding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_onboarding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mission_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_admin_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mission_wins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mission_weekly_calibrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mission_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_school_curriculum_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_classroom_curriculum_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.curriculum_roadmap_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.child_curriculum_position_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.child_work_completion_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.curriculum_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vault_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vault_unlock_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_to_curriculum_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vault_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_online_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_name_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_child_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_work_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.school_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.school_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_message_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_dm ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_community_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_community_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teacher_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_shared_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_child_mental_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_behavioral_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_child_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_guru_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_rate_limit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_child_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_post_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_guru_brain ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_homeschool_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_photo_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_photo_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_attendance_override ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_child_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_teacher_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_weekly_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_pulse_lock ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_conference_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_conference_note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_stale_work_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_weekly_pulse_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_global_works_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_paperwork_week_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_daily_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_agent_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_english_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_teacher_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_curriculum_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_appointment_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_classroom_curriculum_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_agent_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_message_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_message_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_message_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_agent_mira_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_principal_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_principal_agent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_perf_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_recurring_op_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_webhook_deadletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_period_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_server_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_xero_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_pipeline_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_availability_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_appointment_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_outreach_log_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_school_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_school_event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_child_english_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_principal_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_school_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_meeting_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_parent_meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_parent_meeting_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_tracy_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_finance_transactions ENABLE ROW LEVEL SECURITY;

-- SECTION B — tables with EXISTING policies (enabling RLS ACTIVATES them).
--   child_work_completion is also read LIVE from the browser by useStudentProgressRealtime.
--   AFTER RUN: confirm the live student-progress view still updates; if not, its parent/teacher
--   policies don't match the browser's auth — add a scoped policy or move that feed server-side.
ALTER TABLE IF EXISTS public.child_curriculum_position ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.child_work_completion ENABLE ROW LEVEL SECURITY;

-- SECTION C — SECURITY DEFINER views -> run with the querying user's perms (Postgres 15+)
ALTER VIEW IF EXISTS public.child_curriculum_progress SET (security_invoker = on);
ALTER VIEW IF EXISTS public.montree_attendance_view SET (security_invoker = on);
ALTER VIEW IF EXISTS public.montree_stale_works_view SET (security_invoker = on);
ALTER VIEW IF EXISTS public.montree_attendance_summary SET (security_invoker = on);

COMMIT;
