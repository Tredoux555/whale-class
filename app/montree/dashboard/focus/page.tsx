// app/montree/dashboard/focus/page.tsx
// "Focus List" — one page to answer "who needs my attention today?"
//
// Three tabs:
//   Master   → every child ranked by neglect score (days without photo, stale
//              progress, paperwork behind, zero Language this week)
//   Paperwork → embedded PaperworkPanel
//   Bingo    → "not yet" English Corner (Language) children this week
//
// On Master tab, tapping a child adds them to today's focus list. When a photo
// is later captured tagged with that child, the media-upload route auto-confirms
// the row (confirmed_via='photo' | 'group_photo'). Manual confirm is a PATCH.

'use client';

import { useState, useEffect, useCallback, useRef } from 'react'; // useRef for mount guard
import Link from 'next/link';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import DashboardHeader from '@/components/montree/DashboardHeader';
import PaperworkPanel from '@/components/montree/PaperworkPanel';

type Tab = 'master' | 'paperwork' | 'bingo';

interface MasterChild {
  id: string;
  name: string;
  photo_url: string | null;
  days_since_photo: number;
  days_since_progress: number;
  paperwork_weeks_behind: number;
  language_photos_this_week: number;
  no_language_this_week: boolean;
  stale_work: boolean;
  score: number;
}

interface MasterData {
  children: MasterChild[];
  targetWeek: number;
  weekStart: string;
  weekEnd: string;
  total: number;
}

interface FocusChild {
  id: string;
  child_id: string;
  name: string;
  photo_url: string | null;
  selected_at: string;
  confirmed_at: string | null;
  confirmed_via: string | null;
  confirmed: boolean;
}

interface FocusData {
  focus_date: string;
  children: FocusChild[];
  total: number;
  confirmed_count: number;
}

interface NotYetChild {
  id: string;
  name: string;
  photo_url: string | null;
}

interface TrackerData {
  notYet: NotYetChild[];
  totalChildren: number;
  visitedCount: number;
}

function ChildAvatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  const [fallback, setFallback] = useState(!photoUrl);
  const initial = name.charAt(0).toUpperCase();
  if (!fallback && photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setFallback(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      }}
    >
      {initial}
    </div>
  );
}

export default function FocusPage() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>('master');

  const [master, setMaster] = useState<MasterData | null>(null);
  const [focus, setFocus] = useState<FocusData | null>(null);
  const [bingo, setBingo] = useState<TrackerData | null>(null);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [loadingBingo, setLoadingBingo] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadMaster = useCallback(async () => {
    setLoadingMaster(true);
    try {
      const [listRes, focusRes] = await Promise.all([
        montreeApi('/api/montree/dashboard/focus-list'),
        montreeApi('/api/montree/dashboard/daily-focus'),
      ]);
      if (!mountedRef.current) return;
      if (listRes.ok) setMaster(await listRes.json());
      if (focusRes.ok) setFocus(await focusRes.json());
    } catch (e) {
      console.error('[Focus] loadMaster:', e);
    } finally {
      if (mountedRef.current) setLoadingMaster(false);
    }
  }, []);

  const loadBingo = useCallback(async () => {
    setLoadingBingo(true);
    try {
      const res = await montreeApi('/api/montree/dashboard/language-tracker');
      if (!mountedRef.current) return;
      if (res.ok) setBingo(await res.json());
    } catch (e) {
      console.error('[Focus] loadBingo:', e);
    } finally {
      if (mountedRef.current) setLoadingBingo(false);
    }
  }, []);

  useEffect(() => { loadMaster(); }, [loadMaster]);
  useEffect(() => {
    if (tab === 'bingo' && !bingo) loadBingo();
  }, [tab, bingo, loadBingo]);

  const focusedIds = new Set((focus?.children || []).map(c => c.child_id));
  const confirmedIds = new Set((focus?.children || []).filter(c => c.confirmed).map(c => c.child_id));

  const toggleFocus = async (childId: string) => {
    if (mutating) return;
    setMutating(childId);
    try {
      const method = focusedIds.has(childId) ? 'DELETE' : 'POST';
      const res = await montreeApi('/api/montree/dashboard/daily-focus', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });
      if (res.ok) {
        const data = await res.json();
        setFocus(data);
      }
    } catch (e) {
      console.error('[Focus] toggle:', e);
    } finally {
      if (mountedRef.current) setMutating(null);
    }
  };

  const addAll = async () => {
    if (!master || mutating) return;
    // Add the top 10 most neglected who aren't already on the list.
    const top = master.children
      .filter(c => !focusedIds.has(c.id))
      .slice(0, 10)
      .map(c => c.id);
    if (top.length === 0) return;
    setMutating('bulk');
    try {
      const res = await montreeApi('/api/montree/dashboard/daily-focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_ids: top }),
      });
      if (res.ok) setFocus(await res.json());
    } finally {
      if (mountedRef.current) setMutating(null);
    }
  };

  const LABELS = {
    title: locale === 'zh' ? '关注列表' : 'Focus List',
    subtitle: locale === 'zh'
      ? '最需要关注的孩子排在最前'
      : 'Children who need attention most come first',
    tabMaster: locale === 'zh' ? '总览' : 'Master',
    tabPaperwork: locale === 'zh' ? '作业' : 'Paperwork',
    tabBingo: locale === 'zh' ? '英语角' : 'Bingo',
    daysSincePhoto: locale === 'zh' ? '天未拍照' : 'd since photo',
    daysSinceProgress: locale === 'zh' ? '天未更新' : 'd since progress',
    paperworkBehind: locale === 'zh' ? '周落后' : 'wk behind',
    noLanguage: locale === 'zh' ? '本周无英语' : 'no language this week',
    addToFocus: locale === 'zh' ? '加入今日' : 'Add to today',
    onFocus: locale === 'zh' ? '已加入' : 'On list',
    confirmed: locale === 'zh' ? '✓ 已确认' : '✓ Confirmed',
    todaysFocus: locale === 'zh' ? '今日关注' : "Today's Focus",
    noFocus: locale === 'zh' ? '今天还没有选择孩子' : 'No children selected yet today',
    pickTop10: locale === 'zh' ? '选前10位' : 'Pick top 10',
    loading: locale === 'zh' ? '加载中...' : 'Loading...',
    bingoTitle: locale === 'zh' ? '本周还未做英语的孩子' : 'Children who still need Language this week',
    allDone: locale === 'zh' ? '🎉 全班本周都做过英语了' : '🎉 Everyone has done Language this week',
  };

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <DashboardHeader />

      <div className="max-w-4xl mx-auto p-4 pb-24">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">{LABELS.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{LABELS.subtitle}</p>
        </div>

        {/* Today's focus strip — visible across all tabs */}
        {focus && focus.children.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-700">
                {LABELS.todaysFocus} · {focus.confirmed_count}/{focus.total}
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {focus.children.map(c => (
                <div
                  key={c.id}
                  className="flex flex-col items-center flex-shrink-0"
                  style={{ width: 56 }}
                >
                  <div className={'relative rounded-full ' + (c.confirmed ? 'ring-2 ring-emerald-500' : 'ring-2 ring-slate-200')}>
                    <ChildAvatar name={c.name} photoUrl={c.photo_url} size={44} />
                    {c.confirmed && (
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 truncate w-full text-center">
                    {c.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-slate-100 shadow-sm">
          {(['master', 'paperwork', 'bingo'] as Tab[]).map(k => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={'flex-1 py-2 rounded-lg text-sm font-medium transition-colors ' + (
                tab === k
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {k === 'master' ? LABELS.tabMaster : k === 'paperwork' ? LABELS.tabPaperwork : LABELS.tabBingo}
            </button>
          ))}
        </div>

        {/* ── Master tab ── */}
        {tab === 'master' && (
          <div>
            {loadingMaster && (
              <div className="text-center py-12 text-slate-400">{LABELS.loading}</div>
            )}

            {!loadingMaster && master && (
              <>
                {/* Quick add top-10 */}
                {focus && focus.total < 10 && master.children.length > 0 && (
                  <div className="mb-3">
                    <button
                      onClick={addAll}
                      disabled={mutating === 'bulk'}
                      className="w-full py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      + {LABELS.pickTop10}
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {master.children.map((c, idx) => {
                    const isOnFocus = focusedIds.has(c.id);
                    const isConfirmed = confirmedIds.has(c.id);
                    const topThree = idx < 3;

                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleFocus(c.id)}
                        disabled={mutating === c.id}
                        className={'w-full text-left bg-white rounded-xl border transition-all active:scale-[0.99] ' + (
                          isConfirmed
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : isOnFocus
                              ? 'border-indigo-300 ring-1 ring-indigo-200'
                              : topThree
                                ? 'border-amber-200'
                                : 'border-slate-100'
                        )}
                      >
                        <div className="flex items-center gap-3 p-3">
                          {/* Rank */}
                          <div
                            className={'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ' + (
                              topThree
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {idx + 1}
                          </div>

                          <ChildAvatar name={c.name} photoUrl={c.photo_url} size={44} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                              {isConfirmed && (
                                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                                  {LABELS.confirmed}
                                </span>
                              )}
                              {isOnFocus && !isConfirmed && (
                                <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-semibold">
                                  {LABELS.onFocus}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                              <span title="days since photo">
                                📸 {c.days_since_photo >= 365 ? '∞' : c.days_since_photo}{LABELS.daysSincePhoto}
                              </span>
                              <span title="days since progress update">
                                📊 {c.days_since_progress >= 365 ? '∞' : c.days_since_progress}{LABELS.daysSinceProgress}
                              </span>
                              {c.paperwork_weeks_behind > 0 && (
                                <span className="text-rose-600 font-semibold">
                                  📋 {c.paperwork_weeks_behind} {LABELS.paperworkBehind}
                                </span>
                              )}
                              {c.no_language_this_week && (
                                <span className="text-amber-700 font-semibold">
                                  🇬🇧 {LABELS.noLanguage}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score badge */}
                          <div className="flex-shrink-0 text-right">
                            <div className={'text-lg font-bold ' + (topThree ? 'text-amber-600' : 'text-slate-400')}>
                              {c.score}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Paperwork tab ── */}
        {tab === 'paperwork' && (
          <PaperworkPanel />
        )}

        {/* ── Bingo tab ── */}
        {tab === 'bingo' && (
          <div>
            {loadingBingo && (
              <div className="text-center py-12 text-slate-400">{LABELS.loading}</div>
            )}
            {!loadingBingo && bingo && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="text-sm font-semibold text-slate-700 mb-3">
                  {LABELS.bingoTitle} · {bingo.notYet.length}/{bingo.totalChildren}
                </div>

                {bingo.notYet.length === 0 ? (
                  <div className="text-center py-8 text-emerald-700 font-medium">{LABELS.allDone}</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {bingo.notYet.map(c => {
                      const isOnFocus = focusedIds.has(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleFocus(c.id)}
                          disabled={mutating === c.id}
                          className={'flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ' + (
                            isOnFocus
                              ? 'border-indigo-300 bg-indigo-50'
                              : 'border-slate-100 bg-white hover:bg-slate-50'
                          )}
                        >
                          <ChildAvatar name={c.name} photoUrl={c.photo_url} size={44} />
                          <div className="text-xs font-medium text-slate-700 truncate w-full text-center">
                            {c.name}
                          </div>
                          {isOnFocus && (
                            <div className="text-[10px] text-indigo-600">{LABELS.onFocus}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <Link
                  href="/montree/dashboard/language-tracker"
                  className="block mt-4 text-center text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {locale === 'zh' ? '查看完整英语角 →' : 'Open full English Corner →'}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
