-- =====================================================
-- STORY APP - FIX EXISTING DATABASE
-- Run this to update your current database to work with new Opus code
-- =====================================================

-- First, check what we have
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('story_users', 'story_login_logs', 'story_message_history', 'secret_stories')
ORDER BY table_name, ordinal_position;

-- =====================================================
-- STEP 1: Add missing columns to story_users
-- =====================================================
DO $$
BEGIN
  -- Add id column if it doesn't exist (some schemas might not have it)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_users' AND column_name = 'id'
  ) THEN
    ALTER TABLE story_users ADD COLUMN id SERIAL PRIMARY KEY;
  END IF;

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
-- STEP 2: Update story_login_logs to new schema
-- =====================================================
DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE story_login_logs ADD COLUMN user_id INTEGER;
    -- Populate user_id from username (if possible)
    UPDATE story_login_logs log
    SET user_id = u.id
    FROM story_users u
    WHERE log.username = u.username AND log.user_id IS NULL;
  END IF;

  -- Add foreign key constraint (only if user_id column exists and users table has id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_users' AND column_name = 'id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'user_id'
  ) THEN
    -- Check if constraint already exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'story_login_logs'
      AND constraint_name = 'story_login_logs_user_id_fkey'
    ) THEN
      ALTER TABLE story_login_logs
      ADD CONSTRAINT story_login_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES story_users(id) ON DELETE CASCADE;
    END IF;
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
    ALTER TABLE story_login_logs ALTER COLUMN login_at TYPE TIMESTAMPTZ USING login_at::TIMESTAMPTZ;
  END IF;

  -- Add logout_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'logout_at'
  ) THEN
    ALTER TABLE story_login_logs ADD COLUMN logout_at TIMESTAMPTZ;
  END IF;

  -- Rename session_id to session_token if needed
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

-- =====================================================
-- STEP 3: Add admin_message to secret_stories
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'secret_stories' AND column_name = 'admin_message'
  ) THEN
    ALTER TABLE secret_stories ADD COLUMN admin_message TEXT;
  END IF;
END $$;

-- =====================================================
-- STEP 4: Update story_message_history to new schema
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

-- =====================================================
-- STEP 5: Create story_online_sessions table
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
-- STEP 6: Create story_admin_users table
-- =====================================================
CREATE TABLE IF NOT EXISTS story_admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 7: Create indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_login_logs_user ON story_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_date ON story_login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_secret_stories_week ON secret_stories(week_start_date);
CREATE INDEX IF NOT EXISTS idx_message_history_week ON story_message_history(week_start_date);
CREATE INDEX IF NOT EXISTS idx_message_history_type ON story_message_history(message_type);
CREATE INDEX IF NOT EXISTS idx_message_history_expired ON story_message_history(is_expired, expires_at);

-- =====================================================
-- STEP 8: Create helper functions
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
-- STEP 9: Create storage bucket for media
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
-- STEP 10: Verify everything worked
-- =====================================================

SELECT 'Migration completed successfully!' as status;

-- Show final schema
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('story_users', 'story_login_logs', 'story_message_history', 'secret_stories', 'story_online_sessions', 'story_admin_users')
ORDER BY table_name, ordinal_position;
