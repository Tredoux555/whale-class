// components/montree/media/PhotoQueueBanner.tsx
// Shows upload queue status in gallery: progress bar, ETA, per-photo counts, retry button
'use client';

import { usePhotoQueue } from '@/hooks/usePhotoQueue';
import { useI18n } from '@/lib/montree/i18n';

interface PhotoQueueBannerProps {
  childId?: string;
}

function formatETA(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '';
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`;
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return '';
  if (bytesPerSecond > 1024 * 1024) {
    return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
  }
  return `${Math.round(bytesPerSecond / 1024)} KB/s`;
}

export default function PhotoQueueBanner({ childId }: PhotoQueueBannerProps) {
  const { t } = useI18n();
  const { stats, sync, syncing, progress } = usePhotoQueue(childId);

  if (!stats) return null;

  const pendingCount = stats.pending + stats.uploading + stats.failed;
  if (pendingCount === 0 && stats.permanent_failure === 0) return null;

  const pendingMB = (stats.total_bytes_pending / 1024 / 1024).toFixed(1);

  // Use real-time progress when available, fall back to stats
  const progressPct = progress
    ? (progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0)
    : (pendingCount > 0 ? 0 : 100);

  const etaStr = progress ? formatETA(progress.etaSeconds) : '';
  const speedStr = progress ? formatSpeed(progress.bytesPerSecond) : '';
  const showProgressDetail = syncing && progress && progress.total > 0;

  return (
    <div className="mx-4 mb-3">
      {/* Pending/uploading banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              {syncing ? (
                <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full" />
              ) : (
                <span className="text-amber-600 text-sm">{'\u{1F4F7}'}</span>
              )}
              <span className="text-sm font-medium text-amber-800">
                {showProgressDetail
                  ? `${t('offline.uploading') || 'Uploading'} ${progress.completed}/${progress.total}...`
                  : syncing
                    ? `${t('offline.uploading') || 'Uploading'} ${stats.uploading} ${t('offline.photo') || 'photo'}${stats.uploading !== 1 ? 's' : ''}...`
                    : `${pendingCount} ${t('offline.photo') || 'photo'}${pendingCount !== 1 ? 's' : ''} ${t('offline.waitingToUpload') || 'waiting to upload'}`
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              {showProgressDetail && etaStr && (
                <span className="text-xs text-amber-600">{etaStr}</span>
              )}
              {showProgressDetail && speedStr && (
                <span className="text-xs text-amber-500">{speedStr}</span>
              )}
              {!syncing && (
                <>
                  <span className="text-xs text-amber-600">{pendingMB} MB</span>
                  <button
                    onClick={() => sync()}
                    className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded hover:bg-amber-200 transition-colors"
                  >
                    {t('offline.syncNow') || 'Sync now'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Per-photo counts when syncing */}
          {showProgressDetail && progress.failed > 0 && (
            <div className="mt-1 text-xs text-amber-600">
              {progress.uploaded} {t('offline.uploaded') || 'uploaded'}, {progress.failed} {t('offline.failedShort') || 'failed'}
            </div>
          )}
        </div>
      )}

      {/* Permanent failure banner */}
      {stats.permanent_failure > 0 && (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${pendingCount > 0 ? 'mt-2' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">
              {stats.permanent_failure} {t('offline.photo') || 'photo'}{stats.permanent_failure !== 1 ? 's' : ''} {t('offline.failedToUpload') || 'failed to upload'}
            </span>
            <button
              onClick={() => sync()}
              className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded hover:bg-red-200 transition-colors"
            >
              {t('offline.retryAll') || 'Retry all'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
