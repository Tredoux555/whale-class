-- 326_child_onboarding.sql
-- Child Onboarding — the family's enrollment intake, and the paper the school
-- prints from it.
--
-- A parent logs in with the parent code they already have, fills in one long
-- form (identity, guardians, emergency contacts, authorized pickup adults with
-- photos, health + allergies, documents, per-purpose consents, and a
-- getting-to-know-your-child section), and submits it. NOTHING is applied to
-- the child's record until a teacher reviews the submission and commits it.
--
-- On commit the school gets: the child's avatar, their name and birthday, and
-- the ability to print cubby / toothbrush / bed / table labels and the pickup
-- + sign-in-out sheets — every one of them carrying the child's face.
--
-- Shape follows the house staging pattern (cf. migration 325 photo onboarding,
-- 308 paper scan): one row per child, the whole form in JSONB, a status
-- ladder, and an explicit commit stamp.
--
-- No AI is involved in this feature anywhere.
--
-- House style: service-role only. RLS is ENABLED with NO policies, so anon /
-- authenticated keys can read nothing; every access goes through an API route
-- that has already verified either a school session or a parent↔child link.
--
-- Fully idempotent — safe to paste twice.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. The intake (one row per child — UNIQUE on child_id)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_child_intake (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL,
  classroom_id uuid NOT NULL,
  -- One intake per child, forever. A re-submission updates this row and moves
  -- it back to 'submitted'; it never creates a second record.
  child_id     uuid NOT NULL UNIQUE REFERENCES montree_children(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'submitted', 'committed')),
  -- The whole IntakeForm (lib/onboarding-core/types.ts). Documents are stored
  -- as STORAGE PATHS inside the montree-media bucket, never as URLs.
  data         jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz,
  committed_at timestamptz,
  -- montree_teachers.id / montree_school_admins.id of whoever committed it.
  -- No FK: the committer may be a teacher or a principal, two different tables.
  committed_by uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_child_intake_school_status
  ON montree_child_intake (school_id, status);
CREATE INDEX IF NOT EXISTS idx_child_intake_classroom
  ON montree_child_intake (classroom_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. updated_at trigger (house convention, cf. migrations 315 / 325)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_montree_child_intake_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_montree_child_intake_touch ON montree_child_intake;
CREATE TRIGGER trg_montree_child_intake_touch
  BEFORE UPDATE ON montree_child_intake
  FOR EACH ROW EXECUTE FUNCTION fn_montree_child_intake_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 4. RLS — enabled, zero policies (service-role only, house style)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE montree_child_intake ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Feature flag
-- Column list mirrors lib/montree/features/types.ts (FeatureKey) +
-- lib/montree/features/server.ts (reads default_enabled off feature_key).
-- Default ON: the parent form is opt-in by nature (a parent has to fill it in)
-- and nothing reaches a child's record without a teacher pressing Commit.
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES
  ('child_onboarding',
   'Child Onboarding',
   'Parents complete their child''s full enrollment intake — guardians, emergency contacts, authorized pickup adults with photos, allergies, documents and consents — on their existing parent login. The teacher reviews and commits it, and the school prints cubby, toothbrush, bed and table labels plus pickup and sign-in sheets, all carrying the child''s face.',
   '🧾',
   'teacher_tools',
   false,
   true)
ON CONFLICT (feature_key) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      icon        = EXCLUDED.icon,
      category    = EXCLUDED.category;
