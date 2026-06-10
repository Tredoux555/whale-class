'use client';

// components/montree/GroupLessonCard.tsx
//
// ✨ Group Lesson Suggester (Jun 10, 2026) — the first cross-child
// intelligence surface on the teacher dashboard.
//
//   "Amy, Leo and Kayla are all ready for the Teen Board —
//    group presentation Tuesday?"
//
// Reads /api/montree/dashboard/group-lessons (deterministic, no AI cost).
// HIDE-WHEN-EMPTY: renders null when there are no suggestions — never
// clutters the dashboard with empty chrome (PendingAppointmentsBanner rule).
// Dismissible per-day via localStorage so it doesn't nag.
//
// i18n: v1 ships English-only (standard v1 deferral — flagged for the next
// Haiku batch sweep; ~8 keys).

import { useEffect, useState } from 'react';
import { Users, X, Sparkles } from 'lucide-react';

const T = {
  cardBg: 'rgba(8,20,12,0.55)',
  border: '1px solid rgba(52,211,153,0.28)',
  emerald: '#34d399',
  gold: '#E8C96A',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// Canonical area dot colors (FocusWorksSection palette)
const AREA_DOT: Record<string, string> = {
  practical_life: '#f472b6',
  sensorial: '#2dd4bf',
  mathematics: '#a78bfa',
  language: '#4ade80',
  cultural: '#fb923c',
};

interface Suggestion {
  type: 'present' | 'practice';
  work_id: string;
  work_name: string;
  area_key: string;
  area_name: string;
  children: Array<{ id: string; name: string }>;
}

function dismissKey(): string {
  // Per-day dismiss — reappears tomorrow with fresh data.
  return `montree.groupLessons.dismissed.${new Date().toISOString().slice(0, 10)}`;
}

function joinNames(children: Suggestion['children']): string {
  const names = children.map(c => c.name);
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default function GroupLessonCard() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState(true); // assume dismissed until checked

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey()) === '1');
    } catch {
      setDismissed(false);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/dashboard/group-lessons', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return; // 401/403/404/500 → render nothing
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      } catch {
        // network error → render nothing
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (dismissed || suggestions.length === 0) return null;

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
        <Users size={16} color={T.emerald} strokeWidth={1.75} />
        <span
          style={{
            fontFamily: T.serif,
            fontSize: 15,
            color: T.textPrimary,
            letterSpacing: '-0.2px',
            flex: 1,
          }}
        >
          Group lesson opportunities
        </span>
        <Sparkles size={13} color={T.gold} strokeWidth={1.75} />
        <button
          onClick={handleDismiss}
          aria-label="Dismiss group lesson suggestions for today"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            color: T.textMuted,
          }}
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map(s => (
          <div
            key={`${s.type}-${s.work_id}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                marginTop: 5,
                flexShrink: 0,
                background: AREA_DOT[s.area_key] || T.emerald,
                boxShadow: `0 0 6px ${AREA_DOT[s.area_key] || T.emerald}55`,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: T.textPrimary, lineHeight: 1.45 }}>
                <strong style={{ fontWeight: 600 }}>{joinNames(s.children)}</strong>
                {s.type === 'present'
                  ? ' are all ready for '
                  : ' are all working on '}
                <strong style={{ fontWeight: 600, color: T.gold }}>{s.work_name}</strong>
                {s.type === 'present'
                  ? ' — group presentation?'
                  : ' — joint practice circle?'}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                {s.area_name}
                {' · '}
                {s.children.length} children
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
