-- REPORT SHARE TOKENS TABLE
-- Required for auto-sharing reports with parents
-- Run this in Supabase SQL Editor

-- Create the report_share_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS report_share_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES montree_weekly_reports(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_report_share_tokens_token ON report_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_report_share_tokens_report ON report_share_tokens(report_id);

-- Enable RLS
ALTER TABLE report_share_tokens ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access to report_share_tokens" 
ON report_share_tokens FOR ALL 
USING (true) 
WITH CHECK (true);

-- Allow public read access for valid tokens (for parent viewing)
CREATE POLICY "Public can view valid share tokens" 
ON report_share_tokens FOR SELECT 
USING (revoked = false AND expires_at > NOW());
