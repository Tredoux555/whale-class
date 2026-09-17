-- migrations/359_feedback_board.sql
--
-- The reusable feedback board (montree_fb_*). 2026-09-17.
--
-- WHAT THIS IS
-- A board where people report problems, propose ideas, ask questions and talk
-- to each other; others vote and comment; the team answers, sets a status and
-- closes the loop. First mount is the PUBLIC product board at
-- /montree/library/feedback, but every table is keyed on board_id from day one
-- so a per-school private board (scope 'school') is a row, not a migration.
--
-- WHAT IT IS NOT
-- It does not touch `montree_feedback` (migration 114). That table is the old
-- one-way mailbox behind the unmounted FeedbackButton; it keeps its rows and
-- its name. This is a separate module ("v2") and nothing here reads it.
--
-- RUN: paste into Supabase -> SQL Editor -> Run.
-- Idempotent (IF NOT EXISTS / ON CONFLICT everywhere) and transactional, so a
-- re-run is a no-op and a failure leaves nothing half-created.
--
-- RLS: every table gets ROW LEVEL SECURITY with NO policies — deny-all to the
-- anon key that ships to the browser (the pattern set by migration 275). The
-- app reads and writes with the service-role key, which bypasses RLS, and all
-- of that access funnels through lib/montree/feedback/repo.ts.

BEGIN;

-- pg_trgm powers the "Is it one of these?" duplicate check. It is an extension,
-- so it may be unavailable on a restricted instance — guarded, and the code
-- path degrades to plain ILIKE, which the index below simply does not serve.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Boards ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.montree_fb_boards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref             text NOT NULL UNIQUE,                    -- 'public' | 'school:<uuid>'
  scope           text NOT NULL CHECK (scope IN ('public', 'school')),
  school_id       uuid,
  name            text NOT NULL,
  locale_default  text NOT NULL DEFAULT 'en' CHECK (locale_default IN ('en', 'zh')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- A school board must name a school; the public board must not.
  CONSTRAINT montree_fb_boards_scope_school
    CHECK ((scope = 'school' AND school_id IS NOT NULL) OR (scope = 'public' AND school_id IS NULL))
);

CREATE INDEX IF NOT EXISTS montree_fb_boards_school_idx
  ON public.montree_fb_boards (school_id) WHERE school_id IS NOT NULL;

-- ── Posts ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.montree_fb_posts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id           uuid NOT NULL REFERENCES public.montree_fb_boards(id) ON DELETE CASCADE,
  type               text NOT NULL CHECK (type IN ('problem', 'idea', 'question', 'discussion')),
  title              text NOT NULL,
  body               text NOT NULL DEFAULT '',
  -- Problem template: what / expected / where / userAgent / url.
  template           jsonb,
  status             text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','confirmed','in_progress','fixed','wont_fix',
                                       'under_review','planned','shipped','declined','answered')),
  author_kind        text NOT NULL CHECK (author_kind IN ('user', 'guest')),
  author_id          text,          -- montree_teachers.id / community id; null for guests
  author_name        text NOT NULL, -- display name only. NEVER a legal or child name.
  author_role        text,
  -- 'user:<id>' | 'community:<id>' | 'guest:<hmac>'. The one identity string
  -- votes, subscriptions and "is this the author?" all agree on.
  author_key         text NOT NULL,
  guest_email_hash   text,
  tags               text[] NOT NULL DEFAULT '{}',
  screenshot_path    text,          -- object path in the feedback-screenshots bucket
  vote_count         integer NOT NULL DEFAULT 0,
  comment_count      integer NOT NULL DEFAULT 0,
  has_official_reply boolean NOT NULL DEFAULT false,
  last_activity_at   timestamptz NOT NULL DEFAULT now(),
  pinned             boolean NOT NULL DEFAULT false,
  hidden             boolean NOT NULL DEFAULT false,
  hidden_reason      text,
  merged_into        uuid REFERENCES public.montree_fb_posts(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- The board list's three shapes: filtered by status, ordered by activity,
-- ordered by votes. Every one of them is board-scoped first, which is the
-- whole tenancy guarantee expressed as an index.
CREATE INDEX IF NOT EXISTS montree_fb_posts_board_status_idx
  ON public.montree_fb_posts (board_id, status);
CREATE INDEX IF NOT EXISTS montree_fb_posts_board_type_idx
  ON public.montree_fb_posts (board_id, type);
CREATE INDEX IF NOT EXISTS montree_fb_posts_board_activity_idx
  ON public.montree_fb_posts (board_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS montree_fb_posts_board_votes_idx
  ON public.montree_fb_posts (board_id, vote_count DESC);
CREATE INDEX IF NOT EXISTS montree_fb_posts_board_created_idx
  ON public.montree_fb_posts (board_id, created_at DESC);
-- The admin queue's "unanswered first" pass.
CREATE INDEX IF NOT EXISTS montree_fb_posts_unanswered_idx
  ON public.montree_fb_posts (board_id, has_official_reply, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS montree_fb_posts_author_key_idx
  ON public.montree_fb_posts (author_key);
CREATE INDEX IF NOT EXISTS montree_fb_posts_tags_idx
  ON public.montree_fb_posts USING GIN (tags);
-- Duplicate detection. Trigram over the title is what makes "Photos upload
-- twice" find "Photos upload twice on iPhone" in one index scan.
CREATE INDEX IF NOT EXISTS montree_fb_posts_title_trgm_idx
  ON public.montree_fb_posts USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS montree_fb_posts_body_trgm_idx
  ON public.montree_fb_posts USING GIN (body gin_trgm_ops);

-- ── Comments (FLAT — one level, replies quote) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.montree_fb_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES public.montree_fb_posts(id) ON DELETE CASCADE,
  -- Denormalised so a comment can never be read outside its board by accident.
  board_id     uuid NOT NULL REFERENCES public.montree_fb_boards(id) ON DELETE CASCADE,
  body         text NOT NULL,
  author_kind  text NOT NULL CHECK (author_kind IN ('user', 'guest')),
  author_id    text,
  author_name  text NOT NULL,
  author_role  text,
  author_key   text NOT NULL,
  is_official  boolean NOT NULL DEFAULT false,  -- renders as a pinned "Montree team" card
  is_answer    boolean NOT NULL DEFAULT false,  -- Question only; author or admin marks it
  quote_of     uuid REFERENCES public.montree_fb_comments(id) ON DELETE SET NULL,
  hidden       boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS montree_fb_comments_post_idx
  ON public.montree_fb_comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS montree_fb_comments_board_idx
  ON public.montree_fb_comments (board_id, created_at DESC);
-- At most one accepted answer per post.
CREATE UNIQUE INDEX IF NOT EXISTS montree_fb_comments_one_answer_idx
  ON public.montree_fb_comments (post_id) WHERE is_answer;

-- ── Votes ───────────────────────────────────────────────────────────────────
-- The composite primary key IS the "one vote per person" rule. No application
-- counting to get wrong, no race to lose.

CREATE TABLE IF NOT EXISTS public.montree_fb_votes (
  post_id    uuid NOT NULL REFERENCES public.montree_fb_posts(id) ON DELETE CASCADE,
  voter_key  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, voter_key)
);

CREATE INDEX IF NOT EXISTS montree_fb_votes_voter_idx
  ON public.montree_fb_votes (voter_key);

-- ── Subscriptions ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.montree_fb_subscriptions (
  post_id         uuid NOT NULL REFERENCES public.montree_fb_posts(id) ON DELETE CASCADE,
  subscriber_key  text NOT NULL,
  -- Delivery address. Written here and read ONLY by the notifier; repo.ts
  -- never selects this column into anything a client can see.
  email           text,
  channel         text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'none')),
  unsubscribed_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, subscriber_key)
);

CREATE INDEX IF NOT EXISTS montree_fb_subscriptions_subscriber_idx
  ON public.montree_fb_subscriptions (subscriber_key);
CREATE INDEX IF NOT EXISTS montree_fb_subscriptions_live_idx
  ON public.montree_fb_subscriptions (post_id) WHERE unsubscribed_at IS NULL;

-- ── Status history (what the Changelog and the post sidebar are made of) ─────

CREATE TABLE IF NOT EXISTS public.montree_fb_status_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES public.montree_fb_posts(id) ON DELETE CASCADE,
  board_id    uuid NOT NULL REFERENCES public.montree_fb_boards(id) ON DELETE CASCADE,
  from_status text,
  to_status   text NOT NULL,
  by_key      text,
  by_name     text,
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS montree_fb_status_history_post_idx
  ON public.montree_fb_status_history (post_id, created_at DESC);
-- The Changelog query: this board's shipped/fixed moments, newest first.
CREATE INDEX IF NOT EXISTS montree_fb_status_history_changelog_idx
  ON public.montree_fb_status_history (board_id, created_at DESC)
  WHERE to_status IN ('shipped', 'fixed');

-- ── Flags — 3 distinct flaggers auto-hide, pending admin review ──────────────

CREATE TABLE IF NOT EXISTS public.montree_fb_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id    uuid NOT NULL REFERENCES public.montree_fb_boards(id) ON DELETE CASCADE,
  target_kind text NOT NULL CHECK (target_kind IN ('post', 'comment')),
  target_id   uuid NOT NULL,
  flagger_key text NOT NULL,
  reason      text NOT NULL CHECK (reason IN ('spam', 'rude', 'private_info', 'other')),
  note        text,
  resolved_at timestamptz,
  resolved_by text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- One flag per person per thing. Without this, one angry visitor hits the
  -- threshold alone.
  UNIQUE (target_kind, target_id, flagger_key)
);

CREATE INDEX IF NOT EXISTS montree_fb_flags_target_idx
  ON public.montree_fb_flags (target_kind, target_id);
CREATE INDEX IF NOT EXISTS montree_fb_flags_open_idx
  ON public.montree_fb_flags (board_id, created_at DESC) WHERE resolved_at IS NULL;

-- ── Tags — the curated, admin-managed layer over the four fixed types ────────

CREATE TABLE IF NOT EXISTS public.montree_fb_tags (
  board_id  uuid NOT NULL REFERENCES public.montree_fb_boards(id) ON DELETE CASCADE,
  slug      text NOT NULL,
  label_en  text NOT NULL,
  label_zh  text NOT NULL,
  color     text,
  sort      integer NOT NULL DEFAULT 100,
  PRIMARY KEY (board_id, slug)
);

-- ── Guest tokens — hash only. The secret itself lives in an httpOnly cookie ──

CREATE TABLE IF NOT EXISTS public.montree_fb_guest_tokens (
  token_hash   text PRIMARY KEY,   -- HMAC-SHA256(FEEDBACK_TOKEN_SECRET, token)
  name         text,
  email        text,
  email_hash   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS montree_fb_guest_tokens_email_hash_idx
  ON public.montree_fb_guest_tokens (email_hash) WHERE email_hash IS NOT NULL;

-- ── Outbox — so a slow mailer never makes a parent wait to post ─────────────

CREATE TABLE IF NOT EXISTS public.montree_fb_outbox (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   uuid REFERENCES public.montree_fb_boards(id) ON DELETE CASCADE,
  post_id    uuid REFERENCES public.montree_fb_posts(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('official_reply', 'status_change', 'answered', 'comment')),
  to_email   text NOT NULL,
  subject    text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts   integer NOT NULL DEFAULT 0,
  sent_at    timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS montree_fb_outbox_pending_idx
  ON public.montree_fb_outbox (created_at) WHERE sent_at IS NULL;

-- ── Helper functions ────────────────────────────────────────────────────────

-- Recompute a post's denormalised counters from the source of truth. Called
-- after every vote, comment and merge. Cheap, and it means a crashed request
-- can never leave a permanently wrong number on the board.
CREATE OR REPLACE FUNCTION public.montree_fb_recount_post(p_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $fn$
  UPDATE public.montree_fb_posts p
     SET vote_count = (SELECT count(*) FROM public.montree_fb_votes v WHERE v.post_id = p.id),
         comment_count = (SELECT count(*) FROM public.montree_fb_comments c
                           WHERE c.post_id = p.id AND NOT c.hidden),
         has_official_reply = EXISTS (SELECT 1 FROM public.montree_fb_comments c
                                       WHERE c.post_id = p.id AND c.is_official AND NOT c.hidden),
         updated_at = now()
   WHERE p.id = p_post_id;
$fn$;

-- Merge a duplicate into a survivor, atomically.
-- Votes and subscribers move across, duplicates dropped by the ON CONFLICT;
-- comments move in time order; the duplicate closes and redirects. Nobody gets
-- a second email because subscriptions collapse on (post_id, subscriber_key).
CREATE OR REPLACE FUNCTION public.montree_fb_merge_posts(
  p_duplicate uuid,
  p_survivor  uuid,
  p_by_key    text,
  p_by_name   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_board_dup uuid;
  v_board_sur uuid;
BEGIN
  IF p_duplicate = p_survivor THEN
    RAISE EXCEPTION 'cannot merge a post into itself';
  END IF;

  SELECT board_id INTO v_board_dup FROM public.montree_fb_posts WHERE id = p_duplicate;
  SELECT board_id INTO v_board_sur FROM public.montree_fb_posts WHERE id = p_survivor;
  IF v_board_dup IS NULL OR v_board_sur IS NULL THEN
    RAISE EXCEPTION 'both posts must exist';
  END IF;
  -- Tenancy, enforced in the database as well as the route.
  IF v_board_dup <> v_board_sur THEN
    RAISE EXCEPTION 'cannot merge posts from different boards';
  END IF;

  INSERT INTO public.montree_fb_votes (post_id, voter_key, created_at)
  SELECT p_survivor, voter_key, created_at FROM public.montree_fb_votes WHERE post_id = p_duplicate
  ON CONFLICT (post_id, voter_key) DO NOTHING;

  INSERT INTO public.montree_fb_subscriptions (post_id, subscriber_key, email, channel, created_at)
  SELECT p_survivor, subscriber_key, email, channel, created_at
    FROM public.montree_fb_subscriptions
   WHERE post_id = p_duplicate AND unsubscribed_at IS NULL
  ON CONFLICT (post_id, subscriber_key) DO NOTHING;

  -- An accepted answer on the duplicate is not an accepted answer here; the
  -- partial unique index would reject the second one anyway.
  UPDATE public.montree_fb_comments
     SET post_id = p_survivor, is_answer = false
   WHERE post_id = p_duplicate;

  DELETE FROM public.montree_fb_votes WHERE post_id = p_duplicate;
  DELETE FROM public.montree_fb_subscriptions WHERE post_id = p_duplicate;

  UPDATE public.montree_fb_posts
     SET merged_into = p_survivor,
         hidden = true,
         hidden_reason = 'merged',
         updated_at = now()
   WHERE id = p_duplicate;

  UPDATE public.montree_fb_posts
     SET last_activity_at = now()
   WHERE id = p_survivor;

  PERFORM public.montree_fb_recount_post(p_survivor);
  PERFORM public.montree_fb_recount_post(p_duplicate);

  INSERT INTO public.montree_fb_status_history (post_id, board_id, from_status, to_status, by_key, by_name, note)
  SELECT p_duplicate, v_board_dup, status, status, p_by_key, p_by_name, 'merged into ' || p_survivor::text
    FROM public.montree_fb_posts WHERE id = p_duplicate;
END;
$fn$;

-- ── RLS: deny-all to anon. Service role (the app) is unaffected. ────────────

ALTER TABLE public.montree_fb_boards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_fb_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_fb_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_fb_votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_fb_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_fb_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_fb_flags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_fb_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_fb_guest_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.montree_fb_outbox         ENABLE ROW LEVEL SECURITY;

-- ── Seed: the public product board and its starter tags ─────────────────────

INSERT INTO public.montree_fb_boards (ref, scope, school_id, name, locale_default)
VALUES ('public', 'public', NULL, 'Montree product board', 'en')
ON CONFLICT (ref) DO NOTHING;

INSERT INTO public.montree_fb_tags (board_id, slug, label_en, label_zh, color, sort)
SELECT b.id, t.slug, t.label_en, t.label_zh, t.color, t.sort
  FROM public.montree_fb_boards b
  CROSS JOIN (VALUES
    ('photos',      'Photos & albums',   '照片与相册',   '#3f6b00', 10),
    ('observations','Observation notes', '观察记录',     '#5c3494', 20),
    ('attendance',  'Attendance',        '考勤',         '#1c5385', 30),
    ('reports',     'Reports & summaries','报告与小结',  '#7a5000', 40),
    ('billing',     'Fees & billing',    '费用与账单',   '#8a3232', 50),
    ('mobile',      'Phone & WeChat',    '手机与微信',   '#5b564c', 60),
    ('chinese',     'Chinese / 中文',    '中文',         '#3f6b00', 70)
  ) AS t(slug, label_en, label_zh, color, sort)
 WHERE b.ref = 'public'
ON CONFLICT (board_id, slug) DO NOTHING;

INSERT INTO montree_migrations (filename) VALUES ('359_feedback_board.sql')
ON CONFLICT (filename) DO NOTHING;

COMMIT;

-- Verify:
--   SELECT ref, scope, name FROM montree_fb_boards;
--   SELECT slug, label_en FROM montree_fb_tags ORDER BY sort;
--   SELECT count(*) FROM pg_indexes WHERE indexname LIKE 'montree_fb_%';  -- expect 20+
