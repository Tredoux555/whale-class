'use client';

// Planner — functional month calendar. Tap any day to see and add events with
// times (meetings, appointments, deadlines). The Coach also writes here via
// add_event. The month TITLE is the hidden door to Messages (long-press 2s).

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { pget, ppost, pdelete } from '@/lib/story/personal-client';
import SecretGate from '@/components/story/personal/SecretGate';
import { T, cardStyle } from '@/lib/story/personal-theme';

interface PlanEvent { id: string; event_date: string; start_time: string | null; title: string; notes: string | null }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function prettyDate(isoStr: string): string {
  try {
    return new Date(isoStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch { return isoStr; }
}

export default function PlannerPage() {
  const router = useRouter();
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() });
  const [events, setEvents] = useState<PlanEvent[]>([]);
  const [selected, setSelected] = useState<string>(iso(now.getFullYear(), now.getMonth(), now.getDate()));
  const [error, setError] = useState<string | null>(null);

  // add form
  const [time, setTime] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());

  const loadMonth = useCallback(async () => {
    const from = iso(view.y, view.m, 1);
    const to = iso(view.y, view.m, daysInMonth);
    try {
      const d = await pget<{ events: PlanEvent[] }>(`/api/story/events?from=${from}&to=${to}`);
      setEvents(d.events || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load events');
    }
  }, [view.y, view.m, daysInMonth]);

  useEffect(() => { void loadMonth(); }, [loadMonth]);

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) map.set(e.event_date, (map.get(e.event_date) || 0) + 1);
    return map;
  }, [events]);

  const dayEvents = events.filter((e) => e.event_date === selected).sort((a, b) => (a.start_time || '99').localeCompare(b.start_time || '99'));

  const go = (delta: number) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const addEvent = async () => {
    if (!title.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await ppost('/api/story/events', {
        event_date: selected,
        start_time: time.trim() || undefined,
        title: title.trim(),
        notes: notes.trim() || undefined,
      });
      setTime(''); setTitle(''); setNotes('');
      await loadMonth();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally { setBusy(false); }
  };

  const removeEvent = async (id: string) => {
    try { await pdelete(`/api/story/events/${id}`); await loadMonth(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete'); }
  };

  return (
    <div>
      <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, margin: '0 0 18px', letterSpacing: '-0.4px' }}>Planner</h1>

      <div style={{ ...cardStyle, padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => go(-1)} style={navBtn} aria-label="Previous month">‹</button>
          {/* Month title — hidden door to Messages (long-press 2s → phrase). */}
          <SecretGate unlockUrl="/api/story/messages/unlock" tokenKey="story_hidden_view" destination="/story/admin/dashboard">
            <span style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: T.text }}>{MONTHS[view.m]} {view.y}</span>
          </SecretGate>
          <button onClick={() => go(1)} style={navBtn} aria-label="Next month">›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
          {DOW.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, color: T.textDim, padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateIso = iso(view.y, view.m, d);
            const isToday = dateIso === todayIso;
            const isSel = dateIso === selected;
            const count = countByDate.get(dateIso) || 0;
            return (
              <button
                key={i}
                onClick={() => setSelected(dateIso)}
                style={{
                  appearance: 'none', cursor: 'pointer',
                  aspectRatio: '1 / 1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  borderRadius: 10, fontSize: 13.5,
                  border: isSel ? `1px solid ${T.emerald}` : isToday ? `1px solid ${T.border}` : '1px solid transparent',
                  background: isSel ? 'rgba(52,211,153,0.16)' : isToday ? 'rgba(52,211,153,0.07)' : 'transparent',
                  color: isToday || isSel ? T.text : T.textMid, fontWeight: isToday || isSel ? 700 : 500,
                }}
              >
                {d}
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: count ? T.gold : 'transparent' }} />
              </button>
            );
          })}
        </div>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13.5, marginBottom: 12 }}>{error}</div>}

      {/* Selected-day panel */}
      <div style={{ ...cardStyle, padding: 18, marginBottom: 18 }}>
        <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 600, color: T.text, marginBottom: 12 }}>{prettyDate(selected)}</div>

        {dayEvents.length === 0 && <div style={{ color: T.textDim, fontSize: 14, marginBottom: 14 }}>Nothing scheduled.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {dayEvents.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
              <span style={{ fontSize: 13, color: T.gold, fontWeight: 600, minWidth: 44, paddingTop: 1 }}>{e.start_time || '—'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, color: T.text }}>{e.title}</div>
                {e.notes && <div style={{ fontSize: 13, color: T.textMid, marginTop: 3, lineHeight: 1.5 }}>{e.notes}</div>}
              </div>
              <button onClick={() => removeEvent(e.id)} aria-label="Delete" style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 17, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>

        {/* add form */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            style={{ ...input, width: 110, colorScheme: 'dark' }} />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add an event…"
            onKeyDown={(e) => { if (e.key === 'Enter') addEvent(); }}
            style={{ ...input, flex: 1, minWidth: 160 }} />
          <button onClick={addEvent} disabled={busy || !title.trim()}
            style={{ ...primaryBtn, opacity: busy || !title.trim() ? 0.5 : 1 }}>{busy ? '…' : 'Add'}</button>
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)"
          style={{ ...input, width: '100%', marginTop: 8 }} />
      </div>

      <div style={{ ...cardStyle, padding: 18 }}>
        <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600, color: T.text, marginBottom: 6 }}>Today&apos;s focus</div>
        <div style={{ color: T.textMid, fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
          Let the coach surface the one thing that matters — and put rest in the plan.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/story/admin/coach?ask=' + encodeURIComponent('Plan my day — the one thing that matters, a short list, and rest built in.'))} style={primaryBtn}>Plan my day</button>
          <button onClick={() => router.push('/story/admin/coach?ask=' + encodeURIComponent('Plan my week — the few things that matter, with reasons, and rest protected.'))} style={ghostBtn}>Plan my week</button>
        </div>
      </div>
    </div>
  );
}

const input: CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.borderSoft}`, borderRadius: 10,
  outline: 'none', color: T.text, fontFamily: T.sans, fontSize: 15, padding: '9px 12px',
};
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
