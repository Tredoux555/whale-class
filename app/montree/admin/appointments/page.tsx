// app/montree/admin/appointments/page.tsx
//
// Principal entry point — renders the calendar-first AppointmentsCalendar.
// The API scopes to auth.role = 'principal' so this manages the
// principal's own open slots; the bookings list is school-wide
// (transparency rule: principals see all bookings in their school).
//
// Session 117 redesign — AppointmentsCalendar replaces the legacy
// AvailabilityEditor (kept on disk as a hide-don't-delete fallback per
// rule #56). Calendar-first posture per rule #176.

'use client';

import AppointmentsCalendar from '@/components/montree/appointments/AppointmentsCalendar';

export default function PrincipalAppointmentsPage() {
  return <AppointmentsCalendar />;
}
