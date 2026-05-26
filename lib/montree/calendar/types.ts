// lib/montree/calendar/types.ts
// Calendar Plan §3 — the one normalized shape every adapter emits and the
// calendar API returns. Get this right and every source is mechanical.
//
// Phase 1 carries `title` and `detail` as plain English strings. The plan
// flags i18n (keys + params) as a future evolution — the field names will
// gain `_key`/`_params` siblings without a model rewrite.

export type CalendarSource =
  | 'appointment'
  | 'school_event'
  | 'report'
  | 'observation'
  | 'english_schedule'
  | 'milestone'
  | 'meeting_note'
  | 'attendance'
  | 'conference_note'
  | 'raz'
  | 'billing'
  | 'super_admin'
  | 'term'
  | 'attention'
  | 'manual';

export type CalendarKind = 'point' | 'span' | 'allday' | 'attention';

export type CalendarStatus = 'planned' | 'done' | 'missed' | 'cancelled' | 'info';

export type CalendarVisibility = 'school' | 'classroom' | 'child' | 'staff' | 'private';

export type CalendarRole = 'teacher' | 'principal' | 'parent' | 'super_admin';

export interface CalendarEvent {
  /** Source-prefixed id — e.g. `appt:<uuid>`, `event:<uuid>`. */
  id: string;
  source: CalendarSource;
  kind: CalendarKind;
  /** ISO UTC timestamp of the event start. */
  start: string;
  /** ISO UTC timestamp of the event end, null for point events. */
  end: string | null;
  /** True for holidays / Weekly-Wrap-due / day-wide markers. */
  all_day: boolean;
  /** Human, short — Phase 1 English. */
  title: string;
  /** One line of context, may be null. */
  detail: string | null;
  status: CalendarStatus;
  /** Where tapping it goes — deep link inside the app. */
  link: string | null;
  /** Visual token (emoji for now). */
  icon: string;
  /** Colour family per source (hex). */
  accent: string;
  // Scoping — the cross-pollination contract.
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  visibility: CalendarVisibility;
}

/** Who is asking, and what they can see. */
export interface CalendarScope {
  role: CalendarRole;
  schoolId: string;
  classroomId: string | null;
  /** Parent: their linked children. Teacher: their classroom's roster
   *  (resolved when the adapter actually needs it). */
  childIds: string[];
}

/** A bounded window — adapters never scan all-time. */
export interface CalendarWindow {
  /** YYYY-MM-DD in school-local time, inclusive. */
  from: string;
  /** YYYY-MM-DD in school-local time, inclusive. */
  to: string;
  /** UTC instant of `from 00:00` in school tz — for captured_at filtering. */
  fromInstant: Date;
  /** UTC instant of `(to+1) 00:00` in school tz — exclusive upper bound. */
  toInstant: Date;
  /** The school's IANA timezone (resolved by the API once). */
  tz: string;
}

/** Every source is one of these — pure function, bounded query, role-scoped. */
export type CalendarAdapter = (
  window: CalendarWindow,
  scope: CalendarScope,
) => Promise<CalendarEvent[]>;
