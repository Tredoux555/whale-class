-- Performance indexes for Montree dashboard
-- Session 84: Speed up student page loading
-- These indexes speed up queries without changing any logic
-- VERIFIED: All tables exist in codebase

-- Child work progress - queried frequently by child_id
CREATE INDEX IF NOT EXISTS idx_child_work_progress_child_id 
ON child_work_progress(child_id);

-- Weekly assignments - queried by child_id and week
CREATE INDEX IF NOT EXISTS idx_weekly_assignments_child_id 
ON weekly_assignments(child_id);

CREATE INDEX IF NOT EXISTS idx_weekly_assignments_child_week 
ON weekly_assignments(child_id, week_number, year);

-- Reports - queried by child_id
CREATE INDEX IF NOT EXISTS idx_montree_weekly_reports_child_id 
ON montree_weekly_reports(child_id);

-- Media - queried by child_id
CREATE INDEX IF NOT EXISTS idx_child_work_media_child_id 
ON child_work_media(child_id);

-- Classroom assignments - for finding a child's classroom
CREATE INDEX IF NOT EXISTS idx_classroom_children_child_id 
ON classroom_children(child_id);

-- Children table - for name lookups
CREATE INDEX IF NOT EXISTS idx_children_name 
ON children(name);
