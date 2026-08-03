// /montree/dashboard/[childId]/milestones/page.tsx
// Montree Milestones — the reflection tab on a child's profile.
//
// TEACHER / PRINCIPAL ONLY. This is the working view a teacher uses to decide what to put
// on a shelf on Monday; the parent-facing artefact is the Growth Story, written separately.
// `app/montree/parent/*` must never import from `components/montree/evaluation/*`, and the
// deprecated `app/montree/parent/milestones` route (an unrelated, hidden page that happens
// to share the word) is not connected to this feature in any direction.
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import MilestonesPanel from '@/components/montree/evaluation/MilestonesPanel';

export default function ChildMilestonesPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;
  const [ready, setReady] = useState(false);

  // Same gate every sibling tab uses: no session, no page.
  useEffect(() => {
    if (!getSession()) { router.push('/montree/login'); return; }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <>
      <MilestonesPanel childId={childId} />
      <Toaster position="top-center" richColors />
    </>
  );
}
