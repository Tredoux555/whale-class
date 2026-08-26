// app/lens/assessment/page.tsx — her check-ins.
//
// Same shape as the home screen's visit lists on purpose: one CTA, then In
// progress, then Finished. A check-in is not attached to a visit — she may run
// one while she is in a room, or a week later from a paper sheet — so this list
// stands on its own rather than hanging off /lens/visits.
//
// 🚨 A ROW NEVER CARRIES A PERCENTAGE FOR A SNAPSHOT SITTING. A list is where a
// figure does its most damage — skimmed, out of context, next to a child's name,
// with none of the framing the results screen puts around it. A check-in that was
// not co-rated is badged as a snapshot instead, and the number is simply not
// there to skim. See lib/lens/assessment/session-facts.ts.

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_GHOST, BTN_PRIMARY, dateLocal, RULE } from '@/lib/lens/ui';
import { EmptyState, ErrorNote, RowLink } from '@/components/lens/LensChrome';
import { LENS_DELIVERY_LABELS } from '@/lib/lens/assessment/types';
import { SNAPSHOT_BADGE } from '@/lib/lens/assessment/session-facts';
import type { DeliveryMode } from '@/lib/montree/evaluation/types';

interface SessionRow {
  id: string;
  school_id: string;
  school_name: string;
  child_alias: string;
  age_band: string;
  form_code: string;
  delivery_mode: DeliveryMode;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at: string | null;
  map_percent: number | null;
  map_suppressed: boolean;
  /** Flattened by the list endpoint from summary_json. Absent means not co-rated. */
  co_rated?: boolean;
}

/** Where a row goes when she taps it, which depends on how it is being run. */
function rowHref(s: SessionRow): string {
  if (s.status !== 'in_progress') return `/lens/assessment/results/${s.id}`;
  return s.delivery_mode === 'paper' || s.delivery_mode === 'observation_only'
    ? `/lens/assessment/paper/${s.id}`
    : `/lens/assessment/run/${s.id}`;
}

export default function LensAssessmentListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await lensApi<{ sessions: SessionRow[] }>('/api/lens/assessment/sessions');
      setSessions(data.sessions);
      setError(null);
    } catch (err) {
      if (err instanceof LensApiError && err.status === 401) {
        router.replace('/lens');
        return;
      }
      setError(err instanceof LensApiError ? err.message : 'Could not load your check-ins.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const open = sessions.filter((s) => s.status === 'in_progress');
  const done = sessions.filter((s) => s.status !== 'in_progress');

  const meta = (s: SessionRow) =>
    `${s.school_name} · ${dateLocal(s.started_at)} · ${LENS_DELIVERY_LABELS[s.delivery_mode] ?? s.delivery_mode}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-forest-gold">Montree Lens</p>
          <h1 className="font-serif text-2xl text-forest-text">Check-ins</h1>
        </div>
        <Link href="/lens/home" className={BTN_GHOST}>Home</Link>
      </div>
      <div className={RULE} />

      <Link href="/lens/assessment/new" className={`${BTN_PRIMARY} mt-6 w-full text-base`}>
        New check-in
      </Link>

      <p className="mt-3 text-[12.5px] leading-relaxed text-forest-muted">
        A fifteen-minute look at where one child is, against written milestones. Criterion-referenced:
        no percentiles, no ranking against the other children in the room.
      </p>

      <p className="mt-2 text-[12px] leading-relaxed text-forest-muted">
        A visit you ran on your own is a single-session snapshot: it reports a band profile and no
        overall figure. Rating alongside an adult who knows the child gives the fuller picture.
      </p>

      <ErrorNote message={error} />

      {loading ? (
        <p className="mt-8 text-sm text-forest-muted">Loading…</p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="mb-3 text-[12px] uppercase tracking-wider text-forest-muted">In progress</h2>
            {open.length === 0 ? (
              <EmptyState
                title="Nothing open"
                body="A check-in stays here until you finish it — including a paper one you have not keyed in yet."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {open.map((s) => (
                  <RowLink
                    key={s.id}
                    href={rowHref(s)}
                    title={s.child_alias}
                    meta={meta(s)}
                    badge={
                      <span className="rounded-full border border-[rgba(52,211,153,0.3)] px-2.5 py-1 text-[11px] text-emerald-primary">
                        {s.age_band}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {done.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-[12px] uppercase tracking-wider text-forest-muted">Finished</h2>
              <div className="flex flex-col gap-2">
                {done.map((s) => (
                  <RowLink
                    key={s.id}
                    href={rowHref(s)}
                    title={s.child_alias}
                    meta={meta(s)}
                    badge={
                      // A snapshot carries no figure at all; a suppressed figure is
                      // shown as suppressed, never as 0%.
                      s.co_rated !== true ? (
                        <span className="whitespace-nowrap rounded-full border border-[rgba(232,201,106,0.35)] px-2.5 py-1 text-[11px] text-forest-gold">
                          {SNAPSHOT_BADGE}
                        </span>
                      ) : s.map_suppressed || s.map_percent === null ? null : (
                        <span className="rounded-full border border-[rgba(232,201,106,0.35)] px-2.5 py-1 text-[11px] text-forest-gold">
                          {s.map_percent}%
                        </span>
                      )
                    }
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
