-- COMPLETE PARENT PORTAL SQL MIGRATIONS
-- Run this ENTIRE script in Supabase SQL Editor
-- Combines all tables needed for parent portal functionality

-- =====================================================
-- 1. PARENT ACCESS CODES TABLE
-- Teachers generate these codes for parents to link accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS parent_access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(8) NOT NULL UNIQUE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_access_codes_code ON parent_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_parent_access_codes_child ON parent_access_codes(child_id);

ALTER TABLE parent_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to parent_access_codes" ON parent_access_codes;
CREATE POLICY "Service role full access to parent_access_codes" 
ON parent_access_codes FOR ALL 
USING (true) 
WITH CHECK (true);

-- =====================================================
-- 2. PARENT SESSIONS TABLE
-- Stores active parent login sessions
-- =====================================================
CREATE TABLE IF NOT EXISTS parent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(64) NOT NULL UNIQUE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_sessions_token ON parent_sessions(token);
CREATE INDEX IF NOT EXISTS idx_parent_sessions_child ON parent_sessions(child_id);

ALTER TABLE parent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to parent_sessions" ON parent_sessions;
CREATE POLICY "Service role full access to parent_sessions" 
ON parent_sessions FOR ALL 
USING (true) 
WITH CHECK (true);

-- =====================================================
-- 3. PARENT PHONE CODES TABLE (Optional SMS verification)
-- =====================================================
CREATE TABLE IF NOT EXISTS parent_phone_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_phone_codes_phone ON parent_phone_codes(phone);

ALTER TABLE parent_phone_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to parent_phone_codes" ON parent_phone_codes;
CREATE POLICY "Service role full access to parent_phone_codes" 
ON parent_phone_codes FOR ALL 
USING (true) 
WITH CHECK (true);

-- =====================================================
-- 4. REPORT SHARE TOKENS TABLE
-- Required for auto-sharing reports with parents
-- =====================================================
CREATE TABLE IF NOT EXISTS report_share_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES montree_weekly_reports(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_share_tokens_token ON report_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_report_share_tokens_report ON report_share_tokens(report_id);

ALTER TABLE report_share_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to report_share_tokens" ON report_share_tokens;
CREATE POLICY "Service role full access to report_share_tokens" 
ON report_share_tokens FOR ALL 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view valid share tokens" ON report_share_tokens;
CREATE POLICY "Public can view valid share tokens" 
ON report_share_tokens FOR SELECT 
USING (revoked = false AND expires_at > NOW());

-- =====================================================
-- VERIFICATION: Show tables created
-- =====================================================
SELECT 'parent_access_codes' as table_name, COUNT(*) as count FROM parent_access_codes
UNION ALL
SELECT 'parent_sessions', COUNT(*) FROM parent_sessions
UNION ALL
SELECT 'parent_phone_codes', COUNT(*) FROM parent_phone_codes
UNION ALL
SELECT 'report_share_tokens', COUNT(*) FROM report_share_tokens;
