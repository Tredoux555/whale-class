'use client';

import { useState, useEffect } from 'react';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface GuruSuggestionCardProps {
  childId: string;
  childName: string;
}

export default function GuruSuggestionCard({ childId, childName }: GuruSuggestionCardProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [type, setType] = useState<string>('stale');
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this week
    const dismissKey = `guru_suggestion_dismissed_${childId}`;
    const dismissedWeek = localStorage.getItem(dismissKey);
    const currentWeek = getISOWeek();
    if (dismissedWeek === currentWeek) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();

    fetch(`/api/montree/guru/suggestions?child_id=${childId}`, { signal: abortController.signal })
      .then(r => { if (!r.ok) throw new Error(`Suggestions: ${r.status}`); return r.json(); })
      .then(data => {
        if (data.success && data.suggestion) {
          setSuggestion(data.suggestion);
          setType(data.type || 'stale');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setLoading(false);
      });

    return () => abortController.abort();
  }, [childId]);

  const handleDismiss = () => {
    setDismissed(true);
    const dismissKey = `guru_suggestion_dismissed_${childId}`;
    localStorage.setItem(dismissKey, getISOWeek());
  };

  if (loading || !suggestion || dismissed) return null;

  const icon = type === 'inactive' ? '💤' : '🌱';
  const title = type === 'inactive'
    ? `Missing ${childName}!`
    : `A gentle nudge about ${childName}`;

  return (
    <div className={`${HOME_THEME.cardBg} border border-amber-200 rounded-2xl p-4 relative`}>
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 text-xs"
        aria-label="Dismiss"
      >
        ✕
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div>
          <h4 className={`text-sm font-semibold ${HOME_THEME.headingText} mb-1`}>
            {title}
          </h4>
          <p className={`text-sm leading-relaxed ${HOME_THEME.textPrimary}`}>
            {suggestion}
          </p>
        </div>
      </div>
    </div>
  );
}

function getISOWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const week = Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
