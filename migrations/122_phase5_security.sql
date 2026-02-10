-- Migration: 122_phase5_security.sql
-- Phase 5: Password policy, rate limiting, and critical auth fixes

-- ============================================
-- 1. INSERT bcrypt hash for story admin user Z
-- (Required before removing hardcoded fallback credentials)
-- ============================================
INSERT INTO story_admin_users (username, password_hash) VALUES
  ('Z', '$2b$10$mb1J0CVnn/i1IDSUY4E0/OB1kl3esqY1xzf7vYsN.yXQfx593g02a')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ============================================
-- 2. Rate limit logs table (database-backed rate limiting)
-- Survives Railway container restarts (unlike in-memory)
-- ============================================
CREATE TABLE IF NOT EXISTS montree_rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,              -- IP address
  endpoint TEXT NOT NULL,         -- API route path
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_endpoint_time
  ON montree_rate_limit_logs(key, endpoint, created_at DESC);

-- Cleanup: periodically run this to remove old entries
-- DELETE FROM montree_rate_limit_logs WHERE created_at < NOW() - INTERVAL '7 days';
