-- =============================================================================
-- 258  STORY PLAN EVENTS — clickable planner entries with times
-- Run in the Supabase SQL Editor before/after deploying (graceful until run).
-- =============================================================================
--
-- Makes the Planner functional: tap a day, add an appointment/meeting with a
-- time. Also written by the Coach's add_event tool ("I have a meeting Wed 3pm").
-- title + notes are AES-256-GCM encrypted at rest (STORY_DIARY_KEY); date + time
-- stay plaintext so the calendar can render/sort. RLS deny-all (service-role
-- only). Idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS story_plan_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date     date NOT NULL,
  start_time     text,                       -- 'HH:MM' (24h) or NULL (all-day)
  title_enc      text NOT NULL,              -- AES-256-GCM 'gcm:iv:tag:ct'
  notes_enc      text,                       -- AES-256-GCM, optional
  cipher_version int  NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_plan_events_date
  ON story_plan_events (event_date, start_time);

-- Reuses the touch function created in migration 257.
DROP TRIGGER IF EXISTS trg_story_plan_events_touch ON story_plan_events;
CREATE TRIGGER trg_story_plan_events_touch
  BEFORE UPDATE ON story_plan_events
  FOR EACH ROW EXECUTE FUNCTION story_personal_touch_updated_at();

ALTER TABLE story_plan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_plan_events FORCE ROW LEVEL SECURITY;
