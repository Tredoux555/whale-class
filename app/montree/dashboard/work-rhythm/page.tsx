// /montree/dashboard/work-rhythm/page.tsx
// Work Rhythm — one vertical, colour-banded bar per child showing where their
// classroom time actually went across the five Montessori areas, over a week or
// a month. The school's headline ask, answered at a glance: "clearly indicate
// where each child is spending most of their time."
//
// Read-only. Everything here comes from GET /api/montree/work-rhythm.
// No chart library — the bar is plain divs, because a stacked bar is just
// stacked divs and a dependency here would be dead weight in a PWA.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Activity } from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';

type Period = 'week' | 'month';
type AreaKey = 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'cultural';

// Verbatim from app/api/montree/progress/bars/route.ts — one classroom, one
// colour language. Changing a hex here without changing it there would make the
// same area read as two different colours in the same app.
const AREA_ORDER: AreaKey[] = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
const AREA_COLORS: Record<AreaKey, string> = {
  practical_life: '#22c55e',
  sensorial: '#f97316',
  mathematics: '#3b82f6',
  language: '#ec4899',
  cultural: '#8b5cf6',
};

// A segment thinner than this cannot hold a legible percentage on a phone.
const LABEL_MIN_SHARE = 18;

const BAR_HEIGHT_PX = 150;
const BAR_WIDTH_PX = 44;

interface AreaBucket {
  minutes: number;
  events: number;
}

interface ChildRhythm {
  child_id: string;
  name: string;
  photo_url: string | null;
  total_minutes: number;
  total_events: number;
  top_area: AreaKey | null;
  areas: Partial<Record<AreaKey, AreaBucket>>;
  sources: { paper_minutes: number; photo_events: number };
}

// Divide-by-zero is the normal case here (a child with no signal yet), not an
// edge case — every share goes through this.
function share(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return (part / total) * 100;
}

function firstName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}

function initial(name: string): string {
  const first = firstName(name);
  return first ? first.charAt(0).toUpperCase() : '?';
}

export default function WorkRhythmPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isEnabled, loading: featuresLoading } = useFeatures();

  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [classroomId, setClassroomId] = useState<string>('');
  const [featureDisabled, setFeatureDisabled] = useState(false);

  const [period, setPeriod] = useState<Period>('week');
  const [children, setChildren] = useState<ChildRhythm[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Session ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    if (sess.classroom?.id) setClassroomId(sess.classroom.id);
    setLoading(false);
  }, [router]);

  // ── Load the rhythm ─────────────────────────────────────────────────────
  const loadRhythm = useCallback(async () => {
    setFetching(true);
    try {
      const qs = new URLSearchParams({ period });
      if (classroomId) qs.set('classroom_id', classroomId);
      const res = await montreeApi(`/api/montree/work-rhythm?${qs.toString()}`);
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        if (body?.error === 'feature_disabled') setFeatureDisabled(true);
        return;
      }
      if (!res.ok) throw new Error(`Work rhythm: ${res.status}`);
      const data = await res.json();
      setChildren(Array.isArray(data?.children) ? (data.children as ChildRhythm[]) : []);
    } catch (err) {
      console.error('[work-rhythm] Load error:', err);
      toast.error(t('workRhythm.loadFailed'));
    } finally {
      setFetching(false);
    }
  }, [classroomId, period, t]);

  useEffect(() => {
    if (loading) return;
    void loadRhythm();
  }, [loading, loadRhythm]);

  const selected = children.find((c) => c.child_id === selectedId) ?? null;
  const classroomHasSignal = children.some((c) => c.total_minutes > 0);

  const minutesLabel = useCallback(
    (n: number) => t('workRhythm.minutesShort').replace('{n}', String(Math.round(n))),
    [t],
  );
  const eventsLabel = useCallback(
    (n: number) => t('workRhythm.events').replace('{n}', String(n)),
    [t],
  );

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
      className="fixed inset-0 pointer-events-none"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
    />
  );

  if (!isEnabled('work_rhythm') || featureDisabled) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] p-6 relative">
        {glow}
        <Toaster position="top-center" />
        <div className="relative max-w-lg mx-auto text-center py-20">
          <Activity className="w-12 h-12 mx-auto mb-4 text-emerald-400/70" />
          <h1 className="text-2xl font-bold text-white/95 mb-3">{t('workRhythm.disabledTitle')}</h1>
          <p className="text-white/60 mb-6">{t('workRhythm.disabledBody')}</p>
          <p className="text-sm text-white/40">{t('workRhythm.contactAdmin')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1a0f] relative">
      {glow}
      <Toaster position="top-center" />

      {/* Header */}
      <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/montree/dashboard')}
          className="text-white/50 hover:text-white/80"
          aria-label={t('common.back')}
        >
          ←
        </button>
        <h1 className="text-lg font-semibold text-white/95 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          {t('workRhythm.title')}
        </h1>
      </div>

      <div className="relative max-w-3xl mx-auto p-4 pb-28">
        <p className="text-sm text-white/60 mb-4">{t('workRhythm.subtitle')}</p>

        {/* Period pills */}
        <div className="flex gap-2 mb-5">
          {(['week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={
                period === p
                  ? 'px-4 py-2 rounded-full text-sm font-semibold bg-emerald-600 text-white'
                  : 'px-4 py-2 rounded-full text-sm font-medium bg-white/[0.06] border border-[rgba(52,211,153,0.2)] text-white/70 hover:bg-white/[0.1] transition'
              }
            >
              {p === 'week' ? t('workRhythm.periodWeek') : t('workRhythm.periodMonth')}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
          {AREA_ORDER.map((area) => (
            <span key={area} className="flex items-center gap-1.5 text-[11px] text-white/60">
              <span
                aria-hidden
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: AREA_COLORS[area] }}
              />
              {t(`area.${area}`)}
            </span>
          ))}
        </div>

        {fetching && children.length === 0 && (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Nothing recorded anywhere yet */}
        {!fetching && !classroomHasSignal && (
          <div className="rounded-2xl border border-[rgba(52,211,153,0.2)] bg-white/[0.06] p-6 text-center">
            <Activity className="w-10 h-10 mx-auto mb-3 text-emerald-400/70" />
            <h2 className="text-lg font-semibold text-white/95 mb-2">
              {t('workRhythm.emptyClassroomTitle')}
            </h2>
            <p className="text-sm text-white/60">{t('workRhythm.emptyClassroomBody')}</p>
          </div>
        )}

        {/* Children grid — the rhythm bars */}
        {classroomHasSignal && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {children.map((child) => {
              const hasSignal = child.total_minutes > 0;
              return (
                <button
                  key={child.child_id}
                  onClick={() => setSelectedId(child.child_id)}
                  className="flex flex-col items-center rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] p-3 hover:bg-white/[0.1] transition text-center"
                >
                  {/* The bar: segments stack bottom-up in AREA_ORDER, so
                      flex-col-reverse puts practical_life at the floor. */}
                  <div
                    className={
                      hasSignal
                        ? 'flex flex-col-reverse rounded-full overflow-hidden bg-white/[0.04]'
                        : 'rounded-full border-2 border-dashed border-white/15'
                    }
                    style={{ height: BAR_HEIGHT_PX, width: BAR_WIDTH_PX }}
                  >
                    {hasSignal &&
                      AREA_ORDER.map((area) => {
                        const bucket = child.areas?.[area];
                        const minutes = bucket?.minutes ?? 0;
                        if (minutes <= 0) return null; // an untouched area draws nothing
                        const pct = share(minutes, child.total_minutes);
                        return (
                          <div
                            key={area}
                            className="w-full flex items-center justify-center"
                            style={{ height: `${pct}%`, backgroundColor: AREA_COLORS[area] }}
                          >
                            {pct >= LABEL_MIN_SHARE && (
                              <span className="text-[10px] font-semibold text-black/60">
                                {Math.round(pct)}%
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Child */}
                  <div className="mt-3 flex flex-col items-center gap-1">
                    {child.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- roster photos are remote Supabase URLs, same as the rest of the dashboard
                      <img
                        src={child.photo_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-[rgba(52,211,153,0.25)]"
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-emerald-900/50 border border-[rgba(52,211,153,0.25)] flex items-center justify-center text-xs font-semibold text-emerald-200">
                        {initial(child.name)}
                      </span>
                    )}
                    <span className="text-xs font-medium text-white/85 leading-tight">
                      {firstName(child.name)}
                    </span>
                    {child.top_area ? (
                      <span className="flex items-center gap-1 text-[10px] text-white/50">
                        <span
                          aria-hidden
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: AREA_COLORS[child.top_area] }}
                        />
                        {t(`area.${child.top_area}`)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/35">{t('workRhythm.emptyChild')}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/60"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full sm:max-w-md bg-[#0d2114] border-t sm:border border-[rgba(52,211,153,0.2)] rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                {selected.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- see above
                  <img
                    src={selected.photo_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-[rgba(52,211,153,0.25)]"
                  />
                ) : (
                  <span className="w-10 h-10 rounded-full bg-emerald-900/50 border border-[rgba(52,211,153,0.25)] flex items-center justify-center text-sm font-semibold text-emerald-200">
                    {initial(selected.name)}
                  </span>
                )}
                <div className="text-left">
                  <div className="text-base font-semibold text-white/95">{selected.name}</div>
                  <div className="text-xs text-white/50">
                    {minutesLabel(selected.total_minutes)} · {eventsLabel(selected.total_events)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="text-white/50 hover:text-white/80 text-sm"
                aria-label={t('common.back')}
              >
                ✕
              </button>
            </div>

            {selected.top_area && (
              <div className="flex items-center gap-2 text-xs text-white/70 mb-4">
                <span className="text-white/45">{t('workRhythm.topArea')}</span>
                <span
                  aria-hidden
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: AREA_COLORS[selected.top_area] }}
                />
                {t(`area.${selected.top_area}`)}
              </div>
            )}

            <div className="flex items-center gap-3 px-3 pb-1">
              <span aria-hidden className="w-3 shrink-0" />
              <span className="flex-1" />
              <span className="text-[10px] uppercase tracking-wide text-white/30 w-10 text-right">
                {t('workRhythm.share')}
              </span>
            </div>

            <div className="space-y-2">
              {AREA_ORDER.map((area) => {
                const bucket = selected.areas?.[area];
                const minutes = bucket?.minutes ?? 0;
                const events = bucket?.events ?? 0;
                const pct = share(minutes, selected.total_minutes);
                return (
                  <div
                    key={area}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-[rgba(52,211,153,0.1)] px-3 py-2"
                  >
                    <span
                      aria-hidden
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: AREA_COLORS[area] }}
                    />
                    <span className="flex-1 text-sm text-white/85">{t(`area.${area}`)}</span>
                    <span className="text-xs text-white/55 text-right">
                      {minutesLabel(minutes)} · {eventsLabel(events)}
                    </span>
                    <span className="text-xs font-semibold text-white/80 w-10 text-right">
                      {Math.round(pct)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {selected.total_minutes === 0 && (
              <p className="mt-4 text-sm text-white/50 text-center">{t('workRhythm.emptyChild')}</p>
            )}

            {/* Honesty line — these minutes are part recorded, part estimated. */}
            <p className="mt-5 text-[11px] leading-relaxed text-white/40">
              {t('workRhythm.detailNote')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
