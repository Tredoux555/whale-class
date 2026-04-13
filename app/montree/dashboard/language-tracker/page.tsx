// app/montree/dashboard/language-tracker/page.tsx
// "English Corner" — real-time tracker showing which children have done
// Language area work this week and which still need to visit.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n/context';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import DashboardHeader from '@/components/montree/DashboardHeader';
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
  const initials = name.charAt(0).toUpperCase();
  if (photoUrl) {
    return (
      <img
        src={getProxyUrl(photoUrl)}
        alt={name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isZh = locale === 'zh';

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weekLabel = data ? (() => {
    const s = new Date(data.weekStart);
    const e = new Date(data.weekEnd);
    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `${fmt(s)} – ${fmt(e)}`;
  })() : '';

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-24">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
            <h1 className="text-xl font-bold text-gray-900">
              🇬🇧 {isZh ? '英语角' : 'English Corner'}
            </h1>
          </div>
          {data && (
            <p className="text-sm text-gray-500 ml-8">
              {isZh ? '本周' : 'This week'} ({weekLabel}) · {data.visitedCount}/{data.totalChildren} {isZh ? '已到访' : 'visited'}
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={fetchData} className="mt-2 text-sm text-red-500 underline">
              {isZh ? '重试' : 'Retry'}
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Progress bar */}
            <div className="mb-6">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
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
                  {isZh ? `还未到访 (${data.notYet.length})` : `Not Yet (${data.notYet.length})`}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data.notYet.map(child => (
                    <Link
                      key={child.id}
                      href={`/montree/dashboard/${child.id}`}
                      className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl px-3 py-2.5 hover:border-red-200 hover:bg-red-50/30 transition-colors"
                    >
                      <ChildAvatar name={child.name} photoUrl={child.photo_url} />
                      <span className="text-sm font-medium text-gray-700 truncate">{child.name}</span>
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
                  {isZh ? `已到访 (${data.visited.length})` : `Visited (${data.visited.length})`}
                </h2>
                <div className="space-y-2">
                  {data.visited.map(child => (
                    <Link
                      key={child.id}
                      href={`/montree/dashboard/${child.id}`}
                      className="block bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <ChildAvatar name={child.name} photoUrl={child.photo_url} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-gray-900">{child.name}</span>
                          <span className="ml-2 text-xs text-emerald-600">
                            {child.works.length} {isZh ? '项作业' : child.works.length === 1 ? 'work' : 'works'}
                          </span>
                        </div>
                        <span className="text-emerald-500 text-lg">✓</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 ml-[52px]">
                        {child.works.map((work, i) => (
                          <span
                            key={`${work.workName}-${i}`}
                            className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full"
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
                  {isZh ? '所有学生本周都来过了！' : 'Everyone visited this week!'}
                </p>
              </div>
            )}

            {/* Empty state */}
            {data.visited.length === 0 && data.notYet.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">📚</p>
                <p>{isZh ? '没有学生数据' : 'No students found'}</p>
              </div>
            )}

            {/* Refresh button */}
            <div className="mt-8 text-center">
              <button
                onClick={fetchData}
                className="text-sm text-gray-400 hover:text-emerald-500 transition-colors"
              >
                ↻ {isZh ? '刷新' : 'Refresh'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
