-- =============================================================================
-- 261  PERSONAL SPACES — give each person their own walled-off sanctuary.
-- Run in the MONTREE project (dmfncjjtsoxrnvcdnvjq). Idempotent + additive.
-- =============================================================================
--
-- The personal platform was built for one person (Tredoux). This adds a `space`
-- label to every personal row and every login, so a second sanctuary (Riddick)
-- can live in the same app with its data sealed off from Tredoux's.
--
-- SAFE: every column defaults to 'tredoux', so all existing rows stay his and
-- nothing changes until the app code starts reading the column. No data is
-- altered or dropped. A third space (e.g. a wife) later is just a new label.
-- =============================================================================

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'story_coach_memory',
    'story_coach_log',
    'story_coach_consolidation',
    'story_diary_entries',
    'story_projects',
    'story_plan_days',
    'story_plan_events',
    'story_messages_secret'
  ] LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS space text NOT NULL DEFAULT %L;',
      t, 'tredoux'
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I (space);',
      'idx_' || t || '_space', t
    );
  END LOOP;
END $$;

-- Identity → space (one login belongs to exactly one space).
-- The personal platform authenticates against story_admin_users (role 'admin'),
-- NOT story_users (those are the kid-facing story viewers). Riddick's sanctuary
-- login is a story_admin_users row, so the space label lives here.
ALTER TABLE story_admin_users
  ADD COLUMN IF NOT EXISTS space text NOT NULL DEFAULT 'tredoux';

-- Tredoux's existing admin user + all existing data are now explicitly
-- space='tredoux'. Riddick's admin user (added later) will be space='riddick'.
