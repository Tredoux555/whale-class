-- Migration 203: Agent applications (Phase 3 of agent system fix plan)
--
-- Extends montree_outreach_contacts to capture inbound agent applications
-- from the public /become-an-agent recruitment page. Applications flow into
-- the same CRM-style table the existing demo_request + outreach pipeline
-- uses, so super-admin sees a unified inbound queue.
--
-- AgentApplicationAlert (super-admin banner) reads status='agent_applied'
-- and shows pending applications. Tredoux reviews each — clicking "Accept"
-- pre-fills the existing Referrals 🔑 Issue Agent Login modal and the
-- application status flips to 'sent' (= code issued).
--
-- Idempotent — IF NOT EXISTS / DO blocks. Safe to re-run.

-- 1. New JSONB column for structured application data
--    Shape: { current_role: text, why_good_fit: text, country: text }
--    (country also persisted to existing `country` column for filtering)
ALTER TABLE montree_outreach_contacts
  ADD COLUMN IF NOT EXISTS application_details JSONB;

-- 2. Extend contact_type CHECK constraint to include 'agent_application'
DO $$
BEGIN
  ALTER TABLE montree_outreach_contacts
    DROP CONSTRAINT IF EXISTS montree_outreach_contacts_contact_type_check;
  ALTER TABLE montree_outreach_contacts
    ADD CONSTRAINT montree_outreach_contacts_contact_type_check
      CHECK (contact_type IN (
        'multiplier_association', 'multiplier_training', 'multiplier_franchise',
        'multiplier_consultant', 'individual_school', 'competitor_intel',
        'agent_application'
      ));
END $$;

-- 3. Extend status CHECK constraint to include 'agent_applied' and 'declined'
--    🚨 Migration 183 previously added 'demo_requested', 'contacted',
--    'not_interested' — preserve those when redefining.
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
        'agent_applied', 'declined'
      ));
END $$;

-- 4. Partial index for fast pending-application lookups
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_agent_applications_pending
  ON montree_outreach_contacts(created_at DESC)
  WHERE contact_type = 'agent_application' AND status = 'agent_applied';

-- 5. Column comments for future agents
COMMENT ON COLUMN montree_outreach_contacts.application_details IS
  'Structured payload for agent_application rows: { current_role, why_good_fit, country }. NULL for other contact_types.';

-- ── Verification queries (run manually after migration) ─────────────────────
-- SELECT contact_type, count(*) FROM montree_outreach_contacts GROUP BY contact_type;
-- SELECT status, count(*) FROM montree_outreach_contacts WHERE contact_type = 'agent_application' GROUP BY status;
