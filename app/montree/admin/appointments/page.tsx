// app/montree/admin/appointments/page.tsx
// Principal entry point — renders the shared AvailabilityEditor.
// The API scopes to auth.role = 'principal' so this manages the
// principal's own rules; the upcoming-bookings list is school-wide
// (transparency rule: principals see all bookings in their school).

'use client';

import AvailabilityEditor from '@/components/montree/appointments/AvailabilityEditor';

export default function PrincipalAppointmentsPage() {
  return <AvailabilityEditor />;
}
