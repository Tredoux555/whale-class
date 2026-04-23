// Classroom Overview — Two tabs:
// 1. "Shelf Overview" — 20 students on 2 A4 pages (10 per page, 5×2 grid), works listed, rest blank for notes
// 2. "English Schedule" — weekly Mon-Fri grid, 6 children per day for Phonics Bingo, printable
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

const DAY_LABELS_EN: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday',
};
const DAY_LABELS_ZH: Record<string, string> = {
  monday: '周一', tuesday: '周二', wednesday: '周三',
  thursday: '周四', friday: '周五',
};
const DAY_LABELS_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri',
};
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

type TabType = 'shelf' | 'english';

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

  // Load English schedule when tab switches to english
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

  // Format the week label for display
  const formatWeekLabel = (weekStart: string) => {
    if (!weekStart) return '';
    const d = new Date(weekStart + 'T00:00:00');
    const end = new Date(d);
    end.setDate(d.getDate() + 4);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const loc = getIntlLocale(locale);
    return `${d.toLocaleDateString(loc, opts)} – ${end.toLocaleDateString(loc, opts)}`;
  };

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-gray-500 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <p className="text-red-500">{t('common.connectionError')}</p>
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
          }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
        }
        @media screen {
          .print-page { margin-bottom: 24px; }
        }
      `}</style>

      {/* Screen-only toolbar — sits below DashboardHeader */}
      <div className="no-print bg-white border-b border-gray-200 px-4 py-2 sticky top-[57px] z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            ← {t('common.back')}
          </button>
          <h1 className="font-bold text-base text-gray-800">{t('print.classOverview')}</h1>
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700"
          >
            🖨️ {t('print.printPage')}
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mt-2 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab('shelf')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'shelf'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            📋 {locale === 'zh' ? '书架总览' : 'Shelf Overview'}
          </button>
          <button
            onClick={() => setTab('english')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'english'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            🇬🇧 {locale === 'zh' ? '英语日程' : 'English Schedule'}
          </button>
        </div>
      </div>

      {/* ═══ TAB: Shelf Overview ═══ */}
      {tab === 'shelf' && (
        <div className="bg-white">
          {children.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-lg">
              {t('students.noStudents')}
            </div>
          ) : (
            pages.map((pageChildren, pageIdx) => (
              <div key={pageIdx} className="print-page" style={{ width: '100%', minHeight: '100vh' }}>
                <div style={{ padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontWeight: 700, fontSize: '11px', color: '#374151' }}>
                    {session?.classroom?.name || t('print.classOverview')}
                  </span>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                    {today} — {session?.teacher?.name} — {locale === 'zh' ? '页' : 'p'}{pageIdx + 1}/{pages.length}
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
        </div>
      )}

      {/* ═══ TAB: English Schedule ═══ */}
      {tab === 'english' && (
        <div className="bg-white">
          {scheduleLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-gray-500 text-sm">{locale === 'zh' ? '加载英语日程...' : 'Loading English schedule...'}</p>
              </div>
            </div>
          ) : scheduleError ? (
            <div className="text-center py-20">
              <p className="text-red-500 mb-3">{locale === 'zh' ? '加载失败' : 'Failed to load schedule'}</p>
              <button
                onClick={() => loadSchedule(true)}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600"
              >
                {locale === 'zh' ? '生成新日程' : 'Generate Schedule'}
              </button>
            </div>
          ) : schedule ? (
            <div className="print-page" style={{ width: '100%', minHeight: '100vh' }}>
              {/* Header */}
              <div style={{
                padding: '8px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '2px solid #ec4899',
                background: 'linear-gradient(135deg, #fdf2f8, #fce7f3)',
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: '#9d174d' }}>
                    🇬🇧 {locale === 'zh' ? '英语日程 — 每天6人' : 'English Schedule — 6 per day'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#be185d', fontWeight: 500 }}>
                    {formatWeekLabel(scheduleWeek)} · {session?.classroom?.name}
                  </div>
                </div>
                <div className="no-print flex gap-2">
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="px-3 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-bold hover:bg-pink-700 disabled:opacity-50"
                  >
                    {regenerating
                      ? (locale === 'zh' ? '生成中...' : 'Generating...')
                      : (locale === 'zh' ? '🔄 重新生成' : '🔄 Regenerate')}
                  </button>
                </div>
              </div>

              {/* Priority legend — no-print */}
              <div className="no-print" style={{ padding: '6px 16px', fontSize: '11px', color: '#6b7280', display: 'flex', gap: '16px', borderBottom: '1px solid #f3e8ff' }}>
                <span>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6', marginRight: '4px', verticalAlign: 'middle' }} />
                  {locale === 'zh' ? 'K班升班生（优先）' : 'Moving up to K (priority)'}
                </span>
                <span>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d1d5db', marginRight: '4px', verticalAlign: 'middle' }} />
                  {locale === 'zh' ? '其他学生' : 'Other children'}
                </span>
                <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
                  {locale === 'zh' ? '英语活动最少的孩子排在前面' : 'Least English activity → scheduled first'}
                </span>
              </div>

              {/* 5-column day grid — THE printable wall poster */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                height: 'calc(100vh - 80px)',
                borderTop: '1px solid #d1d5db',
                borderLeft: '1px solid #d1d5db',
              }}>
                {DAY_ORDER.map(day => {
                  const dayChildren = schedule.days[day] || [];
                  const dayLabel = locale === 'zh' ? DAY_LABELS_ZH[day] : DAY_LABELS_EN[day];
                  const dayShort = DAY_LABELS_SHORT[day];

                  return (
                    <div key={day} style={{
                      borderRight: '1px solid #d1d5db',
                      display: 'flex', flexDirection: 'column',
                    }}>
                      {/* Day header */}
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
                          {dayChildren.length} {locale === 'zh' ? '人' : dayChildren.length === 1 ? 'child' : 'children'}
                        </div>
                      </div>

                      {/* Children list */}
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
                            {/* Number badge */}
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
                              {/* Name */}
                              <div style={{
                                fontWeight: 700,
                                fontSize: '15px',
                                color: '#111827',
                                lineHeight: '1.2',
                              }}>
                                {child.name}
                              </div>

                              {/* Days since last English — small hint */}
                              <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '1px' }}>
                                {child.days_since_last_visit === null
                                  ? (locale === 'zh' ? '从未记录' : 'No record')
                                  : child.days_since_last_visit === 0
                                    ? (locale === 'zh' ? '今天' : 'Today')
                                    : locale === 'zh'
                                      ? `${child.days_since_last_visit}天前`
                                      : `${child.days_since_last_visit}d ago`}
                              </div>
                            </div>

                            {/* Checkbox area for teacher to tick off */}
                            <div style={{
                              width: '20px', height: '20px',
                              border: '2px solid #d1d5db', borderRadius: '4px',
                              flexShrink: 0, marginTop: '2px',
                            }} />
                          </div>
                        ))}

                        {/* Fill remaining slots to keep columns even */}
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
            <div className="text-center py-20">
              <p className="text-gray-400 mb-3">{locale === 'zh' ? '尚无英语日程' : 'No English schedule yet'}</p>
              <button
                onClick={() => loadSchedule(true)}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600"
              >
                {locale === 'zh' ? '生成本周日程' : 'Generate This Week\'s Schedule'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
