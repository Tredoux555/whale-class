-- Migration 185 — Principal Vault for parent-meeting recordings
--
-- Stores encrypted summaries of parent conversations, end-to-end encrypted
-- with a key derived from the principal's vault password (PBKDF2-SHA256,
-- 600k iterations, AES-256-GCM). The server is a dumb encrypted-blob
-- bucket with auth — it never sees the password and cannot decrypt the
-- blobs. If the principal forgets the password, the data is unrecoverable.
--
-- Initial deploy: gated to a single principal (Tredoux on Whale Class) at
-- the route level. Wider rollout requires a feature flag + legal review of
-- recording consent rules in target jurisdictions.
--
-- The plain `summary`, `transcript`, `child_id`, `child_name` are NEVER stored
-- on this table — they live inside the encrypted ciphertext. Only metadata
-- the server needs for listing (created_at, duration, optional encrypted
-- preview ciphertext for the list view) is on the row.
--
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS montree_principal_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id UUID NOT NULL REFERENCES montree_school_admins(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- Crypto parameters. Each record has its own salt + iv. The ciphertext is
  -- AES-256-GCM(plaintext) where plaintext is a JSON object containing
  -- { summary, transcript, child_id?, child_name?, meeting_date, duration_seconds }.
  salt_b64 TEXT NOT NULL,        -- 16 bytes, base64
  iv_b64 TEXT NOT NULL,          -- 12 bytes, base64
  ciphertext_b64 TEXT NOT NULL,  -- variable, base64
  pbkdf2_iterations INTEGER NOT NULL DEFAULT 600000, -- in case we bump in the future
  cipher_version SMALLINT NOT NULL DEFAULT 1,        -- bump if scheme changes

  -- Plaintext metadata for the list view. Nothing identifying — just enough
  -- for the principal to see "May 4, 30min, encrypted" without unlocking.
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER, -- nullable; for typed-only entries with no audio

  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_principal_vault_principal_recorded
  ON montree_principal_vault (principal_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_principal_vault_school
  ON montree_principal_vault (school_id);

-- updated_at trigger — only on actual content changes (deletes don't touch it).
CREATE OR REPLACE FUNCTION update_principal_vault_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS principal_vault_set_updated_at ON montree_principal_vault;
CREATE TRIGGER principal_vault_set_updated_at
  BEFORE UPDATE ON montree_principal_vault
  FOR EACH ROW EXECUTE FUNCTION update_principal_vault_updated_at();

-- No RLS policies needed: server uses service_role + every route filters by
-- principal_id matching the authenticated principal. Standard pattern.

COMMENT ON TABLE montree_principal_vault IS
  'End-to-end encrypted vault for principal parent-meeting recordings. Server cannot decrypt.';
