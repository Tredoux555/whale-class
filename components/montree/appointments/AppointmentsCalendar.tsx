// components/montree/appointments/AppointmentsCalendar.tsx
//
// Calendar-first appointments surface. Replaces AvailabilityEditor (which
// stays on disk as a fallback) at both /montree/dashboard/appointments
// (teacher) and /montree/admin/appointments (principal). The API auto-
// scopes by auth.role + auth.userId — same component, both surfaces.
//
// DESIGN POSTURE (per Session 117 UX redesign + architectural rule #176):
//   - Calendar IS the page. One primary interface: month grid (desktop) /
//     compact week strip (mobile). Tap a day → that day's schedule fills
//     below. Database lists (rules, blackouts, bookings) are admin views,
//     not the primary teacher/parent surface.
//
//   - Word swaps (rule #177):
//       "blackout"             → "time away"
//       "weekly availability"  → "open every week on…"
//       "add window"           → "add open slot"
//       "upcoming bookings"    → "what's on your calendar"
//
//   - One-way booker: staff manage their own availability + see who has
//     booked. Parents request via the parent-facing surface. This UI does
//     NOT staff-initiate bookings (no API for that yet).
//
// AGORA INTEGRATION: booked appointments inside the day panel surface the
// "Join video call" CTA + Prior conversations toggle, identical to the
// legacy AvailabilityEditor. The killer feature is reachable from a tap.
//
// PRIVACY: no audio, no AI inside this component. Pure CRUD + display.

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Video,
  X,
  Sun,
  Moon,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

// Lazy-mount the Agora call — SDK ~600KB chunk only loads when staff
// actually taps Join on an upcoming Agora booking.
const AgoraVideoCallLazy = dynamic(
  () => import('@/components/montree/appointments/AgoraVideoCall'),
  { ssr: false }
);

// Lazy-mount the PriorConversationCard. Renders summaries from prior
// meetings with this parent.
const PriorConversationCardLazy = dynamic(
  () => import('@/components/montree/appointments/PriorConversationCard'),
  { ssr: false }
);

// ── Theme tokens (dark forest) ───────────────────────────────────────
const T = {
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldRing: 'rgba(52,211,153,0.40)',
  gold: '#E8C96A',
  goldSoft: 'rgba(232,201,106,0.12)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  cardBorderSubtle: '1px solid rgba(52,211,153,0.10)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  textFaint: 'rgba(255,255,255,0.25)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
  red: '#fca5a5',
  redBg: 'rgba(239,68,68,0.12)',
  redBorder: '1px solid rgba(239,68,68,0.32)',
  amberBg: 'rgba(232,201,106,0.10)',
  amberBorder: '1px solid rgba(232,201,106,0.32)',
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Types ────────────────────────────────────────────────────────────
interface Rule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  buffer_minutes: number;
  timezone: string;
  is_active: boolean;
}

interface Blackout {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
}

interface Appointment {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  intake_subject: string | null;
  parent_name: string | null;
  child_name: string | null;
  video_url?: string | null;
  provider?: 'jitsi' | 'agora' | null;
  recording_enabled?: boolean | null;
  hosts: Array<{
    role: string;
    id: string;
    name: string | null;
    is_primary: boolean;
    response: string | null;
  }>;
}

type SlotMenuMode = null | 'closed' | 'open';

// ── Component ────────────────────────────────────────────────────────
export default function AppointmentsCalendar() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calendar navigation state — month + selected day.
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  }));
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Slot/day quick-action menu state (popover anchored to the day-detail
  // panel — Mark as open / I'm away / See what's booked).
  const [slotMenu, setSlotMenu] = useState<SlotMenuMode>(null);

  // Recurring + Time-away accordions (closed by default — admin views).
  const [openRecurring, setOpenRecurring] = useState(false);
  const [openTimeAway, setOpenTimeAway] = useState(false);

  // Add-rule form state.
  const [showAddRule, setShowAddRule] = useState(false);
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('17:00');
  const [newDuration, setNewDuration] = useState(30);
  const [newBuffer, setNewBuffer] = useState(5);
  const browserTz = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';
  const [newTz, setNewTz] = useState(browserTz);

  // Add-time-away form state.
  const [showAddTimeAway, setShowAddTimeAway] = useState(false);
  const [newAwayStart, setNewAwayStart] = useState('');
  const [newAwayEnd, setNewAwayEnd] = useState('');
  const [newAwayReason, setNewAwayReason] = useState('');

  // Prior conversations expanded state — Set so multiple can be open.
  const [expandedPriorIds, setExpandedPriorIds] = useState<Set<string>>(new Set());

  // Agora call overlay state.
  const [agoraCall, setAgoraCall] = useState<Appointment | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [availRes, apptsRes] = await Promise.all([
        fetch('/api/montree/appointments/availability', {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch('/api/montree/appointments', {
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);
      if (!availRes.ok) {
        if (availRes.status === 401 || availRes.status === 403) {
          window.location.href = '/montree/login-select';
          return;
        }
        setError('Could not load your calendar.');
        return;
      }
      const availData = await availRes.json();
      if (availData?.migration_pending) setMigrationPending(true);
      if (availData?.feature_disabled) setFeatureDisabled(true);
      setRules(availData?.rules || []);
      setBlackouts(availData?.blackouts || []);

      if (apptsRes.ok) {
        const apptsData = await apptsRes.json();
        setAppointments(apptsData?.appointments || []);
      }
    } catch {
      setError('Network error.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  // ── Derived per-day signals ────────────────────────────────────────
  const bookingsByDay = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const key = dayKey(new Date(a.scheduled_start));
      const arr = m.get(key) || [];
      arr.push(a);
      m.set(key, arr);
    }
    return m;
  }, [appointments]);

  const timeAwayByDay = useMemo(() => {
    // For each day, returns the Blackout overlapping (or null).
    const m = new Map<string, Blackout>();
    for (const b of blackouts) {
      const startMs = Date.parse(b.start_at);
      const endMs = Date.parse(b.end_at);
      if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;
      // Walk every day in the range and mark it.
      const startDay = new Date(startMs);
      startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(endMs);
      // If end-time is exactly midnight the range doesn't include that day.
      endDay.setHours(0, 0, 0, 0);
      let cursor = startDay.getTime();
      while (cursor <= endDay.getTime()) {
        const cur = new Date(cursor);
        if (cur.getTime() < endMs) {
          m.set(dayKey(cur), b);
        }
        cursor += 24 * 60 * 60 * 1000;
      }
    }
    return m;
  }, [blackouts]);

  const openDows = useMemo(() => {
    // Set of day-of-week (0-6) with at least one active rule.
    const s = new Set<number>();
    for (const r of rules) {
      if (r.is_active) s.add(r.day_of_week);
    }
    return s;
  }, [rules]);

  const rulesForDay = useCallback(
    (date: Date): Rule[] => {
      const dow = date.getDay();
      return rules.filter((r) => r.day_of_week === dow && r.is_active);
    },
    [rules]
  );

  // ── Mutations ──────────────────────────────────────────────────────
  const addRule = async () => {
    if (newStart >= newEnd) {
      setError('Start time must be before end time.');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/montree/appointments/availability', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: newDay,
          start_time: newStart,
          end_time: newEnd,
          slot_duration_minutes: newDuration,
          buffer_minutes: newBuffer,
          timezone: newTz,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Failed to save your open slot.');
        return;
      }
      setShowAddRule(false);
      await reload();
    } catch {
      setError('Network error.');
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Remove this open slot?')) return;
    try {
      const res = await fetch(`/api/montree/appointments/availability?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) await reload();
      else setError('Failed to remove.');
    } catch {
      setError('Network error.');
    }
  };

  const toggleRuleActive = async (rule: Rule) => {
    try {
      const res = await fetch('/api/montree/appointments/availability', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, is_active: !rule.is_active }),
      });
      if (res.ok) await reload();
    } catch {
      // ignore
    }
  };

  const addTimeAway = async () => {
    if (!newAwayStart || !newAwayEnd) {
      setError('Pick a start and end.');
      return;
    }
    try {
      const res = await fetch('/api/montree/appointments/availability/blackouts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_at: new Date(newAwayStart).toISOString(),
          end_at: new Date(newAwayEnd).toISOString(),
          reason: newAwayReason.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Failed to mark time away.');
        return;
      }
      setShowAddTimeAway(false);
      setNewAwayReason('');
      setNewAwayStart('');
      setNewAwayEnd('');
      await reload();
    } catch {
      setError('Network error.');
    }
  };

  const deleteTimeAway = async (id: string) => {
    if (!confirm('Remove this time-away block?')) return;
    try {
      const res = await fetch(`/api/montree/appointments/availability/blackouts?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) await reload();
    } catch {
      // ignore
    }
  };

  // Quick action: mark THIS DAY away (full day blackout).
  const markDayAway = async () => {
    setSlotMenu(null);
    const start = new Date(selectedDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDay);
    end.setHours(23, 59, 59, 999);
    try {
      const res = await fetch('/api/montree/appointments/availability/blackouts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          reason: null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || 'Could not mark you away.');
        return;
      }
      await reload();
    } catch {
      setError('Network error.');
    }
  };

  // Quick action: open recurring panel + pre-fill the day for the
  // selected day's weekday.
  const openAddSlotForToday = () => {
    setSlotMenu(null);
    setNewDay(selectedDay.getDay());
    setOpenRecurring(true);
    setShowAddRule(true);
    // Scroll into view on next frame.
    setTimeout(() => {
      document.getElementById('recurring-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 30);
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 30, color: T.textSecondary, fontFamily: T.sans }}>
        Loading your calendar…
      </div>
    );
  }

  const selectedKey = dayKey(selectedDay);
  const selectedDayBookings = bookingsByDay.get(selectedKey) || [];
  const selectedDayAway = timeAwayByDay.get(selectedKey) || null;
  const selectedDayRules = rulesForDay(selectedDay);
  const selectedIsPast =
    new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()).getTime() <
    new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  return (
    <div
      style={{
        maxWidth: 880,
        margin: '0 auto',
        padding: '24px 16px 60px',
        fontFamily: T.sans,
        color: T.textPrimary,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 30,
            fontWeight: 500,
            letterSpacing: -0.4,
            margin: 0,
            color: T.textPrimary,
          }}
        >
          Calendar
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 13, margin: '6px 0 0' }}>
          Tap a day to see who&apos;s booked or set time away.
        </p>
      </div>

      {/* ── Banners (feature flag / migration / errors) ─────────────── */}
      {featureDisabled && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            marginBottom: 18,
            background: T.goldSoft,
            border: T.amberBorder,
            color: T.gold,
            fontSize: 13,
          }}
        >
          Calendar isn&apos;t enabled for your school yet. Ask the school owner to turn the
          feature on.
        </div>
      )}
      {migrationPending && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            marginBottom: 18,
            background: T.goldSoft,
            border: T.amberBorder,
            color: T.gold,
            fontSize: 13,
          }}
        >
          ⚠️ The appointments table isn&apos;t set up yet. Tredoux needs to run{' '}
          <code>migrations/216_appointments.sql</code>.
        </div>
      )}
      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            marginBottom: 14,
            background: T.redBg,
            border: T.redBorder,
            color: T.red,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* ── Month navigation ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          padding: '0 4px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            const m = viewMonth.month - 1;
            if (m < 0) setViewMonth({ year: viewMonth.year - 1, month: 11 });
            else setViewMonth({ year: viewMonth.year, month: m });
          }}
          aria-label="Previous month"
          style={navBtnStyle()}
        >
          <ChevronLeft size={18} strokeWidth={1.75} />
        </button>
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: -0.2,
            color: T.textPrimary,
          }}
        >
          {MONTHS_FULL[viewMonth.month]} {viewMonth.year}
        </div>
        <button
          type="button"
          onClick={() => {
            const m = viewMonth.month + 1;
            if (m > 11) setViewMonth({ year: viewMonth.year + 1, month: 0 });
            else setViewMonth({ year: viewMonth.year, month: m });
          }}
          aria-label="Next month"
          style={navBtnStyle()}
        >
          <ChevronRight size={18} strokeWidth={1.75} />
        </button>
      </div>

      {/* ── Month grid ──────────────────────────────────────────────── */}
      <MonthGrid
        year={viewMonth.year}
        month={viewMonth.month}
        today={today}
        selectedDay={selectedDay}
        onSelectDay={(d) => {
          setSelectedDay(d);
          setSlotMenu(null);
        }}
        openDows={openDows}
        timeAwayByDay={timeAwayByDay}
        bookingsByDay={bookingsByDay}
      />

      {/* ── Day detail panel ────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 18,
          padding: 18,
          borderRadius: 14,
          background: T.cardBg,
          border: T.cardBorder,
        }}
      >
        {/* Selected day header. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 10,
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: T.serif,
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: -0.2,
                color: T.textPrimary,
              }}
            >
              {dayHeading(selectedDay, today)}
            </div>
            <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
              {formatDayDate(selectedDay)}
            </div>
          </div>
          {!featureDisabled && !migrationPending && !selectedIsPast && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setSlotMenu(slotMenu === 'open' ? null : 'open')}
                style={btnGhost()}
                aria-haspopup="menu"
                aria-expanded={slotMenu === 'open'}
              >
                <Plus size={14} strokeWidth={1.75} /> Add
              </button>
              {slotMenu === 'open' && (
                <SlotMenu
                  onMarkOpen={openAddSlotForToday}
                  onMarkAway={markDayAway}
                  onClose={() => setSlotMenu(null)}
                  alreadyAway={!!selectedDayAway}
                />
              )}
            </div>
          )}
        </div>

        {/* Time-away banner. */}
        {selectedDayAway && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: T.amberBg,
              border: T.amberBorder,
              color: T.gold,
              fontSize: 13,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Moon size={16} strokeWidth={1.75} />
            <div style={{ flex: 1 }}>
              <strong>You&apos;re away.</strong>
              {selectedDayAway.reason ? (
                <span style={{ color: T.textSecondary }}> {selectedDayAway.reason}</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => deleteTimeAway(selectedDayAway.id)}
              style={iconBtn(T.red)}
              aria-label="Remove time away"
              title="Remove time away"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Open-slots context line. */}
        {!selectedDayAway && selectedDayRules.length > 0 && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              background: T.emeraldSoft,
              border: '1px solid rgba(52,211,153,0.18)',
              color: T.emerald,
              fontSize: 12,
              marginBottom: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sun size={14} strokeWidth={1.75} />
            <span>
              You&apos;re open{' '}
              {selectedDayRules
                .map((r) => `${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`)
                .join(' · ')}
            </span>
          </div>
        )}

        {/* Bookings list — load-bearing for Agora video calls + prior conv. */}
        {selectedDayBookings.length === 0 ? (
          <div
            style={{
              padding: 18,
              borderRadius: 10,
              background: 'rgba(0,0,0,0.18)',
              color: T.textSecondary,
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {selectedDayAway ? (
              <span>No meetings scheduled. You&apos;ve marked the day off.</span>
            ) : selectedDayRules.length === 0 ? (
              <span>
                Nothing booked. You haven&apos;t opened up {DAYS_FULL[selectedDay.getDay()]}s yet —{' '}
                <button
                  type="button"
                  onClick={openAddSlotForToday}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: T.emerald,
                    fontSize: 13,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                    padding: 0,
                  }}
                >
                  open every {DAYS_FULL[selectedDay.getDay()]} →
                </button>
              </span>
            ) : (
              <span>Nothing booked yet for this day.</span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedDayBookings.map((a) => (
              <BookingRow
                key={a.id}
                appointment={a}
                expanded={expandedPriorIds.has(a.id)}
                onTogglePrior={() => {
                  setExpandedPriorIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(a.id)) next.delete(a.id);
                    else next.add(a.id);
                    return next;
                  });
                }}
                onJoinAgora={() => setAgoraCall(a)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Recurring availability accordion ────────────────────────── */}
      <Accordion
        id="recurring-section"
        title="Open every week on…"
        subtitle={
          openDows.size === 0
            ? "You haven't opened any days yet."
            : `${openDows.size} day${openDows.size === 1 ? '' : 's'} open every week.`
        }
        expanded={openRecurring}
        onToggle={() => setOpenRecurring((v) => !v)}
      >
        {!featureDisabled && !migrationPending && (
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setShowAddRule((v) => !v)}
              style={btnPrimary()}
            >
              <Plus size={16} strokeWidth={1.75} /> Add open slot
            </button>
          </div>
        )}

        {showAddRule && (
          <div style={addCardStyle()}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <Field label="Day">
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(parseInt(e.target.value, 10))}
                  style={inputStyle()}
                >
                  {DAYS_SHORT.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Timezone">
                <input
                  value={newTz}
                  onChange={(e) => setNewTz(e.target.value)}
                  style={inputStyle()}
                />
              </Field>
              <Field label="From">
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  style={inputStyle()}
                />
              </Field>
              <Field label="To">
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  style={inputStyle()}
                />
              </Field>
              <Field label="Meeting length (min)">
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={newDuration}
                  onChange={(e) => setNewDuration(parseInt(e.target.value, 10) || 30)}
                  style={inputStyle()}
                />
              </Field>
              <Field label="Buffer between (min)">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={newBuffer}
                  onChange={(e) => setNewBuffer(parseInt(e.target.value, 10) || 0)}
                  style={inputStyle()}
                />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowAddRule(false)} style={btnGhost()}>
                Cancel
              </button>
              <button onClick={addRule} style={btnPrimary()}>
                Save
              </button>
            </div>
          </div>
        )}

        {rules.length === 0 && !showAddRule ? (
          <div style={emptyStyle()}>
            No open slots yet. Tap <strong style={{ color: T.textPrimary }}>Add open slot</strong>{' '}
            above to open your first one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rules.map((rule) => (
              <div key={rule.id} style={ruleRowStyle(rule.is_active)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div
                    style={{
                      minWidth: 44,
                      height: 32,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: rule.is_active ? T.emeraldSoft : 'rgba(255,255,255,0.06)',
                      color: rule.is_active ? T.emerald : T.textMuted,
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: 0.5,
                    }}
                  >
                    {DAYS_SHORT[rule.day_of_week]}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}
                    </div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                      {rule.slot_duration_minutes}-min meetings · {rule.buffer_minutes}-min buffer ·{' '}
                      {rule.timezone}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => toggleRuleActive(rule)}
                    title={rule.is_active ? 'Pause' : 'Resume'}
                    aria-label={rule.is_active ? 'Pause this open slot' : 'Resume this open slot'}
                    style={iconBtn(rule.is_active ? T.emerald : T.textMuted)}
                  >
                    {rule.is_active ? (
                      <CheckCircle2 size={16} strokeWidth={1.75} />
                    ) : (
                      <XCircle size={16} strokeWidth={1.75} />
                    )}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    title="Remove"
                    aria-label="Remove this open slot"
                    style={iconBtn(T.red)}
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Accordion>

      {/* ── Time away accordion ─────────────────────────────────────── */}
      <Accordion
        title="Time away"
        subtitle={
          blackouts.length === 0
            ? "Holidays, sick days, days you're out."
            : `${blackouts.length} time-away block${blackouts.length === 1 ? '' : 's'} ahead.`
        }
        expanded={openTimeAway}
        onToggle={() => setOpenTimeAway((v) => !v)}
      >
        {!featureDisabled && !migrationPending && (
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setShowAddTimeAway((v) => !v)}
              style={btnPrimary()}
            >
              <Plus size={16} strokeWidth={1.75} /> Mark time away
            </button>
          </div>
        )}

        {showAddTimeAway && (
          <div style={addCardStyle()}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <Field label="From">
                <input
                  type="datetime-local"
                  value={newAwayStart}
                  onChange={(e) => setNewAwayStart(e.target.value)}
                  style={inputStyle()}
                />
              </Field>
              <Field label="To">
                <input
                  type="datetime-local"
                  value={newAwayEnd}
                  onChange={(e) => setNewAwayEnd(e.target.value)}
                  style={inputStyle()}
                />
              </Field>
            </div>
            <Field label="Note (optional — parents don't see this)">
              <input
                value={newAwayReason}
                onChange={(e) => setNewAwayReason(e.target.value)}
                style={inputStyle()}
                placeholder="Holiday, sick day, training…"
              />
            </Field>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={() => setShowAddTimeAway(false)} style={btnGhost()}>
                Cancel
              </button>
              <button onClick={addTimeAway} style={btnPrimary()}>
                Save
              </button>
            </div>
          </div>
        )}

        {blackouts.length === 0 && !showAddTimeAway ? (
          <div style={emptyStyle()}>None scheduled.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blackouts.map((b) => (
              <div key={b.id} style={blackoutRowStyle()}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {fmtDateTime(b.start_at)} → {fmtDateTime(b.end_at)}
                  </div>
                  {b.reason && (
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                      {b.reason}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteTimeAway(b.id)}
                  title="Remove"
                  aria-label="Remove this time-away block"
                  style={iconBtn(T.red)}
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Accordion>

      {/* Phase 116.3 — full-viewport Agora call overlay. */}
      {agoraCall && (
        <AgoraVideoCallLazy
          appointmentId={agoraCall.id}
          callerRole="teacher"
          remoteDisplayName={agoraCall.parent_name || 'Parent'}
          recordingEnabledForAppointment={!!agoraCall.recording_enabled}
          onClose={() => setAgoraCall(null)}
        />
      )}
    </div>
  );
}

// ── BookingRow sub-component (module-level — stable identity across renders) ──
function BookingRow({
  appointment: a,
  expanded,
  onTogglePrior,
  onJoinAgora,
}: {
  appointment: Appointment;
  expanded: boolean;
  onTogglePrior: () => void;
  onJoinAgora: () => void;
}) {
  const start = new Date(a.scheduled_start);
  const end = new Date(a.scheduled_end);
  return (
    <div style={apptRowStyle()}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>
          {fmtTimeOnly(start)} – {fmtTimeOnly(end)}
        </span>
        <span style={{ fontSize: 11, color: statusColor(a.status) }}>{a.status}</span>
      </div>
      <div style={{ fontSize: 14, color: T.textPrimary, marginTop: 4 }}>
        {a.parent_name || 'Parent'}
        {a.child_name ? (
          <span style={{ color: T.textSecondary }}> · about {a.child_name}</span>
        ) : null}
      </div>
      {a.intake_subject && (
        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
          &ldquo;{a.intake_subject}&rdquo;
        </div>
      )}

      {/* Phase 116.2/116.3 — Join button. */}
      {a.provider === 'agora' && a.status === 'confirmed' && (
        <button
          type="button"
          onClick={onJoinAgora}
          style={joinBtn()}
          aria-label="Join the video call"
        >
          <Video size={12} strokeWidth={1.75} /> Join video call
        </button>
      )}
      {a.provider !== 'agora' && a.video_url && (
        <a
          href={a.video_url}
          target="_blank"
          rel="noopener noreferrer"
          style={joinBtn()}
          aria-label="Join the video call (opens in a new tab)"
        >
          <Video size={12} strokeWidth={1.75} /> Join video call
        </a>
      )}

      {/* Phase 116.3 — Prior conversations toggle. */}
      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={onTogglePrior}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(232,201,106,0.85)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          {expanded ? 'Hide prior conversations' : 'Show prior conversations'}
        </button>
        {expanded && (
          <div style={{ marginTop: 10 }}>
            <PriorConversationCardLazy appointmentId={a.id} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── MonthGrid sub-component ──────────────────────────────────────────
function MonthGrid({
  year,
  month,
  today,
  selectedDay,
  onSelectDay,
  openDows,
  timeAwayByDay,
  bookingsByDay,
}: {
  year: number;
  month: number;
  today: Date;
  selectedDay: Date;
  onSelectDay: (d: Date) => void;
  openDows: Set<number>;
  timeAwayByDay: Map<string, Blackout>;
  bookingsByDay: Map<string, Appointment[]>;
}) {
  // Build cells covering the visible month including leading/trailing days.
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay(); // 0=Sun
  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  // Leading days from previous month.
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    cells.push({ date: d, inMonth: false });
  }
  // Days in current month.
  const lastOfMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastOfMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Trailing days from next month to fill the final row (7 columns).
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    cells.push({ date: next, inMonth: false });
  }

  const todayKey = dayKey(today);
  const selectedKey = dayKey(selectedDay);

  return (
    <div>
      {/* Weekday header strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 6,
        }}
      >
        {DAYS_SHORT.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: T.textSecondary,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              padding: '4px 0',
            }}
          >
            {d.charAt(0)}
          </div>
        ))}
      </div>

      {/* 6×7 grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}
      >
        {cells.map((c, i) => {
          const key = dayKey(c.date);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const isPast =
            new Date(c.date.getFullYear(), c.date.getMonth(), c.date.getDate()).getTime() <
            new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
          const away = timeAwayByDay.get(key);
          const bookings = bookingsByDay.get(key) || [];
          const hasOpen = openDows.has(c.date.getDay()) && !away && !isPast;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(c.date)}
              aria-label={formatDayDate(c.date)}
              aria-pressed={isSelected}
              style={dayCellStyle({
                inMonth: c.inMonth,
                isToday,
                isSelected,
                isPast,
                hasAway: !!away,
              })}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: isToday ? 700 : 500,
                  color: isSelected
                    ? T.emerald
                    : !c.inMonth
                    ? T.textFaint
                    : isPast
                    ? T.textMuted
                    : T.textPrimary,
                }}
              >
                {c.date.getDate()}
              </span>
              {/* Markers row below the number */}
              <div
                style={{
                  display: 'flex',
                  gap: 3,
                  marginTop: 4,
                  minHeight: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {bookings.length > 0 && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: T.emerald,
                    }}
                    title={`${bookings.length} booking${bookings.length === 1 ? '' : 's'}`}
                  />
                )}
                {away && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: T.gold,
                    }}
                    title="Time away"
                  />
                )}
                {hasOpen && bookings.length === 0 && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'rgba(52,211,153,0.55)',
                    }}
                    title="You're open"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── SlotMenu popover ─────────────────────────────────────────────────
function SlotMenu({
  onMarkOpen,
  onMarkAway,
  onClose,
  alreadyAway,
}: {
  onMarkOpen: () => void;
  onMarkAway: () => void;
  onClose: () => void;
  alreadyAway: boolean;
}) {
  // Click-outside-to-close.
  useEffect(() => {
    const handler = () => onClose();
    // Defer one tick so the originating click doesn't immediately close.
    const timer = setTimeout(() => document.addEventListener('click', handler, { once: true }), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handler);
    };
  }, [onClose]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        right: 0,
        minWidth: 200,
        background: 'rgba(8,20,12,0.96)',
        border: T.cardBorder,
        borderRadius: 12,
        padding: 6,
        backdropFilter: 'blur(18px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        // backdrop-filter creates its own stacking context — rule #143
        zIndex: 30,
        fontFamily: T.sans,
      }}
      role="menu"
    >
      <button
        type="button"
        onClick={onMarkOpen}
        style={menuItemStyle()}
        role="menuitem"
      >
        <Sun size={14} strokeWidth={1.75} style={{ color: T.emerald, flexShrink: 0 }} />
        <span>Open this weekday every week</span>
      </button>
      {!alreadyAway && (
        <button
          type="button"
          onClick={onMarkAway}
          style={menuItemStyle()}
          role="menuitem"
        >
          <Moon size={14} strokeWidth={1.75} style={{ color: T.gold, flexShrink: 0 }} />
          <span>I&apos;m away this day</span>
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        style={{ ...menuItemStyle(), color: T.textMuted }}
        role="menuitem"
      >
        <X size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
        <span>Cancel</span>
      </button>
    </div>
  );
}

// ── Accordion sub-component ──────────────────────────────────────────
function Accordion({
  id,
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  id?: string;
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 14,
        background: T.cardBg,
        border: T.cardBorderSubtle,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: T.sans,
          textAlign: 'left',
          color: T.textPrimary,
        }}
      >
        <div>
          <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 500, color: T.textPrimary }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>{subtitle}</div>
        </div>
        <ChevronRight
          size={18}
          strokeWidth={1.75}
          style={{
            color: T.textSecondary,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
            transition: 'transform 0.18s ease',
          }}
        />
      </button>
      {expanded && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function dayHeading(d: Date, today: Date): string {
  const k = dayKey(d);
  const tk = dayKey(today);
  if (k === tk) return 'Today';
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (k === dayKey(tomorrow)) return 'Tomorrow';
  return DAYS_FULL[d.getDay()];
}

function formatDayDate(d: Date): string {
  try {
    return d.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return d.toDateString();
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function fmtTimeOnly(d: Date): string {
  try {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return d.toISOString();
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'confirmed':
      return T.emerald;
    case 'pending':
      return T.gold;
    case 'cancelled':
      return T.red;
    case 'completed':
      return T.textMuted;
    default:
      return T.textMuted;
  }
}

// ── Style functions ──────────────────────────────────────────────────
function navBtnStyle(): React.CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: T.cardBg,
    border: T.cardBorder,
    color: T.textPrimary,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

function dayCellStyle({
  inMonth,
  isToday,
  isSelected,
  isPast,
  hasAway,
}: {
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  hasAway: boolean;
}): React.CSSProperties {
  // Base — clickable square cell.
  const base: React.CSSProperties = {
    aspectRatio: '1 / 1',
    minHeight: 44, // 44pt tap target (rule #44)
    padding: '6px 4px',
    borderRadius: 10,
    background: T.cardBg,
    border: T.cardBorderSubtle,
    color: T.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    fontFamily: T.sans,
    opacity: inMonth ? 1 : 0.45,
    position: 'relative',
  };
  if (isSelected) {
    base.border = `2px solid ${T.emeraldRing}`;
    base.background = T.emeraldSoft;
  }
  if (isToday && !isSelected) {
    base.border = `1px solid ${T.gold}`;
  }
  if (isPast && !isSelected) {
    base.opacity = inMonth ? 0.45 : 0.25;
  }
  if (hasAway && !isSelected) {
    base.background = 'rgba(232,201,106,0.04)';
  }
  return base;
}

function menuItemStyle(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: T.textPrimary,
    fontFamily: T.sans,
    fontSize: 13,
    fontWeight: 500,
    textAlign: 'left',
    cursor: 'pointer',
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    background: T.inputBg,
    border: T.inputBorder,
    color: T.textPrimary,
    fontSize: 16, // iOS keyboard-zoom prevention (rule #44)
    fontFamily: T.sans,
    outline: 'none',
  };
}

function btnPrimary(): React.CSSProperties {
  return {
    padding: '10px 14px',
    borderRadius: 10,
    background: T.emerald,
    border: 'none',
    color: '#0a1a0f',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function btnGhost(): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 10,
    background: T.cardBg,
    border: T.cardBorder,
    color: T.textPrimary,
    fontWeight: 500,
    fontSize: 13,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

function iconBtn(color: string): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: T.cardBorder,
    background: 'transparent',
    color,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

function joinBtn(): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: '6px 10px',
    borderRadius: 8,
    background: T.emerald,
    color: '#0a1a0f',
    fontWeight: 600,
    fontSize: 12,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
  };
}

function addCardStyle(): React.CSSProperties {
  return {
    padding: 16,
    borderRadius: 12,
    background: T.cardBg,
    border: T.cardBorder,
    marginBottom: 10,
  };
}

function emptyStyle(): React.CSSProperties {
  return {
    padding: 18,
    borderRadius: 12,
    background: 'rgba(0,0,0,0.18)',
    border: T.cardBorderSubtle,
    color: T.textSecondary,
    fontSize: 13,
  };
}

function ruleRowStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    background: T.cardBg,
    border: T.cardBorder,
    opacity: active ? 1 : 0.55,
  };
}

function blackoutRowStyle(): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 10,
    background: T.cardBg,
    border: T.cardBorder,
  };
}

function apptRowStyle(): React.CSSProperties {
  return {
    padding: '12px 14px',
    borderRadius: 10,
    background: T.cardBg,
    border: T.cardBorder,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: T.gold,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
