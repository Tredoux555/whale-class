-- Migration: montree_leads table
-- Personal onboarding leads from /montree landing page

CREATE TABLE IF NOT EXISTS montree_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT,
  school_name TEXT,
  role TEXT,                    -- 'teacher', 'principal', 'other'
  interest_type TEXT NOT NULL,  -- 'try' or 'info'
  message TEXT,
  status TEXT DEFAULT 'new',    -- 'new', 'contacted', 'onboarded', 'declined'
  notes TEXT,                   -- super admin personal notes
  provisioned_school_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick filtering by status
CREATE INDEX IF NOT EXISTS idx_montree_leads_status ON montree_leads(status);
CREATE INDEX IF NOT EXISTS idx_montree_leads_created ON montree_leads(created_at DESC);
