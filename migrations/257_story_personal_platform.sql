-- =============================================================================
-- 257  STORY PERSONAL PLATFORM — Diary + Planner + Projects + AI Coach
-- Run this in the Supabase SQL Editor BEFORE deploying.
-- =============================================================================
--
-- Turns /story/admin into Tredoux's private Diary + Planner + AI Life-Coach.
-- Spec: docs/handoffs/STORY_PERSONAL_PLATFORM_BUILD.md
--
-- PRIVACY MODEL (final):
--   * Single tier. The Coach (server-side → Sonnet) reads the diary by design.
--   * All `*_enc` columns are AES-256-GCM ('gcm:iv:tag:ct') encrypted at rest
--     with a SERVER-HELD key (STORY_DIARY_KEY). A raw DB leak is useless
--     without the key. See lib/story/diary-crypto.ts.
--   * `entry_date` + `mood` stay PLAINTEXT — needed for the calendar.
--
-- RLS: every table is RLS-enabled with NO policies (default-deny for anon +
-- authenticated). The app reads these ONLY server-side via the SERVICE-ROLE
-- key, which has BYPASSRLS. Mirrors the 2026-06-06 / 2026-06-10 lockdown
-- migrations — the public anon key in the browser bundle gets ZERO access.
--
-- Idempotent: IF NOT EXISTS everywhere; safe to re-run.
-- =============================================================================

-- Shared touch trigger for updated_at -----------------------------------------
CREATE OR REPLACE FUNCTION story_personal_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Diary entries ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_diary_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date      date NOT NULL,                 -- plaintext (calendar)
  mood            text,                          -- short plaintext tag (calendar colour)
  title_enc       text,                          -- AES-256-GCM 'gcm:iv:tag:ct'
  body_enc        text NOT NULL,                 -- AES-256-GCM
  cipher_version  int  NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_story_diary_entry_date
  ON story_diary_entries (entry_date DESC);
DROP TRIGGER IF EXISTS trg_story_diary_touch ON story_diary_entries;
CREATE TRIGGER trg_story_diary_touch
  BEFORE UPDATE ON story_diary_entries
  FOR EACH ROW EXECUTE FUNCTION story_personal_touch_updated_at();

-- 2. Projects & ambitions -----------------------------------------------------
CREATE TABLE IF NOT EXISTS story_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_enc       text NOT NULL,
  why_enc         text,
  next_action_enc text,
  status          text NOT NULL DEFAULT 'active', -- active | paused | done | dropped
  priority        int,                            -- 1 = highest
  is_active       boolean NOT NULL DEFAULT true,
  cipher_version  int  NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_story_projects_active
  ON story_projects (is_active, priority)
  WHERE is_active = true;
DROP TRIGGER IF EXISTS trg_story_projects_touch ON story_projects;
CREATE TRIGGER trg_story_projects_touch
  BEFORE UPDATE ON story_projects
  FOR EACH ROW EXECUTE FUNCTION story_personal_touch_updated_at();

-- 3. Coach memory (mirror montree_principal_memory) ---------------------------
CREATE TABLE IF NOT EXISTS story_coach_memory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_type     text NOT NULL,                  -- value | ambition | health_goal | dropped | pattern | preference | fact
  content_enc     text NOT NULL,                  -- AES-256-GCM
  cipher_version  int  NOT NULL DEFAULT 1,
  superseded_by   uuid,
  superseded_at   timestamptz,
  reference_count int  NOT NULL DEFAULT 0,
  last_referenced_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_story_coach_memory_active
  ON story_coach_memory (created_at DESC)
  WHERE superseded_at IS NULL;
DROP TRIGGER IF EXISTS trg_story_coach_memory_touch ON story_coach_memory;
CREATE TRIGGER trg_story_coach_memory_touch
  BEFORE UPDATE ON story_coach_memory
  FOR EACH ROW EXECUTE FUNCTION story_personal_touch_updated_at();

-- 4. Day plans (optional — the Coach writes these) ----------------------------
CREATE TABLE IF NOT EXISTS story_plan_days (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date    date NOT NULL,
  plan_enc     text NOT NULL,                     -- AES-256-GCM
  cipher_version int NOT NULL DEFAULT 1,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_story_plan_days_date
  ON story_plan_days (plan_date);

-- 5. Hidden-Messages secret phrase (hashed) -----------------------------------
CREATE TABLE IF NOT EXISTS story_messages_secret (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_hash  text NOT NULL,                     -- bcrypt/scrypt hash of the secret phrase
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS lockdown — default-deny for anon + authenticated, service-role bypasses --
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'story_diary_entries',
    'story_projects',
    'story_coach_memory',
    'story_plan_days',
    'story_messages_secret'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- =============================================================================
-- DONE. After running: set STORY_DIARY_KEY (32-byte hex) in Railway:
--   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
-- Without STORY_DIARY_KEY, diary/project/coach writes fail closed (by design).
-- =============================================================================
