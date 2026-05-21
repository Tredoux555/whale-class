'use client';

// components/montree/appointments/QuickSetAppointmentModal.tsx
//
// 🚨 Session 120 — slim appointment-create modal for use from inside a
// chat thread. Parent + child are LOCKED from the thread context (no
// picker) — the staff member is already messaging this specific parent
// about this specific child, so we don't make them choose again.
//
// Posts to POST /api/montree/appointments, which auto-creates the [[APPT:]]
// invite card in the thread on success (Session 120 auto-post). Caller
// just needs to dismiss this modal on success.
//
// Differs from SetAppointmentModal (the calendar version):
//   - NO parent picker (locked from props)
//   - NO additional-hosts picker (use the calendar for complex bookings)
//   - Smaller UI footprint (fits inside the chat surface)

import { useState, useCallback } from 'react';
import { X, Send, Video, Users, Loader2, CheckCircle2 } from 'lucide-react';

const T = {
  bg: '#0a1a0f',
  cardBg: 'rgba(8,20,12,0.85)',
  cardBorder: '1px solid rgba(52,211,153,0.32)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldSoft: 'rgba(52,211,153,0.12)',
  gold: '#E8C96A',
  red: '#fca5a5',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

type ApptKind = 'parent_meeting' | 'video_call';

export interface QuickSetAppointmentModalProps {
  /** The parent the appointment is for. Display name shown in header. */
  parentId: string;
  parentName: string;
  /** The child anchor. Required for cross-pollination — server verifies. */
  childId: string;
  childName?: string;
  /** Called when user dismisses without sending. */
  onClose: () => void;
  /** Called after successful POST. */
  onSent: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60];

function defaultStartIso(): string {
  // Default to "tomorrow at 3pm" — a sane meeting-time default.
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(15, 0, 0, 0);
  // Format for datetime-local input (YYYY-MM-DDTHH:MM)
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export default function QuickSetAppointmentModal({
  parentId,
  parentName,
  childId,
  childName,
  onClose,
  onSent,
}: QuickSetAppointmentModalProps) {
  const [kind, setKind] = useState<ApptKind>('video_call');
  const [startLocal, setStartLocal] = useState<string>(defaultStartIso());
  const [duration, setDuration] = useState<number>(30);
  const [subject, setSubject] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!startLocal) {
      setError('Pick a start time.');
      return;
    }
    const startDate = new Date(startLocal);
    if (isNaN(startDate.getTime())) {
      setError('That start time is not valid.');
      return;
    }
    // 🚨 Session 120 audit — align with server's stricter 60s past buffer.
    // Server-side `appointments/route.ts` rejects `startMs < Date.now() - 60_000`.
    // Pre-validating with the same buffer prevents the "I picked a time and
    // got a server error" round-trip.
    if (startDate.getTime() < Date.now() - 60 * 1000) {
      setError('Start time must be in the future.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/montree/appointments', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: parentId,
          child_id: childId,
          scheduled_start: startDate.toISOString(),
          duration_minutes: duration,
          kind,
          subject: subject.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || 'Could not send the invitation.');
        setSending(false);
        return;
      }
      setSuccess(true);
      // Slight delay so user sees the success state.
      setTimeout(() => {
        onSent();
      }, 700);
    } catch {
      setError('Network error sending the invitation.');
      setSending(false);
    }
  }, [parentId, childId, startLocal, duration, kind, subject, onSent]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
        fontFamily: T.sans,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: T.cardBg,
          border: T.cardBorder,
          borderRadius: '20px 20px 0 0',
          padding: '20px 18px calc(24px + env(safe-area-inset-bottom))',
          maxHeight: '90vh',
          overflowY: 'auto',
          color: T.textPrimary,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 500 }}>
              Set appointment
            </div>
            <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
              With {parentName}{childName ? ` · ${childName}` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            type="button"
            aria-label="Close"
            style={{
              background: 'none',
              border: 0,
              cursor: sending ? 'wait' : 'pointer',
              color: T.textMuted,
              padding: 6,
            }}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {success ? (
          <div
            style={{
              padding: '14px 12px',
              borderRadius: 12,
              background: 'rgba(52,211,153,0.10)',
              border: '1px solid rgba(52,211,153,0.32)',
              color: T.emerald,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <CheckCircle2 size={20} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Invitation sent</div>
              <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
                {parentName} will see it in the chat. The card appears in this thread.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Type pills */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Type
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setKind('video_call')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 10,
                    background: kind === 'video_call' ? T.emeraldSoft : 'rgba(255,255,255,0.04)',
                    border: kind === 'video_call' ? '1px solid rgba(52,211,153,0.45)' : '1px solid rgba(255,255,255,0.12)',
                    color: kind === 'video_call' ? T.emerald : T.textSecondary,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Video size={14} /> Video call
                </button>
                <button
                  type="button"
                  onClick={() => setKind('parent_meeting')}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 10,
                    background: kind === 'parent_meeting' ? T.emeraldSoft : 'rgba(255,255,255,0.04)',
                    border: kind === 'parent_meeting' ? '1px solid rgba(52,211,153,0.45)' : '1px solid rgba(255,255,255,0.12)',
                    color: kind === 'parent_meeting' ? T.emerald : T.textSecondary,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Users size={14} /> In-person
                </button>
              </div>
            </div>

            {/* Start time */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>
                When
              </label>
              <input
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: T.inputBg,
                  border: T.inputBorder,
                  color: T.textPrimary,
                  // 16px — anything smaller makes iOS Safari auto-zoom on focus.
                  fontSize: 16,
                  fontFamily: T.sans,
                  outline: 'none',
                  colorScheme: 'dark',
                }}
              />
            </div>

            {/* Duration */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                Duration
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    style={{
                      padding: '9px 8px',
                      borderRadius: 8,
                      background: duration === d ? T.emeraldSoft : 'rgba(255,255,255,0.04)',
                      border: duration === d ? '1px solid rgba(52,211,153,0.45)' : '1px solid rgba(255,255,255,0.12)',
                      color: duration === d ? T.emerald : T.textSecondary,
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Subject (optional) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>
                What&apos;s it about (optional)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 200))}
                disabled={sending}
                placeholder="e.g. Quarterly review"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: T.inputBg,
                  border: T.inputBorder,
                  color: T.textPrimary,
                  // 16px — anything smaller makes iOS Safari auto-zoom on focus.
                  fontSize: 16,
                  fontFamily: T.sans,
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(239,68,68,0.10)',
                  border: '1px solid rgba(239,68,68,0.32)',
                  color: T.red,
                  fontSize: 13,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={sending}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 12,
                background: T.emerald,
                color: '#06281a',
                border: 0,
                fontWeight: 700,
                fontSize: 15,
                cursor: sending ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1.4s linear infinite' }} />
                  Sending…
                </>
              ) : (
                <>
                  <Send size={16} /> Send invitation
                </>
              )}
            </button>
          </>
        )}

        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
