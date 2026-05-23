-- Migration 230: guarantee story_calls.mode allows BOTH 'voice' and 'video'.
--
-- Bug: video calls notified nobody while voice calls worked perfectly.
-- Every code path (admin/call route, current-call poll, sendCallPush, the
-- incoming-call banner) is mode-agnostic — the ONLY thing that differs
-- between a voice and a video call is the `mode` value written to
-- story_calls. So a video INSERT failing while a voice INSERT succeeds
-- means the `mode` column has a CHECK constraint that admits 'voice' but
-- not 'video'.
--
-- How that happened: migration 228 is idempotent (CREATE TABLE IF NOT
-- EXISTS + ALTER ADD COLUMN IF NOT EXISTS mode). If `story_calls` — or the
-- `mode` column — already existed from an earlier/partial run, BOTH guards
-- became no-ops and the intended `CHECK (mode IN ('voice','video'))` from
-- the CREATE TABLE body was never applied. The amended 228 silently didn't
-- take. The `ALTER ADD COLUMN IF NOT EXISTS mode` carries no CHECK clause.
--
-- This migration drops EVERY CHECK constraint on story_calls that mentions
-- `mode` — by inspecting each constraint's definition, so it catches the
-- constraint whatever it is named — then adds the single correct one.
-- Safe regardless of the column's current state: correct CHECK / voice-only
-- CHECK / no CHECK / a differently-named CHECK are all handled. Idempotent.

BEGIN;

-- Drop every existing CHECK constraint on story_calls referencing `mode`,
-- regardless of its name (migration history makes the name uncertain).
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'story_calls'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%mode%'
  LOOP
    EXECUTE format('ALTER TABLE story_calls DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE story_calls
  ADD CONSTRAINT story_calls_mode_check CHECK (mode IN ('voice', 'video'));

COMMIT;
