-- Migration: 057_report_tokens.sql
-- Date: 2026-01-18
-- Purpose: Magic link tokens for Parent Portal (Phase 6)
-- Session: 57

-- ============================================
-- REPORT TOKENS TABLE
-- ============================================
-- Secure, time-limited tokens for parent access to reports
-- No login required - just the magic link

CREATE TABLE IF NOT EXISTS montree_report_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to report
  report_id UUID NOT NULL REFERENCES montree_weekly_reports(id) ON DELETE CASCADE,
  
  -- The secure token (64-char hex string)
  token VARCHAR(64) UNIQUE NOT NULL,
  
  -- Expiry and lifecycle
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,  -- Teacher name who generated the link
  
  -- Access tracking
  first_accessed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INT DEFAULT 0,
  
  -- Optional: Restrict by email (future feature)
  restricted_to_email TEXT,
  
  -- Revocation
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT
);

-- ============================================
-- INDEXES
-- ============================================

-- Fast token lookup (primary use case)
CREATE INDEX IF NOT EXISTS idx_report_tokens_token 
  ON montree_report_tokens(token) 
  WHERE is_revoked = FALSE;

-- Find tokens by report (for management UI)
CREATE INDEX IF NOT EXISTS idx_report_tokens_report 
  ON montree_report_tokens(report_id);

-- Find expired tokens (for cleanup)
CREATE INDEX IF NOT EXISTS idx_report_tokens_expiry 
  ON montree_report_tokens(expires_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE montree_report_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read for valid tokens (public access)
CREATE POLICY "Public can read valid tokens"
  ON montree_report_tokens
  FOR SELECT
  TO anon
  USING (
    is_revoked = FALSE 
    AND expires_at > NOW()
  );

-- Allow authenticated users to manage their tokens
CREATE POLICY "Authenticated users can manage tokens"
  ON montree_report_tokens
  FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE montree_report_tokens IS 'Magic link tokens for parent access to weekly reports';
COMMENT ON COLUMN montree_report_tokens.token IS '64-character secure hex token used in URL';
COMMENT ON COLUMN montree_report_tokens.expires_at IS 'Token expires after this timestamp (default 30 days)';
COMMENT ON COLUMN montree_report_tokens.access_count IS 'Number of times the link has been accessed';
COMMENT ON COLUMN montree_report_tokens.restricted_to_email IS 'Optional: Only allow access if viewer verifies this email';

-- ============================================
-- DONE: Report tokens table ready for magic links
-- ============================================
