// app/lens/assessment/run/[id]/page.tsx — the digital sitting.
//
// This page is a loader and nothing else. It fetches the session row, sends the
// observer somewhere more useful if the check-in is not actually runnable, and
// then hands over to <LensRunner/>, which covers the screen entirely.
//
// Full-screen is deliberate: the tablet is handed to a child, and a stray tap on
// Lens's own navigation mid-sitting would end the sitting.

'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_PRIMARY } from '@/lib/lens/ui';
import { ErrorNote, LensHeader } from '@/components/lens/LensChrome';
import { LensRunner, type LensRunnerSession } from '@/components/lens/assessment/LensRunner';

interface Payload {
  session: LensRunnerSession & { status: string; delivery_mode: string };
}

export default function LensAssessmentRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Payload['session'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    lensApi<Payload>(`/api/lens/assessment/sessions/${id}`)
      .then((data) => {
        if (cancelled) return;
        if (data.session.status !== 'in_progress') {
          router.replace(`/lens/assessment/results/${id}`);
          return;
        }
        if (data.session.delivery_mode !== 'tablet') {
          // A paper or observation-only check-in has no runner — it is keyed in.
          router.replace(`/lens/assessment/paper/${id}`);
          return;
        }
        setSession(data.session);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof LensApiError && err.status === 401) { router.replace('/lens'); return; }
        setError(err instanceof LensApiError ? err.message : 'Could not open that check-in.');
      });
    return () => { cancelled = true; };
  }, [id, router]);

  if (error) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-3">
        <LensHeader title="Check-in" back="/lens/assessment" />
        <ErrorNote message={error} />
        <button
          type="button"
          onClick={() => router.replace('/lens/assessment')}
          className={`${BTN_PRIMARY} mt-6 w-full`}
        >
          Back to check-ins
        </button>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-3">
        <LensHeader title="Check-in" back="/lens/assessment" />
        <p className="text-sm text-forest-muted">Opening…</p>
      </main>
    );
  }

  return <LensRunner session={session} />;
}
