-- 299_demo_meetings.sql
-- Demo / meeting tracker for the 🧭 Command tab (Operator Mandate §5½).
-- =========================================================================
-- RUN Jul 17 via pooler (Tredoux-sanctioned).
--
-- Slated "298" in the build brief, but migrations/298_normalize_week_keys.sql
-- already exists — renumbered to 299 to avoid a filename collision. Table name,
-- API, and Command-tab wiring are unchanged.
--
-- Tredoux's Operator Mandate (docs/outreach/MASTER_OUTREACH_RUNBOOK_JUL17.md
-- §5½ DEMO PROTOCOL) asked that the moment a demo/call is agreed in any thread,
-- it be recorded — org, contact, datetime + timezone — so the 🧭 Command tab
-- can show upcoming demos at a glance and the dossier + morning-reminder duties
-- have a home. This is that home.
--
-- No FK on source_contact_id by design — it's a soft reference to a
-- montree_outreach_contacts row (or NULL for demos that arrive off-platform);
-- deleting an outreach row must never cascade-wipe a scheduled demo.
--
-- RLS ENABLED with NO policies (deny-all for anon/authenticated; the server
-- reads/writes with the service role, which bypasses RLS — house style).
-- Idempotent. Safe to re-run. Run in the Supabase SQL Editor or via the pooler.
-- =========================================================================

CREATE TABLE IF NOT EXISTS montree_demo_meetings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name          TEXT NOT NULL,
  contact_name      TEXT,
  contact_email     TEXT,
  source_contact_id UUID,                         -- soft ref to montree_outreach_contacts (no FK)
  scheduled_at      TIMESTAMPTZ NOT NULL,
  timezone          TEXT DEFAULT 'Asia/Shanghai', -- IANA zone the datetime was agreed in
  status            TEXT NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled', 'held', 'cancelled', 'no_show')),
  outcome_notes     TEXT,
  dossier_ready     BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upcoming-first listing + status filters.
CREATE INDEX IF NOT EXISTS idx_demo_meetings_scheduled
  ON montree_demo_meetings (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_demo_meetings_status
  ON montree_demo_meetings (status);

-- Touch updated_at on any row UPDATE (repo's *_touch_updated_at pattern).
CREATE OR REPLACE FUNCTION montree_demo_meetings_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS demo_meetings_touch_updated_at ON montree_demo_meetings;
CREATE TRIGGER demo_meetings_touch_updated_at
  BEFORE UPDATE ON montree_demo_meetings
  FOR EACH ROW EXECUTE FUNCTION montree_demo_meetings_touch_updated_at();

-- Deny-all RLS (server uses the service role → bypasses RLS).
ALTER TABLE montree_demo_meetings ENABLE ROW LEVEL SECURITY;
