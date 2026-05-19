// Classroom Overview — Two tabs:
// 1. "Shelf Overview" — 20 students on 2 A4 pages (10 per page, 5×2 grid), works listed, rest blank for notes
// 2. "English Schedule" — weekly Mon-Fri grid, 6 children per day for Phonics Bingo, printable
// Dark forest screen chrome — print pages stay light for printability
'use client';

import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Printer, Layout, Languages,
  RefreshCw, BookOpen, Check,
} from 'lucide-react';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useMontreeData } from '@/lib/montree/cache';
import { AREA_CONFIG } from '@/lib/montree/types';
import { normalizeArea } from '@/components/montree/shared/AreaBadge';
import { useI18n, getIntlLocale, type TranslationKey } from '@/lib/montree/i18n';

interface FocusWork {
  name: string;
  chineseName: string | null;
}

interface ChildData {
  id: string;
  name: string;
  photo_url?: string;
  focus_works: Record<string, FocusWork>;
}

interface ScheduleChild {
  id: string;
  name: string;
  photo_url: string | null;
  is_k_bound: boolean;
  days_since_last_visit: number | null;
  // Session 119 — live state additions:
  is_done?: boolean;           // confirmed Language photo this week
  rolled_from_day?: string;    // 'monday'|'tuesday'|... if rolled from a past day
}

interface EnglishSchedule {
  days: Record<string, ScheduleChild[]>;
  children_count: number;
  k_bound_count: number;
  week_label: string;
}

// Session 119 — live state metadata from the server
interface EnglishScheduleLiveState {
  today: string | null;
  is_workday: boolean;
  done_count: number;
  undone_count: number;
  total_in_class: number;
  unscheduled_undone_names: string[];
  shortfall_warning: string | null;
}

interface EnglishMissingChild {
  id: string;
  name: string;
}

interface EnglishMissingResponse {
  success: true;
  week_start: string;
  week_end: string;
  missing: EnglishMissingChild[];
  total_in_class: number;
  language_area_present: boolean;
}

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
const AREA_LETTERS: Record<string, string> = {
  practical_life: 'PL',
  sensorial: 'S',
  mathematics: 'M',
  language: 'L',
  cultural: 'C',
};

const DAY_LABELS_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri',
};
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

type TabType = 'shelf' | 'english';

// Dark forest tokens (screen chrome only — print pages stay light)
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  toolbarBg: 'linear-gradient(180deg, rgba(7,18,12,0.96), rgba(7,18,12,0.90))',
  toolbarBorder: '1px solid rgba(52,211,153,0.15)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldDim: 'rgba(52,211,153,0.65)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  red: '#f87171',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 16px',
  borderRadius: 10,
  background: 'linear-gradient(180deg, #34d399, #10b981)',
  border: '1px solid rgba(52,211,153,0.55)',
  color: '#06281a',
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
};

const ghostBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 12px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: T.textPrimary,
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 120ms ease',
};

export default function ClassroomOverviewPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [tab, setTab] = useState<TabType>('shelf');

  // Shelf tab state
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // English schedule state — Session 119 swapped from imperative useState
  // to useMontreeData so invalidateEnglishWeekCache() (fired from photo-audit
  // confirm sites) triggers a live refetch via the cache subscriber. Without
  // this, navigating back from /photo-audit via SPA router (no window focus)
  // would leave the schedule stale until the teacher manually refreshed.
  const {
    data: scheduleResponse,
    loading: scheduleLoading,
    error: scheduleErrorRaw,
    refetch: refetchSchedule,
  } = useMontreeData<{
    success: boolean;
    schedule: EnglishSchedule;
    live_state: EnglishScheduleLiveState | null;
    week_start: string;
    generated_at: string;
  }>(
    session?.classroom?.id && tab === 'english'
      ? '/api/montree/dashboard/english-schedule'
      : null,
    { staleTime: 15_000 },
  );
  const schedule: EnglishSchedule | null = scheduleResponse?.schedule ?? null;
  const liveState: EnglishScheduleLiveState | null = scheduleResponse?.live_state ?? null;
  const scheduleWeek: string = scheduleResponse?.week_start ?? '';
  const scheduleError: boolean = !!scheduleErrorRaw;
  const [regenerating, setRegenerating] = useState(false);

  // English-missing state (Session 119 — auto-updates after photo confirms via
  // invalidateCache('/api/montree/dashboard/english-missing') from photo-audit)
  const {
    data: englishMissing,
    loading: englishMissingLoading,
    error: englishMissingError,
    refetch: refetchEnglishMissing,
  } = useMontreeData<EnglishMissingResponse>(
    session?.classroom?.id ? '/api/montree/dashboard/english-missing' : null,
    { staleTime: 30_000 },
  );

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    if (isHomeschoolParent(sess)) { router.push('/montree/dashboard'); return; }
    setSession(sess);

    if (!sess.classroom?.id) {
      setError(true); setLoading(false); return;
    }

    const controller = new AbortController();
    montreeApi(`/api/montree/focus-works/batch?classroom_id=${sess.classroom.id}`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(`Batch fetch: ${res.status}`); return res.json(); })
      .then(data => {
        if (data.success) setChildren(data.children || []);
        else setError(true);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(true); setLoading(false);
      });
    return () => controller.abort();
  }, [router]);

  // Session 119 — POST regenerate from scratch (rare; manual button click).
  // useMontreeData handles the GET path automatically; this is the explicit
  // "throw away this week's snapshot and rebuild it" action.
  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await montreeApi('/api/montree/dashboard/english-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Regenerate: ${res.status}`);
      // Force the GET cache to refetch with the new snapshot baked in.
      refetchSchedule();
    } catch (err) {
      console.error('Regenerate failed:', err);
    } finally {
      setRegenerating(false);
    }
  };

  // loadSchedule shim — preserves callers that still hit it (the
  // "generate schedule" CTA on the no-schedule-yet empty state + the
  // "load failed" retry button). Maps to the new useMontreeData refetch
  // path; the `forceGenerate=true` case is handled by calling POST first.
  const loadSchedule = useCallback(async (forceGenerate = false) => {
    if (forceGenerate) {
      await handleRegenerate();
      return;
    }
    refetchSchedule();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchSchedule]);

  const getAreaConfig = (area: string) => {
    const normalized = normalizeArea(area);
    return AREA_CONFIG[normalized] || { name: area, icon: '?', color: '#888' };
  };

  const today = new Date().toLocaleDateString(getIntlLocale(locale), {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const formatWeekLabel = (weekStart: string) => {
    if (!weekStart) return '';
    const d = new Date(weekStart + 'T00:00:00');
    const end = new Date(d);
    end.setDate(d.getDate() + 4);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const loc = getIntlLocale(locale);
    return `${d.toLocaleDateString(loc, opts)} – ${end.toLocaleDateString(loc, opts)}`;
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        backgroundImage: T.glow,
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.sans,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 28,
            height: 28,
            border: `3px solid ${T.emeraldDim}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            margin: '0 auto 10px',
            animation: 'cl-spin 0.9s linear infinite',
          }} />
          <p style={{ margin: 0, color: T.textMuted, fontSize: 13 }}>{t('common.loading')}</p>
        </div>
        <style>{`@keyframes cl-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        backgroundImage: T.glow,
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.sans,
      }}>
        <p style={{ margin: 0, color: T.red, fontSize: 14 }}>{t('common.connectionError')}</p>
      </div>
    );
  }

  // Split children into pages of 10 for shelf view
  const pages: ChildData[][] = [];
  for (let i = 0; i < children.length; i += 10) {
    pages.push(children.slice(i, i + 10));
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
          .screen-shell { background: white !important; }
        }
        @media screen {
          .print-page { margin: 0 auto 24px; max-width: 1180px; box-shadow: 0 18px 40px rgba(0,0,0,0.45); border-radius: 8px; overflow: hidden; }
        }
        @keyframes cl-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        className="screen-shell"
        style={{
          minHeight: '100vh',
          background: T.bg,
          backgroundImage: T.glow,
          backgroundAttachment: 'fixed',
          color: T.textPrimary,
          fontFamily: T.sans,
        }}
      >
        {/* Screen-only toolbar */}
        <div
          className="no-print"
          style={{
            position: 'sticky',
            top: 57,
            zIndex: 40,
            background: T.toolbarBg,
            backdropFilter: 'blur(20px) saturate(140%)',
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            borderBottom: T.toolbarBorder,
            padding: '14px 22px',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            maxWidth: 1280,
            margin: '0 auto',
          }}>
            <button
              onClick={() => router.back()}
              aria-label={t('common.back')}
              style={{ ...ghostBtn, padding: '8px 14px' }}
            >
              <ArrowLeft size={15} strokeWidth={1.75} />
              {t('common.back')}
            </button>

            <h1 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 18,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('print.classOverview')}
            </h1>

            <button onClick={() => window.print()} style={ctaStyle}>
              <Printer size={14} strokeWidth={2} />
              {t('print.printPage')}
            </button>
          </div>

          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            gap: 4,
            marginTop: 12,
            padding: 4,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            maxWidth: 1280,
            margin: '12px auto 0',
          }}>
            {[
              { id: 'shelf' as const, label: t('classroomOverview.shelfTab'), icon: Layout },
              { id: 'english' as const, label: t('classroomOverview.englishTab'), icon: Languages },
            ].map(opt => {
              const active = tab === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTab(opt.id)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '8px 14px',
                    borderRadius: 9,
                    background: active ? 'rgba(52,211,153,0.15)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(52,211,153,0.45)' : 'transparent'}`,
                    color: active ? T.emerald : T.textSecondary,
                    fontFamily: T.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* English-this-week — screen only (Session 119) */}
        <div
          className="no-print"
          style={{
            maxWidth: 1280,
            margin: '20px auto 0',
            padding: '0 22px',
          }}
        >
          <EnglishMissingPanel
            data={englishMissing}
            loading={englishMissingLoading}
            errored={!!englishMissingError}
            onRefresh={refetchEnglishMissing}
            onJumpToChild={(childId) => router.push(`/montree/dashboard/${childId}/gallery`)}
            t={t}
          />
        </div>

        {/* Body padding */}
        <div style={{ padding: '24px 16px 60px' }}>

          {/* ═══ TAB: Shelf Overview ═══ */}
          {tab === 'shelf' && (
            <>
              {children.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '80px 16px',
                  color: T.textMuted,
                  fontSize: 16,
                  fontFamily: T.sans,
                }}>
                  {t('students.noStudents')}
                </div>
              ) : (
                pages.map((pageChildren, pageIdx) => (
                  <div key={pageIdx} className="print-page" style={{ background: 'white', width: '100%', minHeight: '100vh' }}>
                    <div style={{ padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ fontWeight: 700, fontSize: '11px', color: '#374151' }}>
                        {session?.classroom?.name || t('print.classOverview')}
                      </span>
                      <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                        {today} — {session?.teacher?.name} — {t('classroomOverview.pageLabel')}{pageIdx + 1}/{pages.length}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(2, 1fr)',
                        gap: '0px', height: 'calc(100vh - 28px)', padding: '0',
                        borderTop: '1px solid #d1d5db', borderLeft: '1px solid #d1d5db',
                      }}
                    >
                      {pageChildren.map((child) => (
                        <div key={child.id} style={{
                          borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db',
                          padding: '6px 8px', display: 'flex', flexDirection: 'column',
                          position: 'relative', overflow: 'hidden',
                        }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827', lineHeight: '1.2', marginBottom: '3px' }}>
                            {child.name}
                          </div>
                          <div>
                            {AREAS.map(area => {
                              const fw = child.focus_works[area];
                              if (!fw) return null;
                              const config = getAreaConfig(area);
                              const workName = locale === 'zh' && fw.chineseName ? fw.chineseName : fw.name;
                              const shortName = workName.length > 30 ? workName.slice(0, 28) + '…' : workName;
                              return (
                                <div key={area} style={{ fontSize: '7px', lineHeight: '1.3', color: '#6b7280' }}>
                                  <span style={{
                                    display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                                    backgroundColor: config.color, color: 'white', fontSize: '5px', fontWeight: 700,
                                    textAlign: 'center', lineHeight: '8px', marginRight: '2px', verticalAlign: 'middle',
                                  }}>
                                    {AREA_LETTERS[area] || '?'}
                                  </span>
                                  {shortName}
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ flex: 1 }} />
                        </div>
                      ))}

                      {Array.from({ length: 10 - pageChildren.length }).map((_, i) => (
                        <div key={`empty-${i}`} style={{
                          borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fafafa',
                        }} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* ═══ TAB: English Schedule ═══ */}
          {tab === 'english' && (
            <>
              {scheduleLoading ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 16px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      border: `3px solid ${T.emeraldDim}`,
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      margin: '0 auto 10px',
                      animation: 'cl-spin 0.9s linear infinite',
                    }} />
                    <p style={{ margin: 0, color: T.textMuted, fontSize: 13 }}>{t('classroomOverview.loadingSchedule')}</p>
                  </div>
                </div>
              ) : scheduleError ? (
                <div style={{ textAlign: 'center', padding: '80px 16px' }}>
                  <p style={{ margin: '0 0 14px', color: T.red, fontSize: 14 }}>
                    {t('classroomOverview.loadFailed')}
                  </p>
                  <button onClick={() => loadSchedule(true)} style={ctaStyle}>
                    <RefreshCw size={14} strokeWidth={2} />
                    {t('classroomOverview.generateSchedule')}
                  </button>
                </div>
              ) : schedule ? (
                <div className="print-page" style={{ background: 'white', width: '100%', minHeight: '100vh' }}>
                  {/* Header */}
                  <div style={{
                    padding: '8px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '2px solid #ec4899',
                    background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '16px', color: '#9d174d' }}>
                        {t('classroomOverview.scheduleTitle')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#be185d', fontWeight: 500 }}>
                        {formatWeekLabel(scheduleWeek)} · {session?.classroom?.name}
                      </div>
                      {/* Session 119 — live done/undone summary. Updates after
                          every photo confirm + on tab-focus refetch. */}
                      {liveState && (
                        <div style={{
                          marginTop: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#7c2d12',
                          display: 'flex',
                          gap: 10,
                          flexWrap: 'wrap',
                        }}>
                          <span>✓ {liveState.done_count} done</span>
                          <span style={{ color: '#9f1239' }}>
                            • {liveState.undone_count} still need bingo
                          </span>
                          <span style={{ color: '#a16207' }}>
                            • {liveState.total_in_class} total
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="no-print" style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '7px 14px',
                          borderRadius: 8,
                          background: '#ec4899',
                          border: 'none',
                          color: 'white',
                          fontFamily: T.sans,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: regenerating ? 'not-allowed' : 'pointer',
                          opacity: regenerating ? 0.55 : 1,
                        }}
                      >
                        <RefreshCw size={12} strokeWidth={2} />
                        {regenerating
                          ? t('classroomOverview.generating')
                          : t('classroomOverview.regenerate')}
                      </button>
                    </div>
                  </div>

                  {/* Session 119 — shortfall warning banner. Renders when
                      the live algorithm couldn't fit all undone kids into the
                      remaining bingo slots this week. */}
                  {liveState?.shortfall_warning && liveState.unscheduled_undone_names.length > 0 && (
                    <div className="no-print" style={{
                      padding: '10px 16px',
                      background: '#fef2f2',
                      borderBottom: '1px solid #fecaca',
                      color: '#991b1b',
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}>
                      <span style={{ fontWeight: 700 }}>⚠️ Bingo shortfall — </span>
                      {liveState.shortfall_warning}.{' '}
                      <span style={{ fontWeight: 600 }}>
                        Won&apos;t fit: {liveState.unscheduled_undone_names.join(', ')}.
                      </span>{' '}
                      <span style={{ color: '#6b7280' }}>
                        Run an extra session or accept they miss this week.
                      </span>
                    </div>
                  )}

                  {/* Priority legend — no-print */}
                  <div className="no-print" style={{ padding: '6px 16px', fontSize: '11px', color: '#6b7280', display: 'flex', gap: '16px', borderBottom: '1px solid #f3e8ff' }}>
                    <span>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6', marginRight: '4px', verticalAlign: 'middle' }} />
                      {t('classroomOverview.movingUpPriority')}
                    </span>
                    <span>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d1d5db', marginRight: '4px', verticalAlign: 'middle' }} />
                      {t('classroomOverview.otherChildren')}
                    </span>
                    <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
                      {t('classroomOverview.leastActivityFirst')}
                    </span>
                  </div>

                  {/* 5-column day grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    height: 'calc(100vh - 80px)',
                    borderTop: '1px solid #d1d5db',
                    borderLeft: '1px solid #d1d5db',
                  }}>
                    {DAY_ORDER.map(day => {
                      const dayChildren = schedule.days[day] || [];
                      const dayLabel = t(`classroomOverview.day.${day}`);

                      return (
                        <div key={day} style={{
                          borderRight: '1px solid #d1d5db',
                          display: 'flex', flexDirection: 'column',
                        }}>
                          <div style={{
                            padding: '8px 10px',
                            background: '#fdf2f8',
                            borderBottom: '2px solid #ec4899',
                            textAlign: 'center',
                          }}>
                            <div style={{ fontWeight: 800, fontSize: '15px', color: '#9d174d' }}>
                              {dayLabel}
                            </div>
                            <div style={{ fontSize: '10px', color: '#be185d' }}>
                              {t('classroomOverview.childrenCount', { count: dayChildren.length })}
                            </div>
                          </div>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {dayChildren.map((child, idx) => {
                              // Session 119 — live state derived per child
                              const isDone = !!child.is_done;
                              const rolledFrom = child.rolled_from_day;
                              return (
                              <div
                                key={child.id}
                                style={{
                                  padding: '10px 10px',
                                  borderBottom: '1px solid #f3e8ff',
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '6px',
                                  position: 'relative',
                                  // Done = soft mint background. Rolled = amber left border.
                                  background: isDone ? '#ecfdf5' : 'transparent',
                                  borderLeft: rolledFrom ? '3px solid #f59e0b' : undefined,
                                  opacity: isDone ? 0.7 : 1,
                                }}
                                title={
                                  isDone
                                    ? `${child.name} has done English this week`
                                    : rolledFrom
                                      ? `Rolled from ${DAY_LABELS_SHORT[rolledFrom] ?? rolledFrom}`
                                      : undefined
                                }
                              >
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                                  backgroundColor: child.is_k_bound ? '#8b5cf6' : '#d1d5db',
                                  color: child.is_k_bound ? 'white' : '#374151',
                                  fontSize: '9px', fontWeight: 700,
                                }}>
                                  {idx + 1}
                                </span>

                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    color: isDone ? '#065f46' : '#111827',
                                    lineHeight: '1.2',
                                    textDecoration: isDone ? 'line-through' : undefined,
                                    textDecorationColor: isDone ? '#10b981' : undefined,
                                  }}>
                                    {child.name}
                                  </div>

                                  <div style={{
                                    fontSize: '9px',
                                    color: rolledFrom ? '#b45309' : '#9ca3af',
                                    marginTop: '1px',
                                    fontWeight: rolledFrom ? 700 : 400,
                                  }}>
                                    {rolledFrom
                                      ? `↪ rolled from ${DAY_LABELS_SHORT[rolledFrom] ?? rolledFrom}`
                                      : child.days_since_last_visit === null
                                        ? t('classroomOverview.daysSince.noRecord')
                                        : child.days_since_last_visit === 0
                                          ? t('classroomOverview.daysSince.today')
                                          : t('classroomOverview.daysSince.daysAgo', { days: child.days_since_last_visit })}
                                  </div>
                                </div>

                                {/* Checkbox — derived from is_done, no manual tick.
                                    Photo confirms are the source of truth (no false positives,
                                    Brain learning intact). */}
                                <div style={{
                                  width: '20px', height: '20px',
                                  border: isDone ? '2px solid #10b981' : '2px solid #d1d5db',
                                  borderRadius: '4px',
                                  flexShrink: 0, marginTop: '2px',
                                  background: isDone ? '#10b981' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'white', fontSize: '13px', fontWeight: 800,
                                  lineHeight: 1,
                                }}>
                                  {isDone ? '✓' : ''}
                                </div>
                              </div>
                              );
                            })}

                            {Array.from({ length: Math.max(0, 6 - dayChildren.length) }).map((_, i) => (
                              <div key={`empty-${day}-${i}`} style={{
                                flex: 1, borderBottom: '1px solid #f9fafb', backgroundColor: '#fafafa',
                              }} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 16px' }}>
                  <p style={{ margin: '0 0 14px', color: T.textMuted, fontSize: 14 }}>
                    {t('classroomOverview.noScheduleYet')}
                  </p>
                  <button onClick={() => loadSchedule(true)} style={ctaStyle}>
                    <RefreshCw size={14} strokeWidth={2} />
                    {t('classroomOverview.generateSchedule')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── English-this-week panel (Session 119) ───
// Lives above the tab strip on Classroom Overview. Auto-refreshes on focus.
// After a successful confirm in /photo-audit, invalidateCache(
// '/api/montree/dashboard/english-missing') in cache.ts wipes this hook's
// entry, and the next mount/focus refetches.

interface EnglishMissingPanelProps {
  data: EnglishMissingResponse | null;
  loading: boolean;
  errored: boolean;
  onRefresh: () => void;
  onJumpToChild: (childId: string) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

function EnglishMissingPanel({
  data,
  loading,
  errored,
  onRefresh,
  onJumpToChild,
  t,
}: EnglishMissingPanelProps) {
  const card: CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(52,211,153,0.18)',
    borderRadius: 14,
    padding: '14px 18px',
    color: T.textPrimary,
    fontFamily: T.sans,
    backdropFilter: 'blur(12px) saturate(140%)',
    WebkitBackdropFilter: 'blur(12px) saturate(140%)',
  };

  const headerRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  };

  const titleRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    fontFamily: T.serif,
    fontSize: 15,
    fontWeight: 500,
    letterSpacing: -0.1,
    color: T.textPrimary,
  };

  const refreshBtn: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: T.textSecondary,
    fontFamily: T.sans,
    fontSize: 12,
    fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
  };

  // ─── Loading skeleton (first paint only — subsequent loads are background) ───
  if (loading && !data) {
    return (
      <div style={card}>
        <div style={titleRow}>
          <BookOpen size={16} strokeWidth={1.75} color={T.emerald} />
          <span>{t('classroomOverview.englishWeek.loading')}</span>
        </div>
        <div
          aria-hidden
          style={{
            marginTop: 8,
            height: 18,
            borderRadius: 6,
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
            backgroundSize: '200% 100%',
            animation: 'em-shimmer 1.4s linear infinite',
          }}
        />
        <style>{`@keyframes em-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
      </div>
    );
  }

  // ─── Error ───
  if (errored && !data) {
    return (
      <div style={card}>
        <div style={headerRow}>
          <div style={titleRow}>
            <BookOpen size={16} strokeWidth={1.75} color={T.red} />
            <span>{t('classroomOverview.englishWeek.error')}</span>
          </div>
          <button onClick={onRefresh} style={refreshBtn} disabled={loading}>
            <RefreshCw size={11} strokeWidth={2} />
            {t('classroomOverview.englishWeek.refresh')}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // No Language area configured — show a quiet inert state so the panel isn't
  // misleading. Common at the very first onboarding step.
  if (!data.language_area_present) {
    return (
      <div style={card}>
        <div style={titleRow}>
          <BookOpen size={16} strokeWidth={1.75} color={T.textMuted} />
          <span style={{ color: T.textMuted, fontFamily: T.sans, fontWeight: 500, fontSize: 13 }}>
            {t('classroomOverview.englishWeek.noLanguageArea')}
          </span>
        </div>
      </div>
    );
  }

  const { missing, total_in_class } = data;
  const missingCount = missing.length;
  const allDone = missingCount === 0;

  return (
    <div style={card}>
      <div style={headerRow}>
        <div style={titleRow}>
          {allDone ? (
            <Check size={16} strokeWidth={2.25} color={T.emerald} />
          ) : (
            <BookOpen size={16} strokeWidth={1.75} color={T.emerald} />
          )}
          <span>
            {allDone
              ? t('classroomOverview.englishWeek.emptyOk')
              : t('classroomOverview.englishWeek.title')}
          </span>
        </div>
        <button
          onClick={onRefresh}
          style={refreshBtn}
          disabled={loading}
          aria-label={t('classroomOverview.englishWeek.refresh')}
        >
          <RefreshCw size={11} strokeWidth={2} />
          {t('classroomOverview.englishWeek.refresh')}
        </button>
      </div>

      {!allDone && (
        <>
          <div
            style={{
              fontSize: 12,
              color: T.textSecondary,
              marginBottom: 10,
            }}
          >
            {t('classroomOverview.englishWeek.needCount', {
              missing: missingCount,
              total: total_in_class,
            })}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}
          >
            {missing.map(child => (
              <button
                key={child.id}
                onClick={() => onJumpToChild(child.id)}
                style={{
                  padding: '5px 11px',
                  borderRadius: 999,
                  background: 'rgba(232,201,106,0.10)',
                  border: '1px solid rgba(232,201,106,0.32)',
                  color: '#ecd684',
                  fontFamily: T.sans,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 100ms ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(232,201,106,0.18)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(232,201,106,0.10)';
                }}
              >
                {child.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
