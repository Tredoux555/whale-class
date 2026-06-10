'use client';

// components/montree/parent/HomePracticeCard.tsx
//
// ✨ Home Practice Card (parent-facing) — a tiny weekly "try this at home"
// activity, matched to the work the child is currently focused on. Rendered
// on the weekly report. Self-fetching + hide-when-empty: if the school is on
// a free tier, the feature is off, or there's no current work to ground on,
// it renders nothing (the endpoint returns available:false).

import { useEffect, useState } from 'react';

const T = {
  cardBg: 'rgba(52,211,153,0.06)',
  border: '1px solid rgba(52,211,153,0.22)',
  emerald: '#34d399',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.78)',
  textMuted: 'rgba(255,255,255,0.45)',
  serif: 'var(--font-lora), Georgia, serif',
};

interface Props {
  childId?: string | null;
  /** Heading text (already localized by the parent page). */
  heading?: string;
}

export default function HomePracticeCard({ childId, heading = 'This week, try at home' }: Props) {
  const [activity, setActivity] = useState<string | null>(null);
  const [work, setWork] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = childId ? `?child_id=${encodeURIComponent(childId)}` : '';
        const res = await fetch(`/api/montree/parent/home-practice${qs}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.success && data.available && data.activity) {
          setActivity(data.activity);
          setWork(data.work || null);
        }
      } catch {
        // network error → render nothing
      }
    })();
    return () => { cancelled = true; };
  }, [childId]);

  if (!activity) return null;

  return (
    <div
      style={{
        margin: '1.5rem 1.25rem',
        padding: '1.25rem',
        background: T.cardBg,
        border: T.border,
        borderRadius: '0.9rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
        <span aria-hidden style={{ fontSize: '1.1rem' }}>🏡</span>
        <h2 style={{ fontFamily: T.serif, fontWeight: 600, color: T.textPrimary, fontSize: '1rem', margin: 0, letterSpacing: '-0.2px' }}>
          {heading}
        </h2>
      </div>
      <p style={{ color: T.textSecondary, fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
        {activity}
      </p>
      {work && (
        <p style={{ color: T.textMuted, fontSize: '0.72rem', marginTop: '0.6rem', marginBottom: 0 }}>
          Inspired by what they&apos;re exploring this week: {work}
        </p>
      )}
    </div>
  );
}
