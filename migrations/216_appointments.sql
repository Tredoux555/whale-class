-- migrations/216_appointments.sql
--
-- Phase 2 of the School Ecosystem Plan — parent ↔ staff appointment booking.
--
-- DESIGN OVERVIEW:
--   - Two "rule" tables describe WHEN a staff member is available:
--       montree_availability_rules     — recurring weekly windows.
--       montree_availability_blackouts — one-off unavailable ranges.
--     Open slots are computed on-the-fly by the slot-computer helper —
--     never materialised. This keeps the rule surface clean (no
--     "regenerate slots" cron job) and means rule changes take effect
--     immediately.
--
--   - montree_appointments holds the actual bookings.
--   - montree_appointment_hosts is the junction for multi-host kinds
--     (collective + round_robin). Single-host appointments still get
--     ONE row in the junction with is_primary=true — uniform query path.
--
-- EVENT KINDS (montree_appointments.event_kind):
--   single_host    — 1 staff + 1 parent. The default.
--   collective     — N staff + 1 parent. ALL staff must be free at the
--                    same time. Used for "parent + principal + teacher"
--                    consults.
--   round_robin    — Parent picks "any classroom teacher"; the booking
--                    system picks the actual host at book-time based on
--                    who has capacity. Junction row carries the chosen
--                    host marked is_primary=true.
--
-- THREAD WIRING:
--   When a booking confirms, a fresh parent_teacher or parent_principal
--   thread is created (mirror of the Session 115 shareMeetingNoteToThread
--   helper). The thread_id is stamped on the appointment so reminders +
--   reschedules can post into the same conversation.
--
-- TIMEZONE POSTURE:
--   All scheduled_start / scheduled_end / blackout times are TIMESTAMPTZ
--   (UTC under the hood). Rule windows store local time (start_time TIME)
--   alongside a `timezone` IANA name on the rule row. The slot computer
--   converts on read. Schools in different timezones won't drift.
--
-- AUDIO / PRIVACY NOTES: none — no audio, no AI calls in this phase.
--
-- Idempotent — every clause uses IF NOT EXISTS / DROP-and-recreate. Safe
-- to re-run.

BEGIN;

-- ── 1. Recurring weekly availability windows ─────────────────────────
CREATE TABLE IF NOT EXISTS montree_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Staff identity. role + id pair because teachers live in
  -- montree_teachers and principals in montree_school_admins.
  staff_role TEXT NOT NULL CHECK (staff_role IN ('teacher', 'principal')),
  staff_id UUID NOT NULL,

  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  -- 0 = Sunday … 6 = Saturday (matches JavaScript Date.getDay()).
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),

  -- Local clock time. The combination of (day_of_week, start_time,
  -- end_time, timezone) defines the recurring window.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL CHECK (end_time > start_time),

  slot_duration_minutes SMALLINT NOT NULL DEFAULT 30
    CHECK (slot_duration_minutes BETWEEN 5 AND 240),

  -- Gap between slots so meetings don't run back-to-back. Counted AFTER
  -- the slot ends — a 30-min slot with 5-min buffer means the next slot
  -- starts 35 min later.
  buffer_minutes SMALLINT NOT NULL DEFAULT 5
    CHECK (buffer_minutes BETWEEN 0 AND 60),

  -- IANA timezone for converting the local TIME into a real instant.
  -- Defaults to UTC; staff can change it via the editor UI.
  timezone TEXT NOT NULL DEFAULT 'UTC',

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_rules_staff
  ON montree_availability_rules(staff_role, staff_id, day_of_week)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_availability_rules_school
  ON montree_availability_rules(school_id);

-- ── 2. Ad-hoc unavailability (vacation, sick day, etc.) ──────────────
CREATE TABLE IF NOT EXISTS montree_availability_blackouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  staff_role TEXT NOT NULL CHECK (staff_role IN ('teacher', 'principal')),
  staff_id UUID NOT NULL,

  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,

  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL CHECK (end_at > start_at),

  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_blackouts_staff_range
  ON montree_availability_blackouts(staff_role, staff_id, start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_availability_blackouts_school
  ON montree_availability_blackouts(school_id);

-- ── 3. The bookings themselves ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS montree_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cross-pollination scope.
  school_id UUID NOT NULL REFERENCES montree_schools(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES montree_classrooms(id) ON DELETE SET NULL,
  child_id UUID REFERENCES montree_children(id) ON DELETE SET NULL,

  -- Booking party.
  parent_id UUID NOT NULL REFERENCES montree_parents(id) ON DELETE CASCADE,

  event_kind TEXT NOT NULL DEFAULT 'single_host'
    CHECK (event_kind IN ('single_host', 'collective', 'round_robin')),

  -- The actual meeting time. TIMESTAMPTZ to survive timezone changes.
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL CHECK (scheduled_end > scheduled_start),
  duration_minutes SMALLINT NOT NULL CHECK (duration_minutes BETWEEN 5 AND 240),

  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),

  -- Cancellation audit fields. Populated only when status='cancelled'.
  cancelled_reason TEXT,
  cancelled_by_role TEXT
    CHECK (cancelled_by_role IS NULL OR cancelled_by_role IN ('parent', 'teacher', 'principal')),
  cancelled_by_id UUID,
  cancelled_at TIMESTAMPTZ,

  -- Intake (what the parent wrote when booking).
  intake_subject TEXT,
  intake_body TEXT,

  -- Where: free text. "Classroom 2", "Video call", "https://meet.google.com/..."
  location TEXT,

  -- Thread the booking confirmation + reminders post into. Set after
  -- successful booking via the shareAppointmentToThread helper.
  thread_id UUID REFERENCES montree_message_threads(id) ON DELETE SET NULL,
  shared_to_thread_at TIMESTAMPTZ,

  -- Tokenised iCal URL. Rotates on parent logout (handled by the route).
  ical_token TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Sanity: cancelled implies cancelled_at.
  CONSTRAINT appointment_cancel_consistency CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR
    (status <> 'cancelled' AND cancelled_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_appointments_parent_start
  ON montree_appointments(parent_id, scheduled_start DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_school_start
  ON montree_appointments(school_id, scheduled_start DESC);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON montree_appointments(status, scheduled_start)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_appointments_ical_token
  ON montree_appointments(ical_token)
  WHERE ical_token IS NOT NULL;

-- ── 4. Host junction ─────────────────────────────────────────────────
-- Every appointment has 1+ rows here. is_primary=true marks the
-- "headliner" host the parent considers the meeting to be with. For
-- collective events, every host has is_required=true. For round_robin,
-- only the chosen host has is_required=true (others stay in the table
-- with is_required=false for posterity but aren't expected to attend).
CREATE TABLE IF NOT EXISTS montree_appointment_hosts (
  appointment_id UUID NOT NULL REFERENCES montree_appointments(id) ON DELETE CASCADE,
  host_role TEXT NOT NULL CHECK (host_role IN ('teacher', 'principal')),
  host_id UUID NOT NULL,

  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,

  response TEXT
    CHECK (response IS NULL OR response IN ('accepted', 'declined', 'tentative')),
  response_at TIMESTAMPTZ,

  PRIMARY KEY (appointment_id, host_role, host_id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_hosts_lookup
  ON montree_appointment_hosts(host_role, host_id);

-- Useful for "every appointment for staff X in the next 30 days" queries
-- via JOIN — Postgres can hash-join efficiently with this index.

-- ── 5. updated_at triggers ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_appointment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON montree_appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON montree_appointments
  FOR EACH ROW EXECUTE FUNCTION update_appointment_updated_at();

DROP TRIGGER IF EXISTS trg_availability_rules_updated_at ON montree_availability_rules;
CREATE TRIGGER trg_availability_rules_updated_at
  BEFORE UPDATE ON montree_availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_appointment_updated_at();

-- ── 6. Feature flag definition ───────────────────────────────────────
-- Default OFF — schools opt in. Aligns with the school ecosystem plan's
-- per-surface gating posture (no surface appears to exist for schools
-- that haven't been given the flag).
INSERT INTO montree_feature_definitions (feature_key, name, description, default_enabled, category)
VALUES (
  'appointments',
  'Appointment booking',
  'Parents can book meetings with teachers and the principal. Includes recurring availability windows, blackouts, multi-host scheduling, and iCal sync.',
  FALSE,
  'communication'
)
ON CONFLICT (feature_key) DO NOTHING;

COMMIT;

-- ── Verification queries (run manually after deploy) ─────────────────
-- 1. Tables exist:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public'
--      AND table_name IN ('montree_availability_rules','montree_availability_blackouts','montree_appointments','montree_appointment_hosts');
--    -- Expect 4 rows.
--
-- 2. Feature flag registered:
--    SELECT feature_key, default_enabled FROM montree_feature_definitions
--    WHERE feature_key = 'appointments';
--
-- 3. To enable for a school:
--    INSERT INTO montree_school_features (school_id, feature_key, enabled)
--    VALUES ('<school_uuid>', 'appointments', true)
--    ON CONFLICT (school_id, feature_key) DO UPDATE SET enabled = true;
