// app/montree/dashboard/appointments/page.tsx
// Teacher entry point — renders the shared AvailabilityEditor component.
// The API auto-scopes to auth.role = 'teacher' so the editor manages
// the calling teacher's own rules + blackouts + bookings.

'use client';

import AvailabilityEditor from '@/components/montree/appointments/AvailabilityEditor';

export default function TeacherAppointmentsPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at top, rgba(52,211,153,0.15), transparent 50%), linear-gradient(180deg, #0a1a0f 0%, #0f1f15 100%)',
      }}
    >
      <AvailabilityEditor />
    </div>
  );
}
