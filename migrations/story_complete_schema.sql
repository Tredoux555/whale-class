-- =============================================
-- STORY SYSTEM - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. SECRET STORIES TABLE
-- Stores weekly stories with hidden messages
CREATE TABLE IF NOT EXISTS secret_stories (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  theme VARCHAR(255) NOT NULL,
  story_title VARCHAR(255) NOT NULL,
  story_content JSONB NOT NULL, -- { paragraphs: string[] }
  hidden_message TEXT,
  message_author VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secret_stories_week ON secret_stories(week_start_date);

-- 2. STORY USERS TABLE
-- User authentication for story viewers
CREATE TABLE IF NOT EXISTS story_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. STORY LOGIN LOGS TABLE
-- Track all logins for admin monitoring
DO $$
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'story_login_logs'
  ) THEN
    CREATE TABLE story_login_logs (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      login_time TIMESTAMP DEFAULT NOW(),
      session_id TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT
    );
  END IF;

  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'session_token'
  ) THEN
    ALTER TABLE story_login_logs ADD COLUMN session_token TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'logout_at'
  ) THEN
    ALTER TABLE story_login_logs ADD COLUMN logout_at TIMESTAMP;
  END IF;

  -- Rename login_time to login_at if it exists (for backward compatibility)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'login_time'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'login_at'
  ) THEN
    ALTER TABLE story_login_logs RENAME COLUMN login_time TO login_at;
  END IF;
END $$;

-- Create indexes (ignore if they already exist)
CREATE INDEX IF NOT EXISTS idx_story_login_logs_time ON story_login_logs(COALESCE(login_at, login_time) DESC);
CREATE INDEX IF NOT EXISTS idx_story_login_logs_user ON story_login_logs(username);

-- 4. STORY MESSAGE HISTORY TABLE
-- Complete history of all messages and media (permanent record)
DO $$
BEGIN
  -- Create table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'story_message_history'
  ) THEN
    CREATE TABLE story_message_history (
      id SERIAL PRIMARY KEY,
      week_start_date DATE NOT NULL,
      message_type VARCHAR(20) NOT NULL, -- 'text', 'image', 'video'
      message_content TEXT,
      media_url TEXT,
      media_filename TEXT,
      author VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP,
      is_expired BOOLEAN DEFAULT FALSE
    );
  END IF;

  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_message_history' AND column_name = 'is_from_admin'
  ) THEN
    ALTER TABLE story_message_history ADD COLUMN is_from_admin BOOLEAN DEFAULT FALSE;
  END IF;

  -- Rename message_content to content if needed for backward compatibility
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_message_history' AND column_name = 'message_content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_message_history' AND column_name = 'content'
  ) THEN
    ALTER TABLE story_message_history RENAME COLUMN message_content TO content;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_story_message_week ON story_message_history(week_start_date);
CREATE INDEX IF NOT EXISTS idx_story_message_time ON story_message_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_message_expired ON story_message_history(is_expired, expires_at);

-- 5. STORY ADMIN USERS TABLE
-- Admin authentication
CREATE TABLE IF NOT EXISTS story_admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- =============================================
-- SEED DATA - Users
-- Passwords: T=redoux, Z=oe
-- =============================================

-- Regular users (story viewers)
INSERT INTO story_users (username, password_hash) VALUES
  ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'),
  ('Z', '$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- Admin user
INSERT INTO story_admin_users (username, password_hash) VALUES
  ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

-- =============================================
-- FUNCTION: Mark expired messages
-- Call this periodically or via pg_cron
-- =============================================

CREATE OR REPLACE FUNCTION mark_expired_messages()
RETURNS void AS $$
BEGIN
  UPDATE story_message_history
  SET is_expired = TRUE
  WHERE is_expired = FALSE
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STORAGE BUCKET SETUP
-- Run this separately in Supabase Storage settings
-- Or use the SQL below if using storage extension
-- =============================================

-- Create the storage bucket (run in Supabase Dashboard > Storage)
-- Bucket name: story-uploads
-- Public: Yes

-- If you have the storage extension, you can use:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('story-uploads', 'story-uploads', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies (create in Supabase Dashboard > Storage > Policies):
-- 
-- Policy 1: Allow authenticated uploads
-- Name: Allow uploads
-- Operation: INSERT
-- Target roles: authenticated
-- Policy: true
--
-- Policy 2: Allow public reads
-- Name: Allow public reads
-- Operation: SELECT
-- Target roles: public
-- Policy: true

-- =============================================
-- OPTIONAL: Schedule expiration check (pg_cron)
-- Only works if pg_cron extension is enabled
-- =============================================

-- SELECT cron.schedule(
--   'mark-expired-story-messages',
--   '0 * * * *',  -- Every hour
--   'SELECT mark_expired_messages()'
-- );

-- =============================================
-- VERIFICATION QUERIES
-- Run these to verify setup
-- =============================================

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'story%' OR table_name = 'secret_stories';

-- Check users exist
SELECT username FROM story_users;
SELECT username FROM story_admin_users;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename LIKE 'story%';
