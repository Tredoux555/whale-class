'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface PulseStatus {
  status: 'idle' | 'in_progress' | 'completed' | 'stale' | 'failed';
  batch_index: number;
  total_children: number;
  locked_by: string | null;
  completed_at: string | null;
}

interface ChildSummary {
  id: string;
  name: string;
  mastered: number;
  practicing: number;
  presented: number;
  total_works: number;
  total_photos: number;
  stale_works: number;
  recent_work: string | null;
}

export default function PulsePanel() {
  const { t } = useI18n();
  const [pulseStatus, setPulseStatus] = useState<PulseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const generatingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchStatus = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/pulse');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setPulseStatus(json);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[PulsePanel] Fetch status error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => { abortRef.current?.abort(); };
  }, [fetchStatus]);

  const handleGenerate = useCallback(async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    setChildren([]);

    try {
      // Step 1: Start pulse generation (acquire lock + get children data)
      const res = await montreeApi('/api/montree/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!mountedRef.current) return;

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        if (res.status === 409) {
          toast.error(t('pulse.alreadyInProgress'));
        } else if (res.status === 400) {
          toast.error(t('pulse.noChildren'));
        } else {
          toast.error(t('pulse.generateFailed'));
        }
        return;
      }

      const data = await res.json();
      if (!mountedRef.current) return;

      // Data contains children summaries — store them
      setChildren(data.children || []);
      setExpanded(true);

      // Step 2: Mark pulse as complete
      const completeRes = await montreeApi('/api/montree/pulse', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      if (!mountedRef.current) return;

      if (completeRes.ok) {
        toast.success(t('pulse.generated'));
        // Refresh status
        await fetchStatus();
      } else {
        toast.error(t('pulse.completeFailed'));
      }
    } catch (err) {
      console.error('[PulsePanel] Generate error:', err);
      if (mountedRef.current) {
        toast.error(t('pulse.generateFailed'));
        // Try to mark as failed
        montreeApi('/api/montree/pulse', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'fail' }),
        }).catch(() => {});
      }
    } finally {
      generatingRef.current = false;
      if (mountedRef.current) setGenerating(false);
    }
  }, [t, fetchStatus]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-36 mb-2" />
        <div className="h-8 bg-gray-50 rounded w-full" />
      </div>
    );
  }

  const hasData = children.length > 0;
  const lastCompleted = pulseStatus?.completed_at
    ? new Date(pulseStatus.completed_at)
    : null;
  const isStale = pulseStatus?.status === 'stale';
  const isInProgress = pulseStatus?.status === 'in_progress';

  // Summary stats from children data
  const totalMastered = children.reduce((sum, c) => sum + c.mastered, 0);
  const totalPracticing = children.reduce((sum, c) => sum + c.practicing, 0);
  const totalStaleWorks = children.reduce((sum, c) => sum + c.stale_works, 0);
  const childrenWithStaleWorks = children.filter(c => c.stale_works > 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Summary bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('pulse.title')}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">💡</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-700">
              {t('pulse.title')}
            </div>
            <div className="text-xs text-gray-500">
              {lastCompleted
                ? t('pulse.lastGenerated').replace('{time}', formatTimeAgo(lastCompleted, t))
                : t('pulse.neverGenerated')
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasData && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-violet-100 text-violet-700">
              {children.length} {children.length === 1 ? t('pulse.child') : t('pulse.children')}
            </span>
          )}
          <span className={`text-gray-400 transition-transform duration-200 text-xs ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || isInProgress}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating
              ? t('pulse.generating')
              : isInProgress
                ? t('pulse.inProgress')
                : isStale
                  ? t('pulse.regenerate')
                  : t('pulse.generate')
            }
          </button>

          {/* Generating progress indicator */}
          {generating && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              <span className="text-xs text-gray-500">{t('pulse.analyzingChildren')}</span>
            </div>
          )}

          {/* Results summary */}
          {hasData && !generating && (
            <>
              {/* Stats row */}
              <div className="flex gap-2">
                <div className="flex-1 bg-emerald-50 rounded-lg px-3 py-2 text-center">
                  <div className="text-lg font-bold text-emerald-700">{totalMastered}</div>
                  <div className="text-[10px] text-emerald-600 font-medium">{t('pulse.mastered')}</div>
                </div>
                <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 text-center">
                  <div className="text-lg font-bold text-blue-700">{totalPracticing}</div>
                  <div className="text-[10px] text-blue-600 font-medium">{t('pulse.practicing')}</div>
                </div>
                {totalStaleWorks > 0 && (
                  <div className="flex-1 bg-amber-50 rounded-lg px-3 py-2 text-center">
                    <div className="text-lg font-bold text-amber-700">{totalStaleWorks}</div>
                    <div className="text-[10px] text-amber-600 font-medium">{t('pulse.stale')}</div>
                  </div>
                )}
              </div>

              {/* Stale works alert */}
              {childrenWithStaleWorks.length > 0 && (
                <div className="bg-amber-50 rounded-lg px-3 py-2">
                  <div className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {t('pulse.needsAttention').replace('{count}', String(childrenWithStaleWorks.length))}
                  </div>
                  <div className="text-xs text-amber-600">
                    {childrenWithStaleWorks.slice(0, 3).map(c => c.name.split(' ')[0]).join(', ')}
                    {childrenWithStaleWorks.length > 3 && ` +${childrenWithStaleWorks.length - 3}`}
                  </div>
                </div>
              )}

              {/* Per-child cards */}
              <div className="space-y-1.5">
                {children.map(child => (
                  <div key={child.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-violet-200 flex items-center justify-center text-xs font-bold text-violet-700 flex-shrink-0">
                        {child.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-700 font-medium truncate">{child.name.split(' ')[0]}</div>
                        {child.recent_work && (
                          <div className="text-[10px] text-gray-400 truncate">{child.recent_work}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {child.mastered > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          ⭐{child.mastered}
                        </span>
                      )}
                      {child.practicing > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          🔄{child.practicing}
                        </span>
                      )}
                      {child.stale_works > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          ⚠️{child.stale_works}
                        </span>
                      )}
                      {child.total_photos > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                          📸{child.total_photos}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date, t: (key: string) => string): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minutesAgo').replace('{count}', String(mins));
  if (hours < 24) return t('time.hoursAgo').replace('{count}', String(hours));
  return t('time.daysAgo').replace('{count}', String(days));
}
