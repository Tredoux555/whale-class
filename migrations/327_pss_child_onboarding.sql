-- =============================================================================
-- 327_pss_child_onboarding.sql — PSS Child Onboarding
-- =============================================================================
-- The PSS (Potato Snaps) half of Child Onboarding. The shared intake shape,
-- the validation and the printed paper all live in lib/onboarding-core; this
-- migration adds only the one table PSS needs to hold a family's submission.
--
-- The flow: the teacher already has children (tp_children) and has already
-- handed each family a parent code (tp_parent_codes). The parent signs in with
-- that same code and fills in one long form — identity, guardians, emergency
-- contacts, authorized pickup adults with photos, allergies, documents and
-- per-purpose consents. NOTHING touches tp_children until the teacher opens the
-- submission, reads it, and presses Commit. On commit the intake face photo is
-- promoted to the child's canonical face path and the roster avatar updates;
-- then the teacher prints cubby / toothbrush / bed / table labels and the
-- pickup + sign-in-out sheets, every one of them carrying the child's face.
--
-- No AI anywhere in this feature.
--
-- ISOLATION: `tp_` namespace only. This migration never names a montree_ table,
-- exactly like 318–321.
--
-- SECURITY POSTURE (house style, cf. 318): RLS ENABLED with NO policies at all.
-- That is a deliberate deny-all — anon and authenticated roles can do nothing,
-- and every read/write goes through an /api/potato route that has already
-- verified a potato_teacher or potato_parent cookie. Do NOT "fix" the missing
-- policies by adding permissive ones.
--
-- 🚨 NO storage statements. Migration 318's `INSERT INTO storage.buckets` is
-- the reason the `potato-snaps` bucket had to be created by hand in the
-- dashboard: a storage-schema write rolls this project's whole transaction
-- back. The bucket this feature stores into already exists; nothing here
-- touches it.
--
-- IDEMPOTENT: safe to paste twice.
--
-- Next free number verified against the Mac on Aug 10, 2026: the repo's highest
-- migration is 326_child_onboarding.sql (the Montree half of this same
-- feature), so this is 327.
-- =============================================================================

BEGIN;

-- ------------------------------------------------------------ tp_child_intake
-- One row per child, forever. A parent re-submitting after a house move or a
-- new allergy UPDATES this row back to 'submitted'; it never creates a second
-- record, which is what the UNIQUE on child_id makes a database fact rather
-- than an application hope.
--
-- `data` is the whole IntakeForm (lib/onboarding-core/types.ts). Documents in
-- it are STORAGE PATHS inside the private `potato-snaps` bucket, never URLs —
-- a path means nothing outside its bucket, and /api/potato/media/proxy is the
-- only thing that turns one into bytes.
--
-- `class_id` is carried alongside child_id (rather than joined for on every
-- read) because it is the security prefix: it is what the storage path, the
-- teacher cookie and the proxy all agree on.
CREATE TABLE IF NOT EXISTS tp_child_intake (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES tp_classes(id) ON DELETE CASCADE,
  child_id      UUID NOT NULL UNIQUE REFERENCES tp_children(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'submitted', 'committed')),
  data          JSONB NOT NULL DEFAULT '{}',
  submitted_at  TIMESTAMPTZ,
  committed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The teacher's list is "everything in my class, submissions first" — index
-- the shape that query actually asks for.
CREATE INDEX IF NOT EXISTS idx_tp_child_intake_class_status
  ON tp_child_intake (class_id, status);

-- ------------------------------------------------------- updated_at trigger --
CREATE OR REPLACE FUNCTION fn_tp_child_intake_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tp_child_intake_touch ON tp_child_intake;
CREATE TRIGGER trg_tp_child_intake_touch
  BEFORE UPDATE ON tp_child_intake
  FOR EACH ROW EXECUTE FUNCTION fn_tp_child_intake_touch_updated_at();

-- -------------------------------------------------------------------- lockdown
-- RLS on, zero policies = nobody but the service role gets in.
ALTER TABLE tp_child_intake ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =============================================================================
-- Verify (paste separately after the migration):
--
--   SELECT column_name, data_type, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'tp_child_intake'
--    ORDER BY ordinal_position;
--   -- expect 9 rows: id, class_id, child_id, status, data, submitted_at,
--   --                committed_at, created_at, updated_at
--
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'tp_child_intake';
--   -- expect: t   (RLS on)
--
--   SELECT COUNT(*) FROM pg_policies WHERE tablename = 'tp_child_intake';
--   -- expect: 0   (deny-all is the policy)
-- =============================================================================
