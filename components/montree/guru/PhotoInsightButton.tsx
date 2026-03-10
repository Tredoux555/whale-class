'use client';

// components/montree/guru/PhotoInsightButton.tsx
// Smart Capture button — fire-and-forget photo analysis
// Teacher taps button → immediately returns to work (never blocks)
// Shows toast results as they come back asynchronously
// Multiple photos can be analyzed simultaneously

import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import AreaBadge from '@/components/montree/shared/AreaBadge';

interface PhotoInsightResult {
  insight: string;
  work_name: string | null;
  area: string | null;
  mastery_evidence: string | null;
  auto_updated: boolean;
  confidence?: number;
}

interface PendingAnalysis {
  id: string;
  mediaId: string;
  startTime: number;
}

interface PhotoInsightButtonProps {
  childId: string;
  mediaId: string;
  onProgressUpdate?: () => void; // Callback to refresh shelf/progress (debounced)
}

const STATUS_LABELS: Record<string, { en: string; zh: string; emoji: string }> = {
  mastered: { en: 'Mastered', zh: '已掌握', emoji: '⭐' },
  practicing: { en: 'Practicing', zh: '练习中', emoji: '🔄' },
  presented: { en: 'Presented', zh: '已展示', emoji: '📋' },
};

export default function PhotoInsightButton({ childId, mediaId, onProgressUpdate }: PhotoInsightButtonProps) {
  const { locale, t } = useI18n();
  const [result, setResult] = useState<PhotoInsightResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(false);

  // Track in-flight analyses per photo
  const pendingRef = useRef<Map<string, PendingAnalysis>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Fire-and-forget analysis — never await, never block
  const handleClick = useCallback(() => {
    if (result) return; // Already have result

    // Check analyzing state via ref to avoid stale closure
    const analysisId = `${mediaId}-${Date.now()}`;
    const existing = Array.from(pendingRef.current.values());
    if (existing.length > 0) return; // Already analyzing this photo

    const pending: PendingAnalysis = {
      id: analysisId,
      mediaId,
      startTime: Date.now(),
    };
    pendingRef.current.set(analysisId, pending);
    setAnalyzing(true);
    setError(false);

    // Create abort controller for this analysis
    const abortController = new AbortController();
    abortRef.current = abortController;

    // Fire the fetch IMMEDIATELY without awaiting — don't block UI
    fetch('/api/montree/guru/photo-insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId, media_id: mediaId, locale }),
      signal: abortController.signal,
    })
      .then(async (res) => {
        if (!mountedRef.current) return;

        // Check if this analysis was aborted
        if (!pendingRef.current.has(analysisId)) return;

        const data = await res.json();
        if (!mountedRef.current) {
          pendingRef.current.delete(analysisId);
          return;
        }

        if (!data.success) {
          setError(true);
          pendingRef.current.delete(analysisId);
          setAnalyzing(false);
          return;
        }

        // Show result
        setResult({
          insight: data.insight,
          work_name: data.work_name || null,
          area: data.area || null,
          mastery_evidence: data.mastery_evidence || null,
          auto_updated: data.auto_updated || false,
          confidence: data.confidence,
        });

        // If progress was auto-updated, trigger refresh (non-blocking, via setTimeout)
        if (data.auto_updated && onProgressUpdate) {
          setTimeout(() => {
            onProgressUpdate();
          }, 0);
        }

        // Clean up pending
        pendingRef.current.delete(analysisId);
        setAnalyzing(false);
      })
      .catch((err) => {
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
  }, [childId, mediaId, locale, result, onProgressUpdate]);

  const statusInfo = result?.mastery_evidence
    ? STATUS_LABELS[result.mastery_evidence]
    : null;

  return (
    <div className="mt-2 space-y-1">
      {!result && (
        <>
          {error ? (
            <button
              onClick={() => {
                setError(false);
                handleClick();
              }}
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
          {/* Work tag + area badge — clean formatting like gallery headers */}
          {result.work_name && (
            <div className="flex items-center gap-2">
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
        </div>
      )}
    </div>
  );
}
