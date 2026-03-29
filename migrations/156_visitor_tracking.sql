-- Migration 156: Visitor Tracking
-- Tracks page visits with geolocation data for outreach campaign analytics
-- Uses ip-api.com free tier (45 req/min) via existing lib/ip-geolocation.ts

-- Visitor log table
CREATE TABLE IF NOT EXISTS montree_visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Location data (from IP geolocation)
  ip TEXT,
  country TEXT,
  country_code TEXT,
  city TEXT,
  region TEXT,
  timezone TEXT,
  -- Visit data
  page_url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  -- Session fingerprint (hash of IP + user agent for grouping visits)
  fingerprint TEXT,
  -- Timestamps
  visited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for super-admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_montree_visitors_visited_at ON montree_visitors (visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_montree_visitors_country ON montree_visitors (country);
CREATE INDEX IF NOT EXISTS idx_montree_visitors_fingerprint ON montree_visitors (fingerprint);
CREATE INDEX IF NOT EXISTS idx_montree_visitors_page_url ON montree_visitors (page_url);

-- Composite index for date range + country queries (dashboard filters)
CREATE INDEX IF NOT EXISTS idx_montree_visitors_date_country ON montree_visitors (visited_at DESC, country);

-- Auto-cleanup: keep only last 90 days of data (run manually or via cron)
-- DELETE FROM montree_visitors WHERE visited_at < NOW() - INTERVAL '90 days';
