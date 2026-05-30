// Classroom Overview — Two tabs:
// 1. "Shelf Overview" — 20 students on 2 A4 pages (10 per page, 5×2 grid), works listed, rest blank for notes
// 2. "English Schedule" — weekly Mon-Fri grid, 6 children per day for Phonics Bingo, printable
// Dark forest screen chrome — print pages stay light for printability
'use client';

import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Printer, Layout, Languages,
  RefreshCw, BookOpen, Check, ChevronRight, Settings2,
  TrendingUp,
} from 'lucide-react';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useMontreeData } from '@/lib/montree/cache';
import { AREA_CONFIG } from '@/lib/montree/types';
import { normalizeArea } from '@/components/montree/shared/AreaBadge';
import { useI18n, getIntlLocale, type TranslationKey } from '@/lib/montree/i18n';
import { hasLessonMaterials } from '@/lib/montree/english-sequence/lesson-coverage';

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

// "Done this week" panel — a child who did English + the weekday they did it.
interface DoneThisWeekChild {
  id: string;
  name: string;
  photo_url: string | null;
  day: string | null;
}

// English-activity tracker — per-child confirmed Language session counts.
interface ActivityTrackerChild {
  id: string;
  name: string;
  photo_url: string | null;
  sessions_4w: number;
  sessions_all: number;
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

type TabType = 'shelf' | 'english' | 'english-progress' | 'class-progress';

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
    done_this_week?: DoneThisWeekChild[];
    activity_tracker?: ActivityTrackerChild[];
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
  const doneThisWeek: DoneThisWeekChild[] = scheduleResponse?.done_this_week ?? [];
  const activityTracker: ActivityTrackerChild[] = scheduleResponse?.activity_tracker ?? [];
  const scheduleWeek: string = scheduleResponse?.week_start ?? '';
  const scheduleError: boolean = !!scheduleErrorRaw;
  const [regenerating, setRegenerating] = useState(false);
  // English-activity tracker window — 'recent' = last 4 weeks, 'all' = all time.
  const [trackerWindow, setTrackerWindow] = useState<'recent' | 'all'>('recent');

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

          {/* Tab switcher — mobile-resilient: horizontally scrolls on narrow
              viewports instead of wrapping or truncating labels. Each pill
              keeps its label on one line (whiteSpace:nowrap). Session 129
              audit-fix for the 4-tab overflow. */}
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
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}>
            {[
              { id: 'shelf' as const, label: t('classroomOverview.shelfTab'), icon: Layout },
              { id: 'english' as const, label: t('classroomOverview.englishTab'), icon: Languages },
              { id: 'english-progress' as const, label: t('classroomOverview.englishProgressTab'), icon: BookOpen },
              { id: 'class-progress' as const, label: t('classroomOverview.classProgressTab'), icon: TrendingUp },
            ].map(opt => {
              const active = tab === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => setTab(opt.id)}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 'fit-content',
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
                    whiteSpace: 'nowrap',
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
                      // Today / past / future — so a spent day reads as spent
                      // and the teacher's eye lands on what's next.
                      const todayIdx = liveState?.today ? DAY_ORDER.indexOf(liveState.today) : -1;
                      const dayIdx = DAY_ORDER.indexOf(day);
                      const isToday = liveState?.today === day;
                      const isPast = todayIdx >= 0 && dayIdx < todayIdx;

                      return (
                        <div key={day} style={{
                          borderRight: '1px solid #d1d5db',
                          display: 'flex', flexDirection: 'column',
                          // Spent days dim back so the eye lands on today + ahead.
                          opacity: isPast ? 0.6 : 1,
                        }}>
                          <div style={{
                            padding: '8px 10px',
                            background: isToday ? '#fbcfe8' : isPast ? '#f3f4f6' : '#fdf2f8',
                            borderBottom: isToday
                              ? '3px solid #db2777'
                              : isPast ? '2px solid #d1d5db' : '2px solid #ec4899',
                            textAlign: 'center',
                          }}>
                            <div style={{
                              fontWeight: 800, fontSize: '15px',
                              color: isPast ? '#6b7280' : '#9d174d',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            }}>
                              {dayLabel}
                              {isToday && (
                                <span style={{
                                  fontSize: '8px', fontWeight: 800, letterSpacing: 0.6,
                                  background: '#db2777', color: 'white',
                                  padding: '2px 5px', borderRadius: 4,
                                }}>
                                  TODAY
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '10px', color: isPast ? '#9ca3af' : '#be185d' }}>
                              {isPast
                                ? `${dayChildren.length} · day done`
                                : t('classroomOverview.childrenCount', { count: dayChildren.length })}
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

                  {/* ── Done this week (screen only — the grid above is the printable artifact) ── */}
                  <div className="no-print" style={{ padding: '16px', borderTop: '1px solid #e5e7eb', background: '#fafafa' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#065f46', marginBottom: 2 }}>
                      ✓ Done this week — {doneThisWeek.length} {doneThisWeek.length === 1 ? 'child' : 'children'}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
                      Children who&apos;ve already had English this week, and the day they did it. Repeats are fine — this shows the first day.
                    </div>
                    {doneThisWeek.length === 0 ? (
                      <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                        No children have done English yet this week.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {DAY_ORDER.map(day => {
                          const kids = doneThisWeek.filter(k => k.day === day);
                          if (kids.length === 0) return null;
                          return (
                            <div key={`done-${day}`} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                              <div style={{ width: 84, flexShrink: 0, fontWeight: 700, fontSize: 12, color: '#9d174d' }}>
                                {t(`classroomOverview.day.${day}`)}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {kids.map(k => (
                                  <span key={k.id} style={{
                                    fontSize: 12, fontWeight: 600, color: '#065f46',
                                    background: '#d1fae5', border: '1px solid #6ee7b7',
                                    borderRadius: 999, padding: '3px 10px',
                                  }}>
                                    {k.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {(() => {
                          // Children whose English day fell outside Mon–Fri (rare — weekend catch-up).
                          const offGrid = doneThisWeek.filter(k => !k.day || !DAY_ORDER.includes(k.day));
                          if (offGrid.length === 0) return null;
                          return (
                            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                              <div style={{ width: 84, flexShrink: 0, fontWeight: 700, fontSize: 12, color: '#9d174d' }}>
                                Other day
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {offGrid.map(k => (
                                  <span key={k.id} style={{
                                    fontSize: 12, fontWeight: 600, color: '#065f46',
                                    background: '#d1fae5', border: '1px solid #6ee7b7',
                                    borderRadius: 999, padding: '3px 10px',
                                  }}>
                                    {k.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* ── English activity tracker (screen only) ── */}
                  <div className="no-print" style={{ padding: '16px', borderTop: '1px solid #e5e7eb', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 2 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#9d174d' }}>
                        English activity — most to least
                      </div>
                      <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
                        {([['recent', 'Last 4 weeks'], ['all', 'All time']] as const).map(([val, label]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTrackerWindow(val)}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 6,
                              border: 'none', cursor: 'pointer',
                              background: trackerWindow === val ? '#ec4899' : 'transparent',
                              color: trackerWindow === val ? 'white' : '#6b7280',
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
                      How many English sessions each child has had ({trackerWindow === 'recent' ? 'last 4 weeks' : 'all time'}).
                      The lowest few are highlighted in amber — they may need more time on the English side.
                    </div>
                    {(() => {
                      const pick = (c: ActivityTrackerChild) =>
                        trackerWindow === 'recent' ? c.sessions_4w : c.sessions_all;
                      const ranked = [...activityTracker].sort(
                        (a, b) => pick(b) - pick(a) || a.name.localeCompare(b.name),
                      );
                      if (ranked.length === 0) {
                        return (
                          <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
                            No children in this class yet.
                          </div>
                        );
                      }
                      const maxCount = Math.max(1, ...ranked.map(pick));
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {ranked.map((c, i) => {
                            const count = pick(c);
                            const isLow = i >= ranked.length - 3; // bottom 3 = least active
                            const barPct = Math.round((count / maxCount) * 100);
                            return (
                              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 18, flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#9ca3af', textAlign: 'right' }}>
                                  {i + 1}
                                </span>
                                <span style={{
                                  width: 96, flexShrink: 0, fontSize: 12, fontWeight: 700,
                                  color: isLow ? '#b45309' : '#374151',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {c.name}
                                </span>
                                <div style={{ flex: 1, height: 14, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                  <div style={{ width: `${barPct}%`, height: '100%', background: isLow ? '#f59e0b' : '#ec4899', borderRadius: 4 }} />
                                </div>
                                <span style={{
                                  width: 28, flexShrink: 0, fontSize: 12, fontWeight: 700,
                                  color: isLow ? '#b45309' : '#9d174d', textAlign: 'right',
                                }}>
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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

          {/* ═══ TAB: English Progress (Session 119 Phase 1) ═══
              Per-child position in the 128-lesson Pink/Blue/Green
              progression. Hub for advance / set / reset actions.
              Auto-advancement from photo audit lands in Phase 2. */}
          {tab === 'english-progress' && session?.classroom?.id && (
            <EnglishProgressTab classroomId={session.classroom.id} T={T} />
          )}

          {/* ═══ TAB: Class Progress (Session 128 + later) ═══
              Per-area + per-child week/month summary across all 5 areas.
              Reads /api/montree/dashboard/class-progress (school-tz aware). */}
          {tab === 'class-progress' && session?.classroom?.id && (
            <ClassProgressTab classroomId={session.classroom.id} T={T} />
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

// ═══════════════════════════════════════════════════════════════════
// English Progress Tab (Session 119 Phase 1)
// ═══════════════════════════════════════════════════════════════════
// Per-child position in the 128-lesson Pink/Blue/Green progression.
// Reads from /api/montree/dashboard/english-progress + writes via PATCH.
// Migration 225 must be run for the tab to function — until then, the
// API returns migration_pending: true and the UI shows a banner.

interface EnglishProgressChild {
  child_id: string;
  child_name: string;
  has_progress_row: boolean;
  current_lesson: number;
  current_phase: 'pink' | 'blue' | 'green';
  lesson_label: string;
  mastered_count: number;
  phase_progress: Array<{
    phase: 'pink' | 'blue' | 'green';
    mastered: number;
    total: number;
    fraction: number;
  }>;
  last_advanced_at: string | null;
}

interface EnglishProgressResponse {
  success: true;
  classroom_id: string;
  total_lessons: number;
  children: EnglishProgressChild[];
  migration_pending?: boolean;
}

const PHASE_COLOR: Record<'pink' | 'blue' | 'green', string> = {
  pink: '#f9a8d4',
  blue: '#7dd3fc',
  green: '#86efac',
};
const PHASE_LABEL: Record<'pink' | 'blue' | 'green', string> = {
  pink: 'Pink',
  blue: 'Blue',
  green: 'Green',
};

/** Deep-link to the Library content page for a given lesson. Pink lessons
 *  1-4 are pre-reading review with no #lesson-N anchor — the link still
 *  opens the right page, just at the top. Anchors are injected by
 *  scripts/lesson-content/add-lesson-anchors.py. */
function lessonContentHref(phase: 'pink' | 'blue' | 'green', lesson: number): string {
  const file =
    phase === 'pink' ? 'language-area-lessons'
    : phase === 'blue' ? 'language-area-blue'
    : 'language-area-green';
  return `/${file}.html#lesson-${lesson}`;
}

function EnglishProgressTab({
  classroomId,
  T,
}: {
  classroomId: string;
  T: Record<string, string>;
}) {
  const [data, setData] = useState<EnglishProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyChildId, setBusyChildId] = useState<string | null>(null);
  const [pickerChildId, setPickerChildId] = useState<string | null>(null);
  // This-week English coverage — who hasn't been to the Language area yet.
  // null = not loaded / unavailable. languageAreaPresent gates the banner so
  // classrooms with no Language area configured don't see a misleading flag.
  const [missing, setMissing] = useState<{
    ids: Set<string>;
    names: string[];
    languageAreaPresent: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      // english-missing is best-effort — its failure must never block the
      // progression tab, so it's caught independently of the main fetch.
      const [res, missRes] = await Promise.all([
        montreeApi('/api/montree/dashboard/english-progress'),
        montreeApi('/api/montree/dashboard/english-missing').catch(() => null),
      ]);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || `HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as EnglishProgressResponse;
      setData(json);

      if (missRes && missRes.ok) {
        try {
          const mj = await missRes.json();
          const list = Array.isArray(mj?.missing) ? mj.missing : [];
          setMissing({
            ids: new Set(list.map((c: { id: string }) => c.id)),
            names: list.map((c: { name: string }) => c.name),
            languageAreaPresent: mj?.language_area_present === true,
          });
        } catch {
          setMissing(null);
        }
      } else {
        setMissing(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    }
  }, []);

  useEffect(() => { void load(); }, [load, classroomId]);

  const handleAdvance = useCallback(async (childId: string) => {
    if (busyChildId) return;
    setBusyChildId(childId);
    try {
      const res = await montreeApi('/api/montree/dashboard/english-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance', child_id: childId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || `HTTP ${res.status}`);
        return;
      }
      await load();
    } finally {
      setBusyChildId(null);
    }
  }, [busyChildId, load]);

  const handleSet = useCallback(async (childId: string, lesson: number) => {
    if (busyChildId) return;
    setBusyChildId(childId);
    try {
      const res = await montreeApi('/api/montree/dashboard/english-progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', child_id: childId, lesson }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || `HTTP ${res.status}`);
        return;
      }
      await load();
      setPickerChildId(null);
    } finally {
      setBusyChildId(null);
    }
  }, [busyChildId, load]);

  if (error) {
    return (
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '40px 16px', textAlign: 'center' }}>
        <p style={{ color: T.red, fontSize: 14 }}>{error}</p>
        <button onClick={() => { setError(null); void load(); }} style={{
          marginTop: 14,
          padding: '8px 16px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: T.textPrimary,
          fontSize: 13,
          cursor: 'pointer',
        }}>Try again</button>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ padding: '60px 16px', textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 1024,
      margin: '0 auto',
      padding: '24px 16px 60px',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {data.migration_pending && (
        <div style={{
          padding: '12px 16px',
          marginBottom: 18,
          borderRadius: 12,
          background: 'rgba(245,158,11,0.10)',
          border: '1px solid rgba(245,158,11,0.40)',
          color: '#fcd34d',
          fontSize: 13,
        }}>
          <span style={{ fontWeight: 700 }}>Setup needed: </span>
          Run <code style={{
            background: 'rgba(0,0,0,0.30)',
            padding: '1px 6px',
            borderRadius: 4,
          }}>migrations/225_child_english_progress.sql</code> in Supabase SQL Editor.
          This tab unlocks the moment that migration runs.
        </div>
      )}

      {/* Header explainer — anchors the teacher in the concept */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          fontFamily: 'var(--font-lora), Georgia, serif',
          fontSize: 22,
          fontWeight: 500,
          color: T.textPrimary,
          letterSpacing: -0.3,
        }}>
          English Progression
        </div>
        <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4, lineHeight: 1.5 }}>
          Each child&apos;s position in the 128-lesson Pink → Blue → Green progression
          from your Library. Tap a child&apos;s lesson to open its word bank, phrases
          and heart words; use ▸ to advance once they&apos;ve mastered it.
        </div>
      </div>

      {/* This-week coverage — who hasn't been to the English area yet, so the
          teacher knows who to pull in. Only shown when a Language area exists. */}
      {missing && missing.languageAreaPresent && (
        missing.ids.size > 0 ? (
          <div style={{
            padding: '12px 16px',
            marginBottom: 18,
            borderRadius: 12,
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.40)',
            fontSize: 13,
            lineHeight: 1.55,
          }}>
            <span style={{ fontWeight: 700, color: '#fcd34d' }}>
              {missing.ids.size === 1
                ? '1 child hasn’t been to the English area this week'
                : `${missing.ids.size} children haven’t been to the English area this week`}
            </span>
            <span style={{ color: T.textSecondary }}> — these are the ones to see: </span>
            <span style={{ color: T.textPrimary, fontWeight: 600 }}>
              {missing.names.join(', ')}
            </span>
          </div>
        ) : (
          <div style={{
            padding: '10px 16px',
            marginBottom: 18,
            borderRadius: 12,
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.30)',
            fontSize: 13,
            color: '#86efac',
          }}>
            ✓ Every child has had English time this week.
          </div>
        )
      )}

      {/* Class heatmap — at-a-glance class progression (Session 119 Phase 3) */}
      {data.children.length > 0 && (
        <ClassEnglishHeatmap
          kids={data.children}
          totalLessons={data.total_lessons}
          T={T}
        />
      )}

      {/* Per-child position cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.children.length === 0 ? (
          <div style={{
            padding: '40px 24px',
            textAlign: 'center',
            color: T.textMuted,
            fontSize: 13,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(52,211,153,0.15)',
            borderRadius: 14,
          }}>
            No active children in this classroom.
          </div>
        ) : (
          data.children.map(child => (
            <ChildProgressCard
              key={child.child_id}
              child={child}
              totalLessons={data.total_lessons}
              missingThisWeek={missing?.ids.has(child.child_id) ?? false}
              busy={busyChildId === child.child_id}
              pickerOpen={pickerChildId === child.child_id}
              onAdvance={() => handleAdvance(child.child_id)}
              onOpenPicker={() => setPickerChildId(child.child_id)}
              onClosePicker={() => setPickerChildId(null)}
              onSet={(lesson) => handleSet(child.child_id, lesson)}
              T={T}
            />
          ))
        )}
      </div>

      {/* Future-state footer note */}
      <div style={{
        marginTop: 28,
        padding: '12px 16px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        color: T.textMuted,
        fontSize: 12,
        lineHeight: 1.5,
      }}>
        Coming in Phase 2: when you confirm a photo of a Language work in
        Photo Audit, this tab will suggest one-tap advancement automatically.
        For now, the ▸ button advances manually.
      </div>
    </div>
  );
}

function ChildProgressCard({
  child,
  totalLessons,
  missingThisWeek,
  busy,
  pickerOpen,
  onAdvance,
  onOpenPicker,
  onClosePicker,
  onSet,
  T,
}: {
  child: EnglishProgressChild;
  totalLessons: number;
  missingThisWeek: boolean;
  busy: boolean;
  pickerOpen: boolean;
  onAdvance: () => void;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onSet: (lesson: number) => void;
  T: Record<string, string>;
}) {
  const overallFraction = (child.current_lesson - 1) / totalLessons; // 0..1
  const atFinal = child.current_lesson >= totalLessons;

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(52,211,153,0.15)',
      backdropFilter: 'blur(12px) saturate(140%)',
      WebkitBackdropFilter: 'blur(12px) saturate(140%)',
    }}>
      {/* Top row: name + lesson position + advance */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-lora), Georgia, serif',
            fontSize: 16,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.1,
          }}>
            {child.child_name}
          </div>
          <button
            type="button"
            onClick={() => window.open(
              lessonContentHref(child.current_phase, child.current_lesson),
              '_blank',
              'noopener,noreferrer',
            )}
            title={`Open Lesson ${child.current_lesson} — word bank, phrases, heart words`}
            style={{
              marginTop: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              maxWidth: '100%',
              fontSize: 12,
              color: T.textSecondary,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '5px 9px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: PHASE_COLOR[child.current_phase],
              flexShrink: 0,
            }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Lesson {child.current_lesson}/{totalLessons} · {child.lesson_label}
            </span>
            <BookOpen size={13} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.8 }} />
          </button>
          {hasLessonMaterials(child.current_lesson) && (
            <button
              type="button"
              onClick={() => window.open(
                `/montree/library/tools/phonics-fast/three-part-cards?lesson=${child.current_lesson}`,
                '_blank',
                'noopener,noreferrer',
              )}
              title={`Make three-part cards scoped to Lesson ${child.current_lesson}`}
              style={{
                marginTop: 6,
                marginLeft: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 12,
                color: '#34d399',
                background: 'rgba(52,211,153,0.10)',
                border: '1px solid rgba(52,211,153,0.30)',
                borderRadius: 8,
                padding: '5px 9px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Printer size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />
              <span>Make materials</span>
            </button>
          )}
          {missingThisWeek && (
            <div style={{ marginTop: 6 }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                color: '#fcd34d',
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.35)',
                borderRadius: 7,
                padding: '3px 8px',
              }}>
                ⚠ Not in the English area this week
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={onOpenPicker}
            disabled={busy}
            aria-label={`Set lesson for ${child.child_name}`}
            title="Set specific lesson"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              cursor: busy ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: busy ? 0.5 : 1,
            }}
          >
            <Settings2 size={15} strokeWidth={1.75} />
          </button>
          <button
            onClick={onAdvance}
            disabled={busy || atFinal}
            aria-label={`Advance ${child.child_name} to next lesson`}
            title={atFinal ? 'Already at final lesson' : 'Advance to next lesson'}
            style={{
              padding: '0 14px',
              height: 36,
              borderRadius: 10,
              background: atFinal
                ? 'rgba(255,255,255,0.06)'
                : 'linear-gradient(135deg, #34d399 0%, #1D6B48 100%)',
              border: atFinal
                ? '1px solid rgba(255,255,255,0.10)'
                : '1px solid rgba(52,211,153,0.55)',
              color: atFinal ? T.textMuted : '#06281a',
              fontWeight: 700,
              fontSize: 13,
              cursor: (busy || atFinal) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              opacity: busy ? 0.6 : 1,
            }}
          >
            Advance <ChevronRight size={15} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {/* Phase progress bars */}
      <div style={{
        marginTop: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
      }}>
        {child.phase_progress.map(pp => (
          <div key={pp.phase} style={{ minWidth: 0 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 10,
              color: T.textMuted,
              marginBottom: 4,
              fontWeight: 600,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}>
              <span style={{ color: PHASE_COLOR[pp.phase] }}>{PHASE_LABEL[pp.phase]}</span>
              <span>{pp.mastered}/{pp.total}</span>
            </div>
            <div style={{
              height: 6,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.round(pp.fraction * 100)}%`,
                height: '100%',
                background: PHASE_COLOR[pp.phase],
                borderRadius: 3,
                transition: 'width 240ms ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Overall progress strip */}
      <div style={{
        marginTop: 10,
        height: 4,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.round(overallFraction * 100)}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #f9a8d4 0%, #7dd3fc 50%, #86efac 100%)',
          transition: 'width 240ms ease',
        }} />
      </div>

      {/* Lesson picker modal (inline expand) */}
      {pickerOpen && (
        <LessonPickerInline
          currentLesson={child.current_lesson}
          totalLessons={totalLessons}
          busy={busy}
          onClose={onClosePicker}
          onPick={onSet}
          T={T}
        />
      )}
    </div>
  );
}

function LessonPickerInline({
  currentLesson,
  totalLessons,
  busy,
  onClose,
  onPick,
  T,
}: {
  currentLesson: number;
  totalLessons: number;
  busy: boolean;
  onClose: () => void;
  onPick: (lesson: number) => void;
  T: Record<string, string>;
}) {
  const [draft, setDraft] = useState<string>(String(currentLesson));
  const parsed = Number(draft);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= totalLessons;

  return (
    <div style={{
      marginTop: 14,
      padding: '12px 14px',
      borderRadius: 10,
      background: 'rgba(0,0,0,0.25)',
      border: '1px solid rgba(255,255,255,0.10)',
    }}>
      <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 8 }}>
        Set lesson directly (1–{totalLessons}):
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number"
          min={1}
          max={totalLessons}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          autoFocus
          style={{
            width: 100,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.30)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: T.textPrimary,
            fontSize: 16,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          onClick={() => valid && onPick(parsed)}
          disabled={!valid || busy}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: valid ? 'linear-gradient(135deg, #34d399 0%, #1D6B48 100%)' : 'rgba(255,255,255,0.06)',
            border: valid ? '1px solid rgba(52,211,153,0.55)' : '1px solid rgba(255,255,255,0.10)',
            color: valid ? '#06281a' : T.textMuted,
            fontWeight: 700,
            fontSize: 13,
            cursor: (valid && !busy) ? 'pointer' : 'not-allowed',
          }}
        >
          Set
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.10)',
            color: T.textMuted,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────
// Class Heatmap (Session 119 Phase 3)
// ───────────────────────────────────────────────────────────────────
// Horizontal strip showing every child as a dot on the 1..128 axis.
// Phase ranges get tinted backgrounds (Pink 1-53, Blue 54-83, Green 84-128).
// Hover/tap a dot to see the child's name + current lesson. At-a-glance
// answers "where is my class as a whole?" Where the per-child cards
// below answer "where is each child?".

function ClassEnglishHeatmap({
  kids,
  totalLessons,
  T,
}: {
  // Named `kids` not `children` to avoid React's reserved `children` prop name.
  kids: EnglishProgressChild[];
  totalLessons: number;
  T: Record<string, string>;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Pink ends at 53 (53/128 ≈ 41.4%), Blue ends at 83 (83/128 ≈ 64.8%).
  // Hardcoded here because the heatmap is purely visual — if the lesson
  // map ever rebalances, this single component is the only place to update.
  const PINK_END = 53;
  const BLUE_END = 83;
  const pinkFrac = PINK_END / totalLessons;
  const blueFrac = (BLUE_END - PINK_END) / totalLessons;
  const greenFrac = (totalLessons - BLUE_END) / totalLessons;

  // Stable horizontal order: by lesson ASC, then name ASC for ties.
  const sorted = [...kids].sort((a, b) => {
    if (a.current_lesson !== b.current_lesson) {
      return a.current_lesson - b.current_lesson;
    }
    return a.child_name.localeCompare(b.child_name);
  });

  // Group dots by exact lesson number so multiple kids on the same lesson
  // stack vertically rather than overlap into a single illegible dot.
  const byLesson = new Map<number, EnglishProgressChild[]>();
  for (const c of sorted) {
    const arr = byLesson.get(c.current_lesson) ?? [];
    arr.push(c);
    byLesson.set(c.current_lesson, arr);
  }

  const STRIP_HEIGHT = 56;
  const DOT_SIZE = 11;
  const STACK_GAP = 2;

  const hoveredChild = hovered ? kids.find(c => c.child_id === hovered) : null;

  return (
    <div style={{
      marginBottom: 18,
      padding: '14px 16px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(52,211,153,0.15)',
      backdropFilter: 'blur(12px) saturate(140%)',
      WebkitBackdropFilter: 'blur(12px) saturate(140%)',
    }}>
      {/* Title row */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: T.textPrimary,
          letterSpacing: 0.1,
        }}>
          Class at a glance
        </div>
        <div style={{ fontSize: 11, color: T.textMuted }}>
          {kids.length} {kids.length === 1 ? 'child' : 'children'} · 1 → {totalLessons}
        </div>
      </div>

      {/* The strip itself */}
      <div style={{
        position: 'relative',
        height: STRIP_HEIGHT,
        borderRadius: 8,
        overflow: 'hidden',
        // Three-phase tinted background using a CSS gradient.
        background: `linear-gradient(to right,
          ${PHASE_COLOR.pink}26 0%,
          ${PHASE_COLOR.pink}26 ${pinkFrac * 100}%,
          ${PHASE_COLOR.blue}26 ${pinkFrac * 100}%,
          ${PHASE_COLOR.blue}26 ${(pinkFrac + blueFrac) * 100}%,
          ${PHASE_COLOR.green}26 ${(pinkFrac + blueFrac) * 100}%,
          ${PHASE_COLOR.green}26 100%)`,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Phase divider lines */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${pinkFrac * 100}%`,
          width: 1,
          background: 'rgba(255,255,255,0.12)',
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${(pinkFrac + blueFrac) * 100}%`,
          width: 1,
          background: 'rgba(255,255,255,0.12)',
        }} />

        {/* Child dots — grouped by lesson, stacked vertically when collisions */}
        {Array.from(byLesson.entries()).map(([lesson, kidsAtLesson]) => {
          const fraction = (lesson - 1) / (totalLessons - 1 || 1);
          const leftPct = fraction * 100;
          return kidsAtLesson.map((child, idx) => {
            const isHovered = hovered === child.child_id;
            const phase = child.current_phase;
            // K-bound kids would ideally get a different ring, but the API
            // doesn't currently surface is_k_bound — phase color is fine.
            const baseColor = PHASE_COLOR[phase];
            const verticalOffset = idx * (DOT_SIZE + STACK_GAP);
            return (
              <button
                key={child.child_id}
                type="button"
                onMouseEnter={() => setHovered(child.child_id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(child.child_id)}
                onBlur={() => setHovered(null)}
                onClick={() => setHovered(prev => prev === child.child_id ? null : child.child_id)}
                aria-label={`${child.child_name} — Lesson ${child.current_lesson}`}
                style={{
                  position: 'absolute',
                  left: `calc(${leftPct}% - ${DOT_SIZE / 2}px)`,
                  bottom: 4 + verticalOffset,
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  borderRadius: '50%',
                  background: baseColor,
                  border: isHovered
                    ? '2px solid rgba(255,255,255,0.95)'
                    : '1px solid rgba(0,0,0,0.40)',
                  padding: 0,
                  cursor: 'pointer',
                  transform: isHovered ? 'scale(1.4)' : 'scale(1)',
                  transition: 'transform 100ms ease, border 100ms ease',
                  zIndex: isHovered ? 5 : 1,
                  boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.40)' : 'none',
                }}
              />
            );
          });
        })}

        {/* Phase axis labels (bottom) */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 4,
          display: 'flex',
          fontSize: 10,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}>
          <div style={{ width: `${pinkFrac * 100}%`, textAlign: 'center' }}>Pink</div>
          <div style={{ width: `${blueFrac * 100}%`, textAlign: 'center' }}>Blue</div>
          <div style={{ width: `${greenFrac * 100}%`, textAlign: 'center' }}>Green</div>
        </div>
      </div>

      {/* Hover/tap detail */}
      <div style={{
        marginTop: 8,
        minHeight: 18,
        fontSize: 12,
        color: hoveredChild ? T.textPrimary : T.textMuted,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        {hoveredChild
          ? <>
              <span style={{ fontWeight: 600 }}>{hoveredChild.child_name}</span>
              {' · Lesson '}{hoveredChild.current_lesson}{'/'}{totalLessons}
              {' · '}{hoveredChild.lesson_label}
            </>
          : <em>Hover or tap a dot for the child&apos;s lesson</em>}
      </div>

      {/* Class summary stats */}
      <div style={{
        marginTop: 10,
        display: 'flex',
        gap: 14,
        fontSize: 11,
        color: T.textMuted,
        flexWrap: 'wrap',
      }}>
        {(['pink', 'blue', 'green'] as const).map(phase => {
          const count = kids.filter(c => c.current_phase === phase).length;
          return (
            <span key={phase} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: PHASE_COLOR[phase],
                display: 'inline-block',
              }} />
              {PHASE_LABEL[phase]}: {count}
            </span>
          );
        })}
        <span style={{ marginLeft: 'auto' }}>
          Class avg: Lesson {Math.round(
            kids.reduce((sum, c) => sum + c.current_lesson, 0) / kids.length
          )}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Class Progress Tab
// ═══════════════════════════════════════════════════════════════════
// Classroom-wide summary across all 5 curriculum areas. Mirrors the
// vibe of the English Schedule tab — clean, scannable, dark-forest.
//
// Top: 5 area summary cards (PL/S/M/L/C) — children active, photos,
// works touched, top 3 works.
// Bottom: per-child rows — areas-active pill, photos, last_active,
// 5 mini bars (one per area, proportional to that child's max).
//
// Children sorted: most areas active DESC, ties → most photos DESC.
// Children with zero photos this week sink to bottom under a quiet
// "Quiet this week" subhead.

type ClassProgressAreaKey =
  | 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'cultural';

const CP_AREA_ORDER: ClassProgressAreaKey[] = [
  'practical_life', 'sensorial', 'mathematics', 'language', 'cultural',
];

// Canonical area palette — sourced from
// components/montree/child/FocusWorksSection.tsx AREA_DOT_RGB constant.
const CP_AREA_COLOR: Record<ClassProgressAreaKey, string> = {
  practical_life: 'rgb(236, 72, 153)',   // pink
  sensorial:      'rgb(20, 184, 166)',   // teal
  mathematics:    'rgb(168, 85, 247)',   // purple
  language:       'rgb(74, 222, 128)',   // green
  cultural:       'rgb(249, 115, 22)',   // orange
};

const CP_AREA_LETTER: Record<ClassProgressAreaKey, string> = {
  practical_life: 'PL',
  sensorial: 'S',
  mathematics: 'M',
  language: 'L',
  cultural: 'C',
};

const CP_AREA_LABEL: Record<ClassProgressAreaKey, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

interface CPTopWork {
  work_name: string;
  photo_count: number;
  children_count: number;
}

interface CPAreaSummary {
  area_key: ClassProgressAreaKey;
  area_label: string;
  children_active: number;
  photos_total: number;
  works_active: number;
  top_works: CPTopWork[];
}

interface CPPerChild {
  child_id: string;
  child_name: string;
  photo_url: string | null;
  areas_active: number;
  photos_total: number;
  last_active: string | null;
  area_breakdown: Record<ClassProgressAreaKey, number>;
}

interface ClassProgressResponse {
  success: true;
  classroom_id: string;
  children_count: number;
  period: 'week' | 'month';
  areas: CPAreaSummary[];
  per_child: CPPerChild[];
  week_start: string;
  generated_at: string;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'no activity';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function formatWeekRange(weekStart: string, period: 'week' | 'month'): string {
  if (!weekStart) return '';
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(start);
  if (period === 'month') {
    // 30-day window backwards from Monday — show as range
    end.setDate(start.getDate() + 6);
    const back = new Date(start);
    back.setDate(start.getDate() - 30);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${back.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
  }
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function ClassProgressTab({
  classroomId,
  T,
}: {
  classroomId: string;
  T: Record<string, string>;
}) {
  const [data, setData] = useState<ClassProgressResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await montreeApi(`/api/montree/dashboard/class-progress?period=${period}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as ClassProgressResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { void load(); }, [load, classroomId]);

  // ─── Loading ───
  if (loading && !data) {
    return (
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '60px 16px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 28,
          height: 28,
          border: `3px solid ${T.emeraldDim}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          margin: '0 auto 12px',
          animation: 'cl-spin 0.9s linear infinite',
        }} />
        <p style={{
          margin: 0,
          color: T.textMuted,
          fontSize: 13,
          fontFamily: T.serif,
          fontStyle: 'italic',
        }}>
          Reading the week…
        </p>
      </div>
    );
  }

  // ─── Error / fallback (e.g. endpoint missing) ───
  if (error || !data) {
    return (
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '40px 24px',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(52,211,153,0.15)',
        borderRadius: 14,
        marginTop: 24,
      }}>
        <p style={{
          fontFamily: T.serif,
          fontSize: 15,
          color: T.textSecondary,
          margin: '0 0 16px',
          lineHeight: 1.55,
        }}>
          Class Progress will appear once your classroom has some confirmed photos this week.
        </p>
        <button
          onClick={() => { void load(); }}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: T.textPrimary,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: T.sans,
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ─── Empty roster ───
  if (data.children_count === 0) {
    return (
      <div style={{
        maxWidth: 720,
        margin: '24px auto 0',
        padding: '40px 24px',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(52,211,153,0.15)',
        borderRadius: 14,
      }}>
        <p style={{
          fontFamily: T.serif,
          fontSize: 15,
          color: T.textSecondary,
          margin: 0,
          lineHeight: 1.55,
        }}>
          Add students to this classroom first — then come back here to see how the week is shaping up.
        </p>
      </div>
    );
  }

  // ─── Render ───
  const periodLabel = period === 'week' ? 'This week' : 'This month';
  const dateRange = formatWeekRange(data.week_start, period);
  const totalPhotosThisPeriod = data.areas.reduce((s, a) => s + a.photos_total, 0);

  // Split children into active vs quiet
  const activeChildren = data.per_child.filter(c => c.photos_total > 0);
  const quietChildren = data.per_child.filter(c => c.photos_total === 0);

  return (
    <div style={{
      maxWidth: 1100,
      margin: '0 auto',
      padding: '24px 16px 60px',
      fontFamily: T.sans,
    }}>
      {/* Header — title + period toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 6,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: T.serif,
            fontSize: 22,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.3,
          }}>
            {periodLabel} across the classroom
          </div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
            {dateRange} · {totalPhotosThisPeriod} confirmed {totalPhotosThisPeriod === 1 ? 'photo' : 'photos'}
          </div>
        </div>

        {/* Period toggle */}
        <div style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {(['week', 'month'] as const).map(p => {
            const active = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 7,
                  background: active ? 'rgba(52,211,153,0.15)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(52,211,153,0.45)' : 'transparent'}`,
                  color: active ? T.emerald : T.textSecondary,
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-area summary cards — 5 across, wrap to 2 rows on narrow */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
        marginTop: 18,
        marginBottom: 28,
      }}>
        {data.areas.map(area => (
          <ClassProgressAreaCard
            key={area.area_key}
            area={area}
            totalChildren={data.children_count}
            T={T}
          />
        ))}
      </div>

      {/* Per-child rows */}
      <div style={{
        fontFamily: T.serif,
        fontSize: 16,
        fontWeight: 500,
        color: T.textPrimary,
        marginBottom: 10,
        letterSpacing: -0.1,
      }}>
        Per child
      </div>

      {activeChildren.length === 0 ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: T.textMuted,
          fontSize: 13,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(52,211,153,0.15)',
          borderRadius: 14,
          fontStyle: 'italic',
        }}>
          No confirmed photos yet this {period}. As soon as a teacher confirms one, it shows up here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeChildren.map(child => (
            <ClassProgressChildRow key={child.child_id} child={child} T={T} />
          ))}
        </div>
      )}

      {/* Quiet-this-week subhead + rows */}
      {quietChildren.length > 0 && (
        <>
          <div style={{
            fontFamily: T.serif,
            fontSize: 14,
            fontWeight: 500,
            color: T.textMuted,
            marginTop: 22,
            marginBottom: 8,
            letterSpacing: -0.1,
            fontStyle: 'italic',
          }}>
            Quiet this {period} — no confirmed photos yet
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quietChildren.map(child => (
              <span
                key={child.child_id}
                style={{
                  padding: '5px 11px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: T.textSecondary,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {child.child_name}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ClassProgressAreaCard({
  area,
  totalChildren,
  T,
}: {
  area: CPAreaSummary;
  totalChildren: number;
  T: Record<string, string>;
}) {
  const color = CP_AREA_COLOR[area.area_key];
  const letter = CP_AREA_LETTER[area.area_key];
  const label = CP_AREA_LABEL[area.area_key];
  const isQuiet = area.photos_total === 0;

  return (
    <div style={{
      padding: '14px 14px',
      borderRadius: 14,
      background: 'rgba(15,30,18,0.78)',
      border: '1px solid rgba(52,211,153,0.15)',
      backdropFilter: 'blur(12px) saturate(140%)',
      WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      opacity: isQuiet ? 0.65 : 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 150,
    }}>
      {/* Letter dot + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: color,
          color: 'white',
          fontFamily: T.sans,
          fontSize: letter.length > 1 ? 11 : 13,
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 0 1px ${color}, 0 0 12px ${color}33`,
        }}>
          {letter}
        </div>
        <div style={{
          fontFamily: T.sans,
          fontSize: 12,
          fontWeight: 600,
          color: T.textSecondary,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
      </div>

      {/* Big number */}
      <div style={{ marginTop: 2 }}>
        <span style={{
          fontFamily: T.serif,
          fontSize: 28,
          fontWeight: 600,
          color: T.textPrimary,
          letterSpacing: -0.5,
        }}>
          {area.children_active}
        </span>
        <span style={{
          fontFamily: T.serif,
          fontSize: 16,
          color: T.textMuted,
          marginLeft: 4,
        }}>
          / {totalChildren}
        </span>
      </div>
      <div style={{
        fontSize: 11,
        color: T.textMuted,
        marginTop: 2,
        marginBottom: 8,
      }}>
        {area.children_active === 1 ? 'child' : 'children'} active
      </div>

      {/* Secondary stats */}
      <div style={{ fontSize: 11, color: T.textSecondary, marginBottom: 8, lineHeight: 1.55 }}>
        {area.photos_total} {area.photos_total === 1 ? 'photo' : 'photos'}
        {' · '}
        {area.works_active} {area.works_active === 1 ? 'work' : 'works'}
      </div>

      {/* Top works list */}
      {area.top_works.length > 0 ? (
        <div style={{
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}>
          {area.top_works.slice(0, 3).map(w => (
            <div
              key={w.work_name}
              style={{
                fontSize: 11,
                color: T.textSecondary,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={`${w.work_name} — ${w.photo_count} photo${w.photo_count === 1 ? '' : 's'}, ${w.children_count} ${w.children_count === 1 ? 'child' : 'children'}`}
            >
              <span style={{ color: T.textPrimary, fontWeight: 500 }}>{w.work_name}</span>
              <span style={{ color: T.textMuted }}> · {w.photo_count}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11,
          color: T.textMuted,
          fontStyle: 'italic',
        }}>
          No works tagged yet
        </div>
      )}
    </div>
  );
}

function ClassProgressChildRow({
  child,
  T,
}: {
  child: CPPerChild;
  T: Record<string, string>;
}) {
  const childMaxAreaCount = Math.max(1, ...CP_AREA_ORDER.map(k => child.area_breakdown[k]));
  const initial = child.child_name.charAt(0).toUpperCase();

  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 12,
      background: 'rgba(15,30,18,0.78)',
      border: '1px solid rgba(52,211,153,0.15)',
      backdropFilter: 'blur(12px) saturate(140%)',
      WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      {/* Avatar — URL wrapped in quotes so paren/quote chars in signed URLs
          don't break the CSS background shorthand. */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: child.photo_url
          ? `center / cover no-repeat url("${child.photo_url.replace(/"/g, '\\"')}")`
          : 'rgba(52,211,153,0.18)',
        border: '1px solid rgba(52,211,153,0.35)',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: T.emerald,
        fontSize: 13,
        fontWeight: 700,
        fontFamily: T.sans,
      }}>
        {!child.photo_url && initial}
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 140, flex: '0 0 auto' }}>
        <div style={{
          fontFamily: T.serif,
          fontSize: 15,
          fontWeight: 500,
          color: T.textPrimary,
          letterSpacing: -0.1,
        }}>
          {child.child_name}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
          {formatRelativeTime(child.last_active)}
        </div>
      </div>

      {/* Areas active pill */}
      <span style={{
        padding: '3px 10px',
        borderRadius: 999,
        background: 'rgba(52,211,153,0.10)',
        border: '1px solid rgba(52,211,153,0.30)',
        color: T.emerald,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.2,
        flexShrink: 0,
      }}>
        {child.areas_active}/5 areas
      </span>

      {/* Photos count */}
      <span style={{
        fontSize: 11,
        color: T.textMuted,
        flexShrink: 0,
      }}>
        {child.photos_total} {child.photos_total === 1 ? 'photo' : 'photos'}
      </span>

      {/* 5 mini bars — one per area */}
      <div style={{
        flex: 1,
        minWidth: 160,
        display: 'flex',
        gap: 4,
        alignItems: 'flex-end',
        height: 22,
        marginLeft: 'auto',
      }}>
        {CP_AREA_ORDER.map(area => {
          const count = child.area_breakdown[area];
          const pct = count > 0 ? (count / childMaxAreaCount) * 100 : 0;
          const isActive = count > 0;
          return (
            <div
              key={area}
              title={`${CP_AREA_LABEL[area]}: ${count} ${count === 1 ? 'photo' : 'photos'}`}
              style={{
                flex: 1,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <div style={{
                width: '100%',
                height: `${Math.max(pct, isActive ? 12 : 0)}%`,
                minHeight: isActive ? 3 : 0,
                background: isActive
                  ? CP_AREA_COLOR[area]
                  : 'rgba(255,255,255,0.06)',
                borderRadius: 2,
                transition: 'height 220ms ease',
              }} />
              <div style={{
                fontSize: 8,
                fontWeight: 700,
                color: isActive ? T.textSecondary : T.textMuted,
                letterSpacing: 0.4,
                lineHeight: 1,
              }}>
                {CP_AREA_LETTER[area]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
