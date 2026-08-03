'use client';

/**
 * /montree/super-admin/milestones — the ORGANISATIONAL tier view of Montree Milestones.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Leadership surface. Nothing here is imported from, or linked to, │
 * │ app/montree/parent/** or components/parent/**.                                    │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠️  THIS IS A STAND-IN FOR AN ORG TIER THAT DOES NOT EXIST YET. ⚠️
 *
 * The product asks for "organisational leaders" — someone above a single principal and
 * below the platform, e.g. a chain of Montessori schools or a funder-facing programme
 * office. This codebase has no such role:
 *
 *   • the school JWT role enum is `teacher | principal | homeschool_parent | agent`
 *     (lib/montree/server-auth.ts) — nothing multi-school;
 *   • `/montree/super-admin/*` is a SEPARATE auth system (password / JWT via
 *     lib/verify-super-admin.ts) covering ALL schools, i.e. broader than an org;
 *   • there is no `montree_orgs` table and no school→org membership anywhere.
 *
 * So this page lives in the super-admin section, gated by the super-admin session the
 * rest of that section already uses, and it is written as though the org role existed:
 * it shows only schools that have opted into `child_evaluation`, one aggregate row per
 * school, no child ids, no child names, no classroom breakdown. When a real org role
 * lands, the changes are (a) `openOrgReport()` in the API route's `_shared.ts`, and
 * (b) moving this file — the payload and the rendering stay as they are.
 *
 * Schools are listed alphabetically, never ordered by figure. A league table of schools is
 * exactly the reading this product refuses, and the numbers cannot support it anyway.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import MapComparisonChart, { type MapComparisonRow } from '@/components/montree/evaluation-reports/MapComparisonChart';
import {
  Callout, Card, DataTable, EmptyState, Section, StatTile, SuppressionNote, TileRow,
} from '@/components/montree/evaluation-reports/ReportChrome';
import { T, pct, windowLabel } from '@/components/montree/evaluation-reports/tokens';

interface SchoolRowPayload {
  schoolId: string;
  name: string;
  childrenAssessed: number;
  sessionsCompleted: number;
  classroomsWithData: number;
  mapMeanPercent: number | null;
  mapMedianPercent: number | null;
  denominatorMean: number | null;
  reportableChildren: number;
  suppressed: boolean;
  suppressionReason: string | null;
  eflMapMeanPercent: number | null;
  eflSuppressed: boolean;
  eflSuppressionReason: string | null;
  unassessed: number;
  overrides: number;
  childrenWithSuppressedOwnFigure: number;
  growth: {
    fromWindow: string; pairedChildren: number; comparable: number; movedUp: number;
    steady: number; watching: number; movedUpPercent: number | null;
    suppressed: boolean; reason: string | null;
  } | null;
}

interface OrgReport {
  available: true;
  scope: { schoolYear: string; window: string; compareWindow: string | null };
  windows: Array<{ windowCode: string; completed: number; children: number }>;
  schools: SchoolRowPayload[];
  totals: {
    schools: number;
    schoolsWithData: number;
    schoolsReportable: number;
    childrenAssessed: number;
    sessionsCompleted: number;
    mapMeanPercent: number | null;
    mapMedianPercent: number | null;
    denominatorMean: number | null;
    reportableChildren: number;
    suppressed: boolean;
    suppressionReason: string | null;
    unassessed: number;
    overrides: number;
  };
  method: string | null;
}

type LoadState =
  | { kind: 'auth' }
  | { kind: 'loading' }
  | { kind: 'migration_pending'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; report: OrgReport };

/** Same session key the rest of /montree/super-admin/* uses. */
const SA_TOKEN_KEY = 'sa_session';

export default function OrgMilestonesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ kind: 'auth' });
  const [windowCode, setWindowCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SA_TOKEN_KEY);
      if (saved) setToken(saved);
    } catch { /* sessionStorage unavailable */ }
  }, []);

  const load = useCallback(async (saToken: string, requestedWindow: string | null) => {
    setState({ kind: 'loading' });
    try {
      const qs = requestedWindow ? `?windowCode=${encodeURIComponent(requestedWindow)}` : '';
      const res = await fetch(`/api/montree/evaluation/reports/org${qs}`, {
        headers: { 'x-super-admin-token': saToken },
        cache: 'no-store',
      });
      const body = await res.json().catch(() => null);
      if (res.status === 401) {
        try { sessionStorage.removeItem(SA_TOKEN_KEY); } catch { /* ignore */ }
        setToken(null);
        setState({ kind: 'auth' });
        return;
      }
      if (res.status === 503 && body?.migration_pending) {
        setState({ kind: 'migration_pending', message: body.message ?? 'The Montree Milestones tables are not installed yet.' });
        return;
      }
      if (!res.ok || !body?.available) {
        setState({ kind: 'error', message: body?.detail ?? body?.message ?? `Could not load the organisation view (${res.status}).` });
        return;
      }
      setState({ kind: 'ready', report: body as OrgReport });
      setWindowCode((body as OrgReport).scope.window);
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Could not load the organisation view.' });
    }
  }, []);

  useEffect(() => { if (token) void load(token, null); }, [token, load]);

  const signIn = useCallback(async () => {
    setAuthError(null);
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setAuthError('That did not work.'); return; }
      const next = data?.token ?? data?.session ?? null;
      if (!next) { setAuthError('Signed in, but no session token came back.'); return; }
      try {
        sessionStorage.setItem(SA_TOKEN_KEY, next);
        sessionStorage.setItem('sa_session_ts', Date.now().toString());
      } catch { /* ignore */ }
      setToken(next);
    } catch {
      setAuthError('Could not reach the sign-in service.');
    }
  }, [password]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, position: 'relative' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, background: T.glow, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '32px 22px 80px' }}>

        <header style={{ marginBottom: 26 }}>
          <Link href="/montree/super-admin" style={{ fontFamily: T.sans, fontSize: 12.5, color: T.emeraldDim, textDecoration: 'none' }}>
            ← Back to Montree Admin
          </Link>
          <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 500, color: T.textPrimary, margin: '14px 0 0', letterSpacing: -0.5 }}>
            🌱 Milestones across schools
          </h1>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary, margin: '8px 0 0', lineHeight: 1.65, maxWidth: 780 }}>
            Every school that has switched Montree Milestones on, side by side. Aggregate only — no
            child is named, and no classroom is broken out. Schools are listed alphabetically, never
            ordered by figure.
          </p>
        </header>

        {!token || state.kind === 'auth' ? (
          <Card>
            <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.textPrimary, margin: '0 0 12px' }}>Sign in</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void signIn(); }}
                placeholder="Super-admin password"
                style={{
                  flex: '1 1 240px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 10, padding: '10px 13px', color: T.textPrimary, fontFamily: T.sans, fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => void signIn()}
                style={{
                  background: T.emerald, color: '#062017', border: 'none', borderRadius: 10,
                  padding: '10px 18px', fontFamily: T.sans, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Sign in
              </button>
            </div>
            {authError ? (
              <p style={{ fontFamily: T.sans, fontSize: 12.5, color: '#f2a883', margin: '10px 0 0' }}>{authError}</p>
            ) : null}
            <p style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, margin: '14px 0 0', lineHeight: 1.6 }}>
              This is the organisation tier standing in on the platform session, because Montree has no
              multi-school-but-not-global role yet.
            </p>
          </Card>
        ) : null}

        {state.kind === 'loading' ? (
          <div className="animate-pulse" aria-hidden style={{ display: 'grid', gap: 14 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ height: i === 0 ? 96 : 220, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />
            ))}
          </div>
        ) : null}

        {state.kind === 'migration_pending' ? (
          <Card>
            <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.textPrimary, margin: '0 0 10px' }}>Almost there</h2>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.65 }}>{state.message}</p>
            <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textMuted, margin: '12px 0 0' }}>
              Run <code>migrations/314_montree_evaluation_system.sql</code>, then reload.
            </p>
          </Card>
        ) : null}

        {state.kind === 'error' ? (
          <Card>
            <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.textPrimary, margin: '0 0 10px' }}>Could not load the organisation view</h2>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.65 }}>{state.message}</p>
            <button
              type="button"
              onClick={() => token && void load(token, windowCode)}
              style={{
                marginTop: 16, background: T.emerald, color: '#062017', border: 'none', borderRadius: 10,
                padding: '9px 16px', fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </Card>
        ) : null}

        {state.kind === 'ready' ? (
          <OrgBody
            report={state.report}
            onSelectWindow={(code) => { setWindowCode(code); if (token) void load(token, code); }}
          />
        ) : null}
      </div>
    </div>
  );
}

function OrgBody({ report, onSelectWindow }: { report: OrgReport; onSelectWindow: (code: string) => void }) {
  if (!report.totals.schools) {
    return (
      <EmptyState
        headline="No school has switched Montree Milestones on"
        lead="This view fills in as soon as one school opts in and finishes a check-in."
        steps={[
          { title: 'Switch the feature on for a school', detail: 'Montree Admin → the school → ⚙️ Features → Montree Milestones (feature key child_evaluation).' },
          { title: 'Let a teacher run a check-in', detail: 'One adult, one child, about five minutes. Nothing about it is visible to parents.' },
          { title: 'Come back here', detail: 'Participation appears straight away. Percentages wait until a school has twelve children checked in.' },
        ]}
      />
    );
  }

  if (!report.totals.schoolsWithData) {
    return (
      <EmptyState
        headline={`${report.totals.schools} school${report.totals.schools === 1 ? ' has' : 's have'} it switched on — no check-ins yet`}
        lead="Everything is in place. The first finished check-in lights this page up."
        steps={[
          { title: 'Open a child in a classroom', detail: 'From any teacher dashboard at an opted-in school.' },
          { title: 'Run Number & Shape Play', detail: 'The quickest module to show someone live — about five minutes.' },
          { title: 'Finish the sitting', detail: 'The results reach this page the moment the sitting is marked finished.' },
        ]}
      />
    );
  }

  const rows: MapComparisonRow[] = report.schools.map((s) => ({
    id: s.schoolId,
    label: s.name,
    childrenAssessed: s.childrenAssessed,
    reportableChildren: s.reportableChildren,
    mapMeanPercent: s.mapMeanPercent,
    denominatorMean: s.denominatorMean,
    suppressed: s.suppressed,
    suppressionReason: s.suppressionReason,
  }));

  return (
    <>
      <Section title={`Where the organisation is — ${windowLabel(report.scope.window)}`}>
        <TileRow>
          <StatTile label="Schools switched on" value={String(report.totals.schools)} context={`${report.totals.schoolsWithData} with check-ins this window`} />
          <StatTile label="Children checked in" value={String(report.totals.childrenAssessed)} context={`${report.totals.sessionsCompleted} finished check-ins`} tone="hero" />
          <StatTile
            label="Securely met, across all schools"
            value={report.totals.suppressed ? '—' : pct(report.totals.mapMeanPercent, 1)}
            context={
              report.totals.suppressed
                ? 'Not shown for this window'
                : `across ${report.totals.reportableChildren} children, averaging ${report.totals.denominatorMean?.toFixed(0) ?? '—'} milestones each`
            }
          />
        </TileRow>
        <SuppressionNote reason={report.totals.suppressed ? report.totals.suppressionReason : null} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {report.windows.map((w) => (
            <button
              key={w.windowCode}
              type="button"
              onClick={() => onSelectWindow(w.windowCode)}
              aria-pressed={w.windowCode === report.scope.window}
              style={{
                background: w.windowCode === report.scope.window ? 'rgba(52,211,153,0.12)' : 'transparent',
                border: w.windowCode === report.scope.window ? '1px solid rgba(52,211,153,0.30)' : '1px solid rgba(255,255,255,0.12)',
                color: w.windowCode === report.scope.window ? T.emerald : T.textSecondary,
                borderRadius: 999, padding: '7px 15px', fontFamily: T.sans, fontSize: 12.5, cursor: 'pointer',
              }}
            >
              {windowLabel(w.windowCode)} · {w.children} child{w.children === 1 ? '' : 'ren'}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <Callout title="Organisation tier — standing in">
            Montree has no multi-school-but-not-global role yet, so this page runs on the platform
            session. It deliberately shows nothing a real org leader should not see: aggregates per
            school, never a child, never a classroom.
          </Callout>
        </div>
      </Section>

      <Section
        title="School by school"
        subtitle="Alphabetical, not ordered by figure. A school with fewer than twelve reportable children shows the reason rather than a number."
      >
        <Card>
          <MapComparisonChart rows={rows} unitLabel="school" />
        </Card>
      </Section>

      <Section
        title={report.scope.compareWindow ? `What moved since ${windowLabel(report.scope.compareWindow)}` : 'What moved between windows'}
        subtitle="Within-child movement, summed per school over the children with a check-in in both windows."
      >
        <Card>
          <DataTable
            head={['School', 'Children in both windows', 'Moved up', 'Steady', 'Watching', 'Share moved up']}
            rows={report.schools.map((s) => [
              s.name,
              s.growth ? s.growth.pairedChildren : '—',
              s.growth ? s.growth.movedUp : '—',
              s.growth ? s.growth.steady : '—',
              s.growth ? s.growth.watching : '—',
              s.growth && !s.growth.suppressed && s.growth.movedUpPercent !== null
                ? `${s.growth.movedUpPercent.toFixed(1)}%`
                : 'not shown',
            ])}
          />
          {report.scope.compareWindow ? null : (
            <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textSecondary, marginTop: 12, lineHeight: 1.6 }}>
              Only one window has data so far, so there is nothing to compare against yet.
            </p>
          )}
        </Card>
      </Section>

      <Section title="Participation and what is not hidden">
        <Card>
          <DataTable
            head={['School', 'Children checked in', 'Finished check-ins', 'Classrooms', 'Milestones not checked', 'Teacher-decided bands']}
            rows={report.schools.map((s) => [
              s.name, s.childrenAssessed, s.sessionsCompleted, s.classroomsWithData, s.unassessed, s.overrides,
            ])}
          />
        </Card>
        {report.method ? (
          <div style={{ marginTop: 16 }}>
            <Card>
              <p style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {report.method}
              </p>
            </Card>
          </div>
        ) : null}
      </Section>
    </>
  );
}
