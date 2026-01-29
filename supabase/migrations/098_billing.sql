-- Migration: 098_billing.sql
-- Purpose: Billing and subscription tables for Stripe integration
-- Run this in Supabase SQL Editor

-- Subscription plans enum
CREATE TYPE subscription_plan AS ENUM ('trial', 'basic', 'standard', 'premium');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');

-- Add billing columns to schools table
ALTER TABLE montree_schools 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_plan subscription_plan DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_status subscription_status DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS max_students INT DEFAULT 50;

-- Billing history table
CREATE TABLE IF NOT EXISTS montree_billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL, -- paid, failed, pending
  description TEXT,
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_billing_school ON montree_billing_history(school_id);
CREATE INDEX IF NOT EXISTS idx_schools_stripe ON montree_schools(stripe_customer_id);

-- Enable RLS
ALTER TABLE montree_billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_service_role" ON montree_billing_history
  FOR ALL USING (true) WITH CHECK (true);

-- Helper function to check if school is within limits
CREATE OR REPLACE FUNCTION check_school_student_limit(p_school_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_students INT;
  v_current_students INT;
BEGIN
  SELECT max_students INTO v_max_students 
  FROM montree_schools WHERE id = p_school_id;
  
  SELECT COUNT(*) INTO v_current_students
  FROM montree_children c
  JOIN montree_classrooms cr ON c.classroom_id = cr.id
  WHERE cr.school_id = p_school_id;
  
  RETURN v_current_students < v_max_students;
END;
$$ LANGUAGE plpgsql;

SELECT 'Billing tables and columns created' as status;
