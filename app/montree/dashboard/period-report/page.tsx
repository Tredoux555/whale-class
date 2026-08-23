// /montree/dashboard/period-report/page.tsx
// Weekly & Monthly Report — one glanceable page per classroom: a children ×
// areas heatmap, a card per child (area bars, status movement, top works,
// concentration, notes), a class summary strip, and a Print button that lays
// the same thing out as a clean A4 one-pager.
//
// Read-only view over GET /api/montree/reports/period (the PeriodAggregate).
// No chart library — heatmap cells and bars are plain divs, as in Work Rhythm.
// Colours are the SHEET_AREA_META palette so the printed record sheet, Work
// Rhythm and this page all speak the same colour language.
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { BarChart3, ChevronLeft, ChevronRight, Printer, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';
import { AREA_ORDER, type AreaKey, type ChildAggregate, type PeriodAggregate, type PeriodType } from '@/lib/montree/reports/period-types';
import {
  AREA_COLORS,
  AREA_ABBR,
  areaShares,
  classSummary,
  concentrationTotals,
  formatPeriodLabel,
  hasAnySignal,
  heatIntensity,
  heatTextColor,
  heatmapMax,
  hexToRgba,
  movementChips,
  shiftPeriodStart,
  snapPeriodStart,
  todayInOffset,
  topWorks,
} from '@/lib/montree/reports/period-report-view';

type AiLines = Record<string, string>;

interface ApiPayload {
  success: boolean;
  error?: string;
  aggregate?: PeriodAggregate;
  ai_lines?: AiLines;
  cached?: boolean;
}

// Before the API answers we do not know the school's timezone; +8 (Whale
// Class) is the house default and only decides which period opens first.
const DEFAULT_UTC_OFFSET_HOURS = 8;

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 10mm; }
  html, body { background: #ffffff !important; }
  .pr-screen-only { display: none !important; }
  .pr-root { background: #ffffff !important; color: #111827 !important; min-height: 0 !important; }
  .pr-root * { box-shadow: none !important; text-shadow: none !important; }
  .pr-page { max-width: none !important; padding: 0 !important; margin: 0 !important; }
  .pr-panel { background: #ffffff !important; border: 1px solid #d1d5db !important; color: #111827 !important; break-inside: avoid; }
  .pr-muted { color: #4b5563 !important; }
  .pr-strong { color: #111827 !important; }
  .pr-heat-name { color: #111827 !important; }
  .pr-cards { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 4mm !important; }
  .pr-card { padding: 2.5mm !important; font-size: 9pt !important; }
  .pr-card .pr-ai { display: none !important; }
  .pr-heat td, .pr-heat th { padding: 1mm 1.5mm !important; font-size: 8.5pt !important; }
  .pr-summary { margin-bottom: 3mm !important; }
  .pr-print-title { display: block !important; }
}
`;

function firstName(name: string): string {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed.split(/\s+/)[0] : '';
}

export default function PeriodReportPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isEnabled, loading: featuresLoading } = useFeatures();

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [classroomId, setClassroomId] = useState<string>('');
  const [classroomName, setClassroomName] = useState<string>('');
  const [featureDisabled, setFeatureDisabled] = useState(false);

  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [periodStart, setPeriodStart] = useState<string>(() => snapPeriodStart('week', todayInOffset(DEFAULT_UTC_OFFSET_HOURS)));
  const [aggregate, setAggregate] = useState<PeriodAggregate | null>(null);
  const [aiLines, setAiLines] = useState<AiLines>({});
  const [aiBusy, setAiBusy] = useState(false);
  const [showAi, setShowAi] = useState(false);

  // ── Session ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    if (sess.classroom?.id) setClassroomId(sess.classroom.id);
    if (sess.classroom?.name) setClassroomName(sess.classroom.name);
    setLoading(false);
  }, [router]);

  // ── Load ────────────────────────────────────────────────────────────────
  const load = useCallback(async (refresh = false) => {
    setFetching(true);
    try {
      const qs = new URLSearchParams({ type: periodType, start: periodStart });
      if (classroomId) qs.set('classroom_id', classroomId);
      if (refresh) qs.set('refresh', '1');
      const res = await montreeApi(`/api/montree/reports/period?${qs.toString()}`);
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === 'feature_disabled') setFeatureDisabled(true);
        return;
      }
      if (!res.ok) throw new Error(`Period report: ${res.status}`);
      const data = (await res.json()) as ApiPayload;
      if (!data.success || !data.aggregate) throw new Error(data.error || 'bad payload');
      setAggregate(data.aggregate);
      setAiLines(data.ai_lines ?? {});
      // The server snaps the start to the school's own Monday/1st; adopt it so
      // prev/next step from the same anchor the data was built on.
      if (data.aggregate.period_start !== periodStart) setPeriodStart(data.aggregate.period_start);
    } catch (err) {
      console.error('[period-report] Load error:', err);
      toast.error(t('periodReport.loadFailed'));
    } finally {
      setFetching(false);
    }
  }, [classroomId, periodType, periodStart, t]);

  useEffect(() => {
    if (loading) return;
    void load(false);
  }, [loading, load]);

  const changeType = (next: PeriodType) => {
    if (next === periodType) return;
    setPeriodType(next);
    setPeriodStart(snapPeriodStart(next, periodStart));
  };
  const step = (delta: number) => setPeriodStart(shiftPeriodStart(periodType, periodStart, delta));

  const generateAi = async () => {
    setAiBusy(true);
    try {
      const qs = new URLSearchParams({ type: periodType, start: periodStart, ai: '1' });
      if (classroomId) qs.set('classroom_id', classroomId);
      const res = await montreeApi(`/api/montree/reports/period?${qs.toString()}`, { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as ApiPayload;
      if (!res.ok || !body.success) throw new Error(body.error || `AI lines: ${res.status}`);
      setAiLines(body.ai_lines ?? {});
      setShowAi(true);
    } catch (err) {
      console.error('[period-report] AI error:', err);
      toast.error(t('periodReport.aiFailed'));
    } finally {
      setAiBusy(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const summary = useMemo(() => (aggregate ? classSummary(aggregate) : null), [aggregate]);
  const heatMax = useMemo(() => (aggregate ? heatmapMax(aggregate.heatmap) : 0), [aggregate]);
  const signal = aggregate ? hasAnySignal(aggregate) : false;
  const periodLabel = aggregate
    ? formatPeriodLabel(aggregate.period_type, aggregate.period_start, aggregate.period_end, locale)
    : '';
  const areaLabel = useCallback((a: AreaKey) => t(`area.${a}` as Parameters<typeof t>[0]), [t]);
  const minutesLabel = useCallback((n: number) => t('periodReport.minutesShort', { n: Math.round(n) }), [t]);

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading || featuresLoading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const glow = (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none pr-screen-only"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
    />
  );

  if (!isEnabled('period_reports') || featureDisabled) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] p-6 relative">
        {glow}
        <Toaster position="top-center" />
        <div className="relative max-w-lg mx-auto text-center py-20">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-emerald-400/70" />
          <h1 className="text-2xl font-bold text-white/95 mb-3">{t('periodReport.disabledTitle')}</h1>
          <p className="text-white/60 mb-6">{t('periodReport.disabledBody')}</p>
          <p className="text-sm text-white/40">{t('periodReport.contactAdmin')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-root min-h-screen bg-[#0a1a0f] relative">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      {glow}
      <Toaster position="top-center" />

      {/* Header */}
      <div className="pr-screen-only relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/montree/dashboard')} className="btn btn-ghost btn-md" aria-label={t('common.back')}>
          ←
        </button>
        <h1 className="text-lg font-semibold text-white/95 flex items-center gap-2 flex-1 min-w-0">
          <BarChart3 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="truncate">{t('periodReport.title')}</span>
        </h1>
        <button
          onClick={() => load(true)}
          disabled={fetching}
          className="btn btn-ghost btn-sm"
          aria-label={t('periodReport.refresh')}
          title={t('periodReport.refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={() => window.print()}
          disabled={!aggregate || !signal}
          className="btn btn-secondary btn-sm btn-pill flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">{t('periodReport.print')}</span>
        </button>
      </div>

      <div className="pr-page relative max-w-4xl mx-auto p-4 pb-28">
        {/* Print-only title line */}
        <div className="pr-print-title hidden mb-3">
          <div className="text-base font-semibold">
            {t(periodType === 'week' ? 'periodReport.weeklyReport' : 'periodReport.monthlyReport')}
            {classroomName ? ` · ${classroomName}` : ''}
          </div>
          <div className="text-sm">{periodLabel}</div>
        </div>

        {/* Period controls */}
        <div className="pr-screen-only flex flex-wrap items-center gap-2 mb-4">
          <div className="flex gap-1.5">
            {(['week', 'month'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => changeType(p)}
                aria-pressed={periodType === p}
                className={periodType === p ? 'btn btn-primary btn-sm btn-pill' : 'btn btn-secondary btn-sm btn-pill'}
              >
                {p === 'week' ? t('periodReport.week') : t('periodReport.month')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => step(-1)} className="btn btn-ghost btn-sm" aria-label={t('periodReport.prevPeriod')}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-white/85 font-medium min-w-[9rem] text-center tabular-nums">
              {periodLabel || periodStart}
            </span>
            <button onClick={() => step(1)} className="btn btn-ghost btn-sm" aria-label={t('periodReport.nextPeriod')}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="pr-screen-only flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          {AREA_ORDER.map((area) => (
            <span key={area} className="flex items-center gap-1.5 text-[11px] text-white/60">
              <span aria-hidden className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: AREA_COLORS[area] }} />
              {areaLabel(area)}
            </span>
          ))}
        </div>

        {fetching && !aggregate && (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Warnings — discreet */}
        {aggregate && aggregate.warnings.length > 0 && (
          <details className="pr-screen-only mb-4 text-[11px] text-amber-200/70">
            <summary className="cursor-pointer flex items-center gap-1.5 select-none">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('periodReport.warnings', { n: aggregate.warnings.length })}
            </summary>
            <ul className="mt-1.5 pl-5 list-disc space-y-0.5 text-amber-100/60">
              {aggregate.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </details>
        )}

        {/* Empty state */}
        {aggregate && !signal && !fetching && (
          <div className="pr-panel rounded-2xl border border-[rgba(52,211,153,0.2)] bg-white/[0.06] p-6 text-center">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-emerald-400/70" />
            <h2 className="pr-strong text-lg font-semibold text-white/95 mb-2">{t('periodReport.emptyTitle')}</h2>
            <p className="pr-muted text-sm text-white/60">{t('periodReport.emptyBody')}</p>
          </div>
        )}

        {aggregate && signal && summary && (
          <>
            {/* (c) Class summary strip */}
            <div className="pr-summary grid grid-cols-3 gap-2 mb-4">
              <Stat label={t('periodReport.totalSessions')} value={summary.total_sessions} />
              <Stat label={t('periodReport.masteredThisPeriod')} value={summary.mastered_count} />
              <Stat
                label={t('periodReport.childrenActive')}
                value={`${summary.children_active}/${aggregate.children.length}`}
              />
            </div>
            {(summary.children_silent > 0 || summary.gaps.length > 0) && (
              <div className="pr-panel pr-muted mb-4 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[12px] text-amber-100/80 space-y-1">
                {summary.children_silent > 0 && (
                  <div>
                    <span className="font-medium">{t('periodReport.nowhere', { n: summary.children_silent })}: </span>
                    {aggregate.children.filter((c) => c.total_sessions === 0).map((c) => firstName(c.name)).join(', ')}
                  </div>
                )}
                {summary.gaps.length > 0 && (
                  <div>
                    <span className="font-medium">{t('periodReport.gaps', { n: summary.gaps.length })}: </span>
                    {summary.gaps.map((g) => `${firstName(g.name)} (${g.areas.map((a) => AREA_ABBR[a]).join(' ')})`).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* (a) Heatmap */}
            <div className="pr-panel rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-3 mb-4 overflow-x-auto">
              <table className="pr-heat w-full border-separate border-spacing-1 text-[12px]">
                <thead>
                  <tr>
                    <th className="pr-muted text-left font-medium text-white/50 pl-1">{t('periodReport.child')}</th>
                    {AREA_ORDER.map((area) => (
                      <th key={area} className="font-semibold text-center" style={{ color: AREA_COLORS[area] }} title={areaLabel(area)}>
                        <span className="sm:hidden">{AREA_ABBR[area]}</span>
                        <span className="hidden sm:inline">{areaLabel(area)}</span>
                      </th>
                    ))}
                    <th className="pr-muted text-center font-medium text-white/50">Σ</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregate.children.map((child, row) => (
                    <tr key={child.child_id}>
                      <td className="pr-heat-name text-white/85 whitespace-nowrap pl-1 pr-2 max-w-[7rem] truncate">{firstName(child.name) || child.name}</td>
                      {AREA_ORDER.map((area, col) => {
                        const v = aggregate.heatmap[row]?.[col] ?? child.by_area[area]?.sessions ?? 0;
                        const k = heatIntensity(v, heatMax);
                        return (
                          <td
                            key={area}
                            className="text-center rounded-md tabular-nums font-medium h-8 min-w-[2.4rem]"
                            style={{
                              backgroundColor: k === 0 ? 'rgba(255,255,255,0.04)' : hexToRgba(AREA_COLORS[area], 0.15 + 0.85 * k),
                              color: heatTextColor(k, true),
                            }}
                            title={`${areaLabel(area)} · ${t('periodReport.sessions', { n: v })} · ${minutesLabel(child.by_area[area]?.minutes_est ?? 0)}`}
                          >
                            {v > 0 ? v : '·'}
                          </td>
                        );
                      })}
                      <td className="pr-strong text-center tabular-nums text-white/70">{child.total_sessions}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pr-muted text-white/50 pl-1 pt-1 font-medium">{t('periodReport.total')}</td>
                    {AREA_ORDER.map((area) => (
                      <td key={area} className="pr-strong text-center tabular-nums font-semibold pt-1" style={{ color: AREA_COLORS[area] }}>
                        {aggregate.class_totals[area]?.sessions ?? 0}
                      </td>
                    ))}
                    <td className="pr-strong text-center tabular-nums font-semibold text-white/85 pt-1">{summary.total_sessions}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* AI lines toggle */}
            <div className="pr-screen-only flex items-center gap-2 mb-3">
              <button
                onClick={() => (Object.keys(aiLines).length > 0 ? setShowAi((s) => !s) : generateAi())}
                disabled={aiBusy}
                className="btn btn-secondary btn-sm btn-pill flex items-center gap-1.5"
              >
                <Sparkles className={`w-4 h-4 ${aiBusy ? 'animate-pulse' : ''}`} />
                {aiBusy
                  ? t('periodReport.aiWorking')
                  : Object.keys(aiLines).length > 0
                    ? (showAi ? t('periodReport.aiHide') : t('periodReport.aiShow'))
                    : t('periodReport.aiGenerate')}
              </button>
              {Object.keys(aiLines).length > 0 && (
                <button onClick={generateAi} disabled={aiBusy} className="btn btn-ghost btn-sm text-white/50">
                  {t('periodReport.aiRegenerate')}
                </button>
              )}
            </div>

            {/* (b) Child cards */}
            <div className="pr-cards grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {aggregate.children.map((child) => (
                <ChildCard
                  key={child.child_id}
                  child={child}
                  aiLine={showAi ? aiLines[child.child_id] : undefined}
                  areaLabel={areaLabel}
                  minutesLabel={minutesLabel}
                  t={t}
                />
              ))}
            </div>

            <p className="pr-screen-only text-[11px] text-white/35 mt-5">{t('periodReport.estimateNote')}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── pieces ─────────────────────────

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="pr-panel rounded-xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] px-3 py-2">
      <div className="pr-strong text-xl font-bold text-white/95 tabular-nums leading-tight">{value}</div>
      <div className="pr-muted text-[11px] text-white/50 leading-tight">{label}</div>
    </div>
  );
}

interface ChildCardProps {
  child: ChildAggregate;
  aiLine?: string;
  areaLabel: (a: AreaKey) => string;
  minutesLabel: (n: number) => string;
  t: ReturnType<typeof useI18n>['t'];
}

function ChildCard({ child, aiLine, areaLabel, minutesLabel, t }: ChildCardProps) {
  const shares = areaShares(child);
  const chips = movementChips(child, 4);
  const works = topWorks(child, 3);
  const conc = concentrationTotals(child);
  const concTotal = conc.wd + conc.wc + conc.dc;
  const silent = child.total_sessions === 0;
  const statusLabel = (s: 'presented' | 'practicing' | 'mastered') =>
    t(s === 'mastered' ? 'periodReport.statusMastered' : s === 'practicing' ? 'periodReport.statusPracticing' : 'periodReport.statusPresented');

  return (
    <div className={`pr-card pr-panel rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-3 ${silent ? 'opacity-70' : ''}`}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="pr-strong font-semibold text-white/95 truncate">{child.name}</div>
        <div className="pr-muted text-[11px] text-white/45 tabular-nums whitespace-nowrap">
          {silent ? t('periodReport.noSessions') : `${t('periodReport.sessions', { n: child.total_sessions })} · ${minutesLabel(child.total_minutes_est)}`}
        </div>
      </div>

      {/* 5 horizontal area bars — est minutes */}
      <div className="space-y-1 mb-2">
        {AREA_ORDER.map((area) => {
          const m = child.by_area[area]?.minutes_est ?? 0;
          const pct = Math.round(shares[area] * 100);
          return (
            <div key={area} className="flex items-center gap-1.5 text-[11px]" title={`${areaLabel(area)} · ${minutesLabel(m)}`}>
              <span className="w-5 text-right font-semibold tabular-nums" style={{ color: AREA_COLORS[area] }}>{AREA_ABBR[area]}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(128,128,128,0.15)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: AREA_COLORS[area], minWidth: m > 0 ? 4 : 0 }} />
              </div>
              <span className="pr-muted w-9 text-right text-white/50 tabular-nums">{m > 0 ? Math.round(m) : '·'}</span>
            </div>
          );
        })}
      </div>

      {/* Status movement chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {chips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: hexToRgba(c.area ? AREA_COLORS[c.area] : '#9ca3af', c.to === 'mastered' ? 0.9 : 0.18),
                color: c.to === 'mastered' ? '#ffffff' : (c.area ? AREA_COLORS[c.area] : '#9ca3af'),
                border: `1px solid ${hexToRgba(c.area ? AREA_COLORS[c.area] : '#9ca3af', 0.5)}`,
              }}
            >
              {c.work_name} → {statusLabel(c.to)}
            </span>
          ))}
          {child.transitions.length > chips.length && (
            <span className="pr-muted text-[10px] text-white/40 self-center">+{child.transitions.length - chips.length}</span>
          )}
        </div>
      )}

      {/* Top works */}
      {works.length > 0 && (
        <ul className="pr-muted text-[11px] text-white/65 space-y-0.5 mb-2">
          {works.map((w, i) => (
            <li key={i} className="flex items-center gap-1.5 truncate">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: AREA_COLORS[w.area] }} />
              <span className="truncate">{w.work_name}</span>
              <span className="ml-auto tabular-nums text-white/40">×{w.sessions}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Concentration dots + notes */}
      <div className="flex items-center gap-3 text-[10px] text-white/45 pr-muted">
        {concTotal > 0 && (
          <span className="flex items-center gap-1" title={t('periodReport.concentration')}>
            <Dots n={conc.wd} color="#9ca3af" label="wd" />
            <Dots n={conc.wc} color="#34d399" label="WC" />
            <Dots n={conc.dc} color="#10b981" label="DC" />
          </span>
        )}
        {child.notes.count > 0 && (
          <span className="ml-auto whitespace-nowrap">{t('periodReport.notes', { n: child.notes.count })}</span>
        )}
      </div>

      {aiLine && <p className="pr-ai mt-2 text-[12px] text-emerald-100/80 italic leading-snug">{aiLine}</p>}
    </div>
  );
}

function Dots({ n, color, label }: { n: number; color: string; label: string }) {
  if (n <= 0) return null;
  const shown = Math.min(n, 5);
  return (
    <span className="flex items-center gap-0.5" title={`${label} ${n}`}>
      <span className="mr-0.5">{label}</span>
      {Array.from({ length: shown }).map((_, i) => (
        <span key={i} aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      ))}
      {n > shown && <span>+{n - shown}</span>}
    </span>
  );
}
