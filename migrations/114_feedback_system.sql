-- Migration 114: Feedback System
-- Simple feedback collection for schools during beta testing

CREATE TABLE IF NOT EXISTS montree_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Context (auto-captured)
    school_id UUID REFERENCES montree_schools(id) ON DELETE SET NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('teacher', 'principal', 'parent', 'admin')),
    user_id UUID,  -- Could be teacher_id, parent session, etc.
    user_name TEXT,  -- Display name for easy reading
    page_url TEXT,  -- Which page they were on

    -- Feedback content
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'idea', 'help', 'praise', 'other')),
    message TEXT NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- For super admin tracking (optional)
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ
);

-- Index for super admin queries
CREATE INDEX idx_feedback_created_at ON montree_feedback(created_at DESC);
CREATE INDEX idx_feedback_school ON montree_feedback(school_id);
CREATE INDEX idx_feedback_type ON montree_feedback(feedback_type);
CREATE INDEX idx_feedback_unread ON montree_feedback(is_read) WHERE is_read = FALSE;

-- Grant permissions
GRANT ALL ON montree_feedback TO authenticated;
GRANT ALL ON montree_feedback TO service_role;
