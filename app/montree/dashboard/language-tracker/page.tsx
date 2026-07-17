// app/montree/dashboard/language-tracker/page.tsx
// "English Corner" — real-time tracker showing which children have done
// Language area work this week and which still need to visit.
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n/context';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import PaperworkPanel from '@/components/montree/PaperworkPanel';
import Link from 'next/link';

interface WorkEntry {
  workName: string;
  workNameChinese: string | null;
  capturedAt: string;
  photoUrl: string | null;
}

interface VisitedChild {
  id: string;
  name: string;
  photo_url: string | null;
  works: WorkEntry[];
}

interface NotYetChild {
  id: string;
  name: string;
  photo_url: string | null;
}

interface TrackerData {
  visited: VisitedChild[];
  notYet: NotYetChild[];
  weekStart: string;
  weekEnd: string;
  totalChildren: number;
  visitedCount: number;
}

function ChildAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const [showFallback, setShowFallback] = useState(!photoUrl);
  const initials = name.charAt(0).toUpperCase();

  if (!showFallback && photoUrl) {
    return (
      <img
        src={getProxyUrl(photoUrl)}
        alt={name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        onError={() => setShowFallback(true)}
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {initials}
    </div>
  );
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

export default function LanguageTrackerPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<TrackerData | null>(null);
  const [bingoData, setBingoData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bingoLoading, setBingoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'overview' | 'bingo' | 'paperwork'>('overview');

  const isZh = locale === 'zh';
  const L = (en: string, zh: string) => {
    const map: Record<string, string> = { en, zh };
    return map[locale || 'en'] || en;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await montreeApi('/api/montree/dashboard/language-tracker');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error('[LanguageTracker] fetch error:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBingoData = useCallback(async () => {
    try {
      setBingoLoading(true);
      const res = await montreeApi('/api/montree/dashboard/language-tracker?work_name=bingo-phonics-review');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setBingoData(json);
    } catch (err) {
      console.error('[LanguageTracker] bingo fetch error:', err);
      setBingoData(null);
    } finally {
      setBingoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Sync tab from URL if present
    const tabParam = searchParams.get('tab') as 'overview' | 'bingo' | 'paperwork' | null;
    if (tabParam && ['overview', 'bingo', 'paperwork'].includes(tabParam)) {
      setCurrentTab(tabParam);
    }
  }, [fetchData, searchParams]);

  useEffect(() => {
    if (currentTab === 'bingo' && !bingoData) {
      fetchBingoData();
    }
  }, [currentTab, bingoData, fetchBingoData]);

  const weekLabel = data ? (() => {
    const s = new Date(data.weekStart);
    const e = new Date(data.weekEnd);
    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `${fmt(s)} – ${fmt(e)}`;
  })() : '';

  const handleTabChange = (tab: 'overview' | 'bingo' | 'paperwork') => {
    setCurrentTab(tab);
    // Update URL param for bookmarkability
    const params = new URLSearchParams();
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div
      className="min-h-screen bg-[#0a1a0f]"
      style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
    >
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-24">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => router.back()} className="text-white/50 hover:text-white/80 text-xl">←</button>
            <h1 className="text-xl font-bold text-white/95">
              🇬🇧 {L('English Corner', '英语角')}
            </h1>
          </div>
          {(currentTab === 'overview' && data) && (
            <p className="text-sm text-white/50 ml-8">
              {L('This week', '本周')} ({weekLabel}) · {data.visitedCount}/{data.totalChildren} {L('visited', '已到访')}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-white/10">
          <button
            onClick={() => handleTabChange('overview')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              currentTab === 'overview'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {L('Overview', '概览')}
          </button>
          <button
            onClick={() => handleTabChange('bingo')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              currentTab === 'bingo'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {L('Bingo Phonics', 'Bingo 拼音')}
          </button>
          <button
            onClick={() => handleTabChange('paperwork')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              currentTab === 'paperwork'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {L('Paperwork', '作业')}
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {currentTab === 'overview' && (
          <>
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <p className="text-red-300 text-sm">{error}</p>
                <button onClick={fetchData} className="mt-2 text-sm text-red-300 underline">
                  {L('Retry', '重试')}
                </button>
              </div>
            )}

            {data && !loading && (
          <>
            {/* Progress bar */}
            <div className="mb-6">
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${data.totalChildren > 0 ? (data.visitedCount / data.totalChildren) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* NOT YET section — show first so teacher knows who to call */}
            {data.notYet.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  {L(`Not Yet (${data.notYet.length})`, `还未到访 (${data.notYet.length})`)}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data.notYet.map(child => (
                    <Link
                      key={child.id}
                      href={`/montree/dashboard/${child.id}`}
                      className="flex items-center gap-2.5 bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl px-3 py-2.5 hover:border-red-400/40 hover:bg-red-500/10 transition-colors"
                    >
                      <ChildAvatar name={child.name} photoUrl={child.photo_url} />
                      <span className="text-sm font-medium text-white/80 truncate">{child.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* VISITED section */}
            {data.visited.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {L(`Visited (${data.visited.length})`, `已到访 (${data.visited.length})`)}
                </h2>
                <div className="space-y-2">
                  {data.visited.map(child => (
                    <Link
                      key={child.id}
                      href={`/montree/dashboard/${child.id}`}
                      className="block bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl px-4 py-3 hover:border-[rgba(52,211,153,0.35)] transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <ChildAvatar name={child.name} photoUrl={child.photo_url} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-white/90">{child.name}</span>
                          <span className="ml-2 text-xs text-emerald-600">
                            {child.works.length} {L(child.works.length === 1 ? 'work' : 'works', '项作业')}
                          </span>
                        </div>
                        <span className="text-emerald-500 text-lg">✓</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 ml-[52px]">
                        {child.works.map((work, i) => (
                          <span
                            key={`${work.workName}-${i}`}
                            className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-300 px-2 py-1 rounded-full"
                          >
                            {isZh && work.workNameChinese ? work.workNameChinese : work.workName}
                            <span className="text-emerald-400">{formatDay(work.capturedAt)}</span>
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* All done state */}
            {data.notYet.length === 0 && data.visited.length > 0 && (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">🎉</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {L('Everyone visited this week!', '所有学生本周都来过了！')}
                </p>
              </div>
            )}

            {/* Empty state */}
            {data.visited.length === 0 && data.notYet.length === 0 && (
              <div className="text-center py-12 text-white/40">
                <p className="text-3xl mb-2">📚</p>
                <p>{L('No students found', '没有学生数据')}</p>
              </div>
            )}

            {/* Refresh button */}
            <div className="mt-8 text-center">
              <button
                onClick={fetchData}
                className="text-sm text-white/40 hover:text-emerald-400 transition-colors"
              >
                ↻ {L('Refresh', '刷新')}
              </button>
            </div>
            </>
            )}
          </>
        )}

        {/* BINGO PHONICS TAB */}
        {currentTab === 'bingo' && (
          <>
            {bingoLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
              </div>
            )}

            {bingoData && !bingoLoading && (
              <>
                <div className="mb-6">
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${bingoData.totalChildren > 0 ? (bingoData.visitedCount / bingoData.totalChildren) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* NOT YET */}
                {bingoData.notYet.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      {L(`Not Yet (${bingoData.notYet.length})`, `还未到访 (${bingoData.notYet.length})`)}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {bingoData.notYet.map(child => (
                        <Link
                          key={child.id}
                          href={`/montree/dashboard/${child.id}`}
                          className="flex items-center gap-2.5 bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl px-3 py-2.5 hover:border-red-400/40 hover:bg-red-500/10 transition-colors"
                        >
                          <ChildAvatar name={child.name} photoUrl={child.photo_url} />
                          <span className="text-sm font-medium text-white/80 truncate">{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* VISITED */}
                {bingoData.visited.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {L(`Visited (${bingoData.visited.length})`, `已到访 (${bingoData.visited.length})`)}
                    </h2>
                    <div className="space-y-2">
                      {bingoData.visited.map(child => (
                        <Link
                          key={child.id}
                          href={`/montree/dashboard/${child.id}`}
                          className="block bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl px-4 py-3 hover:border-[rgba(52,211,153,0.35)] transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <ChildAvatar name={child.name} photoUrl={child.photo_url} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-white/90">{child.name}</span>
                              <span className="ml-2 text-xs text-emerald-600">
                                {child.works.length} {L(child.works.length === 1 ? 'session' : 'sessions', '项作业')}
                              </span>
                            </div>
                            <span className="text-emerald-500 text-lg">✓</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 ml-[52px]">
                            {child.works.map((work, i) => (
                              <span
                                key={`${work.workName}-${i}`}
                                className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 text-emerald-300 px-2 py-1 rounded-full"
                              >
                                {formatDay(work.capturedAt)}
                              </span>
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* All done */}
                {bingoData.notYet.length === 0 && bingoData.visited.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-2">🎉</p>
                    <p className="text-lg font-semibold text-emerald-600">
                      {L('Everyone visited this week!', '所有学生本周都来过了！')}
                    </p>
                  </div>
                )}

                {/* Empty */}
                {bingoData.visited.length === 0 && bingoData.notYet.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    <p className="text-3xl mb-2">📚</p>
                    <p>{L('No students found', '没有学生数据')}</p>
                  </div>
                )}

                <div className="mt-8 text-center">
                  <button
                    onClick={fetchBingoData}
                    className="text-sm text-white/40 hover:text-emerald-400 transition-colors"
                  >
                    ↻ {L('Refresh', '刷新')}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* PAPERWORK TAB */}
        {currentTab === 'paperwork' && (
          <div className="pt-2">
            <PaperworkPanel />
          </div>
        )}
      </div>
    </div>
  );
}
