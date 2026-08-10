-- Migration 324: Internal-traffic marking for montree_visitors
-- Lets the super-admin Visitors / Funnel / Geo Match views exclude Tredoux's
-- own devices (VPN traffic from Oslo/Frankfurt etc.) from the numbers by
-- default. Two ways a row gets marked internal:
--   1. Forward-looking: a hidden super-admin toggle sets a localStorage flag
--      on Tredoux's own browser; VisitorTracker.tsx then sends is_internal
--      on every future beacon from that browser (survives VPN IP rotation,
--      since it's tied to the browser, not the network path).
--   2. Retroactive: a "mark as internal" button on a Live-feed visitor row
--      bulk-updates every existing row sharing that fingerprint.
-- Fully idempotent (ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS).

ALTER TABLE montree_visitors ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;

-- Visitors/Funnel/Geo Match all filter `WHERE is_internal = false` by default.
CREATE INDEX IF NOT EXISTS idx_montree_visitors_is_internal ON montree_visitors (is_internal);

-- The "mark as internal" retroactive action updates by fingerprint — migration
-- 156 already indexed `fingerprint` (idx_montree_visitors_fingerprint), so no
-- new index is needed for that lookup.
