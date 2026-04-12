// components/montree/capture/DailyLanguageSix.tsx
// Shows 6 recommended children for Language observation on the tag-child screen.
// Tapping a child pre-selects them in the tagging grid.
'use client';

import React, { useState, useEffect } from 'react';

interface Recommendation {
  id: string;
  name: string;
  photo_url: string | null;
  days_since_last_seen: number | null;
  status: 'never_observed' | 'stale' | 'recent';
}

interface Props {
  selectedChildIds: string[];
  onToggleChild: (childId: string) => void;
}

export default function DailyLanguageSix({ selectedChildIds, onToggleChild }: Props) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [seenToday, setSeenToday] = useState(0);
  const [totalChildren, setTotalChildren] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/montree/dashboard/daily-language-6', { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setRecs(data.recommendations || []);
          setSeenToday(data.seen_today || 0);
          setTotalChildren(data.total_children || 0);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.error('DailyLanguageSix fetch error:', err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  // Don't render if loading, errored, or no recommendations
  if (loading || recs.length === 0) return null;

  const allDone = recs.length === 0 && seenToday === totalChildren;

  if (allDone) {
    return (
      <div className="mx-3 mb-2 px-3 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-center">
        <span className="text-emerald-300 text-xs font-medium">
          ✓ All children seen in Language today
        </span>
      </div>
    );
  }

  const badge = (days: number | null) => {
    if (days === null) return { text: 'Never', color: 'bg-red-500/80' };
    if (days > 14) return { text: `${days}d`, color: 'bg-red-500/80' };
    if (days > 7) return { text: `${days}d`, color: 'bg-amber-500/80' };
    if (days > 0) return { text: `${days}d`, color: 'bg-blue-500/60' };
    return { text: 'Today', color: 'bg-emerald-500/60' };
  };

  return (
    <div className="mx-3 mb-2">
      {/* Header — tappable to collapse */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-3 py-1.5 bg-pink-500/15 border border-pink-400/25 rounded-t-xl"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📖</span>
          <span className="text-pink-300 text-xs font-semibold">Today&apos;s Language 6</span>
          {seenToday > 0 && (
            <span className="text-emerald-400 text-[10px] ml-1">
              ({seenToday}/{totalChildren} done)
            </span>
          )}
        </div>
        <span className={`text-white/40 text-xs transition-transform ${collapsed ? '' : 'rotate-180'}`}>
          ▲
        </span>
      </button>

      {/* Child pills */}
      {!collapsed && (
        <div className="flex gap-1.5 px-2 py-2 bg-white/5 border border-t-0 border-pink-400/15 rounded-b-xl overflow-x-auto">
          {recs.map(rec => {
            const isSelected = selectedChildIds.includes(rec.id);
            const b = badge(rec.days_since_last_seen);
            return (
              <button
                key={rec.id}
                onClick={() => onToggleChild(rec.id)}
                className={`
                  flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg shrink-0 transition-all
                  ${isSelected
                    ? 'bg-pink-500/30 ring-1.5 ring-pink-400'
                    : 'bg-white/8 active:bg-white/15'
                  }
                `}
              >
                {/* Avatar */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${isSelected ? 'bg-pink-500 text-white' : 'bg-white/20 text-white/80'}
                `}>
                  {rec.photo_url ? (
                    <img src={rec.photo_url} alt={rec.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    rec.name.charAt(0)
                  )}
                </div>
                {/* Name */}
                <span className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-pink-300' : 'text-white/60'}`}>
                  {rec.name}
                </span>
                {/* Days badge */}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium ${b.color}`}>
                  {b.text}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
