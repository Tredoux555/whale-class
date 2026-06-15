-- =============================================================================
-- 260  STORY COACH CONSOLIDATION — the "sleep" pass
-- Run in the Supabase SQL Editor (idempotent; graceful until run).
-- =============================================================================
--
-- Two-tier memory, like a brain:
--   • story_coach_log      = working memory. Recent UNCONSOLIDATED turns are
--                            replayed into context so the Coach resumes exactly
--                            where Tredoux left off (even after a reload / new device).
--   • once a day ("on wake") the prior day's turns are CONSOLIDATED: distilled
--     into story_coach_memory (semantic) + a diary recap (episodic), then marked
--     consolidated_at so they drop out of the running thread.
--
-- The raw archive is KEPT FOREVER (Tredoux's choice) — consolidated_at only marks
-- what has already been folded into long-term memory; nothing is ever deleted here.
-- =============================================================================

-- ── 1. Mark which turns have been folded into long-term memory ───────────────
ALTER TABLE story_coach_log
  ADD COLUMN IF NOT EXISTS consolidated_at timestamptz;

-- Fast lookup of the running thread (unconsolidated turns), newest-first.
CREATE INDEX IF NOT EXISTS idx_story_coach_log_unconsolidated
  ON story_coach_log (created_at DESC)
  WHERE consolidated_at IS NULL;

-- ── 2. Audit row per consolidation run (one "night of sleep") ────────────────
CREATE TABLE IF NOT EXISTS story_coach_consolidation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  through_date      date NOT NULL,          -- folded all turns up to the end of this day
  turns_count       int  NOT NULL DEFAULT 0,
  memories_written  int  NOT NULL DEFAULT 0,
  diary_entry_id    uuid,                   -- the episodic recap written for the span
  ran_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_coach_consolidation_date
  ON story_coach_consolidation (through_date DESC);

-- Same posture as the rest of the personal platform: RLS on, no policies →
-- only the service role (server) can touch it.
ALTER TABLE story_coach_consolidation ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_coach_consolidation FORCE ROW LEVEL SECURITY;
