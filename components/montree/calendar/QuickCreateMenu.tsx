'use client';

// components/montree/calendar/QuickCreateMenu.tsx
// Calendar Plan §5 — write-back surface.
//
// "+ Add on this day" → picker → either inline quick-create modal (school
// event, term) OR deep-link redirect to the rich surface (appointment,
// meeting note). Role determines which actions appear.
//
// The principle: the calendar is the planning entry-point; the canonical
// editor still lives where it lived. This menu just routes the teacher to
// the right place pre-filled with the date.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface QuickCreateMenuProps {
  /** YYYY-MM-DD of the day the user wants to add to. */
  selectedDay: string;
  /** Calendar role — drives which actions show. */
  role: 'teacher' | 'principal' | 'parent' | 'super_admin';
  /** Called after a successful inline create so the calendar refetches. */
  onCreated: () => void;
}

type Action = 'event' | 'appointment' | 'meeting_note' | 'term';

const ACTIONS_BY_ROLE: Record<QuickCreateMenuProps['role'], Action[]> = {
  teacher: ['event', 'appointment', 'meeting_note'],
  principal: ['event', 'appointment', 'meeting_note', 'term'],
  parent: [],
  super_admin: ['event', 'term'],
};

const ACTION_META: Record<
  Action,
  { icon: string; label: string; description: string; accent: string }
> = {
  event: {
    icon: '📅',
    label: 'School event',
    description: 'Open day, field trip, ceremony, holiday party.',
    accent: '#E8C96A',
  },
  appointment: {
    icon: '🗓️',
    label: 'Parent appointment',
    description: 'Invite a parent to a meeting or video call.',
    accent: '#10b981',
  },
  meeting_note: {
    icon: '🗒️',
    label: 'Meeting note',
    description: 'Record what was said in a parent meeting.',
    accent: '#f59e0b',
  },
  term: {
    icon: '📘',
    label: 'Term',
    description: 'Define an academic term — e.g. Spring 2026.',
    accent: '#a78bfa',
  },
};

export default function QuickCreateMenu({
  selectedDay,
  role,
  onCreated,
}: QuickCreateMenuProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalAction, setModalAction] = useState<Action | null>(null);

  const actions = ACTIONS_BY_ROLE[role] || [];
  if (actions.length === 0) return null;

  function handlePick(action: Action) {
    setMenuOpen(false);
    if (action === 'event') {
      setModalAction('event');
    } else if (action === 'term') {
      setModalAction('term');
    } else if (action === 'appointment') {
      router.push(`/montree/dashboard/appointments?date=${selectedDay}&action=create`);
    } else if (action === 'meeting_note') {
      router.push(`/montree/dashboard/conversations?date=${selectedDay}&action=create`);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen((m) => !m)}
        style={{
          marginTop: 14,
          background: 'rgba(52,211,153,0.18)',
          border: '1px solid rgba(52,211,153,0.45)',
          color: '#cfead4',
          padding: '10px 14px',
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 14,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        + Add on this day
      </button>

      {menuOpen ? (
        <div
          role="menu"
          style={{
            marginTop: 10,
            background: 'rgba(15,30,18,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            maxWidth: 360,
          }}
        >
          {actions.map((a) => {
            const meta = ACTION_META[a];
            return (
              <button
                key={a}
                type="button"
                role="menuitem"
                onClick={() => handlePick(a)}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  background: 'transparent',
                  border: 'none',
                  color: '#e2eee4',
                  padding: '10px 12px',
                  borderRadius: 8,
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderLeft: `3px solid ${meta.accent}`,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: '20px' }}>{meta.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{meta.label}</span>
                  <span style={{ fontSize: 12, color: '#9bd5b0' }}>
                    {meta.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {modalAction === 'event' ? (
        <EventQuickCreateModal
          selectedDay={selectedDay}
          onClose={() => setModalAction(null)}
          onCreated={() => {
            setModalAction(null);
            onCreated();
          }}
        />
      ) : null}
      {modalAction === 'term' ? (
        <TermQuickCreateModal
          selectedDay={selectedDay}
          onClose={() => setModalAction(null)}
          onCreated={() => {
            setModalAction(null);
            onCreated();
          }}
        />
      ) : null}
    </>
  );
}

// ── Modals ────────────────────────────────────────────────────────────

interface ModalProps {
  selectedDay: string;
  onClose: () => void;
  onCreated: () => void;
}

function EventQuickCreateModal({ selectedDay, onClose, onCreated }: ModalProps) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const startIso = new Date(`${selectedDay}T${time}:00`).toISOString();
      const res = await fetch('/api/montree/admin/events', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          start_at: startIso,
          location: location.trim() || undefined,
          is_published: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Create failed (${res.status})`);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="New school event" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
            maxLength={120}
            style={inputStyle}
          />
        </Field>
        <Field label="Time">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            style={inputStyle}
          />
        </Field>
        <Field label="Location (optional)">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={120}
            style={inputStyle}
          />
        </Field>
        {error ? <div style={{ color: '#fca5a5', fontSize: 13 }}>{error}</div> : null}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? 'Saving…' : 'Save event'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function TermQuickCreateModal({ selectedDay, onClose, onCreated }: ModalProps) {
  const [name, setName] = useState('');
  const [start, setStart] = useState(selectedDay);
  const [end, setEnd] = useState(selectedDay);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (end < start) {
      setError('End date must be on or after start date.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/school/terms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), start_date: start, end_date: end }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Create failed (${res.status})`);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create term');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title="New academic term" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Spring 2026"
            autoFocus
            required
            maxLength={80}
            style={inputStyle}
          />
        </Field>
        <Field label="Start date">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            style={inputStyle}
          />
        </Field>
        <Field label="End date">
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
            style={inputStyle}
          />
        </Field>
        {error ? <div style={{ color: '#fca5a5', fontSize: 13 }}>{error}</div> : null}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} style={btnPrimary}>
            {submitting ? 'Saving…' : 'Save term'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Shared atoms ──────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f1e12',
          width: '100%',
          maxWidth: 460,
          borderRadius: '16px 16px 0 0',
          padding: '20px 18px 24px',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#e2eee4',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <h3 style={{ margin: 0, fontFamily: 'Lora, serif', fontSize: 19 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9bd5b0',
              fontSize: 22,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: '#9bd5b0', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#f5fff7',
  fontSize: 16, // 16px to dodge iOS zoom-on-focus
  width: '100%',
};

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  color: '#cfead4',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  padding: '10px 16px',
  cursor: 'pointer',
  fontSize: 14,
};

const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #34d399, #1D6B48)',
  color: '#04140a',
  border: 'none',
  borderRadius: 10,
  padding: '10px 18px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};
