-- Migration 115: Account Types, Trial System, NPO Applications, Impact Fund
-- Part of the "Education for All" initiative
-- Created: 2024

-- =============================================================================
-- PART 1: Extend montree_schools with account types and trial tracking
-- =============================================================================

-- Add account_type column (personal_classroom, school, community_impact)
ALTER TABLE montree_schools
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'school';

ALTER TABLE montree_schools
ADD CONSTRAINT check_account_type CHECK (account_type IN ('personal_classroom', 'school', 'community_impact'));

-- Add trial tracking fields
ALTER TABLE montree_schools
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS trial_extensions_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_extension_reason TEXT,
ADD COLUMN IF NOT EXISTS max_students_override INT;

ALTER TABLE montree_schools
ADD CONSTRAINT check_trial_status CHECK (trial_status IN ('not_started', 'active', 'extended', 'expired', 'converted'));

-- Add school name (text only) for personal classroom accounts
ALTER TABLE montree_schools
ADD COLUMN IF NOT EXISTS school_name_text TEXT;

-- Add community impact fields
ALTER TABLE montree_schools
ADD COLUMN IF NOT EXISTS npo_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS npo_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS npo_verification_notes TEXT,
ADD COLUMN IF NOT EXISTS reduced_rate_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reduced_rate_amount_cents INT,
ADD COLUMN IF NOT EXISTS reduced_rate_approved_at TIMESTAMPTZ;

-- =============================================================================
-- PART 2: NPO Applications Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS montree_npo_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Can be linked to existing school OR new application
    school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE,

    -- Application details
    organization_name TEXT NOT NULL,
    organization_type TEXT, -- 'npo', 'ngo', 'charity', 'foundation', 'community_org'
    registration_number TEXT, -- EIN, charity number, etc.
    country TEXT NOT NULL,
    city TEXT,

    -- Contact
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,

    -- Mission & Community
    mission_statement TEXT NOT NULL,
    community_served TEXT NOT NULL, -- Description of underprivileged community served
    estimated_students INT,
    tuition_model TEXT, -- 'free', 'sliding_scale', 'subsidized', 'low_cost'

    -- Documentation
    documentation_url TEXT, -- Link to NPO registration docs
    additional_notes TEXT,

    -- Review status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'more_info_needed')),
    reviewed_by TEXT, -- Admin who reviewed
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    rejection_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_npo_applications_status ON montree_npo_applications(status);
CREATE INDEX IF NOT EXISTS idx_npo_applications_country ON montree_npo_applications(country);
CREATE INDEX IF NOT EXISTS idx_npo_applications_school_id ON montree_npo_applications(school_id);

-- =============================================================================
-- PART 3: Reduced Rate Applications Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS montree_reduced_rate_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to school
    school_id UUID REFERENCES montree_schools(id) ON DELETE CASCADE,

    -- Application details
    school_name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT,

    -- Contact
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,

    -- Financial situation
    reason_code TEXT CHECK (reason_code IN ('developing_country', 'small_school', 'startup', 'hardship', 'other')),
    reason_description TEXT NOT NULL,
    estimated_students INT,
    current_monthly_budget_usd INT, -- What they can afford

    -- Documentation (optional)
    documentation_url TEXT,

    -- Requested rate
    requested_rate_tier TEXT CHECK (requested_rate_tier IN ('tier_a_500', 'tier_b_250', 'tier_c_100', 'custom')),
    requested_custom_amount_cents INT,

    -- Review status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'more_info_needed')),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Approved rate
    approved_rate_tier TEXT,
    approved_amount_cents INT,
    approved_duration_months INT DEFAULT 12, -- How long the reduced rate applies
    approved_until TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reduced_rate_applications_status ON montree_reduced_rate_applications(status);
CREATE INDEX IF NOT EXISTS idx_reduced_rate_applications_school_id ON montree_reduced_rate_applications(school_id);

-- =============================================================================
-- PART 4: Impact Fund Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS montree_impact_fund_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction type
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('contribution', 'disbursement')),

    -- For contributions (from paying schools)
    source_school_id UUID REFERENCES montree_schools(id) ON DELETE SET NULL,
    source_subscription_payment_id TEXT, -- Stripe payment ID

    -- For disbursements (to NPO schools or other causes)
    recipient_type TEXT CHECK (recipient_type IN ('npo_school', 'equipment', 'training', 'building', 'other')),
    recipient_school_id UUID REFERENCES montree_schools(id) ON DELETE SET NULL,
    recipient_name TEXT, -- For non-school recipients
    recipient_description TEXT,

    -- Amount
    amount_cents INT NOT NULL,
    currency TEXT DEFAULT 'USD',

    -- Notes
    notes TEXT,

    -- For reporting
    year INT DEFAULT EXTRACT(YEAR FROM NOW()),
    month INT DEFAULT EXTRACT(MONTH FROM NOW()),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reporting
CREATE INDEX IF NOT EXISTS idx_impact_fund_type ON montree_impact_fund_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_impact_fund_year_month ON montree_impact_fund_transactions(year, month);
CREATE INDEX IF NOT EXISTS idx_impact_fund_source_school_id ON montree_impact_fund_transactions(source_school_id);
CREATE INDEX IF NOT EXISTS idx_impact_fund_recipient_school_id ON montree_impact_fund_transactions(recipient_school_id);

-- =============================================================================
-- PART 5: NPO Outreach List (for marketing/outreach)
-- =============================================================================

CREATE TABLE IF NOT EXISTS montree_npo_outreach (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization details
    organization_name TEXT NOT NULL,
    organization_type TEXT, -- 'school', 'network', 'foundation', 'association'
    country TEXT NOT NULL,
    region TEXT, -- State/Province
    city TEXT,

    -- Contact
    website TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_name TEXT,

    -- Description
    description TEXT,
    community_served TEXT,
    estimated_students INT,

    -- Outreach status
    outreach_status TEXT DEFAULT 'not_contacted'
    CHECK (outreach_status IN ('not_contacted', 'contacted', 'responded', 'interested', 'applied', 'approved', 'declined', 'not_interested')),

    -- Outreach tracking
    first_contacted_at TIMESTAMPTZ,
    last_contacted_at TIMESTAMPTZ,
    contact_notes TEXT,

    -- If they converted
    linked_school_id UUID REFERENCES montree_schools(id) ON DELETE SET NULL,
    linked_application_id UUID REFERENCES montree_npo_applications(id) ON DELETE SET NULL,

    -- Source
    source TEXT, -- 'ami', 'ams', 'esf', 'research', 'referral', 'manual'
    source_url TEXT,

    -- Priority for outreach
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_npo_outreach_status ON montree_npo_outreach(outreach_status);
CREATE INDEX IF NOT EXISTS idx_npo_outreach_country ON montree_npo_outreach(country);
CREATE INDEX IF NOT EXISTS idx_npo_outreach_priority ON montree_npo_outreach(priority);
CREATE INDEX IF NOT EXISTS idx_npo_outreach_linked_school_id ON montree_npo_outreach(linked_school_id);
CREATE INDEX IF NOT EXISTS idx_npo_outreach_linked_application_id ON montree_npo_outreach(linked_application_id);

-- =============================================================================
-- PART 6: Personal Classroom Trial Management View
-- =============================================================================

-- Create a view for easy trial management
CREATE OR REPLACE VIEW montree_personal_classroom_trials AS
SELECT
    s.id,
    s.name,
    s.school_name_text,
    s.owner_name,
    s.owner_email,
    s.trial_started_at,
    s.trial_ends_at,
    s.trial_status,
    s.trial_extensions_count,
    s.created_at,
    -- Calculate days remaining
    CASE
        WHEN s.trial_ends_at IS NULL THEN NULL
        WHEN s.trial_ends_at < NOW() THEN 0
        ELSE EXTRACT(DAY FROM (s.trial_ends_at - NOW()))::INT
    END as days_remaining,
    -- Count students
    (SELECT COUNT(*) FROM montree_children c WHERE c.school_id = s.id) as student_count,
    -- Count classrooms
    (SELECT COUNT(*) FROM montree_classrooms cl WHERE cl.school_id = s.id) as classroom_count
FROM montree_schools s
WHERE s.account_type = 'personal_classroom';

-- =============================================================================
-- PART 7: Impact Fund Summary View
-- =============================================================================

CREATE OR REPLACE VIEW montree_impact_fund_summary AS
SELECT
    -- Total contributions
    COALESCE(SUM(CASE WHEN transaction_type = 'contribution' THEN amount_cents ELSE 0 END), 0) as total_contributions_cents,
    -- Total disbursements
    COALESCE(SUM(CASE WHEN transaction_type = 'disbursement' THEN amount_cents ELSE 0 END), 0) as total_disbursements_cents,
    -- Balance
    COALESCE(SUM(CASE WHEN transaction_type = 'contribution' THEN amount_cents ELSE -amount_cents END), 0) as balance_cents,
    -- This month
    COALESCE(SUM(CASE WHEN transaction_type = 'contribution' AND year = EXTRACT(YEAR FROM NOW()) AND month = EXTRACT(MONTH FROM NOW()) THEN amount_cents ELSE 0 END), 0) as this_month_contributions_cents,
    -- Count of transactions
    COUNT(*) as total_transactions,
    COUNT(DISTINCT source_school_id) as contributing_schools_count,
    COUNT(DISTINCT CASE WHEN transaction_type = 'disbursement' THEN recipient_school_id END) as recipient_schools_count
FROM montree_impact_fund_transactions;

-- =============================================================================
-- PART 8: Update triggers for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to new tables
DROP TRIGGER IF EXISTS update_npo_applications_updated_at ON montree_npo_applications;
CREATE TRIGGER update_npo_applications_updated_at
    BEFORE UPDATE ON montree_npo_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reduced_rate_applications_updated_at ON montree_reduced_rate_applications;
CREATE TRIGGER update_reduced_rate_applications_updated_at
    BEFORE UPDATE ON montree_reduced_rate_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_npo_outreach_updated_at ON montree_npo_outreach;
CREATE TRIGGER update_npo_outreach_updated_at
    BEFORE UPDATE ON montree_npo_outreach
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DONE
-- =============================================================================
