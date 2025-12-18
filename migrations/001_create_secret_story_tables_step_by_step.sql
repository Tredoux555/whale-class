-- Secret Story Messaging System - Step by Step SQL
-- Run each section separately in Supabase SQL Editor if the combined version fails

-- STEP 1: Create secret_stories table
CREATE TABLE IF NOT EXISTS secret_stories (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  theme VARCHAR(255) NOT NULL,
  story_title VARCHAR(255) NOT NULL,
  story_content JSONB NOT NULL,
  hidden_message TEXT,
  message_author VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- STEP 2: Create story_users table
CREATE TABLE IF NOT EXISTS story_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(10) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- STEP 3: Create index
CREATE INDEX IF NOT EXISTS idx_secret_stories_week ON secret_stories(week_start_date);









