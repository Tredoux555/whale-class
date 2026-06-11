-- RANK 1 — PROPOSED MIGRATION (BLOCKED-NEEDS-TREDOUX — run in Supabase SQL editor)
--
-- Plain language: the code for the NPO application form, the reduced-rate
-- application form, and the impact-fund tracker all write to tables that DO
-- NOT EXIST in the live database. The two PUBLIC forms 500 on submit — any
-- real applicant who ever pressed Submit was lost. Discovered during the
-- Jun-11 overnight audit smoke test. Creating the tables fixes all three
-- features with no code change. Safe: pure CREATE IF NOT EXISTS, no data
-- touched, reversible with DROP TABLE.

CREATE TABLE IF NOT EXISTS montree_npo_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name TEXT NOT NULL,
    organization_type TEXT,
    registration_number TEXT,
    country TEXT NOT NULL,
    city TEXT,
    mission_statement TEXT,
    community_served TEXT,
    estimated_students INTEGER,
    tuition_model TEXT,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    documentation_url TEXT,
    additional_notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    school_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS montree_reduced_rate_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    estimated_students INTEGER,
    reason_code TEXT,
    reason_description TEXT,
    current_monthly_budget_usd NUMERIC,
    requested_rate_tier TEXT,
    documentation_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    review_notes TEXT,
    approved_tier TEXT,
    approved_amount_cents INTEGER,
    approved_duration_months INTEGER,
    reviewed_at TIMESTAMPTZ,
    school_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS montree_impact_fund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type TEXT NOT NULL,           -- 'contribution' | 'disbursement'
    amount_cents INTEGER NOT NULL,
    source_school_id UUID,
    recipient_type TEXT,
    recipient_name TEXT,
    recipient_description TEXT,
    notes TEXT,
    year INTEGER,
    month INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lock the new tables down like the rest of the project (RLS default-deny;
-- the app uses the service-role key, which bypasses RLS).
ALTER TABLE montree_npo_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_reduced_rate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_impact_fund_transactions ENABLE ROW LEVEL SECURITY;
