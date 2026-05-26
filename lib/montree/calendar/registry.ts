// lib/montree/calendar/registry.ts
// Calendar Plan §4 — the only place that knows which adapters exist and
// which roles see which sources. Adding a new source = add ONE entry here.
//
// `roles` controls which CalendarScope.role values get the adapter's events.
// `*` = all roles.

import type { CalendarAdapter, CalendarRole, CalendarSource } from './types';
import { appointmentsAdapter } from './adapters/appointments';
import { schoolEventsAdapter } from './adapters/school-events';
// Session 129 — calendar reframed as events+appointments only. Imports kept
// per hide-don't-delete rule #56 so re-enabling is a one-line uncomment.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { reportsAdapter } from './adapters/reports';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { observationsAdapter } from './adapters/observations';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { englishScheduleAdapter } from './adapters/english-schedule';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { milestonesAdapter } from './adapters/milestones';
import { meetingNotesAdapter } from './adapters/meeting-notes';
import { conferenceNotesAdapter } from './adapters/conference-notes';
import { termsAdapter } from './adapters/terms';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { attentionAdapter } from './adapters/attention';

export interface AdapterDef {
  name: CalendarSource;
  adapter: CalendarAdapter;
  /** Which roles see this source. `*` = everybody. */
  roles: CalendarRole[] | '*';
}

const REGISTRY: AdapterDef[] = [
  // Phase 1 — two adapters proving the contract.
  { name: 'appointment', adapter: appointmentsAdapter, roles: '*' },
  { name: 'school_event', adapter: schoolEventsAdapter, roles: '*' },

  // Phase 2 — the daily-life adapters.
  //
  // Session 129 — calendar reframed as a SCHOOL EVENTS + PARENT APPOINTMENTS
  // surface authored by principal/admin staff. Student-progress signals
  // (reports, photo observations, English schedule, milestones) belong on
  // the dashboard, not the calendar — the user explicitly said the calendar
  // "isn't the place. It's not for student progress."
  //
  // To re-enable any of these: uncomment, retest the prod load, and verify
  // the day-cell icon strip stays clean.
  //
  // { name: 'report', adapter: reportsAdapter, roles: ['parent', 'teacher', 'principal'] },
  // { name: 'observation', adapter: observationsAdapter, roles: ['teacher', 'principal'] },
  // {
  //   name: 'english_schedule',
  //   adapter: englishScheduleAdapter,
  //   roles: ['teacher', 'principal'],
  // },
  // { name: 'milestone', adapter: milestonesAdapter, roles: '*' },
  {
    name: 'meeting_note',
    adapter: meetingNotesAdapter,
    roles: ['teacher', 'principal'],
  },
  { name: 'conference_note', adapter: conferenceNotesAdapter, roles: '*' },
  { name: 'term', adapter: termsAdapter, roles: '*' },

  // Phase 5 — operational signals (staff-only by design).
  //
  // Session 129 — disabled with the rest of the progress-signal adapters.
  // The "Needs attention" banner on the calendar surfaced reports stuck in
  // pending_review, draft conference notes, etc. — operational signals that
  // belong on the dashboard, not the events-and-appointments calendar.
  // The calendar page already guards on `attentionEvents.length > 0` so the
  // banner section simply doesn't render once this adapter is gone.
  //
  // {
  //   name: 'attention',
  //   adapter: attentionAdapter,
  //   roles: ['teacher', 'principal', 'super_admin'],
  // },
];

/** Returns the adapter set for a given role. */
export function getAdaptersForRole(role: CalendarRole): AdapterDef[] {
  return REGISTRY.filter((d) => d.roles === '*' || d.roles.includes(role));
}

/** All registered adapters (super_admin / debug use). */
export function getAllAdapters(): AdapterDef[] {
  return [...REGISTRY];
}
