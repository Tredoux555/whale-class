// lib/montree/appointments/types.ts
//
// Shared types for the appointment system (Session 115+, Phase 2 of the
// school ecosystem plan). Mirror the schema from migration 216.

export type StaffRole = 'teacher' | 'principal';

export type EventKind = 'single_host' | 'collective' | 'round_robin';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type CancelByRole = 'parent' | 'teacher' | 'principal';

export type HostResponse = 'accepted' | 'declined' | 'tentative';

export interface AvailabilityRule {
  id: string;
  staff_role: StaffRole;
  staff_id: string;
  school_id: string;
  day_of_week: number; // 0=Sunday … 6=Saturday
  start_time: string; // "HH:MM:SS" local
  end_time: string; // "HH:MM:SS" local
  slot_duration_minutes: number;
  buffer_minutes: number;
  timezone: string; // IANA, e.g. "America/New_York"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityBlackout {
  id: string;
  staff_role: StaffRole;
  staff_id: string;
  school_id: string;
  start_at: string; // ISO TIMESTAMPTZ
  end_at: string;
  reason: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  parent_id: string;
  event_kind: EventKind;
  scheduled_start: string; // ISO TIMESTAMPTZ
  scheduled_end: string;
  duration_minutes: number;
  status: AppointmentStatus;
  cancelled_reason: string | null;
  cancelled_by_role: CancelByRole | null;
  cancelled_by_id: string | null;
  cancelled_at: string | null;
  intake_subject: string | null;
  intake_body: string | null;
  location: string | null;
  thread_id: string | null;
  shared_to_thread_at: string | null;
  ical_token: string | null;
  // Phase 116.2 — Jitsi video call URL. Generated at booking time when
  // the parent ticks the "video call" checkbox AND the `video_calls`
  // feature flag is ON for the school. Persisted denormalised so a
  // future swap to a non-deterministic provider (Daily.co / Whereby /
  // Twilio Video) only needs a code-side change.
  // Read via lib/montree/appointments/video.ts:resolveVideoUrl which
  // falls back to regeneration from ical_token if the column is null.
  video_url: string | null;
  // Phase 116.3 (migration 223) — which provider serves this appointment's
  // video call. 'jitsi' = external Jitsi URL (use video_url). 'agora' =
  // native-in-Montree Agora call (use /agora-token endpoint). Defaults
  // 'jitsi' on existing rows. Optional in TS because legacy fetch paths
  // may strip the column when migration 223 hasn't been run.
  provider?: 'jitsi' | 'agora' | null;
  // Phase 116.3 — whether recording was enabled at booking. Recording
  // requires this PLUS the school's video_recording flag PLUS staff
  // tapping the in-call record button.
  recording_enabled?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentHost {
  appointment_id: string;
  host_role: StaffRole;
  host_id: string;
  is_primary: boolean;
  is_required: boolean;
  response: HostResponse | null;
  response_at: string | null;
}

/** Hydrated row used by the API list endpoints. */
export interface AppointmentRowHydrated extends Appointment {
  hosts: Array<
    AppointmentHost & {
      name: string | null;
    }
  >;
  child_name?: string | null;
  parent_name?: string | null;
}

/** Open slot returned by the slot-computer. Times are ISO TIMESTAMPTZ. */
export interface OpenSlot {
  start: string;
  end: string;
}

/** Input to the slot-computer for a SINGLE staff member. */
export interface ComputeSlotsInput {
  staffRole: StaffRole;
  staffId: string;
  // ISO date range to compute over. Inclusive start, exclusive end.
  rangeStart: string;
  rangeEnd: string;
  // Slot length in minutes. If null, uses the rule's slot_duration_minutes.
  slotDurationMinutes?: number;
  // Existing rules + blackouts + booked appointments for this staff member,
  // fetched by the API route so the slot-computer is pure (testable, no DB).
  rules: AvailabilityRule[];
  blackouts: AvailabilityBlackout[];
  // Booked windows that block the staff member. Each is [start, end) in ISO.
  bookedRanges: Array<{ start: string; end: string }>;
}
