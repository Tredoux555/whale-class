'use client';

// Diary front — the default landing page of the personal platform.
// Entry list, newest first. "Write" opens a fresh entry.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { pget } from '@/lib/story/personal-client';
import { T, cardStyle } from '@/lib/story/personal-theme';

interface DiaryListItem {
  id: string;
  entry_date: string;
  mood: string | null;
  title: string | null;
  excerpt: string;
  updated_at: string;
}

const MOOD_COLOR: Record<string, string> = {
  good: '#34d399',
  great: '#34d399',
  calm: '#60a5fa',
  tired: '#a78bfa',
  low: '#f59e0b',
  stressed: '#fb923c',
  anxious: '#fb923c',
  hard: '#f87171',
};
function moodColor(mood: string | null): string {
  if (!mood) return 'rgba(255,255,255,0.25)';
  return MOOD_COLOR[mood.toLowerCase()] || T.gold;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function DiaryHome() {
  const router = useRouter();
  const [entries, setEntries] = useState<DiaryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pget<{ entries: DiaryListItem[] }>('/api/story/diary')
      .then((d) => setEntries(d.entries || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load'));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.4px' }}>
          Diary
        </h1>
        <button
          onClick={() => router.push('/story/admin/diary/new')}
          style={{
            appearance: 'none',
            border: `1px solid ${T.border}`,
            background: `linear-gradient(135deg, rgba(52,211,153,0.22), rgba(29,107,72,0.22))`,
            color: T.text,
            fontFamily: T.sans,
            fontSize: 14,
            fontWeight: 600,
            padding: '9px 16px',
            borderRadius: 11,
            cursor: 'pointer',
          }}
        >
          ✍️ Write
        </button>
      </div>

      {error && (
        <div style={{ color: '#f87171', fontSize: 14, marginBottom: 16 }}>{error}</div>
      )}

      {entries === null && !error && (
        <div style={{ color: T.textDim, fontSize: 14 }}>Loading…</div>
      )}

      {entries !== null && entries.length === 0 && (
        <div
          style={{
            ...cardStyle,
            padding: 28,
            textAlign: 'center',
            color: T.textMid,
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
          A quiet place to put the day down.
          <br />
          Start with whatever&apos;s on your mind.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(entries || []).map((e) => (
          <button
            key={e.id}
            onClick={() => router.push(`/story/admin/diary/${e.id}`)}
            style={{
              ...cardStyle,
              textAlign: 'left',
              padding: '16px 18px',
              cursor: 'pointer',
              color: T.text,
              fontFamily: T.sans,
              display: 'block',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: moodColor(e.mood),
                  flexShrink: 0,
                  boxShadow: e.mood ? `0 0 8px ${moodColor(e.mood)}66` : 'none',
                }}
              />
              <span style={{ fontSize: 12.5, color: T.textDim, fontWeight: 500 }}>{formatDate(e.entry_date)}</span>
              {e.mood && (
                <span style={{ fontSize: 11.5, color: T.textDim, textTransform: 'capitalize' }}>· {e.mood}</span>
              )}
            </div>
            {e.title && (
              <div style={{ fontFamily: T.serif, fontSize: 16.5, fontWeight: 600, marginBottom: 4 }}>{e.title}</div>
            )}
            <div style={{ fontSize: 14, color: T.textMid, lineHeight: 1.6 }}>{e.excerpt || '—'}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
