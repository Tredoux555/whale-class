-- 314_montree_evaluation_system.sql
-- Montree Milestones — developmental milestone check-ins, ages 3–5, with a parallel EFL track.
--
-- Fully idempotent. Safe to paste twice. Additive only: it creates new montree_-prefixed
-- tables and touches no existing table's data. Nothing here drops or rewrites anything.
--
-- Supersedes the dormant migration-034 `assessment_sessions` / `assessment_results` draft.
-- Those tables referenced a bare `children` table (pre-`montree_` convention) and were never
-- wired to a UI. They are LEFT IN PLACE by this migration — do not drop them here; confirm
-- they hold no production rows first. If you are reading 034 and 314 side by side and
-- wondering which is live: it is this one.
--
-- Feature key `child_evaluation`, default OFF. Turn it on per school in super-admin → ⚙️ Features.
--
-- Tenancy: school_id / classroom_id are stamped on EVERY table from day one, including the
-- child tables, because migration 311's postmortem is what happens when they are added later.
-- RLS is enabled with permissive policies to match house style; the API layer is the real
-- boundary (every route calls verifySchoolRequest + verifyChildBelongsToSchool).

BEGIN;

-- ─────────────────────────────────────────────────────────── bank versions ──
-- Which item bank produced a given result. A session records the version AND the checksum,
-- so a report can always be traced to the exact wording a child was checked against.
CREATE TABLE IF NOT EXISTS montree_evaluation_bank_versions (
  bank_version     TEXT PRIMARY KEY,
  bank_checksum    TEXT NOT NULL,
  schema_version   TEXT,
  item_count       INTEGER NOT NULL DEFAULT 0,
  milestone_count  INTEGER NOT NULL DEFAULT 0,
  stimulus_count   INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE montree_evaluation_bank_versions ADD COLUMN IF NOT EXISTS schema_version  TEXT;
ALTER TABLE montree_evaluation_bank_versions ADD COLUMN IF NOT EXISTS stimulus_count  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE montree_evaluation_bank_versions ADD COLUMN IF NOT EXISTS first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ───────────────────────────────────────────────────────────────  sessions ──
CREATE TABLE IF NOT EXISTS montree_evaluation_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID NOT NULL REFERENCES montree_schools(id)    ON DELETE CASCADE,
  classroom_id          UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  child_id              UUID NOT NULL REFERENCES montree_children(id)   ON DELETE CASCADE,
  administered_by_role  TEXT CHECK (administered_by_role IN ('teacher','principal','system')),
  administered_by_id    UUID,
  school_year           TEXT NOT NULL,
  window_code           TEXT NOT NULL CHECK (window_code IN ('autumn','winter','spring')),
  term_id               UUID,
  age_months            INTEGER NOT NULL CHECK (age_months BETWEEN 24 AND 84),
  age_band              TEXT NOT NULL CHECK (age_band IN ('A3','A4','A5')),
  form_code             TEXT NOT NULL DEFAULT 'A' CHECK (form_code IN ('A','B')),
  modules               TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  delivery_mode         TEXT NOT NULL DEFAULT 'tablet'
                        CHECK (delivery_mode IN ('tablet','paper','observation_only')),
  assessment_locale     TEXT NOT NULL DEFAULT 'en',
  bank_version          TEXT NOT NULL,
  bank_checksum         TEXT NOT NULL,
  client_bank_version   TEXT,
  client_bank_checksum  TEXT,
  source                TEXT NOT NULL DEFAULT 'montree_ui'
                        CHECK (source IN ('montree_ui','tablet_import','paper_entry')),
  status                TEXT NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress','completed','abandoned')),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  duration_seconds      INTEGER,
  map_percent           INTEGER CHECK (map_percent IS NULL OR map_percent BETWEEN 0 AND 100),
  map_denominator       INTEGER,
  map_suppressed        BOOLEAN NOT NULL DEFAULT FALSE,
  milestones_secure     INTEGER,
  milestones_developing INTEGER,
  milestones_emerging   INTEGER,
  milestones_unassessed INTEGER,
  milestones_exceeded   INTEGER,
  override_count        INTEGER NOT NULL DEFAULT 0,
  efl_map_percent       INTEGER CHECK (efl_map_percent IS NULL OR efl_map_percent BETWEEN 0 AND 100),
  efl_map_denominator   INTEGER,
  efl_map_suppressed    BOOLEAN NOT NULL DEFAULT FALSE,
  summary_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One check-in per child per window per delivery mode. Re-running an import updates in place.
  CONSTRAINT montree_evaluation_sessions_window_key
    UNIQUE (child_id, school_year, window_code, delivery_mode)
);

ALTER TABLE montree_evaluation_sessions ADD COLUMN IF NOT EXISTS client_bank_version  TEXT;
ALTER TABLE montree_evaluation_sessions ADD COLUMN IF NOT EXISTS client_bank_checksum TEXT;
ALTER TABLE montree_evaluation_sessions ADD COLUMN IF NOT EXISTS source               TEXT NOT NULL DEFAULT 'montree_ui';
ALTER TABLE montree_evaluation_sessions ADD COLUMN IF NOT EXISTS map_suppressed       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE montree_evaluation_sessions ADD COLUMN IF NOT EXISTS efl_map_suppressed   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE montree_evaluation_sessions ADD COLUMN IF NOT EXISTS override_count       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE montree_evaluation_sessions ADD COLUMN IF NOT EXISTS notes                TEXT;

-- ─────────────────────────────────────────────────────────  item responses ──
-- Raw evidence. One row per item the child (or the teacher, for oral and observation items)
-- responded to, INCLUDING items skipped by a stop rule (administered = FALSE). This table is
-- append-and-correct only: nothing in this module ever deletes a response, and no media is
-- stored here, so the delete-after-commit hazard from migration 311 cannot recur.
CREATE TABLE IF NOT EXISTS montree_evaluation_item_responses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES montree_evaluation_sessions(id) ON DELETE CASCADE,
  school_id             UUID NOT NULL,     -- denormalised tenancy stamp (migration-311 lesson)
  classroom_id          UUID NOT NULL,
  child_id              UUID NOT NULL,
  item_id               TEXT NOT NULL,     -- stable bank key, never free text
  milestone_id          TEXT,              -- observation items only; direct items map via the bank
  strand_id             TEXT NOT NULL,
  module_id             TEXT NOT NULL,
  age_band              TEXT NOT NULL,
  form_code             TEXT NOT NULL,     -- 'A' | 'B' | 'P' practice | 'O' observation
  item_type             TEXT NOT NULL CHECK (item_type IN
                          ('tap_choice','listen_do','teacher_scored_oral','observation_checklist')),
  response              JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {optionIds:[],sequence:[],rubricScore:n,band:'…'}
  points_awarded        INTEGER NOT NULL DEFAULT 0,          -- SERVER re-score, never the client's
  points_possible       INTEGER NOT NULL DEFAULT 0,
  is_correct            BOOLEAN,
  observed_band         TEXT CHECK (observed_band IS NULL OR observed_band IN ('emerging','developing','secure')),
  attempts              INTEGER NOT NULL DEFAULT 1,
  replay_count          INTEGER NOT NULL DEFAULT 0,
  latency_ms            INTEGER,
  administered          BOOLEAN NOT NULL DEFAULT TRUE,
  skipped_reason        TEXT,
  client_points_awarded INTEGER,           -- kept for audit; the server number is authoritative
  evidence_note         TEXT,
  evidence_media_id     UUID,              -- optional montree_media.id, referenced not copied
  answered_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT montree_evaluation_item_responses_key UNIQUE (session_id, item_id)
);

ALTER TABLE montree_evaluation_item_responses ADD COLUMN IF NOT EXISTS classroom_id          UUID;
ALTER TABLE montree_evaluation_item_responses ADD COLUMN IF NOT EXISTS milestone_id          TEXT;
ALTER TABLE montree_evaluation_item_responses ADD COLUMN IF NOT EXISTS observed_band         TEXT;
ALTER TABLE montree_evaluation_item_responses ADD COLUMN IF NOT EXISTS client_points_awarded INTEGER;
ALTER TABLE montree_evaluation_item_responses ADD COLUMN IF NOT EXISTS evidence_note         TEXT;
ALTER TABLE montree_evaluation_item_responses ADD COLUMN IF NOT EXISTS evidence_media_id     UUID;
ALTER TABLE montree_evaluation_item_responses ADD COLUMN IF NOT EXISTS created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ───────────────────────────────────────────────────── milestone results ──
-- The banded outcome. band_computed is what the bank's rules produced; band_final is what
-- the report shows. They differ only when a teacher overrode the result, which requires a
-- reason and is counted openly in funder reports rather than hidden.
CREATE TABLE IF NOT EXISTS montree_evaluation_milestone_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES montree_evaluation_sessions(id) ON DELETE CASCADE,
  school_id         UUID NOT NULL,
  classroom_id      UUID NOT NULL,
  child_id          UUID NOT NULL,
  school_year       TEXT NOT NULL,
  window_code       TEXT NOT NULL CHECK (window_code IN ('autumn','winter','spring')),
  milestone_id      TEXT NOT NULL,
  strand_id         TEXT NOT NULL,
  domain_id         TEXT NOT NULL,
  track             TEXT NOT NULL DEFAULT 'core' CHECK (track IN ('core','efl')),
  age_band          TEXT NOT NULL CHECK (age_band IN ('A3','A4','A5')),
  expectation       TEXT NOT NULL CHECK (expectation IN ('expected','emerging_edge','extension')),
  band_computed     TEXT CHECK (band_computed IN ('emerging','developing','secure','unassessed')),
  band_final        TEXT NOT NULL CHECK (band_final IN ('emerging','developing','secure','unassessed')),
  band_source       TEXT NOT NULL CHECK (band_source IN ('direct','observation','teacher_override')),
  override_reason   TEXT,
  override_by_role  TEXT CHECK (override_by_role IN ('teacher','principal','system')),
  override_by_id    UUID,
  coverage          NUMERIC(4,3),
  points_earned     INTEGER,
  points_possible   INTEGER,
  evidence_note     TEXT,
  evidence_media_id UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT montree_evaluation_milestone_results_key UNIQUE (session_id, milestone_id),
  -- An override without a reason is not an override. Enforced, not merely requested.
  CONSTRAINT montree_evaluation_override_needs_reason
    CHECK (band_source <> 'teacher_override' OR (override_reason IS NOT NULL AND length(btrim(override_reason)) > 0))
);

ALTER TABLE montree_evaluation_milestone_results ADD COLUMN IF NOT EXISTS classroom_id     UUID;
ALTER TABLE montree_evaluation_milestone_results ADD COLUMN IF NOT EXISTS school_year      TEXT;
ALTER TABLE montree_evaluation_milestone_results ADD COLUMN IF NOT EXISTS window_code      TEXT;
ALTER TABLE montree_evaluation_milestone_results ADD COLUMN IF NOT EXISTS override_by_role TEXT;
ALTER TABLE montree_evaluation_milestone_results ADD COLUMN IF NOT EXISTS override_by_id   UUID;

-- ────────────────────────────────────────────────────────────────  indexes ──
CREATE INDEX IF NOT EXISTS idx_meval_sessions_child
  ON montree_evaluation_sessions (child_id, school_year, window_code);
CREATE INDEX IF NOT EXISTS idx_meval_sessions_school
  ON montree_evaluation_sessions (school_id, status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_meval_sessions_class
  ON montree_evaluation_sessions (classroom_id, school_year, window_code);
CREATE INDEX IF NOT EXISTS idx_meval_sessions_cohort
  ON montree_evaluation_sessions (school_id, school_year, window_code, status);

CREATE INDEX IF NOT EXISTS idx_meval_responses_session
  ON montree_evaluation_item_responses (session_id);
CREATE INDEX IF NOT EXISTS idx_meval_responses_school
  ON montree_evaluation_item_responses (school_id, item_id);
CREATE INDEX IF NOT EXISTS idx_meval_responses_child
  ON montree_evaluation_item_responses (child_id, answered_at DESC);

CREATE INDEX IF NOT EXISTS idx_meval_results_child
  ON montree_evaluation_milestone_results (child_id, milestone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meval_results_school
  ON montree_evaluation_milestone_results (school_id, track, band_final);
CREATE INDEX IF NOT EXISTS idx_meval_results_session
  ON montree_evaluation_milestone_results (session_id);
CREATE INDEX IF NOT EXISTS idx_meval_results_cohort
  ON montree_evaluation_milestone_results (school_id, school_year, window_code, domain_id);
CREATE INDEX IF NOT EXISTS idx_meval_results_growth
  ON montree_evaluation_milestone_results (child_id, school_year, window_code);

-- ───────────────────────────────────────────────────────  updated_at touch ──
CREATE OR REPLACE FUNCTION fn_montree_evaluation_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_meval_sessions_updated ON montree_evaluation_sessions;
CREATE TRIGGER trg_meval_sessions_updated
  BEFORE UPDATE ON montree_evaluation_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_montree_evaluation_touch_updated_at();

DROP TRIGGER IF EXISTS trg_meval_results_updated ON montree_evaluation_milestone_results;
CREATE TRIGGER trg_meval_results_updated
  BEFORE UPDATE ON montree_evaluation_milestone_results
  FOR EACH ROW EXECUTE FUNCTION fn_montree_evaluation_touch_updated_at();

-- ────────────────────────────────────────────────────────────────────  RLS ──
-- House style: RLS on for Supabase Advisor hygiene; the service-role key bypasses it and the
-- API layer enforces tenancy. Do NOT treat these policies as a security boundary — every
-- route filters by school_id explicitly and calls verifyChildBelongsToSchool().
ALTER TABLE montree_evaluation_bank_versions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_evaluation_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_evaluation_item_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_evaluation_milestone_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role all on meval_bank_versions" ON montree_evaluation_bank_versions;
CREATE POLICY "Service role all on meval_bank_versions"
  ON montree_evaluation_bank_versions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role all on meval_sessions" ON montree_evaluation_sessions;
CREATE POLICY "Service role all on meval_sessions"
  ON montree_evaluation_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role all on meval_item_responses" ON montree_evaluation_item_responses;
CREATE POLICY "Service role all on meval_item_responses"
  ON montree_evaluation_item_responses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role all on meval_milestone_results" ON montree_evaluation_milestone_results;
CREATE POLICY "Service role all on meval_milestone_results"
  ON montree_evaluation_milestone_results FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────  feature flag ──
-- Default OFF. Enable per school: super-admin → Schools → ⚙️ Features → Montree Milestones.
-- `name` is NOT NULL on this table — omitting it is how migration 224 failed the first time.
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  ('child_evaluation',
   'Montree Milestones',
   'Three-times-a-year developmental milestone check-ins, with a Growth Story for parents and a Cohort Milestone Report for funders.',
   'ClipboardCheck',
   'assessment',
   false,
   false)
ON CONFLICT (feature_key) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      icon        = EXCLUDED.icon,
      category    = EXCLUDED.category;

-- ────────────────────────────────────────────────────────────────  comments ──
COMMENT ON TABLE montree_evaluation_bank_versions IS
  'Montree Milestones: every item-bank version ever used to produce a result. bank_checksum ties a stored band back to the exact milestone wording the child was checked against.';
COMMENT ON TABLE montree_evaluation_sessions IS
  'Montree Milestones: one check-in (a 1-on-1 sitting of up to ~15 minutes, or a window of observation). Criterion-referenced — no percentiles, no norms, no peer ranking. map_percent is NULL whenever map_suppressed is true (n below 12); milestones_unassessed is always populated so nothing is silently dropped.';
COMMENT ON TABLE montree_evaluation_item_responses IS
  'Montree Milestones: raw per-item evidence, including items skipped by a stop rule (administered = FALSE). points_awarded is always the SERVER re-score from item-bank.json; client_points_awarded keeps what the tablet thought, for audit only. Nothing in this module deletes rows here.';
COMMENT ON TABLE montree_evaluation_milestone_results IS
  'Montree Milestones: one banded outcome per milestone per check-in. band_computed = the bank rules; band_final = what the report shows. They differ only on a teacher override, which requires a reason and is counted openly in funder reports.';

COMMENT ON COLUMN montree_evaluation_sessions.map_percent IS
  'Milestone Attainment Profile: round-to-5 percentage of at-band EXPECTED milestones securely met. NULL when suppressed. Never quote it without map_denominator.';
COMMENT ON COLUMN montree_evaluation_sessions.map_suppressed IS
  'TRUE when the denominator fell below the suppression threshold (12), or for EFL below age band A5. The reason is carried in summary_json.';
COMMENT ON COLUMN montree_evaluation_sessions.efl_map_percent IS
  'English track figure. Computed and reported SEPARATELY; never merged into map_percent.';
COMMENT ON COLUMN montree_evaluation_sessions.summary_json IS
  'Server-computed SessionSummary: MAP for both tracks with suppression reasons, per-domain and per-strand roll-ups, band counts, override count, and growth against the previous window.';
COMMENT ON COLUMN montree_evaluation_item_responses.administered IS
  'FALSE = never put in front of the child (stop rule, or the teacher ended the sitting). Partial sittings are valid data; unadministered items lower coverage rather than counting as failures.';
COMMENT ON COLUMN montree_evaluation_milestone_results.coverage IS
  'administered evidence items / declared evidence items for this form. Below 0.5 the milestone is unassessed and leaves every denominator.';
COMMENT ON COLUMN montree_evaluation_milestone_results.band_source IS
  'direct = derived from item evidence; observation = teacher best-fit judgement against three written descriptors; teacher_override = a teacher replaced the derived band and gave a reason.';

COMMIT;

-- ─────────────────────────────────────────────────────────────── verification
-- Run after pasting; expect 4 rows, then one row with default_enabled = false.
--
-- SELECT table_name FROM information_schema.tables
--  WHERE table_name LIKE 'montree_evaluation%' ORDER BY table_name;
--
-- SELECT feature_key, name, default_enabled
--   FROM montree_feature_definitions WHERE feature_key = 'child_evaluation';
--
-- Enable for one pilot school:
-- INSERT INTO montree_school_features (school_id, feature_key, enabled)
-- VALUES ('<school-uuid>', 'child_evaluation', true)
-- ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = EXCLUDED.enabled;
