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
  display_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
  admin_message TEXT, -- Message from admin (appears when clicking 't')
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secret_stories_week ON secret_stories(week_start_date);

-- =====================================================
-- TABLE 4: Login Logs (Track who logged in when)
-- =====================================================
CREATE TABLE IF NOT EXISTS story_login_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES story_users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  session_token TEXT
);

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
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'image', 'video')),
  content TEXT, -- For text messages
  media_url TEXT, -- For images/videos (Supabase storage URL)
  media_filename TEXT,
  media_size_bytes INTEGER,
  media_mime_type VARCHAR(100),
  thumbnail_url TEXT, -- For video thumbnails
  is_from_admin BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

