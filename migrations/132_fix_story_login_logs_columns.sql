-- Migration: 132_fix_story_login_logs_columns.sql
-- Bulletproof fix for story login logging - ensures ALL required columns exist
-- Handles any state the tables might be in (original, partially migrated, or fully migrated)

-- ============================================
-- 1. FIX story_login_logs TABLE
-- ============================================

-- Ensure table exists
CREATE TABLE IF NOT EXISTS story_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(10) NOT NULL,
  login_at TEXT,
  session_token TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  logout_at TEXT
);

-- Rename login_time → login_at if old column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'login_time'
  ) THEN
    -- Check if login_at already exists (both columns present somehow)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'story_login_logs' AND column_name = 'login_at'
    ) THEN
      ALTER TABLE story_login_logs RENAME COLUMN login_time TO login_at;
      RAISE NOTICE 'Renamed story_login_logs.login_time → login_at';
    ELSE
      -- Both exist, drop the old one
      ALTER TABLE story_login_logs DROP COLUMN login_time;
      RAISE NOTICE 'Dropped duplicate story_login_logs.login_time (login_at already exists)';
    END IF;
  END IF;
END $$;

-- Rename session_id → session_token if old column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'session_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'story_login_logs' AND column_name = 'session_token'
    ) THEN
      ALTER TABLE story_login_logs RENAME COLUMN session_id TO session_token;
      RAISE NOTICE 'Renamed story_login_logs.session_id → session_token';
    ELSE
      ALTER TABLE story_login_logs DROP COLUMN session_id;
      RAISE NOTICE 'Dropped duplicate story_login_logs.session_id (session_token already exists)';
    END IF;
  END IF;
END $$;

-- Add login_at if somehow missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'login_at'
  ) THEN
    ALTER TABLE story_login_logs ADD COLUMN login_at TEXT DEFAULT NOW()::TEXT;
    RAISE NOTICE 'Added missing story_login_logs.login_at column';
  END IF;
END $$;

-- Add session_token if somehow missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'session_token'
  ) THEN
    ALTER TABLE story_login_logs ADD COLUMN session_token TEXT;
    RAISE NOTICE 'Added missing story_login_logs.session_token column';
  END IF;
END $$;

-- Add logout_at if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'logout_at'
  ) THEN
    ALTER TABLE story_login_logs ADD COLUMN logout_at TEXT;
    RAISE NOTICE 'Added missing story_login_logs.logout_at column';
  END IF;
END $$;

-- Ensure login_at is TEXT type (wide enough for ISO timestamps)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs'
      AND column_name = 'login_at'
      AND data_type != 'text'
  ) THEN
    ALTER TABLE story_login_logs ALTER COLUMN login_at TYPE TEXT;
    RAISE NOTICE 'Widened story_login_logs.login_at to TEXT';
  END IF;
END $$;

-- Recreate indexes with correct column names
DROP INDEX IF EXISTS idx_story_login_logs_time;
CREATE INDEX IF NOT EXISTS idx_story_login_logs_login_at ON story_login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_login_logs_username ON story_login_logs(username);

-- ============================================
-- 2. FIX story_admin_login_logs TABLE
-- ============================================

-- Ensure table exists
CREATE TABLE IF NOT EXISTS story_admin_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  login_at TEXT,
  session_token TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  logout_at TEXT
);

-- Rename login_time → login_at if old column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_admin_login_logs' AND column_name = 'login_time'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'story_admin_login_logs' AND column_name = 'login_at'
    ) THEN
      ALTER TABLE story_admin_login_logs RENAME COLUMN login_time TO login_at;
      RAISE NOTICE 'Renamed story_admin_login_logs.login_time → login_at';
    ELSE
      ALTER TABLE story_admin_login_logs DROP COLUMN login_time;
      RAISE NOTICE 'Dropped duplicate story_admin_login_logs.login_time';
    END IF;
  END IF;
END $$;

-- Rename session_id → session_token if old column still exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_admin_login_logs' AND column_name = 'session_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'story_admin_login_logs' AND column_name = 'session_token'
    ) THEN
      ALTER TABLE story_admin_login_logs RENAME COLUMN session_id TO session_token;
      RAISE NOTICE 'Renamed story_admin_login_logs.session_id → session_token';
    ELSE
      ALTER TABLE story_admin_login_logs DROP COLUMN session_id;
      RAISE NOTICE 'Dropped duplicate story_admin_login_logs.session_id';
    END IF;
  END IF;
END $$;

-- Add login_at if somehow missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_admin_login_logs' AND column_name = 'login_at'
  ) THEN
    ALTER TABLE story_admin_login_logs ADD COLUMN login_at TEXT DEFAULT NOW()::TEXT;
    RAISE NOTICE 'Added missing story_admin_login_logs.login_at column';
  END IF;
END $$;

-- Add session_token if somehow missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_admin_login_logs' AND column_name = 'session_token'
  ) THEN
    ALTER TABLE story_admin_login_logs ADD COLUMN session_token TEXT;
    RAISE NOTICE 'Added missing story_admin_login_logs.session_token column';
  END IF;
END $$;

-- Add logout_at if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_admin_login_logs' AND column_name = 'logout_at'
  ) THEN
    ALTER TABLE story_admin_login_logs ADD COLUMN logout_at TEXT;
    RAISE NOTICE 'Added missing story_admin_login_logs.logout_at column';
  END IF;
END $$;

-- Ensure login_at is TEXT type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_admin_login_logs'
      AND column_name = 'login_at'
      AND data_type != 'text'
  ) THEN
    ALTER TABLE story_admin_login_logs ALTER COLUMN login_at TYPE TEXT;
    RAISE NOTICE 'Widened story_admin_login_logs.login_at to TEXT';
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_login_at ON story_admin_login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_username ON story_admin_login_logs(username);

-- ============================================
-- 3. VERIFY — Run these to check the fix
-- ============================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'story_login_logs' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'story_admin_login_logs' ORDER BY ordinal_position;
