-- Migration: 096_parent_portal_fixes.sql
-- Purpose: Fix parent portal - add missing tables, unify access system
-- Status: APPLIED February 2, 2026

-- ============================================
-- PART 1: ANNOUNCEMENTS TABLE (created in 095)
-- ============================================
-- Already exists from migration 095

-- ============================================
-- PART 2: WEEKLY REPORTS TABLE
-- ============================================

DROP TABLE IF EXISTS montree_weekly_reports CASCADE;

CREATE TABLE montree_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES montree_children(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES montree_classrooms(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  report_year INTEGER NOT NULL,
  week_start DATE,
  week_end DATE,
  parent_summary TEXT,
  highlights JSONB DEFAULT '[]',
  areas_of_growth JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  concentration_score INTEGER,
  area_distribution JSONB,
  active_sensitive_periods JSONB DEFAULT '[]',
  recommended_works JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES montree_teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, week_number, report_year)
);

CREATE INDEX idx_weekly_reports_child ON montree_weekly_reports(child_id);
CREATE INDEX idx_weekly_reports_week ON montree_weekly_reports(report_year, week_number);

ALTER TABLE montree_weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all weekly_reports operations" ON montree_weekly_reports
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- PART 3: ENHANCE PARENT INVITES FOR REUSABLE ACCESS
-- ============================================

ALTER TABLE montree_parent_invites
  ADD COLUMN IF NOT EXISTS is_reusable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Migration 096 complete!' as status;
