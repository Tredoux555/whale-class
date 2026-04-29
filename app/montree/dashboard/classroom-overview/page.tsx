// Classroom Overview — Two tabs:
// 1. "Shelf Overview" — 20 students on 2 A4 pages (10 per page, 5×2 grid), works listed, rest blank for notes
// 2. "English Schedule" — weekly Mon-Fri grid, 6 children per day for Phonics Bingo, printable
// Dark forest screen chrome — print pages stay light for printability
'use client';

import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Printer, Layout, Languages,
  RefreshCw,
} from 'lucide-react';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { AREA_CONFIG } from '@/lib/montree/types';
import { normalizeArea } from '@/components/montree/shared/AreaBadge';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';

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
}

interface EnglishSchedule {
  days: Record<string, ScheduleChild[]>;
  children_count: number;
  k_bound_count: number;
  week_label: string;
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
  serif: '"Lora", Georgia, serif',
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

  // English schedule state
  const [schedule, setSchedule] = useState<EnglishSchedule | null>(null);
  const [scheduleWeek, setScheduleWeek] = useState<string>('');
  const [scheduleGeneratedAt, setScheduleGeneratedAt] = useState<string>('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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

  const loadSchedule = useCallback(async (forceGenerate = false) => {
    if (!session?.classroom?.id) return;
    setScheduleLoading(true);
    setScheduleError(false);
    try {
      const url = `/api/montree/dashboard/english-schedule${forceGenerate ? '?generate=true' : ''}`;
      const res = await montreeApi(url);
      if (!res.ok) throw new Error(`Schedule fetch: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setSchedule(data.schedule);
        setScheduleWeek(data.week_start);
        setScheduleGeneratedAt(data.generated_at);
      } else {
        setScheduleError(true);
      }
    } catch {
      setScheduleError(true);
    } finally {
      setScheduleLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (tab === 'english' && !schedule && !scheduleLoading) {
      loadSchedule();
    }
  }, [tab, schedule, scheduleLoading, loadSchedule]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const res = await montreeApi('/api/montree/dashboard/english-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Regenerate: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setSchedule(data.schedule);
        setScheduleWeek(data.week_start);
        setScheduleGeneratedAt(data.generated_at);
      }
    } catch (err) {
      console.error('Regenerate failed:', err);
    } finally {
      setRegenerating(false);
    }
  };

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
                            {dayChildren.map((child, idx) => (
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
                                }}
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
                                    color: '#111827',
                                    lineHeight: '1.2',
                                  }}>
                                    {child.name}
                                  </div>

                                  <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '1px' }}>
                                    {child.days_since_last_visit === null
                                      ? t('classroomOverview.daysSince.noRecord')
                                      : child.days_since_last_visit === 0
                                        ? t('classroomOverview.daysSince.today')
                                        : t('classroomOverview.daysSince.daysAgo', { days: child.days_since_last_visit })}
                                  </div>
                                </div>

                                <div style={{
                                  width: '20px', height: '20px',
                                  border: '2px solid #d1d5db', borderRadius: '4px',
                                  flexShrink: 0, marginTop: '2px',
                                }} />
                              </div>
                            ))}

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
