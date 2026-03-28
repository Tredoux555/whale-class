'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface ReadyWork {
  work_name: string;
  area: string;
  evidence_photo_count: number;
  evidence_photo_days: number;
}

interface ChildEvidenceSummary {
  id: string;
  name: string;
  strong: number;
  moderate: number;
  weak: number;
  confirmed: number;
  total_active: number;
  ready_works: ReadyWork[];
}

interface ClassroomTotals {
  strong: number;
  moderate: number;
  weak: number;
  confirmed: number;
  ready: number;
}

export default function EvidencePanel() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<ChildEvidenceSummary[]>([]);
  const [totals, setTotals] = useState<ClassroomTotals>({ strong: 0, moderate: 0, weak: 0, confirmed: 0, ready: 0 });
  const [confirming, setConfirming] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchOverview = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/intelligence/evidence-overview');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setChildren(json.children || []);
      setTotals(json.classroom_totals || { strong: 0, moderate: 0, weak: 0, confirmed: 0, ready: 0 });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[EvidencePanel] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    return () => { abortRef.current?.abort(); };
  }, [fetchOverview]);

  const handleConfirmMastery = useCallback(async (childId: string, workName: string) => {
    const key = `${childId}:${workName}`;
    if (confirming === key) return;
    setConfirming(key);

    try {
      const res = await montreeApi('/api/montree/intelligence/evidence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: workName,
          action: 'confirm_mastery',
        }),
      });
      if (!mountedRef.current) return;

      if (res.ok) {
        toast.success(t('evidence.masteryConfirmed'));
        await fetchOverview();
      } else {
        toast.error(t('evidence.confirmFailed'));
      }
    } catch (err) {
      console.error('[EvidencePanel] Confirm error:', err);
      if (mountedRef.current) toast.error(t('evidence.confirmFailed'));
    } finally {
      if (mountedRef.current) setConfirming(null);
    }
  }, [confirming, t, fetchOverview]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-36 mb-2" />
        <div className="h-8 bg-gray-50 rounded w-full" />
      </div>
    );
  }

  const hasData = children.length > 0;
  const childrenWithReady = children.filter(c => c.ready_works.length > 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Summary bar — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('evidence.title')}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">📷</span>
          <div className="text-left">
            <div className="text-sm font-semibold text-gray-700">
              {t('evidence.title')}
            </div>
            <div className="text-xs text-gray-500">
              {totals.ready > 0
                ? t('evidence.readySummary').replace('{count}', String(totals.ready))
                : t('evidence.noReady')
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totals.strong > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {totals.strong} {t('evidence.strong')}
            </span>
          )}
          {totals.moderate > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
              {totals.moderate} {t('evidence.moderate')}
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
          {/* Classroom stats row */}
          {hasData && (
            <div className="flex gap-2">
              <div className="flex-1 bg-emerald-50 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-emerald-700">{totals.strong}</div>
                <div className="text-[10px] text-emerald-600 font-medium">{t('evidence.strong')}</div>
              </div>
              <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-blue-700">{totals.moderate}</div>
                <div className="text-[10px] text-blue-600 font-medium">{t('evidence.moderate')}</div>
              </div>
              <div className="flex-1 bg-amber-50 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-amber-700">{totals.weak}</div>
                <div className="text-[10px] text-amber-600 font-medium">{t('evidence.weak')}</div>
              </div>
              <div className="flex-1 bg-violet-50 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-violet-700">{totals.confirmed}</div>
                <div className="text-[10px] text-violet-600 font-medium">{t('evidence.confirmed')}</div>
              </div>
            </div>
          )}

          {/* Ready for mastery alert */}
          {childrenWithReady.length > 0 && (
            <div className="bg-emerald-50 rounded-lg px-3 py-2">
              <div className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {t('evidence.readyAlert').replace('{count}', String(childrenWithReady.length))}
              </div>
              <div className="text-xs text-emerald-600">
                {childrenWithReady.slice(0, 3).map(c => c.name.split(' ')[0]).join(', ')}
                {childrenWithReady.length > 3 && ` +${childrenWithReady.length - 3}`}
              </div>
            </div>
          )}

          {/* Per-child cards */}
          {hasData && (
            <div className="space-y-1.5">
              {children.filter(c => c.total_active > 0).map(child => (
                <div key={child.id} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
                        {child.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-gray-700 font-medium truncate">{child.name.split(' ')[0]}</div>
                        <div className="text-[10px] text-gray-400">
                          {child.total_active} {child.total_active === 1 ? t('evidence.work') : t('evidence.works')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {child.strong > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          ✅{child.strong}
                        </span>
                      )}
                      {child.moderate > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          📸{child.moderate}
                        </span>
                      )}
                      {child.weak > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          ⚠️{child.weak}
                        </span>
                      )}
                      {child.confirmed > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                          ⭐{child.confirmed}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ready works — confirm mastery buttons */}
                  {child.ready_works.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {child.ready_works.slice(0, 3).map(w => {
                        const key = `${child.id}:${w.work_name}`;
                        return (
                          <div key={w.work_name} className="flex items-center justify-between bg-white rounded-md px-2 py-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="text-xs text-gray-700 truncate">{w.work_name}</div>
                              <div className="text-[10px] text-gray-400">
                                {w.evidence_photo_count} {t('evidence.photos')}, {w.evidence_photo_days} {t('evidence.days')}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleConfirmMastery(child.id, w.work_name); }}
                              disabled={confirming === key}
                              className="ml-2 text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            >
                              {confirming === key ? t('evidence.confirming') : t('evidence.confirmMastery')}
                            </button>
                          </div>
                        );
                      })}
                      {child.ready_works.length > 3 && (
                        <div className="text-[10px] text-gray-400 text-center">
                          +{child.ready_works.length - 3} {t('evidence.moreReady')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!hasData && (
            <div className="text-center py-4 text-sm text-gray-400">
              {t('evidence.noData')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
