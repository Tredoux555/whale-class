-- 285_founding_waitlist.sql
-- Founding 100 waitlist + config.
--
-- The public homepage section collects signups into montree_founding_waitlist.
-- Tredoux admits schools MANUALLY from the super-admin "Founding 100" tab.
-- The public counter reflects ADMITTED schools only (cap - admitted), never raw
-- signups — so a spam wave or 100 tyre-kickers can never burn the offer.
-- The form keeps collecting a waitlist indefinitely, even past 100.
--
-- Enforcement note: the "$3 locked for life" price is a PROMISE in copy + config
-- here. It is NOT wired into Stripe. To actually charge an admitted founder $3,
-- set that school's per-school billing override manually (migration 202).
--
-- RLS: deny-all for anon/authenticated. Server routes use the service-role key
-- which bypasses RLS. Matches the Jun-2026 RLS lockdown posture.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_founding_waitlist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name   text NOT NULL,
  contact_name  text,
  email         text NOT NULL UNIQUE,
  country       text,
  student_count integer,
  status        text NOT NULL DEFAULT 'waitlisted'
                  CHECK (status IN ('waitlisted', 'admitted', 'declined')),
  admitted_at   timestamptz,
  notes         text,
  source        text DEFAULT 'homepage',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_founding_waitlist_status
  ON montree_founding_waitlist (status);
CREATE INDEX IF NOT EXISTS idx_founding_waitlist_created
  ON montree_founding_waitlist (created_at DESC);

-- Single-row config: cap, current wave, and the manual close switch.
CREATE TABLE IF NOT EXISTS montree_founding_config (
  id         integer PRIMARY KEY DEFAULT 1,
  cap        integer NOT NULL DEFAULT 100,
  wave       integer NOT NULL DEFAULT 1,
  is_closed  boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founding_config_singleton CHECK (id = 1)
);

INSERT INTO montree_founding_config (id, cap, wave, is_closed)
VALUES (1, 100, 1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE montree_founding_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_founding_config   ENABLE ROW LEVEL SECURITY;

COMMIT;
