-- migrations/243_parent_consent_flags.sql
-- Ultimate Tracy Phase E (May 28, 2026).
--
-- 🚨 DO NOT RUN automatically. Tredoux pastes this into Supabase SQL Editor.
--
-- PURPOSE
--   Two-party consent flag per parent. The recording UI (Phase B) gates
--   on this column server-side AND client-side. Until the parent's
--   consent has been explicitly recorded, the principal MUST acknowledge
--   in the body of each chunk upload (consent_acknowledged=true). Once
--   recording_consent_on_file=true, the gate flips to "okay to record
--   without per-meeting acknowledgement" — useful for parents who've
--   formally signed off in writing.
--
-- AUDIT TRAIL
--   recording_consent_set_at + recording_consent_set_by capture WHO
--   flipped the flag and WHEN. We don't track every individual consent
--   re-affirmation (Phase B's UI consent gate handles per-meeting); this
--   is the durable on-file flag.

BEGIN;

ALTER TABLE montree_parents
  ADD COLUMN IF NOT EXISTS recording_consent_on_file BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recording_consent_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recording_consent_set_by UUID;

CREATE TABLE IF NOT EXISTS montree_parent_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL, -- intentionally NOT a FK — survives the cascade
  parent_name TEXT,
  parent_email TEXT,
  school_id UUID NOT NULL,
  deleted_by UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  meetings_count_at_deletion INTEGER NOT NULL DEFAULT 0,
  profile_existed_at_deletion BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_deletion_audit_school
  ON montree_parent_deletion_audit (school_id, deleted_at DESC);

COMMIT;

-- After running:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'montree_parents'
--     AND column_name LIKE 'recording_consent%';
--   -- Should return 3 rows.
--   SELECT count(*) FROM montree_parent_deletion_audit; -- 0
