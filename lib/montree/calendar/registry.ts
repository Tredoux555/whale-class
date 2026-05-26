// lib/montree/calendar/registry.ts
// Calendar Plan §4 — the only place that knows which adapters exist and
// which roles see which sources. Adding a new source = add ONE entry here.
//
// `roles` controls which CalendarScope.role values get the adapter's events.
// `*` = all roles.

import type { CalendarAdapter, CalendarRole, CalendarSource } from './types';
import { appointmentsAdapter } from './adapters/appointments';
import { schoolEventsAdapter } from './adapters/school-events';

export interface AdapterDef {
  name: CalendarSource;
  adapter: CalendarAdapter;
  /** Which roles see this source. `*` = everybody. */
  roles: CalendarRole[] | '*';
}

const REGISTRY: AdapterDef[] = [
  // Phase 1 — two adapters proving the contract.
  {
    name: 'appointment',
    adapter: appointmentsAdapter,
    roles: '*',
  },
  {
    name: 'school_event',
    adapter: schoolEventsAdapter,
    roles: '*',
  },
  // Phase 2 adapters will register here:
  // { name: 'report', adapter: reportsAdapter, roles: ['parent', 'teacher', 'principal'] },
  // { name: 'observation', adapter: observationsAdapter, roles: ['teacher', 'principal'] },
  // { name: 'english_schedule', adapter: englishScheduleAdapter, roles: ['teacher', 'principal'] },
  // { name: 'milestone', adapter: milestonesAdapter, roles: '*' },
  // { name: 'attendance', adapter: attendanceAdapter, roles: ['teacher', 'principal'] },
  // ...
];

/** Returns the adapter set for a given role. */
export function getAdaptersForRole(role: CalendarRole): AdapterDef[] {
  return REGISTRY.filter((d) => d.roles === '*' || d.roles.includes(role));
}

/** All registered adapters (super_admin / debug use). */
export function getAllAdapters(): AdapterDef[] {
  return [...REGISTRY];
}
