'use client';

/**
 * The Milestones tab on a child's profile.
 *
 * WHO THIS IS FOR: teachers and principals. It is a reflection tool — the shape of one
 * child's development next to their own last check-in, so a teacher can decide what to
 * put on a shelf on Monday. It is NOT a parent surface. Nothing in
 * `components/montree/evaluation/*` may be imported from `app/montree/parent/*`; the
 * parent-facing story is the Growth Story, written deliberately, not this working view.
 *
 * The guard rules on this screen are the product, not decoration:
 *   • Growth is the headline. MAP% is secondary context (ARCHITECTURE.md §2.5).
 *   • MAP% is suppressed below n=12 and the REASON is shown in its place — never a
 *     smaller-print number, never a dash.
 *   • A domain below n=6 shows a band chip, never a percentage.
 *   • The English track is reported on its own and never folded into the main figure.
 *   • "Not looked at this time" is always printed. Selective reporting is a build defect.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';
import { resolveLocalized } from '@/lib/montree/i18n/localized-types';
import { BandChip } from './BandChip';
import { T, SANS, SERIF } from './tokens';

/* ─────────────────────────────────────────────────────────── payload shapes */

type BandKey = 'secure' | 'developing' | 'emerging' | 'unassessed';

interface MapPayload {
  track: string;
  mapPercent: number | null;
  denominator: number;
  met: number;
  exceeded: number;
  unassessed: number;
  suppressed: boolean;
  suppressionReason: string | null;
  counts: Record<BandKey, number>;
}

interface DomainPayload {
  domainId: string;
  track: string;
  n: number;
  counts: Record<BandKey, number>;
  band: BandKey | null;
  suppressed: boolean;
}

interface GrowthPayload {
  fromWindow: string | null;
  toWindow: string | null;
  comparable: number;
  movedUp: number;
  steady: number;
  watching: number;
  newlyAssessed: number;
  noLongerAssessed: number;
}

interface MilestonePayload {
  milestoneId: string;
  domainId: string;
  strandId: string;
  bandFinal: BandKey;
  expectation: string;
  statement?: Record<string, string>;
  domainName?: Record<string, string> | null;
  strandName?: Record<string, string> | null;
}

interface ReportPayload {
  available?: boolean;
  message?: string;
  schoolYear?: string;
  window?: string;
  /** `ageBand` is the band of the check-in being shown, not the child's age today. */
  child?: { id: string; name: string | null; ageMonths: number | null; ageBand: string | null };
  session?: { id: string; window_code: string; completed_at: string | null } | null;
  headline?: {
    growthSentence: string | null;
    profileSentence: string | null;
    englishSentence: string | null;
    growth: GrowthPayload | null;
    map: MapPayload;
    efl: MapPayload;
  };
  domains?: DomainPayload[];
  milestones?: MilestonePayload[];
  /**
   * Present only when the language-of-assessment gate stood a strand down — i.e. a
   * non-English sitting, where the English-medium core literacy strands (phonological
   * awareness, print & alphabet) are deliberately not administered rather than translated.
   * Null on every English check-in.
   */
  localeSuppression?: {
    reason: string;
    assessmentLocale: string;
    strandIds: string[];
    strandNames: Array<Record<string, string> | null>;
    milestoneCount: number;
  } | null;
  history?: Array<{ sessionId: string; schoolYear: string; window: string; completedAt: string | null }>;
  method?: { statement: string; caveat: string; bankVersion: string };
}

interface SessionRow {
  id: string;
  school_year: string;
  window_code: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  age_band: string;
  form_code: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'feature_off' }
  | { kind: 'migration_pending' }
  | { kind: 'error'; detail: string };

const WINDOWS = ['autumn', 'winter', 'spring'] as const;

const MAP_MIN_N = 12;
const DOMAIN_MIN_N = 6;

/** Secure share of the milestones actually looked at, above which A5 has been outgrown. */
const CANOPY_READY_SECURE_PERCENT = 80;

/* ────────────────────────────────────────────────────────────── the panel */

export function MilestonesPanel({ childId }: { childId: string }) {
  const { t, locale } = useI18n();
  const { isEnabled } = useFeatures();
  const canopyOn = isEnabled('child_evaluation_g1');
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const [reportRes, sessionsRes] = await Promise.all([
        fetch(`/api/montree/evaluation/child/${childId}/report`),
        fetch(`/api/montree/evaluation/sessions?childId=${encodeURIComponent(childId)}&limit=60`),
      ]);

      // 503 with a reason is the module telling us WHY, not a failure to hide.
      if (reportRes.status === 503) {
        const body = await reportRes.json().catch(() => ({}));
        setState({ kind: body?.reason === 'migration_pending' ? 'migration_pending' : 'feature_off' });
        return;
      }
      if (!reportRes.ok) {
        const body = await reportRes.text().catch(() => '');
        setState({ kind: 'error', detail: `${reportRes.status} ${body.slice(0, 160)}` });
        return;
      }

      setReport((await reportRes.json()) as ReportPayload);
      if (sessionsRes.ok) {
        const body = await sessionsRes.json();
        setSessions((body?.sessions ?? []) as SessionRow[]);
      }
      setState({ kind: 'ready' });
    } catch (error) {
      setState({ kind: 'error', detail: (error as Error).message });
    }
  }, [childId]);

  useEffect(() => { void load(); }, [load]);

  const schoolYear = report?.schoolYear ?? sessions[0]?.school_year ?? '';
  const yearSessions = useMemo(
    () => sessions.filter((s) => !schoolYear || s.school_year === schoolYear),
    [sessions, schoolYear],
  );

  const domainNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of report?.milestones ?? []) {
      if (m.domainName && !map.has(m.domainId)) {
        map.set(m.domainId, resolveLocalized(m.domainName, locale));
      }
    }
    return map;
  }, [report, locale]);

  const bandLabel = useCallback((band: string | null): string => {
    if (band === 'secure') return t('milestones.secure');
    if (band === 'developing') return t('milestones.developing');
    if (band === 'emerging') return t('milestones.emerging');
    return t('milestones.unassessed');
  }, [t]);

  const windowLabel = useCallback((code: string): string => {
    if (code === 'autumn') return t('milestones.windowAutumn');
    if (code === 'winter') return t('milestones.windowWinter');
    if (code === 'spring') return t('milestones.windowSpring');
    return code;
  }, [t]);

  const startHref = `/montree/dashboard/${childId}/milestones/run`;

  if (state.kind === 'loading') {
    return <Shell><p style={{ color: T.textMute }}>{t('milestones.loading')}</p></Shell>;
  }
  if (state.kind === 'feature_off') {
    return (
      <Shell>
        <Notice title={t('milestones.featureOffTitle')} body={t('milestones.featureOffBody')} />
      </Shell>
    );
  }
  if (state.kind === 'migration_pending') {
    return (
      <Shell>
        <Notice title={t('milestones.migrationPendingTitle')} body={t('milestones.migrationPendingBody')} />
      </Shell>
    );
  }
  if (state.kind === 'error') {
    return (
      <Shell>
        <Notice title={t('milestones.loadFailed')} body={state.detail} />
        <button onClick={() => void load()} className="btn btn-primary btn-md">{t('common.tryAgain')}</button>
      </Shell>
    );
  }

  const headline = report?.headline;
  const growth = headline?.growth ?? null;
  const counts = countMilestones(report?.milestones ?? []);
  const hasSession = !!report?.session;

  /**
   * Ready for Montree Canopy?
   *
   * A child on the TOP kindergarten band (A5) who is either already reaching past it
   * (at least one milestone banded secure on an `extension` expectation — that is what
   * `exceeded` counts) or is secure across four fifths of what was actually looked at, has
   * outgrown this tier. This is a SUGGESTION to the teacher, never an automatic promotion:
   * the teacher chooses G1 in the runner, exactly as they choose any other band.
   *
   * Gated on the school having Canopy switched on — pointing at a tier they cannot start
   * would be an advert, not a prompt.
   *
   * NOT a hook: this sits BELOW the early returns above, so a `useMemo` here would be a
   * conditionally-called hook. It is a cheap derivation over numbers already in hand.
   */
  const readyForCanopy = isReadyForCanopy({
    canopyOn,
    hasSession,
    sessionBand: report?.child?.ageBand ?? null,
    counts,
    exceeded: headline?.map?.exceeded ?? 0,
  });

  return (
    <Shell>
      {/* Title + the one action that matters */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ flex: '1 1 260px' }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, margin: 0, color: T.text }}>
            🌱 {t('milestones.title')}
          </h2>
          <p style={{ color: T.textMute, fontSize: 13, margin: '6px 0 0', maxWidth: 560, lineHeight: 1.5 }}>
            {t('milestones.intro')}
          </p>
        </div>
        <Link href={startHref} className="btn btn-primary btn-md" style={{ textDecoration: 'none' }} data-guide="milestones-start">
          {t('milestones.start')}
        </Link>
      </div>

      {/* Windows across the year */}
      <Card>
        <CardTitle>{t('milestones.windows')}{schoolYear ? ` · ${schoolYear}` : ''}</CardTitle>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          {WINDOWS.map((code) => {
            const row = yearSessions.find((s) => s.window_code === code);
            return (
              <div key={code} style={{
                border: `1px solid ${T.border}`, borderRadius: 14, padding: '12px 14px',
                background: row ? T.emeraldSoft : 'rgba(255,255,255,0.03)',
              }}>
                <div style={{ fontFamily: SERIF, fontSize: 15, color: T.text }}>{windowLabel(code)}</div>
                <div style={{ fontSize: 12, color: T.textMute, marginTop: 4 }}>
                  {!row && t('milestones.windowEmpty')}
                  {row?.status === 'in_progress' && t('milestones.inProgress')}
                  {row?.completed_at && t('milestones.completedOn', { date: formatDate(row.completed_at, locale) })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {!hasSession && (
        <Card>
          <CardTitle>{t('milestones.noneTitle')}</CardTitle>
          <p style={{ color: T.textMd, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{t('milestones.noneBody')}</p>
        </Card>
      )}

      {/* Ready for the next tier. A quiet gold note, not a badge — the teacher decides. */}
      {readyForCanopy && (
        <div style={{
          background: 'rgba(232,201,106,0.07)', border: '1px solid rgba(232,201,106,0.30)',
          borderRadius: 16, padding: '14px 18px', marginBottom: 14,
        }}>
          <div style={{ fontFamily: SERIF, fontSize: 16, color: '#E8C96A', marginBottom: 6 }}>
            🌿 {t('milestones.canopyReadyTitle')}
          </div>
          <p style={{ color: T.textMd, fontSize: 13.5, lineHeight: 1.6, margin: '0 0 12px', maxWidth: 620 }}>
            {t('milestones.canopyReadyBody')}
          </p>
          <Link href={startHref} className="btn btn-secondary btn-md" style={{ textDecoration: 'none' }}>
            {t('milestones.canopyReadyCta')}
          </Link>
        </div>
      )}

      {hasSession && (
        <>
          {/* Growth is the headline (§2.5) — it sits above the profile figure, deliberately. */}
          <Card>
            <CardTitle>{t('milestones.growth')}</CardTitle>
            {growth ? (
              <>
                <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.5, color: T.text, margin: '0 0 14px' }}>
                  {headline?.growthSentence}
                </p>
                <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                  <Stat value={growth.movedUp} label={t('milestones.movedUp')} accent={T.emerald} />
                  <Stat value={growth.steady} label={t('milestones.steady')} accent={T.textMd} />
                  <Stat value={growth.watching} label={t('milestones.watching')} accent={T.amber} />
                </div>
              </>
            ) : (
              <p style={{ color: T.textMute, fontSize: 14, margin: 0 }}>{t('milestones.growthNone')}</p>
            )}
            <p style={{ color: T.textMute, fontSize: 12, marginTop: 14, marginBottom: 0, lineHeight: 1.5 }}>
              {t('milestones.withinChild')}
            </p>
          </Card>

          {/* MAP — with its suppression rules stated in place of any figure it may not show. */}
          <Card>
            <CardTitle>{t('milestones.map')}</CardTitle>
            <MapBlock map={headline?.map} t={t} minN={MAP_MIN_N} sentence={headline?.profileSentence ?? null} />
            {(headline?.efl?.denominator ?? 0) > 0 || headline?.efl?.suppressed ? (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 13, color: T.textMd, marginBottom: 8 }}>{t('milestones.mapEnglish')}</div>
                <MapBlock map={headline?.efl} t={t} minN={MAP_MIN_N} sentence={headline?.englishSentence ?? null} english />
              </div>
            ) : null}
            <p style={{ color: T.textMute, fontSize: 11.5, marginTop: 16, marginBottom: 0, lineHeight: 1.5 }}>
              {t('milestones.mapCaveat')}
            </p>
          </Card>

          {/* Coverage — the unassessed count is always printed. */}
          <Card>
            <CardTitle>{t('milestones.coverage')}</CardTitle>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
              <CountChip band="secure" label={t('milestones.secure')} n={counts.secure} />
              <CountChip band="developing" label={t('milestones.developing')} n={counts.developing} />
              <CountChip band="emerging" label={t('milestones.emerging')} n={counts.emerging} />
              <CountChip band="unassessed" label={t('milestones.unassessed')} n={counts.unassessed} />
            </div>
            <p style={{ color: T.textMute, fontSize: 12, margin: 0 }}>
              {t('milestones.milestonesTotal', { n: counts.total })}
            </p>
            {/* The language-of-assessment gate, printed rather than hidden. A gap the
                instrument chose is still a gap the teacher is owed an explanation for. */}
            {report?.localeSuppression && (
              <p style={{
                color: T.textMd, fontSize: 12, lineHeight: 1.6, margin: '12px 0 0',
                paddingTop: 12, borderTop: `1px solid ${T.border}`, maxWidth: 640,
              }}>
                {t('milestones.localeSuppressedNote', {
                  strands: report.localeSuppression.strandNames
                    .map((n) => (n ? resolveLocalized(n, locale) : ''))
                    .filter(Boolean)
                    .join(' · '),
                  n: report.localeSuppression.milestoneCount,
                })}
              </p>
            )}
          </Card>

          {/* Domains — a band chip below n=6, never a figure. */}
          <Card>
            <CardTitle>{t('milestones.domains')}</CardTitle>
            <div style={{ display: 'grid', gap: 10 }}>
              {(report?.domains ?? []).map((d) => (
                <div key={d.domainId} style={{
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  padding: '10px 0', borderBottom: `1px solid ${T.border}`,
                }}>
                  <span style={{ flex: '1 1 180px', color: T.textMd, fontSize: 14 }}>
                    {domainNames.get(d.domainId) ?? d.domainId}
                  </span>
                  <BandChip band={d.band ?? 'unassessed'} label={bandLabel(d.band)} dark size="sm" />
                  <span style={{ color: T.textMute, fontSize: 12 }}>
                    {t('milestones.mapOf', { n: d.n })}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ color: T.textMute, fontSize: 11.5, marginTop: 12, marginBottom: 0 }}>
              {t('milestones.domainSmallN', { n: DOMAIN_MIN_N })}
            </p>
          </Card>
        </>
      )}
    </Shell>
  );
}

/* ────────────────────────────────────────────────────────────── small parts */

function MapBlock({
  map, t, minN, sentence, english = false,
}: {
  map: MapPayload | undefined;
  t: ReturnType<typeof useI18n>['t'];
  minN: number;
  sentence: string | null;
  english?: boolean;
}) {
  if (!map) return null;
  if (map.suppressed || map.mapPercent === null) {
    return (
      <div>
        <div style={{ fontFamily: SERIF, fontSize: 20, color: T.textMd }}>{t('milestones.mapSuppressed')}</div>
        <p style={{ color: T.textMute, fontSize: 12.5, lineHeight: 1.55, margin: '8px 0 0', maxWidth: 620 }}>
          {english && map.suppressionReason?.includes('efl')
            ? t('milestones.mapSuppressedEfl')
            : t('milestones.mapSuppressedSmallN', { n: minN })}
        </p>
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: SERIF, fontSize: 40, lineHeight: 1, color: T.emerald }}>{map.mapPercent}%</span>
        <span style={{ color: T.textMute, fontSize: 13 }}>{t('milestones.mapOf', { n: map.denominator })}</span>
      </div>
      {sentence && (
        <p style={{ color: T.textMd, fontSize: 13.5, lineHeight: 1.55, margin: '10px 0 0', maxWidth: 640 }}>
          {sentence}
        </p>
      )}
    </div>
  );
}

function Stat({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div>
      <div style={{ fontFamily: SERIF, fontSize: 30, lineHeight: 1, color: accent }}>{value}</div>
      <div style={{ fontSize: 12, color: T.textMute, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function CountChip({ band, label, n }: { band: string; label: string; n: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <BandChip band={band} label={`${label} · ${n}`} dark size="sm" />
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16,
      padding: '16px 18px', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase', color: T.textMute, margin: '0 0 12px',
    }}>
      {children}
    </h3>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)',
      borderRadius: 16, padding: '16px 18px', marginBottom: 14,
    }}>
      <div style={{ fontFamily: SERIF, fontSize: 17, color: T.text, marginBottom: 6 }}>{title}</div>
      <p style={{ color: T.textMd, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{body}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: SANS, paddingBottom: 40 }}>{children}</div>;
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 48, padding: '12px 22px', borderRadius: 14, border: 0,
    background: primary ? T.emerald : T.glassBtn,
    color: primary ? '#08170e' : '#fff',
    fontFamily: SANS, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  };
}

/**
 * Has this child outgrown the kindergarten tier? See the call site for the reasoning.
 * Pure, so the rule can be read (and changed) in one place without touching the render.
 */
function isReadyForCanopy(input: {
  canopyOn: boolean;
  hasSession: boolean;
  sessionBand: string | null;
  counts: ReturnType<typeof countMilestones>;
  exceeded: number;
}): boolean {
  if (!input.canopyOn || !input.hasSession) return false;
  if (input.sessionBand !== 'A5') return false;   // only the TOP kindergarten band graduates
  const assessed = input.counts.secure + input.counts.developing + input.counts.emerging;
  if (assessed === 0) return false;               // nothing was looked at — nothing to say
  if (input.exceeded >= 1) return true;           // already reaching past the band
  return (input.counts.secure / assessed) * 100 >= CANOPY_READY_SECURE_PERCENT;
}

function countMilestones(rows: MilestonePayload[]) {
  const counts = { secure: 0, developing: 0, emerging: 0, unassessed: 0, total: rows.length };
  for (const r of rows) {
    if (r.bandFinal === 'secure') counts.secure += 1;
    else if (r.bandFinal === 'developing') counts.developing += 1;
    else if (r.bandFinal === 'emerging') counts.emerging += 1;
    else counts.unassessed += 1;
  }
  return counts;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'zh' ? 'zh-CN' : locale, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default MilestonesPanel;
