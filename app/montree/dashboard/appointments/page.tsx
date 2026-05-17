// app/montree/dashboard/appointments/page.tsx
//
// Teacher entry point — renders the calendar-first AppointmentsCalendar.
// The API auto-scopes to auth.role = 'teacher' so the calendar manages
// the calling teacher's own open slots + time away + bookings.
//
// Session 117 redesign — AppointmentsCalendar replaces the legacy
// AvailabilityEditor (kept on disk as a hide-don't-delete fallback per
// rule #56). Calendar-first posture per rule #176.

'use client';

import AppointmentsCalendar from '@/components/montree/appointments/AppointmentsCalendar';

export default function TeacherAppointmentsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at top, rgba(52,211,153,0.15), transparent 50%), linear-gradient(180deg, #0a1a0f 0%, #0f1f15 100%)',
      }}
    >
      <AppointmentsCalendar />
    </div>
  );
}
