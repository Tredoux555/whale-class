'use client';

import { useState, useEffect } from 'react';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface EndOfDayNudgeProps {
  childId: string;
  childName: string;
}

export default function EndOfDayNudge({ childId, childName }: EndOfDayNudgeProps) {
  const [nudge, setNudge] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();

    fetch(`/api/montree/guru/end-of-day?child_id=${childId}`, { signal: abortController.signal })
      .then(r => { if (!r.ok) throw new Error(`End of day: ${r.status}`); return r.json(); })
      .then(data => {
        if (data.success && data.nudge) {
          setNudge(data.nudge);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setLoading(false);
      });

    return () => abortController.abort();
  }, [childId]);

  // Don't render if no nudge (no progress today or AI disabled)
  if (loading || !nudge) return null;

  if (collapsed) return null;

  return (
    <div className={`${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl p-4 relative`}>
      {/* Dismiss */}
      <button
        onClick={() => setCollapsed(true)}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="text-xl flex-shrink-0">🌅</span>
        <div>
          <h4 className={`text-sm font-semibold ${HOME_THEME.headingText} mb-1`}>
            {childName}&apos;s Day
          </h4>
          <p className={`text-sm leading-relaxed ${HOME_THEME.textPrimary}`}>
            {nudge}
          </p>
        </div>
      </div>
    </div>
  );
}
