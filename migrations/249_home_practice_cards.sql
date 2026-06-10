-- migrations/249_home_practice_cards.sql
--
-- ✨ Home Practice Cards (Jun 10, 2026) — one tiny, warm "try this at home"
-- activity per child per week, matched to the work the child is currently
-- focused on. Surfaced on the parent's weekly report. ~60-90 words, 5 minutes,
-- no special materials. Lifts parent engagement (the retention lever) at near-
-- zero cost: one Haiku call per child per week, then cached here.
--
-- Tier-gated via resolveReportModel — free-tier schools generate nothing.
-- Feature-flagged via home_practice_cards (default ON for paid tiers; the tier
-- gate is the real cost control).
--
-- Cache key = (child_id, week_start). One card per child per Monday-week.
-- RLS: locked down (app reads via service-role key, like every other montree_*
-- table — see 2026-06-06 / 2026-06-10 RLS lockdowns).
--
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_home_practice_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,             -- Monday of the week this card is for
  grounded_on_work TEXT,                -- the work_name the activity reinforces
  activity_md TEXT NOT NULL,            -- the parent-facing activity (markdown-ish prose)
  model TEXT,                           -- which model generated it (audit)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_home_practice_child_week
  ON montree_home_practice_cards (child_id, week_start DESC);

ALTER TABLE montree_home_practice_cards ENABLE ROW LEVEL SECURITY;
-- No policies → default-deny for anon/authenticated; service_role bypasses RLS.

-- Feature flag (montree_feature_definitions.name is NOT NULL — Session 118).
INSERT INTO montree_feature_definitions (feature_key, name, default_enabled, description, icon, category)
VALUES (
  'home_practice_cards',
  'Home Practice Cards',
  true,
  'Adds a tiny weekly "try this at home" activity to each parent report, matched to the work the child is currently focused on.',
  '🏡',
  'reporting'
)
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description,
    icon = EXCLUDED.icon, category = EXCLUDED.category,
    default_enabled = EXCLUDED.default_enabled;

COMMIT;
