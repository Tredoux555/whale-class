'use client';

// components/montree/reports/BatchReportsCard.tsx
// Dashboard card for batch-generating parent reports for all children
// "Generate All Reports" iterates children sequentially, calling per-child batch API
// Shows progress bar, success/failure counts, and summary of generated reports

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

interface BatchResult {
  childId: string;
  childName: string;
  success: boolean;
  reportId?: string;
  summary?: {
    works_this_week: number;
    areas_count: number;
    photos_count: number;
    mastered: number;
    practicing: number;
  };
  error?: string;
}

export default function BatchReportsCard({ classroomId, children }: Props) {
  const { t, locale } = useI18n();

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [expanded, setExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Track mounted state for safe state updates
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortRef.current && !abortRef.current.signal.aborted) {
        abortRef.current.abort();
      }
    };
  }, []);

  // Generate reports for all children sequentially
  const handleGenerateAll = useCallback(async () => {
    if (children.length === 0) return;
    setGenerating(true);
    setProgress(0);
    setResults([]);
    setExpanded(true);
    if (abortRef.current && !abortRef.current.signal.aborted) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const batchResults: BatchResult[] = [];

    for (let i = 0; i < children.length; i++) {
      if (abortRef.current?.signal.aborted) break;

      const child = children[i];

      try {
        const res = await montreeApi('/api/montree/reports/batch', {
          method: 'POST',
          body: JSON.stringify({ child_id: child.id, locale }),
          signal: abortRef.current?.signal,
        });
        const data = await res.json();

        if (!mountedRef.current) break;

        if (data.success) {
          batchResults.push({
            childId: child.id,
            childName: child.name,
            success: true,
            reportId: data.report_id,
            summary: data.summary,
          });
        } else {
          batchResults.push({
            childId: child.id,
            childName: child.name,
            success: false,
            error: data.error || 'Unknown error',
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') break;
        batchResults.push({
          childId: child.id,
          childName: child.name,
          success: false,
          error: 'Network error',
        });
      }

      // Update progress AFTER each child completes
      if (mountedRef.current) {
        setProgress(i + 1);
      }
    }

    if (mountedRef.current) {
      setResults(batchResults);
      setGenerating(false);
    }
    abortRef.current = null;
  }, [children, locale]);

  // Cancel batch
  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Retry failed
  const handleRetryFailed = useCallback(async () => {
    const failed = results.filter(r => !r.success);
    if (failed.length === 0) return;

    setGenerating(true);
    setExpanded(true);
    setProgress(0);
    abortRef.current = new AbortController();

    let updatedResults = [...results];

    for (let i = 0; i < failed.length; i++) {
      if (abortRef.current?.signal.aborted) break;

      const failedResult = failed[i];
      const child = children.find(c => c.id === failedResult.childId);
      if (!child) continue;

      try {
        const res = await montreeApi('/api/montree/reports/batch', {
          method: 'POST',
          body: JSON.stringify({ child_id: child.id, locale }),
          signal: abortRef.current?.signal,
        });
        const data = await res.json();

        if (!mountedRef.current) break;

        if (data.success) {
          updatedResults = updatedResults.map(r =>
            r.childId === child.id
              ? { childId: child.id, childName: child.name, success: true, reportId: data.report_id, summary: data.summary }
              : r
          );
        }
      } catch {
        // Keep as failed
      }

      if (mountedRef.current) {
        setProgress(i + 1);
      }
    }

    if (mountedRef.current) {
      setResults(updatedResults);
      setGenerating(false);
    }
    abortRef.current = null;
  }, [results, children, locale]);

  const successCount = results.filter(r => r.success).length;
  const failedResults = results.filter(r => !r.success);
  const totalWorks = results.filter(r => r.success).reduce((sum, r) => sum + (r.summary?.works_this_week || 0), 0);
  const totalMastered = results.filter(r => r.success).reduce((sum, r) => sum + (r.summary?.mastered || 0), 0);

  if (children.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">
              {t('batchReports.title' as any, 'Weekly Parent Reports')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('batchReports.childrenCount' as any, '{count} children').replace('{count}', String(children.length))}
            </p>
          </div>
        </div>

        {!generating ? (
          <button
            onClick={handleGenerateAll}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all"
          >
            {t('batchReports.generateAll' as any, 'Generate All')}
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all"
          >
            {t('batchReports.cancel' as any, 'Cancel')}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {generating && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{t('batchReports.generating' as any, 'Generating reports...')}</span>
            <span>{progress}/{children.length}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${(progress / children.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !generating && (
        <div className="space-y-2">
          {/* Success summary */}
          <div className="text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span>✅ {t('batchReports.done' as any, 'Done')}: {successCount}/{results.length}</span>
              {successCount > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  {expanded
                    ? t('batchReports.hideDetails' as any, 'Hide details')
                    : t('batchReports.showDetails' as any, 'Show details')}
                </button>
              )}
            </div>
            {successCount > 0 && (
              <div className="mt-1 text-xs text-blue-600">
                {totalWorks} {t('batchReports.activitiesThisWeek' as any, 'activities this week')} · {totalMastered} {t('batchReports.masteredLabel' as any, 'mastered')}
              </div>
            )}
          </div>

          {/* Per-child details */}
          {expanded && successCount > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {results.filter(r => r.success).map(r => (
                <div key={r.childId} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-700">{r.childName}</span>
                  <div className="flex items-center gap-3 text-gray-500">
                    <span>{r.summary?.works_this_week || 0} {t('batchReports.worksLabel' as any, 'works')}</span>
                    <span>{r.summary?.areas_count || 0} {t('batchReports.areasLabel' as any, 'areas')}</span>
                    {(r.summary?.photos_count || 0) > 0 && (
                      <span>📸 {r.summary?.photos_count}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Failed list */}
          {failedResults.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">
              {t('batchReports.failed' as any, 'Failed')}: {failedResults.map(r => r.childName).join(', ')}
              <button
                onClick={handleRetryFailed}
                className="ml-2 underline text-red-700 hover:text-red-900"
              >
                {t('batchReports.retryFailed' as any, 'Retry')}
              </button>
            </div>
          )}

          {/* View reports link */}
          {successCount > 0 && (
            <p className="text-xs text-gray-500 text-center mt-1">
              {t('batchReports.savedAsDrafts' as any, 'Reports saved as drafts. View and send from each child\'s Reports tab.')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
