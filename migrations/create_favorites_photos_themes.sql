-- migrations/create_activity_favorites_table.sql
-- Create activity_favorites table for starring activities

CREATE TABLE IF NOT EXISTS activity_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_favorites_user_id ON activity_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_favorites_activity_id ON activity_favorites(activity_id);

-- Create activity_photos table for photo uploads
CREATE TABLE IF NOT EXISTS activity_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES daily_activity_assignments(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_photos_assignment_id ON activity_photos(assignment_id);
CREATE INDEX IF NOT EXISTS idx_activity_photos_child_id ON activity_photos(child_id);

-- Create activity_themes table for thematic grouping
CREATE TABLE IF NOT EXISTS activity_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_themes_activity_id ON activity_themes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_themes_theme_name ON activity_themes(theme_name);

COMMENT ON TABLE activity_favorites IS 'Teacher favorite activities for quick access';
COMMENT ON TABLE activity_photos IS 'Photos of children completing activities';
COMMENT ON TABLE activity_themes IS 'Thematic tags for activities (animals, colors, seasons, etc.)';
