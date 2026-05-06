-- migrations/186_referral_codes.sql
-- Agent referral programme — Phase 1 foundation.
--
-- Each row is one code that an agent (could be a teacher, multiplier partner,
-- consultant, anyone) shares with a prospect school. Tredoux generates them
-- one-per-pitch from super admin. While status='pending' Tredoux can revoke.
-- On redemption the school is permanently linked to the agent, a percentage
-- is locked in for that school, and the code's status flips to 'redeemed'.
--
-- The agent itself lives in montree_teachers for Phase 1 (with is_active=false
-- and no classroom for non-teaching agents). Extracting a separate
-- montree_agents table is a Phase-2+ concern.
--
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS montree_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The code Tredoux gives to the agent. Format: <FIRSTNAME>-XXXX (e.g. SARAH-K9X7).
  -- Plaintext — only super-admin can read this table.
  code VARCHAR(32) UNIQUE NOT NULL,

  -- Agent identity. agent_id may be NULL on first issue if Tredoux is creating
  -- a brand-new agent inline (we'll insert a montree_teachers row and update).
  -- Display fields are denormalised so we can show the agent's name on the
  -- referrals list without joining when agent_id is null/just-created.
  agent_id UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  agent_display_name TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  agent_pitch_label TEXT,                      -- optional, e.g. "Greenfield Montessori — pitch May 2026"

  -- Revenue share negotiated for this pitch.
  revenue_share_pct NUMERIC(5,2) NOT NULL CHECK (revenue_share_pct >= 0 AND revenue_share_pct <= 100),

  -- Lifecycle.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'redeemed', 'revoked', 'expired')),
  redeemed_by_school_id UUID REFERENCES montree_schools(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                      -- nullable; admin-set if needed

  -- Audit.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by_label TEXT,                       -- 'super_admin' or whoever issued; free text for Phase 1
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_agent ON montree_referral_codes(agent_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_status ON montree_referral_codes(status);
CREATE INDEX IF NOT EXISTS idx_referral_codes_school
  ON montree_referral_codes(redeemed_by_school_id)
  WHERE redeemed_by_school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON montree_referral_codes(code);

-- ── Schema extension on montree_schools ────────────────────────────────────
-- Track which referral code redeemed at signup. founding_teacher_id and
-- revenue_share_pct already exist (Session 72) — semantics shift to
-- "the linked agent" rather than "founding teacher".

ALTER TABLE montree_schools
  ADD COLUMN IF NOT EXISTS referral_code_id UUID REFERENCES montree_referral_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_schools_referral_code ON montree_schools(referral_code_id) WHERE referral_code_id IS NOT NULL;

COMMENT ON COLUMN montree_schools.founding_teacher_id IS
  'The agent linked to this school via referral code (montree_referral_codes). May be a teacher at the school, may be an external multiplier or consultant. Receives revenue share per revenue_share_pct on this row. NULL = direct signup (no agent).';

COMMENT ON COLUMN montree_schools.referral_code_id IS
  'FK to montree_referral_codes used at signup. NULL = direct signup (no code).';

COMMENT ON COLUMN montree_schools.referral_code_used IS
  'Plaintext copy of the referral code used at signup (denormalised for quick lookup without join). Audit-only.';
