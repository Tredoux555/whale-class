-- 254_missing_tables_batch.sql  (= db/RUN_THESE/07_missing_tables_batch.sql)
-- Jun 12, 2026 — burn item T2-5: stage SQL for referenced-but-missing tables.
--
-- ⚠️  STATUS: STAGED ONLY — PENDING TREDOUX SUPABASE RUN. Nothing here has
--     been applied to production. Run in the Supabase SQL editor.
--
-- Source of truth: AUDIT-2026-06/FUNCTIONALITY-whale-db-crosscheck.md, which
-- ranked 21 tables referenced in code but absent from the live DB (verified
-- against the Jun-11 240-table production export).
--
-- Triage result (every code path re-read tonight, Jun 12):
--   * 3 tables already staged in db/RUN_THESE/01_create_application_tables.sql
--     (montree_npo_applications, montree_reduced_rate_applications,
--      montree_impact_fund_transactions) — NOT duplicated here.
--   * Of the remaining 18, exactly ONE table has BOTH a live UI wired to it
--     AND a fully-built backend: montree_campaign_items. It is staged below.
--   * Everything else is a wrong-name bug (fix the code, not the DB), a
--     half-built feature (creating the table would not make the flow work),
--     or a backend that nothing in the UI calls (dead on both ends).
--     Creating empty tables for those would HIDE bugs, not fix features.
--     Full do-not-stage list with reasons at the bottom of this file;
--     companion analysis in docs/ORPHAN_TABLES_REPORT.md.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, guarded seed, safe to re-run.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- TABLE 1 of 1: montree_campaign_items
-- ═══════════════════════════════════════════════════════════════════
-- Used by:
--   * app/api/montree/super-admin/campaign/route.ts  (GET/POST/PATCH/DELETE —
--     full CRUD, every method touches this table)
--   * app/montree/super-admin/marketing/campaign-manager/page.tsx  (live page)
--   * components/montree/super-admin/CampaignTab.tsx                (live tab)
--
-- Severity: Tier 3 in the crosscheck — super-admin page with live UI, hard
-- failure. Today every load of the Campaign Command Center gets
-- `migration_pending: true` (the route special-cases Postgres 42P01
-- "relation does not exist") and every create/update returns 503
-- "Run migration 231 first".
--
-- What starts working once it exists: the Campaign Command Center — the
-- video-marketing rollout tracker (ideas → scripted → filmed → scheduled →
-- posted) for the 13-video Montree launch campaign, including progress
-- stats, "next up" and overdue detection.
--
-- NOTE: this DDL is identical to migrations/231_campaign_command_center.sql,
-- which exists in the repo but was never applied to prod. Running EITHER
-- file once is sufficient; both are idempotent, so running both is harmless.
-- Column/constraint cross-check against the route (Jun 12): title NOT NULL;
-- video_type ∈ hero|feature; status ∈ idea|scripted|filmed|scheduled|posted;
-- platforms text[] ⊆ {tiktok,reels,shorts,linkedin}; tier/sort_order int;
-- scheduled_for date; posted_at stamped by the route on status='posted'.
-- All match the CampaignItem interface in the route exactly.

CREATE TABLE IF NOT EXISTS montree_campaign_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  -- which Montree feature this video showcases (NULL for the hero video)
  feature_key   text,
  video_type    text NOT NULL DEFAULT 'feature'
                  CHECK (video_type IN ('hero', 'feature')),
  -- marketing tier 1-4, used to sequence the rollout (1 = launch first)
  tier          int,
  -- the script content itself — the tool is the system of record
  script        text,
  status        text NOT NULL DEFAULT 'idea'
                  CHECK (status IN ('idea', 'scripted', 'filmed', 'scheduled', 'posted')),
  -- target platforms: tiktok | reels | shorts | linkedin
  platforms     text[] NOT NULL DEFAULT '{}',
  scheduled_for date,
  posted_at     timestamptz,
  sort_order    int NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes derived from the route's query patterns:
--   GET orders by (sort_order, created_at); overdue scan filters on
--   scheduled_for < today AND status != 'posted'; status counts group on status.
CREATE INDEX IF NOT EXISTS idx_campaign_items_sort
  ON montree_campaign_items (sort_order);
CREATE INDEX IF NOT EXISTS idx_campaign_items_status
  ON montree_campaign_items (status);
CREATE INDEX IF NOT EXISTS idx_campaign_items_scheduled
  ON montree_campaign_items (scheduled_for)
  WHERE scheduled_for IS NOT NULL;

-- Auto-bump updated_at on every UPDATE (same pattern as 252/253).
CREATE OR REPLACE FUNCTION montree_campaign_items_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaign_items_touch ON montree_campaign_items;
CREATE TRIGGER trg_campaign_items_touch
  BEFORE UPDATE ON montree_campaign_items
  FOR EACH ROW
  EXECUTE FUNCTION montree_campaign_items_touch_updated_at();

-- RLS: deny-all for anon/authenticated; the route uses the service-role key
-- which has BYPASSRLS. Same house pattern as migrations 251/252/253 and the
-- 2026-06-10 RLS lockdown phases. (231 predates the lockdown and lacked
-- this line — one more reason to prefer running this file.)
ALTER TABLE montree_campaign_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE montree_campaign_items IS
  'Campaign Command Center — super-admin video-marketing rollout tracker. One row per campaign video; the script column is the system of record. Backs /api/montree/super-admin/campaign.';

-- Seed the 13-video rollout (1 hero + 12 feature videos), ranked by
-- marketing value. The WHERE NOT EXISTS guard makes re-runs a no-op.
INSERT INTO montree_campaign_items (title, feature_key, video_type, tier, status, platforms, sort_order)
SELECT * FROM (VALUES
  ('Montree — Front Page Hero',        NULL::text,             'hero',    NULL::int, 'idea', ARRAY['tiktok','reels','shorts','linkedin'], 0),
  ('Smart Capture — snap a photo',     'smart_capture',        'feature', 1,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 1),
  ('AI Weekly Reports',                'weekly_reports',       'feature', 1,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 2),
  ('Guru — the AI teaching assistant', 'guru',                 'feature', 1,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 3),
  ('Child Profiles & Progress',        'child_progress',       'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 4),
  ('Tracy — the principal''s AI',      'tracy',                'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 5),
  ('Curriculum & Planning',            'curriculum',           'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 6),
  ('Communication Network',            'communication',        'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 7),
  ('Voice Onboarding',                 'voice_onboarding',     'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 8),
  ('English Progression Tracker',      'english_progression',  'feature', 3,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 9),
  ('Appointments & Video Calls',       'appointments',         'feature', 3,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 10),
  ('Library Teaching Tools',           'library_tools',        'feature', 3,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 11),
  ('Multilingual — 12 languages',      'multilingual',         'feature', 3,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 12)
) AS seed(title, feature_key, video_type, tier, status, platforms, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM montree_campaign_items);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- APPENDIX — missing tables DELIBERATELY NOT STAGED (and why)
-- ═══════════════════════════════════════════════════════════════════
-- Crosscheck rank → table → decision. None of these get DDL in this file.
--
-- WRONG-NAME BUGS — fix the CODE, do not create a second table:
--   #4  montree_child_parent_links   — ALREADY FIXED in code: the three
--       weekly-report send routes now query montree_parent_children
--       (see comments in app/api/montree/reports/send/route.ts:576 etc.).
--       Creating this table now would be pure dead weight.
--   #5  montree_works                — legacy name. Real data lives in
--       montree_classroom_curriculum_works. Creating an EMPTY montree_works
--       would make guru-executor.ts:739 / pattern-learner.ts:390 return
--       empty results "successfully" — hiding the bug forever. Fix: point
--       the two queries at the real table.
--   #6  montree_feature_toggles      — real table is montree_feature_definitions
--       (exists in prod, used 6×). Same trap as #5: an empty look-alike
--       table would silently break Guru's feature-toggle tool worse than
--       the current loud error. Fix in lib/montree/admin/guru-executor.ts:651
--       (+ the table allowlists in guru-tools.ts / guru-prompt.ts).
--
-- HALF-BUILT FEATURE — table alone cannot unlock the flow:
--   #8  montree_work_imports, #9 montree_custom_curriculum,
--   #10 montree_student_aliases — the photo-based curriculum-import wizard
--       (app/admin/curriculum-import/page.tsx). Verified tonight: there is
--       NO insert path anywhere for montree_custom_curriculum (no API route,
--       no script), and the wizard's phase-1 gate (`lock_curriculum`)
--       requires curriculum items to exist — so even with all three tables
--       created the wizard dead-ends at step 1 with "Cannot lock curriculum
--       — no items added". Repo has migrations/0096_curriculum_import.sql
--       ready if/when the curriculum-add endpoint is built. Until then:
--       finish the feature or delete the wizard. (Related:
--       montree_curriculum_imports from 0096 already EXISTS in prod — it is
--       referenced by lib/montree/account-deletion.ts:194 and was not in the
--       audit's missing list. Also note the school-delete cascade in
--       app/api/montree/super-admin/schools/route.ts deletes these tables
--       by school_id, but 0096 keys them by classroom_id/child_id — the
--       cascade's .eq('school_id') would warn-and-noop; FK ON DELETE CASCADE
--       does the real cleanup. Worth reconciling when the feature is revived.)
--
-- SUPERSEDED LEGACY SURFACE — recommend deleting the routes instead:
--   #11 classroom_curriculum, #12 users — legacy "whale" school system
--       (principal onboarding, admin user management, quick-place). The
--       montree_* system replaced all of it; legacy login doesn't even use
--       the users table. Restoring tables would resurrect a dead product.
--
-- DEAD ON THE UI END — backend exists, nothing calls it; recommend deleting
-- the dead code (or consciously shipping the feature) instead of staging:
--   #13 montree_phonics_words, #14 montree_phonics_images — phonics
--       word/image API; no frontend caller. migrations/139_phonics_teacher_words.sql
--       is ready if the feature ever ships.
--   #15 montree_super_admin_sessions, #16 montree_super_admin_config —
--       alternate TOTP/2FA super-admin auth; prod uses the env-password JWT
--       path in lib/verify-super-admin.ts. Delete the dead route, or make a
--       deliberate decision to ship 2FA (migrations/099_super_admin_security.sql).
--   #17 montree_npo_outreach — NPO outreach CRM route; no frontend caller.
--   #18 montree_announcements — parent announcements; route gracefully
--       returns [], no frontend caller. Cosmetic.
--
-- BY DESIGN / NOT WORTH A TABLE YET:
--   #19 montree_bank_statements — reconciliation route reads it inside
--       try/catch with an explicit "table not built yet" comment, and there
--       is NO upload/insert path anywhere. Creating it now changes nothing
--       (it would just always be empty). Stage it together with the upload
--       endpoint when bank reconciliation is actually built.
--   #20 montree_sessions — Guru enrichment marked "optional" in code.
--   #21 montree_child_photos — only a one-off maintenance script; real
--       photo tables are montree_media / montree_photo_bank.
