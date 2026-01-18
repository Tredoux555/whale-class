-- Migration: Add session linking to story_message_history
-- Purpose: Link messages to login sessions for better activity tracking

-- ============================================
-- 1. Create admin login logs table
-- ============================================
CREATE TABLE IF NOT EXISTS story_admin_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  session_token VARCHAR(50),
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for admin login logs
CREATE INDEX IF NOT EXISTS idx_story_admin_login_logs_username 
ON story_admin_login_logs(username);

CREATE INDEX IF NOT EXISTS idx_story_admin_login_logs_session_token 
ON story_admin_login_logs(session_token);

CREATE INDEX IF NOT EXISTS idx_story_admin_login_logs_login_at 
ON story_admin_login_logs(login_at DESC);

-- ============================================
-- 2. Add session tracking columns to story_message_history
-- ============================================
ALTER TABLE story_message_history 
ADD COLUMN IF NOT EXISTS session_token VARCHAR(50),
ADD COLUMN IF NOT EXISTS login_log_id INTEGER;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_story_message_history_login_log_id 
ON story_message_history(login_log_id);

CREATE INDEX IF NOT EXISTS idx_story_message_history_session_token 
ON story_message_history(session_token);

-- Add is_from_admin column if not exists (for admin-sent messages)
ALTER TABLE story_message_history 
ADD COLUMN IF NOT EXISTS is_from_admin BOOLEAN DEFAULT FALSE;

-- ============================================
-- 3. Add comments for documentation
-- ============================================
COMMENT ON TABLE story_admin_login_logs IS 'Tracks admin login sessions for the story app';
COMMENT ON COLUMN story_admin_login_logs.session_token IS 'First 50 chars of JWT token for session tracking';

COMMENT ON COLUMN story_message_history.session_token IS 'First 50 chars of JWT token, matches login_logs.session_token';
COMMENT ON COLUMN story_message_history.login_log_id IS 'FK to login logs for linking messages to login sessions';
COMMENT ON COLUMN story_message_history.is_from_admin IS 'True if message was sent via admin panel';

-- ============================================
-- 4. Create view for activity with linked sessions
-- ============================================
CREATE OR REPLACE VIEW story_activity_with_sessions AS
SELECT 
  mh.id,
  mh.week_start_date,
  mh.message_type,
  mh.author,
  mh.created_at,
  mh.is_from_admin,
  mh.session_token,
  -- User login info (for user messages)
  ul.username as user_login_username,
  ul.login_at as user_login_at,
  ul.ip_address as user_ip,
  -- Admin login info (for admin messages)
  al.username as admin_login_username,
  al.login_at as admin_login_at,
  al.ip_address as admin_ip,
  -- Session linked status
  CASE 
    WHEN mh.is_from_admin = true AND al.id IS NOT NULL THEN true
    WHEN mh.is_from_admin = false AND ul.id IS NOT NULL THEN true
    ELSE false
  END as has_session_link
FROM story_message_history mh
LEFT JOIN story_login_logs ul ON mh.session_token = ul.session_token AND mh.is_from_admin = false
LEFT JOIN story_admin_login_logs al ON mh.session_token = al.session_token AND mh.is_from_admin = true
ORDER BY mh.created_at DESC;
