-- Migration: Parent Self-Signup System
-- Allows parents to register their children for the student portal
-- Admin can approve/reject these signups

-- Create parent_signups table for pending registrations
CREATE TABLE IF NOT EXISTS parent_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Child information
  child_first_name TEXT NOT NULL,
  child_last_name TEXT NOT NULL,
  child_date_of_birth DATE NOT NULL,
  
  -- Parent information
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT,
  
  -- Password (hashed)
  login_password TEXT NOT NULL,
  
  -- Optional: Link to existing child (if parent has a code)
  existing_child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  link_code TEXT,
  
  -- Avatar preference
  avatar_emoji TEXT DEFAULT '🐋',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID, -- Admin reviewer ID (no foreign key since we use simple auth)
  reviewed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate signups
  UNIQUE(parent_email, child_first_name, child_last_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parent_signups_status ON parent_signups(status);
CREATE INDEX IF NOT EXISTS idx_parent_signups_email ON parent_signups(parent_email);
CREATE INDEX IF NOT EXISTS idx_parent_signups_link_code ON parent_signups(link_code) WHERE link_code IS NOT NULL;

-- Add parent contact info to children table (optional, for existing children)
ALTER TABLE children
ADD COLUMN IF NOT EXISTS parent_email TEXT,
ADD COLUMN IF NOT EXISTS parent_phone TEXT,
ADD COLUMN IF NOT EXISTS parent_name TEXT,
ADD COLUMN IF NOT EXISTS signup_method TEXT DEFAULT 'admin' CHECK (signup_method IN ('admin', 'parent_signup'));

-- Create function to generate unique link codes for existing children
CREATE OR REPLACE FUNCTION generate_child_link_code(child_id UUID)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  -- Generate a 6-character alphanumeric code
  code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || child_id::TEXT) FROM 1 FOR 6));
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Add link_code column to children for existing child linking
ALTER TABLE children
ADD COLUMN IF NOT EXISTS link_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_children_link_code ON children(link_code) WHERE link_code IS NOT NULL;

-- Enable RLS on parent_signups
ALTER TABLE parent_signups ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for signup form)
CREATE POLICY "Anyone can submit parent signup"
  ON parent_signups
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Only authenticated users (admins) can view
CREATE POLICY "Authenticated users can view parent signups"
  ON parent_signups
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only authenticated users (admins) can update
CREATE POLICY "Authenticated users can update parent signups"
  ON parent_signups
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Only authenticated users (admins) can delete
CREATE POLICY "Authenticated users can delete parent signups"
  ON parent_signups
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to approve signup and create child account
CREATE OR REPLACE FUNCTION approve_parent_signup(
  signup_id UUID,
  reviewer_id UUID
)
RETURNS UUID AS $$
DECLARE
  new_child_id UUID;
  signup_record RECORD;
BEGIN
  -- Get the signup record
  SELECT * INTO signup_record
  FROM parent_signups
  WHERE id = signup_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signup not found or already processed';
  END IF;
  
  -- If linking to existing child
  IF signup_record.existing_child_id IS NOT NULL THEN
    -- Update existing child with password and parent info
    UPDATE children
    SET 
      login_password = signup_record.login_password,
      avatar_emoji = signup_record.avatar_emoji,
      parent_name = signup_record.parent_name,
      parent_email = signup_record.parent_email,
      parent_phone = signup_record.parent_phone,
      signup_method = 'parent_signup',
      updated_at = NOW()
    WHERE id = signup_record.existing_child_id;
    
    new_child_id := signup_record.existing_child_id;
  ELSE
    -- Create new child account
    -- Combine first_name and last_name into name field
    INSERT INTO children (
      name,
      date_of_birth,
      enrollment_date,
      age_group,
      login_password,
      avatar_emoji,
      parent_name,
      parent_email,
      parent_phone,
      signup_method,
      active_status,
      created_at,
      updated_at
    ) VALUES (
      signup_record.child_first_name || ' ' || signup_record.child_last_name,
      signup_record.child_date_of_birth,
      CURRENT_DATE,
      CASE 
        WHEN EXTRACT(YEAR FROM AGE(signup_record.child_date_of_birth)) BETWEEN 2 AND 3 THEN '2-3'
        WHEN EXTRACT(YEAR FROM AGE(signup_record.child_date_of_birth)) BETWEEN 3 AND 4 THEN '3-4'
        WHEN EXTRACT(YEAR FROM AGE(signup_record.child_date_of_birth)) BETWEEN 4 AND 5 THEN '4-5'
        WHEN EXTRACT(YEAR FROM AGE(signup_record.child_date_of_birth)) BETWEEN 5 AND 6 THEN '5-6'
        ELSE '3-4'
      END,
      signup_record.login_password,
      signup_record.avatar_emoji,
      signup_record.parent_name,
      signup_record.parent_email,
      signup_record.parent_phone,
      'parent_signup',
      true,
      NOW(),
      NOW()
    ) RETURNING id INTO new_child_id;
  END IF;
  
  -- Mark signup as approved
  UPDATE parent_signups
  SET 
    status = 'approved',
    reviewed_by = reviewer_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = signup_id;
  
  RETURN new_child_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reject signup
CREATE OR REPLACE FUNCTION reject_parent_signup(
  signup_id UUID,
  reviewer_id UUID,
  notes TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE parent_signups
  SET 
    status = 'rejected',
    admin_notes = notes,
    reviewed_by = reviewer_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = signup_id AND status = 'pending';
  
  IF FOUND THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_parent_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parent_signups_updated_at
BEFORE UPDATE ON parent_signups
FOR EACH ROW
EXECUTE FUNCTION update_parent_signups_updated_at();

COMMENT ON TABLE parent_signups IS 'Pending parent self-signup registrations for student portal access';
COMMENT ON FUNCTION approve_parent_signup IS 'Approves a parent signup and creates/updates child account';
COMMENT ON FUNCTION reject_parent_signup IS 'Rejects a parent signup with admin notes';
COMMENT ON FUNCTION generate_child_link_code IS 'Generates a unique 6-character code for linking existing children';

