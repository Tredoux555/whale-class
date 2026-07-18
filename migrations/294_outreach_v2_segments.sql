-- Migration 294 — Outreach V2.1 segmentation + verification columns.
--
-- Binding contract: docs/outreach/PLAN_OUTREACH_V2_1_JUL14.md §2.
--
-- Adds the V2.1 columns to the system-of-record `montree_outreach_contacts`
-- (the 6,852-row global master), so the segment/verification/social-footprint
-- model lands on the EXISTING table rather than a new parallel one. Every
-- addition is `ADD COLUMN IF NOT EXISTS`; the two CHECK swaps use the repo's
-- house-style DROP CONSTRAINT IF EXISTS + re-ADD (matching migrations 183/203/
-- 287). Wrapped in BEGIN/COMMIT and fully idempotent — safe to re-run.
--
-- 🚨 RUN THIS BEFORE `scripts/outreach-import-v2.mjs`. Until it runs, the
-- importer's SELECT of the new columns 42703s; the API route silently drops
-- the new fields (whitelist gained them in the same commit, but the columns
-- must exist for the write to land). No behaviour regresses on the live site
-- pre-run — every new column is nullable with no default.

BEGIN;

-- ── 1. Segment (commercial-intent bucket) ───────────────────────────────────
-- NULL = not yet segmented. A_revenue = pays list price; B_pilot_partner =
-- free pilot only (never pitched pricing); C_hub_org = multiplier/hub;
-- X_excluded = verified not-a-fit / do-not-contact.
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS segment TEXT
    CHECK (segment IN ('A_revenue', 'B_pilot_partner', 'C_hub_org', 'X_excluded'));

-- ── 2. Verification flags + evidence URLs ───────────────────────────────────
-- Is this org actually Montessori? Actually disadvantaged/tuition-free? Each
-- claim carries an evidence URL (the page we saw it on) so outreach is never
-- sent to an unverified name (name collisions already burned us twice).
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS montessori_verified BOOLEAN;
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS montessori_evidence_url TEXT;
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS disadvantaged_verified BOOLEAN;
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS disadvantaged_evidence_url TEXT;

-- ── 3. Social footprint snapshot ────────────────────────────────────────────
-- Parsed follower counts (from free-text estimates where cleanly numeric) +
-- the date we last looked at their socials. Distinct from the `social_status`
-- ladder (migration 289) — these are magnitude, not pipeline state.
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS fb_followers INTEGER;
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS ig_followers INTEGER;
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS social_checked_date DATE;

-- ── 4. Contact role ─────────────────────────────────────────────────────────
-- Title/role of `contact_person` (Director, Head of School, Founder, …).
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS contact_role TEXT;

-- ── 5. Responsiveness proxy (pre-reply-data heuristic) ──────────────────────
-- 1–5 estimate of how likely this org is to reply; replaced by real reply
-- data after 20 sends (WS4). `responsiveness_rationale` explains the score.
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS responsiveness_score SMALLINT
    CHECK (responsiveness_score BETWEEN 1 AND 5);
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS responsiveness_rationale TEXT;

-- ── 6. Warm path ────────────────────────────────────────────────────────────
-- The relationship bridge to this org, e.g. "via SAMA membership",
-- "via Tim Nee MTCNE", "WARM — live thread since Apr 2026".
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS warm_path TEXT;

-- ── 7. Verification status ──────────────────────────────────────────────────
-- verified   = evidence seen this session; safe to contact.
-- partial    = some evidence (Jul-12 footprint pass); contact with care.
-- unverified_from_doc = imported from the master .md; OUTREACH-FROZEN until
--                       a human verifies it. NULL = legacy row (pre-V2.1).
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS verification_status TEXT
    CHECK (verification_status IN ('verified', 'partial', 'unverified_from_doc'));

-- ── 8. Outreach code (bridge to montree_outreach_schools) ───────────────────
-- Same format as the China-code rail (`montree_outreach_schools.code`). When a
-- code is minted for a contact it's written here AND mirrored into
-- montree_outreach_schools so /welcome/[code] + the visit RPC + signup redeem
-- work unchanged. UNIQUE partial index guards against collisions.
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS outreach_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_contacts_outreach_code_unique
  ON montree_outreach_contacts(outreach_code)
  WHERE outreach_code IS NOT NULL;

-- ── 9. Extend the status CHECK to add 'pilot' ───────────────────────────────
-- 🚨 Preserve EVERY existing value. Evolution: 182 (new,drafted,sent,bounced,
-- replied,meeting_booked,converted,dead,follow_up) → 183 (+demo_requested,
-- contacted,not_interested) → 203 (+agent_applied,declined). We add ONE value:
-- 'pilot' (a free-pilot partner actively piloting — between demo and convert).
DO $$
BEGIN
  ALTER TABLE montree_outreach_contacts
    DROP CONSTRAINT IF EXISTS montree_outreach_contacts_status_check;
  ALTER TABLE montree_outreach_contacts
    ADD CONSTRAINT montree_outreach_contacts_status_check
      CHECK (status IN (
        'new', 'drafted', 'sent', 'bounced', 'replied',
        'meeting_booked', 'converted', 'dead', 'follow_up',
        'demo_requested', 'contacted', 'not_interested',
        'agent_applied', 'declined',
        'pilot'
      ));
END $$;

-- ── 10. Dashboard index: segment × status ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_segment_status
  ON montree_outreach_contacts(segment, status)
  WHERE segment IS NOT NULL;

-- ── Column comments ─────────────────────────────────────────────────────────
COMMENT ON COLUMN montree_outreach_contacts.segment IS
  'Commercial-intent bucket: A_revenue | B_pilot_partner | C_hub_org | X_excluded. NULL = not yet segmented.';
COMMENT ON COLUMN montree_outreach_contacts.verification_status IS
  'verified | partial | unverified_from_doc. unverified_from_doc rows are OUTREACH-FROZEN until a human verifies.';
COMMENT ON COLUMN montree_outreach_contacts.responsiveness_score IS
  '1–5 heuristic likelihood-to-reply proxy; replaced by real reply data after 20 sends (WS4).';
COMMENT ON COLUMN montree_outreach_contacts.outreach_code IS
  'Mirror of montree_outreach_schools.code — minting a code dual-writes here + there so /welcome/[code] works unchanged.';

COMMIT;

-- ── Verification queries (run manually after migration) ─────────────────────
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'montree_outreach_contacts'
--     AND column_name IN ('segment','verification_status','outreach_code','fb_followers');
-- SELECT status, count(*) FROM montree_outreach_contacts GROUP BY status ORDER BY 2 DESC;
-- SELECT conname FROM pg_constraint WHERE conname = 'montree_outreach_contacts_status_check';
