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
// Dark forest visual treatment — all wiring intact

import { useCallback, useEffect, useState } from 'react';
import { Search, Trash2, Sparkles, Check } from 'lucide-react';
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
  childId?: string;
  onProcessed?: (count: number) => void;
  compact?: boolean;
}

const T = {
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.10)',
  amberStrong: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.35)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function PendingReviewPanel({ childId, onProcessed, compact = false }: PendingReviewPanelProps) {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'process' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

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
    if (mode === 'delete' && !confirm(t('pendingReview.confirmDelete'))) return;
    const ids = Array.from(selected);
    setBusy(mode);
    setError(null);
    setProgress({ done: 0, total: ids.length });
    try {
      const method = mode === 'process' ? 'POST' : 'DELETE';
      const res = await montreeApi('/api/montree/photo-identification/batch', {
        method,
        body: JSON.stringify({ media_ids: ids }),
        timeout: 300_000,
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      const failed = mode === 'process' ? (data?.failed || 0) : 0;
      const succeeded = mode === 'process' ? (data?.succeeded || 0) : (data?.deleted || 0);
      if (failed > 0) {
        setError(`${failed} ${t('pendingReview.failed')}`);
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
      <div style={{
        padding: 16,
        borderRadius: 12,
        background: T.amberSoft,
        border: `1px solid ${T.amberBorder}`,
        color: T.amber,
        fontFamily: T.sans,
        fontSize: 13,
      }}>
        {t('pendingReview.loading')}
      </div>
    );
  }

  if (!loading && photos.length === 0) {
    if (compact) return null;
    return (
      <div style={{
        padding: 16,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(52,211,153,0.15)',
        color: T.textMuted,
        fontFamily: T.sans,
        fontSize: 13,
      }}>
        {t('pendingReview.emptyState')}
      </div>
    );
  }

  const allSelected = selected.size > 0 && selected.size === photos.length;

  return (
    <div style={{
      borderRadius: 14,
      background: T.amberSoft,
      border: `1px solid ${T.amberBorder}`,
      backdropFilter: 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      overflow: 'hidden',
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: compact ? 12 : 14,
        borderBottom: `1px solid ${T.amberBorder}`,
        background: 'linear-gradient(180deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 9,
            background: T.amberStrong,
            border: `1px solid ${T.amberBorder}`,
            color: T.amber,
            flexShrink: 0,
          }}>
            <Search size={15} strokeWidth={1.75} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: compact ? 13 : 15,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.1,
            }}>
              {t('pendingReview.title')}
              <span style={{ color: T.textMuted, fontWeight: 400, fontFamily: T.sans, fontSize: 12 }}>
                {' · '}{t('pendingReview.photosWaiting', { count: photos.length })}
              </span>
            </div>
            {!compact && (
              <div style={{
                fontFamily: T.sans,
                fontSize: 11,
                color: T.amber,
                opacity: 0.85,
                marginTop: 2,
              }}>
                {t('pendingReview.subtitle')}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: T.amber,
            fontFamily: T.sans,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {collapsed ? t('pendingReview.show') : t('pendingReview.hide')}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Action bar */}
          <div style={{
            padding: 12,
            background: 'rgba(245,158,11,0.06)',
            borderBottom: `1px solid ${T.amberBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <button
              onClick={toggleAll}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${T.amberBorder}`,
                color: T.amber,
                fontFamily: T.sans,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {allSelected ? t('pendingReview.deselect') : t('pendingReview.selectAll')} ({selected.size}/{photos.length})
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => runBatch('delete')}
                disabled={selected.size === 0 || busy !== null}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: T.redSoft,
                  border: `1px solid ${T.redBorder}`,
                  color: T.red,
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: (selected.size === 0 || busy !== null) ? 'not-allowed' : 'pointer',
                  opacity: (selected.size === 0 || busy !== null) ? 0.40 : 1,
                }}
              >
                <Trash2 size={11} strokeWidth={1.75} />
                {busy === 'delete' ? t('pendingReview.deleting') : t('pendingReview.deleteSelected')}
              </button>
              <button
                onClick={() => runBatch('process')}
                disabled={selected.size === 0 || busy !== null}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: 'linear-gradient(180deg, #34d399, #10b981)',
                  border: '1px solid rgba(52,211,153,0.55)',
                  color: '#06281a',
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: (selected.size === 0 || busy !== null) ? 'not-allowed' : 'pointer',
                  opacity: (selected.size === 0 || busy !== null) ? 0.40 : 1,
                  boxShadow: (selected.size === 0 || busy !== null) ? 'none' : '0 4px 14px rgba(16,185,129,0.25)',
                }}
              >
                <Sparkles size={11} strokeWidth={1.75} />
                {busy === 'process' ? t('pendingReview.processing') : t('pendingReview.processSelected')}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '8px 12px',
              fontFamily: T.sans,
              fontSize: 11,
              color: T.red,
              background: T.redSoft,
              borderBottom: `1px solid ${T.redBorder}`,
            }}>
              {error}
            </div>
          )}

          {progress && busy === 'process' && (
            <div style={{
              padding: '8px 12px',
              fontFamily: T.sans,
              fontSize: 11,
              color: T.amber,
              background: T.amberStrong,
              borderBottom: `1px solid ${T.amberBorder}`,
            }}>
              {t('pendingReview.processing')} {progress.done}/{progress.total}
            </div>
          )}

          {/* Grid */}
          <div style={{
            padding: 12,
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          }}>
            {photos.map(p => {
              const isSel = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggleOne(p.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: `2px solid ${isSel ? T.emerald : 'rgba(255,255,255,0.10)'}`,
                    boxShadow: isSel ? `0 0 0 3px rgba(52,211,153,0.20)` : 'none',
                    background: 'rgba(0,0,0,0.30)',
                    cursor: 'pointer',
                    transition: 'all 140ms ease',
                    padding: 0,
                  }}
                >
                  {p.url ? (
                    <img
                      src={p.url}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: T.textMuted,
                      fontFamily: T.sans,
                      fontSize: 11,
                    }}>
                      no image
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSel ? T.emerald : 'rgba(7,18,12,0.70)',
                    border: `1.5px solid ${isSel ? T.emerald : 'rgba(255,255,255,0.55)'}`,
                    color: isSel ? '#06281a' : 'transparent',
                    backdropFilter: 'blur(6px)',
                  }}>
                    {isSel && <Check size={12} strokeWidth={3} />}
                  </div>
                  {!childId && p.child_name && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: '3px 6px',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      fontFamily: T.sans,
                      fontSize: 10,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
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
