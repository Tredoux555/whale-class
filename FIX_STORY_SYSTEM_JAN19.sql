-- =============================================
-- STORY SYSTEM COMPREHENSIVE FIX
-- Date: January 19, 2026
-- Run this in Supabase SQL Editor
-- =============================================

-- ============================================
-- PART 1: FIX story_login_logs TABLE
-- ============================================

-- Add missing columns
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS login_at TIMESTAMPTZ;
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS logout_at TIMESTAMPTZ;

-- Copy data from old columns to new columns if they exist
DO $$
BEGIN
  -- Copy login_time to login_at if login_time exists and login_at is empty
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'login_time'
  ) THEN
    UPDATE story_login_logs SET login_at = login_time WHERE login_at IS NULL;
    ALTER TABLE story_login_logs DROP COLUMN IF EXISTS login_time;
  END IF;

  -- Copy session_id to session_token if session_id exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'session_id'
  ) THEN
    UPDATE story_login_logs SET session_token = session_id WHERE session_token IS NULL;
    ALTER TABLE story_login_logs DROP COLUMN IF EXISTS session_id;
  END IF;
END $$;

-- Set default for login_at
ALTER TABLE story_login_logs ALTER COLUMN login_at SET DEFAULT NOW();

-- Create indexes for login_at
DROP INDEX IF EXISTS idx_story_login_logs_time;
CREATE INDEX IF NOT EXISTS idx_story_login_logs_login_at ON story_login_logs(login_at DESC);

-- ============================================
-- PART 2: FIX story_message_history TABLE
-- ============================================

-- Add content column if it doesn't exist
ALTER TABLE story_message_history ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE story_message_history ADD COLUMN IF NOT EXISTS is_from_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE story_message_history ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE story_message_history ADD COLUMN IF NOT EXISTS login_log_id INTEGER;

-- Copy message_content to content if message_content exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_message_history' AND column_name = 'message_content'
  ) THEN
    UPDATE story_message_history SET content = message_content WHERE content IS NULL;
    -- Don't drop message_content for backwards compatibility
  END IF;
END $$;

-- ============================================
-- PART 3: CREATE story_admin_login_logs TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS story_admin_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  session_token TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_story_admin_login_at ON story_admin_login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_admin_username ON story_admin_login_logs(username);

-- ============================================
-- PART 4: FIX TIMESTAMP TYPES
-- ============================================

-- Convert all timestamp columns to TIMESTAMPTZ
DO $$ BEGIN
  ALTER TABLE secret_stories 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE secret_stories 
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE story_message_history 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE story_message_history 
    ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE story_admin_users 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE story_admin_users 
    ALTER COLUMN last_login TYPE TIMESTAMPTZ USING last_login AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE story_users 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
EXCEPTION WHEN others THEN NULL; END $$;

-- ============================================
-- PART 5: ENSURE USERS EXIST
-- ============================================

-- Regular users (story viewers) - T=redoux, Z=oe
INSERT INTO story_users (username, password_hash) VALUES
  ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'),
  ('Z', '$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- Admin user - T=redoux
INSERT INTO story_admin_users (username, password_hash) VALUES
  ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- ============================================
-- PART 6: ENSURE vault_files EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS vault_files (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  file_url TEXT,
  file_path TEXT,
  file_size BIGINT DEFAULT 0,
  mime_type VARCHAR(100),
  encrypted_key TEXT,
  file_hash TEXT,
  uploaded_by VARCHAR(50) NOT NULL DEFAULT 'Admin',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Add missing columns to vault_files if they don't exist
ALTER TABLE vault_files ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE vault_files ADD COLUMN IF NOT EXISTS encrypted_key TEXT;
ALTER TABLE vault_files ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE vault_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vault_files_uploaded ON vault_files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_files_deleted ON vault_files(deleted_at);

-- ============================================
-- PART 7: VAULT AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS vault_audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  admin_username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  details TEXT,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_audit_created ON vault_audit_log(created_at DESC);

-- ============================================
-- VERIFICATION - Run to check results
-- ============================================

SELECT 'story_login_logs columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'story_login_logs' ORDER BY column_name;

SELECT 'story_message_history columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'story_message_history' ORDER BY column_name;

SELECT 'story_admin_login_logs columns:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'story_admin_login_logs' ORDER BY column_name;

SELECT 'Users in story_users:' as info;
SELECT username FROM story_users;

SELECT 'Users in story_admin_users:' as info;
SELECT username FROM story_admin_users;
