-- =============================================
-- VAULT SYSTEM - Database Tables
-- Run this in Supabase SQL Editor
-- =============================================

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

CREATE TABLE IF NOT EXISTS vault_audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(50) NOT NULL,
  admin_username VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  details TEXT,
  success BOOLEAN DEFAULT TRUE,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_unlock_attempts (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  last_attempt TIMESTAMP DEFAULT NOW(),
  locked_until TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_files_date ON vault_files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vault_audit_time ON vault_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vault_attempts_ip ON vault_unlock_attempts(ip_address);

