-- 336_sheet_layouts_and_work_sessions.sql
-- All-Areas Visual Reports + two-layer sheet reading — data model.
-- Plan: docs/handoffs/PLAN_ALL_AREAS_REPORTS_AUG22.md §2 (Aug 22, 2026).
--
-- WHAT THIS ADDS
--   1. montree_sheet_layouts          — learned observation-sheet layout profile per
--                                       classroom / school (Layer 1 prompt artefact).
--   2. montree_paper_scan_extractions — widened with frequency / time_bucket /
--                                       concentration; montree_paper_scans gains layout_id.
--   3. montree_observation_sessions   — the frequency/time FACT table. One row = a child
--                                       did a work on a day. montree_progress_events stays
--                                       a status-change journal; montree_child_progress
--                                       stays current-state only.
--                                       NOTE: named *observation* sessions because a legacy
--                                       montree_work_sessions table (migration 060 / 071:
--                                       child_id, work_id, duration_minutes, notes,
--                                       observed_at …) already exists in production and is
--                                       read by the analysis/progress/sessions/guru/tracy
--                                       routes. Do not reuse that name.
--   4. montree_period_reports         — cached aggregator output + AI lines per
--                                       classroom × week|month.
--   5. 'period_reports' feature flag  — default OFF.
--
-- SECURITY POSTURE: same as 313/314/318 — RLS ENABLED with ZERO policies, so anon /
-- authenticated keys read nothing; every access goes through an API route that has
-- already run verifySchoolRequest with the service-role client.
--
-- Applied by pasting into the Supabase SQL Editor. Fully idempotent — every CREATE is
-- IF NOT EXISTS, every ADD COLUMN is IF NOT EXISTS, every INSERT is ON CONFLICT DO
-- NOTHING. Safe to paste twice.
--
-- PREREQUISITE: migration 314_institutional_foundations.sql (montree_progress_events +
-- montree_migrations ledger). Verify with:  select count(*) from montree_progress_events;

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Learned observation-sheet layout profiles (Layer 1)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_sheet_layouts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        uuid NOT NULL,
  classroom_id     uuid,                      -- NULL = school-wide default
  name             text NOT NULL,             -- "Montree Standard v1", "Whale Class paper form"
  source           text NOT NULL DEFAULT 'learned'
                     CHECK (source IN ('builtin','learned','edited')),
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','active','retired')),
  version          int  NOT NULL DEFAULT 1,
  template_code    text,                      -- printed/QR code e.g. "MT-STD-1"; NULL for foreign sheets
  profile          jsonb NOT NULL,            -- SheetLayoutProfile (lib/montree/paper-scan/layout-types.ts)
  sample_paths     text[] NOT NULL DEFAULT '{}', -- storage paths of the 1-3 teaching photos (kept, unlike scan photos)
  model            text,
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sheet_layouts_classroom ON montree_sheet_layouts (classroom_id, status);
CREATE INDEX IF NOT EXISTS idx_sheet_layouts_school    ON montree_sheet_layouts (school_id, status);
-- at most one ACTIVE profile per classroom
CREATE UNIQUE INDEX IF NOT EXISTS uq_sheet_layouts_active_classroom
  ON montree_sheet_layouts (classroom_id) WHERE status = 'active' AND classroom_id IS NOT NULL;
ALTER TABLE montree_sheet_layouts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE montree_sheet_layouts IS
  'Learned observation-sheet layout profiles (Layer 1). JSONB profile is injected into the Layer 2 extraction prompt. At most one active profile per classroom (partial unique index).';
COMMENT ON COLUMN montree_sheet_layouts.sample_paths IS
  'Storage paths of the teaching photos. Retained (unlike scan photos, which are deleted at commit) — teach with blank or anonymised sheets.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Extraction staging: frequency / bucket / concentration (Layer 2)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE montree_paper_scan_extractions ADD COLUMN IF NOT EXISTS frequency     int;   -- tally count on the sheet, NULL = not marked
ALTER TABLE montree_paper_scan_extractions ADD COLUMN IF NOT EXISTS time_bucket   text CHECK (time_bucket IS NULL OR time_bucket IN ('short','medium','long'));
ALTER TABLE montree_paper_scan_extractions ADD COLUMN IF NOT EXISTS concentration text CHECK (concentration IS NULL OR concentration IN ('wd','wc','dc'));
ALTER TABLE montree_paper_scans ADD COLUMN IF NOT EXISTS layout_id uuid;   -- profile used for this scan (NULL = generic)

COMMENT ON COLUMN montree_paper_scan_extractions.frequency IS
  'Tally strokes / ticks for this work on the sheet. NULL = sheet has no tally.';
COMMENT ON COLUMN montree_paper_scan_extractions.time_bucket IS
  'short (<15 min) | medium (15-30) | long (30+). Exact minutes stay in time_minutes.';
COMMENT ON COLUMN montree_paper_scan_extractions.concentration IS
  'AMI concentration code: wd = wandering, wc = working with concentration, dc = deep concentration.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Observation sessions — the frequency/time fact table. One row = child did work on a day.
-- (Distinct from legacy montree_work_sessions — see header.)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_observation_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      uuid NOT NULL,
  classroom_id   uuid NOT NULL,
  child_id       uuid NOT NULL,
  work_key       text,
  work_name      text NOT NULL,
  area           text NOT NULL CHECK (area IN ('practical_life','sensorial','mathematics','language','cultural')),
  occurred_on    date NOT NULL,
  frequency      int  NOT NULL DEFAULT 1 CHECK (frequency >= 1),   -- tally marks that day
  time_bucket    text CHECK (time_bucket IS NULL OR time_bucket IN ('short','medium','long')),
  minutes_est    int,                         -- bucket midpoint (10/22/40) × frequency, or exact minutes when written
  concentration  text CHECK (concentration IS NULL OR concentration IN ('wd','wc','dc')),
  status_mark    text CHECK (status_mark IS NULL OR status_mark IN ('presented','practicing','mastered')),
  source         text NOT NULL DEFAULT 'paper_scan',  -- paper_scan | photo | voice | manual
  scan_id        uuid,
  extraction_id  uuid,
  note           text,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_observation_sessions_classroom_day ON montree_observation_sessions (classroom_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_observation_sessions_child_day     ON montree_observation_sessions (child_id, occurred_on DESC);
-- re-committing the same extraction must not double count
CREATE UNIQUE INDEX IF NOT EXISTS uq_observation_sessions_extraction ON montree_observation_sessions (extraction_id) WHERE extraction_id IS NOT NULL;
ALTER TABLE montree_observation_sessions ENABLE ROW LEVEL SECURITY;

-- No FKs by design (same reasoning as montree_progress_events in 314): a fact row must
-- outlive the scan/extraction that produced it, and a session write must never be able
-- to fail the progress write it accompanies.
COMMENT ON TABLE montree_observation_sessions IS
  'Frequency/time fact table: one row per child × work × day. Read by lib/montree/reports/period-aggregator.ts. Written at paper-scan commit (and later photo/voice/manual).';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Cached period reports (classroom × week|month), aggregator output + AI lines
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_period_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL,
  classroom_id  uuid NOT NULL,
  period_type   text NOT NULL CHECK (period_type IN ('week','month')),
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  data          jsonb NOT NULL,          -- PeriodAggregate (lib/montree/reports/period-aggregator.ts)
  ai_lines      jsonb NOT NULL DEFAULT '{}', -- { child_id: "≤20-word line" }
  generated_at  timestamptz NOT NULL DEFAULT now(),
  generated_by  uuid,
  UNIQUE (classroom_id, period_type, period_start)
);
ALTER TABLE montree_period_reports ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE montree_period_reports IS
  'Cache of aggregatePeriod() output plus optional AI one-liners per classroom × period. Separate from montree_weekly_reports (child × week, teacher|parent CHECK) on purpose.';

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Feature flag (mirrors 327 column list; ON CONFLICT DO NOTHING like 308/325/327)
-- Default OFF until Phase 5 passes on Whale Class.
-- icon is rendered as literal text by both switchboards (app/montree/admin/features,
-- SchoolFeaturesModal) so it must be an emoji like every sibling row, not a lucide
-- name. category 'reporting' is the one SchoolFeaturesModal.categoryOrder knows.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES ('period_reports', 'Weekly & Monthly Report',
        'Visual one-pager per classroom: where each child spent time across the five areas and how their work moved.',
        '📊', 'reporting', false, false)
ON CONFLICT (feature_key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Ledger
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO montree_migrations (filename) VALUES ('336_sheet_layouts_and_work_sessions.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;
