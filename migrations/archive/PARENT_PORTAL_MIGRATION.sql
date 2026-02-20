-- PARENT PORTAL TABLES
-- Run this in Supabase SQL Editor to enable parent login features

-- =====================================================
-- PARENT ACCESS CODES TABLE
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

-- Index for fast code lookup
CREATE INDEX IF NOT EXISTS idx_parent_access_codes_code ON parent_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_parent_access_codes_child ON parent_access_codes(child_id);

-- =====================================================
-- PARENT SESSIONS TABLE
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

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_parent_sessions_token ON parent_sessions(token);
CREATE INDEX IF NOT EXISTS idx_parent_sessions_child ON parent_sessions(child_id);

-- =====================================================
-- PARENT PHONE VERIFICATION CODES TABLE
-- For SMS-based login (optional)
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

-- Index for phone lookup
CREATE INDEX IF NOT EXISTS idx_parent_phone_codes_phone ON parent_phone_codes(phone);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE parent_access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_phone_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API routes)
CREATE POLICY "Service role full access to parent_access_codes" 
ON parent_access_codes FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to parent_sessions" 
ON parent_sessions FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to parent_phone_codes" 
ON parent_phone_codes FOR ALL 
USING (true) 
WITH CHECK (true);

-- =====================================================
-- CLEANUP JOB (run periodically)
-- Delete expired codes and sessions
-- =====================================================
-- You can run this manually or set up a cron job:
-- DELETE FROM parent_access_codes WHERE expires_at < NOW();
-- DELETE FROM parent_sessions WHERE expires_at < NOW();
-- DELETE FROM parent_phone_codes WHERE expires_at < NOW();
