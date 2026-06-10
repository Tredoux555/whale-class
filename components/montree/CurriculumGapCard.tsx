'use client';

// components/montree/CurriculumGapCard.tsx
//
// ✨ Curriculum Gap Radar (Jun 10, 2026) — second cross-child intelligence
// surface. Catches the blind spots every teacher has:
//
//   "Mathematics has gone quiet — 20 days since the last Maths work,
//    vs ~5 days everywhere else."
//   "No Cultural activity in 24 days."
//
// Reads /api/montree/dashboard/curriculum-gaps (deterministic, no AI cost).
// Hide-when-empty + per-day dismiss, matching GroupLessonCard exactly so the
// two intelligence cards feel like one system.
//
// i18n: v1 English-only (flagged for next Haiku sweep, ~6 keys).

import { useEffect, useState } from 'react';
import { Radar, X } from 'lucide-react';

const T = {
  cardBg: 'rgba(8,20,12,0.55)',
  border: '1px solid rgba(232,201,106,0.26)',
  gold: '#E8C96A',
  amber: '#fbbf24',
  red: '#fca5a5',
  textPrimary: 'rgba(255,255,255,0.95)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const AREA_DOT: Record<string, string> = {
  practical_life: '#f472b6',
  sensorial: '#2dd4bf',
  mathematics: '#a78bfa',
  language: '#4ade80',
  cultural: '#fb923c',
};

interface Gap {
  area_id: string;
  area_key: string;
  area_name: string;
  gap_type: 'stale' | 'quiet' | 'untouched';
  days_since?: number;
  median_days?: number;
  untouched_count?: number;
  total_works?: number;
}

function dismissKey(): string {
  return `montree.curriculumGaps.dismissed.${new Date().toISOString().slice(0, 10)}`;
}

function gapColor(type: Gap['gap_type']): string {
  return type === 'stale' ? T.red : type === 'quiet' ? T.amber : T.gold;
}

function gapLine(g: Gap): string {
  if (g.gap_type === 'stale') {
    return `No ${g.area_name} activity in ${g.days_since} days.`;
  }
  if (g.gap_type === 'quiet') {
    const elsewhere =
      g.median_days && g.median_days > 0
        ? `vs ~${g.median_days} days elsewhere`
        : 'while the rest of the room has been active this week';
    return `${g.area_name} has gone quiet — ${g.days_since} days since the last work, ${elsewhere}.`;
  }
  return `${g.untouched_count} of ${g.total_works} ${g.area_name} works haven't been presented to anyone yet.`;
}

export default function CurriculumGapCard() {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey()) === '1');
    } catch {
      setDismissed(false);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/dashboard/curriculum-gaps', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.gaps)) {
          setGaps(data.gaps);
        }
      } catch {
        // network error → render nothing
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (dismissed || gaps.length === 0) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(dismissKey(), '1'); } catch { /* ignore */ }
  };

  return (
    <div
      style={{
        background: T.cardBg,
        border: T.border,
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 14,
        fontFamily: T.sans,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Radar size={16} color={T.gold} strokeWidth={1.75} />
        <span
          style={{
            fontFamily: T.serif,
            fontSize: 15,
            color: T.textPrimary,
            letterSpacing: '-0.2px',
            flex: 1,
          }}
        >
          Curriculum gaps
        </span>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss curriculum gaps for today"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, display: 'flex', color: T.textMuted,
          }}
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gaps.map(g => (
          <div
            key={`${g.gap_type}-${g.area_id}`}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 10px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 10, height: 10, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                background: AREA_DOT[g.area_key] || gapColor(g.gap_type),
                boxShadow: `0 0 6px ${(AREA_DOT[g.area_key] || gapColor(g.gap_type))}55`,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: T.textPrimary, lineHeight: 1.45 }}>
                {gapLine(g)}
              </div>
              <div
                style={{
                  fontSize: 11, marginTop: 2, fontWeight: 600,
                  color: gapColor(g.gap_type),
                  textTransform: 'uppercase', letterSpacing: '0.4px',
                }}
              >
                {g.gap_type === 'stale' ? 'Needs attention' : g.gap_type === 'quiet' ? 'Quietest area' : 'Room to explore'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
