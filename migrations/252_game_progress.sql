-- 252_game_progress.sql  (= db/RUN_THESE/05_game_progress.sql)
-- Jun 12, 2026 — game progress persistence.
--
-- Plain language: the 9 learning games under /montree/dashboard/games have
-- always POSTed their results to /api/games/progress and /api/games/track,
-- but those routes never existed — every save 404'd silently and no game
-- progress was ever recorded (FUNCTIONALITY-whale-frontend audit, 1.1).
-- This table backs the two new routes. One row per game event:
--   * 'session'  — trace games (letter/capital/number tracer): a row is
--                  created on game start (its id is the sessionId the client
--                  holds) and updated with results on game end.
--   * 'progress' — completion saves from match-attack, read-and-reveal,
--                  word-builder, sentence-scramble, sound-safari.
--   * 'track'    — quantity-match's lightweight tracking ping (no child id).
--
-- child_id is validated server-side against montree_children within the
-- caller's school before being written; unvalidated client ids are kept in
-- payload.client_child_id instead so nothing is lost and nothing forged.
--
-- Safe + idempotent: pure CREATE IF NOT EXISTS, no data touched.

CREATE TABLE IF NOT EXISTS montree_game_progress (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant scope — always set from the authenticated school session.
  school_id          UUID,
  -- Validated montree_children.id, or NULL when the game didn't send a
  -- (valid) child id. No-FK-violation by construction; SET NULL keeps
  -- anonymised history if a child record is deleted.
  child_id           UUID REFERENCES montree_children(id) ON DELETE SET NULL,

  game_key           TEXT NOT NULL,   -- 'match-attack', 'number-tracer', ...
  game_name          TEXT,            -- display name, when the client sends one

  event_type         TEXT NOT NULL DEFAULT 'progress'
                       CHECK (event_type IN ('session', 'progress', 'track')),

  -- Normalised result columns (whatever the game reports; NULL = not sent).
  items_attempted    INTEGER,
  items_correct      INTEGER,
  items_total        INTEGER,
  score              INTEGER,
  time_spent_seconds INTEGER,
  completed          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Everything else the game sends (difficulty, streaks, mastered items,
  -- mode, xp, accuracy...) lands here untouched.
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb,

  started_at         TIMESTAMPTZ,
  ended_at           TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-child history (teacher dashboards / reports).
CREATE INDEX IF NOT EXISTS idx_game_progress_child
  ON montree_game_progress (child_id, created_at DESC)
  WHERE child_id IS NOT NULL;

-- Per-school per-game rollups.
CREATE INDEX IF NOT EXISTS idx_game_progress_school_game
  ON montree_game_progress (school_id, game_key, created_at DESC);

-- Auto-bump updated_at on session 'end' updates.
CREATE OR REPLACE FUNCTION montree_game_progress_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_game_progress_updated_at ON montree_game_progress;
CREATE TRIGGER trg_game_progress_updated_at
  BEFORE UPDATE ON montree_game_progress
  FOR EACH ROW EXECUTE FUNCTION montree_game_progress_touch_updated_at();

-- RLS enabled with NO policies = deny-all for the anon key that ships in the
-- client bundle. All legitimate access goes through the server's service-role
-- key, which bypasses RLS. Same pattern as montree_device_tokens (251).
ALTER TABLE montree_game_progress ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE montree_game_progress IS
  'Learning-game results/sessions written by /api/games/progress and /api/games/track. child_id is server-validated; raw unvalidated client ids live in payload.client_child_id.';
