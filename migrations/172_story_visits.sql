-- Migration 172: Story visits — tracks every time a user checks/opens the Story page
-- A new visit is created when the user returns after 5+ minutes of inactivity.
-- Heartbeat updates last_active_at on the current visit so we know how long they stayed.

CREATE TABLE IF NOT EXISTS story_visits (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_story_visits_username ON story_visits(username);
CREATE INDEX IF NOT EXISTS idx_story_visits_visited_at ON story_visits(visited_at DESC);
