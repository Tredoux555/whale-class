# Montree — Database Schema & RLS Audit
**Scope:** `/tmp/montree/migrations` (380 files), `/tmp/montree/supabase`, `/tmp/montree/db`, migrations 344–346.
**Method:** static analysis of 444 `.sql` files (grep/python inventories of every `CREATE TABLE`,
`ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, `DROP POLICY`, unique constraint, index, FK and
`SECURITY DEFINER` function), reconciled to **final state** after the bulk lockdown passes
(`275`, `277`, `2026-06-06`, `2026-06-10 ×2`, `313`, `337`). No live DB access.

---

## Executive summary

1. The security posture is **defence-in-depth by intent**: the app runs entirely on the service-role
   key (bypasses RLS), so RLS is a pure backstop against the public `anon` key that ships in the browser.
2. That backstop has been patched five times (`275/277`, `2026-06-06`, `2026-06-10`, `313`, `337`) —
   each time after discovering the **same bug class**: `CREATE POLICY … FOR ALL USING (true)` with no
   `TO service_role` clause, which Postgres defaults to role `PUBLIC` (= `anon`).
3. **That bug class is still live on at least 7 tables.** The worst is `montree_parent_invites`, whose
   `invite_code` column *is the credential* for the parent portal — a permissive PUBLIC policy there is
   a full cross-tenant authentication bypass, not a metadata leak. (CRITICAL-1)
4. **`montree_super_admin_config` and `montree_super_admin_sessions` have never had RLS enabled in any
   migration.** The config row holds `totp_secret` and `totp_backup_codes`. (CRITICAL-2)
5. 18 tables were created and never appear in any `ENABLE ROW LEVEL SECURITY` statement; 13 of those
   carry names/emails/message content (`montree_outreach_contacts` ≈7,000 school contacts,
   `montree_messages`, `story_users`, `teachers`, `montree_school_members`).
6. Referential integrity on the core child-data tables is absent: `montree_media`,
   `montree_media_children` and `montree_weekly_reports` declare `child_id`/`school_id`/`classroom_id`
   as bare `UUID` with **no foreign key** — a deleted child leaves orphaned photos and reports.
7. **There is no migration tracking in practice.** A `montree_migrations` ledger table is created in
   `314_institutional_foundations.sql:114` but nothing in the codebase ever reads or writes it; every
   migration is hand-pasted into the Supabase SQL editor (documented house rule).
8. Consequences of (7): 60 duplicate number prefixes (four `004_`, four `050_`, four `051_`, two `314_`…),
   37 un-numbered `.sql` files sitting beside real migrations, and at least one table
   (`montree_english_schedule`) that the app upserts into but which **no migration creates** — schema drift.
9. Three `supabase/clear_*.sql` scripts contain unscoped `DELETE FROM montree_children;` — in a
   multi-tenant DB that is "wipe every school", and they live one directory away from real migrations.
10. Data integrity: `montree_child_progress.status` — the column carrying the Montessori mastery
    ladder invariant — has **no CHECK constraint**; migration `111` had to clean up `'0'/'1'/'completed'`
    garbage once already and nothing prevents a recurrence. `montree_teachers.role` and
    `montree_school_admins.role` are likewise unconstrained text.

**Verdict:** the newest work (CMS `329–332`, Lens `339–340`, tracking `344–346`) is genuinely
well-built — RLS on, zero policies or `TO authenticated`-scoped policies, real CHECKs, real FKs. The
risk is concentrated in the 2026-01→2026-03 era tables that the lockdown sweeps missed by name.

---

## Table inventory (final state)

`school_id?` — `Y` = own column, `via child` = tenancy derivable only through `child_id`, `—` = none.
`RLS?` — `Y` if any migration enables it (including the bulk `ARRAY[]` lockdown loops).
`policies (final)` — created policies minus every later `DROP POLICY` and minus tables whose policies
are wiped wholesale by the `2026-06-*` lockdown loops. `→PUBLIC` means the policy has no `TO` clause
and therefore applies to `anon`.

🟢 rows for non-`montree_/cms_/lens_` legacy tables are omitted for length (they are all
"RLS on, zero policies, deny-all" after the phase-3 sweep).

| table | created in | school_id? | RLS? | policies (final) | PII | verdict |
|---|---|---|---|---|---|---|
| `circle_time_songs` | migrations/033_circle_time_songs.sql | — | Y | `Allow all for circle_time_songs` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `classroom_curriculum_areas` | supabase/migrations/20260118_classroom_curriculum.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `classroom_curriculum_works` | supabase/migrations/20260118_classroom_curriculum.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `classrooms` | migrations/002_multi_user_schema.sql | Y | Y | `Service role full access` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `english_works` | migrations/038_english_reports_complete.sql | — | Y | `Allow all` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `master_english_works` | migrations/036_school_english_works.sql | — | Y | `Anyone can read master English w` USING(true)→PUBLIC; `Service role full access` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `montessori_games` | supabase/migrations/052_gamification_architecture.sql | — | Y | `Public read games` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `montessori_works` | supabase/migrations/040_montessori_brain.sql | — | Y | `Public read montessori_works` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `montree_agent_gloria_log` | migrations/191_gloria_agent_log.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `montree_child_focus_works` | migrations/archive/MONTREE-AUDIT-FIX.sql | via child | Y | `Teachers can view focus works` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `montree_messages` | migrations/112_messaging_system.sql | via child | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `montree_npo_outreach` | migrations/115_account_types_and_impact_fund.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `montree_outreach_contacts` | migrations/182_outreach_contacts.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `montree_parent_children` | supabase/migrations/095_parent_portal.sql | via child | Y | `parent_children_service_role` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `montree_parent_invites` | supabase/migrations/095_parent_portal.sql | via child | Y | `invites_service_role` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `montree_school_members` | migrations/028_montree_schools.sql | Y | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `montree_super_admin_config` | migrations/099_super_admin_security.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `montree_super_admin_sessions` | migrations/099_super_admin_security.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `montree_work_translations` | migrations/050_weekly_reports_media_system.sql | — | Y | `Anyone can read translations` USING(true)→authenticated; `Service role full access transla` USING(true)→service_role; `Anyone can read work translation` USING(true)→authenticated; `Admins manage work translations`→authenticated … | Y | 🔴 anon CRUD + PII |
| `parent_signups` | migrations/008_parent_signups.sql | — | Y | `Anyone can submit parent signup` USING(true)→public; `Authenticated users can view par` USING(true)→authenticated | Y | 🔴 anon CRUD + PII |
| `secret_stories` | migrations/001_create_secret_story_tables.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `sensitive_periods` | supabase/migrations/040_montessori_brain.sql | — | Y | `Public read sensitive_periods` USING(true)→PUBLIC | Y | 🔴 anon CRUD + PII |
| `story_coach_memory` | migrations/257_story_personal_platform.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `story_users` | migrations/001_create_secret_story_tables.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `teachers` | migrations/021_teacher_notes_and_auth.sql | — | N | none (deny-all) | Y | 🔴 no RLS + PII |
| `video_search_cache` | migrations/004_youtube_video_automation.sql | — | Y | `Anyone can view search cache` USING(true)→PUBLIC; `Admins can manage search cache`→PUBLIC | Y | 🔴 anon CRUD + PII |
| `game_progress` | supabase/migrations/052_gamification_architecture.sql | — | Y | `Read own progress` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `montree_child_sensitive_periods` | supabase/migrations/050_ai_analyst_schema.sql | via child | Y | `Teachers can view their classroo` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `montree_outreach_log` | migrations/182_outreach_contacts.sql | — | N | none (deny-all) | — | 🟠 no RLS |
| `montree_phonics_images` | migrations/139_phonics_teacher_words.sql | Y | Y | `service_role_phonics_images` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `montree_phonics_words` | migrations/139_phonics_teacher_words.sql | Y | Y | `service_role_phonics_words` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `montree_weekly_analysis` | supabase/migrations/050_ai_analyst_schema.sql | via child | Y | `Teachers can view their classroo` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `story_diary_entries` | migrations/257_story_personal_platform.sql | — | N | none (deny-all) | — | 🟠 no RLS |
| `story_messages_secret` | migrations/257_story_personal_platform.sql | — | N | none (deny-all) | — | 🟠 no RLS |
| `story_plan_days` | migrations/257_story_personal_platform.sql | — | N | none (deny-all) | — | 🟠 no RLS |
| `story_projects` | migrations/257_story_personal_platform.sql | — | N | none (deny-all) | — | 🟠 no RLS |
| `work_cross_benefits` | supabase/migrations/040_montessori_brain.sql | — | Y | `Public read work_cross_benefits` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `work_games` | supabase/migrations/052_gamification_architecture.sql | — | Y | `Public read work_games` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `work_prerequisites` | supabase/migrations/040_montessori_brain.sql | — | Y | `Public read work_prerequisites` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `work_sensitive_periods` | supabase/migrations/040_montessori_brain.sql | — | Y | `Public read work_sensitive_perio` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `work_unlocks` | supabase/migrations/040_montessori_brain.sql | — | Y | `Public read work_unlocks` USING(true)→PUBLIC | — | 🟠 anon CRUD |
| `cms_allergies` | db/cms-schema.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_attendance` | db/cms-schema.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_child_guardians` | db/cms-schema.sql | via child | Y | none (deny-all) | — | 🟢 deny-all |
| `cms_child_profiles` | migrations/330_cms_phase3.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_children` | db/cms-schema.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_class_groups` | db/cms-schema.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_class_teachers` | migrations/329_cms_phase2.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `cms_consents` | db/cms-schema.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `cms_dietary_requirements` | db/cms-schema.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_enrollments` | db/cms-schema.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_guardians` | db/cms-schema.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_medical_records` | db/cms-schema.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_memberships` | db/cms-schema.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_organisations` | db/cms-schema.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_pickup_authorizations` | migrations/329_cms_phase2.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_previous_schools` | migrations/330_cms_phase3.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_rate_limit_logs` | db/cms-schema.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `cms_schools` | db/cms-schema.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `cms_users` | migrations/329_cms_phase2.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `lens_action_items` | migrations/339_lens_v1.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `lens_assessment_item_responses` | migrations/340_lens_assessment.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `lens_assessment_milestone_results` | migrations/340_lens_assessment.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `lens_assessment_sessions` | migrations/340_lens_assessment.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `lens_classrooms` | migrations/339_lens_v1.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `lens_moments` | migrations/339_lens_v1.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `lens_observers` | migrations/339_lens_v1.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `lens_reports` | migrations/339_lens_v1.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `lens_schools` | migrations/339_lens_v1.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `lens_staff` | migrations/339_lens_v1.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `lens_visit_classrooms` | migrations/339_lens_v1.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `lens_visits` | migrations/339_lens_v1.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_account_deletion_audit` | db/RUN_THESE/03_account_deletion_audit.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_agent_audit` | migrations/188_agent_dashboard.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_agent_payouts` | migrations/198_agent_payouts.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_api_usage` | migrations/142_api_usage_metering.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_appointment_hosts` | migrations/216_appointments.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_appointment_recordings` | migrations/223_appointment_recordings.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_appointments` | migrations/216_appointments.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_attendance` | migrations/152_automation_foundation.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_attendance_override` | migrations/155_teacher_os_foundation.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_availability_blackouts` | migrations/216_appointments.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_availability_rules` | migrations/216_appointments.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_behavioral_observations` | migrations/110_guru_tables.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_billing_history` | migrations/189_billing_phase4.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_campaign_items` | db/RUN_THESE/07_missing_tables_batch.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_child_assignments` | supabase/migrations/050_montree_foundation.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_child_english_progress` | migrations/225_child_english_progress.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_child_extras` | migrations/124_child_extras_table.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_child_intake` | migrations/326_child_onboarding.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_child_learning_state` | migrations/244_child_learning_state.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_child_mental_profiles` | migrations/110_guru_tables.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_child_patterns` | migrations/110_guru_tables.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_child_progress` | migrations/archive/MONTREE-AUDIT-FIX.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_children` | migrations/archive/MONTREE-AUDIT-FIX.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_class_credits_ledger` | migrations/334_dark_phonics_live.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_class_dark_phonics_week` | migrations/344_dark_phonics_tracker.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_class_live_state` | migrations/334_dark_phonics_live.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_class_packages` | migrations/334_dark_phonics_live.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_class_recaps` | migrations/334_dark_phonics_live.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_classroom_curriculum_areas` | migrations/099_montree_classroom_curriculum_tables.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_classroom_curriculum_works` | migrations/099_montree_classroom_curriculum_tables.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_classroom_features` | migrations/134_feature_toggles_and_raz_tracker.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_classrooms` | migrations/067_school_onboarding_clean.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_community_backups` | migrations/132_community_works.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_community_dm_meta` | migrations/310_creator_dm.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_community_materials` | migrations/309_teachers_room.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_community_posts` | migrations/309_teachers_room.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_community_users` | migrations/309_teachers_room.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_community_works` | migrations/132_community_works.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_companion_log` | migrations/264_home_companion.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_conference_note_versions` | migrations/155_teacher_os_foundation.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_conference_notes` | migrations/155_teacher_os_foundation.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_consent_log` | migrations/050_weekly_reports_media_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_curriculum_imports` | migrations/0096_curriculum_import.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_curriculum_translations` | migrations/180_create_curriculum_translations_global.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_custom_curriculum` | migrations/0096_curriculum_import.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_daily_focus` | migrations/179_daily_focus_table.sql | via child | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_demo_meetings` | migrations/299_demo_meetings.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_device_tokens` | db/RUN_THESE/04_push_device_tokens.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_dm` | migrations/118_montree_dm.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_evaluation_bank_versions` | migrations/314_montree_evaluation_system.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_evaluation_item_responses` | migrations/314_montree_evaluation_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_evaluation_milestone_results` | migrations/314_montree_evaluation_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_evaluation_sessions` | migrations/314_montree_evaluation_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_event_attendance` | migrations/145_event_attendance.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_events` | migrations/142_special_events.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_feature_definitions` | migrations/134_feature_toggles_and_raz_tracker.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_feedback` | migrations/114_feedback_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_finance_transactions` | migrations/189_billing_phase4.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_founding_config` | migrations/285_founding_waitlist.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_founding_waitlist` | migrations/285_founding_waitlist.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_game_progress` | db/RUN_THESE/05_game_progress.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_global_visual_memory` | migrations/281_global_visual_memory.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_global_works_staging` | migrations/166_global_works_staging.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_guru_brain` | migrations/133_guru_tiers.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_guru_corrections` | migrations/137_guru_corrections_and_accuracy.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_guru_interactions` | migrations/110_guru_tables.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_home_events` | migrations/264_home_companion.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_home_practice_cards` | migrations/249_home_practice_cards.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_impact_fund_transactions` | db/RUN_THESE/01_create_application_tables.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_import_logs` | migrations/montree_synonyms_and_import.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_leads` | migrations/117_montree_leads.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_lifecycle_emails` | migrations/300_engagement.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_marketplace_products` | migrations/264_home_companion.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_master_works` | migrations/314_institutional_foundations.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_media` | migrations/050_weekly_reports_media_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_media_children` | migrations/050_weekly_reports_media_system.sql | via child | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_meeting_dossiers` | migrations/237_meeting_dossiers.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_meeting_notes` | migrations/214_meeting_notes.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_message_group_members` | migrations/190_communication_system.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_message_groups` | migrations/190_communication_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_message_thread_participants` | migrations/190_communication_system.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_message_threads` | migrations/190_communication_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_migrations` | migrations/314_institutional_foundations.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_milestones` | migrations/152_automation_foundation.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_montage_jobs` | migrations/301_montage.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_npo_applications` | db/RUN_THESE/01_create_application_tables.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_observation_sessions` | migrations/336_sheet_layouts_and_work_sessions.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_onboarding_events` | migrations/131_onboarding_system.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_onboarding_progress` | migrations/131_onboarding_system.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_onboarding_settings` | migrations/131_onboarding_system.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_org_invites` | migrations/315_montree_organizations.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_organization_admins` | migrations/315_montree_organizations.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_organizations` | migrations/315_montree_organizations.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_outreach_log_archive` | migrations/213_outreach_log_retention_and_drip_uniqueness.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_outreach_schools` | migrations/279_outreach_schools.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_paper_scan_extractions` | migrations/308_paper_scan.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_paper_scans` | migrations/308_paper_scan.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_parent_access` | migrations/050_weekly_reports_media_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_parent_deletion_audit` | migrations/243_parent_consent_flags.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_parent_meeting_analyses` | migrations/241_parent_meeting_analyses.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_parent_meeting_transcripts` | migrations/240_parent_meeting_transcripts.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_parent_meetings` | migrations/239_parent_meetings.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_parent_profiles` | migrations/238_parent_profiles.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_parents` | supabase/migrations/095_parent_portal.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_perf_vitals` | migrations/196_perf_vitals.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_period_locks` | migrations/206_period_locks.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_period_reports` | migrations/336_sheet_layouts_and_work_sessions.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_photo_bank` | migrations/140_photo_bank.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_photo_categories` | migrations/140_photo_bank.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_pipeline_telemetry` | migrations/211_pipeline_telemetry.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_principal_agent_log` | migrations/184_principal_agent_log.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_principal_conversations` | migrations/246_principal_conversations.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_principal_memory` | migrations/195_principal_memory.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_principal_vault` | migrations/185_principal_vault.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_progress_events` | migrations/314_institutional_foundations.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_progress_review_queue` | migrations/345_progress_review_queue.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_pulse_lock` | migrations/155_teacher_os_foundation.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_push_nudges` | migrations/300_engagement.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_push_outbox` | migrations/255_push_outbox_and_prefs.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_rate_limit_logs` | migrations/122_phase5_security.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_recurring_op_expenses` | migrations/199_recurring_op_expenses.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_reduced_rate_applications` | db/RUN_THESE/01_create_application_tables.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_referral_codes` | migrations/186_referral_codes.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_report_media` | migrations/050_weekly_reports_media_system.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_report_tokens` | supabase/migrations/057_report_tokens.sql | — | Y | `Public can read valid tokens`→anon | Y | 🟢 deny-all |
| `montree_roster_import_entries` | migrations/325_photo_onboarding.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_roster_imports` | migrations/325_photo_onboarding.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_school_admins` | migrations/067_school_onboarding_clean.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_school_curriculum_areas` | supabase/migrations/050_montree_foundation.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_school_curriculum_works` | supabase/migrations/050_montree_foundation.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_school_event_rsvps` | migrations/218_school_events.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_school_events` | migrations/218_school_events.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_school_features` | migrations/134_feature_toggles_and_raz_tracker.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_school_terms` | migrations/233_school_terms_and_timezone.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_schools` | migrations/028_montree_schools.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_server_errors` | migrations/201_server_errors.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_sheet_layouts` | migrations/336_sheet_layouts_and_work_sessions.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_stale_work_dismissals` | migrations/155_teacher_os_foundation.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_student_aliases` | migrations/0096_curriculum_import.sql | via child | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_super_admin_audit` | migrations/099_super_admin_security.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_tax_registrations` | migrations/269_lyf_coach_billing.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_teacher_classrooms` | supabase/migrations/097_teacher_classrooms.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_teacher_notes` | migrations/148_classroom_onboarding.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_teachers` | migrations/069_montree_teachers_proper.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_thread_messages` | migrations/190_communication_system.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_tracy_corpus` | migrations/242_tracy_corpus.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_tryit_clicks` | migrations/316_montree_tryit_gate.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_tryit_messages` | migrations/316_montree_tryit_gate.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_visitors` | migrations/156_visitor_tracking.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_visual_memory` | migrations/138_visual_memory.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_voice_notes` | migrations/136_voice_notes_weekly_admin.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_webhook_deadletter` | migrations/200_webhook_deadletter.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_webhook_inbox` | db/RUN_THESE/06_webhook_inbox.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_weekly_admin_notes` | migrations/150_weekly_admin_notes.sql | via child | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_weekly_admin_output` | migrations/136_voice_notes_weekly_admin.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_weekly_pulse_locks` | migrations/152_automation_foundation.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_weekly_reports` | migrations/050_weekly_reports_media_system.sql | Y | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_weekly_works` | migrations/264_home_companion.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_work_accuracy` | migrations/137_guru_corrections_and_accuracy.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_work_imports` | migrations/0096_curriculum_import.sql | — | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_work_sessions` | migrations/060_montree_work_sessions.sql | via child | Y | none (deny-all) | Y | 🟢 deny-all |
| `montree_work_synonyms` | migrations/montree_synonyms_and_import.sql | Y | Y | none (deny-all) | — | 🟢 deny-all |
| `montree_xero_sync_log` | migrations/208_xero_sync_log.sql | — | Y | none (deny-all) | — | 🟢 deny-all |
> **Note on PII flagging.** The `PII` column is a keyword heuristic. Several 🔴 rows above are
> deliberately-public curriculum catalogs, not personal data: `montessori_works`, `montree_work_translations`,
> `english_works`, `master_english_works`, `sensitive_periods`, `work_prerequisites`, `work_unlocks`,
> `work_cross_benefits`, `work_games`, `montessori_games`, `circle_time_songs`, `video_search_cache`.
> Their anon-readable state is intentional (the `2026-06-10` phase-3 migration excludes them by name).
> Anon **write** access to them is still wrong (see MEDIUM-2) but it is a defacement risk, not a breach.

---

## Findings

### [SEV: CRITICAL] `montree_parent_invites` and `montree_parent_children` are anon-readable and anon-writable — full parent-portal auth bypass

**Where:** `supabase/migrations/096_rls_policies.sql:56-61` (policy creation);
`migrations/277_tighten_permissive_policies.sql:25-28` (enables RLS, drops the *other*, differently-named
policies but not these); `supabase/migrations/095_parent_portal.sql:54-65` (table definition);
`app/api/montree/parent/auth/access-code/route.ts:43-45` (consumer).

**What:** `096_rls_policies.sql` creates

```sql
CREATE POLICY "parent_children_service_role" ON montree_parent_children
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "invites_service_role" ON montree_parent_invites
  FOR ALL USING (true) WITH CHECK (true);
```

Despite the names there is **no `TO service_role` clause**, so both default to role `PUBLIC`, which
includes `anon` — the role every browser holds via `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Migration `277`
turns RLS *on* for both tables (lines 25–28) and drops `"Allow all parent_children operations"` and
`"Allow all invite operations"` (the `095` policies) — but the two `*_service_role` policies from `096`
are never dropped by `277`, are not in the `2026-06-06` / `2026-06-10` bulk `ARRAY[]` lockdown lists,
and are not touched by `313` or `337`. Enabling RLS *activates* them.

**Why it matters:** `montree_parent_invites.invite_code` is not metadata — it is the credential.
`POST /api/montree/parent/auth/access-code` looks a parent up **by that code alone** and mints a parent
session. An attacker needs only the public anon key (it is in the JS bundle) and one request:
`GET /rest/v1/montree_parent_invites?select=invite_code,child_id&is_active=eq.true` returns every live
invite code for every child in every school. They then log into any family's portal and read that
child's photos, weekly reports and parent↔teacher messages. `FOR ALL … WITH CHECK (true)` also means
anon can **INSERT** a fresh invite row for any `child_id` they can guess, so revoking codes does not
close it. This is the exact failure mode migration `337` verified live against production on 2026-08-23
for the evaluation/org tables — the same sweep simply did not include these two names.

**Fix:**
```sql
BEGIN;
DROP POLICY IF EXISTS "invites_service_role"         ON public.montree_parent_invites;
DROP POLICY IF EXISTS "parent_children_service_role" ON public.montree_parent_children;
ALTER TABLE public.montree_parent_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_parent_children ENABLE ROW LEVEL SECURITY;
COMMIT;
-- verify: expect rls_enabled=true, policy_count=0
SELECT c.relname, c.relrowsecurity,
       (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname) AS policy_count
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('montree_parent_invites','montree_parent_children');
```
Then **rotate every active invite code** — assume the current set is public.
Longer term: add a repo-level guard so `USING (true)` without `TO service_role` cannot be merged
(a grep in CI over `migrations/*.sql`), and extend `scripts/probe-rls.mjs` to assert `policy_count = 0`
on every table rather than only checking readability of a fixed list.

---

### [SEV: CRITICAL] `montree_super_admin_config` (TOTP secret + backup codes) and `montree_super_admin_sessions` have RLS enabled in no migration at all

**Where:** `migrations/099_super_admin_security.sql:38-63` (config, incl. `totp_secret TEXT`,
`totp_backup_codes TEXT[]`, `allowed_ips`), `:73-94` (sessions, `token_hash TEXT NOT NULL UNIQUE`).
No `ENABLE ROW LEVEL SECURITY` for either name exists anywhere in `migrations/`, `supabase/` or `db/`
— confirmed by grepping all 444 SQL files, including the `ARRAY[]` bodies of the four bulk lockdown
migrations.

**What:** Both tables sit in the `public` schema, so PostgREST exposes them, and with RLS off the
default Supabase `anon`/`authenticated` grants apply. Migration `275`'s linter-generated list covers
~120 tables but does not name either of these; the `2026-06-*` passes do not either.

**Why it matters:** `montree_super_admin_config` is a single well-known row
(`id = '00000000-0000-0000-0000-000000000001'`, inserted at `099:66`). Reading it with the public anon
key yields the super-admin TOTP secret and backup codes, plus `allowed_ips` and
`ip_allowlist_enabled` — i.e. the attacker learns both the second factor and whether the IP allowlist
is even on. Combined with the super-admin password (a single shared `SUPER_ADMIN_PASSWORD` env var,
per `CLAUDE.md`), that is total compromise of every school's data. `montree_super_admin_sessions`
additionally leaks live session `token_hash` values, `ip_address` and `user_agent` — enough to
enumerate active admin sessions, and to attempt offline recovery if the hash is unsalted.

**Fix:**
```sql
BEGIN;
ALTER TABLE public.montree_super_admin_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_super_admin_sessions ENABLE ROW LEVEL SECURITY;
-- belt and braces: these must never be reachable by the browser key
REVOKE ALL ON public.montree_super_admin_config,
              public.montree_super_admin_sessions FROM anon, authenticated;
COMMIT;
```
Then rotate the TOTP secret and backup codes and invalidate all super-admin sessions
(`UPDATE montree_super_admin_sessions SET revoked = TRUE, revoked_reason = 'rls_incident';`).
Also add a standing check: `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;` should return zero rows,
run in CI or as a scheduled task, instead of being rediscovered by a linter every few months.

---

### [SEV: HIGH] 16 more tables never had RLS enabled — 13 of them hold names, emails or message content

**Where:** every `CREATE TABLE` was cross-referenced against every `ENABLE ROW LEVEL SECURITY`
(including bulk loops). Tables with no match, and where they are created:

| table | created in | contents |
|---|---|---|
| `montree_outreach_contacts` | `migrations/182_outreach_contacts.sql:5` | ~7,000 school contacts: org name, contact person, email, country, notes |
| `montree_outreach_log` | `migrations/182_outreach_contacts.sql:73` | per-contact outreach activity |
| `montree_messages` | `migrations/118_montree_messages.sql:4`, `112_messaging_system.sql:10` | message bodies + `sender_type`, `child_id` |
| `montree_school_members` | `migrations/028_montree_schools.sql:30` | user↔school membership + `role` |
| `montree_npo_outreach` | `migrations/115_account_types_and_impact_fund.sql:188` | NPO org contacts |
| `montree_agent_gloria_log` | `migrations/191_gloria_agent_log.sql:16` | agent conversation log |
| `teachers` | `migrations/021_teacher_notes_and_auth.sql:15` | legacy teacher auth table |
| `story_users`, `secret_stories`, `story_diary_entries`, `story_projects`, `story_plan_days`, `story_coach_memory`, `story_messages_secret` | `001_create_secret_story_tables.sql`, `257_story_personal_platform.sql:34-105` | personal diary / coach content |
| `classroom_curriculum_areas`, `classroom_curriculum_works` | `supabase/migrations/20260118_classroom_curriculum.sql:6,24` | per-classroom curriculum (note: the *`montree_`-prefixed* twins were locked down by `313`; these unprefixed ones were not) |

**What:** These are all in `public` and therefore PostgREST-exposed with default grants.
`montree_parent_meetings`, `montree_parent_profiles`, `montree_parent_deletion_audit`,
`montree_child_learning_state` and `montree_principal_conversations` look like they belong on this list
too — they are saved only because the `2026-06-06` and `2026-06-10` lockdowns name them explicitly in
their `ARRAY[]` bodies.

**Why it matters:** two concrete scenarios. (a) A competitor with the public anon key dumps
`montree_outreach_contacts` — the entire go-to-market prospect list with verified emails and per-lead
status. (b) `montree_messages` carries `child_id` plus message content; teacher↔parent conversation
text about named children is readable by anyone who opens devtools. Neither requires a login. The
`story_*` personal-diary tables are the highest-sensitivity content in the repo and are excluded from
every sweep.

**Fix:** one additive, idempotent migration in the shape of `275`:
```sql
BEGIN;
ALTER TABLE IF EXISTS public.montree_outreach_contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_outreach_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_messages                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_school_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_npo_outreach             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.montree_agent_gloria_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.secret_stories                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_diary_entries              ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_projects                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_plan_days                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_coach_memory               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.story_messages_secret            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classroom_curriculum_areas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classroom_curriculum_works       ENABLE ROW LEVEL SECURITY;
COMMIT;
```
Safe by the same reasoning `275` documents: the app touches all of these server-side via the
service-role key, which has `BYPASSRLS`.

---

### [SEV: HIGH] Child-data tables still carrying `USING (true)` policies that default to PUBLIC

**Where:** `supabase/migrations/050_ai_analyst_schema.sql:130-160`:
```sql
CREATE POLICY "Teachers can view their classroom sensitive periods"
  ON montree_child_sensitive_periods FOR SELECT USING (true);
CREATE POLICY "Teachers can insert sensitive periods"
  ON montree_child_sensitive_periods FOR INSERT WITH CHECK (true);
CREATE POLICY "Teachers can view their classroom analysis"
  ON montree_weekly_analysis FOR SELECT USING (true);
CREATE POLICY "Teachers can view focus works"
  ON montree_child_focus_works FOR SELECT USING (true);
```
Also `migrations/002_multi_user_schema.sql:139-144` (`classrooms`), and
`migrations/139_phonics_teacher_words.sql:63-68` (`montree_phonics_words`, `montree_phonics_images`,
both `FOR ALL USING (true) WITH CHECK (true)`).

**What:** Migration `277` drops the *sibling* policies with matching-ish names
(`"Teachers can manage focus works"`, `"Teachers can insert sensitive periods"`,
`"Teachers can update sensitive periods"`, `"System can insert analysis"`, `"System can update analysis"`
— lines 30–36) but not the `"… can view …"` SELECT policies, and `277` drops
`"Service role full access on schools"` / `on users` but **not** `"Service role full access on classrooms"`.
RLS is enabled on all of them (by `275`/`277`), so those surviving policies are live.

**Why it matters:** `montree_child_focus_works` and `montree_child_sensitive_periods` are keyed by
`child_id`; `montree_weekly_analysis` holds the AI's written analysis of a named child's week. All three
are readable cross-tenant by anon with a single REST call — and `montree_child_sensitive_periods` also
accepts anon `INSERT`, so a stranger can inject fabricated developmental observations into any child's
record, which then feed the Guru context and the parent report. `classrooms` (legacy) accepts anon
`DELETE` on every school's classrooms. `montree_phonics_words/images` are `school_id`-scoped teacher
content with anon `FOR ALL`.

**Fix:**
```sql
BEGIN;
DROP POLICY IF EXISTS "Teachers can view their classroom sensitive periods" ON public.montree_child_sensitive_periods;
DROP POLICY IF EXISTS "Teachers can view their classroom analysis"          ON public.montree_weekly_analysis;
DROP POLICY IF EXISTS "Teachers can view focus works"                       ON public.montree_child_focus_works;
DROP POLICY IF EXISTS "Service role full access on classrooms"              ON public.classrooms;
DROP POLICY IF EXISTS "service_role_phonics_words"                          ON public.montree_phonics_words;
DROP POLICY IF EXISTS "service_role_phonics_images"                         ON public.montree_phonics_images;
ALTER TABLE public.montree_child_sensitive_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_weekly_analysis         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_child_focus_works       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_phonics_words           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_phonics_images          ENABLE ROW LEVEL SECURITY;
COMMIT;
```
Better: stop enumerating names. Run one sweep that drops **every** policy whose `qual`/`with_check`
is `true` and whose `roles` include `public`/`anon`/`authenticated`, over the whole schema, then keep
it as a scheduled assertion.

---

### [SEV: HIGH] No foreign keys on the core child media/report tables — child deletion leaves orphaned PII

**Where:** `migrations/050_weekly_reports_media_system.sql:19-48` (`montree_media`), and the
`montree_media_children`, `montree_weekly_reports`, `montree_parent_access`, `montree_consent_log`
definitions in the same file:
```sql
CREATE TABLE IF NOT EXISTS montree_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,          -- no REFERENCES
  classroom_id UUID,                -- no REFERENCES
  child_id UUID,                    -- no REFERENCES
  ...
```
Same pattern in `migrations/060_montree_work_sessions.sql` (`montree_work_sessions.child_id`),
`136_voice_notes_weekly_admin.sql` (`montree_voice_notes.child_id/school_id`),
`137_guru_corrections_and_accuracy.sql`, `301_montage.sql`, `308_paper_scan.sql`,
`314_montree_evaluation_system.sql`, `336_sheet_layouts_and_work_sessions.sql`,
`345_progress_review_queue.sql` — 70+ `school_id`/`child_id`/`classroom_id` columns repo-wide with no FK.

**What:** These are bare `UUID` columns. The database enforces nothing: a row can point at a
non-existent child, or at a child in a different school, and no `ON DELETE CASCADE` fires.

**Why it matters:** two failure modes. (a) **Deletion is incomplete.** When a school deletes a child,
`montree_children` loses the row but the child's photographs (`montree_media.storage_path`), their
weekly reports and their voice-note transcripts stay behind, now un-attributable and un-findable by
any "delete this child's data" query that joins from `montree_children`. For a product handling under-6
PII in the EU/China that is a subject-erasure failure, and the rows are invisible to review because
nothing lists them. (b) **Cross-tenant writes are structurally possible.** `CLAUDE.md` documents a real
2026-07-01 incident where a stale client `classroomId` wrote a child into the wrong school; the same
class of bug on `montree_media_children.child_id` would silently attach one school's photo to another
school's child with no DB objection.

**Fix:** add the constraints, cleaning orphans first (they exist — assume so until proven otherwise):
```sql
-- 1. inspect before deleting anything
SELECT count(*) FROM montree_media m
  LEFT JOIN montree_children c ON c.id = m.child_id
  WHERE m.child_id IS NOT NULL AND c.id IS NULL;

-- 2. after review, null or delete the orphans, then:
ALTER TABLE montree_media
  ADD CONSTRAINT montree_media_school_fk
    FOREIGN KEY (school_id)  REFERENCES montree_schools(id)    ON DELETE CASCADE,
  ADD CONSTRAINT montree_media_child_fk
    FOREIGN KEY (child_id)   REFERENCES montree_children(id)   ON DELETE CASCADE;
ALTER TABLE montree_media_children
  ADD CONSTRAINT mmc_child_fk
    FOREIGN KEY (child_id)   REFERENCES montree_children(id)   ON DELETE CASCADE;
ALTER TABLE montree_weekly_reports
  ADD CONSTRAINT mwr_child_fk
    FOREIGN KEY (child_id)   REFERENCES montree_children(id)   ON DELETE CASCADE;
```
Add them `NOT VALID` first and `VALIDATE CONSTRAINT` afterwards if the tables are large, so the
`ACCESS EXCLUSIVE` lock is brief.

---

### [SEV: HIGH] No migration ledger in practice → duplicate numbers, un-numbered files, and at least one table no migration creates

**Where:** `migrations/314_institutional_foundations.sql:114-119` creates
`montree_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ)`. Grepping the whole repo for
`montree_migrations` returns only four SQL files and one planning doc — **no application or script code
ever inserts into or reads it.** Meanwhile:
- **60 duplicated number prefixes.** Four different `004_*`, four `050_*`, four `051_*` (one of them named
  `051_whale_media_storage_BROKEN_DO_NOT_USE.sql`), three `009_*`, three `020_*`, three `133_*`,
  four `137_*`, and — most consequential — **two `314_`**: `314_institutional_foundations.sql` and
  `314_montree_evaluation_system.sql`. Migration `337`'s own header refers to "migrations 314 and 315"
  meaning the evaluation one; a reader following the number alone lands on the wrong file.
- **37 un-numbered `.sql` files** interleaved in `migrations/`: `RUN_THIS_NOW.sql`,
  `ADD_MISSING_WORKS.sql`, `WEEK_17_COMPLETE.sql`, `ULTIMATE_TRACY_ALL_SQL.sql`,
  `story_fix_existing_database.sql`, `montree_synonyms_and_import.sql`, plus 30 in `migrations/archive/`.
- **A table the app writes to that no migration creates:** `montree_english_schedule` appears in
  `migrations/275_enable_rls_security_lockdown.sql` and in application upserts
  (`onConflict: 'classroom_id,week_start'`) but has **no `CREATE TABLE` anywhere** in `migrations/`,
  `supabase/` or `db/`. It was created by hand in the Supabase editor.

**What:** Ordering is by filename, applied by hand-pasting into the Supabase SQL editor
(the documented house process). Nothing records what ran.

**Why it matters:** nobody can answer "what is the schema of a fresh database?" The current production
schema is the sum of 380 files plus an unknown number of hand-run statements
(`montree_english_schedule`, the `montree_child_progress.unique_child_work` constraint restored by `111`,
the CMS link-column UPDATEs, the two 2026-06 hash realignments). Consequences already visible in the
repo: `lib/montree/progress/write-progress.ts:809-812` carries a runtime fallback path *specifically for
"legacy environments without the unique_child_work constraint"* — i.e. the code already knows different
databases have different schemas. Standing up a staging environment, restoring from backup, or
onboarding a second engineer all become guesswork, and a security sweep like `275` can only cover the
tables its author happened to know about — which is precisely how CRITICAL-2 above survived.

**Fix:** (1) Make the ledger real — a tiny `scripts/migrate.mjs` that reads
`migrations/*.sql` in order, skips any `filename` already in `montree_migrations`, applies the rest in a
transaction and records them. Backfill it by inserting every existing filename as already-applied.
(2) Dump the true production schema (`pg_dump --schema-only`) into `db/schema.sql` and commit it as the
reproducible baseline; treat the 380 historical files as an append-only journal from that point.
(3) Move `migrations/archive/**` and the un-numbered scripts out of `migrations/` into `scripts/one-off/`.
(4) Rename one of the two `314_` files.

---

### [SEV: MEDIUM] `supabase/clear_*.sql` are unscoped, cross-tenant data-destruction scripts stored next to migrations

**Where:** `supabase/clear_session58.sql:10-30`, `supabase/clear_data_session58.sql:10-30`,
`supabase/clear_montree_fresh.sql:5-8`. Each is a sequence of unqualified deletes ending in:
```sql
DELETE FROM montree_media;
DELETE FROM montree_children;
```
Also `supabase/migrations/096_parent_portal_fixes.sql:13` — `DROP TABLE IF EXISTS montree_weekly_reports CASCADE;`
inside a directory literally named `migrations`.

**What:** No `WHERE school_id = …`. These were written when the database served one school (Whale Class)
and were never updated after multi-tenancy landed.

**Why it matters:** the operating model is a human copy-pasting SQL out of this repo into the production
Supabase SQL editor. A file called `clear_montree_fresh.sql` reads as "reset my dev data"; running it
deletes every child of every customer, and `montree_media`/`montree_weekly_reports` have no FKs
(HIGH above), so cascade semantics won't even keep the wreckage consistent.
`096_parent_portal_fixes.sql` is worse: it is indistinguishable from a migration, and re-running the
`supabase/migrations` folder from the top destroys all parent reports.

**Fix:** delete the three `clear_*.sql` files, or move them to `scripts/dev-only/` with a mandatory
`school_id` parameter and a guard:
```sql
\if :{?school_id} \else \echo 'refusing: set -v school_id=...' \quit \endif
DELETE FROM montree_children WHERE school_id = :'school_id';
```
Move `supabase/migrations/096_parent_portal_fixes.sql` out of any directory named `migrations`, or strip
the `DROP TABLE` and replace it with the `ALTER TABLE … ADD COLUMN IF NOT EXISTS` it was really trying
to achieve.

---

### [SEV: MEDIUM] `montree_global_vm_search` — `SECURITY DEFINER`, no `SET search_path`, `GRANT EXECUTE … TO anon`, created *after* the hardening pass that was supposed to prevent exactly this

**Where:** `migrations/282_global_vm_embedding.sql:42-72`:
```sql
CREATE OR REPLACE FUNCTION montree_global_vm_search(...)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ ... $$;

GRANT EXECUTE ON FUNCTION montree_global_vm_search(vector(1536), INTEGER)
  TO anon, authenticated, service_role;
```
Contrast `migrations/276_security_hardening_warnings.sql:13-35`, which loops over every owned function
applying `SET search_path = public, pg_temp` and `REVOKE EXECUTE … FROM anon, authenticated`, and its
own trailing `ALTER DEFAULT PRIVILEGES … REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated`.

**What:** `282` (run, per `CLAUDE.md`) re-opens both halves of what `276` closed, for one function.
Being `SECURITY DEFINER` it also bypasses RLS on `montree_global_visual_memory`. The sibling
`tracy_corpus_search` (`242b`) has the same shape but predates `276`, so `276` fixed it — and
`CLAUDE.md` records that both auditors flagged the anon grant on that one as a hole. `282` reintroduces it.

**Why it matters:** anon can call the RPC repeatedly with crafted embeddings and page out the curated
global visual-memory corpus — the "moat" that `CLAUDE.md` describes as the deliberately hidden
competitive asset ("NO UI exposes the corpus"). It returns `work_key`, `work_name`, `area` and a
similarity score, 8 rows a call, unauthenticated: an attacker who embeds a dictionary of Montessori
material descriptions reconstructs the mapping in a few thousand calls. Separately, a
`SECURITY DEFINER` function with a mutable `search_path` is the classic privilege-escalation shape if
anyone ever gains `CREATE` on a schema earlier in the path.

**Fix:**
```sql
ALTER FUNCTION public.montree_global_vm_search(vector(1536), INTEGER)
  SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.montree_global_vm_search(vector(1536), INTEGER)
  FROM anon, authenticated;
```
The app calls this server-side through `getSupabase()` (service role), which keeps EXECUTE, so nothing
breaks. Then re-run `276`'s `DO` block — it is idempotent and will catch anything else added since.

---

### [SEV: MEDIUM] `montree_child_progress.status` carries the mastery-ladder invariant with no CHECK constraint

**Where:** `supabase/migrations/081_montree_progress.sql:8` — `status TEXT DEFAULT 'presented'`,
constrained only by a comment. `migrations/111_fix_data_integrity.sql:32-48` is the cleanup that had to
normalise `'completed'` → `'mastered'` and `'0'/'1'/'2'/'3'` → the four names.

**What:** The column takes any text. Migration `111` fixed the data but never added the constraint that
would stop it recurring; it only added `UNIQUE (child_id, work_name)` (`111:57-60`).
`montree_teachers.role` (`069_montree_teachers_proper.sql`), `montree_school_admins.role`
(`067_school_onboarding_clean.sql`) and `montree_schools.subscription_status`
(`028_montree_schools.sql`) are similarly unconstrained text — and `role` is authorization-relevant.

**Why it matters:** `CLAUDE.md` states the load-bearing product rule: *"a work leaves a child's focus
shelf ONLY when teacher-confirmed `mastered`"*, and the shelf logic in
`lib/montree/progress/advance-shelf-after-mastery.ts` branches on exact string equality. One writer
persisting `'Mastered'`, `'complete'` or `'3'` — from an import, a paper-scan extraction
(`montree_paper_scan_extractions.teacher_final_status` is likewise unconstrained text), or a future
model call — silently freezes that child's shelf: the work never advances and nothing errors. The
database is the only place this can be enforced across the ~10 writers.

**Fix:**
```sql
-- normalise first (see 111 for the full ladder), then:
ALTER TABLE montree_child_progress
  ADD CONSTRAINT montree_child_progress_status_chk
  CHECK (status IN ('not_started','presented','practicing','mastered')) NOT VALID;
ALTER TABLE montree_child_progress VALIDATE CONSTRAINT montree_child_progress_status_chk;

ALTER TABLE montree_teachers
  ADD CONSTRAINT montree_teachers_role_chk
  CHECK (role IN ('teacher','lead_teacher','assistant','homeschool_parent')) NOT VALID;
```
(Confirm the exact allowed sets against `lib/montree/**` before applying — `NOT VALID` lets you add the
constraint without a full-table scan and surface violations with a `VALIDATE` you can run when ready.)

---

### [SEV: MEDIUM] Anon can write to the shared curriculum catalogs

**Where:** `supabase/migrations/040_montessori_brain.sql:133-138` (`montessori_works`,
`sensitive_periods`, `work_prerequisites`, `work_sensitive_periods`, `work_cross_benefits`,
`work_unlocks`), `supabase/migrations/052_gamification_architecture.sql:141-145` (`montessori_games`,
`work_games`, `game_progress`), `migrations/033_circle_time_songs.sql:33` (`circle_time_songs`),
`migrations/004_youtube_video_automation.sql:123` (`video_search_cache`),
`migrations/036_school_english_works.sql:140-150` (`master_english_works`, `english_works`).
The `2026-06-10` phase-3 migration explicitly excludes these as "curriculum catalogs … read by anon".

**What:** The exclusion is right for reads, but several of the policies are `FOR ALL USING (true)`
(`circle_time_songs`, `master_english_works`, `english_works`, `video_search_cache`,
`montree_work_translations`), not `FOR SELECT`. `FOR ALL` grants INSERT/UPDATE/DELETE to `anon` too.

**Why it matters:** an anonymous caller can rewrite or delete the shared Montessori work catalog,
the prerequisite graph and the work translations that every school's curriculum, Guru context and
parent-report copy is generated from. It is not a data breach but it is a one-request denial of the
whole product for every tenant, with no audit trail.

**Fix:** narrow each to read-only rather than dropping it (these genuinely need anon SELECT):
```sql
DROP POLICY IF EXISTS "Allow all for circle_time_songs" ON public.circle_time_songs;
CREATE POLICY "circle_time_songs_public_read" ON public.circle_time_songs
  FOR SELECT TO anon, authenticated USING (true);
-- repeat for master_english_works, english_works, video_search_cache, montree_work_translations
```
Writes continue to work: the app writes these via the service-role key, which bypasses RLS.

---

### [SEV: LOW] `montree_outreach_contacts` upsert targets a partial unique index

**Where:** index at `migrations/182_outreach_contacts.sql` — `CREATE UNIQUE INDEX … ON
montree_outreach_contacts (email) WHERE …`; callers upsert with `onConflict: 'email'`
(e.g. the bulk-import path used by the 🌍 Global Outreach tab).

**What:** Postgres can only infer a *partial* unique index for `ON CONFLICT` when the statement repeats
the index predicate — PostgREST's `on_conflict=email` does not. The upsert therefore raises
`42P10 there is no unique or exclusion constraint matching the ON CONFLICT specification` whenever the
partial index is the only candidate.

**Why it matters:** low, because it fails loudly and only affects an internal outreach tool. Worth
listing because a live check will settle in seconds whether a plain unique index also exists (added by
hand), which would be another instance of the schema-drift problem in HIGH-3.

**Fix:** either add a total unique index (`CREATE UNIQUE INDEX CONCURRENTLY … ON
montree_outreach_contacts (lower(email)) ;` — note `lower()` is IMMUTABLE, so this is a legal index
expression) and drop the partial one, or change the callers to `INSERT … ON CONFLICT (email) WHERE
<same predicate>` via an RPC.

---

### [SEV: LOW] Missing indexes on tenant-filter columns

**Where:** 38 tables declare `school_id`, `child_id` or `classroom_id` with no index leading on that
column. The ones most likely to matter at scale:
`montree_child_progress.school_id` (`supabase/migrations/081_montree_progress.sql`),
`montree_teacher_notes.school_id` (`migrations/148_classroom_onboarding.sql`),
`montree_appointments.child_id` + `.classroom_id` (`migrations/216_appointments.sql`),
`montree_daily_focus.child_id` (`migrations/179_daily_focus_table.sql`),
`montree_paper_scan_extractions.school_id` + `.classroom_id` (`migrations/308_paper_scan.sql`),
`montree_period_reports.school_id` and `montree_observation_sessions.school_id`
(`migrations/336_sheet_layouts_and_work_sessions.sql`),
`montree_progress_review_queue.school_id` (`migrations/345_progress_review_queue.sql`),
`lens_assessment_item_responses.school_id`/`.classroom_id` (`migrations/340_lens_assessment.sql`).

**What:** Since every app query scopes by tenant, these are the hottest predicates in the system and
several run without index support.

**Why it matters:** currently invisible — the largest school has ~20 children. It becomes a sequential
scan of a whole-fleet table the moment there are a few hundred schools, and the tables that hurt first
are the append-only ones (`montree_progress_events`, `montree_paper_scan_extractions`,
`montree_period_reports`).

**Fix:** `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_<tbl>_school ON <tbl>(school_id);` for each
(outside a transaction). Prefer composites matching the real access pattern, e.g.
`ON montree_child_progress (school_id, child_id)` and
`ON montree_paper_scan_extractions (school_id, created_at DESC)`.

---

### [SEV: LOW] Non-idempotent statements in files that are pasted by hand

**Where:** 15 `CREATE TABLE` without `IF NOT EXISTS` — `migrations/038_english_reports_complete.sql:25,86,100`
(each preceded by `DROP TABLE … CASCADE` at `:24,85,99`), `migrations/120_home_tables.sql:6-55`,
`supabase/migrations/096_parent_portal_fixes.sql:16`. Plus 93 `ALTER TABLE … ADD COLUMN` without
`IF NOT EXISTS`, concentrated in `011_curriculum_roadmap_v2.sql` (14), `002_multi_user_schema.sql`,
`004_simple_schools.sql`.

**What:** Re-pasting these aborts partway (`ADD COLUMN`) or destroys data (`038`'s drop-then-create).

**Why it matters:** low today, because these are all early files that have already run once. It matters
the moment someone tries to build a fresh environment by replaying the folder — which HIGH-3's fix
would make routine. `038` in particular would silently drop three English-progress tables.

**Fix:** covered by HIGH-3's `db/schema.sql` baseline — replay the baseline, not the journal. If a
replay path is wanted anyway, add `IF NOT EXISTS` to all 108 sites mechanically.

---

## Five things I am least sure about (need a live DB check)

1. **Whether `supabase/migrations/096_rls_policies.sql` was ever actually run.** CRITICAL-1's severity
   rests on those seven `*_service_role` policies existing in production. Settle it with:
   `SELECT tablename, policyname, roles, qual FROM pg_policies WHERE schemaname='public' ORDER BY 1,2;`
   — one query answers CRITICAL-1, HIGH-2 and MEDIUM-4 at once, and is the single highest-value check here.
2. **The real set of RLS-disabled tables.** My inventory is derived from migration files, and this repo's
   history proves the live schema diverges from them. Run
   `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
   AND c.relkind='r' AND NOT c.relrowsecurity ORDER BY 1;` and diff against the 16 tables in HIGH-1.
3. **Whether `montree_child_progress` actually has `unique_child_work`.** Migration `111` adds it, but
   `write-progress.ts:807-815` carries an explicit fallback for environments lacking it, which suggests
   it has been missing somewhere. `SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid = 'montree_child_progress'::regclass;`
4. **How many orphan rows the missing FKs (HIGH-4) have already produced**, and therefore whether the
   FK additions will fail or need a cleanup pass first — the three `LEFT JOIN … IS NULL` counts in that
   finding's Fix section.
5. **The definition of `montree_english_schedule`** and any other hand-created tables, i.e. the true
   size of the schema drift. `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
   diffed against the 368 `CREATE TABLE` names this audit extracted would list every table that exists
   in production but in no migration file.
