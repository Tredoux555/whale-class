/**
 * Parent live-classroom entry point.
 *
 * Thin server shell, mirroring the teacher route: await params, load the
 * Midnight Studio tokens, hand the appointment id to the client. The parent
 * surface is read-only — it polls `/api/montree/appointments/[id]/live-state`
 * every 2s (no `?as=` hint, so the route resolves the parent session) and
 * never PATCHes. See ParentClassroomClient.
 *
 * Auth is enforced by that API: 401 → parent login, 404 → "Online Classes is
 * not enabled".
 *
 * Route: /montree/parent/live/[appointmentId]
 */

import '@/styles/dark-phonics-live-tokens.css';

import ParentClassroomClient from '@/components/montree/dark-phonics-live/ParentClassroomClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ appointmentId: string }>;
}

export default async function ParentLiveClassroomPage({ params }: PageProps) {
  const { appointmentId } = await params;
  return <ParentClassroomClient appointmentId={appointmentId} />;
}
