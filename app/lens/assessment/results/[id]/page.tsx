// app/lens/assessment/results/[id]/page.tsx — what the check-in found.
//
// 🚨 THE BAND PROFILE LEADS. It is the honest shape of a single sitting: these
// milestones were seen, at these bands, and these were not looked at this time.
// The overall figure comes after it, smaller, and on a sitting that was not
// co-rated it does not appear at all — see below.
//
// 🚨 THE FIGURE IS NEVER SHOWN WITHOUT ITS DENOMINATOR, and a suppressed figure
// is shown as suppressed rather than as 0%. That is not a display preference: a
// Milestone Attainment Profile computed from four milestones is not a profile,
// and printing "25%" beside a child's name because three of the four were
// unassessed would be the single most misleading thing this product could do.
//
// 🚨 A NON-CO-RATED SITTING SHOWS NO PERCENTAGE AT ALL. One visit by an adult the
// child had not met is a snapshot. Its bands are real; a single number distilled
// from them is not, because a number is read as a settled fact about a child and
// gets carried into conversations this evidence cannot support. The suppression
// is not a softer figure — it is the absence of one. See session-facts.ts.
//
// 🚨 AN EARLIER CHECK-IN UNDER THE SAME NAME IS A MAYBE. Lens keeps no roster.
// Two children called Leo type identically, so nothing is put side by side until
// she has said, for that specific pair, that it is the same person — and even
// then the comparability flags stay on screen.
//
// Everything on this page comes from the server's own re-score. Nothing is
// computed in the browser.

'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, LABEL, dateLocal, RULE } from '@/lib/lens/ui';
import { ErrorNote, LensHeader } from '@/components/lens/LensChrome';
import { LensBandChip } from '@/components/lens/assessment/LensBandChip';
import { LENS_DELIVERY_LABELS, type LensAssessmentResultView } from '@/lib/lens/assessment/types';
import {
  CO_RATED_BODY, MAP_WITHHELD_BODY, MAP_WITHHELD_TITLE, POSSIBLE_MATCH_BODY,
  POSSIBLE_MATCH_CONFIRM, POSSIBLE_MATCH_TITLE, SNAPSHOT_BODY, SNAPSHOT_HEADLINE,
} from '@/lib/lens/assessment/session-facts';
import type { DeliveryMode, SessionSummary } from '@/lib/montree/evaluation/types';

interface Payload {
  session: {
    id: string;
    child_alias: string;
    age_band: string;
    form_code: string;
    delivery_mode: DeliveryMode;
    status: string;
    started_at: string;
    completed_at: string | null;
    map_percent: number | null;
    map_denominator: number | null;
    map_suppressed: boolean;
    efl_map_percent: number | null;
    efl_map_denominator: number | null;
    efl_map_suppressed: boolean;
    milestones_secure: number | null;
    milestones_developing: number | null;
    milestones_emerging: number | null;
    milestones_unassessed: number | null;
  };
  school: { id: string; name: string } | null;
  classroom: { id: string; name: string } | null;
  results: LensAssessmentResultView[];
  summary: SessionSummary | Record<string, never> | null;
  coRated?: boolean;
  coRater?: string | null;
  possibleMatches?: PossibleMatch[];
}

/** Never a history. Earlier sittings under the same typed name, and nothing more. */
interface PossibleMatch {
  id: string;
  school_year: string;
  window_code: string;
  age_band: string;
  form_code: string;
  completed_at: string | null;
  comparabilityFlags: string[];
}

const WINDOW_LABEL: Record<string, string> = {
  autumn: 'Autumn', winter: 'Winter', spring: 'Spring',
};

function bandCounts(s: Payload['session']) {
  return {
    secure: s.milestones_secure ?? 0,
    developing: s.milestones_developing ?? 0,
    emerging: s.milestones_emerging ?? 0,
    unassessed: s.milestones_unassessed ?? 0,
  };
}

export default function LensAssessmentResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  // One entry per comparison she has explicitly confirmed. Empty by default and
  // never populated by anything but a tap: an alias match alone opens nothing.
  const [compared, setCompared] = useState<Record<string, Payload | 'loading' | 'error'>>({});

  const confirmMatch = async (matchId: string) => {
    setCompared((prev) => ({ ...prev, [matchId]: 'loading' }));
    try {
      const other = await lensApi<Payload>(`/api/lens/assessment/sessions/${matchId}`);
      setCompared((prev) => ({ ...prev, [matchId]: other }));
    } catch {
      setCompared((prev) => ({ ...prev, [matchId]: 'error' }));
    }
  };

  useEffect(() => {
    let cancelled = false;
    lensApi<Payload>(`/api/lens/assessment/sessions/${id}`)
      .then((payload) => { if (!cancelled) setData(payload); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof LensApiError && err.status === 401) { router.replace('/lens'); return; }
        setError(err instanceof LensApiError ? err.message : 'Could not load that check-in.');
      });
    return () => { cancelled = true; };
  }, [id, router]);

  if (error) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-3">
        <LensHeader title="Check-in" back="/lens/assessment" />
        <ErrorNote message={error} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-3">
        <LensHeader title="Check-in" back="/lens/assessment" />
        <p className="text-sm text-forest-muted">Loading…</p>
      </main>
    );
  }

  const s = data.session;
  const unfinished = s.status === 'in_progress';

  // Group by domain, in the order the API already sorted them.
  const byDomain: Array<{ domain: string; rows: LensAssessmentResultView[] }> = [];
  for (const row of data.results) {
    const last = byDomain[byDomain.length - 1];
    if (last && last.domain === row.domain_name) last.rows.push(row);
    else byDomain.push({ domain: row.domain_name, rows: [row] });
  }

  const counts = bandCounts(s);
  const coRated = data.coRated === true;
  const matches = data.possibleMatches ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-3">
      <LensHeader
        title={s.child_alias}
        subtitle={[
          data.school?.name,
          data.classroom?.name,
          `${s.age_band} · Form ${s.form_code}`,
          LENS_DELIVERY_LABELS[s.delivery_mode] ?? s.delivery_mode,
        ].filter(Boolean).join(' · ')}
        back="/lens/assessment"
      />

      <p className="text-[12px] text-forest-muted">
        {s.completed_at ? `Finished ${dateLocal(s.completed_at)}` : `Started ${dateLocal(s.started_at)}`}
      </p>

      {unfinished && (
        <div className={`${CARD} mt-4`}>
          <p className="text-[14px] text-forest-text">This check-in isn’t finished.</p>
          <p className="mt-1 text-[12.5px] text-forest-muted">
            Bands are only computed at the end, from everything gathered.
          </p>
          <Link
            href={s.delivery_mode === 'tablet'
              ? `/lens/assessment/run/${s.id}`
              : `/lens/assessment/paper/${s.id}`}
            className={`${BTN_PRIMARY} mt-4 w-full`}
          >
            Carry on
          </Link>
        </div>
      )}

      {!unfinished && (
        <>
          <div
            className={`${CARD} mt-4 ${coRated ? '' : 'border-[rgba(232,201,106,0.45)] bg-[rgba(232,201,106,0.07)]'}`}
          >
            {coRated ? (
              <>
                <p className="text-[14px] leading-snug text-forest-text">
                  Co-rated check-in
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-forest-muted">
                  {CO_RATED_BODY}
                  {data.coRater ? ` With ${data.coRater}.` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="font-serif text-[17px] leading-snug text-forest-gold">
                  {SNAPSHOT_HEADLINE}
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-forest-muted">{SNAPSHOT_BODY}</p>
              </>
            )}
          </div>

          {/* The band profile leads. It is what one sitting can actually say. */}
          <div className={`${CARD} mt-3`}>
            <span className={LABEL}>Band profile</span>
            <div className="flex flex-wrap gap-2">
              <LensBandChip band="secure" label={`Secure · ${counts.secure}`} />
              <LensBandChip band="developing" label={`Developing · ${counts.developing}`} />
              <LensBandChip band="emerging" label={`Emerging · ${counts.emerging}`} />
              <LensBandChip band="unassessed" label={`Not looked at · ${counts.unassessed}`} />
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-forest-muted">
              Milestone by milestone, below. A milestone with too little evidence is reported as not
              looked at this time rather than guessed.
            </p>
          </div>

          {/* Demoted, and on a snapshot absent entirely. */}
          {!coRated ? (
            <div className={`${CARD} mt-3`}>
              <span className={LABEL}>{MAP_WITHHELD_TITLE}</span>
              <p className="text-[12.5px] leading-relaxed text-forest-muted">{MAP_WITHHELD_BODY}</p>
            </div>
          ) : (
            <>
              <div className={`${CARD} mt-3`}>
                <span className={LABEL}>Milestone attainment</span>
                {s.map_suppressed || s.map_percent === null ? (
                  <>
                    <p className="font-serif text-base text-forest-muted">Not reported</p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-forest-muted">
                      Too few milestones were assessed at this band for a figure to mean anything.
                      The band profile above still stands on its own.
                    </p>
                  </>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl text-emerald-primary">{s.map_percent}%</span>
                    <span className="text-[12px] text-forest-muted">
                      of {s.map_denominator} milestones expected at {s.age_band}
                    </span>
                  </div>
                )}
              </div>

              {s.efl_map_denominator ? (
                <div className={`${CARD} mt-3`}>
                  <span className={LABEL}>English track</span>
                  {s.efl_map_suppressed || s.efl_map_percent === null ? (
                    <p className="font-serif text-base text-forest-muted">Not reported</p>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-xl text-forest-gold">{s.efl_map_percent}%</span>
                      <span className="text-[12px] text-forest-muted">
                        of {s.efl_map_denominator} · reported separately, never merged into the figure above
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}

          {matches.length > 0 && (
            <div className={`${CARD} mt-3`}>
              <span className={LABEL}>{POSSIBLE_MATCH_TITLE}</span>
              <p className="text-[12.5px] leading-relaxed text-forest-muted">{POSSIBLE_MATCH_BODY}</p>
              <div className="mt-3 flex flex-col gap-2">
                {matches.map((m) => {
                  const state = compared[m.id];
                  const other = state && state !== 'loading' && state !== 'error' ? state : null;
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)] px-4 py-3"
                    >
                      <p className="text-[13.5px] text-forest-text">
                        {WINDOW_LABEL[m.window_code] ?? m.window_code} {m.school_year} ·{' '}
                        {m.age_band} · Form {m.form_code}
                      </p>
                      <p className="mt-0.5 text-[12px] text-forest-muted">
                        {m.completed_at ? dateLocal(m.completed_at) : 'Not finished'}
                      </p>

                      {m.comparabilityFlags.map((flag) => (
                        <p key={flag} className="mt-1.5 text-[12px] leading-relaxed text-forest-gold">
                          {flag}
                        </p>
                      ))}

                      {!state && (
                        <button
                          type="button"
                          onClick={() => void confirmMatch(m.id)}
                          className={`${BTN_SECONDARY} mt-3 w-full text-[13.5px]`}
                        >
                          {POSSIBLE_MATCH_CONFIRM}
                        </button>
                      )}
                      {state === 'loading' && (
                        <p className="mt-3 text-[12.5px] text-forest-muted">Opening…</p>
                      )}
                      {state === 'error' && (
                        <p className="mt-3 text-[12.5px] text-forest-danger">
                          That check-in could not be opened.
                        </p>
                      )}

                      {other && (
                        <div className="mt-3 border-t border-[rgba(52,211,153,0.14)] pt-3">
                          <p className="text-[11px] uppercase tracking-wider text-forest-muted">
                            This check-in
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <LensBandChip band="secure" label={`Secure · ${counts.secure}`} size="sm" />
                            <LensBandChip band="developing" label={`Developing · ${counts.developing}`} size="sm" />
                            <LensBandChip band="emerging" label={`Emerging · ${counts.emerging}`} size="sm" />
                            <LensBandChip band="unassessed" label={`Not looked at · ${counts.unassessed}`} size="sm" />
                          </div>
                          <p className="mt-3 text-[11px] uppercase tracking-wider text-forest-muted">
                            The earlier one
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {(() => {
                              const c = bandCounts(other.session);
                              return (
                                <>
                                  <LensBandChip band="secure" label={`Secure · ${c.secure}`} size="sm" />
                                  <LensBandChip band="developing" label={`Developing · ${c.developing}`} size="sm" />
                                  <LensBandChip band="emerging" label={`Emerging · ${c.emerging}`} size="sm" />
                                  <LensBandChip band="unassessed" label={`Not looked at · ${c.unassessed}`} size="sm" />
                                </>
                              );
                            })()}
                          </div>
                          <p className="mt-3 text-[11.5px] leading-relaxed text-forest-muted">
                            Two profiles, side by side. Lens does not subtract one from the other: you
                            confirmed these are the same child, and a difference between two sittings is
                            also a difference of day, of adult and of items.
                          </p>
                          <Link
                            href={`/lens/assessment/results/${m.id}`}
                            className={`${BTN_SECONDARY} mt-3 w-full text-[13.5px]`}
                          >
                            Open the earlier check-in
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {data.results.length > 0 && (
        <>
          <h2 className="mt-8 text-[12px] uppercase tracking-wider text-forest-muted">
            Milestone by milestone
          </h2>
          <div className={`${RULE} mt-2`} />

          {byDomain.map((group) => (
            <section key={group.domain} className="mt-6">
              <h3 className="mb-3 font-serif text-lg text-forest-text">{group.domain}</h3>
              <div className="flex flex-col gap-2">
                {group.rows.map((r) => (
                  <div
                    key={r.milestone_id}
                    className="rounded-xl border border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)] px-4 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-wider text-forest-muted">
                      {r.strand_name}
                      {r.expectation === 'extension' ? ' · beyond band' : ''}
                      {r.band_source === 'observation' ? ' · your observation' : ''}
                      {r.band_source === 'teacher_override' ? ' · changed by you' : ''}
                    </p>
                    <p className="mt-1 text-[14px] leading-snug text-forest-text">{r.statement}</p>
                    <div className="mt-2">
                      <LensBandChip band={r.band_final} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      <p className="mt-8 text-[11.5px] leading-relaxed text-forest-muted">
        Criterion-referenced against written milestones — not a percentile, not a rank, and not a
        comparison with the other children in the room. A milestone with too little evidence is
        reported as not looked at this time rather than guessed.
      </p>

      <Link href="/lens/assessment" className={`${BTN_SECONDARY} mt-6 w-full`}>
        Back to check-ins
      </Link>
    </main>
  );
}
