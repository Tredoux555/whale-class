-- Migration 279: China outreach code system (Jul 3, 2026)
-- One unique code per cold-outreach school (e.g. CN-ETON-001). The code goes
-- in the cold email; /welcome/{code} greets the school, records visits, and
-- registration attribution is stored back onto this row.
--
-- Codes are OPAQUE strings — never parse meaning from them in code; always
-- look up this table. Seed data: migrations/279b_seed_outreach_china.sql.
--
-- Idempotent. Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_outreach_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outreach_code text UNIQUE NOT NULL,          -- stored UPPERCASE, e.g. CN-ETON-001
  school_name text NOT NULL,
  city text,
  network text,
  founded text,
  list_tier text,                              -- 'certified' | 'other'
  source text,
  status text NOT NULL DEFAULT 'not_contacted'
    CHECK (status IN ('not_contacted', 'emailed', 'visited', 'registered')),
  visit_count int NOT NULL DEFAULT 0,
  first_visited_at timestamptz,
  emailed_at timestamptz,
  registered_at timestamptz,
  registered_school_id uuid REFERENCES montree_schools(id) ON DELETE SET NULL,
  contact_email text,
  contact_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outreach_schools_status
  ON montree_outreach_schools (status);

-- RLS: deny-all for anon/authenticated. All reads/writes go through the
-- server-side service-role client (getSupabase()), matching migration 275's
-- posture. NO public policies on purpose.
ALTER TABLE montree_outreach_schools ENABLE ROW LEVEL SECURITY;

-- Atomic visit recorder: increments visit_count, stamps first_visited_at once,
-- promotes status to 'visited' (never downgrades 'registered'). Returns the
-- school row when the code exists; zero rows when it doesn't. One statement =
-- no read-then-write race on concurrent visits.
CREATE OR REPLACE FUNCTION montree_outreach_record_visit(p_code text)
RETURNS TABLE (school_name text, city text)
LANGUAGE sql
SET search_path = public
AS $fn$
  UPDATE montree_outreach_schools o
  SET visit_count      = o.visit_count + 1,
      first_visited_at = COALESCE(o.first_visited_at, now()),
      status           = CASE WHEN o.status = 'registered' THEN o.status ELSE 'visited' END
  WHERE o.outreach_code = upper(trim(p_code))
  RETURNING o.school_name, o.city;
$fn$;

-- Migration 276 posture: RPCs are not executable by anon/authenticated.
-- Only the service-role server client may call this.
REVOKE ALL ON FUNCTION montree_outreach_record_visit(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION montree_outreach_record_visit(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION montree_outreach_record_visit(text) TO service_role;

COMMIT;
