'use client';

// Planner — the innocuous FRONT of the personal platform. A calm month
// calendar + a hand-off to the Coach for the day/week plan. It deliberately
// shows NO diary content (the diary is secret, behind the logo's phrase), so
// anyone past the login sees only a planner.
//
// Two secret doors live on this front:
//   • the header LOGO (in the shell) → Diary   (phrase A)
//   • the MONTH TITLE below           → Messages (phrase B, long-press 2s)

import { useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import SecretGate from '@/components/story/personal/SecretGate';
import { T, cardStyle } from '@/lib/story/personal-theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function PlannerPage() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() });
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const go = (delta: number) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  return (
    <div>
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, margin: '0 0 18px', letterSpacing: '-0.4px' }}>Planner</h1>

      <div style={{ ...cardStyle, padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => go(-1)} style={navBtn} aria-label="Previous month">‹</button>
          {/* Month title — the secret door to Messages (long-press 2s → phrase B). */}
          <SecretGate
            unlockUrl="/api/story/messages/unlock"
            tokenKey="story_hidden_view"
            destination="/story/admin/dashboard"
          >
            <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: T.text }}>
              {MONTHS[view.m]} {view.y}
            </span>
          </SecretGate>
          <button onClick={() => go(1)} style={navBtn} aria-label="Next month">›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DOW.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, color: T.textDim, padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const isToday = `${view.y}-${view.m}-${d}` === todayKey;
            return (
              <div
                key={i}
                style={{
                  aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10, fontSize: 13.5,
                  border: isToday ? `1px solid ${T.border}` : '1px solid transparent',
                  background: isToday ? 'rgba(52,211,153,0.10)' : 'transparent',
                  color: isToday ? T.text : T.textMid, fontWeight: isToday ? 700 : 500,
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 6 }}>Today&apos;s focus</div>
        <div style={{ color: T.textMid, fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
          Let the coach surface the one thing that matters — and put rest in the plan.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/story/admin/coach?ask=' + encodeURIComponent('Plan my day — the one thing that matters, a short list, and rest built in.'))}
            style={primaryBtn}
          >
            Plan my day
          </button>
          <button
            onClick={() => router.push('/story/admin/coach?ask=' + encodeURIComponent('Plan my week — the few things that matter, with reasons, and rest protected.'))}
            style={ghostBtn}
          >
            Plan my week
          </button>
        </div>
      </div>
    </div>
  );
}

const navBtn: CSSProperties = {
  appearance: 'none', border: `1px solid ${T.borderSoft}`, background: 'transparent',
  color: T.textMid, fontSize: 18, width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
};
const primaryBtn: CSSProperties = {
  appearance: 'none', border: `1px solid ${T.border}`,
  background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(29,107,72,0.22))',
  color: T.text, fontFamily: T.sans, fontSize: 14, fontWeight: 600, padding: '9px 16px', borderRadius: 11, cursor: 'pointer',
};
const ghostBtn: CSSProperties = {
  appearance: 'none', border: `1px solid ${T.borderSoft}`, background: 'transparent',
  color: T.textMid, fontFamily: T.sans, fontSize: 14, fontWeight: 500, padding: '9px 16px', borderRadius: 11, cursor: 'pointer',
};
