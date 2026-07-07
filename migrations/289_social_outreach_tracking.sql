-- Migration 289 — social outreach tracking on montree_outreach_contacts.
--
-- Parallel to the existing email status flow (status: new→drafted→sent→
-- replied/bounced→converted/dead), this adds a SECOND, independent channel for
-- schools we invite via Facebook / Instagram / LinkedIn / X. A school can have
-- an email pipeline status AND a social_status at the same time — they do not
-- collide (email `status` is untouched here).
--
-- The 🌍 Global Outreach tab's 📘 Social view reads these columns; the
-- Facebook-discovery agents write facebook_url (+ optional other socials) via
-- CSV import. Imported rows with a facebook_url and no email land as
-- social_status='found'.
--
-- 🚨 STAGED — NOT RUN. Paste in the Supabase SQL editor (whale-class project).
-- Fully idempotent: ADD COLUMN IF NOT EXISTS + guarded constraint add. No RLS
-- change — the table already exists and the app uses the service-role key.
--
-- 42703-safe by design: the new API paths (set_social + the social fields on
-- the contacts GET) degrade to an empty feature if these columns are absent,
-- rather than 500-ing the whole tab.

-- ── social URL fields ──
ALTER TABLE montree_outreach_contacts ADD COLUMN IF NOT EXISTS facebook_url  TEXT;
ALTER TABLE montree_outreach_contacts ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE montree_outreach_contacts ADD COLUMN IF NOT EXISTS linkedin_url  TEXT;
ALTER TABLE montree_outreach_contacts ADD COLUMN IF NOT EXISTS x_url         TEXT;

-- ── social pipeline state ──
--   none      — no social presence tracked (default)
--   found     — a social profile was discovered, not yet contacted
--   invited   — sent a Page like / friend / follow request
--   messaged  — sent a DM / message
--   replied   — they responded
--   connected — accepted / connected / in active conversation
--   dead      — no interest / dead end
ALTER TABLE montree_outreach_contacts ADD COLUMN IF NOT EXISTS social_status TEXT DEFAULT 'none';

DO $$
BEGIN
  ALTER TABLE montree_outreach_contacts
    DROP CONSTRAINT IF EXISTS montree_outreach_contacts_social_status_check;
  ALTER TABLE montree_outreach_contacts
    ADD CONSTRAINT montree_outreach_contacts_social_status_check
      CHECK (social_status IN (
        'none', 'found', 'invited', 'messaged', 'replied', 'connected', 'dead'
      ));
END $$;

ALTER TABLE montree_outreach_contacts ADD COLUMN IF NOT EXISTS social_invited_at TIMESTAMPTZ;
ALTER TABLE montree_outreach_contacts ADD COLUMN IF NOT EXISTS social_replied_at TIMESTAMPTZ;
ALTER TABLE montree_outreach_contacts ADD COLUMN IF NOT EXISTS social_notes      TEXT;

-- ── indexes ──
-- Social view filters on social_status <> 'none'; index only the tracked rows.
CREATE INDEX IF NOT EXISTS idx_montree_outreach_social_status
  ON montree_outreach_contacts (social_status) WHERE social_status <> 'none';

-- The discovery pass surfaces every row carrying a facebook_url regardless of
-- pipeline state; partial index on the non-null Facebook rows.
CREATE INDEX IF NOT EXISTS idx_montree_outreach_facebook_url
  ON montree_outreach_contacts (facebook_url) WHERE facebook_url IS NOT NULL;
