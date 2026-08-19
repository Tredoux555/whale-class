-- ============================================================================
-- 334_dark_phonics_live.sql
-- Dark Phonics Live — feature flag + class credits ledger + class recaps
--                      + live class state (teacher→parent scene sync)
--
-- NUMBERING: confirmed against the live migrations/ directory (334 is the
-- next free number as of 2026-08-19; the highest existing numbered file was
-- 333_pss_photo_attribution.sql). Re-check `ls migrations/` before applying
-- if time has passed and other migrations have landed since.
--
-- IDEMPOTENCY: every statement in this file is safe to re-run.
--   * CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS
--   * seed INSERT ... ON CONFLICT DO NOTHING
--   * CREATE OR REPLACE FUNCTION
-- Re-running this migration on a database that already has it must be a no-op.
--
-- ---------------------------------------------------------------------------
-- BALANCE MODEL (read this before adding a `credits_remaining` column anywhere)
-- ---------------------------------------------------------------------------
-- `montree_class_credits_ledger` is APPEND-ONLY. There is no stored balance.
-- A balance is always derived:
--
--     SELECT COALESCE(SUM(delta), 0) FROM montree_class_credits_ledger
--      WHERE child_id = $1;
--
-- Why derived and not denormalised:
--   * A stored counter and an event log inevitably drift (a failed booking that
--     wrote the counter but not the row, a manual SQL fix, a double-fired
--     webhook). With SUM(delta) the log IS the balance — it cannot disagree
--     with itself.
--   * Every mutation is explainable: who granted, when, against which package,
--     which appointment burned it. Support questions ("she says she paid for
--     10 classes and only has 7") are answerable by reading rows.
--   * Volume is tiny. A solo teacher running 25-minute 1-on-1 classes generates
--     on the order of hundreds of rows per year per child; SUM over an indexed
--     child_id is free. Revisit only if this ever becomes a multi-school
--     product with six-figure row counts (then: promote the read-only
--     `montree_class_credit_balances` view in section 4 to a materialised view
--     refreshed from the ledger — never written to directly).
--
-- CHILD as the unit of account (not parent):
--   Credits are consumed by a *child* sitting in a *25-minute 1-on-1 class*.
--   A parent with two children who buys a 10-class package expects to decide
--   how those 10 are split, and the teacher needs to know how many classes are
--   left for the specific child being booked. Balances are therefore keyed on
--   child_id. parent_id is carried on every row anyway, denormalised on
--   purpose, so that:
--     * parent-facing screens can show "your family's history" without a join,
--     * grants can be attributed to the paying adult,
--     * a child row that is later re-parented keeps its historical truth.
--   Consequence: a grant MUST name a child. If a parent buys a package before
--   deciding which child it is for, hold that state in
--   `montree_class_packages` purchase UX / a pending row — do NOT invent a
--   child_id-null "family pool" ledger row, because then SUM(delta) by child
--   stops being the balance and the drift problem is back.
--
-- ZERO-DELTA ROWS ARE INTENTIONAL:
--   'class_no_show' and 'class_cancelled_late' rows are written with delta = 0.
--   They move no money — the credit was already burned by the 'class_booked'
--   row at booking time — but they keep the ledger a complete event log of
--   everything that ever happened to a booking. Any `SUM(delta)` is unaffected;
--   any audit read gets the full story. Filter with `WHERE delta <> 0` when
--   you only want value-moving entries.
-- ============================================================================

BEGIN;

-- gen_random_uuid() is built into PostgreSQL 13+ (and always available on
-- Supabase). Kept as a guarded no-op for older/self-hosted targets.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ---------------------------------------------------------------------------
-- 1. Feature flag definition: dark_phonics_live (default OFF)
-- ---------------------------------------------------------------------------
-- Two-table flag model: definitions here, per-school opt-in lives in
-- `montree_school_features` and is read through isFeatureEnabled()
-- (lib/montree/features/server.ts). Nothing is enabled by this migration.
--
-- Column list confirmed against migrations/327_work_rhythm_feature.sql (the
-- most recent flag-insert migration): (feature_key, name, description, icon,
-- category, is_premium, default_enabled). Mirrors it exactly.
INSERT INTO montree_feature_definitions
  (feature_key, name, description, icon, category, is_premium, default_enabled)
VALUES (
  'dark_phonics_live',
  'Dark Phonics Live',
  'The 1-on-1 online phonics classroom: Agora video + interactive whiteboard loaded with Dark Phonics courseware, credits-based booking, and an auto-sent parent recap after every class.',
  '🎥',
  'classroom',
  false,
  false
)
ON CONFLICT (feature_key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. montree_class_packages — catalog of purchasable class bundles
-- ---------------------------------------------------------------------------
-- Catalog only. Nothing here charges anyone: the parent pays by WeChat/Alipay
-- QR outside the platform and the teacher grants credits manually. A package
-- row exists so a grant can record *what was sold* (see ledger.package_id).
CREATE TABLE IF NOT EXISTS montree_class_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable on purpose: this launches as a solo-teacher product with no
  -- school scoping, but the column keeps the table multi-tenant-shaped like
  -- the rest of the montree schema so a school_id can be backfilled later
  -- without a table rewrite. NULL == "global catalog entry".
  school_id   uuid,
  name        text        NOT NULL,
  credits     integer     NOT NULL CHECK (credits > 0),
  price_rmb   numeric(10,2) NOT NULL CHECK (price_rmb >= 0),
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE montree_class_packages IS
  'Catalog of class-credit bundles. Display + attribution only; payment happens off-platform (WeChat/Alipay QR) and credits are granted manually.';
COMMENT ON COLUMN montree_class_packages.school_id IS
  'Nullable. Solo-teacher launch has no school scoping; column exists to keep the table multi-tenant-shaped. NULL = global catalog entry.';

CREATE INDEX IF NOT EXISTS idx_montree_class_packages_active
  ON montree_class_packages (active)
  WHERE active;


-- ---------------------------------------------------------------------------
-- 3. montree_class_credits_ledger — append-only credit events
-- ---------------------------------------------------------------------------
-- APPEND-ONLY. Never UPDATE or DELETE a row here. A mistake is corrected by
-- writing a compensating row (e.g. a 'refund' +1, or a 'manual_grant' -N with
-- a note), never by editing history.
CREATE TABLE IF NOT EXISTS montree_class_credits_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK targets confirmed by reading migrations/216_appointments.sql directly:
  -- `montree_appointments.parent_id references montree_parents(id)` and
  -- `.child_id references montree_children(id)`. Declared inline (not as a
  -- guarded ALTER — see the removed section 5) since both tables are
  -- confirmed to exist.
  parent_id       uuid NOT NULL REFERENCES montree_parents (id) ON DELETE RESTRICT,
  child_id        uuid NOT NULL REFERENCES montree_children (id) ON DELETE RESTRICT,

  -- Positive = credits granted to the child. Negative = credits spent.
  -- Zero = informational/audit-only event that moves no value.
  delta           integer NOT NULL,

  reason          text NOT NULL CHECK (reason IN (
                    'manual_grant',         -- delta > 0, teacher grants after off-platform payment
                    'class_booked',          -- delta < 0, normally -1
                    'class_no_show',         -- delta = 0, audit row; credit already burned at booking
                    'class_cancelled_late',  -- delta = 0, audit row; cancellation inside the 24h window
                    'refund'                 -- delta > 0, reverses a burn (on-time cancellation)
                  )),

  -- Nullable: grants are not tied to an appointment.
  --
  -- WRITE-ORDER REQUIREMENT (booking route, read this):
  --   This FK means a ledger row naming an appointment can only be written
  --   once that appointment row exists. The constraint is DEFERRABLE INITIALLY
  --   DEFERRED so that a booking which inserts the appointment and burns the
  --   credit *inside one transaction* may do so in either order — that is the
  --   shape the build contract asks for ("appointment + a -1 ledger row in one
  --   transaction") and what spend_credit_for_booking() in section 6 is for.
  --   Deferral does NOT help two separate Supabase client round trips: each is
  --   its own transaction and is checked at its own commit. So a route using
  --   the plain client MUST insert the appointment first, then spend the
  --   credit — spending against a pre-generated id that does not yet exist
  --   fails with SQLSTATE 23503.
  appointment_id  uuid REFERENCES montree_appointments (id) ON DELETE SET NULL
                    DEFERRABLE INITIALLY DEFERRED,
  -- Nullable: which catalog bundle this grant came from, when known.
  package_id      uuid REFERENCES montree_class_packages (id) ON DELETE SET NULL,

  -- Actor who caused the row. Teacher/staff user id for manual grants and
  -- admin actions; may be the parent's id for parent-initiated bookings.
  -- Intentionally unconstrained: the two actor types live in different tables.
  created_by      uuid,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Sign discipline: keeps a typo'd `delta` from silently corrupting balances.
  CONSTRAINT montree_class_credits_ledger_delta_sign CHECK (
    (reason = 'manual_grant'         AND delta <> 0)
    OR (reason = 'class_booked'          AND delta < 0)
    OR (reason = 'refund'                AND delta > 0)
    OR (reason IN ('class_no_show', 'class_cancelled_late') AND delta = 0)
  )
);

COMMENT ON TABLE montree_class_credits_ledger IS
  'Append-only class-credit event log. Balance = COALESCE(SUM(delta),0) GROUP BY child_id. Never UPDATE/DELETE; correct with a compensating row.';
COMMENT ON COLUMN montree_class_credits_ledger.delta IS
  'Positive = granted, negative = spent, zero = informational audit event (no-show, late cancel).';
COMMENT ON COLUMN montree_class_credits_ledger.parent_id IS
  'Denormalised paying adult. FK to montree_parents(id), same table montree_appointments.parent_id references.';
COMMENT ON COLUMN montree_class_credits_ledger.child_id IS
  'Unit of account: balances are per child. FK to montree_children(id), same table montree_appointments.child_id references.';

-- Indexes: the three read paths are "balance/history for a child",
-- "history for a family", and "what happened to this booking".
CREATE INDEX IF NOT EXISTS idx_montree_class_credits_ledger_child
  ON montree_class_credits_ledger (child_id);

CREATE INDEX IF NOT EXISTS idx_montree_class_credits_ledger_parent
  ON montree_class_credits_ledger (parent_id);

CREATE INDEX IF NOT EXISTS idx_montree_class_credits_ledger_appointment
  ON montree_class_credits_ledger (appointment_id);

-- Chronological history reads (`WHERE child_id = $1 ORDER BY created_at DESC`).
CREATE INDEX IF NOT EXISTS idx_montree_class_credits_ledger_child_created_at
  ON montree_class_credits_ledger (child_id, created_at DESC);

-- Guard against a double-fired booking burning two credits for one
-- appointment. Partial unique index: at most one 'class_booked' row per
-- appointment. Refunds/no-shows/late-cancels are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_montree_class_credits_ledger_booking
  ON montree_class_credits_ledger (appointment_id)
  WHERE reason = 'class_booked' AND appointment_id IS NOT NULL;

-- Same idea for refunds: an appointment can only be refunded once.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_montree_class_credits_ledger_refund
  ON montree_class_credits_ledger (appointment_id)
  WHERE reason = 'refund' AND appointment_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 4. Convenience view: current balance per child
-- ---------------------------------------------------------------------------
-- Derived, never stored. Safe to re-run.
CREATE OR REPLACE VIEW montree_class_credit_balances AS
SELECT
  child_id,
  MIN(parent_id)                                    AS any_parent_id,
  COALESCE(SUM(delta), 0)::integer                  AS balance,
  COUNT(*) FILTER (WHERE reason = 'class_booked')    AS classes_booked,
  COUNT(*) FILTER (WHERE reason = 'class_no_show')   AS no_shows,
  MAX(created_at)                                   AS last_event_at
FROM montree_class_credits_ledger
GROUP BY child_id;

COMMENT ON VIEW montree_class_credit_balances IS
  'Derived balance per child. Read-only; the ledger is the source of truth.';


-- ---------------------------------------------------------------------------
-- 5. FK constraints for parent_id / child_id
-- ---------------------------------------------------------------------------
-- Declared inline on the table in section 3 above (ON DELETE RESTRICT — a
-- parent/child delete must not silently erase financial history). This
-- section is a placeholder marker only, kept so the section numbering below
-- stays stable relative to earlier drafts of this file.


-- ---------------------------------------------------------------------------
-- 5b. montree_class_recaps — parent-facing post-class recap
-- ---------------------------------------------------------------------------
-- Written once per appointment by the teacher's "End Class" action
-- (app/api/montree/appointments/[id]/recap/route.ts POST), read by the
-- parent recap page (app/montree/parent/recap/[appointmentId]/page.tsx GET).
-- One row per appointment — the unique index below is load-bearing: the
-- recap route upserts on appointment_id so a re-submitted "End Class" click
-- corrects the recap instead of duplicating it.
CREATE TABLE IF NOT EXISTS montree_class_recaps (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES montree_appointments (id) ON DELETE CASCADE,
  lesson_number  integer NOT NULL CHECK (lesson_number BETWEEN 1 AND 49),
  words_drilled  text[] NOT NULL DEFAULT '{}',
  stars_earned   integer NOT NULL DEFAULT 0 CHECK (stars_earned >= 0),
  teacher_note   text,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE montree_class_recaps IS
  'One recap per Dark Phonics Live appointment. Feeds the parent-facing shareable recap card sent within minutes of class end.';

CREATE UNIQUE INDEX IF NOT EXISTS montree_class_recaps_appointment_key
  ON montree_class_recaps (appointment_id);


-- ---------------------------------------------------------------------------
-- 5c. montree_appointments.whiteboard_room_uuid
-- ---------------------------------------------------------------------------
-- Additive, nullable column. Written once per appointment by
-- lib/montree/agora/whiteboard.ts (getOrCreateWhiteboardRoom) the first time
-- either party joins — so the same Agora Whiteboard room is reused on
-- reconnect instead of minting a new one per join.
ALTER TABLE montree_appointments
  ADD COLUMN IF NOT EXISTS whiteboard_room_uuid text;


-- ---------------------------------------------------------------------------
-- 5d. montree_class_live_state — teacher→parent live class sync (Phase 2)
-- ---------------------------------------------------------------------------
-- EXACTLY ONE ROW PER APPOINTMENT (appointment_id IS the primary key — no
-- surrogate id). This is the whole synchronisation mechanism for a live class:
-- the teacher PATCHes this row on every interaction
-- (app/api/montree/appointments/[id]/live-state/route.ts) and the parent's
-- classroom polls GET on the same route every ~2s. No websockets, no realtime
-- subscription, no new dependency — a single narrow row read on an indexed
-- primary key. Deliberately boring: it works from China, survives reconnects,
-- and is trivially upgradeable to Supabase Realtime later without a schema
-- change (this table is already the exact payload a realtime channel would
-- carry).
--
-- MISSING ROW == DEFAULT STATE. The route does NOT 404 when no row exists yet
-- (a class that hasn't started has no row); it synthesises the column defaults
-- below. Keep those defaults and the route's DEFAULT_STATE constant in sync.
--
-- active_word_index defaults to -1 meaning "no word highlighted" — 0 is a
-- valid word index, so -1 (not NULL) is the empty sentinel, which keeps the
-- column NOT NULL and the client-side type a plain number.
--
-- No updated_at trigger: the route always sets updated_at explicitly on
-- upsert, and the parent poll uses it purely as a staleness display hint.
CREATE TABLE IF NOT EXISTS montree_class_live_state (
  appointment_id      uuid PRIMARY KEY REFERENCES montree_appointments (id) ON DELETE CASCADE,
  active_scene_index  integer     NOT NULL DEFAULT 0,
  active_word_index   integer     NOT NULL DEFAULT -1,
  tracing_step_active boolean     NOT NULL DEFAULT false,
  tracing_completed   integer     NOT NULL DEFAULT 0,
  stars_earned        integer     NOT NULL DEFAULT 0,
  class_phase         text        NOT NULL DEFAULT 'live'
                        CHECK (class_phase IN ('live', 'ended')),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE montree_class_live_state IS
  'One row per Dark Phonics Live appointment holding the live classroom sync state (teacher PATCHes, parent polls every ~2s). A missing row means "not started" and is served as the column defaults, never a 404.';
COMMENT ON COLUMN montree_class_live_state.active_word_index IS
  'Index of the highlighted word in the active scene; -1 = none (0 is a valid index, so -1 is the sentinel rather than NULL).';
COMMENT ON COLUMN montree_class_live_state.class_phase IS
  '''live'' while the class is running, ''ended'' once the teacher hits End Class — the parent client stops polling and switches to the recap.';


-- ---------------------------------------------------------------------------
-- 6. spend_credit_for_booking() — atomic check-and-burn
-- ---------------------------------------------------------------------------
-- The TypeScript client (lib/montree/credits/ledger.ts) currently does
-- "read balance, then insert" in two round trips, which is racy: two
-- simultaneous booking requests for a child with 1 credit can both read 1 and
-- both insert -1, driving the balance to -1.
--
-- This function closes that race by doing the check and the insert in one
-- statement-level transaction, taking a transaction-scoped advisory lock keyed
-- on the child so concurrent callers serialise. Call it via
-- `supabase.rpc('spend_credit_for_booking', { ... })`.
--
-- Returns TRUE if a credit was burned, FALSE if the balance was insufficient.
-- Never raises on insufficient credits — the caller renders a "buy more
-- classes" state, which is a normal outcome, not an error.
CREATE OR REPLACE FUNCTION spend_credit_for_booking(
  p_child_id       uuid,
  p_parent_id      uuid,
  p_appointment_id uuid,
  p_created_by     uuid DEFAULT NULL,
  p_note           text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance integer;
BEGIN
  -- Serialise concurrent spends for this child for the life of the
  -- transaction. hashtextextended keeps the uuid inside bigint range.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_child_id::text, 0));

  SELECT COALESCE(SUM(delta), 0)
    INTO v_balance
    FROM montree_class_credits_ledger
   WHERE child_id = p_child_id;

  IF v_balance <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO montree_class_credits_ledger
    (parent_id, child_id, delta, reason, appointment_id, created_by, note)
  VALUES
    (p_parent_id, p_child_id, -1, 'class_booked', p_appointment_id, p_created_by, p_note)
  -- Belt and braces with uniq_montree_class_credits_ledger_booking: a retried
  -- request for an already-booked appointment is a no-op, not a second burn.
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION spend_credit_for_booking(uuid, uuid, uuid, uuid, text) IS
  'Atomically checks a child''s credit balance and burns one credit for a booking. Returns false (no row written) when the balance is <= 0.';

-- ---------------------------------------------------------------------------
-- 7. RLS lockdown — same convention as 2026-06-06 / 2026-06-10 phases 1-3
-- ---------------------------------------------------------------------------
-- This repo has run three dedicated migrations closing exactly this gap on
-- every pre-existing table: RLS off means anyone holding the public anon key
-- can read/write a table straight through Supabase's REST API. The app only
-- ever touches these tables server-side via the service-role key (BYPASSRLS),
-- so enabling RLS with zero policies costs the app nothing and default-denies
-- anon + authenticated — the exact pattern those migrations established.
-- No DROP POLICY loop needed (these are new tables, no policies exist yet).
--
-- spend_credit_for_booking() does not need SECURITY DEFINER for this: it's
-- only ever called via the service-role client (supabase.rpc(...) from
-- getSupabase()), which already has BYPASSRLS, so RLS being enabled has no
-- effect on the function's own INSERT/SELECT statements.
ALTER TABLE montree_class_credits_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_class_packages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_class_recaps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE montree_class_live_state     ENABLE ROW LEVEL SECURITY;

COMMIT;
