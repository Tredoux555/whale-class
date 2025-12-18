-- Story Admin System - SIMPLE VERSION (Run this first)
-- Run this in Supabase SQL Editor
-- This version removes the cron job which might fail

-- Table for tracking all story logins
CREATE TABLE IF NOT EXISTS story_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(10) NOT NULL,
  login_time TIMESTAMP DEFAULT NOW(),
  session_id TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_story_login_logs_time ON story_login_logs(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_story_login_logs_username ON story_login_logs(username);

-- Table for storing complete message/media history
CREATE TABLE IF NOT EXISTS story_message_history (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  message_type VARCHAR(20) NOT NULL, -- 'text', 'image', 'video'
  message_content TEXT,
  media_url TEXT,
  media_filename TEXT,
  author VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- When it disappears from public view
  is_expired BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_story_message_history_week ON story_message_history(week_start_date);
CREATE INDEX IF NOT EXISTS idx_story_message_history_created ON story_message_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_message_history_expired ON story_message_history(is_expired, expires_at);

-- Table for admin authentication
CREATE TABLE IF NOT EXISTS story_admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Insert default admin user (password will be: 8706025176086)
-- Hash generated with bcrypt rounds=10
INSERT INTO story_admin_users (username, password_hash) 
VALUES ('Tredoux', '$2b$10$0ZM4XYREQBobM6GcBdq4f.0FRMG.8vLexHng8flJzHiDrcUL.iblm')
ON CONFLICT (username) DO NOTHING;

-- Function to automatically mark messages as expired
CREATE OR REPLACE FUNCTION mark_expired_messages()
RETURNS void AS $$
BEGIN
  UPDATE story_message_history
  SET is_expired = TRUE
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() 
    AND is_expired = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE story_login_logs IS 'Tracks every login to the story system';
COMMENT ON TABLE story_message_history IS 'Complete history of all messages and media, preserved even after public expiry';
COMMENT ON TABLE story_admin_users IS 'Admin users who can access the admin dashboard';

