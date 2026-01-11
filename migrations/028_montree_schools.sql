-- Migration: 028_montree_schools.sql
-- Multi-tenant school system for Montree SaaS

-- Schools table (each paying customer)
CREATE TABLE IF NOT EXISTS montree_schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier (e.g., "sunshine-montessori")
  
  -- Subscription info
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'trialing', -- trialing, active, past_due, canceled
  plan_type TEXT DEFAULT 'school', -- school ($29) or district ($199)
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  
  -- Owner/admin
  owner_email TEXT NOT NULL,
  owner_name TEXT,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- School members (teachers, principals)
CREATE TABLE IF NOT EXISTS montree_school_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'teacher', -- owner, principal, teacher
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, email)
);

-- Link existing simple_teachers to schools
ALTER TABLE simple_teachers 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES montree_schools(id);

-- Link existing children to schools
ALTER TABLE children
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES montree_schools(id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_montree_schools_slug ON montree_schools(slug);
CREATE INDEX IF NOT EXISTS idx_montree_schools_stripe ON montree_schools(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_school_members_school ON montree_school_members(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON simple_teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_children_school ON children(school_id);

-- Create default school for existing data (Tredoux's school)
INSERT INTO montree_schools (id, name, slug, owner_email, subscription_status, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Beijing International School',
  'beijing-international',
  'tredoux@teacherpotato.xyz',
  'active',
  'school'
) ON CONFLICT (slug) DO NOTHING;

-- Assign existing teachers to default school
UPDATE simple_teachers 
SET school_id = '00000000-0000-0000-0000-000000000001'
WHERE school_id IS NULL;

-- Assign existing children to default school
UPDATE children 
SET school_id = '00000000-0000-0000-0000-000000000001'
WHERE school_id IS NULL;
