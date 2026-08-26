-- migrations/339_lens_v1.sql
-- Montree Lens v1 — the visiting observer's app.
--
-- Purely additive. One transaction, idempotent, every object prefixed `lens_`.
-- Nothing here ALTERs, DROPs or widens anything that already exists, and no
-- montree_* / tp_* / cms_* table is referenced. Lens is its own product with
-- its own auth (invite code -> `lens_observer` cookie, aud `lens-observer`);
-- it has no Supabase user, so RLS is ENABLED WITH NO POLICIES on every table —
-- deny-all for anon/authenticated, and the app reads through the service role.
-- That is the same posture Potato Snaps and CMS use.
--
-- 🚨 STORAGE IS NOT CREATED HERE. The private bucket `lens-photos` must be made
-- in the Supabase dashboard (Storage -> New bucket -> name `lens-photos`,
-- Public = OFF). Writing to the storage schema from a migration rolls the whole
-- migration back — the lesson this repo learned the hard way with the
-- `potato-snaps` bucket. See docs/LENS_BUILD_LOG.md.
--
-- 🚨 THE SEED AT THE BOTTOM mints one observer with the placeholder invite code
-- 'LENSV1AA'. Change it immediately after running this file — the UPDATE is in
-- the build log and in a comment beside the seed.

BEGIN;

-- ---------------------------------------------------------------- observer --
-- One row per person who writes reports. Multi-tenant from day one, single-user
-- in practice: everything else in this schema hangs off an observer_id.
CREATE TABLE IF NOT EXISTS lens_observers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  title             TEXT,
  credentials       TEXT,
  organisation      TEXT,
  -- Letterhead, kept as discrete fields rather than one blob so the PDF cover
  -- can lay them out instead of printing somebody's line breaks.
  letterhead_name   TEXT,
  letterhead_line1  TEXT,
  letterhead_line2  TEXT,
  letterhead_email  TEXT,
  letterhead_phone  TEXT,
  signature_text    TEXT,
  -- 'en', 'zh' or both. The report editor's language toggle defaults to this.
  default_languages TEXT[] NOT NULL DEFAULT ARRAY['en']::TEXT[],
  -- Learned voice: sentence length, formality, favourite phrasings, how blunt
  -- recommendations should be. Shape lives in lib/lens/guru/style-profile.ts.
  style_profile     JSONB NOT NULL DEFAULT '{}'::JSONB,
  invite_code       TEXT NOT NULL UNIQUE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------- schools --
CREATE TABLE IF NOT EXISTS lens_schools (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_id   UUID NOT NULL REFERENCES lens_observers(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  city          TEXT,
  country       TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  logo_path     TEXT,
  -- 'ami' | 'ams' | 'imc' | 'none' | free text. Not constrained: the world has
  -- more affiliations than any CHECK will keep up with.
  affiliation   TEXT,
  age_bands     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lens_schools_observer
  ON lens_schools (observer_id, name);

-- -------------------------------------------------------------- classrooms --
-- `level` is the Montessori plane/community, not a grade. The CHECK is the
-- enum: nido (0-18m), toddler (18m-3), casa (3-6), lower_el (6-9),
-- upper_el (9-12), adolescent (12-18).
CREATE TABLE IF NOT EXISTS lens_classrooms (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES lens_schools(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  level        TEXT NOT NULL DEFAULT 'casa'
    CHECK (level IN ('nido','toddler','casa','lower_el','upper_el','adolescent')),
  age_range    TEXT,
  child_count  INTEGER,
  ratio        TEXT,
  room_notes   TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lens_classrooms_school
  ON lens_classrooms (school_id, name);

-- ------------------------------------------------------------------- staff --
CREATE TABLE IF NOT EXISTS lens_staff (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id     UUID NOT NULL REFERENCES lens_classrooms(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'lead_guide'
    CHECK (role IN ('lead_guide','assistant','trainee','other')),
  training         TEXT,
  training_level   TEXT,
  years_experience INTEGER,
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lens_staff_classroom
  ON lens_staff (classroom_id, name);

-- ------------------------------------------------------------------ visits --
CREATE TABLE IF NOT EXISTS lens_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observer_id     UUID NOT NULL REFERENCES lens_observers(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES lens_schools(id) ON DELETE CASCADE,
  visit_date      DATE NOT NULL,
  engagement_type TEXT NOT NULL DEFAULT 'consultation'
    CHECK (engagement_type IN ('consultation','mentoring','internal_review')),
  purpose         TEXT,
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'capturing'
    CHECK (status IN ('capturing','drafting','review','final')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lens_visits_observer
  ON lens_visits (observer_id, visit_date DESC);

-- Which rooms this visit covers. A junction rather than an array column so a
-- room can be added mid-visit without rewriting the row.
CREATE TABLE IF NOT EXISTS lens_visit_classrooms (
  visit_id     UUID NOT NULL REFERENCES lens_visits(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES lens_classrooms(id) ON DELETE CASCADE,
  PRIMARY KEY (visit_id, classroom_id)
);

-- ----------------------------------------------------------------- moments --
-- The timestamped stream. One row per photo / voice note / typed line / chip.
--
-- 🚨 `client_id` IS THE OFFLINE CONTRACT. The device queue mints it before the
-- moment ever leaves the phone and re-sends it on every retry, so a lost
-- response can never produce a duplicate moment. The partial unique index is
-- what makes that true; the route's 23505 handling is the other half.
CREATE TABLE IF NOT EXISTS lens_moments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id     UUID NOT NULL REFERENCES lens_visits(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES lens_classrooms(id) ON DELETE SET NULL,
  ts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind         TEXT NOT NULL CHECK (kind IN ('photo','voice','text','chip')),
  media_path   TEXT,
  transcript   TEXT,
  body         TEXT,
  caption      TEXT,
  area         TEXT CHECK (area IS NULL OR area IN
    ('practical_life','sensorial','language','mathematics','culture','other')),
  subject      TEXT CHECK (subject IS NULL OR subject IN
    ('children','environment','adult')),
  staff_id     UUID REFERENCES lens_staff(id) ON DELETE SET NULL,
  child_alias  TEXT,
  -- 4-level pip: 4 exemplary, 3 established, 2 emerging, 1 not_yet.
  rating       SMALLINT CHECK (rating IS NULL OR (rating BETWEEN 1 AND 4)),
  client_id    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lens_moments_visit
  ON lens_moments (visit_id, ts);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lens_moments_client_id
  ON lens_moments (visit_id, client_id) WHERE client_id IS NOT NULL;

-- ----------------------------------------------------------------- reports --
-- classroom_id NULL = the whole-school "level report". Sections and the rest are
-- JSONB because the template is engagement-type aware and will grow variants
-- (AMS rubric, a school's own) without a migration each time.
CREATE TABLE IF NOT EXISTS lens_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id         UUID NOT NULL REFERENCES lens_visits(id) ON DELETE CASCADE,
  classroom_id     UUID REFERENCES lens_classrooms(id) ON DELETE SET NULL,
  template         TEXT NOT NULL DEFAULT 'ami_default',
  languages        TEXT[] NOT NULL DEFAULT ARRAY['en']::TEXT[],
  sections         JSONB NOT NULL DEFAULT '[]'::JSONB,
  ratings          JSONB NOT NULL DEFAULT '{}'::JSONB,
  commendations    JSONB NOT NULL DEFAULT '[]'::JSONB,
  recommendations  JSONB NOT NULL DEFAULT '[]'::JSONB,
  required_actions JSONB NOT NULL DEFAULT '[]'::JSONB,
  next_steps       JSONB NOT NULL DEFAULT '[]'::JSONB,
  debrief          JSONB NOT NULL DEFAULT '[]'::JSONB,
  status           TEXT NOT NULL DEFAULT 'capturing'
    CHECK (status IN ('capturing','drafting','review','final')),
  version          INTEGER NOT NULL DEFAULT 1,
  pdf_path         TEXT,
  finalised_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lens_reports_visit
  ON lens_reports (visit_id);
-- One report per (visit, classroom). The level report is the row whose
-- classroom_id is NULL, and there is exactly one of those per visit too — hence
-- two partial indexes rather than one nullable-column unique.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lens_reports_visit_classroom
  ON lens_reports (visit_id, classroom_id) WHERE classroom_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lens_reports_visit_level
  ON lens_reports (visit_id) WHERE classroom_id IS NULL;

-- ------------------------------------------------------------ action items --
-- Seeded from a report's recommendations when it is finalised, and surfaced on
-- the NEXT visit to the same classroom ("last time you recommended X").
-- classroom_id is denormalised deliberately: that recall query runs off the
-- classroom, and a report whose classroom row is later reassigned must not take
-- its follow-ups with it.
CREATE TABLE IF NOT EXISTS lens_action_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id      UUID NOT NULL REFERENCES lens_reports(id) ON DELETE CASCADE,
  classroom_id   UUID REFERENCES lens_classrooms(id) ON DELETE SET NULL,
  text           TEXT NOT NULL,
  owner          TEXT,
  due_date       DATE,
  status         TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','done','carried','dropped')),
  -- Set when this item was carried forward into a later visit's report.
  carried_from_id UUID REFERENCES lens_action_items(id) ON DELETE SET NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lens_action_items_report
  ON lens_action_items (report_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lens_action_items_open
  ON lens_action_items (classroom_id, status) WHERE status IN ('open','in_progress');

-- ------------------------------------------------------------------- touch --
CREATE OR REPLACE FUNCTION lens_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lens_observers','lens_schools','lens_classrooms','lens_staff',
    'lens_visits','lens_moments','lens_reports','lens_action_items'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_touch ON %1$s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_touch BEFORE UPDATE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION lens_touch_updated_at()', t);
  END LOOP;
END $$;

-- --------------------------------------------------------------------- RLS --
-- Enabled with NO policies: anon and authenticated get nothing at all. Lens
-- authenticates its one human with a signed cookie and reads through the
-- service role, which bypasses RLS — the same posture as tp_* and the
-- montree_device_tokens table.
ALTER TABLE lens_observers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_schools          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_classrooms       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_staff            ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_visits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_visit_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_moments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lens_action_items     ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------- seed --
-- 🚨 CHANGE THIS CODE. 'LENSV1AA' is a placeholder that ships in a public repo;
-- anyone reading this file can type it into the door. Right after running this
-- migration, run:
--
--   UPDATE lens_observers
--      SET invite_code = 'YOUR8CHR'      -- 8 chars, A-Z and 2-9 only
--    WHERE invite_code = 'LENSV1AA';
--
INSERT INTO lens_observers (name, title, credentials, default_languages, invite_code)
VALUES ('Observer', 'Montessori Consultant', 'AMI', ARRAY['en','zh']::TEXT[], 'LENSV1AA')
ON CONFLICT (invite_code) DO NOTHING;

COMMIT;
