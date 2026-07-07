-- Migration 288: Ad-Geo Attribution Tracking (Jul 7, 2026)
-- Adds UTM capture to visitor tracking + first-touch attribution stamp on schools.
-- Purpose: track WHERE quality traffic (signups/trials) comes from so Facebook ad
-- spend can target geos producing conversions, not just clicks.
--
-- 🚨 STAGED — NOT RUN. Paste in Supabase SQL editor (whale-class project).
-- Fully idempotent: ADD COLUMN IF NOT EXISTS only. Touches nothing that depends
-- on the montree_visitors schema drift (isp vs ip / page_url). The live-schema
-- verification query lives in the session handoff; run it first if in doubt.

-- ── montree_visitors: UTM capture ──
ALTER TABLE montree_visitors ADD COLUMN IF NOT EXISTS utm_source   TEXT;
ALTER TABLE montree_visitors ADD COLUMN IF NOT EXISTS utm_medium   TEXT;
ALTER TABLE montree_visitors ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE montree_visitors ADD COLUMN IF NOT EXISTS utm_content  TEXT;

-- Funnel view groups visits by (date, utm_source); index the pair it filters on.
CREATE INDEX IF NOT EXISTS idx_montree_visitors_visited_utm_source
  ON montree_visitors (visited_at DESC, utm_source);

-- ── montree_schools: first-touch attribution stamp ──
-- attrib_source: derived channel class (fb | search | outreach | direct | <utm_source>)
-- attrib_utm:    full first-touch JSON blob {source, utm_source, utm_medium,
--                utm_campaign, utm_content, country, ts}
-- attrib_first_touch_at: when the montree_attrib cookie was first set (first touch)
ALTER TABLE montree_schools ADD COLUMN IF NOT EXISTS attrib_source          TEXT;
ALTER TABLE montree_schools ADD COLUMN IF NOT EXISTS attrib_utm             JSONB;
ALTER TABLE montree_schools ADD COLUMN IF NOT EXISTS attrib_first_touch_at  TIMESTAMPTZ;

-- Funnel view filters schools by attrib_source; partial index on attributed rows.
CREATE INDEX IF NOT EXISTS idx_montree_schools_attrib_source
  ON montree_schools (attrib_source) WHERE attrib_source IS NOT NULL;
