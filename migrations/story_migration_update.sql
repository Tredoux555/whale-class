-- =====================================================
-- STORY MESSAGING SYSTEM - MIGRATION UPDATE
-- Run this AFTER the existing tables are created
-- This updates existing tables to match the new schema
-- =====================================================

-- =====================================================
-- UPDATE 1: Add missing columns to story_users
-- =====================================================
DO $$ 
BEGIN
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE story_users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;

  -- Add display_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_users' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE story_users ADD COLUMN display_name VARCHAR(100);
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE story_users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Update existing users to have is_active = TRUE
  UPDATE story_users SET is_active = TRUE WHERE is_active IS NULL;
END $$;

-- =====================================================
-- UPDATE 2: Migrate story_login_logs to new schema
-- =====================================================
DO $$ 
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_login_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE story_login_logs ADD COLUMN user_id INTEGER REFERENCES story_users(id) ON DELETE CASCADE;
    
    -- Populate user_id from username (if possible)
    UPDATE story_login_logs log
    SET user_id = u.id
    FROM story_users u
    WHERE log.username = u.username AND log.user_id IS NULL;
  END IF;

  -- Rename login_time to login_at if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_login_logs' AND column_name = 'login_time'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_login_logs' AND column_name = 'login_at'
  ) THEN
    ALTER TABLE story_login_logs RENAME COLUMN login_time TO login_at;
  END IF;

  -- Add logout_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_login_logs' AND column_name = 'logout_at'
  ) THEN
    ALTER TABLE story_login_logs ADD COLUMN logout_at TIMESTAMPTZ;
  END IF;

  -- Rename session_id to session_token if session_id exists and session_token doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_login_logs' AND column_name = 'session_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_login_logs' AND column_name = 'session_token'
  ) THEN
    ALTER TABLE story_login_logs RENAME COLUMN session_id TO session_token;
  END IF;

  -- Ensure login_at is TIMESTAMPTZ (not TIMESTAMP)
  -- This is handled by the column rename above, but we'll ensure it's correct
END $$;

-- =====================================================
-- UPDATE 3: Add admin_message to secret_stories
-- =====================================================
DO $$ 
BEGIN
  -- Add admin_message column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secret_stories' AND column_name = 'admin_message'
  ) THEN
    ALTER TABLE secret_stories ADD COLUMN admin_message TEXT;
  END IF;
END $$;

-- =====================================================
-- UPDATE 4: Migrate story_message_history to new schema
-- =====================================================
DO $$ 
BEGIN
  -- Rename message_content to content if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_message_history' AND column_name = 'message_content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_message_history' AND column_name = 'content'
  ) THEN
    ALTER TABLE story_message_history RENAME COLUMN message_content TO content;
  END IF;

  -- Add missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_message_history' AND column_name = 'media_size_bytes'
  ) THEN
    ALTER TABLE story_message_history ADD COLUMN media_size_bytes INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_message_history' AND column_name = 'media_mime_type'
  ) THEN
    ALTER TABLE story_message_history ADD COLUMN media_mime_type VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_message_history' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE story_message_history ADD COLUMN thumbnail_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_message_history' AND column_name = 'is_from_admin'
  ) THEN
    ALTER TABLE story_message_history ADD COLUMN is_from_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- =====================================================
-- UPDATE 5: Create story_online_sessions table
-- =====================================================
CREATE TABLE IF NOT EXISTS story_online_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES story_users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_online_sessions_token ON story_online_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_online_sessions_online ON story_online_sessions(is_online) WHERE is_online = TRUE;

-- =====================================================
-- UPDATE 6: Create indexes if they don't exist
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_login_logs_user ON story_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_date ON story_login_logs(login_at DESC);

-- =====================================================
-- UPDATE 7: Create helper functions
-- =====================================================

-- Function to clean up expired media
CREATE OR REPLACE FUNCTION cleanup_expired_media()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE story_message_history
  SET is_expired = TRUE
  WHERE expires_at < NOW() AND is_expired = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark user as offline (for stale sessions)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE story_online_sessions
  SET is_online = FALSE
  WHERE last_seen_at < NOW() - INTERVAL '5 minutes' AND is_online = TRUE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update last_seen
CREATE OR REPLACE FUNCTION update_user_last_seen(p_session_token TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE story_online_sessions
  SET last_seen_at = NOW(), is_online = TRUE
  WHERE session_token = p_session_token;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMPLETE!
-- =====================================================

