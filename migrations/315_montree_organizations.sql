-- 315_montree_organizations.sql
-- Montree ORGANIZATION tier + the invite-link onboarding chain.
--
-- Fully idempotent. Safe to paste twice. Additive only: it creates new montree_-prefixed
-- tables and adds ONE nullable column to montree_schools. Nothing here drops or rewrites
-- anything, and every existing school keeps working with organization_id = NULL.
--
-- The chain this migration backs (see app/montree/org/** and app/api/montree/org/**):
--
--   Tredoux (super-admin)  --org invite link-->  organization leader registers
--        └─ montree_org_invites (invite_type='organization')
--   organization leader    --school invite link-->  principal registers
--        └─ montree_org_invites (invite_type='school', organization_id set)
--   principal              --6-char login code-->  teacher      (already exists, untouched)
--   teacher                --adds directly------>  child        (already exists, untouched)
--
-- Tokens: the plaintext invite token NEVER lands in the database. Routes generate 32 bytes
-- of URL-safe randomness (256 bits), store only sha256(token) in token_hash, and hand the
-- plaintext back exactly once so it can be pasted into the share link. A leaked database
-- dump therefore yields no working invite link.
--
-- Tenancy / RLS: house style — RLS ON with a permissive service-role policy for Supabase
-- Advisor hygiene. The API layer is the real boundary: every org route resolves the caller's
-- organization_id from their JWT and filters on it explicitly.

BEGIN;

-- ──────────────────────────────────────────────────────────── organizations ──
-- One row per organisation (a school group / chain / programme office). An organisation
-- owns zero or more montree_schools; a school belongs to at most one organisation.
CREATE TABLE IF NOT EXISTS montree_organizations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  contact_name   TEXT,
  contact_email  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE montree_organizations ADD COLUMN IF NOT EXISTS contact_name  TEXT;
ALTER TABLE montree_organizations ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE montree_organizations ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_montree_organizations_created_at ON montree_organizations (created_at DESC);

-- ────────────────────────────────────────────────────── organization admins ──
-- The organisation leader's own login. Deliberately a SEPARATE table from
-- montree_school_admins (mirroring its shape) rather than a new role on it: an org admin
-- has no school_id, and montree_school_admins.school_id is NOT NULL everywhere it is read.
CREATE TABLE IF NOT EXISTS montree_organization_admins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES montree_organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at    TIMESTAMPTZ
);

ALTER TABLE montree_organization_admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_montree_org_admins_org ON montree_organization_admins (organization_id);

-- ───────────────────────────────────────────────────────────────── invites ──
-- One row per invite link ever issued, of either kind.
--
--   invite_type = 'organization' → issued by Tredoux from super-admin. organization_id is
--       NULL at issue time (the organisation does not exist yet) and is BACKFILLED onto the
--       row at redemption, so every used invite points at what it created.
--   invite_type = 'school'       → issued by an organisation leader. organization_id is set
--       at issue time and is what the redeeming principal's new school gets linked to.
--
-- Single-use (used_at), expiring (expires_at, 14 days by default) and revocable (a revoke is
-- a hard DELETE of an unused row — an invite that was never redeemed leaves no trail worth
-- keeping, and the token hash should stop existing).
CREATE TABLE IF NOT EXISTS montree_org_invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash       TEXT NOT NULL UNIQUE,
  invite_type      TEXT NOT NULL CHECK (invite_type IN ('organization','school')),
  organization_id  UUID REFERENCES montree_organizations(id) ON DELETE CASCADE,
  prefill_name     TEXT,
  issued_by        TEXT,
  note             TEXT,
  expires_at       TIMESTAMPTZ NOT NULL,
  used_at          TIMESTAMPTZ,
  used_by_email    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE montree_org_invites ADD COLUMN IF NOT EXISTS prefill_name  TEXT;
ALTER TABLE montree_org_invites ADD COLUMN IF NOT EXISTS issued_by     TEXT;
ALTER TABLE montree_org_invites ADD COLUMN IF NOT EXISTS note          TEXT;
ALTER TABLE montree_org_invites ADD COLUMN IF NOT EXISTS used_by_email TEXT;

CREATE INDEX IF NOT EXISTS idx_montree_org_invites_org        ON montree_org_invites (organization_id);
CREATE INDEX IF NOT EXISTS idx_montree_org_invites_type       ON montree_org_invites (invite_type);
CREATE INDEX IF NOT EXISTS idx_montree_org_invites_created_at ON montree_org_invites (created_at DESC);
-- Outstanding-invite lists are the hot read on both dashboards.
CREATE INDEX IF NOT EXISTS idx_montree_org_invites_open       ON montree_org_invites (expires_at) WHERE used_at IS NULL;

-- ───────────────────────────────────────────── montree_schools.organization_id ──
-- Nullable, and it stays nullable forever: self-serve principal signup at
-- /api/montree/principal/register creates schools with no organisation at all, and that is
-- the majority path. Only a school registered through an organisation's invite link gets a
-- value here.
ALTER TABLE montree_schools ADD COLUMN IF NOT EXISTS organization_id UUID;

-- The FK is added separately (ADD CONSTRAINT has no IF NOT EXISTS in Postgres). ON DELETE
-- SET NULL, never CASCADE: deleting an organisation must never delete the schools — those
-- are real settings with real children in them, and they simply become independent again.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'montree_schools_organization_id_fkey'
  ) THEN
    ALTER TABLE montree_schools
      ADD CONSTRAINT montree_schools_organization_id_fkey
      FOREIGN KEY (organization_id) REFERENCES montree_organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_montree_schools_organization_id
  ON montree_schools (organization_id) WHERE organization_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────── updated_at touch ──
CREATE OR REPLACE FUNCTION fn_montree_organizations_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_montree_organizations_touch ON montree_organizations;
CREATE TRIGGER trg_montree_organizations_touch
  BEFORE UPDATE ON montree_organizations
  FOR EACH ROW EXECUTE FUNCTION fn_montree_organizations_touch_updated_at();

-- ────────────────────────────────────────────────────────────────────── RLS ──
-- House style: RLS on for Supabase Advisor hygiene; the service-role key bypasses it and the
-- API layer enforces tenancy. Do NOT treat these policies as a security boundary — every org
-- route resolves organization_id from the caller's JWT and filters on it.
ALTER TABLE montree_organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_organization_admins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_org_invites          ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role all on montree_organizations" ON montree_organizations;
CREATE POLICY "Service role all on montree_organizations"
  ON montree_organizations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role all on montree_organization_admins" ON montree_organization_admins;
CREATE POLICY "Service role all on montree_organization_admins"
  ON montree_organization_admins FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role all on montree_org_invites" ON montree_org_invites;
CREATE POLICY "Service role all on montree_org_invites"
  ON montree_org_invites FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────── comments ──
COMMENT ON TABLE montree_organizations IS
  'Organization tier: a school group, chain or programme office sitting above one or more montree_schools and below the platform. Created only by redeeming an organization invite link minted in super-admin.';
COMMENT ON TABLE montree_organization_admins IS
  'The organisation leader login. Mirrors montree_school_admins but has no school_id — an org admin never belongs to a single school. email is globally unique; password_hash is bcrypt.';
COMMENT ON TABLE montree_org_invites IS
  'Every invite link ever issued, of both kinds. Only sha256(token) is stored — the plaintext link is shown once at issue time and cannot be recovered from the database. Single-use (used_at), expiring (expires_at) and revocable (delete while unused).';

COMMENT ON COLUMN montree_org_invites.token_hash IS
  'sha256 hex of the 256-bit URL-safe invite token. Redemption hashes the presented token and looks it up here; the plaintext is never written.';
COMMENT ON COLUMN montree_org_invites.organization_id IS
  'For invite_type=school: the organisation the redeeming school is linked to, set at issue time. For invite_type=organization: NULL until redemption, then backfilled with the organisation the link created.';
COMMENT ON COLUMN montree_org_invites.prefill_name IS
  'Optional name typed by the issuer ("Sunrise Montessori Group"). Shown on the landing page as a warm greeting and pre-filled into the first form field. Never authoritative — the person registering can change it.';
COMMENT ON COLUMN montree_org_invites.issued_by IS
  'Free text describing who minted the link: "super-admin" for org invites, the organisation admin id for school invites. Super-admin is an env/JWT identity with no database row, so this is deliberately not a foreign key.';
COMMENT ON COLUMN montree_schools.organization_id IS
  'The organisation this school belongs to, or NULL for the ordinary self-serve school. Set only when a principal registers through an organisation school-invite link. ON DELETE SET NULL — removing an organisation never removes its schools.';

COMMIT;
