-- Migration: 300_engagement.sql
-- Build D (friction pass, Jul 17 2026) — one migration for D1 + D2 + D3.
--
-- 🚨 The contract named this "299_engagement.sql", but 299 was already taken
-- by 299_demo_meetings.sql (committed by another session). Renumbered to 300 —
-- content is identical to the contract's SQL block.
--
-- RLS deny-all (no policies) — the server uses the service-role key which
-- bypasses RLS. House posture for every ledger/telemetry table. Idempotent.

-- ── D1. Lifecycle email send-once ledger ───────────────────────────────────
-- One row per (school, email_type) — the UNIQUE constraint is the send-once
-- guard. The hourly engagement cron records a row ON SUCCESS only, so a school
-- can never be double-mailed even if the window overlaps two cron ticks.
CREATE TABLE IF NOT EXISTS montree_lifecycle_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('trial_d5','trial_expired','winback_d14')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, email_type)
);
ALTER TABLE montree_lifecycle_emails ENABLE ROW LEVEL SECURITY;

-- ── D2. Parent report read receipt ─────────────────────────────────────────
-- Stamped the first time a parent opens a sent report (never overwritten).
ALTER TABLE montree_weekly_reports
  ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ;

-- ── D3. Friday report-ready push send-once ledger ──────────────────────────
-- Week-keyed (school-local Monday). UNIQUE (school, nudge_type, week_start)
-- caps it at one push per school per week regardless of the 3-hour Friday
-- window straddling multiple hourly cron ticks.
CREATE TABLE IF NOT EXISTS montree_push_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL DEFAULT 'weekly_report',
  week_start DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, nudge_type, week_start)
);
ALTER TABLE montree_push_nudges ENABLE ROW LEVEL SECURITY;
