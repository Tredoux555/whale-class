-- Migration 194: Add login_code column to montree_school_admins
--
-- Session 98 — reverses the Session 84 "principal codes are never persisted"
-- design choice. The principal needs a visible 6-char login code in the
-- super-admin Schools list (alongside teacher codes) so super admin can
-- read it back to the principal who forgot theirs. Mirrors the teacher
-- pattern (montree_teachers.login_code).
--
-- The password_hash column stays — it's still the authentication path
-- (legacy SHA-256 hash of the same code). login_code is the human-readable
-- copy. UNIQUE so two principals can't share a code.
--
-- Idempotent. Safe to re-run.

ALTER TABLE montree_school_admins
  ADD COLUMN IF NOT EXISTS login_code TEXT;

-- Partial unique index — only enforces uniqueness when login_code is set
-- (null values are allowed for legacy rows that haven't been backfilled).
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_admins_login_code_unique
  ON montree_school_admins (login_code)
  WHERE login_code IS NOT NULL;

COMMENT ON COLUMN montree_school_admins.login_code IS
  'Plain 6-char principal login code. SHA-256 hashed copy lives in password_hash. NULL for legacy rows that pre-date Session 98 — backfill by clicking Reset code in super-admin PrincipalsModal.';
