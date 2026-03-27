'use client';

// components/montree/voice-notes/WeeklyAdminCard.tsx
// Dashboard card for batch-generating per-child weekly admin for all children
// "Generate All" iterates children sequentially, calling per-child API
// "Copy All Plan Rows" formats entire class as table for Weekly Plan doc

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  planRow?: Record<string, string>;
  error?: string;
}

const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
export default function WeeklyAdminCard({ classroomId, children }: Props) {
  const { t, locale } = useI18n();

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current && !abortRef.current.signal.aborted) {
        abortRef.current.abort();
      }
    };
  }, []);

  // Generate all children sequentially
  const handleGenerateAll = useCallback(async () => {
    if (children.length === 0) return;
    setGenerating(true);
    setError('');
    setProgress(0);
    setResults([]);
    if (abortRef.current && !abortRef.current.signal.aborted) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    const batchResults: BatchResult[] = [];

    for (let i = 0; i < children.length; i++) {
      // Check abort
      if (abortRef.current?.signal.aborted) break;

      const child = children[i];
      setProgress(i + 1);

      try {
        const res = await montreeApi(`/api/montree/children/${child.id}/weekly-admin`, {
          method: 'POST',
          body: JSON.stringify({ locale }),
          signal: abortRef.current?.signal,
        });
        const data = await res.json();

        if (data.success) {
          batchResults.push({
            childId: child.id,
            childName: child.name,
            success: true,
            planRow: data.plan_row,
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
    }

    setResults(batchResults);
    setGenerating(false);
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
    setError('');
    abortRef.current = new AbortController();

    let updatedResults = [...results];

    for (const failedResult of failed) {
      if (abortRef.current?.signal.aborted) break;

      const child = children.find(c => c.id === failedResult.childId);
      if (!child) continue;

      try {
        const res = await montreeApi(`/api/montree/children/${child.id}/weekly-admin`, {
          method: 'POST',
          body: JSON.stringify({ locale }),
          signal: abortRef.current?.signal,
        });
        const data = await res.json();

        if (data.success) {
          updatedResults = updatedResults.map(r =>
            r.childId === child.id
              ? { childId: child.id, childName: child.name, success: true, planRow: data.plan_row }
              : r
          );
        }
      } catch {
        // Keep as failed
      }
    }

    setResults(updatedResults);
    setGenerating(false);
    abortRef.current = null;
  }, [results, children, locale]);

  // Copy all plan rows as table
  const handleCopyAllRows = useCallback(async () => {
    const successResults = results.filter(r => r.success && r.planRow);
    const isZh = locale === 'zh';
    const header = isZh
      ? '名字 | 日常 | 感官区 | 数学 | 语言 | 科学文化 | 备注'
      : 'Name | Practical | Sensorial | Math | Language | Culture | Notes';
    const separator = '---|---|---|---|---|---|---';
    const rows = successResults.map(r => {
      const cols = AREAS.map(a => r.planRow?.[a] || '-');
      return `${r.childName} | ${cols.join(' | ')} | ${r.planRow?.notes || ''}`;
    });
    const table = [header, separator, ...rows].join('\n');

    try {
      await navigator.clipboard.writeText(table);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = table;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [results, locale]);
  const successCount = results.filter(r => r.success).length;
  const failedResults = results.filter(r => !r.success);

  if (children.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">
              {t('batchAdmin.title')}
            </h3>
            <p className="text-xs text-gray-500">
              {children.length} {locale === 'zh' ? '个学生' : 'children'}
            </p>
          </div>
        </div>

        {!generating ? (
          <button
            onClick={handleGenerateAll}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all"
          >
            {t('batchAdmin.generateAll')}
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all"
          >
            {t('batchAdmin.cancel')}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {generating && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{t('batchAdmin.progress')}</span>
            <span>{progress}/{children.length}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(progress / children.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !generating && (
        <div className="space-y-2">
          {/* Success count */}
          <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-2">
            ✅ {t('batchAdmin.done')}: {successCount}/{results.length}
          </div>

          {/* Failed list */}
          {failedResults.length > 0 && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2">
              {t('batchAdmin.failed')}: {failedResults.map(r => r.childName).join(', ')}
              <button
                onClick={handleRetryFailed}
                className="ml-2 underline text-red-700 hover:text-red-900"
              >
                {t('batchAdmin.retryFailed')}
              </button>
            </div>
          )}

          {/* Copy All Plan Rows */}
          {successCount > 0 && (
            <button
              onClick={handleCopyAllRows}
              className="w-full py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              {copied
                ? `✓ ${t('weeklyAdmin.copied')}`
                : `📋 ${t('batchAdmin.copyAllRows')}`}
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-2 mt-2">{error}</div>
      )}

      {/* Link to DOCX generator page */}
      <Link
        href="/montree/dashboard/weekly-admin-docs"
        className="block mt-3 text-center text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
      >
        📄 {locale === 'zh' ? '下载 DOCX 文档' : 'Download DOCX Documents'}
      </Link>
    </div>
  );
}