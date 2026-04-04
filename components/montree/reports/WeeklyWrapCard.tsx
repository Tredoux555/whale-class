// components/montree/reports/WeeklyWrapCard.tsx
// Dashboard card for the Weekly Wrap flow
// Replaces BatchNarrativesCard + BatchReportsCard
'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

interface Child {
  id: string;
  name: string;
}

interface Props {
  classroomId: string;
  children: Child[];
}

function getWeekDates() {
  const now = new Date();
  // Monday-based week
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    week_start: monday.toISOString().split('T')[0],
    week_end: sunday.toISOString().split('T')[0],
  };
}

export default function WeeklyWrapCard({ classroomId, children }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<{
    generated: number;
    skipped: number;
    failed: number;
    cost_usd: number;
    week_number: number;
    report_year: number;
  } | null>(null);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const { week_start, week_end } = getWeekDates();

  // Format dates for display
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
  const startFmt = new Date(week_start).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
  const endFmt = new Date(week_end).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });

  const handleGenerate = useCallback(async (forceRegenerate = false) => {
    if (generating) return;
    setGenerating(true);
    setError('');
    setResult(null);
    setProgress(locale === 'zh' ? '正在生成报告...' : 'Generating reports...');

    try {
      const res = await montreeApi('/api/montree/reports/weekly-wrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          week_start,
          week_end,
          locale,
          force_regenerate: forceRegenerate,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Generation failed');
      }

      const data = await res.json();
      if (!mountedRef.current) return;

      setResult({
        generated: data.generated,
        skipped: data.skipped,
        failed: data.failed,
        cost_usd: data.cost_usd,
        week_number: data.week_number,
        report_year: data.report_year,
      });
      setProgress('');
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message || 'Failed to generate reports');
        setProgress('');
      }
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  }, [generating, classroomId, week_start, week_end, locale]);

  const handleReview = () => {
    if (!result) return;
    router.push(
      `/montree/dashboard/weekly-wrap?week=${week_start}&week_end=${week_end}&wn=${result.week_number}&yr=${result.report_year}`
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">
              {locale === 'zh' ? '周报总结' : 'Weekly Wrap'}
            </h3>
            <p className="text-xs text-gray-400">
              {startFmt} – {endFmt} · {children.length} {locale === 'zh' ? '学生' : 'children'}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed">
        {locale === 'zh'
          ? '为每个孩子生成教师报告（蒙特梭利专家分析）和家长报告（AI 叙述 + 照片），然后一键发送给家长。'
          : 'Generates teacher reports (Montessori expert analysis) and parent reports (AI narrative + photos) for every child, then review before sending to parents.'}
      </p>

      {/* Generate button */}
      {!result && (
        <button
          onClick={() => handleGenerate(false)}
          disabled={generating || children.length === 0}
          className="w-full py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              {progress}
            </span>
          ) : (
            locale === 'zh' ? '生成周报' : '✨ Generate Weekly Wrap'
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
          {error}
          <button
            onClick={() => { setError(''); handleGenerate(false); }}
            className="ml-2 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            {result.generated > 0 && (
              <span className="text-emerald-600 font-medium">
                ✅ {result.generated} generated
              </span>
            )}
            {result.skipped > 0 && (
              <span className="text-gray-400">
                · {result.skipped} skipped
              </span>
            )}
            {result.failed > 0 && (
              <span className="text-red-500 font-medium">
                · {result.failed} failed
              </span>
            )}
            {result.cost_usd > 0 && (
              <span className="text-gray-300 ml-auto">
                ${result.cost_usd.toFixed(3)}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleReview}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors"
            >
              {locale === 'zh' ? '查看报告并发送' : 'Review & Send →'}
            </button>
            <button
              onClick={() => { setResult(null); handleGenerate(true); }}
              className="px-3 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
              title={locale === 'zh' ? '重新生成' : 'Regenerate all'}
            >
              🔄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
