'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/montree/i18n';

interface PhotoInsightButtonProps {
  childId: string;
  mediaId: string;
}

export default function PhotoInsightButton({ childId, mediaId }: PhotoInsightButtonProps) {
  const { locale, t } = useI18n();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = async () => {
    if (insight || loading) return;
    setLoading(true);
    setError(false);

    try {
      const res = await fetch('/api/montree/guru/photo-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, media_id: mediaId, locale }),
      });

      const data = await res.json();
      if (data.success && data.insight) {
        setInsight(data.insight);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 space-y-1">
      {!insight && !error && (
        <button
          onClick={handleClick}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
          title="Ask the Guru about this photo"
        >
          {loading ? (
            <>
              <span className="animate-spin text-xs">⏳</span>
              <span>{t('guru.observing')}</span>
            </>
          ) : (
            <>
              <span>🌿</span>
              <span>{t('guru.whatDoesGuruSee')}</span>
            </>
          )}
        </button>
      )}

      {insight && (
        <p className="text-xs text-gray-700 leading-relaxed italic">
          <span className="font-medium text-emerald-700">🌿 Guru:</span> {insight}
        </p>
      )}

      {error && (
        <p className="text-xs text-gray-400">
          {t('guru.couldNotAnalyzePhoto')}
        </p>
      )}
    </div>
  );
}
