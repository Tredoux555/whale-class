'use client';

// PendingReviewPanel
// Shared panel for the review-before-process workflow. Shows photos with
// identification_status='pending_review' as a multi-select grid. Teachers
// delete duds, then tap "Process Selected" to fire AI on the survivors.
//
// Mounts in two places:
//   - Classroom-wide Photo Audit page (all students, all classroom photos)
//   - Child gallery page (single child only — pass childId to scope)
//
// Photos are loaded from /api/montree/audit/photos?zone=pending_review.
// Process action calls /api/montree/photo-identification/batch (POST).
// Delete action calls /api/montree/photo-identification/batch (DELETE).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

interface PendingPhoto {
  id: string;
  child_id: string | null;
  child_name: string;
  child_names: string[];
  child_ids: string[];
  url: string | null;
  thumbnail_path: string | null;
  captured_at: string | null;
}

interface PendingReviewPanelProps {
  /** When set, only that child's pending photos load. Omit for classroom-wide. */
  childId?: string;
  /** Optional callback after a successful batch action so the parent can refresh other tabs. */
  onProcessed?: (count: number) => void;
  /** Compact mode for embedding in the child gallery (smaller header). */
  compact?: boolean;
}

export default function PendingReviewPanel({ childId, onProcessed, compact = false }: PendingReviewPanelProps) {
  const { locale } = useI18n();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'process' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const t = useMemo(() => ({
    title: locale === 'zh' ? '待处理照片' : 'Pending Review',
    subtitle: locale === 'zh' ? '在 AI 处理之前先剔除模糊或重复的照片' : 'Cull blurry or duplicate shots before AI processing runs',
    none: locale === 'zh' ? '没有待处理的照片' : 'No photos waiting for review',
    selectAll: locale === 'zh' ? '全选' : 'Select all',
    deselect: locale === 'zh' ? '取消全选' : 'Deselect',
    processSel: locale === 'zh' ? '处理选中' : 'Process selected',
    deleteSel: locale === 'zh' ? '删除选中' : 'Delete selected',
    confirmDel: locale === 'zh' ? '永久删除选中的照片?' : 'Permanently delete the selected photos?',
    processing: locale === 'zh' ? '处理中…' : 'Processing…',
    deleting: locale === 'zh' ? '删除中…' : 'Deleting…',
    waiting: (n: number) => locale === 'zh' ? `${n} 张照片待处理` : `${n} photo${n === 1 ? '' : 's'} waiting`,
    show: locale === 'zh' ? '展开' : 'Show',
    hide: locale === 'zh' ? '收起' : 'Hide',
    failed: locale === 'zh' ? '失败' : 'failed',
  }), [locale]);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        zone: 'pending_review',
        limit: '500',
        date_from: new Date(Date.now() - 365 * 86400000).toISOString(),
        date_to: new Date().toISOString(),
      });
      const res = await montreeApi(`/api/montree/audit/photos?${params.toString()}`);
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      let rows: PendingPhoto[] = (data?.photos || []).map((p: any) => ({
        id: p.id,
        child_id: p.child_id,
        child_name: p.child_name || 'Unknown',
        child_names: p.child_names || [],
        child_ids: p.child_ids || [],
        url: p.url,
        thumbnail_path: p.thumbnail_path,
        captured_at: p.captured_at,
      }));
      if (childId) {
        rows = rows.filter(p => p.child_id === childId || p.child_ids.includes(childId));
      }
      setPhotos(rows);
      setSelected(prev => {
        const next = new Set<string>();
        const valid = new Set(rows.map(r => r.id));
        for (const id of prev) if (valid.has(id)) next.add(id);
        return next;
      });
    } catch (err: any) {
      console.error('[PendingReview] load failed:', err);
      setError(err?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === photos.length) setSelected(new Set());
    else setSelected(new Set(photos.map(p => p.id)));
  };

  const runBatch = async (mode: 'process' | 'delete') => {
    if (selected.size === 0) return;
    if (mode === 'delete' && !confirm(t.confirmDel)) return;
    const ids = Array.from(selected);
    setBusy(mode);
    setError(null);
    setProgress({ done: 0, total: ids.length });
    try {
      const method = mode === 'process' ? 'POST' : 'DELETE';
      const res = await montreeApi('/api/montree/photo-identification/batch', {
        method,
        body: JSON.stringify({ media_ids: ids, locale }),
        timeout: 300_000,
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const failed = mode === 'process' ? (data?.failed || 0) : 0;
      const succeeded = mode === 'process' ? (data?.succeeded || 0) : (data?.deleted || 0);
      if (failed > 0) {
        setError(`${failed} ${t.failed}`);
      }
      setSelected(new Set());
      await loadPhotos();
      onProcessed?.(succeeded);
    } catch (err: any) {
      console.error('[PendingReview] batch failed:', err);
      setError(err?.message || 'Batch failed');
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  if (loading && photos.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {locale === 'zh' ? '加载中…' : 'Loading…'}
      </div>
    );
  }

  if (!loading && photos.length === 0) {
    // Render nothing in compact mode when empty (don't clutter child page).
    if (compact) return null;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        {t.none}
      </div>
    );
  }

  const allSelected = selected.size > 0 && selected.size === photos.length;

  return (
    <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 overflow-hidden">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-amber-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl flex-shrink-0">🧐</span>
          <div className="min-w-0">
            <div className={`font-semibold text-amber-900 ${compact ? 'text-sm' : 'text-base'}`}>
              {t.title} <span className="text-amber-700 font-normal">· {t.waiting(photos.length)}</span>
            </div>
            {!compact && (
              <div className="text-xs text-amber-700 mt-0.5">{t.subtitle}</div>
            )}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-xs px-2 py-1 rounded text-amber-800 hover:bg-amber-100 flex-shrink-0"
        >
          {collapsed ? t.show : t.hide}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex flex-wrap gap-2 items-center justify-between p-3 bg-amber-100/50 border-b border-amber-200">
            <button
              onClick={toggleAll}
              className="text-xs sm:text-sm px-3 py-1.5 rounded-md bg-white border border-amber-300 text-amber-900 hover:bg-amber-50"
            >
              {allSelected ? t.deselect : t.selectAll} ({selected.size}/{photos.length})
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => runBatch('delete')}
                disabled={selected.size === 0 || busy !== null}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-md bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === 'delete' ? t.deleting : `🗑 ${t.deleteSel}`}
              </button>
              <button
                onClick={() => runBatch('process')}
                disabled={selected.size === 0 || busy !== null}
                className="text-xs sm:text-sm px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
              >
                {busy === 'process' ? t.processing : `✨ ${t.processSel}`}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 text-xs text-rose-700 bg-rose-50 border-b border-rose-200">
              {error}
            </div>
          )}

          {progress && busy === 'process' && (
            <div className="px-3 py-2 text-xs text-amber-800 bg-amber-100 border-b border-amber-200">
              {t.processing} {progress.done}/{progress.total}
            </div>
          )}

          <div className="p-3 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {photos.map(p => {
              const isSel = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleOne(p.id)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    isSel ? 'border-emerald-500 ring-2 ring-emerald-300' : 'border-slate-200 hover:border-amber-400'
                  }`}
                >
                  {p.url ? (
                    <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      no image
                    </div>
                  )}
                  <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white/90 border border-slate-300 flex items-center justify-center text-xs font-bold">
                    {isSel ? '✓' : ''}
                  </div>
                  {!childId && p.child_name && (
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/60 text-white text-[10px] truncate">
                      {p.child_name}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
