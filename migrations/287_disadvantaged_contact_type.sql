-- Migration 287 — add 'disadvantaged_school' to the outreach contact_type CHECK.
--
-- The Jul-6 global outreach scrape carries a side-list of ~33-country
-- disadvantaged / community Montessori schools (Type='disadvantaged' in the
-- master CSV). The 🌍 Global Outreach tab importer maps those rows to
-- contact_type='disadvantaged_school'. The current CHECK (post-203) does not
-- permit that value, so those rows would fail the per-row insert with a CHECK
-- violation until this runs.
--
-- 🚨 RUN THIS BEFORE importing disadvantaged rows. Until it runs, the importer
-- degrades gracefully: disadvantaged rows fail per-row (surfaced verbatim in
-- error_samples), every other row imports normally. No code gate needed.
--
-- Idempotent: DROP IF EXISTS + re-ADD with the full 8-value set.

DO $$
BEGIN
  ALTER TABLE montree_outreach_contacts
    DROP CONSTRAINT IF EXISTS montree_outreach_contacts_contact_type_check;
  ALTER TABLE montree_outreach_contacts
    ADD CONSTRAINT montree_outreach_contacts_contact_type_check
      CHECK (contact_type IN (
        'multiplier_association', 'multiplier_training', 'multiplier_franchise',
        'multiplier_consultant', 'individual_school', 'competitor_intel',
        'agent_application', 'disadvantaged_school'
      ));
END $$;
