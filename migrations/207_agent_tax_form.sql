-- Migration 207 — Agent tax form (W-8BEN-E / equivalent) collection.
--
-- Phase B5 of FINANCIAL_ARCHITECTURE_PLAN.md.
--
-- Captures the agent's tax residency declaration. Standard practice for
-- international contractor payments. Documents "you're not a US person /
-- you're tax-resident in country X" so Montree HK isn't on the hook for
-- US withholding obligations.
--
-- The actual PDF lives in Supabase Storage (bucket: agent-tax-forms,
-- super-admin-only access). This table just stores the URL + metadata.
--
-- Mandatory: required before agent's first payout fires. Not required at
-- code issuance (lower friction for fast-moving recruits).
--
-- Idempotent — IF NOT EXISTS. Safe to re-run.

ALTER TABLE montree_teachers
  ADD COLUMN IF NOT EXISTS tax_form_url TEXT,
  ADD COLUMN IF NOT EXISTS tax_form_type TEXT
    CHECK (tax_form_type IS NULL OR tax_form_type IN (
      'w8ben',       -- US W-8BEN — individual non-US person
      'w8ben_e',     -- US W-8BEN-E — non-US entity
      'w9',          -- US W-9 — US person (1099-NEC applies)
      'jurisdiction_other',  -- non-US tax declaration (open-ended for v1)
      'declaration_attached' -- catch-all when form type doesn't fit
    )),
  ADD COLUMN IF NOT EXISTS tax_form_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tax_residency_country TEXT,  -- ISO 3166-1 alpha-2
  ADD COLUMN IF NOT EXISTS is_us_person BOOLEAN;  -- TRUE = US tax-resident; W-9 path

-- Partial index for "agents missing tax form" queries.
CREATE INDEX IF NOT EXISTS idx_teachers_missing_tax_form
  ON montree_teachers(id)
  WHERE is_agent = TRUE
    AND tax_form_url IS NULL
    AND agent_suspended_at IS NULL;

COMMENT ON COLUMN montree_teachers.tax_form_url IS
  'URL into Supabase Storage agent-tax-forms bucket. Super-admin-only access. NULL until uploaded.';
COMMENT ON COLUMN montree_teachers.is_us_person IS
  'TRUE = US tax-resident (W-9 path, 1099-NEC reporting applies). FALSE = non-US (W-8BEN or equivalent). NULL = not yet declared.';
