-- =====================================================
-- MIGRATION 247: Account Deletion Audit
-- Self-service in-app account deletion (Apple App Store Guideline 5.1.1(v)).
-- One FK-less audit table that records every self-deletion across all
-- account kinds (teacher / principal / homeschool_parent / agent / parent),
-- written BEFORE the destructive cascade so the record survives it.
-- Date: 2026-06-07
-- =====================================================

BEGIN;

CREATE TABLE IF NOT EXISTS montree_account_deletion_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- intentionally NOT a FK — the referenced row is about to be deleted
  account_id    UUID NOT NULL,
  account_kind  TEXT NOT NULL,        -- teacher | principal | homeschool_parent | agent | parent
  account_name  TEXT,
  account_email TEXT,
  school_id     UUID,                 -- NULL allowed (parent rows / orphan safety)
  mode          TEXT NOT NULL,        -- 'personal' (just this login) | 'school_purge' (whole tenant)
  -- self-service deletions are requested by the account holder themselves;
  -- store it explicitly so admin-initiated deletes can reuse this table later
  requested_by  UUID,
  reason        TEXT NOT NULL DEFAULT '',
  -- snapshot of what the cascade removed, captured pre-delete
  children_count_at_deletion  INTEGER NOT NULL DEFAULT 0,
  teachers_count_at_deletion  INTEGER NOT NULL DEFAULT 0,
  media_count_at_deletion     INTEGER NOT NULL DEFAULT 0,
  deleted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_school
  ON montree_account_deletion_audit (school_id, deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_deletion_audit_account
  ON montree_account_deletion_audit (account_id, deleted_at DESC);

-- Service-role-only table (no anon/auth access). RLS default-deny matches
-- the hardening pass; only server routes (service key) read/write it.
ALTER TABLE montree_account_deletion_audit ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify after running:
--   SELECT count(*) FROM montree_account_deletion_audit;  -- 0
