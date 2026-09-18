-- migrations/360_dark_phonics_hub.sql
--
-- The public Dark Phonics hub (montree.xyz/dark-phonics). 2026-09-17.
--
-- WHAT THIS IS
-- Three small tables and one board row behind the new front door:
--   montree_dp_leads          the mailing-list strip ("get the new books first")
--   montree_dp_events         first-party measurement, keyed on an anonymous
--                             browser id, never on a person
--   montree_dp_subscriptions  the $5/mo · $30/yr gate's state, built now and
--                             switched OFF (DARK_PHONICS_PAYWALL='off')
-- …plus the `product` board scope, so the hub's Community tab is a row in the
-- existing feedback module (migration 359) rather than a second board.
--
-- WHAT IT IS NOT
-- It does not touch school billing, montree_schools, or any montree_fb_* table
-- except to widen one CHECK constraint and insert one board row.
--
-- RUN: paste into Supabase -> SQL Editor -> Run.
-- Idempotent (IF NOT EXISTS / ON CONFLICT / guarded ALTER) and transactional,
-- so a re-run is a no-op and a failure leaves nothing half-created.
--
-- RLS: every new table gets ROW LEVEL SECURITY with NO policies — deny-all to
-- the anon key that ships to the browser (the pattern set by 275 and 359). The
-- app reads and writes with the service-role key, which bypasses RLS.

BEGIN;

-- ── Leads ───────────────────────────────────────────────────────────────────
-- One row per address, forever. `email` is UNIQUE so the API can upsert with
-- ignoreDuplicates and answer a double-tap with a cheerful 200.

CREATE TABLE IF NOT EXISTS public.montree_dp_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL UNIQUE,
  role         text CHECK (role IS NULL OR role IN ('teacher', 'parent')),
  -- First-touch attribution, copied off the dp_utm cookie at submit time.
  utm          jsonb,
  -- The anonymous browser id, so a lead can be joined to its own visit path.
  aid          uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Stamped once the welcome email actually sent. NULL = never welcomed, which
  -- is what stops a re-subscribe re-sending it.
  welcomed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS montree_dp_leads_created_idx
  ON public.montree_dp_leads (created_at DESC);

-- ── Events ──────────────────────────────────────────────────────────────────
-- Fire-and-forget beacons from the hub. `aid` is a cookie, not a person: it
-- identifies a browser and nothing else, and there is no email, no name and no
-- IP address in this table on purpose.

CREATE TABLE IF NOT EXISTS public.montree_dp_events (
  id          bigserial PRIMARY KEY,
  aid         uuid,
  -- Validated against the allow-list in lib/montree/dark-phonics/events.ts
  -- before it ever reaches here; the CHECK is the second lock on the same door.
  event       text NOT NULL,
  lesson      smallint CHECK (lesson IS NULL OR (lesson BETWEEN 1 AND 49)),
  stage       text,
  utm         jsonb,
  props       jsonb,
  ua          text,
  host        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS montree_dp_events_created_idx ON public.montree_dp_events (created_at DESC);
CREATE INDEX IF NOT EXISTS montree_dp_events_event_idx   ON public.montree_dp_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS montree_dp_events_aid_idx     ON public.montree_dp_events (aid) WHERE aid IS NOT NULL;
CREATE INDEX IF NOT EXISTS montree_dp_events_lesson_idx  ON public.montree_dp_events (lesson) WHERE lesson IS NOT NULL;

-- ── Subscriptions ───────────────────────────────────────────────────────────
-- One row per Teachers' Room (community) account. The primary key IS the user
-- id, which is what makes every webhook write an idempotent upsert.
--
-- 🚨 UNUSED UNTIL DARK_PHONICS_PAYWALL='on'. Creating it now is what makes that
-- switch a switch.

CREATE TABLE IF NOT EXISTS public.montree_dp_subscriptions (
  community_user_id       uuid PRIMARY KEY,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan                    text CHECK (plan IS NULL OR plan IN ('month', 'year')),
  status                  text NOT NULL DEFAULT 'incomplete',
  current_period_end      timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS montree_dp_subscriptions_customer_idx
  ON public.montree_dp_subscriptions (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS montree_dp_subscriptions_status_idx
  ON public.montree_dp_subscriptions (status);

-- ── RLS: deny-all to the anon key ───────────────────────────────────────────

ALTER TABLE public.montree_dp_leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_dp_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_dp_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── The `product` board scope (feedback module, migration 359) ──────────────
-- 359 wrote CHECK (scope IN ('public','school')) and a second CHECK tying
-- school_id to the scope. Both have to widen before a product row will insert.
-- Dropped and recreated by NAME, guarded, so a re-run is a no-op.

ALTER TABLE public.montree_fb_boards
  DROP CONSTRAINT IF EXISTS montree_fb_boards_scope_check;
ALTER TABLE public.montree_fb_boards
  ADD CONSTRAINT montree_fb_boards_scope_check
  CHECK (scope IN ('public', 'school', 'product'));

ALTER TABLE public.montree_fb_boards
  DROP CONSTRAINT IF EXISTS montree_fb_boards_scope_school;
ALTER TABLE public.montree_fb_boards
  ADD CONSTRAINT montree_fb_boards_scope_school
  CHECK (
    (scope = 'school'  AND school_id IS NOT NULL) OR
    (scope = 'public'  AND school_id IS NULL)     OR
    (scope = 'product' AND school_id IS NULL)
  );

-- ── Seed: the Dark Phonics community board ──────────────────────────────────
-- Its ref is the constant DP_BOARD_REF in
-- components/montree/dark-phonics/HubServer.tsx. The hub looks this row up and
-- never creates it, so a missing row is an honest "not set up yet" rather than
-- an empty board nobody can find.

INSERT INTO public.montree_fb_boards (ref, scope, school_id, name, locale_default)
VALUES ('product:dark-phonics', 'product', NULL, 'Dark Phonics community', 'en')
ON CONFLICT (ref) DO NOTHING;

-- A few starter tags, same idea as the public board's.
INSERT INTO public.montree_fb_tags (board_id, slug, label_en, label_zh, color, sort)
SELECT b.id, t.slug, t.label_en, t.label_zh, t.color, t.sort
  FROM public.montree_fb_boards b
  CROSS JOIN (VALUES
    ('lessons',    'The lessons',       '课程',       '#3f6b00', 10),
    ('printables', 'Printables',        '可打印材料', '#5c3494', 20),
    ('classroom',  'In the classroom',  '在教室里',   '#1c5385', 30),
    ('at-home',    'At home',           '在家里',     '#7a5000', 40),
    ('chinese',    'Chinese / 中文',    '中文',       '#3f6b00', 50)
  ) AS t(slug, label_en, label_zh, color, sort)
 WHERE b.ref = 'product:dark-phonics'
ON CONFLICT (board_id, slug) DO NOTHING;

INSERT INTO montree_migrations (filename) VALUES ('360_dark_phonics_hub.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- Verify:
--   SELECT ref, scope, name FROM montree_fb_boards ORDER BY ref;
--   SELECT count(*) FROM montree_dp_leads;
--   SELECT count(*) FROM montree_dp_events;
--   SELECT count(*) FROM montree_dp_subscriptions;
--   SELECT indexname FROM pg_indexes WHERE indexname LIKE 'montree_dp_%';  -- expect 7
