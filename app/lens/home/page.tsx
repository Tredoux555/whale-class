// app/lens/home/page.tsx — where she lands.
//
// Two things, in the order she needs them: the button that starts a visit, and
// the visits she has open. Everything else (schools, check-ins, profile) is one
// tap down.
//
// The check-in entry sits BELOW "Start a visit" as a secondary action, not
// beside it. A milestone check-in is a different job from a visit — it is not
// attached to one, and it is the rarer of the two — so it gets the ghost link in
// the corner and a secondary button, never equal weight with the thing she opens
// the app to do.

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, dateLocal, RULE } from '@/lib/lens/ui';
import { ENGAGEMENT_LABELS, type EngagementType, type VisitStatus } from '@/lib/lens/types';
import { EmptyState, ErrorNote, RowLink } from '@/components/lens/LensChrome';

interface VisitRow {
  id: string;
  school_id: string;
  school_name: string;
  visit_date: string;
  engagement_type: EngagementType;
  status: VisitStatus;
}

const STATUS_LABEL: Record<VisitStatus, string> = {
  capturing: 'Capturing',
  drafting: 'Drafting',
  review: 'In review',
  final: 'Final',
};

export default function LensHomePage() {
  const router = useRouter();
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [observerName, setObserverName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([
        lensApi<{ observer: { name: string } }>('/api/lens/auth/me'),
        lensApi<{ visits: VisitRow[] }>('/api/lens/visits'),
      ]);
      setObserverName(me.observer.name);
      setVisits(list.visits);
      setError(null);
    } catch (err) {
      if (err instanceof LensApiError && err.status === 401) {
        router.replace('/lens');
        return;
      }
      setError(err instanceof LensApiError ? err.message : 'Could not load your visits.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const open = visits.filter((v) => v.status !== 'final');
  const done = visits.filter((v) => v.status === 'final');

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-forest-gold">Montree Lens</p>
          <h1 className="font-serif text-2xl text-forest-text">
            {observerName ? observerName : 'Welcome'}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Link href="/lens/schools" className={BTN_GHOST}>
            Schools
          </Link>
          <Link href="/lens/assessment" className={BTN_GHOST}>
            Check-ins
          </Link>
          <Link href="/lens/profile" className={BTN_GHOST}>
            Profile
          </Link>
        </div>
      </div>
      <div className={RULE} />

      <Link href="/lens/visits/new" className={`${BTN_PRIMARY} mt-6 w-full text-base`}>
        Start a visit
      </Link>

      <Link href="/lens/assessment/new" className={`${BTN_SECONDARY} mt-3 w-full`}>
        Start a milestone check-in
      </Link>
      <p className="mt-2 text-center text-[12px] text-forest-muted">
        One child, about fifteen minutes, against written milestones.
      </p>

      <ErrorNote message={error} />

      {loading ? (
        <p className="mt-8 text-sm text-forest-muted">Loading…</p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-3 text-[12px] uppercase tracking-wider text-forest-muted">
              In progress
            </h2>
            {open.length === 0 ? (
              <EmptyState
                title="Nothing open"
                body="When you start a visit it stays here until the report is final."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {open.map((v) => (
                  <RowLink
                    key={v.id}
                    href={`/lens/visits/${v.id}`}
                    title={v.school_name}
                    meta={`${dateLocal(v.visit_date)} · ${ENGAGEMENT_LABELS[v.engagement_type] ?? v.engagement_type}`}
                    badge={
                      <span className="rounded-full border border-[rgba(52,211,153,0.3)] px-2.5 py-1 text-[11px] text-emerald-primary">
                        {STATUS_LABEL[v.status]}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {done.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-[12px] uppercase tracking-wider text-forest-muted">
                Finished
              </h2>
              <div className="flex flex-col gap-2">
                {done.map((v) => (
                  <RowLink
                    key={v.id}
                    href={`/lens/visits/${v.id}`}
                    title={v.school_name}
                    meta={`${dateLocal(v.visit_date)} · ${ENGAGEMENT_LABELS[v.engagement_type] ?? v.engagement_type}`}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
