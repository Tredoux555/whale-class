-- Migration 125: Social Media Manager Tables
-- Created: Feb 14, 2026

-- Content Library: Store final videos/images with metadata
CREATE TABLE IF NOT EXISTS social_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('video', 'image')),
  caption TEXT,
  hashtags TEXT,
  platforms_posted TEXT[], -- Array like ['instagram', 'tiktok', 'facebook']
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Social Accounts: Encrypted credentials for each platform
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'facebook', 'linkedin', 'youtube', 'twitter')),
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Post Log: Manual tracking of what was posted where
CREATE TABLE IF NOT EXISTS social_post_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES social_content_library(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  post_url TEXT,
  caption_used TEXT,
  hashtags_used TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_library_created ON social_content_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_library_platforms ON social_content_library USING GIN(platforms_posted);
CREATE INDEX IF NOT EXISTS idx_post_log_platform ON social_post_log(platform);
CREATE INDEX IF NOT EXISTS idx_post_log_posted_at ON social_post_log(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_log_content_id ON social_post_log(content_id);
