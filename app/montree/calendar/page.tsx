'use client';

// app/montree/calendar/page.tsx
// Calendar Plan §11 + §12 — Phase 1 surface.
//
// Mobile-first month grid. Tap a day → detail panel below grid. Empty days
// render as quiet greys; days with events show the source icons (max 3) +
// "+N" overflow chip.
//
// Aggregation lens contract: this page knows NOTHING about the underlying
// data sources. It calls /api/montree/calendar and renders the CalendarEvent
// shape. New adapters land in the registry — this page gets them for free.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import Link from 'next/link';

interface CalendarEvent {
  id: string;
  source: string;
  kind: 'point' | 'span' | 'allday' | 'attention';
  start: string;
  end: string | null;
  all_day: boolean;
  title: string;
  detail: string | null;
  status: 'planned' | 'done' | 'missed' | 'cancelled' | 'info';
  link: string | null;
  icon: string;
  accent: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  visibility: string;
}

interface ApiResponse {
  events: CalendarEvent[];
  window: { from: string; to: string; tz: string };
  sources: string[];
  errors?: Array<{ source: string; message: string }>;
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Returns the UTC date for the Monday of the week containing `d`. */
function mondayOf(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = out.getUTCDay(); // 0=Sun..6=Sat
  const delta = dow === 0 ? -6 : 1 - dow;
  out.setUTCDate(out.getUTCDate() + delta);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

/** Build a 6×7 (42-day) grid covering the month of `anchor`. */
function buildMonthGrid(anchor: Date): Date[] {
  const firstOfMonth = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const start = mondayOf(firstOfMonth);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  return cells;
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

function formatTimeShort(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function CalendarPage() {
  const { t } = useI18n();
  const [anchor, setAnchor] = useState<Date>(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(() => ymd(new Date()));

  const monthCells = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const windowFrom = useMemo(() => ymd(monthCells[0]), [monthCells]);
  const windowTo = useMemo(() => ymd(monthCells[41]), [monthCells]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/montree/calendar?from=${windowFrom}&to=${windowTo}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Calendar fetch failed (${res.status})`);
      }
      const data = (await res.json()) as ApiResponse;
      setEvents(data.events || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [windowFrom, windowTo]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Group events by YYYY-MM-DD (UTC) for the grid render.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const day = ev.start.slice(0, 10);
      const list = map.get(day);
      if (list) list.push(ev);
      else map.set(day, [ev]);
    }
    return map;
  }, [events]);

  const today = useMemo(() => ymd(new Date()), []);
  const selectedEvents = eventsByDay.get(selectedDay) || [];

  const monthLabel = formatMonthLabel(anchor);
  const inSelectedMonth = (d: Date) => d.getUTCMonth() === anchor.getUTCMonth();

  return (
    <div style={{ minHeight: '100dvh', background: '#0a1a0f', color: '#e2eee4' }}>
      <header
        style={{
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link
          href="/montree"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: '#9bd5b0',
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          🌱 <span style={{ fontFamily: 'Lora, serif', fontSize: 16 }}>Montree</span>
        </Link>
        <LanguageToggle />
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 48px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: 'Lora, serif',
              fontSize: 26,
              letterSpacing: -0.3,
            }}
          >
            {t('calendar.title') || 'Calendar'}
          </h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() =>
                setAnchor(
                  (a) => new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - 1, 1)),
                )
              }
              style={navBtn}
            >
              ‹
            </button>
            <div
              style={{
                fontFamily: 'Lora, serif',
                fontSize: 18,
                minWidth: 170,
                textAlign: 'center',
                color: '#cfead4',
              }}
            >
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() =>
                setAnchor(
                  (a) => new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 1)),
                )
              }
              style={navBtn}
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setAnchor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
                setSelectedDay(ymd(now));
              }}
              style={{ ...navBtn, marginLeft: 8 }}
            >
              {t('calendar.today') || 'Today'}
            </button>
          </div>
        </div>

        {error ? (
          <div style={{ ...card, color: '#fca5a5' }}>{error}</div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 1,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 14,
            overflow: 'hidden',
            opacity: loading ? 0.65 : 1,
            transition: 'opacity 120ms',
          }}
        >
          {WEEKDAY_HEADERS.map((d) => (
            <div
              key={d}
              style={{
                padding: '8px 0',
                background: 'rgba(15,30,18,0.92)',
                textAlign: 'center',
                fontSize: 11,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                color: '#9bd5b0',
              }}
            >
              {d}
            </div>
          ))}
          {monthCells.map((cell) => {
            const key = ymd(cell);
            const cellEvents = eventsByDay.get(key) || [];
            const isToday = key === today;
            const isSelected = key === selectedDay;
            const inMonth = inSelectedMonth(cell);
            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelectedDay(key)}
                style={{
                  background: isSelected
                    ? 'rgba(52,211,153,0.18)'
                    : 'rgba(10,20,12,0.92)',
                  border: 'none',
                  color: inMonth ? '#e2eee4' : '#5a766a',
                  padding: '10px 8px 12px',
                  minHeight: 78,
                  textAlign: 'left',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  outline: isToday ? '1px solid rgba(232,201,106,0.55)' : 'none',
                  outlineOffset: -1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#E8C96A' : undefined,
                    }}
                  >
                    {cell.getUTCDate()}
                  </span>
                  {isToday ? (
                    <span style={{ fontSize: 9, color: '#E8C96A', letterSpacing: 0.4 }}>
                      TODAY
                    </span>
                  ) : null}
                </div>
                {cellEvents.length > 0 ? (
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {cellEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        title={ev.title}
                        style={{
                          fontSize: 13,
                          lineHeight: '14px',
                          opacity: ev.status === 'cancelled' ? 0.5 : 1,
                        }}
                      >
                        {ev.icon}
                      </span>
                    ))}
                    {cellEvents.length > 3 ? (
                      <span style={{ fontSize: 10, color: '#9bd5b0' }}>
                        +{cellEvents.length - 3}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        <section style={{ marginTop: 24 }}>
          <h2
            style={{
              fontFamily: 'Lora, serif',
              fontSize: 19,
              margin: '0 0 12px',
              color: '#cfead4',
            }}
          >
            {new Date(`${selectedDay}T00:00:00Z`).toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </h2>
          {selectedEvents.length === 0 ? (
            <div style={{ ...card, color: '#7fa68d', fontSize: 14 }}>
              {t('calendar.emptyDay') || 'Nothing scheduled.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedEvents.map((ev) => {
                const time = ev.all_day ? null : formatTimeShort(ev.start);
                const cancelled = ev.status === 'cancelled';
                return (
                  <a
                    key={ev.id}
                    href={ev.link || '#'}
                    onClick={ev.link ? undefined : (e) => e.preventDefault()}
                    style={{
                      ...card,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      textDecoration: 'none',
                      color: 'inherit',
                      borderLeft: `3px solid ${ev.accent}`,
                      opacity: cancelled ? 0.55 : 1,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{ev.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#f5fff7',
                          textDecoration: cancelled ? 'line-through' : 'none',
                        }}
                      >
                        {ev.title}
                      </div>
                      {time ? (
                        <div style={{ fontSize: 12, color: '#9bd5b0', marginTop: 2 }}>
                          {time}
                          {ev.end ? ` · until ${formatTimeShort(ev.end)}` : ''}
                        </div>
                      ) : null}
                      {ev.detail ? (
                        <div
                          style={{
                            fontSize: 13,
                            color: '#bcd2c2',
                            marginTop: 4,
                            lineHeight: 1.4,
                          }}
                        >
                          {ev.detail}
                        </div>
                      ) : null}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'rgba(15,30,18,0.92)',
  color: '#cfead4',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  width: 34,
  height: 34,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 16,
};

const card: React.CSSProperties = {
  background: 'rgba(15,30,18,0.6)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 12,
  padding: '14px 16px',
};
