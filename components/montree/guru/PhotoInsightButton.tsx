'use client';

// components/montree/guru/PhotoInsightButton.tsx
// Smart Capture button — true fire-and-forget photo analysis
// Uses global photo-insight-store so processing survives navigation between children
// Shows toast results + scenario-based CTAs for work ingestion
// Scenarios: A (unknown work), B (not in classroom), C (not on shelf), D (happy path)

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import AreaBadge from '@/components/montree/shared/AreaBadge';
import { montreeApi } from '@/lib/montree/api';
import {
  subscribe,
  getEntry,
  startAnalysis,
  resetEntry,
  confirmEntry,
  rejectEntry,
  type PhotoInsightResult,
} from '@/lib/montree/photo-insight-store';

interface PhotoInsightButtonProps {
  childId: string;
  mediaId: string;
  classroomId?: string;
  onProgressUpdate?: () => void;
  onTeachWork?: (data: { workName: string; area: string | null; mediaId: string }) => void;
  onAddToClassroom?: (data: { workName: string; area: string; classroomWorkId?: string | null }) => void;
  onAddToShelf?: (data: { workName: string; area: string; classroomWorkId: string | null }) => void;
}

const STATUS_LABELS: Record<string, { en: string; zh: string; emoji: string }> = {
  mastered: { en: 'Mastered', zh: '已掌握', emoji: '⭐' },
  practicing: { en: 'Practicing', zh: '练习中', emoji: '🔄' },
  presented: { en: 'Presented', zh: '已展示', emoji: '📋' },
};

export default function PhotoInsightButton({
  childId, mediaId, classroomId, onProgressUpdate, onTeachWork, onAddToClassroom, onAddToShelf,
}: PhotoInsightButtonProps) {
  const { locale, t } = useI18n();
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaDone, setCtaDone] = useState(false);
  const [ctaError, setCtaError] = useState<string | null>(null);

  // Mounted guard — prevents state updates on unmounted component
  const mountedRef = useRef(true);
  // Track setTimeout IDs for cleanup on unmount (prevents orphaned timers setting state)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // Subscribe to the global store — per-entry selector limits re-renders to THIS entry only
  // (Full-Map snapshot caused ALL PhotoInsightButtons to re-render when ANY entry changed)
  // Composite key (mediaId:childId) ensures group photos show the correct child's analysis
  const storeKey = `${mediaId}:${childId}`;
  const entrySelector = useCallback(() => getEntry(mediaId, childId), [mediaId, childId]);
  const entry = useSyncExternalStore(subscribe, entrySelector, entrySelector);

  const analyzing = entry?.status === 'analyzing' || entry?.status === 'retrying';
  const error = entry?.status === 'error';
  const retrying = entry?.status === 'retrying';
  const result: PhotoInsightResult | null = entry?.result ?? null;
  const errorType = entry?.errorType;

  // Reset CTA state when mediaId changes (e.g., navigating between photos)
  const prevMediaIdRef = useRef(mediaId);
  useEffect(() => {
    if (prevMediaIdRef.current !== mediaId) {
      prevMediaIdRef.current = mediaId;
      setCtaDone(false);
      setCtaError(null);
      setCtaLoading(false);
    }
  }, [mediaId]);

  // HIGH-002 fix: Guard ensures onProgressUpdate fires AT MOST once per entry
  // Prevents race: GREEN auto-update useEffect + user clicking confirm both calling onProgressUpdate
  const progressUpdateFiredRef = useRef<string | null>(null);

  // Fire onProgressUpdate exactly once when auto_updated result arrives
  // Try-catch: parent's callback may throw — don't let it crash this component
  // Set ref AFTER success so failures don't permanently block retries
  useEffect(() => {
    if (result?.auto_updated && onProgressUpdate && progressUpdateFiredRef.current !== storeKey) {
      try {
        onProgressUpdate();
        progressUpdateFiredRef.current = storeKey; // Only lock after success
      } catch (err) {
        console.error('[PhotoInsight] onProgressUpdate callback threw:', err);
        // Ref stays unset — allows retry via handleConfirm
      }
    }
  }, [result, storeKey, onProgressUpdate]);

  const handleClick = useCallback(() => {
    if (result || analyzing) return;
    startAnalysis(mediaId, childId, locale);
  }, [result, analyzing, mediaId, childId, locale]);

  const handleRetry = useCallback(() => {
    resetEntry(mediaId, childId);
    startAnalysis(mediaId, childId, locale);
  }, [mediaId, childId, locale]);

  // CTA: Confirm identification (AMBER zone — teacher says "yes, correct")
  // HIGH-003 fix: Read fresh from store inside handler to avoid stale closures
  const handleConfirm = useCallback(async () => {
    const freshEntry = getEntry(mediaId, childId);
    const freshResult = freshEntry?.result;
    if (!freshResult?.work_name || !freshResult?.area || ctaLoading) return;
    setCtaLoading(true);
    try {
      // 1. Update progress (same as auto-update but teacher-initiated)
      if (freshResult.mastery_evidence && ['mastered', 'practicing', 'presented'].includes(freshResult.mastery_evidence)) {
        const progressRes = await montreeApi(`/api/montree/progress/update`, {
          method: 'POST',
          body: JSON.stringify({
            child_id: childId,
            work_name: freshResult.work_name,
            area: freshResult.area,
            status: freshResult.mastery_evidence,
            notes: `[Smart Capture — Confirmed] ${freshResult.insight || ''}`,
          }),
        });
        if (!mountedRef.current) return;
        if (!progressRes.ok) {
          console.error('[PhotoInsight] Progress update failed:', progressRes.status);
          setCtaError(t('photoInsight.actionFailed'));
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          errorTimerRef.current = setTimeout(() => { if (mountedRef.current) setCtaError(null); }, 4000);
          setCtaLoading(false);
          return; // Don't mark as confirmed if progress update failed
        }
      }
      // 2. Mark correct in accuracy EMA (teacher confirmed = ground truth)
      if (classroomId) {
        try {
          const corrRes = await montreeApi(`/api/montree/guru/corrections`, {
            method: 'POST',
            body: JSON.stringify({
              child_id: childId,
              media_id: mediaId,
              original_work_name: freshResult.work_name,
              original_area: freshResult.area,
              action: 'confirm',
            }),
          });
          if (!corrRes.ok) {
            console.error('[PhotoInsight] Confirm accuracy EMA failed:', corrRes.status);
            // Non-fatal — proceed with local confirmation even if EMA fails
          }
        } catch (corrErr) {
          console.error('[PhotoInsight] Confirm accuracy EMA error (non-fatal):', corrErr);
        }
      }
      if (!mountedRef.current) return;
      confirmEntry(mediaId, childId);
      setCtaDone(true);
      // HIGH-002 fix: Only fire onProgressUpdate if not already fired by auto-update
      // Set ref AFTER success so failures don't permanently block retries
      if (onProgressUpdate && progressUpdateFiredRef.current !== storeKey) {
        try {
          onProgressUpdate();
          progressUpdateFiredRef.current = storeKey;
        } catch (cbErr) { console.error('[PhotoInsight] onProgressUpdate threw:', cbErr); }
      }
    } catch (err) {
      console.error('[PhotoInsight] Confirm error:', err);
      if (mountedRef.current) {
        setCtaError(t('photoInsight.actionFailed'));
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => { if (mountedRef.current) setCtaError(null); }, 4000);
      }
    } finally {
      if (mountedRef.current) setCtaLoading(false);
    }
  }, [mediaId, childId, classroomId, ctaLoading, onProgressUpdate, storeKey, t]);

  // CTA: Reject identification (AMBER zone — teacher says "wrong")
  // HIGH-003 fix: Read fresh from store inside handler to avoid stale closures
  const handleReject = useCallback(() => {
    const freshEntry = getEntry(mediaId, childId);
    const freshResult = freshEntry?.result;
    if (!freshResult?.work_name) return;
    rejectEntry(mediaId, childId);
    // Open the "Teach Guru" modal so teacher can correct
    if (onTeachWork) {
      onTeachWork({
        workName: freshResult.work_name,
        area: freshResult.area,
        mediaId,
      });
    }
  }, [mediaId, childId, onTeachWork]);

  // CTA: Add known standard work to classroom (Scenario B)
  // HIGH-003 fix: Read fresh from store inside handler to avoid stale closures
  const handleAddToClassroom = useCallback(async () => {
    const freshResult = getEntry(mediaId, childId)?.result;
    if (!freshResult?.work_name || !freshResult?.area || !classroomId || ctaLoading) return;
    setCtaLoading(true);
    try {
      const res = await montreeApi(`/api/montree/curriculum`, {
        method: 'POST',
        body: JSON.stringify({
          classroom_id: classroomId,
          name: freshResult.work_name,
          area_key: freshResult.area,
          is_custom: false,
          source: 'smart_capture',
        }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (!mountedRef.current) return;
        setCtaDone(true);
        if (onAddToClassroom) {
          onAddToClassroom({
            workName: freshResult.work_name!,
            area: freshResult.area!,
            classroomWorkId: data?.work?.id || null,
          });
        }
      } else {
        console.error('[PhotoInsight] Add to classroom failed:', res.status);
        setCtaError(t('photoInsight.actionFailed'));
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => { if (mountedRef.current) setCtaError(null); }, 4000);
      }
    } catch (err) {
      console.error('[PhotoInsight] Add to classroom error:', err);
      if (mountedRef.current) {
        setCtaError(t('photoInsight.actionFailed'));
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => { if (mountedRef.current) setCtaError(null); }, 4000);
      }
    } finally {
      if (mountedRef.current) setCtaLoading(false);
    }
  }, [mediaId, childId, classroomId, ctaLoading, onAddToClassroom, t]);

  // CTA: Add to child's shelf (Scenario C)
  // HIGH-003 fix: Read fresh from store inside handler to avoid stale closures
  const handleAddToShelf = useCallback(async () => {
    const freshResult = getEntry(mediaId, childId)?.result;
    if (!freshResult?.work_name || !freshResult?.area || !childId || ctaLoading) return;
    setCtaLoading(true);
    try {
      const res = await montreeApi(`/api/montree/focus-works`, {
        method: 'POST',
        body: JSON.stringify({
          child_id: childId,
          work_name: freshResult.work_name,
          area: freshResult.area,
          work_id: freshResult.classroom_work_id || undefined,
        }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        setCtaDone(true);
        if (onAddToShelf) {
          onAddToShelf({
            workName: freshResult.work_name!,
            area: freshResult.area!,
            classroomWorkId: freshResult.classroom_work_id || null,
          });
        }
        // Use progressUpdateFiredRef guard to prevent double-fire
        // Set ref AFTER success so failures don't permanently block retries
        if (onProgressUpdate && progressUpdateFiredRef.current !== storeKey) {
          try {
            onProgressUpdate();
            progressUpdateFiredRef.current = storeKey;
          } catch (cbErr) { console.error('[PhotoInsight] onProgressUpdate threw:', cbErr); }
        }
      } else {
        console.error('[PhotoInsight] Add to shelf failed:', res.status);
        setCtaError(t('photoInsight.actionFailed'));
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => { if (mountedRef.current) setCtaError(null); }, 4000);
      }
    } catch (err) {
      console.error('[PhotoInsight] Add to shelf error:', err);
      if (mountedRef.current) {
        setCtaError(t('photoInsight.actionFailed'));
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => { if (mountedRef.current) setCtaError(null); }, 4000);
      }
    } finally {
      if (mountedRef.current) setCtaLoading(false);
    }
  }, [mediaId, childId, ctaLoading, onAddToShelf, onProgressUpdate, storeKey, t]);

  // CTA: Teach Guru this unknown work (Scenario A) — opens modal
  // HIGH-003 fix: Read fresh from store inside handler to avoid stale closures
  const handleTeachWork = useCallback(() => {
    const freshResult = getEntry(mediaId, childId)?.result;
    if (!freshResult?.work_name) return;
    if (onTeachWork) {
      onTeachWork({
        workName: freshResult.work_name,
        area: freshResult.area,
        mediaId,
      });
    }
  }, [mediaId, childId, onTeachWork]);

  const statusInfo = result?.mastery_evidence
    ? STATUS_LABELS[result.mastery_evidence]
    : null;

  return (
    <div className="mt-2 space-y-1">
      {!result && (
        <>
          {error ? (
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
              title={t('common.tryAgain')}
            >
              <span>🔄</span>
              <span>
                {errorType === 'rate_limit'
                  ? t('photoInsight.rateLimited')
                  : errorType === 'timeout'
                  ? t('photoInsight.timeout')
                  : errorType === 'network'
                  ? t('photoInsight.networkError')
                  : t('common.tryAgain')}
              </span>
            </button>
          ) : (
            <button
              onClick={handleClick}
              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
              title={t('guru.whatDoesGuruSee')}
            >
              {analyzing ? (
                <>
                  <span className="animate-spin text-xs">⏳</span>
                  <span>{retrying ? t('photoInsight.retrying') : t('photoInsight.analyzing')}</span>
                </>
              ) : (
                <>
                  <span>🌿</span>
                  <span>{t('guru.whatDoesGuruSee')}</span>
                </>
              )}
            </button>
          )}
        </>
      )}

      {result && (
        <div className="space-y-1.5">
          {/* Work tag + area badge */}
          {result.work_name && (
            <div className="flex items-center gap-2 flex-wrap">
              {result.area && <AreaBadge area={result.area} size="xs" />}
              <span className="text-sm font-semibold text-gray-800">
                {result.work_name}
              </span>
              {statusInfo && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  result.mastery_evidence === 'mastered'
                    ? 'bg-emerald-100 text-emerald-700'
                    : result.mastery_evidence === 'practicing'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {statusInfo.emoji} {locale === 'zh' ? statusInfo.zh : statusInfo.en}
                </span>
              )}
            </div>
          )}

          {/* Brief observation */}
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="text-emerald-600">🌿</span> {result.insight}
          </p>

          {/* GREEN zone: Auto-updated with high confidence */}
          {result.auto_updated && (
            <p className="text-xs text-emerald-600 italic">
              {t('photoInsight.highConfidenceAutoUpdated')}
            </p>
          )}

          {/* AMBER zone: Needs teacher confirmation */}
          {!ctaDone && result.needs_confirmation && entry?.status !== 'confirmed' && entry?.status !== 'rejected' && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-amber-600 italic">{t('photoInsight.pendingConfirmation')}</p>
              <button
                onClick={handleConfirm}
                disabled={ctaLoading}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
              >
                {ctaLoading ? <span className="animate-spin">⏳</span> : <span>✓</span>}
                <span>{t('photoInsight.confirmMatch')}</span>
              </button>
              <button
                onClick={handleReject}
                disabled={ctaLoading}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
              >
                <span>✗</span>
                <span>{t('photoInsight.wrongMatch')}</span>
              </button>
            </div>
          )}

          {/* Teacher confirmed */}
          {entry?.status === 'confirmed' && (
            <p className="text-xs text-emerald-600 italic">
              ✓ {t('photoInsight.confirmed')}
            </p>
          )}

          {/* Scenario A: Suggestion pills (top candidates) + Teach Guru fallback */}
          {!ctaDone && result.scenario === 'A' && (
            <div className="space-y-1.5">
              {result.candidates && result.candidates.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('photoInsight.didYouMean')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.candidates.map((c) => (
                      <button
                        key={`${c.name}-${c.area}`}
                        onClick={async () => {
                          // Record soft correction: original was wrong, this candidate was right
                          // Read fresh from store for consistency (avoid stale closure on result)
                          const freshRes = getEntry(mediaId, childId)?.result;
                          if (classroomId && freshRes?.work_name) {
                            try {
                              await montreeApi(`/api/montree/guru/corrections`, {
                                method: 'POST',
                                body: JSON.stringify({
                                  child_id: childId,
                                  media_id: mediaId,
                                  original_work_name: freshRes.work_name,
                                  original_area: freshRes.area,
                                  corrected_work_name: c.name,
                                  corrected_area: c.area,
                                  correction_type: 'candidate_selection',
                                }),
                              });
                            } catch (err) {
                              console.error('[PhotoInsight] Soft correction error (non-fatal):', err);
                            }
                          }
                          // Guard: only fire callback if still mounted
                          if (!mountedRef.current) return;
                          if (onTeachWork) {
                            onTeachWork({ workName: c.name, area: c.area, mediaId });
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors"
                      >
                        <AreaBadge area={c.area} size="xs" />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {onTeachWork && (
                <button
                  onClick={handleTeachWork}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                  <span>📚</span>
                  <span>{t('photoInsight.teachGuruWork')}</span>
                </button>
              )}
            </div>
          )}

          {!ctaDone && result.scenario === 'B' && (
            <button
              onClick={handleAddToClassroom}
              disabled={ctaLoading}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
            >
              {ctaLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <span>➕</span>
              )}
              <span>{t('photoInsight.addToClassroom')}</span>
            </button>
          )}

          {!ctaDone && result.scenario === 'C' && (
            <button
              onClick={handleAddToShelf}
              disabled={ctaLoading}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
            >
              {ctaLoading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <span>📋</span>
              )}
              <span>{t('photoInsight.addToShelf')}</span>
            </button>
          )}

          {/* Scenario D low-confidence: subtle "Did you mean?" with alternatives */}
          {!ctaDone && result.scenario === 'D' && result.match_score != null && result.match_score < 0.75 &&
            result.candidates && result.candidates.length > 1 && (
            <div>
              <p className="text-xs text-gray-400">{t('photoInsight.didYouMean')}</p>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {result.candidates.slice(1).map((c) => (
                  <span
                    key={`${c.name}-${c.area}`}
                    className="text-xs text-gray-500 px-1.5 py-0.5 rounded bg-gray-50 border border-gray-100"
                  >
                    {c.name} ({Math.round(c.score * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {ctaError && (
            <p className="text-xs text-red-600 italic">
              ⚠ {ctaError}
            </p>
          )}

          {ctaDone && (
            <p className="text-xs text-emerald-600 italic">
              ✓ {t('photoInsight.actionComplete')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
