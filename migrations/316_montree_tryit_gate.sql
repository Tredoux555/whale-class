-- 316_montree_tryit_gate.sql
-- The "Try it" gate on the public landing page.
--
-- Fully idempotent. Safe to paste twice. Additive only: it creates two new montree_-prefixed
-- tables and touches nothing that already exists. Nothing here drops or rewrites anything.
--
-- What changed on the landing page (see components/montree/TryItGateModal.tsx):
--
--   Before: "Try it"  --Link-->  /montree/login-select?signup=true  (open self-serve signup)
--   After:  "Try it"  --click--> montree_tryit_clicks   (fire-and-forget interest signal)
--                     --modal--> montree_tryit_messages (name / email / organisation / message)
--                                 └─ Resend notification to tredoux555@gmail.com
--
-- Access is now a conversation, not a form-fill: nobody provisions a school by clicking a
-- button. The two tables answer two different questions in super-admin's "Try It" tab:
--
--   montree_tryit_clicks   — how many people WANTED in (including everyone who then bailed
--                            on the form). Anonymous, no PII beyond IP/user-agent, cheap.
--   montree_tryit_messages — who actually asked, and whether Tredoux has replied.
--
-- Tenancy / RLS: house style — RLS ON with a permissive service-role policy for Supabase
-- Advisor hygiene. Both tables are written by public, rate-limited API routes using the
-- service-role key, and read only by verifySuperAdminAuth-gated routes. These policies are
-- NOT the security boundary; the API layer is.

BEGIN;

-- ─────────────────────────────────────────────────────────── try-it clicks ──
-- One row per press of a "Try it" CTA on montree.xyz. Written fire-and-forget: the modal
-- opens whether or not this insert succeeds, so a failure here can never block a visitor.
--
-- Deliberately NOT joined to montree_visitors: that table is a page-view firehose with its
-- own fingerprint/geo pipeline, and this is a single high-intent event. Keeping it separate
-- means the click count stays readable even when visitor tracking is noisy or rate-limited.
CREATE TABLE IF NOT EXISTS montree_tryit_clicks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip          TEXT,
  user_agent  TEXT,
  referrer    TEXT,
  locale      TEXT
);

ALTER TABLE montree_tryit_clicks ADD COLUMN IF NOT EXISTS ip         TEXT;
ALTER TABLE montree_tryit_clicks ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE montree_tryit_clicks ADD COLUMN IF NOT EXISTS referrer   TEXT;
ALTER TABLE montree_tryit_clicks ADD COLUMN IF NOT EXISTS locale     TEXT;

-- The only read pattern is "most recent N" / "count in the last N days".
CREATE INDEX IF NOT EXISTS idx_montree_tryit_clicks_created_at
  ON montree_tryit_clicks (created_at DESC);

-- ───────────────────────────────────────────────────────── try-it messages ──
-- One row per submitted gate form. All four visitor-supplied fields are NOT NULL because the
-- route rejects a submission with any of them missing — a message with no organisation or no
-- body is not a lead, it is noise.
--
-- status is plain TEXT with a CHECK rather than an enum so a future state ('archived',
-- 'provisioned') is a one-line ALTER instead of an enum migration.
CREATE TABLE IF NOT EXISTS montree_tryit_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  organisation  TEXT NOT NULL,
  message       TEXT NOT NULL,
  ip            TEXT,
  user_agent    TEXT,
  status        TEXT NOT NULL DEFAULT 'new',
  replied_at    TIMESTAMPTZ
);

ALTER TABLE montree_tryit_messages ADD COLUMN IF NOT EXISTS ip         TEXT;
ALTER TABLE montree_tryit_messages ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE montree_tryit_messages ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'new';
ALTER TABLE montree_tryit_messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- Added separately (ADD CONSTRAINT has no IF NOT EXISTS in Postgres).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_tryit_messages_status_check'
  ) THEN
    ALTER TABLE montree_tryit_messages
      ADD CONSTRAINT montree_tryit_messages_status_check
      CHECK (status IN ('new','replied'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_montree_tryit_messages_created_at
  ON montree_tryit_messages (created_at DESC);
-- The inbox opens on unanswered messages — that is the hot read.
CREATE INDEX IF NOT EXISTS idx_montree_tryit_messages_new
  ON montree_tryit_messages (created_at DESC) WHERE status = 'new';

-- ────────────────────────────────────────────────────────────────────── RLS ──
ALTER TABLE montree_tryit_clicks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_tryit_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role all on montree_tryit_clicks" ON montree_tryit_clicks;
CREATE POLICY "Service role all on montree_tryit_clicks"
  ON montree_tryit_clicks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role all on montree_tryit_messages" ON montree_tryit_messages;
CREATE POLICY "Service role all on montree_tryit_messages"
  ON montree_tryit_messages FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────── comments ──
COMMENT ON TABLE montree_tryit_clicks IS
  'One row per press of a "Try it" CTA on the public landing page. Fire-and-forget interest signal written before the gate modal opens; an insert failure never blocks the visitor. Anonymous — no PII beyond IP and user-agent.';
COMMENT ON TABLE montree_tryit_messages IS
  'Submissions from the "Try Montree" gate modal. Self-serve signup is closed; every new school starts as one of these. status new → replied, flipped by hand in super-admin once Tredoux has answered.';

COMMENT ON COLUMN montree_tryit_clicks.locale IS
  'The visitor''s active Montree UI locale at click time (en/zh/es/...). Tells us which language a lead browsed in before we reply to them.';
COMMENT ON COLUMN montree_tryit_messages.status IS
  'new = unanswered, replied = Tredoux has responded (marked by hand in the super-admin Try It tab; replied_at stamps when). Not a pipeline — provisioning still happens through the ordinary school/organization invite chain.';

COMMIT;
