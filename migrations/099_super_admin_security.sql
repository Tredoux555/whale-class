-- Migration: 099_super_admin_security.sql
-- Maximum security for super admin access to protect children's data

-- ============================================
-- 1. AUDIT LOG TABLE (Immutable append-only)
-- ============================================
CREATE TABLE IF NOT EXISTS montree_super_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHO
  admin_identifier TEXT NOT NULL, -- Could be email, username, or IP

  -- WHAT
  action TEXT NOT NULL, -- 'view', 'reveal', 'edit', 'delete', 'login', 'login_failed'
  resource_type TEXT NOT NULL, -- 'school', 'classroom', 'teacher', 'child', 'login_code', 'system'
  resource_id TEXT, -- UUID of the resource accessed (nullable for system actions)
  resource_details JSONB, -- Additional context (school name, etc.)

  -- WHEN
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- WHERE
  ip_address TEXT,
  user_agent TEXT,

  -- SECURITY FLAGS
  is_sensitive BOOLEAN DEFAULT FALSE, -- True if accessing PII or login codes
  requires_review BOOLEAN DEFAULT FALSE -- Flag for suspicious activity
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON montree_super_admin_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON montree_super_admin_audit(admin_identifier);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON montree_super_admin_audit(resource_type, resource_id);

-- ============================================
-- 2. SUPER ADMIN CONFIG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS montree_super_admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- TOTP 2FA
  totp_secret TEXT, -- Encrypted TOTP secret for 2FA
  totp_enabled BOOLEAN DEFAULT FALSE,
  totp_backup_codes TEXT[], -- Encrypted backup codes

  -- IP ALLOWLIST
  allowed_ips TEXT[] DEFAULT '{}', -- Empty = allow all (during setup)
  ip_allowlist_enabled BOOLEAN DEFAULT FALSE,

  -- SESSION CONFIG
  session_timeout_minutes INT DEFAULT 15,
  require_reauth_for_sensitive BOOLEAN DEFAULT TRUE,

  -- ALERTS
  alert_email TEXT,
  alert_webhook_url TEXT,
  alert_on_login BOOLEAN DEFAULT TRUE,
  alert_on_sensitive_access BOOLEAN DEFAULT TRUE,

  -- METADATA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config if not exists
INSERT INTO montree_super_admin_config (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. SUPER ADMIN SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS montree_super_admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session token (hashed)
  token_hash TEXT NOT NULL UNIQUE,

  -- Session info
  ip_address TEXT NOT NULL,
  user_agent TEXT,

  -- 2FA status for this session
  totp_verified BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- Revocation
  revoked BOOLEAN DEFAULT FALSE,
  revoked_reason TEXT
);

-- Index for session lookup
CREATE INDEX IF NOT EXISTS idx_sessions_token ON montree_super_admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON montree_super_admin_sessions(expires_at);

-- ============================================
-- 4. ENCRYPT LOGIN CODES (Add encryption column)
-- ============================================
-- We'll store encrypted versions alongside originals during migration
ALTER TABLE montree_teachers
ADD COLUMN IF NOT EXISTS login_code_encrypted TEXT;

-- ============================================
-- 5. ROW-LEVEL SECURITY POLICIES
-- ============================================
-- Prevent direct deletion of audit logs (even by super admin)
-- This requires RLS to be enabled

-- Note: Run these manually in Supabase dashboard if needed:
-- ALTER TABLE montree_super_admin_audit ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "No delete on audit" ON montree_super_admin_audit FOR DELETE USING (false);
-- CREATE POLICY "Insert only for audit" ON montree_super_admin_audit FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Select for authenticated" ON montree_super_admin_audit FOR SELECT USING (true);
