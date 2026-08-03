// /montree/dashboard/[childId]/milestones/run/page.tsx
// The check-in runner. Full-screen, tablet-first, child-facing.
//
// The child is identified by the ROUTE PARAMETER — there is no name field on any screen of
// the runner. The standalone tablet build asks a teacher to type a name because it has no
// database; inside Montree that would be a way to file a sitting against the wrong child.
//
// The runner paints over the dashboard chrome (see CheckInRunner's FullScreen), and the
// child layout also drops its header and tab bar on this route, so a stray tap cannot
// navigate away mid-sitting.
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import CheckInRunner from '@/components/montree/evaluation/runner/CheckInRunner';

interface ChildInfo {
  id: string;
  name: string | null;
  date_of_birth?: string | null;
}

export default function CheckInRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;

  const [ready, setReady] = useState(false);
  const [child, setChild] = useState<ChildInfo | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.push('/montree/login'); return; }
    setReady(true);

    if (!childId || !session.school?.id) return;
    // Name for the teacher summary, date of birth to suggest the age band. Both optional:
    // a missing date of birth means the teacher picks the band, not that the check-in stops.
    fetch(`/api/montree/children/${childId}`, { headers: { 'x-school-id': session.school.id } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.child) setChild(data.child as ChildInfo); })
      .catch(() => { /* the runner works without it */ });
  }, [childId, router]);

  if (!ready) return null;

  return (
    <>
      <CheckInRunner
        childId={childId}
        childName={child?.name ?? null}
        birthDate={child?.date_of_birth ?? null}
      />
      <Toaster position="top-center" richColors />
    </>
  );
}
