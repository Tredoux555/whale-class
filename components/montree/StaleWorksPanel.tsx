'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface StaleWork {
  child_id: string;
  child_name: string;
  work_name: string;
  area: string;
  status: string;
  days_stale: number;
  updated_at: string;
}

/** Staleness level based on days without update */
function getStalenessLevel(days: number): 'cooling' | 'stale' | 'attention' {
  if (days >= 21) return 'attention';
  if (days >= 14) return 'stale';
  return 'cooling';
}

const LEVEL_CONFIG = {
  attention: { color: 'bg-amber-50', dot: 'bg-amber-400', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  stale: { color: 'bg-blue-50', dot: 'bg-blue-300', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  cooling: { color: 'bg-emerald-50', dot: 'bg-emerald-400', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
} as const;

export default function StaleWorksPanel() {
  const { t } = useI18n();
  const [works, setWorks] = useState<StaleWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null); // "childId:workName"
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const dismissingRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchStaleWorks = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/intelligence/stale-works');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setWorks(json.works || []);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[StaleWorksPanel] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStaleWorks();
    return () => { abortRef.current?.abort(); };
  }, [fetchStaleWorks]);

  const handleDismiss = useCallback(async (childId: string, workName: string) => {
    const key = `${childId}:${workName}`;
    // Use ref for stale-closure-safe guard
    if (dismissingRef.current) return;
    dismissingRef.current = key;
    setDismissing(key);
    try {
      const res = await montreeApi('/api/montree/intelligence/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, work_name: workName }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        setWorks(prev => prev.filter(w => !(w.child_id === childId && w.work_name === workName)));
        toast.success(t('staleWorks.dismissed'));
      } else {
        toast.error(t('staleWorks.dismissFailed'));
      }
    } catch (err) {
      console.error('[StaleWorksPanel] Dismiss error:', err);
      if (mountedRef.current) toast.error(t('staleWorks.dismissFailed'));
    } finally {
      dismissingRef.current = null;
      if (mountedRef.current) setDismissing(null);
    }
  }, [t]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-40 mb-2" />
        <div className="h-8 bg-gray-50 rounded w-full" />
      </div>
    );
  }

  // Don't show panel if no stale works
  if (works.length === 0) return null;

  // Count by level
  const attentionCount = works.filter(w => getStalenessLevel(w.days_stale) === 'attention').length;
  const staleCount = works.filter(w => getStalenessLevel(w.days_stale) === 'stale').length;
  const coolingCount = works.filter(w => getStalenessLevel(w.days_stale) === 'cooling').length;

  // Only show attention + stale in the summary badge (cooling is normal)
  const alertCount = attentionCount + staleCount;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Summary bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('staleWorks.title')}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🔍</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-700">
              {t('staleWorks.title')}
            </div>
            <div className="text-xs text-gray-500">
              {alertCount > 0
                ? t('staleWorks.alertSummary')
                    .replace('{count}', String(alertCount))
                : t('staleWorks.allFresh')
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {attentionCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
              {attentionCount} 🟡
            </span>
          )}
          {staleCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-600">
              {staleCount} 🔵
            </span>
          )}
          {coolingCount > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {coolingCount} 🟢
            </span>
          )}
          <span className={`text-gray-400 transition-transform duration-200 text-xs ${expanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
          {/* Group by staleness level — attention first, then stale, then cooling */}
          {(['attention', 'stale', 'cooling'] as const).map(level => {
            const levelWorks = works.filter(w => getStalenessLevel(w.days_stale) === level);
            if (levelWorks.length === 0) return null;
            const config = LEVEL_CONFIG[level];

            return (
              <div key={level}>
                <div className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${config.text}`}>
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  {t(`staleWorks.level.${level}`)} ({levelWorks.length})
                </div>
                <div className="space-y-1">
                  {levelWorks.map(work => {
                    const key = `${work.child_id}:${work.work_name}`;
                    return (
                      <div key={key} className={`flex items-center justify-between ${config.color} rounded-lg px-3 py-2`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 truncate">
                            <span className="font-medium">{work.child_name}</span>
                            <span className="text-gray-400 mx-1">·</span>
                            <span>{work.work_name}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {t('staleWorks.daysAgo').replace('{days}', String(work.days_stale))}
                            <span className="text-gray-300 mx-1">·</span>
                            <span className={`${config.badge} px-1.5 py-0.5 rounded text-[10px] font-medium`}>
                              {work.status}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismiss(work.child_id, work.work_name); }}
                          disabled={dismissing === key}
                          className="text-xs px-2 py-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors ml-2 flex-shrink-0"
                          title={t('staleWorks.dismiss')}
                        >
                          {dismissing === key ? '...' : '✕'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
