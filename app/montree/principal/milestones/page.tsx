'use client';

/**
 * /montree/principal/milestones — the School Reflection view.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. This page and every component it imports are leadership          │
 * │ surfaces. Nothing here may be imported from app/montree/parent/** or             │
 * │ components/parent/**, and no link on this page points at a parent surface.       │
 * │ NOTE the name collision: app/montree/parent/milestones/ is a DEPRECATED legacy    │
 * │ parent route that has nothing to do with Montree Milestones. Leave it alone.     │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * What this is: one school, one check-in window, aggregate only. A principal asking
 * "where is my school, and what moved since last time" — not a roster, not a ranking,
 * and never a child's name. Suppression is enforced server-side; this page renders the
 * reasons the server sends rather than inventing its own.
 *
 * Gating, in the order the repo does it everywhere else:
 *   1. `/api/montree/auth/me` is the authority on whether the cookie is alive — the
 *      localStorage mirror is only used for an instant optimistic paint.
 *   2. role must be `principal`; a teacher is bounced to their own dashboard.
 *   3. the report route itself is flag-gated on `child_evaluation` and answers 503
 *      `{ available:false }` when the school has not switched Montree Milestones on;
 *      that is rendered as a friendly explanation, not an error.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BandDistributionChart, { type DomainBandRow } from '@/components/montree/evaluation-reports/BandDistributionChart';
import GrowthPanel, { type GrowthData } from '@/components/montree/evaluation-reports/GrowthPanel';
import MapComparisonChart, { type MapComparisonRow } from '@/components/montree/evaluation-reports/MapComparisonChart';
import ParticipationPanel, { type ParticipationSummary, type WindowParticipation } from '@/components/montree/evaluation-reports/ParticipationPanel';
import {
  Callout, Card, EmptyState, Section, StatTile, SuppressionNote, TileRow,
} from '@/components/montree/evaluation-reports/ReportChrome';
import { T, pct, windowLabel } from '@/components/montree/evaluation-reports/tokens';

interface DomainPayload {
  domainId: string;
  name: Record<string, string> | string;
  track: 'core' | 'efl';
  n: number;
  children: number;
  counts: DomainBandRow['counts'];
  band: DomainBandRow['band'];
  suppressed: boolean;
  suppressionReason: string | null;
}

interface ClassroomPayload {
  classroomId: string;
  name: string;
  childrenAssessed: number;
  reportableChildren: number;
  mapMeanPercent: number | null;
  denominatorMean: number | null;
  suppressed: boolean;
  suppressionReason: string | null;
}

interface Attainment {
  mapMeanPercent: number | null;
  mapMedianPercent: number | null;
  denominatorMean: number | null;
  reportableChildren: number;
  suppressed: boolean;
  suppressionReason: string | null;
  note?: string;
}

interface SchoolReport {
  available: true;
  scope: { schoolId: string; schoolYear: string; window: string; compareWindow: string | null };
  windows: WindowParticipation[];
  participation: ParticipationSummary;
  attainment: Attainment;
  eflAttainment: Attainment;
  domains: DomainPayload[];
  classrooms: ClassroomPayload[];
  growth: GrowthData | null;
  transparency: {
    unassessed: number;
    overrides: number;
    childrenWithSuppressedOwnFigure: number;
    note: string;
  };
  method: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauthorised' }
  | { kind: 'feature_off' }
  | { kind: 'migration_pending'; message: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; report: SchoolReport };

const domainName = (name: DomainPayload['name']): string =>
  typeof name === 'string' ? name : (name?.en ?? Object.values(name ?? {})[0] ?? 'Area');

export default function PrincipalMilestonesPage() {
  const router = useRouter();
  const [schoolName, setSchoolName] = useState('');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [windowCode, setWindowCode] = useState<string | null>(null);

  // Optimistic chrome from the localStorage mirror; auth/me below is the authority.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('montree_school');
      if (raw) setSchoolName((JSON.parse(raw) as { name?: string })?.name ?? '');
    } catch { /* ignore */ }
  }, []);

  const load = useCallback(async (requestedWindow: string | null) => {
    setState({ kind: 'loading' });
    try {
      const me = await fetch('/api/montree/auth/me', { credentials: 'include' });
      if (!me.ok) { setState({ kind: 'unauthorised' }); router.replace('/montree/login-select'); return; }
      const meData = await me.json();
      if (!meData?.authenticated) { setState({ kind: 'unauthorised' }); router.replace('/montree/login-select'); return; }
      if (meData.role !== 'principal') {
        // A teacher landing here has their own surfaces; this one is school-wide.
        setState({ kind: 'unauthorised' });
        router.replace('/montree/dashboard');
        return;
      }
      if (meData.school?.name) setSchoolName(meData.school.name);

      const qs = requestedWindow ? `?windowCode=${encodeURIComponent(requestedWindow)}` : '';
      const res = await fetch(`/api/montree/evaluation/reports/school${qs}`, { credentials: 'include', cache: 'no-store' });
      const body = await res.json().catch(() => null);

      if (res.status === 503 && body?.reason === 'feature_off') { setState({ kind: 'feature_off' }); return; }
      if (res.status === 503 && body?.migration_pending) {
        setState({ kind: 'migration_pending', message: body.message ?? 'The Montree Milestones tables are not installed yet.' });
        return;
      }
      if (res.status === 403) { setState({ kind: 'unauthorised' }); return; }
      if (!res.ok || !body?.available) {
        setState({ kind: 'error', message: body?.detail ?? body?.message ?? `Could not load the school view (${res.status}).` });
        return;
      }
      setState({ kind: 'ready', report: body as SchoolReport });
      setWindowCode((body as SchoolReport).scope.window);
    } catch (error) {
      setState({ kind: 'error', message: error instanceof Error ? error.message : 'Could not load the school view.' });
    }
  }, [router]);

  useEffect(() => { void load(null); }, [load]);

  const selectWindow = useCallback((code: string) => {
    setWindowCode(code);
    void load(code);
  }, [load]);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, position: 'relative' }}>
      <div aria-hidden style={{ position: 'fixed', inset: 0, background: T.glow, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: '32px 22px 80px' }}>

        <header style={{ marginBottom: 28 }}>
          <Link
            href="/montree/admin"
            style={{ fontFamily: T.sans, fontSize: 12.5, color: T.emeraldDim, textDecoration: 'none' }}
          >
            ← Back to the cockpit
          </Link>
          <h1 style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 500, color: T.textPrimary, margin: '14px 0 0', letterSpacing: -0.5 }}>
            🌱 Montree Milestones
          </h1>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary, margin: '8px 0 0', lineHeight: 1.65, maxWidth: 760 }}>
            {schoolName ? `${schoolName} — how` : 'How'} the children who have had a check-in are getting on, across the
            whole school. Developmental check-ins, three times a year, one adult sitting with one child.
            Nothing here names a child.
          </p>
        </header>

        {state.kind === 'loading' ? <LoadingBlock /> : null}

        {state.kind === 'unauthorised' ? (
          <Card>
            <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textSecondary, margin: 0, lineHeight: 1.6 }}>
              This view is for the school&apos;s principal. Taking you somewhere you can get to…
            </p>
          </Card>
        ) : null}

        {state.kind === 'feature_off' ? (
          <EmptyState
            headline="Montree Milestones is not switched on yet"
            lead="This school has not opted in. Once it is switched on, teachers can run check-ins and this page fills in on its own."
            steps={[
              { title: 'Ask Montree to switch it on', detail: 'It is a per-school switch (feature key child_evaluation). Nothing changes for parents when it is on.' },
              { title: 'Run one check-in', detail: 'A teacher opens a child, starts a check-in, and sits with them for about five minutes.' },
              { title: 'Come back here', detail: 'Participation appears immediately; figures appear once twelve children have been checked in.' },
            ]}
            footnote="Montree Milestones is a developmental check-in: one adult, one child, five minutes. Nothing a child does in a sitting is ever reported to anyone as a judgement of the child."
          />
        ) : null}

        {state.kind === 'migration_pending' ? (
          <Card>
            <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.textPrimary, margin: '0 0 10px' }}>Almost there</h2>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.65 }}>
              {state.message}
            </p>
            <p style={{ fontFamily: T.sans, fontSize: 12.5, color: T.textMuted, margin: '12px 0 0', lineHeight: 1.6 }}>
              Run <code>migrations/314_montree_evaluation_system.sql</code>, then reload this page.
            </p>
          </Card>
        ) : null}

        {state.kind === 'error' ? (
          <Card>
            <h2 style={{ fontFamily: T.serif, fontSize: 20, color: T.textPrimary, margin: '0 0 10px' }}>Could not load the school view</h2>
            <p style={{ fontFamily: T.sans, fontSize: 13.5, color: T.textSecondary, margin: 0, lineHeight: 1.65 }}>{state.message}</p>
            <button
              type="button"
              onClick={() => void load(windowCode)}
              style={{
                marginTop: 16, background: T.emerald, color: '#062017', border: 'none', borderRadius: 10,
                padding: '9px 16px', fontFamily: T.sans, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </Card>
        ) : null}

        {state.kind === 'ready' ? <ReportBody report={state.report} onSelectWindow={selectWindow} /> : null}
      </div>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="animate-pulse" aria-hidden style={{ display: 'grid', gap: 14 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ height: i === 0 ? 96 : 150, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />
      ))}
    </div>
  );
}

function ReportBody({ report, onSelectWindow }: { report: SchoolReport; onSelectWindow: (code: string) => void }) {
  const anySessions = report.windows.some((w) => w.completed > 0);

  if (!anySessions) {
    return (
      <EmptyState
        headline="No check-ins yet this school year"
        lead="Montree Milestones is switched on for this school. The moment a teacher finishes a first check-in, participation appears here."
        steps={[
          { title: 'Open a child in a classroom', detail: 'Any teacher, from their own dashboard. The Milestones tab appears on the child once the feature is on.' },
          { title: 'Run a five-minute check-in', detail: 'One adult, one child, a quiet corner. Number & Shape Play is the quickest one to show someone.' },
          { title: 'Finish the sitting', detail: 'The child sees a warm closing screen. The results reach this page as soon as the sitting is marked finished.' },
          { title: 'Watch this page fill', detail: 'Participation shows straight away. Percentages wait until twelve children have been checked in — small groups identify individuals.' },
        ]}
        footnote="A partial sitting is valid data. A teacher may stop at any point and what was done still counts."
      />
    );
  }

  const domainRows: DomainBandRow[] = report.domains.map((d) => ({
    id: d.domainId,
    label: domainName(d.name),
    track: d.track,
    n: d.n,
    children: d.children,
    counts: d.counts,
    band: d.band,
    suppressed: d.suppressed,
    suppressionReason: d.suppressionReason,
  }));

  const classroomRows: MapComparisonRow[] = report.classrooms.map((c) => ({
    id: c.classroomId,
    label: c.name,
    childrenAssessed: c.childrenAssessed,
    reportableChildren: c.reportableChildren,
    mapMeanPercent: c.mapMeanPercent,
    denominatorMean: c.denominatorMean,
    suppressed: c.suppressed,
    suppressionReason: c.suppressionReason,
  }));

  return (
    <>
      <Section
        title={`Who has been checked in — ${windowLabel(report.scope.window)}`}
        subtitle="Pick a window to look at. A window is a term-length stretch of the school year; a child is checked in once inside it, sometimes over several days."
      >
        <Card>
          <ParticipationPanel
            windows={report.windows}
            summary={report.participation}
            activeWindow={report.scope.window}
            onSelectWindow={onSelectWindow}
          />
        </Card>
      </Section>

      <Section
        title="Where the school is"
        subtitle="The share of milestones typically expected at a child's age that they have securely met, averaged across the children with a figure of their own. Always shown beside the number of children it stands for."
      >
        <TileRow>
          <StatTile
            label="Securely met, school-wide"
            value={report.attainment.suppressed ? '—' : pct(report.attainment.mapMeanPercent, 1)}
            context={
              report.attainment.suppressed
                ? 'Not shown for this window'
                : `across ${report.attainment.reportableChildren} children, averaging ${report.attainment.denominatorMean?.toFixed(0) ?? '—'} milestones each`
            }
            tone="hero"
          />
          <StatTile
            label="Middle child"
            value={report.attainment.suppressed ? '—' : pct(report.attainment.mapMedianPercent, 1)}
            context="Half the children sit above this, half below"
            tone="muted"
          />
          <StatTile
            label="English track"
            value={report.eflAttainment.suppressed ? '—' : pct(report.eflAttainment.mapMeanPercent, 1)}
            context={
              report.eflAttainment.suppressed
                ? 'Reported on its own, never merged into the figure on the left'
                : `across ${report.eflAttainment.reportableChildren} children`
            }
            tone="muted"
          />
        </TileRow>
        <SuppressionNote reason={report.attainment.suppressed ? report.attainment.suppressionReason : null} />
        <SuppressionNote reason={report.eflAttainment.suppressed ? report.eflAttainment.suppressionReason : null} />
        <div style={{ marginTop: 14 }}>
          <Callout title="What this figure is, and is not">
            It is a description of the children who were checked in, against milestones that publicly
            available early-years frameworks describe as typical at each age. It is not a norm, not a
            comparison with other schools, and it does not establish that anything here caused anything.
          </Callout>
        </div>
      </Section>

      <Section
        title="Across the areas of development"
        subtitle="Each area shows how its milestones sat across the children checked in. An area with too little evidence shows the reason instead of a picture."
      >
        <Card>
          <BandDistributionChart rows={domainRows} />
        </Card>
      </Section>

      <Section
        title="Classroom by classroom"
        subtitle="Side by side, alphabetically. Classrooms differ because their children differ; this is for noticing where to look, not for ordering the teachers."
      >
        <Card>
          {classroomRows.length ? (
            <MapComparisonChart rows={classroomRows} unitLabel="classroom" />
          ) : (
            <p style={{ fontFamily: T.sans, fontSize: 13, color: T.textSecondary, margin: 0 }}>
              No classroom has a finished check-in in this window yet.
            </p>
          )}
        </Card>
      </Section>

      <Section
        title={
          report.growth
            ? `What moved since ${windowLabel(report.growth.fromWindow)}`
            : 'What moved between windows'
        }
        subtitle="Each child compared with themselves. This is the part of the picture that holds up with a small number of children, so it is the part to lead with."
      >
        <Card>
          <GrowthPanel growth={report.growth} />
        </Card>
      </Section>

      <Section title="What we are not hiding" subtitle={report.transparency.note}>
        <TileRow>
          <StatTile label="Milestones not checked" value={String(report.transparency.unassessed)} context="Counted, never dropped from the picture" tone="muted" />
          <StatTile label="Teacher decided the band" value={String(report.transparency.overrides)} context="A teacher replaced a computed band, with a reason" tone="muted" />
          <StatTile label="Children without their own figure" value={String(report.transparency.childrenWithSuppressedOwnFigure)} context="Too few milestones checked to express as a share" tone="muted" />
        </TileRow>
        <div style={{ marginTop: 16 }}>
          <Card>
            <p style={{ fontFamily: T.sans, fontSize: 12, color: T.textMuted, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
              {report.method}
            </p>
          </Card>
        </div>
      </Section>
    </>
  );
}
