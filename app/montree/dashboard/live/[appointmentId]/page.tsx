/**
 * Teacher live-classroom entry point.
 *
 * Thin server shell: await the route params, load the Midnight Studio tokens,
 * hand the appointment id to the client. Everything else — live-state fetch,
 * PATCH-on-every-interaction sync, scene navigation, stars, End Class — lives
 * in TeacherClassroomClient, because all of it needs the browser's cookie and
 * a 2s-granularity feedback loop the server can't give.
 *
 * Auth is enforced by the API this page's client calls
 * (`/api/montree/appointments/[id]/live-state?as=teacher`): 401 → login,
 * 404 → "Online Classes is not enabled". Duplicating that check here would
 * mean a second, divergent copy of the same rules.
 *
 * Route: /montree/dashboard/live/[appointmentId]
 */

import '@/styles/dark-phonics-live-tokens.css';

import TeacherClassroomClient from '@/components/montree/dark-phonics-live/TeacherClassroomClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  // Next.js 16: dynamic route params are async.
  params: Promise<{ appointmentId: string }>;
}

export default async function TeacherLiveClassroomPage({ params }: PageProps) {
  const { appointmentId } = await params;
  return <TeacherClassroomClient appointmentId={appointmentId} />;
}
