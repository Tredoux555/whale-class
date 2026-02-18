-- Migration 131: Platform-Wide Onboarding System
-- Date: Feb 17, 2026
-- Purpose: Track step-by-step onboarding progress per user across all features

-- Main progress tracking table
CREATE TABLE IF NOT EXISTS montree_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('teacher', 'principal', 'parent', 'homeschool_parent')),
  feature_module TEXT NOT NULL, -- e.g., 'student_management', 'week_view', 'guru'
  step_key TEXT NOT NULL, -- e.g., 'click_add_student', 'set_first_focus'
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  skipped BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, user_type, feature_module, step_key)
);

CREATE INDEX idx_onboarding_user ON montree_onboarding_progress(user_id, user_type);
CREATE INDEX idx_onboarding_feature ON montree_onboarding_progress(feature_module);

COMMENT ON TABLE montree_onboarding_progress IS
  'Tracks step-level onboarding progress for all user types. One row per completed step.';

-- Global onboarding settings
CREATE TABLE IF NOT EXISTS montree_onboarding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled_for_teachers BOOLEAN DEFAULT true,
  enabled_for_principals BOOLEAN DEFAULT true,
  enabled_for_parents BOOLEAN DEFAULT true,
  enabled_for_homeschool_parents BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Insert default settings
INSERT INTO montree_onboarding_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE montree_onboarding_settings IS
  'Global on/off switches for onboarding system per role. Singleton table (1 row only).';

-- Analytics: track onboarding events
CREATE TABLE IF NOT EXISTS montree_onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'step_started', 'step_completed', 'step_skipped', 'tour_dismissed'
  feature_module TEXT,
  step_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_events_user ON montree_onboarding_events(user_id);
CREATE INDEX idx_onboarding_events_type ON montree_onboarding_events(event_type);

COMMENT ON TABLE montree_onboarding_events IS
  'Analytics log for onboarding interactions. Used to measure completion rates and identify drop-off points.';
