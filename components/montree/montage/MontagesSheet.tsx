// components/montree/montage/MontagesSheet.tsx
//
// "🎬 Montages" — the teacher's delivery sheet, opened from the Montage
// Manager header. A slide-over (never a route) listing this school's scoped
// montage jobs newest-first, with everything you can do with a FINISHED film:
//
//   ▶ play      inline <video>, preload="metadata" so opening the sheet costs
//               a few KB per row, not a few MB
//   ⬇ download  a plain <a href="…?download=1"> straight at the media proxy —
//               the browser streams it to disk; nothing is buffered in RAM
//   ✉ send      POST /api/montree/montage/send { job_id } → the parent side
//
// Rendered behind a dynamic() import from the Manager page and only mounted
// while open, so none of this (nor the video element) lands in the page's
// first-paint bundle.
//
// 🚨 POLLING: only while this sheet is OPEN and something is still queued /
// rendering. A closed sheet is unmounted and makes zero requests, and a list
// of finished films stops polling the moment the last render lands.
//
// 🚨 sent_at comes from migration 307, which may not be run. The list API
// returns null for it in that case and the send route answers 503
// { error: 'not_migrated' } — both are handled here as "not set up yet",
// never as an error the teacher has to decode.
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { toast } from 'sonner';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

// Dark-forest tokens, inline per component (house style — see MontageStudio).
const T = {
  emerald: '#34d399',
  emeraldBorder: 'rgba(52,211,153,0.55)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  panel: 'rgba(7,18,12,0.97)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.12)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

/** Rows still moving — the only reason to poll. */
const ACTIVE_STATUSES = new Set(['queued', 'rendering']);
const POLL_MS = 10000;
const LIST_LIMIT = 30;

export interface MontageJobRow {
  id: string;
  scope_type: string;
  montage_kind: string;
  status: string;
  title: string;
  /** Server-resolved child / class / event name. */
  label: string;
  output_path: string | null;
  /** Plain media-proxy URL, or null while the film is still rendering. */
  video_url: string | null;
  created_at: string | null;
  error: string | null;
  /** Migration 307; null on schools that have not run it, and before a send. */
  sent_at: string | null;
}

/** Append ?download=1 / &download=1 depending on what the proxy URL already has. */
function downloadUrl(videoUrl: string): string {
  return `${videoUrl}${videoUrl.includes('?') ? '&' : '?'}download=1`;
}

/** Browser-local short date. Never toISOString — that shifts the day in Asia/Shanghai. */
function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

export default function MontagesSheet({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();

  const [jobs, setJobs] = useState<MontageJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // --- load + poll --------------------------------------------------------
  // 🚨 Closing the sheet UNMOUNTS it, and a poll can be in flight at that
  // moment. Every setState below is gated on this ref so a late response never
  // writes into a dead component.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await montreeApi(`/api/montree/montage?limit=${LIST_LIMIT}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!aliveRef.current) return;
      if (Array.isArray(data?.montages)) setJobs(data.montages as MontageJobRow[]);
      setLoadError(false);
    } catch (err) {
      console.error('[MontagesSheet] load failed:', err);
      if (aliveRef.current) setLoadError(true);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasActive = useMemo(() => jobs.some(j => ACTIVE_STATUSES.has(j.status)), [jobs]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!hasActive) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(load, POLL_MS);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [hasActive, load]);

  // Escape closes, like every other overlay in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // --- send ---------------------------------------------------------------
  // FROZEN CONTRACT with the send route:
  //   POST { job_id } → 200 { success: true, sent_at }
  //                   → 503 { error: 'not_migrated' }
  const handleSend = async (job: MontageJobRow) => {
    if (sendingId) return;
    setSendingId(job.id);
    try {
      const res = await montreeApi('/api/montree/montage/send', {
        method: 'POST',
        body: JSON.stringify({ job_id: job.id }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 503 || data?.error === 'not_migrated') {
        toast.error(t('montageTracker.create.notMigrated'));
        return;
      }
      if (!res.ok || !data?.success) {
        toast.error(typeof data?.error === 'string' ? data.error : t('common.failedToSend'));
        return;
      }

      const sentAt = typeof data.sent_at === 'string' ? data.sent_at : new Date().toISOString();
      if (!aliveRef.current) return;
      setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, sent_at: sentAt } : j)));
      toast.success(t('weeklyReview.notified'));
    } catch (err) {
      console.error('[MontagesSheet] send failed:', err);
      toast.error(t('common.failedToSend'));
    } finally {
      if (aliveRef.current) setSendingId(null);
    }
  };

  // --- labels -------------------------------------------------------------
  const statusLabel = (status: string): string => {
    switch (status) {
      case 'queued': return t('montage.status.queued');
      case 'rendering': return t('montage.status.rendering');
      case 'done': return t('montage.status.done');
      case 'failed': return t('montage.status.failed');
      case 'skipped_insufficient_photos': return t('montage.status.skipped_insufficient_photos');
      default: return status;
    }
  };

  const statusColor = (status: string): { fg: string; bg: string } => {
    if (status === 'done') return { fg: T.emerald, bg: T.emeraldSoft };
    if (status === 'failed') return { fg: T.red, bg: T.redSoft };
    if (status === 'skipped_insufficient_photos') return { fg: T.textMuted, bg: 'rgba(255,255,255,0.05)' };
    return { fg: '#f59e0b', bg: 'rgba(245,158,11,0.10)' };
  };

  const kindLabel = (kind: string): string => {
    switch (kind) {
      case 'daily': return t('montage.kind.daily');
      case 'weekly': return t('montage.kind.weekly');
      case 'custom': return t('montage.kind.custom');
      case 'report': return t('montage.kind.report');
      default: return kind;
    }
  };

  // --- styles -------------------------------------------------------------
  const actionButton = (tone: 'primary' | 'quiet', disabled = false): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    padding: '8px 12px', borderRadius: 10,
    background: tone === 'primary' ? T.emeraldSoft : 'rgba(255,255,255,0.06)',
    border: `1px solid ${tone === 'primary' ? T.emeraldBorder : T.cardBorder}`,
    color: tone === 'primary' ? T.emerald : T.textPrimary,
    fontFamily: T.sans, fontSize: 12, fontWeight: 600,
    textDecoration: 'none', whiteSpace: 'nowrap',
    cursor: disabled ? 'wait' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(2,8,5,0.78)',
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('montageTracker.jobs.title')}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, height: '100%',
          background: T.panel,
          borderLeft: `1px solid ${T.cardBorder}`,
          display: 'flex', flexDirection: 'column',
          fontFamily: T.sans,
        }}
      >
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid rgba(52,211,153,0.15)',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0, fontFamily: T.serif, fontSize: 16, color: T.textPrimary }}>
            🎬 {t('montageTracker.jobs.title')}
          </div>
          <button
            type="button"
            onClick={load}
            aria-label={t('montageTracker.refresh')}
            title={t('montageTracker.refresh')}
            className="btn btn-secondary btn-icon btn-sm"
          >
            ↻
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            title={t('common.close')}
            className="btn btn-secondary btn-icon btn-sm"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {loading && jobs.length === 0 && (
            <div style={{ fontSize: 13, color: T.textMuted }}>{t('common.loading')}</div>
          )}

          {!loading && loadError && jobs.length === 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: T.red, fontSize: 13, marginBottom: 8 }}>{t('montageTracker.loadFailed')}</div>
              <button type="button" onClick={() => { setLoading(true); load(); }} className="btn btn-primary btn-sm">
                {t('montageTracker.retry')}
              </button>
            </div>
          )}

          {!loading && !loadError && jobs.length === 0 && (
            <div style={{
              padding: 18, borderRadius: 14, textAlign: 'center',
              background: T.card, border: `1px solid ${T.cardBorder}`,
              color: T.textMuted, fontSize: 13,
            }}>
              {t('montageTracker.jobs.empty')}
            </div>
          )}

          {jobs.map(job => {
            const c = statusColor(job.status);
            const isDone = job.status === 'done' && !!job.video_url;
            const created = shortDate(job.created_at);
            const sending = sendingId === job.id;
            return (
              <div
                key={job.id}
                style={{
                  padding: 12, borderRadius: 14,
                  background: T.card, border: `1px solid ${T.cardBorder}`,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: T.textPrimary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {job.label || job.title}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                      {kindLabel(job.montage_kind)}{created ? ` · ${created}` : ''}
                    </div>
                    {job.status === 'failed' && job.error && (
                      <div style={{
                        fontSize: 11, color: T.red, marginTop: 3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {job.error}
                      </div>
                    )}
                  </div>

                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 999,
                    background: c.bg, border: `1px solid ${c.fg}40`,
                    color: c.fg, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                  }}>
                    {ACTIVE_STATUSES.has(job.status) && (
                      <span
                        className="animate-spin"
                        style={{
                          width: 10, height: 10, borderRadius: '50%',
                          border: `2px solid ${c.fg}`, borderTopColor: 'transparent',
                          display: 'inline-block',
                        }}
                      />
                    )}
                    {statusLabel(job.status)}
                  </span>
                </div>

                {isDone && (
                  <>
                    {/* preload="metadata": the poster frame + duration only.
                        Ten finished films in the list must not pull ten videos. */}
                    <video
                      src={job.video_url as string}
                      controls
                      playsInline
                      preload="metadata"
                      style={{ width: '100%', borderRadius: 12, background: '#000', display: 'block' }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Straight at the proxy — the browser streams to disk,
                          nothing is buffered into a client-side blob. */}
                      <a
                        href={downloadUrl(job.video_url as string)}
                        download
                        className="btn btn-secondary btn-sm"
                      >
                        ⬇ {t('admin.billing.download')}
                      </a>

                      {/* handleSend early-returns while ANY send is in flight,
                          so every row's button is disabled — otherwise the
                          other rows look tappable and do nothing. */}
                      <button
                        type="button"
                        onClick={() => handleSend(job)}
                        disabled={!!sendingId}
                        className="btn btn-primary btn-sm"
                      >
                        {sending
                          ? t('weeklyWrap.sending')
                          : job.sent_at
                            ? `✓ ${t('weeklyWrap.sent')}`
                            : `✉ ${t('weeklyWrap.sendToParent')}`}
                      </button>

                      {job.sent_at && !sending && (
                        <span style={{ fontSize: 11, color: T.textMuted }}>
                          {t('reports.sentOn')} {shortDate(job.sent_at)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
