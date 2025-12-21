-- =====================================================
-- STORY MESSAGING SYSTEM - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing tables if you want a clean slate (CAREFUL!)
-- DROP TABLE IF EXISTS story_message_history CASCADE;
-- DROP TABLE IF EXISTS story_login_logs CASCADE;
-- DROP TABLE IF EXISTS story_online_sessions CASCADE;
-- DROP TABLE IF EXISTS story_admin_users CASCADE;
-- DROP TABLE IF EXISTS story_users CASCADE;
-- DROP TABLE IF EXISTS secret_stories CASCADE;

-- =====================================================
-- TABLE 1: Story Users (T and Z)
-- =====================================================
CREATE TABLE IF NOT EXISTS story_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrate existing table to new schema
DO $$ 
BEGIN
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE story_users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    UPDATE story_users SET is_active = TRUE WHERE is_active IS NULL;
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
END $$;

-- =====================================================
-- TABLE 2: Admin Users (Separate from story users)
-- =====================================================
CREATE TABLE IF NOT EXISTS story_admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 3: Weekly Stories (Auto-generated)
-- =====================================================
CREATE TABLE IF NOT EXISTS secret_stories (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  theme VARCHAR(255) NOT NULL,
  story_title VARCHAR(255) NOT NULL,
  story_content JSONB NOT NULL, -- { paragraphs: string[] }
  hidden_message TEXT,
  message_author VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add admin_message column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secret_stories' AND column_name = 'admin_message'
  ) THEN
    ALTER TABLE secret_stories ADD COLUMN admin_message TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_secret_stories_week ON secret_stories(week_start_date);

-- =====================================================
-- TABLE 4: Login Logs (Track who logged in when)
-- =====================================================
CREATE TABLE IF NOT EXISTS story_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_time TIMESTAMP DEFAULT NOW(),
  session_id TEXT
);

-- Migrate existing table to new schema
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

  -- Rename login_time to login_at if it exists and login_at doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_login_logs' AND column_name = 'login_time'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'story_login_logs' AND column_name = 'login_at'
  ) THEN
    ALTER TABLE story_login_logs RENAME COLUMN login_time TO login_at;
    ALTER TABLE story_login_logs ALTER COLUMN login_at TYPE TIMESTAMPTZ USING login_at::TIMESTAMPTZ;
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
END $$;

CREATE INDEX IF NOT EXISTS idx_login_logs_user ON story_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_date ON story_login_logs(login_at DESC);

-- =====================================================
-- TABLE 5: Online Sessions (Track who's currently online)
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
-- TABLE 6: Message History (Text + Media)
-- =====================================================
CREATE TABLE IF NOT EXISTS story_message_history (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  author VARCHAR(50) NOT NULL,
  message_type VARCHAR(20) NOT NULL,
  message_content TEXT,
  media_url TEXT,
  media_filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_expired BOOLEAN DEFAULT FALSE
);

-- Migrate existing table to new schema
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

  -- Add CHECK constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'story_message_history' 
    AND constraint_name = 'story_message_history_message_type_check'
  ) THEN
    ALTER TABLE story_message_history 
    ADD CONSTRAINT story_message_history_message_type_check 
    CHECK (message_type IN ('text', 'image', 'video'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_message_history_week ON story_message_history(week_start_date);
CREATE INDEX IF NOT EXISTS idx_message_history_type ON story_message_history(message_type);
CREATE INDEX IF NOT EXISTS idx_message_history_expired ON story_message_history(is_expired, expires_at);

-- =====================================================
-- FUNCTIONS
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
-- STORAGE BUCKET FOR MEDIA
-- =====================================================

-- Create storage bucket for story media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'story-media',
  'story-media',
  true,
  52428800, -- 50MB limit for videos
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read access for story media"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-media');

CREATE POLICY "Authenticated upload for story media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'story-media');

CREATE POLICY "Authenticated delete for story media"
ON storage.objects FOR DELETE
USING (bucket_id = 'story-media');

-- =====================================================
-- SEED DATA: Create test users (T and Z)
-- Password: "love" (you should change this!)
-- Hash generated with bcrypt, 10 rounds
-- =====================================================

-- Generate hashes for password "love" using bcrypt
-- You'll need to generate these in your app or use:
-- await bcrypt.hash('love', 10)

-- INSERT INTO story_users (username, password_hash, display_name) VALUES
--   ('T', '$2a$10$YOUR_HASH_HERE', 'T'),
--   ('Z', '$2a$10$YOUR_HASH_HERE', 'Z');

-- INSERT INTO story_admin_users (username, password_hash) VALUES
--   ('admin', '$2a$10$YOUR_ADMIN_HASH_HERE');

-- =====================================================
-- COMPLETE!
-- =====================================================

