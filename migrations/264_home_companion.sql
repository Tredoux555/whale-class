-- =============================================================================
-- 264  HOME COMPANION (Ivy) — family calendar + conversation archive.
-- Run in the MONTREE project (dmfncjjtsoxrnvcdnvjq). Idempotent + additive.
-- =============================================================================
--
-- The home system is ONE parent, ONE child (or two siblings), ONE companion
-- (Ivy). Unlike the school side (montree_appointments — host-based, parent<->
-- staff), the home calendar is a simple, parent-owned list of dated things Ivy
-- helps manage: the child's activities, the parent's own reminders, a gentle
-- routine. No hosts, no RSVPs, no slots — radical simplicity on purpose.
--
-- All code that reads/writes these tables degrades gracefully (try/catch →
-- empty) until this migration is run, so deploying the code first never breaks
-- the build or the existing home surface.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- montree_home_events — the family calendar. One row per concrete dated thing.
-- Recurring routines live in montree_children.settings.companion.routines (JSONB,
-- no table) — they're per-child rhythm, not calendar entries.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS montree_home_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL,                 -- the home "school" container
  parent_id   uuid NOT NULL,                 -- montree_teachers.id (homeschool_parent)
  child_id    uuid,                          -- NULL = a parent/family-level item
  title       text NOT NULL,
  detail      text,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz,
  all_day     boolean NOT NULL DEFAULT false,
  kind        text NOT NULL DEFAULT 'activity'
              CHECK (kind IN ('appointment','activity','reminder','routine','wellbeing')),
  audience    text NOT NULL DEFAULT 'family'
              CHECK (audience IN ('child','parent','family')),
  created_by  text NOT NULL DEFAULT 'ivy'
              CHECK (created_by IN ('ivy','parent')),
  status      text NOT NULL DEFAULT 'planned'
              CHECK (status IN ('planned','done','cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_home_events_parent_start
  ON montree_home_events (parent_id, start_at);
CREATE INDEX IF NOT EXISTS idx_home_events_school_start
  ON montree_home_events (school_id, start_at);
CREATE INDEX IF NOT EXISTS idx_home_events_child
  ON montree_home_events (child_id) WHERE child_id IS NOT NULL;

ALTER TABLE montree_home_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_home_events FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- montree_companion_log — the durable archive of every Ivy turn (per child).
-- Powers (a) cross-device thread resume and (b) the nightly memory consolidation
-- pass. Plaintext, consistent with the rest of Montree (montree_guru_interactions
-- etc.) — the home product is not an E2E vault like the Story sanctuary.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS montree_companion_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        uuid NOT NULL,
  parent_id        uuid NOT NULL,
  child_id         uuid NOT NULL,
  conversation_id  text,
  question         text NOT NULL,
  answer           text,
  tools_used       text[] NOT NULL DEFAULT '{}',
  model            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  consolidated_at  timestamptz                    -- NULL until the sleep-pass folds it in
);

-- Thread resume: newest turns for a child.
CREATE INDEX IF NOT EXISTS idx_companion_log_child_created
  ON montree_companion_log (child_id, created_at DESC);
-- Consolidation due-check: cheap lookup of un-folded prior-day turns.
CREATE INDEX IF NOT EXISTS idx_companion_log_unconsolidated
  ON montree_companion_log (child_id, created_at)
  WHERE consolidated_at IS NULL;

ALTER TABLE montree_companion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_companion_log FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- montree_weekly_works — the curated "make-it-at-home" DIY work of the week.
-- This is how a human (Tredoux, deep-diving with Claude) PROVIDES a weekly
-- activity: insert one row for the week and it shows to every family whose
-- child fits the age range. When no row exists for the current week, Ivy
-- generates a per-child one on the fly (cached in settings.companion.weekly_work),
-- so every family always has something to make. age_min/age_max are in YEARS
-- (NULL = no bound).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS montree_weekly_works (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of         date NOT NULL,                 -- Monday of the ISO week it applies to
  scope           text NOT NULL DEFAULT 'global' CHECK (scope IN ('global')),
  age_min         real,                          -- years, inclusive (NULL = no lower bound)
  age_max         real,                          -- years, inclusive (NULL = no upper bound)
  title           text NOT NULL,
  the_idea        text NOT NULL,                 -- 1-2 sentences: what it is
  what_it_builds  text,                          -- the developmental purpose, plain
  materials       jsonb NOT NULL DEFAULT '[]'::jsonb,
  make_it         jsonb NOT NULL DEFAULT '[]'::jsonb,    -- how to build it
  how_to_present  jsonb NOT NULL DEFAULT '[]'::jsonb,    -- how to show the child
  variation       text,
  source_url      text,
  created_by      text DEFAULT 'curated',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_works_week ON montree_weekly_works (week_of DESC);

ALTER TABLE montree_weekly_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_weekly_works FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- montree_marketplace_products — the curated home shop. Sellers' Montessori
-- materials/equipment offered to parents at a discount through the system
-- (mutual benefit: parents get a deal, sellers help push the platform).
-- CURATED UNDER THE ADMIN SYSTEM: rows are created/managed by super-admin only
-- (the parent side is read-only and just links out to buy). price_cents is the
-- usual price; sale_price_cents is the through-Montree price. age_min/max in
-- years (NULL = no bound).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS montree_marketplace_products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  description      text,
  image_url        text,
  seller_name      text,
  product_url      text NOT NULL,                 -- outbound buy link (discounted)
  price_cents      integer,                       -- usual price (display)
  sale_price_cents integer,                       -- through-Montree price (display)
  currency         text NOT NULL DEFAULT 'USD',
  discount_code    text,                          -- optional code parents enter at checkout
  category         text,                          -- e.g. practical_life | sensorial | books | furniture
  age_min          real,
  age_max          real,
  is_active        boolean NOT NULL DEFAULT true,
  sort             integer NOT NULL DEFAULT 0,
  created_by       text DEFAULT 'admin',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_active
  ON montree_marketplace_products (sort, created_at DESC) WHERE is_active = true;

ALTER TABLE montree_marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_marketplace_products FORCE ROW LEVEL SECURITY;
