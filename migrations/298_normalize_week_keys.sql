-- Migration 298: normalize historical Sunday week keys (timezone bug fix)
-- =========================================================================
-- Companion to the Phase 2 (Build B) fix in lib/montree/week-key.ts (client) and
-- the reports/{send,photos,preview} routes (server).
--
-- THE BUG (two sources, both fixed as of this commit):
--   1. CLIENT timezone bug — the report surfaces (WeeklyWrapTab et al.) built a
--      LOCAL Monday-midnight Date and serialized it via .toISOString() (UTC).
--      For any device east of UTC (China = the target market) local Monday 00:00
--      is still SUNDAY in UTC, so the key landed on the SUNDAY date, one day
--      early. Fixed: currentWeekStart() now builds the key from local date parts.
--   2. LEGACY SERVER convention — three routes (app/api/montree/reports/send,
--      .../photos, .../preview) computed the week with an old US-week SUNDAY
--      anchor (`getDate() - getDay()`), deliberately writing/looking-up
--      montree_weekly_reports.week_start on the Sunday. Fixed: all three now use
--      the school-local MONDAY authority (currentWeekStartInTz in school-time.ts).
--
-- Those keys were persisted directly as montree_weekly_reports.week_start /
-- .week_end. A week ALWAYS starts Monday by definition, and with BOTH sources
-- above now emitting Monday keys, no live writer can produce a Sunday week_start
-- (DOW=0) anymore — so every remaining Sunday row is HISTORICAL and safe to
-- re-key forward one day; likewise a Saturday week_end (DOW=6) is the paired
-- one-day-early end. This makes the migration idempotent from this commit on.
--
-- THE FIX: shift each corrupted historical row forward one day so the pair
-- becomes the intended Monday..Sunday. Keyed on week_start being a Sunday, and
-- both columns updated in ONE statement so the pair can never desync.
--
-- SAFETY:
--   * Idempotent — after this runs, no Sunday week_start rows remain, so a
--     re-run matches nothing.
--   * NEVER deletes data. Where a UNIQUE key includes week_start, the UPDATE is
--     guarded with NOT EXISTS so a corrupted row whose corrected key already
--     exists is LEFT IN PLACE (the newer/correct row wins). See -- skipped-duplicates.
--   * Defensive casts (::date) so it works whether the column is DATE or TEXT.
--   * to_regclass guards so a missing table is skipped, never an error.
--
-- Postgres DOW: 0=Sunday .. 6=Saturday.
-- =========================================================================

BEGIN;

-- -------------------------------------------------------------------------
-- 1. montree_weekly_reports  (THE corrupted table)
--    week_start DATE, week_end DATE, UNIQUE(child_id, week_start, report_type).
--    Written directly from the buggy client key (reports/weekly-wrap,
--    reports/batch-narratives, reports/send, reports/photos, reports/batch).
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.montree_weekly_reports') IS NOT NULL THEN
    -- skipped-duplicates: a Sunday row whose corrected Monday key already
    -- exists for the same (child_id, report_type) is left untouched so the
    -- pre-existing correct row survives and the UNIQUE constraint holds.
    UPDATE montree_weekly_reports AS t
       SET week_start = (t.week_start::date + 1),
           week_end   = (t.week_end::date + 1)
     WHERE EXTRACT(DOW FROM t.week_start::date) = 0
       AND NOT EXISTS (
         SELECT 1 FROM montree_weekly_reports t2
          WHERE t2.child_id    = t.child_id
            AND t2.report_type = t.report_type
            AND t2.week_start::date = t.week_start::date + 1
       );
  END IF;
END $$;

-- -------------------------------------------------------------------------
-- 2. Defensive normalization for the other tables that accept a client-supplied
--    week_start. Their historical writers (server getWeekStart() in UTC, and the
--    old +8h Beijing admin clients) always emitted MONDAY keys, so these are
--    expected to match ZERO rows. Included per the "normalize every week-keyed
--    table" contract, fully guarded so they are safe no-ops.
-- -------------------------------------------------------------------------

-- 2a. montree_weekly_admin_notes — week_start DATE.
--     doc_type IN ('summary','plan','monthly'). A CHECK constraint already
--     forces Monday for summary/plan rows, and 'monthly' rows legitimately use
--     the 1st-of-month (which CAN be a Sunday) — those MUST NOT be touched.
--     UNIQUE idx: (child_id, week_start, doc_type, COALESCE(area,'__summary__')).
DO $$
BEGIN
  IF to_regclass('public.montree_weekly_admin_notes') IS NOT NULL THEN
    -- skipped-duplicates guard on the composite unique index.
    UPDATE montree_weekly_admin_notes AS t
       SET week_start = (t.week_start::date + 1)
     WHERE EXTRACT(DOW FROM t.week_start::date) = 0
       AND t.doc_type <> 'monthly'                       -- never move a monthly anchor
       AND NOT EXISTS (
         SELECT 1 FROM montree_weekly_admin_notes t2
          WHERE t2.child_id  = t.child_id
            AND t2.doc_type  = t.doc_type
            AND COALESCE(t2.area, '__summary__') = COALESCE(t.area, '__summary__')
            AND t2.week_start::date = t.week_start::date + 1
       );
  END IF;
END $$;

-- 2b. montree_weekly_admin_output — week_start DATE, week_end DATE.
--     Index (classroom_id, week_start) is non-unique → no collision guard needed.
DO $$
BEGIN
  IF to_regclass('public.montree_weekly_admin_output') IS NOT NULL THEN
    UPDATE montree_weekly_admin_output AS t
       SET week_start = (t.week_start::date + 1),
           week_end   = (t.week_end::date + 1)
     WHERE EXTRACT(DOW FROM t.week_start::date) = 0;
  END IF;
END $$;

-- 2c. montree_voice_notes — voice_week_start DATE (no week_end, no unique on it).
DO $$
BEGIN
  IF to_regclass('public.montree_voice_notes') IS NOT NULL THEN
    UPDATE montree_voice_notes AS t
       SET voice_week_start = (t.voice_week_start::date + 1)
     WHERE EXTRACT(DOW FROM t.voice_week_start::date) = 0;
  END IF;
END $$;

COMMIT;

-- =========================================================================
-- EXCLUDED (examined, deliberately NOT touched):
--   * montree_home_practice_cards  — week_start written by weekStartMonday()
--       (server, pure-UTC getUTCDay math) → always Monday, never a client key.
--   * montree_weekly_pulse_locks   — ephemeral concurrency lock, server-keyed;
--       stale rows are superseded, not report data.
--   * montree_weekly_admin_notes(doc_type='monthly') — 1st-of-month anchor may
--       legitimately be a Sunday; excluded by the doc_type guard above.
--   * english_weekly_log (migration 038) — legacy schema, NO active writers.
--   * mission_weekly_calibrations / story_* week_start_date — Story/Mission
--       system, unrelated to the Montree client bug.
--   * montree_attendance week_start — a DATE_TRUNC('week', date) view expression
--       (Postgres-computed, Monday-based), not a stored client key.
--   * montree_children.paperwork_current_week — an INTEGER week NUMBER (1-37),
--       not a date key.
-- =========================================================================
