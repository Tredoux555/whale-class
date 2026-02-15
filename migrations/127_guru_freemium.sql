-- Migration 127: Guru Freemium — tracking columns for homeschool parents
-- Date: Feb 15, 2026
-- Purpose: Enable free-trial + paid Guru access for homeschool parents
--
-- Architecture: Columns on montree_teachers (homeschool parents ARE teachers).
-- guru_prompts_used tracks free trial (3 prompts). guru_plan tracks subscription.
-- Stripe fields for billing. All columns nullable/defaulted so existing teachers unaffected.

-- Guru usage tracking on montree_teachers
ALTER TABLE montree_teachers ADD COLUMN IF NOT EXISTS guru_plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE montree_teachers ADD COLUMN IF NOT EXISTS guru_prompts_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE montree_teachers ADD COLUMN IF NOT EXISTS guru_stripe_customer_id TEXT;
ALTER TABLE montree_teachers ADD COLUMN IF NOT EXISTS guru_stripe_subscription_id TEXT;
ALTER TABLE montree_teachers ADD COLUMN IF NOT EXISTS guru_subscription_status TEXT DEFAULT 'none';
ALTER TABLE montree_teachers ADD COLUMN IF NOT EXISTS guru_current_period_end TIMESTAMP;

-- Index for Stripe webhook lookups
CREATE INDEX IF NOT EXISTS idx_teachers_guru_stripe_customer ON montree_teachers(guru_stripe_customer_id) WHERE guru_stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_guru_stripe_sub ON montree_teachers(guru_stripe_subscription_id) WHERE guru_stripe_subscription_id IS NOT NULL;
