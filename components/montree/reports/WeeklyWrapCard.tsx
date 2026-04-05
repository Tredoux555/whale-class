// components/montree/reports/WeeklyWrapCard.tsx
// Dashboard card for the Weekly Wrap flow — uses streaming for progress
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';

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
  const [childrenDone, setChildrenDone] = useState(0);
  const [childrenTotal, setChildrenTotal] = useState(0);
  const [result, setResult] = useState<{
    generated: number;
    skipped: number;
    failed: number;
    cost_usd: number;
  } | null>(null);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

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
    setChildrenDone(0);
    setChildrenTotal(0);
    setProgress(locale === 'zh' ? '正在准备...' : 'Preparing...');

    try {
      // Use raw fetch (not montreeApi) — streaming bypasses timeout issues
      const res = await fetch('/api/montree/reports/weekly-wrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classroom_id: classroomId,
          week_start,
          week_end,
          locale,
          force_regenerate: forceRegenerate,
          stream: true, // Request streaming response
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Generation failed');
      }

      // Check if streaming response
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
        // Read streaming NDJSON events
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!mountedRef.current) {
            reader.cancel();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              if (event.type === 'start') {
                setChildrenTotal(event.total);
                setProgress(locale === 'zh' ? '正在生成报告...' : 'Generating reports...');
              } else if (event.type === 'child_start') {
                const firstName = event.child_name?.split(' ')[0] || '';
                setProgress(locale === 'zh'
                  ? `正在处理 ${firstName}... (${event.index}/${event.total})`
                  : `${firstName}... (${event.index}/${event.total})`);
              } else if (event.type === 'child_done') {
                setChildrenDone(d => d + 1);
              } else if (event.type === 'complete') {
                if (mountedRef.current) {
                  setResult({
                    generated: event.generated,
                    skipped: event.skipped,
                    failed: event.failed,
                    cost_usd: event.cost_usd,
                  });
                  setProgress('');
                }
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Generation failed');
              }
            } catch (parseErr: any) {
              // If it's our thrown error, re-throw
              if (parseErr.message && parseErr.message !== 'Generation failed' && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
              // Otherwise skip malformed line
            }
          }
        }
      } else {
        // Fallback: non-streaming JSON response
        const data = await res.json();
        if (mountedRef.current) {
          setResult({
            generated: data.generated,
            skipped: data.skipped,
            failed: data.failed,
            cost_usd: data.cost_usd,
          });
          setProgress('');
        }
      }
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
      `/montree/dashboard/weekly-wrap?week=${week_start}&week_end=${week_end}`
    );
  };

  // Progress bar percentage
  const progressPct = childrenTotal > 0 ? Math.round((childrenDone / childrenTotal) * 100) : 0;

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
        <div className="space-y-2">
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

          {/* Progress bar during generation */}
          {generating && childrenTotal > 0 && (
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center">
                {childrenDone}/{childrenTotal} {locale === 'zh' ? '已完成' : 'done'}
              </p>
            </div>
          )}
        </div>
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
