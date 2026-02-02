// app/montree/dashboard/[childId]/summary/page.tsx
// Teacher Summary - Weekly/Monthly insights for a child
// Testing Week - Phase 4

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface ChildData {
  id: string;
  name: string;
  classroom_id: string;
}

interface ProgressData {
  work_name: string;
  area: string;
  status: string;
  created_at: string;
  notes?: string;
}

interface AreaStats {
  area: string;
  count: number;
  works: string[];
}

interface SummaryData {
  child: ChildData;
  period: string;
  totalWorksThisPeriod: number;
  areasWorked: AreaStats[];
  areasNeglected: string[];
  statusBreakdown: {
    presented: number;
    practicing: number;
    mastered: number;
  };
  recentProgress: ProgressData[];
}

type TimePeriod = 'week' | 'month';

// ============================================
// COMPONENT
// ============================================

export default function TeacherSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALL_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

  // ============================================
  // FETCH DATA
  // ============================================

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      // Fetch child info
      const childRes = await fetch(`/api/montree/children?id=${childId}`);
      const childData = await childRes.json();

      if (!childData.children || childData.children.length === 0) {
        setError('Child not found');
        setLoading(false);
        return;
      }

      const child = childData.children[0];

      // Fetch progress data
      const progressRes = await fetch(
        `/api/montree/progress?child_id=${childId}&from=${startDate.toISOString()}&to=${now.toISOString()}`
      );
      const progressData = await progressRes.json();
      const progress: ProgressData[] = progressData.progress || [];

      // Calculate area statistics
      const areaMap = new Map<string, { count: number; works: string[] }>();
      const statusCount = { presented: 0, practicing: 0, mastered: 0 };

      progress.forEach(p => {
        const area = p.area || 'unknown';
        const existing = areaMap.get(area) || { count: 0, works: [] };
        existing.count++;
        if (!existing.works.includes(p.work_name)) {
          existing.works.push(p.work_name);
        }
        areaMap.set(area, existing);

        // Count statuses
        if (p.status === 'presented') statusCount.presented++;
        else if (p.status === 'practicing') statusCount.practicing++;
        else if (p.status === 'mastered') statusCount.mastered++;
      });

      // Build area stats
      const areasWorked: AreaStats[] = [];
      areaMap.forEach((stats, area) => {
        areasWorked.push({ area, count: stats.count, works: stats.works });
      });
      areasWorked.sort((a, b) => b.count - a.count);

      // Find neglected areas
      const workedAreaNames = areasWorked.map(a => a.area);
      const neglected = ALL_AREAS.filter(a => !workedAreaNames.includes(a));

      setSummary({
        child,
        period: period === 'week' ? 'Past 7 Days' : 'Past 30 Days',
        totalWorksThisPeriod: progress.length,
        areasWorked,
        areasNeglected: neglected,
        statusBreakdown: statusCount,
        recentProgress: progress.slice(0, 10),
      });
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setError('Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, [childId, period]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // ============================================
  // AI INSIGHT
  // ============================================

  const generateAiInsight = async () => {
    if (!summary) return;

    setLoadingAi(true);
    setAiInsight(null);

    try {
      const question = `Based on this child's recent activity (${summary.period}), they have worked on ${summary.totalWorksThisPeriod} activities. Areas worked: ${summary.areasWorked.map(a => `${formatAreaName(a.area)} (${a.count})`).join(', ')}. ${summary.areasNeglected.length > 0 ? `Areas not touched: ${summary.areasNeglected.map(formatAreaName).join(', ')}.` : 'All areas covered.'} Status breakdown: ${summary.statusBreakdown.presented} presented, ${summary.statusBreakdown.practicing} practicing, ${summary.statusBreakdown.mastered} mastered. What patterns do you notice and what should the teacher focus on next?`;

      const res = await fetch('/api/montree/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          question,
        }),
      });

      const data = await res.json();

      if (data.success && data.insight) {
        setAiInsight(data.insight);
        toast.success('AI insights generated!');
      } else {
        setError(data.error || 'Failed to generate insights');
        toast.error('Failed to generate AI insights');
      }
    } catch (err) {
      console.error('AI insight error:', err);
      toast.error('Failed to connect to AI service');
    } finally {
      setLoadingAi(false);
    }
  };

  // ============================================
  // HELPERS
  // ============================================

  const formatAreaName = (area: string) => {
    return area
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAreaEmoji = (area: string) => {
    const emojis: Record<string, string> = {
      practical_life: '🧹',
      sensorial: '👁️',
      mathematics: '🔢',
      language: '📚',
      cultural: '🌍',
    };
    return emojis[area] || '📋';
  };

  const getAreaColor = (area: string) => {
    const colors: Record<string, string> = {
      practical_life: 'bg-orange-100 text-orange-700',
      sensorial: 'bg-pink-100 text-pink-700',
      mathematics: 'bg-blue-100 text-blue-700',
      language: 'bg-green-100 text-green-700',
      cultural: 'bg-purple-100 text-purple-700',
    };
    return colors[area] || 'bg-gray-100 text-gray-700';
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-4" />
          <p className="text-gray-600">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600 mb-4">{error || 'Failed to load summary'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/montree/dashboard/${childId}`}
              className="w-10 h-10 flex items-center justify-center bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors"
            >
              <span className="text-lg">←</span>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-800">
                {summary.child.name}&apos;s Summary
              </h1>
              <p className="text-xs text-gray-500">{summary.period}</p>
            </div>
          </div>

          {/* Period toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                period === 'week' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                period === 'month' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              Month
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-24">
        {/* Overview Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">📊 Overview</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">
                {summary.totalWorksThisPeriod}
              </div>
              <div className="text-xs text-gray-500">Total Activities</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">
                {summary.statusBreakdown.mastered}
              </div>
              <div className="text-xs text-gray-500">Mastered</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">
                {summary.areasWorked.length}
              </div>
              <div className="text-xs text-gray-500">Areas Covered</div>
            </div>
          </div>
        </div>

        {/* Areas Worked */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">✅ Areas Worked On</h2>
          {summary.areasWorked.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No work recorded this period</p>
          ) : (
            <div className="space-y-2">
              {summary.areasWorked.map(area => (
                <div
                  key={area.area}
                  className={`p-3 rounded-xl ${getAreaColor(area.area)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">
                      {getAreaEmoji(area.area)} {formatAreaName(area.area)}
                    </span>
                    <span className="text-sm font-bold">{area.count} activities</span>
                  </div>
                  <div className="text-sm opacity-80">
                    {area.works.slice(0, 3).join(', ')}
                    {area.works.length > 3 && ` +${area.works.length - 3} more`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Neglected Areas */}
        {summary.areasNeglected.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-amber-400">
            <h2 className="font-bold text-gray-700 mb-3">⚠️ Areas to Consider</h2>
            <p className="text-sm text-gray-600 mb-2">
              These areas haven&apos;t been worked on this {period}:
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.areasNeglected.map(area => (
                <span
                  key={area}
                  className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm"
                >
                  {getAreaEmoji(area)} {formatAreaName(area)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">📈 Progress Breakdown</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Presented</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400"
                    style={{
                      width: `${summary.totalWorksThisPeriod > 0 ? (summary.statusBreakdown.presented / summary.totalWorksThisPeriod) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">
                  {summary.statusBreakdown.presented}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Practicing</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400"
                    style={{
                      width: `${summary.totalWorksThisPeriod > 0 ? (summary.statusBreakdown.practicing / summary.totalWorksThisPeriod) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">
                  {summary.statusBreakdown.practicing}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Mastered</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400"
                    style={{
                      width: `${summary.totalWorksThisPeriod > 0 ? (summary.statusBreakdown.mastered / summary.totalWorksThisPeriod) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">
                  {summary.statusBreakdown.mastered}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-700">🤖 Guru Insights</h2>
            <button
              onClick={generateAiInsight}
              disabled={loadingAi}
              className="px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1"
            >
              {loadingAi ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : aiInsight ? (
                <>🔄 Regenerate</>
              ) : (
                <>✨ Ask Guru</>
              )}
            </button>
          </div>

          {aiInsight ? (
            <div className="p-4 bg-indigo-50 rounded-xl">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiInsight}</p>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl text-center text-gray-400">
              <p className="text-sm">
                Click &quot;Ask Guru&quot; to get AI-powered insights about this child&apos;s progress
              </p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {summary.recentProgress.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-3">🕐 Recent Activity</h2>
            <div className="space-y-2">
              {summary.recentProgress.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getAreaEmoji(p.area)}</span>
                    <span className="text-sm font-medium">{p.work_name}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === 'mastered'
                        ? 'bg-green-100 text-green-700'
                        : p.status === 'practicing'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating action - Export/Print */}
      <div className="fixed bottom-6 right-6">
        <Link
          href={`/montree/dashboard/print?child=${childId}`}
          className="w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-600 transition-all hover:scale-105"
        >
          <span className="text-2xl">🖨️</span>
        </Link>
      </div>
    </div>
  );
}
