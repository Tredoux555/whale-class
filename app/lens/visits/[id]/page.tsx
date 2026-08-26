// app/lens/visits/[id]/page.tsx — the visit, between the classroom and the tea.
//
// Three things: get back into capture, read the timeline, and open the report
// for a room. The reports were created with the visit (see the POST handler in
// app/api/lens/visits/route.ts), so they are always here to open — even before
// anything has been drafted into them.

'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, dateLocal, RULE } from '@/lib/lens/ui';
import {
  ENGAGEMENT_LABELS,
  LEVEL_LABELS,
  type LensClassroom,
  type LensMoment,
  type LensSchool,
  type LensStaff,
  type LensVisit,
} from '@/lib/lens/types';
import { ErrorNote, LensHeader } from '@/components/lens/LensChrome';
import { MomentRow } from '@/components/lens/MomentRow';

interface ReportRow {
  id: string;
  classroom_id: string | null;
  status: string;
  version: number;
}

interface VisitBundle {
  visit: LensVisit;
  school: LensSchool;
  classrooms: LensClassroom[];
  staff: LensStaff[];
  reports: ReportRow[];
  moments: LensMoment[];
}

export default function LensVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bundle, setBundle] = useState<VisitBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await lensApi<VisitBundle>(`/api/lens/visits/${id}`);
      setBundle(data);
      setError(null);
    } catch (err) {
      if (err instanceof LensApiError && err.status === 401) {
        router.replace('/lens');
        return;
      }
      setError(err instanceof LensApiError ? err.message : 'Could not load this visit.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const roomName = (classroomId: string | null) =>
    classroomId
      ? bundle?.classrooms.find((c) => c.id === classroomId)?.name ?? 'Classroom'
      : 'Level report (whole school)';

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16">
      <LensHeader
        title={bundle?.school.name ?? 'Visit'}
        subtitle={
          bundle
            ? `${dateLocal(bundle.visit.visit_date)} · ${
                ENGAGEMENT_LABELS[bundle.visit.engagement_type] ?? bundle.visit.engagement_type
              }`
            : null
        }
        back="/lens/home"
      />

      <ErrorNote message={error} />

      {loading ? (
        <p className="text-sm text-forest-muted">Loading…</p>
      ) : !bundle ? null : (
        <>
          <Link href={`/lens/visits/${id}/capture`} className={`${BTN_PRIMARY} w-full text-base`}>
            {bundle.moments.length === 0 ? 'Start capturing' : 'Keep capturing'}
          </Link>

          <section className="mt-6">
            <h2 className="mb-3 text-[12px] uppercase tracking-wider text-forest-muted">Reports</h2>
            <div className="flex flex-col gap-2">
              {bundle.reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/lens/visits/${id}/report?report=${r.id}`}
                  className="ln-tap flex items-center gap-3 rounded-xl border border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] text-forest-text">{roomName(r.classroom_id)}</p>
                    <p className="text-[12px] text-forest-muted">
                      {r.status} · v{r.version}
                    </p>
                  </div>
                  <span aria-hidden className="text-forest-muted">
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {bundle.classrooms.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-[12px] uppercase tracking-wider text-forest-muted">Rooms</h2>
              <div className="flex flex-wrap gap-2">
                {bundle.classrooms.map((c) => (
                  <Link key={c.id} href={`/lens/classrooms/${c.id}`} className="ln-chip">
                    {c.name} · {LEVEL_LABELS[c.level] ?? c.level}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12px] uppercase tracking-wider text-forest-muted">
                Timeline · {bundle.moments.length}
              </h2>
              {bundle.visit.status === 'capturing' && (
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  onClick={async () => {
                    try {
                      await lensApi(`/api/lens/visits/${id}`, {
                        method: 'PATCH',
                        json: { status: 'drafting', ended_at: true },
                      });
                      await load();
                    } catch (err) {
                      setError(err instanceof LensApiError ? err.message : 'Could not close the visit.');
                    }
                  }}
                >
                  Finish observing
                </button>
              )}
            </div>
            <div className={RULE} />
            {bundle.moments.length === 0 ? (
              <div className={`${CARD} mt-4`}>
                <p className="text-[13px] leading-relaxed text-forest-muted">
                  Nothing captured yet. Everything the report is written from comes from
                  here — the Guru will not write a sentence this timeline does not
                  support.
                </p>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                {bundle.moments.map((m) => (
                  <MomentRow
                    key={m.id}
                    moment={m}
                    staff={bundle.staff}
                    classrooms={bundle.classrooms}
                    onChanged={load}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
