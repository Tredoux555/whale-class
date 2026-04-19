-- Migration 183: Add demo request statuses to outreach contacts CHECK constraint
-- Required for the landing page "Request a Demo" flow

-- Drop existing CHECK constraint on status column
ALTER TABLE montree_outreach_contacts DROP CONSTRAINT IF EXISTS montree_outreach_contacts_status_check;

-- Recreate with additional values for demo request flow
ALTER TABLE montree_outreach_contacts ADD CONSTRAINT montree_outreach_contacts_status_check
  CHECK (status IN (
    'new', 'drafted', 'sent', 'bounced', 'replied',
    'meeting_booked', 'converted', 'dead', 'follow_up',
    'demo_requested', 'contacted', 'not_interested'
  ));
