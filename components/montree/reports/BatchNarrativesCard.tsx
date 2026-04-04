'use client';

// components/montree/reports/BatchNarrativesCard.tsx
// Dashboard card for batch-generating Sonnet-written parent narratives
// "Generate Weekly Updates" calls /api/montree/reports/batch-narratives for the whole classroom
// Shows progress, cost, and per-child results

import { useState, useCallback, useRef, useEffect } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface Child {
  id: string;
  name: string;
}

interface Props {
  classroomId: string;
  children: Child[];
}

interface NarrativeResult {
  child_id: string;
  child_name: string;
  success: boolean;
  skipped?: boolean;
  photo_count: number;
  narrative?: string;
  error?: string;
}

export default function BatchNarrativesCard({ classroomId, children }: Props) {
  const { t, locale } = useI18n();

  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<NarrativeResult[]>([]);
  const [stats, setStats] = useState<{ generated: number; skipped: number; failed: number; cost_usd: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [previewChild, setPreviewChild] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current && !abortRef.current.signal.aborted) {
        abortRef.current.abort();
      }
    };
  }, []);

  // Get current week dates
  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      week_start: monday.toISOString().split('T')[0],
      week_end: sunday.toISOString().split('T')[0],
    };
  };

  const handleGenerate = useCallback(async (forceRegenerate = false) => {
    if (children.length === 0) return;
    setGenerating(true);
    setResults([]);
    setStats(null);
    setExpanded(true);

    abortRef.current = new AbortController();
    const { week_start, week_end } = getWeekDates();

    try {
      const res = await montreeApi('/api/montree/reports/batch-narratives', {
        method: 'POST',
        body: JSON.stringify({
          classroom_id: classroomId,
          week_start,
          week_end,
          locale,
          force_regenerate: forceRegenerate,
        }),
        signal: abortRef.current?.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Server error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (mountedRef.current) {
        setResults(data.results || []);
        setStats({
          generated: data.generated || 0,
          skipped: data.skipped || 0,
          failed: data.failed || 0,
          cost_usd: data.cost_usd || 0,
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Batch narratives error:', err);
      if (mountedRef.current) {
        setResults([{
          child_id: 'error',
          child_name: 'Error',
          success: false,
          photo_count: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        }]);
      }
    } finally {
      if (mountedRef.current) setGenerating(false);
      abortRef.current = null;
    }
  }, [children, classroomId, locale]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const successResults = results.filter(r => r.success && !r.skipped);
  const skippedResults = results.filter(r => r.skipped);
  const failedResults = results.filter(r => !r.success);
  const totalPhotos = results.filter(r => r.success).reduce((sum, r) => sum + r.photo_count, 0);

  if (children.length === 0) return null;

  const { week_start, week_end } = getWeekDates();
  const weekLabel = (() => {
    const start = new Date(week_start);
    const end = new Date(week_end);
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  return (
    <div className="bg-white rounded-xl border border-emerald-200 p-4 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">
              {locale === 'zh' ? '家长每周更新' : 'Weekly Parent Updates'}
            </h3>
            <p className="text-xs text-gray-500">
              {weekLabel} · {children.length} {locale === 'zh' ? '名学生' : 'children'}
            </p>
          </div>
        </div>

        {!generating ? (
          <button
            onClick={() => handleGenerate(false)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all"
          >
            {locale === 'zh' ? '生成更新' : 'Generate Updates'}
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all"
          >
            {locale === 'zh' ? '取消' : 'Cancel'}
          </button>
        )}
      </div>

      {/* Generating indicator */}
      {generating && (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs text-emerald-600 mb-2">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>{locale === 'zh' ? '正在用AI为每个孩子撰写个性化报告...' : 'Writing personalized updates with AI...'}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      )}

      {/* Results */}
      {stats && !generating && (
        <div className="space-y-2">
          {/* Summary */}
          <div className="text-sm bg-emerald-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-emerald-700 font-medium">
                ✅ {stats.generated} {locale === 'zh' ? '份报告已生成' : 'updates generated'}
                {stats.skipped > 0 && (
                  <span className="text-gray-500 font-normal"> · {stats.skipped} {locale === 'zh' ? '已跳过' : 'already done'}</span>
                )}
              </span>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-emerald-600 hover:text-emerald-800"
              >
                {expanded ? (locale === 'zh' ? '收起' : 'Hide') : (locale === 'zh' ? '详情' : 'Details')}
              </button>
            </div>
            <div className="mt-1 text-xs text-emerald-600">
              📸 {totalPhotos} {locale === 'zh' ? '张照片' : 'photos'}
              {stats.cost_usd > 0 && (
                <span className="ml-2">· ${stats.cost_usd.toFixed(3)} AI cost</span>
              )}
            </div>
          </div>

          {/* Per-child narrative preview */}
          {expanded && successResults.length > 0 && (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {successResults.map(r => (
                <div key={r.child_id}>
                  <button
                    onClick={() => setPreviewChild(previewChild === r.child_id ? null : r.child_id)}
                    className="w-full flex items-center justify-between text-xs bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
                  >
                    <span className="font-medium text-gray-700">{r.child_name}</span>
                    <div className="flex items-center gap-2 text-gray-500">
                      <span>📸 {r.photo_count}</span>
                      <span className="text-emerald-500">{previewChild === r.child_id ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {previewChild === r.child_id && r.narrative && (
                    <div className="mx-2 mb-2 p-3 bg-emerald-50 rounded-lg border-l-3 border-emerald-400">
                      <p className="text-xs text-gray-700 leading-relaxed italic">
                        &ldquo;{r.narrative}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {skippedResults.length > 0 && (
                <div className="text-xs text-gray-400 px-3 py-1">
                  {locale === 'zh' ? '已跳过（已有报告）' : 'Skipped (already generated)'}: {skippedResults.map(r => r.child_name).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Failed */}
          {failedResults.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">
              {locale === 'zh' ? '失败' : 'Failed'}: {failedResults.map(r => r.child_name).join(', ')}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-400">
              {locale === 'zh'
                ? '报告已保存为草稿。从每个孩子的页面发送。'
                : 'Saved as drafts. Send from each child\'s report page.'}
            </p>
            {stats.generated > 0 && (
              <button
                onClick={() => handleGenerate(true)}
                className="text-xs text-emerald-600 hover:text-emerald-800 underline"
              >
                {locale === 'zh' ? '重新生成' : 'Regenerate all'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
