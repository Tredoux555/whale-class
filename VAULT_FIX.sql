-- =============================================
-- VAULT SYSTEM FIX - Run in Supabase SQL Editor
-- =============================================

-- 1. Ensure vault_files table exists
CREATE TABLE IF NOT EXISTS vault_files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  file_hash VARCHAR(255) NOT NULL,
  uploaded_by VARCHAR(50) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Ensure audit log table exists
CREATE TABLE IF NOT EXISTS vault_audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  admin_username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  details TEXT,
  success BOOLEAN DEFAULT TRUE,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_vault_files_date ON vault_files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_audit_time ON vault_audit_log(timestamp DESC);

-- Verify
SELECT 'vault_files' as tbl, count(*) FROM vault_files
UNION ALL
SELECT 'vault_audit_log', count(*) FROM vault_audit_log;
