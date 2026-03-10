'use client';

// components/montree/guru/PhotoInsightButton.tsx
// Smart Capture button — fire-and-forget photo analysis
// Shows toast results + scenario-based CTAs for work ingestion
// Scenarios: A (unknown work), B (not in classroom), C (not on shelf), D (happy path)

import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import AreaBadge from '@/components/montree/shared/AreaBadge';
import { montreeApi } from '@/lib/montree/api';

interface CandidateWork {
  name: string;
  area: string;
  score: number;
}

interface PhotoInsightResult {
  insight: string;
  work_name: string | null;
  area: string | null;
  mastery_evidence: string | null;
  auto_updated: boolean;
  confidence?: number;
  match_score?: number;
  candidates?: CandidateWork[];
  scenario?: 'A' | 'B' | 'C' | 'D';
  in_classroom?: boolean;
  in_child_shelf?: boolean;
  classroom_work_id?: string | null;
}

interface PendingAnalysis {
  id: string;
  mediaId: string;
  startTime: number;
}

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
  const [result, setResult] = useState<PhotoInsightResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(false);
  const [ctaLoading, setCtaLoading] = useState(false);
  const [ctaDone, setCtaDone] = useState(false);

  const pendingRef = useRef<Map<string, PendingAnalysis>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Reset state when mediaId changes (prevents showing stale results for wrong photo)
  useEffect(() => {
    setResult(null);
    setError(false);
    setAnalyzing(false);
    setCtaLoading(false);
    setCtaDone(false);
    pendingRef.current.clear();
    abortRef.current?.abort();
  }, [mediaId]);

  const handleClick = useCallback(() => {
    if (result) return;

    const analysisId = `${mediaId}-${Date.now()}`;
    const existing = Array.from(pendingRef.current.values());
    if (existing.length > 0) return;

    const pending: PendingAnalysis = { id: analysisId, mediaId, startTime: Date.now() };
    pendingRef.current.set(analysisId, pending);
    setAnalyzing(true);
    setError(false);

    const abortController = new AbortController();
    abortRef.current = abortController;

    // Client-side timeout: 60s to prevent stuck "analyzing..." spinner
    const timeoutId = setTimeout(() => abortController.abort(), 60000);

    montreeApi('/api/montree/guru/photo-insight', {
      method: 'POST',
      body: JSON.stringify({ child_id: childId, media_id: mediaId, locale }),
      signal: abortController.signal,
    })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (!mountedRef.current) return;
        if (!pendingRef.current.has(analysisId)) return;

        const data = await res.json();
        if (!mountedRef.current) { pendingRef.current.delete(analysisId); return; }

        if (!data.success) {
          setError(true);
          pendingRef.current.delete(analysisId);
          setAnalyzing(false);
          return;
        }

        setResult({
          insight: data.insight,
          work_name: data.work_name || null,
          area: data.area || null,
          mastery_evidence: data.mastery_evidence || null,
          auto_updated: data.auto_updated || false,
          confidence: data.confidence,
          match_score: data.match_score ?? null,
          candidates: Array.isArray(data.candidates) ? data.candidates : [],
          scenario: data.scenario || 'D',
          in_classroom: data.in_classroom || false,
          in_child_shelf: data.in_child_shelf || false,
          classroom_work_id: data.classroom_work_id || null,
        });

        if (data.auto_updated && onProgressUpdate) {
          onProgressUpdate();
        }

        pendingRef.current.delete(analysisId);
        setAnalyzing(false);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (!mountedRef.current) return;
        if (err instanceof DOMException && err.name === 'AbortError') {
          pendingRef.current.delete(analysisId);
          setAnalyzing(false);
          return;
        }
        setError(true);
        pendingRef.current.delete(analysisId);
        setAnalyzing(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, mediaId, locale, onProgressUpdate]);

  // CTA: Add known standard work to classroom (Scenario B)
  const handleAddToClassroom = useCallback(async () => {
    if (!result?.work_name || !result?.area || !classroomId || ctaLoading) return;
    setCtaLoading(true);
    try {
      const res = await montreeApi(`/api/montree/curriculum`, {
        method: 'POST',
        body: JSON.stringify({
          classroom_id: classroomId,
          name: result.work_name,
          area_key: result.area,
          is_custom: false,
          source: 'smart_capture',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCtaDone(true);
        if (onAddToClassroom) {
          onAddToClassroom({
            workName: result.work_name!,
            area: result.area!,
            classroomWorkId: data.work?.id || null,
          });
        }
      }
    } catch {
      // Silently fail — teacher can add manually
    } finally {
      if (mountedRef.current) setCtaLoading(false);
    }
  }, [result, classroomId, ctaLoading, onAddToClassroom]);

  // CTA: Add to child's shelf (Scenario C)
  const handleAddToShelf = useCallback(async () => {
    if (!result?.work_name || !result?.area || !childId || ctaLoading) return;
    setCtaLoading(true);
    try {
      const res = await montreeApi(`/api/montree/focus-works`, {
        method: 'POST',
        body: JSON.stringify({
          child_id: childId,
          work_name: result.work_name,
          area: result.area,
          work_id: result.classroom_work_id || undefined,
        }),
      });
      if (res.ok) {
        setCtaDone(true);
        if (onAddToShelf) {
          onAddToShelf({
            workName: result.work_name!,
            area: result.area!,
            classroomWorkId: result.classroom_work_id || null,
          });
        }
        if (onProgressUpdate) onProgressUpdate();
      }
    } catch {
      // Silently fail
    } finally {
      if (mountedRef.current) setCtaLoading(false);
    }
  }, [result, childId, ctaLoading, onAddToShelf, onProgressUpdate]);

  // CTA: Teach Guru this unknown work (Scenario A) — opens modal
  const handleTeachWork = useCallback(() => {
    if (!result?.work_name) return;
    if (onTeachWork) {
      onTeachWork({
        workName: result.work_name,
        area: result.area,
        mediaId,
      });
    }
  }, [result, mediaId, onTeachWork]);

  const statusInfo = result?.mastery_evidence
    ? STATUS_LABELS[result.mastery_evidence]
    : null;

  return (
    <div className="mt-2 space-y-1">
      {!result && (
        <>
          {error ? (
            <button
              onClick={() => { setError(false); handleClick(); }}
              className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
              title={t('common.tryAgain')}
            >
              <span>🔄</span>
              <span>{t('common.tryAgain')}</span>
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
                  <span>{t('photoInsight.analyzing')}</span>
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

          {/* Auto-update indicator */}
          {result.auto_updated && (
            <p className="text-xs text-emerald-600 italic">
              {t('photoInsight.progressAutoUpdated')}
            </p>
          )}

          {/* Scenario A: Suggestion pills (top candidates) + Teach Guru fallback */}
          {!ctaDone && result.scenario === 'A' && (
            <div className="space-y-1.5">
              {/* Show candidate suggestions if any exist */}
              {result.candidates && result.candidates.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('photoInsight.didYouMean')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.candidates.map((c) => (
                      <button
                        key={`${c.name}-${c.area}`}
                        onClick={() => {
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
              {/* Always show "Teach Guru" as fallback */}
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
