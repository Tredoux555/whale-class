-- Migration 231: Campaign Command Center.
--
-- Backs the super-admin video-marketing campaign tracker — the "war room"
-- for the Montree front-page + feature-video rollout. One row per video.
-- Holds the script itself (record of everything), the production status
-- pipeline, the target platforms, and the scheduled post date.
--
-- This is the super-admin-owned tracker. The agent-facing campaign tool
-- (phase 2) reads the same playbook but is a separate, agent-scoped surface.
--
-- Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS montree_campaign_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  -- which Montree feature this video showcases (NULL for the hero video)
  feature_key   text,
  video_type    text NOT NULL DEFAULT 'feature'
                  CHECK (video_type IN ('hero', 'feature')),
  -- marketing tier 1-4, used to sequence the rollout (1 = launch first)
  tier          int,
  -- the script content itself — the tool is the system of record
  script        text,
  status        text NOT NULL DEFAULT 'idea'
                  CHECK (status IN ('idea', 'scripted', 'filmed', 'scheduled', 'posted')),
  -- target platforms: tiktok | reels | shorts | linkedin
  platforms     text[] NOT NULL DEFAULT '{}',
  scheduled_for date,
  posted_at     timestamptz,
  sort_order    int NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_items_sort
  ON montree_campaign_items (sort_order);
CREATE INDEX IF NOT EXISTS idx_campaign_items_status
  ON montree_campaign_items (status);
CREATE INDEX IF NOT EXISTS idx_campaign_items_scheduled
  ON montree_campaign_items (scheduled_for)
  WHERE scheduled_for IS NOT NULL;

-- Auto-bump updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION montree_campaign_items_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaign_items_touch ON montree_campaign_items;
CREATE TRIGGER trg_campaign_items_touch
  BEFORE UPDATE ON montree_campaign_items
  FOR EACH ROW
  EXECUTE FUNCTION montree_campaign_items_touch_updated_at();

-- Seed the 13-video rollout (1 hero + 12 feature videos), ranked by
-- marketing value. Runs ONCE — the WHERE NOT EXISTS guard makes re-runs
-- a no-op so the migration stays idempotent. All start at status 'idea';
-- platforms default to all four channels (the research says post natively
-- to each — never cross-post the same file).
INSERT INTO montree_campaign_items (title, feature_key, video_type, tier, status, platforms, sort_order)
SELECT * FROM (VALUES
  ('Montree — Front Page Hero',        NULL::text,             'hero',    NULL::int, 'idea', ARRAY['tiktok','reels','shorts','linkedin'], 0),
  ('Smart Capture — snap a photo',     'smart_capture',        'feature', 1,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 1),
  ('AI Weekly Reports',                'weekly_reports',       'feature', 1,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 2),
  ('Guru — the AI teaching assistant', 'guru',                 'feature', 1,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 3),
  ('Child Profiles & Progress',        'child_progress',       'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 4),
  ('Tracy — the principal''s AI',      'tracy',                'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 5),
  ('Curriculum & Planning',            'curriculum',           'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 6),
  ('Communication Network',            'communication',        'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 7),
  ('Voice Onboarding',                 'voice_onboarding',     'feature', 2,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 8),
  ('English Progression Tracker',      'english_progression',  'feature', 3,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 9),
  ('Appointments & Video Calls',       'appointments',         'feature', 3,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 10),
  ('Library Teaching Tools',           'library_tools',        'feature', 3,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 11),
  ('Multilingual — 12 languages',      'multilingual',         'feature', 3,         'idea', ARRAY['tiktok','reels','shorts','linkedin'], 12)
) AS seed(title, feature_key, video_type, tier, status, platforms, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM montree_campaign_items);

COMMIT;
