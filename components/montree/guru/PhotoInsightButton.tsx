'use client';

// components/montree/guru/PhotoInsightButton.tsx
// Smart Capture button — true fire-and-forget photo analysis
// Uses global photo-insight-store so processing survives navigation between children
// Shows toast results + scenario-based CTAs for work ingestion
// Scenarios: A (unknown work), B (not in classroom), C (not on shelf), D (happy path)
// Dark forest visual treatment — all wiring intact

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from 'react';
import { Sparkles, RotateCw, AlertTriangle, Check, X, Plus, BookOpen, Eye, Loader2, AlertCircle } from 'lucide-react';
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
  dismissProposal,
  isProposalDismissed,
  type PhotoInsightResult,
  type CustomWorkProposal,
} from '@/lib/montree/photo-insight-store';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';

const T = {
  bg: '#0a1a0f',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.10)',
  amberStrong: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  violetSoft: 'rgba(139,92,246,0.10)',
  violetBorder: 'rgba(139,92,246,0.35)',
  violet: '#c4b5fd',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.35)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  blur: 'blur(18px) saturate(140%)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface PhotoInsightButtonProps {
  childId: string;
  mediaId: string;
  classroomId?: string;
  onProgressUpdate?: () => void;
  onTeachWork?: (data: { workName: string; area: string | null; mediaId: string }) => void;
  onAddToClassroom?: (data: { workName: string; area: string; classroomWorkId?: string | null }) => void;
  onAddToShelf?: (data: { workName: string; area: string; classroomWorkId: string | null }) => void;
}

const STATUS_LABELS: Record<string, { labels: Record<string, string>; emoji: string }> = {
  mastered: { labels: { en: 'Mastered', zh: '已掌握', es: 'Dominado' }, emoji: '⭐' },
  practicing: { labels: { en: 'Practicing', zh: '练习中', es: 'Practicando' }, emoji: '🔄' },
  presented: { labels: { en: 'Presented', zh: '已展示', es: 'Presentado' }, emoji: '📋' },
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
      progressUpdateFiredRef.current = null;
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

  // State for proposal dismiss (triggers re-render so amber card hides)
  const [proposalDismissed, setProposalDismissed] = useState(() => isProposalDismissed(mediaId, childId));

  // CTA: Add custom work from proposal (Scenario A amber card)
  const handleAddCustomWork = useCallback(async () => {
    const freshResult = getEntry(mediaId, childId)?.result;
    const proposal = freshResult?.custom_work_proposal;
    if (!proposal || ctaLoading) return;
    setCtaLoading(true);
    try {
      const res = await montreeApi(`/api/montree/guru/photo-insight/add-custom-work`, {
        method: 'POST',
        body: JSON.stringify({
          media_id: mediaId,
          child_id: childId,
          name: proposal.name,
          area: proposal.area,
          description: proposal.description,
          materials: proposal.materials,
          why_it_matters: proposal.why_it_matters,
        }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        setCtaDone(true);
        // Trigger shelf refresh
        if (onProgressUpdate && progressUpdateFiredRef.current !== storeKey) {
          try {
            onProgressUpdate();
            progressUpdateFiredRef.current = storeKey;
          } catch (cbErr) { console.error('[PhotoInsight] onProgressUpdate threw:', cbErr); }
        }
      } else if (res.status === 409) {
        // Photo already tagged
        setCtaError(t('photoInsight.photoAlreadyTagged'));
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => { if (mountedRef.current) setCtaError(null); }, 4000);
      } else {
        console.error('[PhotoInsight] Add custom work failed:', res.status);
        setCtaError(t('photoInsight.customWorkFailed'));
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => { if (mountedRef.current) setCtaError(null); }, 4000);
      }
    } catch (err) {
      console.error('[PhotoInsight] Add custom work error:', err);
      if (mountedRef.current) {
        setCtaError(t('photoInsight.customWorkFailed'));
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => { if (mountedRef.current) setCtaError(null); }, 4000);
      }
    } finally {
      if (mountedRef.current) setCtaLoading(false);
    }
  }, [mediaId, childId, ctaLoading, onProgressUpdate, storeKey, t]);

  // CTA: Dismiss proposal — hides amber card, shows fallback (candidates + teach button)
  const handleDismissProposal = useCallback(() => {
    dismissProposal(mediaId, childId);
    setProposalDismissed(true);
  }, [mediaId, childId]);

  const statusInfo = result?.mastery_evidence
    ? STATUS_LABELS[result.mastery_evidence]
    : null;

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {!result && (
        <>
          {error ? (
            errorType === 'auth_error' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: T.red,
                  fontFamily: T.sans,
                }}
              >
                <AlertCircle size={14} strokeWidth={1.75} />
                <span>{t('photoInsight.sessionExpired')}</span>
              </div>
            ) : (
              <button
                onClick={handleRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: T.amber,
                  fontFamily: T.sans,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'color 120ms ease',
                }}
                title={t('common.tryAgain')}
                onMouseEnter={e => (e.currentTarget.style.color = '#fcd34d')}
                onMouseLeave={e => (e.currentTarget.style.color = T.amber)}
              >
                <RotateCw size={14} strokeWidth={1.75} />
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
            )
          ) : (
            <button
              onClick={handleClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: T.emerald,
                fontFamily: T.sans,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'color 120ms ease',
              }}
              title={t('guru.whatDoesGuruSee')}
              onMouseEnter={e => (e.currentTarget.style.color = '#6ee7b7')}
              onMouseLeave={e => (e.currentTarget.style.color = T.emerald)}
            >
              {analyzing ? (
                <>
                  <Loader2 size={14} strokeWidth={1.75} style={{ animation: 'spin 1.5s linear infinite' }} />
                  <span>{retrying ? t('photoInsight.retrying') : t('photoInsight.analyzing')}</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} strokeWidth={1.75} />
                  <span>{t('guru.whatDoesGuruSee')}</span>
                </>
              )}
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </button>
          )}
        </>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Work tag + area badge + status */}
          {result.work_name && (
            <div
              style={{
                padding: '10px 12px',
                background: T.card,
                border: T.cardBorder,
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontFamily: T.sans,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {result.area && <AreaBadge area={result.area} size="xs" />}
                {result.area && (
                  <span style={{ fontSize: 11, color: T.textMuted }}>
                    {t(`area.${result.area}`)}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: T.textPrimary,
                    fontFamily: T.sans,
                  }}
                >
                  {locale !== 'en' ? (getChineseNameForWork(result.work_name) || result.work_name) : result.work_name}
                </span>
                {statusInfo && (
                  <div
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontWeight: 500,
                      background:
                        result.mastery_evidence === 'mastered'
                          ? 'rgba(255,255,255,0.10)'
                          : result.mastery_evidence === 'practicing'
                          ? T.amberStrong
                          : T.emeraldStrong,
                      color:
                        result.mastery_evidence === 'mastered'
                          ? 'rgba(255,255,255,0.85)'
                          : result.mastery_evidence === 'practicing'
                          ? T.amber
                          : T.emerald,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{statusInfo.emoji}</span>
                    <span>{statusInfo.labels[locale || 'en'] || statusInfo.labels.en}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Brief observation */}
          <p
            style={{
              fontSize: 12,
              color: T.textSecondary,
              lineHeight: 1.5,
              margin: 0,
              fontFamily: T.sans,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <Sparkles size={13} strokeWidth={1.75} style={{ marginTop: 2, flexShrink: 0, color: T.emerald }} />
            <span>{result.insight}</span>
          </p>

          {/* GREEN zone: Auto-updated with high confidence */}
          {result.auto_updated && (
            <p
              style={{
                fontSize: 11,
                color: T.emerald,
                fontStyle: 'italic',
                margin: 0,
                fontFamily: T.sans,
              }}
            >
              ✓ {t('photoInsight.highConfidenceAutoUpdated')}
            </p>
          )}

          {/* AMBER zone: Needs teacher confirmation */}
          {!ctaDone && result.needs_confirmation && entry?.status !== 'confirmed' && entry?.status !== 'rejected' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p
                style={{
                  fontSize: 11,
                  color: T.amber,
                  fontStyle: 'italic',
                  margin: 0,
                  fontFamily: T.sans,
                }}
              >
                {t('photoInsight.pendingConfirmation')}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={handleConfirm}
                  disabled={ctaLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: T.emeraldStrong,
                    color: T.emerald,
                    border: `1px solid ${T.emerald}`,
                    fontFamily: T.sans,
                    fontWeight: 500,
                    cursor: ctaLoading ? 'not-allowed' : 'pointer',
                    opacity: ctaLoading ? 0.6 : 1,
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={e => !ctaLoading && (e.currentTarget.style.background = 'rgba(52,211,153,0.25)')}
                  onMouseLeave={e => !ctaLoading && (e.currentTarget.style.background = T.emeraldStrong)}
                >
                  {ctaLoading ? (
                    <Loader2 size={11} strokeWidth={1.75} style={{ animation: 'spin 1.5s linear infinite' }} />
                  ) : (
                    <Check size={11} strokeWidth={2} />
                  )}
                  <span>{t('photoInsight.confirmMatch')}</span>
                </button>
                <button
                  onClick={handleReject}
                  disabled={ctaLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: T.redSoft,
                    color: T.red,
                    border: `1px solid ${T.redBorder}`,
                    fontFamily: T.sans,
                    fontWeight: 500,
                    cursor: ctaLoading ? 'not-allowed' : 'pointer',
                    opacity: ctaLoading ? 0.6 : 1,
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={e => !ctaLoading && (e.currentTarget.style.background = 'rgba(239,68,68,0.20)')}
                  onMouseLeave={e => !ctaLoading && (e.currentTarget.style.background = T.redSoft)}
                >
                  <X size={11} strokeWidth={2} />
                  <span>{t('photoInsight.wrongMatch')}</span>
                </button>
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Teacher confirmed */}
          {entry?.status === 'confirmed' && (
            <p
              style={{
                fontSize: 11,
                color: T.emerald,
                fontStyle: 'italic',
                margin: 0,
                fontFamily: T.sans,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Check size={12} strokeWidth={2} />
              {t('photoInsight.confirmed')}
            </p>
          )}

          {/* Scenario A: Amber proposal card OR fallback (candidates + teach button) */}
          {!ctaDone && result.scenario === 'A' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Show amber proposal card when proposal exists and not dismissed */}
              {result.custom_work_proposal && !proposalDismissed ? (
                <div
                  style={{
                    borderRadius: 12,
                    border: `1px solid ${T.amberBorder}`,
                    background: T.amberSoft,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    fontFamily: T.sans,
                    backdropFilter: T.blur,
                    WebkitBackdropFilter: T.blur,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.amber,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    {t('photoInsight.suggestedWork')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.textPrimary,
                      }}
                    >
                      {result.custom_work_proposal.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: T.textSecondary,
                        lineHeight: 1.5,
                      }}
                    >
                      {result.custom_work_proposal.description}
                    </p>
                    {result.custom_work_proposal.materials.length > 0 && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: T.textMuted,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 6,
                        }}
                      >
                        <span style={{ marginTop: 2 }}>📦</span>
                        <span>{result.custom_work_proposal.materials.join(', ')}</span>
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      onClick={handleAddCustomWork}
                      disabled={ctaLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: T.emeraldDeep,
                        color: '#fff',
                        border: 'none',
                        fontFamily: T.sans,
                        fontWeight: 600,
                        cursor: ctaLoading ? 'not-allowed' : 'pointer',
                        opacity: ctaLoading ? 0.6 : 1,
                        transition: 'all 120ms ease',
                      }}
                      onMouseEnter={e => !ctaLoading && (e.currentTarget.style.background = 'rgba(16,185,129,0.90)')}
                      onMouseLeave={e => !ctaLoading && (e.currentTarget.style.background = T.emeraldDeep)}
                    >
                      {ctaLoading ? (
                        <Loader2 size={11} strokeWidth={1.75} style={{ animation: 'spin 1.5s linear infinite' }} />
                      ) : (
                        <Check size={11} strokeWidth={2} />
                      )}
                      <span>{t('photoInsight.addAsNewWork')}</span>
                    </button>
                    <button
                      onClick={handleDismissProposal}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        padding: '6px 12px',
                        borderRadius: 8,
                        background: 'rgba(255,255,255,0.06)',
                        color: T.textMuted,
                        border: '1px solid rgba(255,255,255,0.10)',
                        fontFamily: T.sans,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                        e.currentTarget.style.color = T.textSecondary;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.color = T.textMuted;
                      }}
                    >
                      <span>{t('photoInsight.notThisOne')}</span>
                    </button>
                  </div>
                  {onTeachWork && (
                    <button
                      onClick={() => {
                        if (onTeachWork && result.custom_work_proposal) {
                          onTeachWork({
                            workName: result.custom_work_proposal.name,
                            area: result.custom_work_proposal.area,
                            mediaId,
                          });
                        }
                      }}
                      style={{
                        fontSize: 11,
                        color: T.amber,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: T.sans,
                        textDecoration: 'underline',
                        transition: 'color 120ms ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#fcd34d')}
                      onMouseLeave={e => (e.currentTarget.style.color = T.amber)}
                    >
                      {t('photoInsight.editBeforeAdding')}
                    </button>
                  )}
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                /* Fallback: original Scenario A UI — candidates + teach button */
                <>
                  {result.candidates && result.candidates.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: T.textMuted,
                        }}
                      >
                        {t('photoInsight.didYouMean')}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {result.candidates.map((c) => (
                          <button
                            key={`${c.name}-${c.area}`}
                            onClick={async () => {
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
                              if (!mountedRef.current) return;
                              if (onTeachWork) {
                                onTeachWork({ workName: c.name, area: c.area, mediaId });
                              }
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 11,
                              padding: '6px 10px',
                              borderRadius: 20,
                              background: 'rgba(255,255,255,0.06)',
                              color: T.textSecondary,
                              border: '1px solid rgba(255,255,255,0.10)',
                              fontFamily: T.sans,
                              cursor: 'pointer',
                              transition: 'all 120ms ease',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
                              e.currentTarget.style.color = T.textPrimary;
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                              e.currentTarget.style.color = T.textSecondary;
                            }}
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
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        padding: '6px 10px',
                        borderRadius: 8,
                        background: T.amberSoft,
                        color: T.amber,
                        border: `1px solid ${T.amberBorder}`,
                        fontFamily: T.sans,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.amberStrong)}
                      onMouseLeave={e => (e.currentTarget.style.background = T.amberSoft)}
                    >
                      <BookOpen size={11} strokeWidth={1.75} />
                      <span>{t('photoInsight.teachGuruWork')}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {!ctaDone && result.scenario === 'B' && (
            <button
              onClick={handleAddToClassroom}
              disabled={ctaLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(59,130,246,0.18)',
                color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.35)',
                fontFamily: T.sans,
                fontWeight: 500,
                cursor: ctaLoading ? 'not-allowed' : 'pointer',
                opacity: ctaLoading ? 0.6 : 1,
                transition: 'all 120ms ease',
              }}
              onMouseEnter={e => !ctaLoading && (e.currentTarget.style.background = 'rgba(59,130,246,0.25)')}
              onMouseLeave={e => !ctaLoading && (e.currentTarget.style.background = 'rgba(59,130,246,0.18)')}
            >
              {ctaLoading ? (
                <Loader2 size={11} strokeWidth={1.75} style={{ animation: 'spin 1.5s linear infinite' }} />
              ) : (
                <Plus size={11} strokeWidth={2} />
              )}
              <span>{t('photoInsight.addToClassroom')}</span>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </button>
          )}

          {!ctaDone && result.scenario === 'C' && (
            <button
              onClick={handleAddToShelf}
              disabled={ctaLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                padding: '6px 12px',
                borderRadius: 8,
                background: T.emeraldStrong,
                color: T.emerald,
                border: `1px solid ${T.emerald}`,
                fontFamily: T.sans,
                fontWeight: 500,
                cursor: ctaLoading ? 'not-allowed' : 'pointer',
                opacity: ctaLoading ? 0.6 : 1,
                transition: 'all 120ms ease',
              }}
              onMouseEnter={e => !ctaLoading && (e.currentTarget.style.background = 'rgba(52,211,153,0.25)')}
              onMouseLeave={e => !ctaLoading && (e.currentTarget.style.background = T.emeraldStrong)}
            >
              {ctaLoading ? (
                <Loader2 size={11} strokeWidth={1.75} style={{ animation: 'spin 1.5s linear infinite' }} />
              ) : (
                <Eye size={11} strokeWidth={1.75} />
              )}
              <span>{t('photoInsight.addToShelf')}</span>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </button>
          )}

          {/* Scenario D low-confidence: subtle "Did you mean?" with alternatives */}
          {!ctaDone && result.scenario === 'D' && result.match_score != null && result.match_score < 0.75 &&
            result.candidates && result.candidates.length > 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: T.textMuted,
                }}
              >
                {t('photoInsight.didYouMean')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {result.candidates.slice(1).map((c) => (
                  <span
                    key={`${c.name}-${c.area}`}
                    style={{
                      fontSize: 10,
                      color: T.textMuted,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {c.name} ({Math.round(c.score * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {ctaError && (
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: T.red,
                fontStyle: 'italic',
                fontFamily: T.sans,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 5,
              }}
            >
              <AlertTriangle size={11} strokeWidth={1.75} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{ctaError}</span>
            </p>
          )}

          {ctaDone && (
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: T.emerald,
                fontStyle: 'italic',
                fontFamily: T.sans,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Check size={12} strokeWidth={2} />
              {t('photoInsight.actionComplete')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
