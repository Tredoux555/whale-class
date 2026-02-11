-- Migration: 123_fix_story_columns_and_audit_table.sql
-- Fixes database mismatches discovered during post-Phase 9 audit:
-- 1. Renames login_time → login_at in story_login_logs (Phase 3 code change was made but DB column never renamed)
-- 2. Renames login_time → login_at in story_admin_login_logs (same issue)
-- 3. Creates montree_super_admin_audit table (migration 099 was never applied)
-- 4. Creates montree_rate_limit_logs table if missing (Phase 5 rate limiting)

-- ============================================
-- 1. RENAME login_time → login_at in story_login_logs
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs' AND column_name = 'login_time'
  ) THEN
    ALTER TABLE story_login_logs RENAME COLUMN login_time TO login_at;
    RAISE NOTICE 'Renamed story_login_logs.login_time → login_at';
  ELSE
    RAISE NOTICE 'story_login_logs.login_at already exists (or table missing)';
  END IF;
END $$;

-- Also widen the column if it's varchar(10) — too short for ISO timestamps
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_login_logs'
      AND column_name = 'login_at'
      AND character_maximum_length IS NOT NULL
      AND character_maximum_length < 30
  ) THEN
    ALTER TABLE story_login_logs ALTER COLUMN login_at TYPE TEXT;
    RAISE NOTICE 'Widened story_login_logs.login_at to TEXT';
  END IF;
END $$;

-- ============================================
-- 2. RENAME login_time → login_at in story_admin_login_logs
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_admin_login_logs' AND column_name = 'login_time'
  ) THEN
    ALTER TABLE story_admin_login_logs RENAME COLUMN login_time TO login_at;
    RAISE NOTICE 'Renamed story_admin_login_logs.login_time → login_at';
  ELSE
    RAISE NOTICE 'story_admin_login_logs.login_at already exists (or table missing)';
  END IF;
END $$;

-- Also widen the column if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_admin_login_logs'
      AND column_name = 'login_at'
      AND character_maximum_length IS NOT NULL
      AND character_maximum_length < 30
  ) THEN
    ALTER TABLE story_admin_login_logs ALTER COLUMN login_at TYPE TEXT;
    RAISE NOTICE 'Widened story_admin_login_logs.login_at to TEXT';
  END IF;
END $$;

-- ============================================
-- 3. CREATE montree_super_admin_audit TABLE
-- (From migration 099 which was never applied)
-- ============================================
CREATE TABLE IF NOT EXISTS montree_super_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  resource_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE,
  requires_review BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_audit_created_at ON montree_super_admin_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON montree_super_admin_audit(admin_identifier);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON montree_super_admin_audit(resource_type, resource_id);

-- ============================================
-- 4. CREATE montree_rate_limit_logs TABLE (if missing)
-- ============================================
CREATE TABLE IF NOT EXISTS montree_rate_limit_logs (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_endpoint ON montree_rate_limit_logs(key, endpoint, created_at DESC);

-- Auto-cleanup: delete entries older than 1 hour (keeps table small)
-- Run manually or set up as a cron job:
-- DELETE FROM montree_rate_limit_logs WHERE created_at < NOW() - INTERVAL '1 hour';
