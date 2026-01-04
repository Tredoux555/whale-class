-- ============================================
-- STORY PLATFORM DATABASE FIX
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dmfncjjtsoxrnvcdnvjq/sql/new
-- Date: January 2, 2026
-- ============================================

-- 1. Fix column names in story_login_logs (if needed)
DO $$ 
BEGIN
  -- Rename login_time to login_at if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'story_login_logs' AND column_name = 'login_time') THEN
    ALTER TABLE story_login_logs RENAME COLUMN login_time TO login_at;
    RAISE NOTICE 'Renamed login_time to login_at';
  END IF;
  
  -- Rename session_id to session_token if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'story_login_logs' AND column_name = 'session_id') THEN
    ALTER TABLE story_login_logs RENAME COLUMN session_id TO session_token;
    RAISE NOTICE 'Renamed session_id to session_token';
  END IF;
END $$;

-- 2. Add missing columns
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE story_login_logs ADD COLUMN IF NOT EXISTS logout_at TIMESTAMPTZ;

-- 3. Convert TIMESTAMP to TIMESTAMPTZ for all story tables

-- secret_stories
DO $$ BEGIN
  ALTER TABLE secret_stories 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  RAISE NOTICE 'Converted secret_stories.created_at to TIMESTAMPTZ';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'secret_stories.created_at already TIMESTAMPTZ or does not exist';
END $$;

DO $$ BEGIN
  ALTER TABLE secret_stories 
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
  RAISE NOTICE 'Converted secret_stories.updated_at to TIMESTAMPTZ';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'secret_stories.updated_at already TIMESTAMPTZ or does not exist';
END $$;

-- story_login_logs
DO $$ BEGIN
  ALTER TABLE story_login_logs 
    ALTER COLUMN login_at TYPE TIMESTAMPTZ USING login_at AT TIME ZONE 'UTC';
  RAISE NOTICE 'Converted story_login_logs.login_at to TIMESTAMPTZ';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'story_login_logs.login_at already TIMESTAMPTZ or does not exist';
END $$;

-- story_message_history
DO $$ BEGIN
  ALTER TABLE story_message_history 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  RAISE NOTICE 'Converted story_message_history.created_at to TIMESTAMPTZ';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'story_message_history.created_at already TIMESTAMPTZ or does not exist';
END $$;

DO $$ BEGIN
  ALTER TABLE story_message_history 
    ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
  RAISE NOTICE 'Converted story_message_history.expires_at to TIMESTAMPTZ';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'story_message_history.expires_at already TIMESTAMPTZ or does not exist';
END $$;

-- story_admin_users
DO $$ BEGIN
  ALTER TABLE story_admin_users 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  RAISE NOTICE 'Converted story_admin_users.created_at to TIMESTAMPTZ';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'story_admin_users.created_at already TIMESTAMPTZ or does not exist';
END $$;

DO $$ BEGIN
  ALTER TABLE story_admin_users 
    ALTER COLUMN last_login TYPE TIMESTAMPTZ USING last_login AT TIME ZONE 'UTC';
  RAISE NOTICE 'Converted story_admin_users.last_login to TIMESTAMPTZ';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'story_admin_users.last_login already TIMESTAMPTZ or does not exist';
END $$;

-- story_users
DO $$ BEGIN
  ALTER TABLE story_users 
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  RAISE NOTICE 'Converted story_users.created_at to TIMESTAMPTZ';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'story_users.created_at already TIMESTAMPTZ or does not exist';
END $$;

-- vault_files (if exists)
DO $$ BEGIN
  ALTER TABLE vault_files 
    ALTER COLUMN uploaded_at TYPE TIMESTAMPTZ USING uploaded_at AT TIME ZONE 'UTC';
  RAISE NOTICE 'Converted vault_files.uploaded_at to TIMESTAMPTZ';
EXCEPTION WHEN others THEN 
  RAISE NOTICE 'vault_files.uploaded_at already TIMESTAMPTZ or does not exist';
END $$;

-- 4. Verify changes - show current column types
SELECT 
  table_name, 
  column_name, 
  data_type,
  CASE WHEN data_type = 'timestamp with time zone' THEN '✅ FIXED' ELSE '⚠️ CHECK' END as status
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name IN ('secret_stories', 'story_login_logs', 'story_message_history', 'story_admin_users', 'story_users', 'vault_files')
  AND (column_name LIKE '%_at%' OR column_name LIKE '%time%' OR column_name = 'last_login')
ORDER BY table_name, column_name;
