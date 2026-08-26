-- migrations/340_lens_assessment.sql
-- Montree Lens — the milestone check-in, inside Lens.
--
-- Purely additive. One transaction, idempotent, every object prefixed `lens_`.
-- Nothing here ALTERs, DROPs or widens anything that already exists, and no
-- montree_* / tp_* / cms_* table is referenced.
--
-- 🚨 DEPENDS ON 339_lens_v1.sql. The foreign keys below point at lens_observers,
-- lens_schools and lens_classrooms, so 339 must have been run on this database
-- first. Everything else in this file — including the touch function — is
-- restated here so the file can be pasted on its own.
--
-- WHAT THIS IS. Montree Milestones (migration 314) is the same instrument for the
-- Montree product: a child sits with a teacher for ten minutes and the server
-- bands each milestone from the shared item bank. Lens gets its own copy of the
-- three storage tables because Lens has NO CHILD ROSTER — a Lens observer walks
-- into a school she does not administer, so a check-in is filed against a
-- free-text `child_alias` she types, never a montree_children row. The scoring
-- code is shared (lib/montree/evaluation/*); only the storage and the auth are
-- duplicated.
--
-- Column shapes mirror migration 314 deliberately so the two can be compared
-- side by side and so the shared scorer writes identical values into both.
-- Two differences, both intentional:
--   • observer_id + child_alias replace school_id-as-tenant + child_id.
--   • classroom_id is NULLABLE. An observer may run a check-in for a child
--     without pinning which room they were in; forcing a room would produce a
--     wrong one rather than an honest blank.
--
-- Tenancy: EVERY table carries observer_id, denormalised, from day one. That is
-- the migration-311 lesson and it is what lets the API filter every read by the
-- signed-in observer without a join.
--
-- RLS: enabled with NO policies, exactly as 339 does it. Lens has no Supabase
-- user; it authenticates its observer with a signed cookie and reads through the
-- service role, which bypasses RLS. anon and authenticated get nothing at all.

BEGIN;

-- ---------------------------------------------------------------- sessions --
-- One check-in: one child alias, one sitting (or one window of observation).
CREATE TABLE IF NOT EXISTS lens_assessment_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_id           UUID NOT NULL REFERENCES lens_observers(id)  ON DELETE CASCADE,
  school_id             UUID NOT NULL REFERENCES lens_schools(id)    ON DELETE CASCADE,
  -- Nullable on purpose: see the header note.
  classroom_id          UUID REFERENCES lens_classrooms(id)          ON DELETE SET NULL,
  -- The whole child-identification story. Free text she types, exactly like
  -- lens_moments.child_alias. There is no lens_children table and there is not
  -- going to be one: a visiting consultant has no roster and no right to build
  -- one out of somebody else's enrolment data.
  child_alias           TEXT NOT NULL CHECK (length(btrim(child_alias)) > 0),
  child_age_months      INTEGER CHECK (child_age_months IS NULL OR child_age_months BETWEEN 24 AND 84),
  school_year           TEXT NOT NULL,
  window_code           TEXT NOT NULL DEFAULT 'autumn'
                        CHECK (window_code IN ('autumn','winter','spring')),
  -- All four bands from day one. Migration 314 shipped A3–A5 and had to be
  -- widened by 322 for Grade 1; there is no reason to repeat that here.
  age_band              TEXT NOT NULL CHECK (age_band IN ('A3','A4','A5','G1')),
  form_code             TEXT NOT NULL DEFAULT 'A' CHECK (form_code IN ('A','B')),
  modules               TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  delivery_mode         TEXT NOT NULL DEFAULT 'tablet'
                        CHECK (delivery_mode IN ('tablet','paper','observation_only')),
  -- 'lens_ui' is this product's twin of Montree's 'montree_ui'.
  source                TEXT NOT NULL DEFAULT 'lens_ui'
                        CHECK (source IN ('lens_ui','tablet_import','paper_entry')),
  assessment_locale     TEXT NOT NULL DEFAULT 'en',
  bank_version          TEXT NOT NULL,
  bank_checksum         TEXT NOT NULL,
  client_bank_version   TEXT,
  client_bank_checksum  TEXT,
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
  summary_json          JSONB NOT NULL DEFAULT '{}'::JSONB,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 🚨 NO (child, year, window, mode) UNIQUE CONSTRAINT, unlike migration 314.
-- Montree can enforce one check-in per child per window because `child_id` is a
-- real identity. `child_alias` is not: two children in the same school may both
-- be typed "Ana", and a unique index over a free-text name would silently merge
-- their records — which is precisely the failure this product must never have.
-- Re-running a check-in makes a NEW row, and the API resumes by session id.

CREATE INDEX IF NOT EXISTS idx_lens_assess_sessions_observer
  ON lens_assessment_sessions (observer_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lens_assess_sessions_status
  ON lens_assessment_sessions (observer_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lens_assess_sessions_school
  ON lens_assessment_sessions (school_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_lens_assess_sessions_classroom
  ON lens_assessment_sessions (classroom_id, started_at DESC);
-- The growth lookup: "the same alias, at the same school, in an earlier window".
CREATE INDEX IF NOT EXISTS idx_lens_assess_sessions_alias
  ON lens_assessment_sessions (observer_id, school_id, child_alias, school_year, window_code);

-- --------------------------------------------------------- item responses --
-- Raw evidence, one row per item, INCLUDING items a stop rule skipped
-- (administered = FALSE). Append-and-correct only: nothing in this feature ever
-- deletes a response, and no media is stored here.
CREATE TABLE IF NOT EXISTS lens_assessment_item_responses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL REFERENCES lens_assessment_sessions(id) ON DELETE CASCADE,
  observer_id           UUID NOT NULL,     -- denormalised tenancy stamp
  school_id             UUID NOT NULL,
  classroom_id          UUID,
  child_alias           TEXT NOT NULL,
  item_id               TEXT NOT NULL,     -- stable item-bank key, never free text
  milestone_id          TEXT,              -- observation items only
  strand_id             TEXT NOT NULL,
  module_id             TEXT NOT NULL,
  age_band              TEXT NOT NULL,
  form_code             TEXT NOT NULL,     -- 'A' | 'B' | 'P' practice | 'O' observation
  item_type             TEXT NOT NULL CHECK (item_type IN
                          ('tap_choice','listen_do','teacher_scored_oral','observation_checklist')),
  response              JSONB NOT NULL DEFAULT '{}'::JSONB,
  points_awarded        INTEGER NOT NULL DEFAULT 0,   -- SERVER re-score, never the client's
  points_possible       INTEGER NOT NULL DEFAULT 0,
  is_correct            BOOLEAN,
  observed_band         TEXT CHECK (observed_band IS NULL OR observed_band IN ('emerging','developing','secure')),
  attempts              INTEGER NOT NULL DEFAULT 1,
  replay_count          INTEGER NOT NULL DEFAULT 0,
  latency_ms            INTEGER,
  administered          BOOLEAN NOT NULL DEFAULT TRUE,
  skipped_reason        TEXT,
  client_points_awarded INTEGER,           -- audit only; the server number decides
  evidence_note         TEXT,
  answered_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Idempotency for a retried batch, exactly as migration 314 has it.
  CONSTRAINT lens_assessment_item_responses_key UNIQUE (session_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_lens_assess_responses_session
  ON lens_assessment_item_responses (session_id, answered_at);
CREATE INDEX IF NOT EXISTS idx_lens_assess_responses_observer
  ON lens_assessment_item_responses (observer_id, answered_at DESC);

-- ------------------------------------------------------ milestone results --
-- The banded outcome. band_computed is what the bank's rules produced;
-- band_final is what the report shows. They differ only on an override, which
-- requires a reason — enforced, not merely requested.
CREATE TABLE IF NOT EXISTS lens_assessment_milestone_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES lens_assessment_sessions(id) ON DELETE CASCADE,
  observer_id       UUID NOT NULL,
  school_id         UUID NOT NULL,
  classroom_id      UUID,
  child_alias       TEXT NOT NULL,
  school_year       TEXT NOT NULL,
  window_code       TEXT NOT NULL CHECK (window_code IN ('autumn','winter','spring')),
  milestone_id      TEXT NOT NULL,
  strand_id         TEXT NOT NULL,
  domain_id         TEXT NOT NULL,
  track             TEXT NOT NULL DEFAULT 'core' CHECK (track IN ('core','efl')),
  age_band          TEXT NOT NULL CHECK (age_band IN ('A3','A4','A5','G1')),
  expectation       TEXT NOT NULL CHECK (expectation IN ('expected','emerging_edge','extension')),
  band_computed     TEXT CHECK (band_computed IN ('emerging','developing','secure','unassessed')),
  band_final        TEXT NOT NULL CHECK (band_final IN ('emerging','developing','secure','unassessed')),
  band_source       TEXT NOT NULL CHECK (band_source IN ('direct','observation','teacher_override')),
  override_reason   TEXT,
  override_by_id    UUID,
  coverage          NUMERIC(4,3),
  points_earned     INTEGER,
  points_possible   INTEGER,
  evidence_note     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lens_assessment_milestone_results_key UNIQUE (session_id, milestone_id),
  CONSTRAINT lens_assessment_override_needs_reason
    CHECK (band_source <> 'teacher_override'
           OR (override_reason IS NOT NULL AND length(btrim(override_reason)) > 0))
);

CREATE INDEX IF NOT EXISTS idx_lens_assess_results_session
  ON lens_assessment_milestone_results (session_id);
CREATE INDEX IF NOT EXISTS idx_lens_assess_results_observer
  ON lens_assessment_milestone_results (observer_id, band_final);
CREATE INDEX IF NOT EXISTS idx_lens_assess_results_growth
  ON lens_assessment_milestone_results (observer_id, school_id, child_alias, school_year, window_code);

-- ------------------------------------------------------------------- touch --
-- Restated (CREATE OR REPLACE, identical body to 339) so this file stands alone.
CREATE OR REPLACE FUNCTION lens_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lens_assessment_sessions','lens_assessment_milestone_results'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON %1$s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION lens_touch_updated_at()', t);
  END LOOP;
END $$;

-- --------------------------------------------------------------------- RLS --
-- Enabled with NO policies — the same posture every other lens_* table uses.
ALTER TABLE lens_assessment_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_assessment_item_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_assessment_milestone_results ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------- comments --
COMMENT ON TABLE lens_assessment_sessions IS
  'Montree Lens: one milestone check-in run by a visiting observer. Filed against a free-text child_alias because Lens has no child roster. Criterion-referenced — no percentiles, no norms, no peer ranking. Shares the scoring code and the item bank with montree_evaluation_sessions.';
COMMENT ON COLUMN lens_assessment_sessions.child_alias IS
  'Whatever the observer typed. Never an identifier: two rows with the same alias are not assumed to be the same child by anything except the growth lookup, which also requires the same observer and school.';
COMMENT ON COLUMN lens_assessment_sessions.classroom_id IS
  'Optional. NULL means the observer did not pin a room, which is honest; it never means "unknown room in this school".';
COMMENT ON COLUMN lens_assessment_sessions.source IS
  'lens_ui = run in the Lens runner; paper_entry = keyed in from a printed scoring sheet; tablet_import = uploaded from the offline tablet export. All three reach the same server-side scorer.';
COMMENT ON TABLE lens_assessment_item_responses IS
  'Montree Lens: raw per-item evidence, including items skipped by a stop rule (administered = FALSE). points_awarded is always the SERVER re-score from item-bank.json; client_points_awarded keeps what the client thought, for audit only.';
COMMENT ON TABLE lens_assessment_milestone_results IS
  'Montree Lens: one banded outcome per milestone per check-in. band_computed = the bank rules; band_final = what the observer''s report shows.';

COMMIT;

-- ─────────────────────────────────────────────────────────────── verification
-- Run after pasting; expect 3 rows.
--
-- SELECT table_name FROM information_schema.tables
--  WHERE table_name LIKE 'lens_assessment%' ORDER BY table_name;
