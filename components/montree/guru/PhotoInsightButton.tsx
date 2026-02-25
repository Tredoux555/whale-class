'use client';

import { useState } from 'react';

interface PhotoInsightButtonProps {
  childId: string;
  mediaId: string;
}

export default function PhotoInsightButton({ childId, mediaId }: PhotoInsightButtonProps) {
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
        body: JSON.stringify({ child_id: childId, media_id: mediaId }),
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
    <div className="mt-1">
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
              <span>Observing...</span>
            </>
          ) : (
            <>
              <span>🌿</span>
              <span>What does the Guru see?</span>
            </>
          )}
        </button>
      )}

      {insight && (
        <div className="mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
          <p className="text-xs text-emerald-800 leading-relaxed">
            <span className="font-medium">🌿 Guru: </span>
            {insight}
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-gray-400 mt-1">
          Couldn&apos;t analyze this photo right now.
        </p>
      )}
    </div>
  );
}
