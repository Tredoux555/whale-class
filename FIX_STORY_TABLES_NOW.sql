-- DIRECT FIX: Story Admin Tables
-- Copy and paste this into Supabase SQL Editor and run it

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS story_message_history CASCADE;
DROP TABLE IF EXISTS story_login_logs CASCADE;

-- Create story_message_history table
CREATE TABLE story_message_history (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  message_content TEXT,
  media_url TEXT,
  media_filename TEXT,
  author VARCHAR(50) NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_expired BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX idx_story_message_history_week ON story_message_history(week_start_date);
CREATE INDEX idx_story_message_history_created ON story_message_history(created_at DESC);
CREATE INDEX idx_story_message_history_expired ON story_message_history(is_expired, expires_at);

-- Create story_login_logs table
CREATE TABLE story_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  login_time TIMESTAMP DEFAULT NOW(),
  session_id TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_story_login_logs_time ON story_login_logs(login_time DESC);
CREATE INDEX idx_story_login_logs_username ON story_login_logs(username);

-- Verify tables were created
SELECT 'story_message_history' as table_name, COUNT(*) as row_count FROM story_message_history
UNION ALL
SELECT 'story_login_logs' as table_name, COUNT(*) as row_count FROM story_login_logs
UNION ALL
SELECT 'secret_stories' as table_name, COUNT(*) as row_count FROM secret_stories;

-- If secret_stories is missing, create it too
CREATE TABLE IF NOT EXISTS secret_stories (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  theme VARCHAR(255) NOT NULL DEFAULT 'Weekly Story',
  story_title VARCHAR(255) NOT NULL DEFAULT 'Our Story',
  story_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  hidden_message TEXT,
  message_author VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secret_stories_week ON secret_stories(week_start_date);

-- Show final table list
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('story_message_history', 'story_login_logs', 'secret_stories', 'story_admin_users')
ORDER BY table_name;

