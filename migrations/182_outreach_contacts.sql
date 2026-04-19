-- Migration 182: Outreach contacts CRM table
-- Tracks all outreach contacts (multiplier partners + individual schools)
-- for the daily automated outreach system

CREATE TABLE IF NOT EXISTS montree_outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  org_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  country TEXT,
  region TEXT,

  -- Classification
  contact_type TEXT NOT NULL DEFAULT 'individual_school'
    CHECK (contact_type IN (
      'multiplier_association', 'multiplier_training', 'multiplier_franchise',
      'multiplier_consultant', 'individual_school', 'competitor_intel'
    )),
  priority TEXT DEFAULT 'tier2'
    CHECK (priority IN ('warm', 'tier1', 'tier2', 'tier3')),
  est_schools_reached INTEGER DEFAULT 1,

  -- Pipeline status
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN (
      'new', 'drafted', 'sent', 'bounced', 'replied',
      'meeting_booked', 'converted', 'dead', 'follow_up'
    )),

  -- Email tracking
  email_subject TEXT,
  gmail_draft_id TEXT,
  draft_date TIMESTAMPTZ,
  sent_date TIMESTAMPTZ,
  bounce_date TIMESTAMPTZ,
  reply_date TIMESTAMPTZ,
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up TIMESTAMPTZ,
  next_follow_up TIMESTAMPTZ,

  -- Deliverability
  email_status TEXT DEFAULT 'unknown'
    CHECK (email_status IN ('unknown', 'verified', 'bounced', 'invalid', 'placeholder')),
  mx_verified BOOLEAN DEFAULT FALSE,

  -- Notes & context
  notes TEXT,
  reply_summary TEXT,

  -- Metadata
  source TEXT DEFAULT 'manual',  -- manual, scrape, expansion, gmass_import
  batch_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_status ON montree_outreach_contacts(status);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_type ON montree_outreach_contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_priority ON montree_outreach_contacts(priority);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_email ON montree_outreach_contacts(email);
CREATE INDEX IF NOT EXISTS idx_outreach_contacts_next_followup ON montree_outreach_contacts(next_follow_up) WHERE next_follow_up IS NOT NULL;

-- Unique constraint on email (prevent duplicate sends)
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_contacts_email_unique
  ON montree_outreach_contacts(email) WHERE email IS NOT NULL AND email != '';

-- Daily activity log for the outreach system
CREATE TABLE IF NOT EXISTS montree_outreach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- draft_created, email_sent, bounce_detected, reply_detected, contact_added, follow_up_created, scrape_completed
  contact_id UUID REFERENCES montree_outreach_contacts(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_log_date ON montree_outreach_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outreach_log_action ON montree_outreach_log(action);
