// components/montree/guru/WeeklyReview.tsx
// Weekly review banner for the home parent dashboard
// Shows as a collapsible card with the Guru's weekly summary
'use client';

import { useState, useEffect } from 'react';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface WeeklyReviewProps {
  childId: string;
  childName: string;
}

export default function WeeklyReview({ childId, childName }: WeeklyReviewProps) {
  const [review, setReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hasReview, setHasReview] = useState(false);

  // Auto-fetch on mount
  useEffect(() => {
    if (!childId) return;

    const abortController = new AbortController();

    setLoading(true);
    fetch(`/api/montree/guru/weekly-review?child_id=${childId}`, { signal: abortController.signal })
      .then(r => { if (!r.ok) throw new Error(`Weekly review: ${r.status}`); return r.json(); })
      .then(data => {
        if (data.success && data.review) {
          setReview(data.review);
          setHasReview(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setLoading(false);
      });

    return () => abortController.abort();
  }, [childId]);

  if (!hasReview && !loading) return null;

  return (
    <div className={`${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl overflow-hidden transition-all`}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#F5E6D3]/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div className="text-left">
            <span className={`text-sm font-semibold ${HOME_THEME.headingText}`}>
              {childName}&apos;s Week in Review
            </span>
            {loading && (
              <span className={`text-xs ${HOME_THEME.subtleText} block`}>Loading...</span>
            )}
          </div>
        </div>
        <span className={`text-sm ${HOME_THEME.subtleText} transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Content — collapsible */}
      {expanded && review && (
        <div className={`px-4 pb-4 border-t ${HOME_THEME.border}`}>
          <div className="pt-3">
            {review.split('\n\n').map((paragraph, i) => (
              <p key={i} className={`text-sm ${HOME_THEME.headingText}/80 leading-relaxed ${i > 0 ? 'mt-3' : ''}`}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
