-- migrations/188_agent_dashboard.sql
-- Phase 7a of the agent referral programme — agent dashboard foundation.
--
-- Phases 1-3 (migrations 186, 187) gave Tredoux the ability to issue codes,
-- attach them to schools at signup, and onboard agents to Stripe Connect.
-- Phase 7a adds the columns the agent themselves needs to LOG IN to their
-- own dashboard — separate credentials from any teacher-side login they may
-- already hold. Plus a per-agent default revenue share %, a suspend flag,
-- and an audit log table that every agent-affecting action writes to so the
-- super admin can review activity without being pinged on every event (Q3).
--
-- All ALTER TABLE statements use IF NOT EXISTS — fully idempotent. Run as
-- many times as needed in Supabase SQL Editor without side effects.

-- ── montree_teachers extensions ─────────────────────────────────────────────
-- An agent is a montree_teachers row with is_agent=true. Some agents are also
-- teachers at one of their schools (is_active=true + school_id + classroom_id);
-- pure-agent rows from Phase 1 stay is_active=false. The agent_password_hash
-- column is SEPARATE from password_hash so a teacher-agent can hold BOTH a
-- teacher login (school dashboard) AND an agent login (referral dashboard)
-- without collision.

ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS is_agent BOOLEAN NOT NULL DEFAULT FALSE,

  -- 6-char code SHA-256 hash. Same alphabet + hashing as principal codes
  -- (no I/O/0/1). Lookup pattern: WHERE agent_password_hash = legacySha256(code).
  ADD COLUMN IF NOT EXISTS agent_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS agent_login_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_login_last_used_at TIMESTAMPTZ,

  -- Default % when this agent self-generates a code (Phase 7d).
  -- Tredoux locks this when issuing the agent login. Per-pitch override is
  -- still possible via per-code revenue_share_pct.
  -- NULL = agent cannot self-generate codes (Tredoux must issue manually).
  ADD COLUMN IF NOT EXISTS agent_default_share_pct NUMERIC(5,2) CHECK (
    agent_default_share_pct IS NULL OR (agent_default_share_pct >= 0 AND agent_default_share_pct <= 100)
  ),

  -- Suspend an agent without deleting. Two-knob system:
  --   agent_suspended_at: stops their login, freezes self-service code gen.
  --                       PENDING montree_agent_payouts STILL pay out.
  --   montree_schools.revenue_share_active=false: stops FUTURE accrual.
  -- These are intentionally independent so Tredoux can pay an ex-partner
  -- their last earned cycle then stop accruing.
  ADD COLUMN IF NOT EXISTS agent_suspended_at TIMESTAMPTZ,

  -- Free-text notes (e.g. "left partnership 2026-08-01, owed final cycle").
  ADD COLUMN IF NOT EXISTS agent_notes TEXT;

-- Partial index for active agent lookups (login + dashboard queries filter
-- by is_agent=true AND agent_suspended_at IS NULL).
CREATE INDEX IF NOT EXISTS idx_teachers_agent_active
  ON montree_teachers(id)
  WHERE is_agent = TRUE AND agent_suspended_at IS NULL;

-- Partial unique index on agent_password_hash so two agents can't accidentally
-- get colliding hashes. NULL is allowed (most teachers don't have agent logins).
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_agent_password_unique
  ON montree_teachers(agent_password_hash)
  WHERE agent_password_hash IS NOT NULL;

COMMENT ON COLUMN montree_teachers.is_agent IS
  'Marker — does this row act as an agent (referral partner)? Independent of is_active (teacher login). Phase 7a.';

COMMENT ON COLUMN montree_teachers.agent_password_hash IS
  'SHA-256 hash of the agent''s 6-char login code. Separate from password_hash so a teacher-agent can hold both logins. NULL = no agent login issued yet.';

COMMENT ON COLUMN montree_teachers.agent_default_share_pct IS
  'Default revenue share % when this agent self-generates a referral code (Phase 7d). Locked by Tredoux at the time the agent login is issued. Per-pitch override is still possible via super admin issuing a one-off code.';

COMMENT ON COLUMN montree_teachers.agent_suspended_at IS
  'When set, agent cannot log in or self-generate codes. Pending payouts on referred schools STILL pay (the agent earned them). Use montree_schools.revenue_share_active=false to stop future accrual independently.';

-- ── montree_agent_audit ─────────────────────────────────────────────────────
-- Append-only log of meaningful agent actions. Surfaced in super admin's
-- Referrals tab as a "Recent agent activity" panel so Tredoux has visibility
-- without per-event pings (Q3 decision: log don't ping).
--
-- Phase 7a writes:
--   agent_login_issued     — Tredoux generated/reset an agent login code
--   agent_suspended        — Tredoux suspended an agent
--   agent_reactivated      — Tredoux cleared the suspend flag
--   agent_default_pct_changed — Tredoux changed the agent's default %
--
-- Future phases (7b/7d) will write more event types — login, code generation,
-- code revocation, Stripe onboarding link generation, etc. The actor_role
-- column distinguishes "Tredoux did X to the agent" from "the agent did X
-- themselves."

CREATE TABLE IF NOT EXISTS montree_agent_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The agent the action affects.
  agent_id UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,

  -- Denormalised for readability after agent deletion.
  agent_display_name TEXT,
  agent_email TEXT,

  -- Event type. Free-text for forward compatibility — future phases add
  -- new event_type values without a migration.
  event_type TEXT NOT NULL,

  -- Who initiated the action.
  actor_role TEXT NOT NULL CHECK (actor_role IN ('super_admin', 'agent', 'system')),

  -- Optional details — small JSONB blob, free shape per event_type.
  -- Examples:
  --   agent_login_issued      → { reset: true|false }
  --   agent_default_pct_changed → { from: 50, to: 60 }
  --   agent_code_generated     → { code: 'SARAH-7P9F', pitch_label: '...' }
  details JSONB,

  -- Audit context.
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_audit_agent ON montree_agent_audit(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_audit_event ON montree_agent_audit(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_audit_recent ON montree_agent_audit(created_at DESC);

COMMENT ON TABLE montree_agent_audit IS
  'Append-only audit log of every meaningful agent action. Surfaced in super admin Referrals tab. Phase 7a writes: agent_login_issued, agent_suspended, agent_reactivated, agent_default_pct_changed. Future phases extend event_type for self-service activity.';
