-- Migration 277: tighten "RLS policy always true" warnings. RUN AFTER 275 + 276.
-- Drops overly-permissive policies granting anon/authenticated broad access. App uses the
-- service-role key (bypasses RLS) so it is UNAFFECTED. RLS stays ON (idempotent ENABLE).
-- KEPT ON PURPOSE: parent_signups "Anyone can submit parent signup" (public intake form).
-- Transaction-free + idempotent on purpose (paste-safe; re-runnable). Supabase SQL Editor.

ALTER TABLE IF EXISTS public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can do everything on activities" ON public.activities;
ALTER TABLE IF EXISTS public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can do everything on skills" ON public.skills;
ALTER TABLE IF EXISTS public.skill_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can do everything on skill_categories" ON public.skill_categories;
ALTER TABLE IF EXISTS public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on schools" ON public.schools;
ALTER TABLE IF EXISTS public.montree_feature_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access on montree_feature_definitions" ON public.montree_feature_definitions;
ALTER TABLE IF EXISTS public.montree_teacher_classrooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher_classrooms_service_role" ON public.montree_teacher_classrooms;
ALTER TABLE IF EXISTS public.montree_work_translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated manage translations" ON public.montree_work_translations;
ALTER TABLE IF EXISTS public.montree_billing_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_service_role" ON public.montree_billing_history;
ALTER TABLE IF EXISTS public.montree_report_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can manage tokens" ON public.montree_report_tokens;
ALTER TABLE IF EXISTS public.montree_parent_children ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all parent_children operations" ON public.montree_parent_children;
ALTER TABLE IF EXISTS public.montree_parent_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all invite operations" ON public.montree_parent_invites;
ALTER TABLE IF EXISTS public.montree_child_focus_works ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers can manage focus works" ON public.montree_child_focus_works;
ALTER TABLE IF EXISTS public.montree_child_sensitive_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers can insert sensitive periods" ON public.montree_child_sensitive_periods;
DROP POLICY IF EXISTS "Teachers can update sensitive periods" ON public.montree_child_sensitive_periods;
ALTER TABLE IF EXISTS public.montree_weekly_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can insert analysis" ON public.montree_weekly_analysis;
DROP POLICY IF EXISTS "System can update analysis" ON public.montree_weekly_analysis;
ALTER TABLE IF EXISTS public.home_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "home_activity_all" ON public.home_activity_log;
ALTER TABLE IF EXISTS public.home_child_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "home_progress_all" ON public.home_child_progress;
ALTER TABLE IF EXISTS public.home_children ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "home_children_all" ON public.home_children;
ALTER TABLE IF EXISTS public.home_curriculum ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "home_curriculum_all" ON public.home_curriculum;
ALTER TABLE IF EXISTS public.home_curriculum_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "home_curriculum_master_all" ON public.home_curriculum_master;
ALTER TABLE IF EXISTS public.home_families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "home_families_all" ON public.home_families;
ALTER TABLE IF EXISTS public.game_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Insert own progress" ON public.game_progress;
DROP POLICY IF EXISTS "Update own progress" ON public.game_progress;
ALTER TABLE IF EXISTS public.school_curriculum ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert school curriculum" ON public.school_curriculum;
DROP POLICY IF EXISTS "Anyone can update school curriculum" ON public.school_curriculum;
ALTER TABLE IF EXISTS public.parent_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can update parent signups" ON public.parent_signups;
DROP POLICY IF EXISTS "Authenticated users can delete parent signups" ON public.parent_signups;
