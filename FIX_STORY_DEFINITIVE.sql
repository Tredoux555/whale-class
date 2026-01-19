-- =============================================
-- STORY SYSTEM DEFINITIVE FIX
-- Date: January 19, 2026
-- SINGLE SOURCE OF TRUTH - Run this in Supabase SQL Editor
-- Standardizes on: login_time, message_content
-- =============================================

-- ============================================
-- PART 1: story_login_logs - USER LOGINS
-- ============================================

-- Ensure table exists with correct schema
CREATE TABLE IF NOT EXISTS story_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  session_token TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Add missing columns if needed
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS login_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS logout_at TIMESTAMPTZ;
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS session_token TEXT;

-- Migrate from login_at to login_time if login_at exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'login_at'
  ) THEN
    UPDATE story_login_logs SET login_time = login_at WHERE login_time IS NULL;
    ALTER TABLE story_login_logs DROP COLUMN IF EXISTS login_at;
    RAISE NOTICE 'Migrated login_at to login_time';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_story_login_logs_time ON story_login_logs(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_story_login_logs_username ON story_login_logs(username);

-- ============================================
-- PART 2: story_admin_login_logs - ADMIN LOGINS  
-- ============================================

CREATE TABLE IF NOT EXISTS story_admin_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  session_token TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Add missing columns if needed
ALTER TABLE story_admin_login_logs ADD COLUMN IF NOT EXISTS login_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE story_admin_login_logs ADD COLUMN IF NOT EXISTS logout_at TIMESTAMPTZ;
ALTER TABLE story_admin_login_logs ADD COLUMN IF NOT EXISTS session_token TEXT;

-- Migrate from login_at to login_time if login_at exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_admin_login_logs' AND column_name = 'login_at'
  ) THEN
    UPDATE story_admin_login_logs SET login_time = login_at WHERE login_time IS NULL;
    ALTER TABLE story_admin_login_logs DROP COLUMN IF EXISTS login_at;
    RAISE NOTICE 'Migrated admin login_at to login_time';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_story_admin_login_time ON story_admin_login_logs(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_story_admin_username ON story_admin_login_logs(username);

-- ============================================
-- PART 3: story_message_history - MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS story_message_history (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  message_content TEXT,
  media_url TEXT,
  media_filename TEXT,
  author VARCHAR(50) NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT FALSE
);

-- Add missing columns if needed  
ALTER TABLE story_message_history ADD COLUMN IF NOT EXISTS message_content TEXT;
ALTER TABLE story_message_history ADD COLUMN IF NOT EXISTS is_expired BOOLEAN DEFAULT FALSE;

-- Migrate from content to message_content if content exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_message_history' AND column_name = 'content'
  ) THEN
    UPDATE story_message_history SET message_content = content WHERE message_content IS NULL;
    ALTER TABLE story_message_history DROP COLUMN IF EXISTS content;
    RAISE NOTICE 'Migrated content to message_content';
  END IF;
END $$;

-- Remove columns we don't use
ALTER TABLE story_message_history DROP COLUMN IF EXISTS is_from_admin;
ALTER TABLE story_message_history DROP COLUMN IF EXISTS session_token;
ALTER TABLE story_message_history DROP COLUMN IF EXISTS login_log_id;

CREATE INDEX IF NOT EXISTS idx_story_message_history_week ON story_message_history(week_start_date);
CREATE INDEX IF NOT EXISTS idx_story_message_history_created ON story_message_history(created_at DESC);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'story_login_logs columns:' as table_check;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'story_login_logs' ORDER BY column_name;

SELECT 'story_admin_login_logs columns:' as table_check;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'story_admin_login_logs' ORDER BY column_name;

SELECT 'story_message_history columns:' as table_check;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'story_message_history' ORDER BY column_name;
