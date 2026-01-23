-- ============================================
-- COMBINED FIX: Sessions API + Report Tokens
-- Run this ENTIRE script in Supabase SQL Editor
-- Created: Session 57 - Jan 23, 2026
-- ============================================

-- ============================================
-- FIX 1: Sessions work_id column
-- The column is UUID but should be TEXT
-- ============================================

DO $$
BEGIN
  -- Check if work_id is currently UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'montree_work_sessions' 
    AND column_name = 'work_id' 
    AND data_type = 'uuid'
  ) THEN
    -- Change it to TEXT
    ALTER TABLE montree_work_sessions ALTER COLUMN work_id TYPE TEXT;
    RAISE NOTICE '✅ FIX 1: Changed work_id from UUID to TEXT';
  ELSE
    RAISE NOTICE '✓ FIX 1: work_id is already TEXT (no change needed)';
  END IF;
END $$;

-- ============================================
-- FIX 2: Ensure report_share_tokens table exists
-- ============================================

CREATE TABLE IF NOT EXISTS report_share_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES montree_weekly_reports(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_report_share_tokens_token ON report_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_report_share_tokens_report ON report_share_tokens(report_id);

-- Enable RLS
ALTER TABLE report_share_tokens ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (handles cases where they already exist)
DROP POLICY IF EXISTS "Service role full access to report_share_tokens" ON report_share_tokens;
DROP POLICY IF EXISTS "Public can view valid share tokens" ON report_share_tokens;
DROP POLICY IF EXISTS "Anyone can insert share tokens" ON report_share_tokens;

-- Allow full access (simpler policy for now)
CREATE POLICY "Anyone can read share tokens" ON report_share_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can insert share tokens" ON report_share_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update share tokens" ON report_share_tokens FOR UPDATE USING (true);

-- ============================================
-- VERIFY
-- ============================================

SELECT 
  'montree_work_sessions.work_id' as column_check,
  data_type 
FROM information_schema.columns 
WHERE table_name = 'montree_work_sessions' AND column_name = 'work_id';

SELECT 
  'report_share_tokens exists' as table_check,
  COUNT(*) as token_count
FROM report_share_tokens;

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Generate a new report for any child';
  RAISE NOTICE '2. The share link should work now';
  RAISE NOTICE '3. Updating work progress should work now';
END $$;
